import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthUser, Dispatch, Vehicle, Client, Snippet, Operation, ViewType, UnitPriceMaster } from '../types';
import { supabase } from '../supabase';
import { Truck, Camera, CheckCircle } from 'lucide-react'; // 아이콘 추가

// --------------------------------------------------------------------------
// UUID 생성 함수 (DB 호환용)
// --------------------------------------------------------------------------
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface Props {
  user: AuthUser;
  dispatches: Dispatch[];
  vehicles: Vehicle[];
  clients: Client[];
  snippets: Snippet[];
  operations: Operation[];
  unitPrices: UnitPriceMaster[];
  onAddDispatch: (d: Dispatch) => void;
  onAddSnippet: (s: Snippet) => void;
  onAddOperation: (op: Operation) => void; 
  onUpdateDispatch: (d: Dispatch) => void;
  onDeleteDispatch: (id: string) => void;
  onUpdateStatus: (id: string, status: 'pending' | 'sent' | 'completed', photo?: string, manualQuantity?: number) => void;
  onNavigate?: (view: ViewType) => void;
  onUpdateOperation?: (op: Operation) => void;
}

const DispatchManagementView: React.FC<Props> = ({ 
  user, dispatches, vehicles, clients, snippets, operations, unitPrices = [],
  onAddDispatch, onAddSnippet, onAddOperation, onUpdateDispatch, onDeleteDispatch, onUpdateStatus, onNavigate, onUpdateOperation
}) => {
  
  // --------------------------------------------------------------------------
  // 상태 관리 (State)
  // --------------------------------------------------------------------------
  
  // 신규 배차 입력 폼 상태
  const [newDispatch, setNewDispatch] = useState({ 
    vehicleNo: '', clientName: '', origin: '', destination: '', item: '', count: 1, remarks: '' 
  });

  // 🔥 [추가됨] 매출/매입 구분 상태 (기본값: 매출)
  const [dispatchType, setDispatchType] = useState<'SALES' | 'PURCHASE'>('SALES');
  
  // 수정 모드 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Dispatch | null>(null);
  
  // 자동완성 칩 활성화 상태
  const [activeField, setActiveField] = useState<string | null>(null);

  // 카메라 및 모달 관련 상태
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(false); // 카메라 vs 확인창 구분

  const [activeDispatchId, setActiveDispatchId] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [rotation, setRotation] = useState(0); 
  const [zoomScale, setZoomScale] = useState(1);
  
  // 수량 입력 상태
  const [modalQuantity, setModalQuantity] = useState('');
  const [cardQuantities, setCardQuantities] = useState<Record<string, string>>({});

  // --------------------------------------------------------------------------
  // Refs
  // --------------------------------------------------------------------------
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------------------
  // 실시간 위치 추적 (기사님용)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!user || user.role !== 'VEHICLE') return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const { error } = await supabase
          .from('vehicles')
          .update({ lat: latitude, lng: longitude })
          .eq('id', user.id);

        if (error) console.error("위치 전송 실패:", error);
      },
      (error) => console.error("GPS 에러:", error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user]);

  // --------------------------------------------------------------------------
  // 데이터 가공 및 헬퍼 함수
  // --------------------------------------------------------------------------
  const uniqueClientNames = useMemo(() => {
    return Array.from(new Set(clients.map(c => c.clientName))).sort();
  }, [clients]);

  // 최근 입력 데이터 추출 (자동완성용)
  const recentData = useMemo(() => {
    const getUniqueRecent = (key: 'origin' | 'destination' | 'item' | 'remarks') => {
      const fromDispatches = dispatches.map(d => String(d[key as keyof Dispatch] || ''));
      const fromOps = operations.map(o => String(o[key as keyof Operation] || ''));
      const combined = [...fromDispatches, ...fromOps]
        .map(v => v.trim())
        .filter(v => v !== '' && v !== 'undefined' && v !== 'null');
      
      return Array.from(new Set(combined)).reverse().slice(0, 8);
    };

    return { 
      origin: getUniqueRecent('origin'), 
      destination: getUniqueRecent('destination'), 
      item: getUniqueRecent('item'), 
      remarks: getUniqueRecent('remarks') 
    };
  }, [dispatches, operations]);

  // 상차지 입력 시 자동완성 처리
  const handleOriginChange = (val: string) => {
    setNewDispatch(prev => ({ ...prev, origin: val }));
    const match = snippets.find(s => s.keyword === val);
    
    if (match) {
      setNewDispatch(prev => ({
        ...prev,
        origin: match.origin || prev.origin,
        destination: match.destination || prev.destination,
        item: match.item || prev.item,
        clientName: match.clientName || prev.clientName
      }));
    }
  };

  const applySnippet = (s: Snippet) => {
    setNewDispatch(prev => ({ 
        ...prev, 
        origin: s.origin || '', 
        destination: s.destination || '', 
        item: s.item || '', 
        clientName: s.clientName || prev.clientName 
    }));
    setActiveField(null); // 선택 시 목록 닫기
  };

  const selectSuggestion = (field: string, value: string) => {
    if (field === 'origin') handleOriginChange(value);
    else setNewDispatch(prev => ({ ...prev, [field]: value } as any));
    setActiveField(null); // 선택 시 목록 닫기
  };

  // --------------------------------------------------------------------------
  // 배차 생성 및 수정
  // --------------------------------------------------------------------------
  const handleCreateDispatch = () => {
    // 유효성 검사
    if (!newDispatch.vehicleNo || !newDispatch.origin || !newDispatch.destination) {
      alert('차량, 상차지, 하차지는 필수 입력 사항입니다.');
      return;
    }
    
    const d: Dispatch = { 
      id: generateUUID(), 
      date: new Date().toISOString().split('T')[0], 
      vehicleNo: newDispatch.vehicleNo, 
      clientName: newDispatch.clientName || '미지정', 
      origin: newDispatch.origin, 
      destination: newDispatch.destination, 
      item: newDispatch.item, 
      count: newDispatch.count, 
      remarks: newDispatch.remarks, 
      status: 'pending',
      type: dispatchType // 🔥 [수정됨] 매출/매입 구분 저장
    };
    
    onAddDispatch(d);

    // 자동완성 데이터 학습 (Snippet 추가)
    const newSnippet: Snippet = {
      id: generateUUID(),
      title: `${d.origin} ▶ ${d.destination}`,
      content: d.item || '자동생성',
      keyword: d.origin,
      origin: d.origin,
      destination: d.destination,
      item: d.item,
      clientName: d.clientName
    };
    onAddSnippet(newSnippet);
    
    // 입력창 초기화
    setNewDispatch({ vehicleNo: '', clientName: '', origin: '', destination: '', item: '', count: 1, remarks: '' });
    setActiveField(null);
    
    // 스크롤 최상단으로 이동
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  const startEditing = (d: Dispatch) => { 
    setEditingId(d.id); 
    setEditForm({ ...d }); 
  };
  
  // 현재 로그인한 사용자에 맞는 배차 목록 필터링
  const userDispatches = dispatches.filter(d => 
    user.role === 'ADMIN' || 
    String(d.vehicleNo).trim() === String(user.identifier).trim() || 
    (user.role === 'PARTNER' && d.clientName === user.identifier)
  );

  // --------------------------------------------------------------------------
  // 자동완성 칩 렌더링
  // --------------------------------------------------------------------------
  const renderChips = (field: keyof typeof recentData) => {
    const items = recentData[field];
    const matchingSnippets = field === 'origin' 
      ? snippets.filter(s => (s.keyword && s.keyword.includes(newDispatch.origin)) || (s.origin && s.origin.includes(newDispatch.origin))) 
      : [];
    
    if (activeField !== field) return null;
    if (items.length === 0 && matchingSnippets.length === 0) return null;
    
    return (
      <div className="absolute top-full left-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-2 mt-1 flex flex-col gap-1 w-full max-h-60 overflow-y-auto">
        {field === 'origin' && matchingSnippets.map(s => (
          <button 
            key={`snip-${s.id}`} 
            onMouseDown={(e) => { e.preventDefault(); applySnippet(s); }} 
            className="text-left bg-blue-50 text-blue-700 px-3 py-2 rounded text-xs font-bold hover:bg-blue-100 border border-blue-100"
          >
            ⭐ {s.keyword || s.title}
          </button>
        ))}
        {items.map((item, idx) => (
          <button 
            key={`${String(field)}-${idx}`} 
            onMouseDown={(e) => { e.preventDefault(); selectSuggestion(String(field), item); }} 
            className="text-left bg-slate-50 text-slate-700 px-3 py-2 rounded text-xs font-medium hover:bg-slate-100 border border-slate-100"
          >
            {item}
          </button>
        ))}
      </div>
    );
  };

  const closeCameraModal = () => {
    setCameraOpen(false);
    setIsCameraMode(false); 
    setCapturedPhoto(null);
    setModalQuantity('');
    setRotation(0);
    setZoomScale(1);
    setActiveDispatchId(null);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // 🔥 [추가됨] 내부 공통 처리 로직 (관리자 업로드 & 기사님 앱 공용)
  const handleFinalSubmitInternal = async (targetId: string, photoUrl: string | undefined, qty: number) => {
      const targetDispatch = dispatches.find(d => d.id === targetId);
      if (!targetDispatch) return;

      const existingOp = operations.find(o => o.vehicleNo === targetDispatch.vehicleNo && o.date === targetDispatch.date && o.origin === targetDispatch.origin && o.destination === targetDispatch.destination);
      const matchedPrice = unitPrices?.find(up => up.clientName === targetDispatch.clientName && up.origin === targetDispatch.origin && up.destination === targetDispatch.destination && up.item === targetDispatch.item);
      
      const unitPrice = matchedPrice ? matchedPrice.unitPrice : 0;
      const clientUnitPrice = matchedPrice ? matchedPrice.clientUnitPrice : 0;
      const supplyPrice = Math.floor(unitPrice * qty);
      const tax = Math.floor(supplyPrice * 0.1); 
      const totalAmount = supplyPrice + tax;

      const opData: Operation = {
        id: existingOp ? existingOp.id : generateUUID(), 
        date: targetDispatch.date, clientName: targetDispatch.clientName, vehicleNo: targetDispatch.vehicleNo, 
        origin: targetDispatch.origin, destination: targetDispatch.destination, item: targetDispatch.item, 
        quantity: qty, unitPrice: unitPrice, clientUnitPrice: clientUnitPrice, supplyPrice: supplyPrice, tax: tax, totalAmount: totalAmount, 
        remarks: targetDispatch.remarks || '', invoicePhoto: photoUrl || (existingOp ? existingOp.invoicePhoto : undefined), 
        isInvoiceIssued: existingOp ? existingOp.isInvoiceIssued : false, settlementStatus: existingOp ? existingOp.settlementStatus : 'PENDING', 
        itemDescription: targetDispatch.item, branchName: matchedPrice?.branchName || '', itemCode: '', isVatIncluded: false,
        type: targetDispatch.type // 🔥 타입 유지
      };

      if (existingOp && onUpdateOperation) await onUpdateOperation(opData); else await onAddOperation(opData); 
      await onUpdateStatus(targetId, 'completed', photoUrl, qty);
  };

  // 🔥 [추가됨] 관리자 전용 송장 파일 업로드
  const handleAdminFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, dispatchId: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileName = `admin_${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      try {
        const { error } = await supabase.storage.from('invoices').upload(fileName, file);
        if (error) throw error;
        const publicUrl = supabase.storage.from('invoices').getPublicUrl(fileName).data.publicUrl;
        
        await handleFinalSubmitInternal(dispatchId, publicUrl, 0); // 수량은 0으로 임시 처리 (나중에 수정 가능)
        alert('관리자 권한으로 송장이 등록되었습니다.');
      } catch (err) { alert('사진 업로드 실패'); }
    }
  };

  // --------------------------------------------------------------------------
  // 최종 전송 (사진 + 운행기록 저장) - 기사님용
  // --------------------------------------------------------------------------
  const handleFinalSubmit = async () => {
    if (!activeDispatchId) return;
    setIsProcessingAI(true);

    try {
      const quantity = modalQuantity ? parseFloat(modalQuantity) : 0;
      await handleFinalSubmitInternal(activeDispatchId, capturedPhoto || undefined, quantity);
      closeCameraModal();
    } catch (error) {
      console.error("배차 처리 중 오류 발생:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto custom-scrollbar p-4 space-y-4 flex flex-col">
      {/* 📁 파일 선택 핸들러 (기사님 앨범용) */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => { 
              setCapturedPhoto(reader.result as string); 
              setCameraOpen(true); 
              setIsCameraMode(false); 
              if (activeDispatchId && cardQuantities[activeDispatchId]) {
                setModalQuantity(cardQuantities[activeDispatchId]);
              }
            };
            reader.readAsDataURL(file);
          }
        }} 
        accept="image/*" 
        className="hidden" 
      />

      {/* 헤더 */}
      <div className="flex justify-between items-center shrink-0">
        <div><h2 className="text-xl font-black text-slate-800 dark:text-slate-100">배차 관리</h2></div>
        {(user.role === 'VEHICLE' || user.role === 'PARTNER') && onNavigate && (
          <button onClick={() => onNavigate(ViewType.DASHBOARD)} className="flex items-center gap-1 bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-600 active:scale-95 transition shadow-sm"><span>🏠 홈으로</span></button>
        )}
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* 관리자 입력 폼                                                           */}
      {/* -------------------------------------------------------------------------- */}
      {user.role === 'ADMIN' && (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-blue-200 dark:border-slate-700 shadow-sm sticky top-0 z-20">
          
          {/* 🔥 [추가됨] 매출/매입 구분 버튼 */}
          <div className="flex items-center gap-4 mb-3 pb-2 border-b border-gray-100">
             <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="dType" checked={dispatchType === 'SALES'} onChange={() => setDispatchType('SALES')} className="w-4 h-4 text-blue-600"/>
                <span className={`text-xs font-bold ${dispatchType==='SALES'?'text-blue-600':'text-gray-500'}`}>매출 (청구)</span>
             </label>
             <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="dType" checked={dispatchType === 'PURCHASE'} onChange={() => setDispatchType('PURCHASE')} className="w-4 h-4 text-green-600"/>
                <span className={`text-xs font-bold ${dispatchType==='PURCHASE'?'text-green-600':'text-gray-500'}`}>매입 (지급)</span>
             </label>
          </div>

          <div className="flex flex-col lg:flex-row gap-2 items-end">
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-7 gap-2 w-full relative">
                <select value={newDispatch.vehicleNo} onChange={e => setNewDispatch(p => ({ ...p, vehicleNo: e.target.value }))} className="col-span-1 border rounded px-2 py-1.5 text-xs font-bold h-9 bg-slate-50"><option value="">차량</option>{vehicles.map(v => <option key={v.id} value={v.vehicleNo}>{v.vehicleNo}</option>)}</select>
                <select value={newDispatch.clientName} onChange={e => setNewDispatch(p => ({ ...p, clientName: e.target.value }))} className="col-span-1 border rounded px-2 py-1.5 text-xs font-bold h-9 text-blue-600 bg-slate-50"><option value="">거래처</option>{uniqueClientNames.map(n => <option key={n} value={n}>{n}</option>)}</select>
                <div className="col-span-1 relative group"><input placeholder="상차" value={newDispatch.origin} onChange={e => handleOriginChange(e.target.value)} onFocus={() => setActiveField('origin')} onClick={() => setActiveField('origin')} onBlur={() => setTimeout(() => setActiveField(null), 200)} className="w-full border rounded px-2 py-1.5 text-xs h-9" />{renderChips('origin')}</div>
                <div className="col-span-1 relative group"><input placeholder="하차" value={newDispatch.destination} onChange={e => setNewDispatch(p => ({ ...p, destination: e.target.value }))} onFocus={() => setActiveField('destination')} onClick={() => setActiveField('destination')} onBlur={() => setTimeout(() => setActiveField(null), 200)} className="w-full border rounded px-2 py-1.5 text-xs h-9" />{renderChips('destination')}</div>
                <div className="col-span-1 relative group"><input placeholder="품명" value={newDispatch.item} onChange={e => setNewDispatch(p => ({ ...p, item: e.target.value }))} onFocus={() => setActiveField('item')} onClick={() => setActiveField('item')} onBlur={() => setTimeout(() => setActiveField(null), 200)} className="w-full border rounded px-2 py-1.5 text-xs h-9" />{renderChips('item')}</div>
                <input type="number" placeholder="회전" value={newDispatch.count} onChange={e => setNewDispatch(p => ({ ...p, count: parseInt(e.target.value)||0 }))} className="col-span-1 border rounded px-2 py-1.5 text-xs h-9 text-center" />
                <input placeholder="비고" value={newDispatch.remarks} onChange={e => setNewDispatch(p => ({ ...p, remarks: e.target.value }))} className="col-span-1 border rounded px-2 py-1.5 text-xs h-9" />
            </div>
            <button onClick={handleCreateDispatch} className={`w-full lg:w-auto text-white px-4 py-1.5 rounded font-bold text-xs h-9 shadow shrink-0 ${dispatchType==='SALES'?'bg-blue-600':'bg-green-600'}`}>등록</button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 배차 목록 뷰 (관리자: 테이블 / 기사님: 카드)                               */}
      {/* -------------------------------------------------------------------------- */}
      {user.role === 'ADMIN' ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto min-h-[300px]">
          <table className="w-full min-w-[900px] text-xs text-left text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 font-bold uppercase border-b sticky top-0">
              <tr>
                <th className="px-3 py-2 w-14 text-center">구분</th>
                <th className="px-3 py-2 w-16 text-center">상태</th>
                <th className="px-3 py-2 w-24">날짜</th>
                <th className="px-3 py-2 w-28">차량</th>
                <th className="px-3 py-2 w-32">거래처</th>
                <th className="px-3 py-2">구간</th>
                <th className="px-3 py-2 w-24">품명</th>
                <th className="px-3 py-2 w-14 text-center">회전</th>
                <th className="px-3 py-2 w-32">비고</th>
                <th className="px-3 py-2 w-36 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {userDispatches.map(d => {
                const isEditing = editingId === d.id;
                return (
                  <tr key={d.id} className={`hover:bg-slate-50 ${d.status === 'completed' ? 'bg-green-50/30' : ''}`}>
                    <td className="px-3 py-2 text-center">
                        {/* 🔥 [추가됨] 구분 뱃지 */}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${d.type === 'PURCHASE' ? 'bg-green-500' : 'bg-blue-500'}`}>
                            {d.type === 'PURCHASE' ? '매입' : '매출'}
                        </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${d.status==='completed'?'bg-green-50 text-green-600 border-green-200':d.status==='sent'?'bg-blue-50 text-blue-600 border-blue-200':'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {d.status==='pending'?'대기':d.status==='sent'?'배차중':'완료'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{d.date.substring(5)}</td>
                    <td className="px-3 py-2 font-bold text-blue-600">{d.vehicleNo}</td>
                    <td className="px-3 py-2">{d.clientName}</td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <input value={editForm?.origin} onChange={e=>setEditForm(p=>p?({...p,origin:e.target.value}):null)} className="border rounded w-20 px-1" />
                          <input value={editForm?.destination} onChange={e=>setEditForm(p=>p?({...p,destination:e.target.value}):null)} className="border rounded w-20 px-1" />
                        </div>
                      ) : (
                        `${d.origin} → ${d.destination}`
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input value={editForm?.item} onChange={e=>setEditForm(p=>p?({...p,item:e.target.value}):null)} className="border rounded w-20 px-1" />
                      ) : (
                        d.item
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">{d.count}</td>
                    <td className="px-3 py-2 truncate max-w-[100px]" title={d.remarks}>{d.remarks}</td>
                    <td className="px-3 py-2 text-center flex justify-center gap-1 items-center">
                      {isEditing ? (
                        <button onClick={()=>{if(editForm){onUpdateDispatch(editForm);setEditingId(null);}}} className="bg-blue-500 text-white px-2 py-1 rounded">저장</button>
                      ) : (
                        <>
                          {d.status==='pending'&&<button onClick={()=>onUpdateStatus(d.id,'sent')} className="bg-blue-600 text-white px-2 py-1 rounded">전송</button>}
                          
                          {/* 🔥 [추가됨] 관리자 전용 송장 등록 버튼 */}
                          {d.status !== 'completed' && (
                             <label className="text-gray-500 hover:text-blue-600 cursor-pointer p-1" title="관리자 송장 등록">
                                <Camera className="w-4 h-4"/>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAdminFileUpload(e, d.id)} />
                             </label>
                          )}

                          <button onClick={()=>startEditing(d)} className="text-slate-400 p-1">✏️</button>
                          <button onClick={()=>{if(confirm('삭제?'))onDeleteDispatch(d.id)}} className="text-slate-400 p-1">🗑️</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* 기사님용 카드 뷰 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
            {userDispatches.map(d => (
                <div key={d.id} className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border ${d.status === 'completed' ? 'border-green-500 ring-1 ring-green-500 bg-green-50/10' : 'border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1"><span className="text-xs font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{d.vehicleNo}</span><span className="text-[10px] text-slate-400">{d.date}</span></div>
                            <h4 className="font-black text-lg">{d.origin} → {d.destination}</h4>
                            <div className="text-xs text-slate-500 font-bold mt-1">{d.clientName} {d.item && `| ${d.item}`}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-black ${d.status==='completed'?'bg-green-100 text-green-700':d.status==='sent'?'bg-blue-100 text-blue-700':'bg-slate-100'}`}>{d.status==='pending'?'대기':d.status==='sent'?'배차중':'완료'}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        {d.status === 'sent' && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border"><span className="text-xs font-bold text-slate-500">실중량:</span><input type="number" inputMode="decimal" value={cardQuantities[d.id] || ''} onChange={(e) => setCardQuantities(p => ({ ...p, [d.id]: e.target.value }))} className="flex-1 bg-transparent text-right font-black text-lg text-blue-600 outline-none" placeholder="0.00" /><span className="text-xs font-bold text-slate-500">ton</span></div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => { setActiveDispatchId(d.id); setCameraOpen(true); setIsCameraMode(true); setCapturedPhoto(null); setModalQuantity(cardQuantities[d.id]||''); try{navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(s=>{if(videoRef.current)videoRef.current.srcObject=s});}catch{alert('카메라X');setCameraOpen(false);} }} className="bg-blue-50 text-blue-600 py-2.5 rounded-xl font-bold text-sm border border-blue-100">📷 촬영</button>
                                    <button onClick={() => { setActiveDispatchId(d.id); fileInputRef.current?.click(); }} className="bg-slate-50 text-slate-600 py-2.5 rounded-xl font-bold text-sm border border-slate-200">📁 앨범</button>
                                </div>
                                <button onClick={() => { if(!cardQuantities[d.id]&&!confirm('무게0?')) return; handleFinalSubmit(); }} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-sm">완료 전송</button>
                            </div>
                        )}
                        {d.status === 'completed' && (
                            <div className="flex flex-col gap-2">
                                <div className="text-center text-xs font-bold text-green-600 flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4"/> 송장 등록 완료</div>
                                <button onClick={() => { setActiveDispatchId(d.id); setModalQuantity(cardQuantities[d.id] || ''); setCameraOpen(true); setIsCameraMode(false); }} className="w-full bg-white border border-green-500 text-green-600 py-2.5 rounded-xl font-bold text-sm hover:bg-green-50">🔄 수정</button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* 카메라 및 확인 모달 (Modal)                                              */}
      {/* -------------------------------------------------------------------------- */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
           <div className="p-4 flex justify-between items-center text-white"><button onClick={closeCameraModal} className="text-lg font-bold">취소</button><span className="font-bold">송장/수량 입력</span><div className="w-10"></div></div>
           
           {/* 1. 카메라 촬영 모드 */}
           {isCameraMode ? (
               <div className="flex-1 bg-gray-900 relative flex items-center justify-center">
                   <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                   {/* 사진 촬영 시 0.5 퀄리티 압축 */}
                   <button onClick={() => { if(videoRef.current) { const cvs = document.createElement('canvas'); cvs.width = videoRef.current.videoWidth; cvs.height = videoRef.current.videoHeight; cvs.getContext('2d')?.drawImage(videoRef.current,0,0); setCapturedPhoto(cvs.toDataURL('image/jpeg', 0.5)); setIsCameraMode(false); } }} className="absolute bottom-10 w-20 h-20 bg-white rounded-full border-4 border-gray-300"></button>
               </div>
           ) : (
               /* 2. 사진 확인 모드 (앨범/촬영 후) */
               <div className="flex-1 bg-gray-900 relative flex items-center justify-center overflow-hidden">
                   {capturedPhoto ? (
                       <img src={capturedPhoto} style={{ transform: `rotate(${rotation}deg) scale(${zoomScale})` }} className="max-w-full max-h-full object-contain" />
                   ) : (
                       <div className="text-white text-center p-4"><p className="text-lg font-bold mb-2">사진 없음</p><p className="text-sm text-gray-400">수량만 수정하거나 사진을 추가하세요.</p></div>
                   )}
                   {capturedPhoto && <div className="absolute top-4 right-4 flex flex-col gap-2"><button onClick={() => setRotation(r => r + 90)} className="w-10 h-10 bg-black/50 text-white rounded-full">↻</button><button onClick={() => setZoomScale(z => z === 1 ? 2 : 1)} className="w-10 h-10 bg-black/50 text-white rounded-full">🔍</button></div>}
               </div>
           )}

           {/* 하단 입력 폼 */}
           {!isCameraMode && (
               <div className="bg-white p-5 space-y-4 rounded-t-3xl pb-10">
                   <div className="flex items-center gap-3"><label className="font-bold">실중량:</label><input type="number" inputMode="decimal" autoFocus value={modalQuantity} onChange={e => setModalQuantity(e.target.value)} className="flex-1 border-b-2 border-blue-500 p-2 text-2xl font-black text-blue-600 text-center outline-none" placeholder="0.00" /><span className="font-bold">ton</span></div>
                   <div className="flex gap-2">
                       <button onClick={() => { setIsCameraMode(true); try{navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(s=>{if(videoRef.current)videoRef.current.srcObject=s});}catch{} }} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-600">📸 재촬영</button>
                       <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-600">📁 앨범</button>
                   </div>
                   <button onClick={handleFinalSubmit} disabled={isProcessingAI} className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-lg shadow-lg">
                       {isProcessingAI ? '처리중...' : '확인 및 전송'}
                   </button>
               </div>
           )}
        </div>
      )}
    </div>
  );
};

export default DispatchManagementView;