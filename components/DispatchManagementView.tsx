import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthUser, Dispatch, Vehicle, Client, Snippet, Operation, ViewType, UnitPriceMaster } from '../types';
import { supabase } from '../supabase';
import { Camera, CheckCircle } from 'lucide-react';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbG52ZWRwanR4dHpqcHJraGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwNjM1NDcsImV4cCI6MjA1MzYzOTU0N30.yCVDdBmeCGBnKx2ITNF0KWXQ3GH6ZxDyRKoVPGu9FcE';

const uploadToNAS = async (imageBase64: string, fileName: string): Promise<string | null> => {
  try {
    const res = await fetch('https://yglnvedpjtxtzjprkhjp.supabase.co/functions/v1/upload-to-nas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ imageBase64, fileName })
    });
    const data = await res.json();
    if (data.success) return data.nasUrl;
    return null;
  } catch (err) { console.warn('NAS 업로드 실패:', err); return null; }
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
  const [newDispatch, setNewDispatch] = useState({ vehicleNo: '', clientName: '', origin: '', destination: '', item: '', count: 1, remarks: '' });
  const [dispatchType, setDispatchType] = useState<'SALES' | 'PURCHASE'>('SALES');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Dispatch | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [activeDispatchId, setActiveDispatchId] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [rotation, setRotation] = useState(0); 
  const [zoomScale, setZoomScale] = useState(1);
  const [modalQuantity, setModalQuantity] = useState('');
  const [cardQuantities, setCardQuantities] = useState<Record<string, string>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || user.role !== 'VEHICLE') return;
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await supabase.from('vehicles').update({ lat: latitude, lng: longitude }).eq('id', user.id);
      },
      (error) => console.error("GPS 에러:", error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user]);

  const uniqueClientNames = useMemo(() => Array.from(new Set(clients.map(c => c.clientName))).sort(), [clients]);

  const recentData = useMemo(() => {
    const getUniqueRecent = (key: 'origin' | 'destination' | 'item' | 'remarks') => {
      const fromDispatches = dispatches.map(d => String(d[key as keyof Dispatch] || ''));
      const fromOps = operations.map(o => String(o[key as keyof Operation] || ''));
      const combined = [...fromDispatches, ...fromOps].map(v => v.trim()).filter(v => v !== '' && v !== 'undefined' && v !== 'null');
      return Array.from(new Set(combined)).reverse().slice(0, 8);
    };
    return { origin: getUniqueRecent('origin'), destination: getUniqueRecent('destination'), item: getUniqueRecent('item'), remarks: getUniqueRecent('remarks') };
  }, [dispatches, operations]);

  const handleOriginChange = (val: string) => {
    setNewDispatch(prev => ({ ...prev, origin: val }));
    const match = snippets.find(s => s.keyword === val);
    if (match) setNewDispatch(prev => ({ ...prev, origin: match.origin || prev.origin, destination: match.destination || prev.destination, item: match.item || prev.item, clientName: match.clientName || prev.clientName }));
  };

  const applySnippet = (s: Snippet) => {
    setNewDispatch(prev => ({ ...prev, origin: s.origin || '', destination: s.destination || '', item: s.item || '', clientName: s.clientName || prev.clientName }));
    setActiveField(null);
  };

  const selectSuggestion = (field: string, value: string) => {
    if (field === 'origin') handleOriginChange(value);
    else setNewDispatch(prev => ({ ...prev, [field]: value } as any));
    setActiveField(null);
  };

  const handleCreateDispatch = () => {
    if (!newDispatch.vehicleNo || !newDispatch.origin || !newDispatch.destination) { alert('차량, 상차지, 하차지는 필수 입력 사항입니다.'); return; }
    const d: Dispatch = { id: generateUUID(), date: new Date().toISOString().split('T')[0], vehicleNo: newDispatch.vehicleNo, clientName: newDispatch.clientName || '미지정', origin: newDispatch.origin, destination: newDispatch.destination, item: newDispatch.item, count: newDispatch.count, remarks: newDispatch.remarks, status: 'pending', type: dispatchType };
    onAddDispatch(d);
    const newSnippet: Snippet = { id: generateUUID(), title: `${d.origin} ▶ ${d.destination}`, content: d.item || '자동생성', keyword: d.origin, origin: d.origin, destination: d.destination, item: d.item, clientName: d.clientName };
    onAddSnippet(newSnippet);
    setNewDispatch({ vehicleNo: '', clientName: '', origin: '', destination: '', item: '', count: 1, remarks: '' });
    setActiveField(null);
    setTimeout(() => { if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' }); }, 100);
  };

  const startEditing = (d: Dispatch) => { setEditingId(d.id); setEditForm({ ...d }); };
  
  const userDispatches = dispatches.filter(d => user.role === 'ADMIN' || String(d.vehicleNo).trim() === String(user.identifier).trim() || (user.role === 'PARTNER' && d.clientName === user.identifier));

  const renderChips = (field: keyof typeof recentData) => {
    const items = recentData[field];
    const matchingSnippets = field === 'origin' ? snippets.filter(s => (s.keyword && s.keyword.includes(newDispatch.origin)) || (s.origin && s.origin.includes(newDispatch.origin))) : [];
    if (activeField !== field) return null;
    if (items.length === 0 && matchingSnippets.length === 0) return null;
    return (
      <div className="absolute top-full left-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-2 mt-1 flex flex-col gap-1 w-full max-h-60 overflow-y-auto" onMouseDown={(e) => e.preventDefault()}>
        {field === 'origin' && matchingSnippets.map(s => (
          <button key={`snip-${s.id}`} onMouseDown={(e) => { e.preventDefault(); applySnippet(s); }} className="text-left bg-blue-50 text-blue-700 px-3 py-2 rounded text-xs font-bold hover:bg-blue-100 border border-blue-100">⭐ {s.keyword || s.title}</button>
        ))}
        {items.map((item, idx) => (
          <button key={`${String(field)}-${idx}`} onMouseDown={(e) => { e.preventDefault(); selectSuggestion(String(field), item); }} className="text-left bg-slate-50 text-slate-700 px-3 py-2 rounded text-xs font-medium hover:bg-slate-100 border border-slate-100">{item}</button>
        ))}
      </div>
    );
  };

  const closeCameraModal = () => {
    setCameraOpen(false); setIsCameraMode(false); setCapturedPhoto(null);
    setModalQuantity(''); setRotation(0); setZoomScale(1); setActiveDispatchId(null);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const uploadPhoto = async (photoBase64: string, dispatchId: string): Promise<string> => {
    const fileName = `invoice_${dispatchId}_${Date.now()}.jpg`;
    const base64Data = photoBase64.split(',')[1];
    const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const { error } = await supabase.storage.from('invoices').upload(fileName, byteArray, { contentType: 'image/jpeg' });
    let supabaseUrl = '';
    if (!error) supabaseUrl = supabase.storage.from('invoices').getPublicUrl(fileName).data.publicUrl;
    uploadToNAS(photoBase64, fileName).then(nasUrl => { if (nasUrl) console.log('✅ NAS 업로드 완료:', nasUrl); });
    return supabaseUrl;
  };

  const handleFinalSubmitInternal = async (targetId: string, photoBase64: string | undefined, qty: number) => {
    const targetDispatch = dispatches.find(d => d.id === targetId);
    if (!targetDispatch) throw new Error('배차 정보를 찾을 수 없습니다.');

    let photoUrl = photoBase64;
    if (photoBase64 && photoBase64.startsWith('data:')) {
      photoUrl = await uploadPhoto(photoBase64, targetId);
    }

    // ✅ dispatch ID로 먼저 찾고 없으면 조건으로 찾기
    const existingOp = operations.find(o => o.id === targetId) ||
      operations.find(o => 
        o.vehicleNo === targetDispatch.vehicleNo && 
        o.date === targetDispatch.date && 
        o.origin === targetDispatch.origin && 
        o.destination === targetDispatch.destination
      );

    const matchedPrice = unitPrices?.find(up => up.clientName === targetDispatch.clientName && up.origin === targetDispatch.origin && up.destination === targetDispatch.destination && up.item === targetDispatch.item);
    
    const unitPrice = matchedPrice ? matchedPrice.unitPrice : (existingOp?.unitPrice || 0);
    const clientUnitPrice = matchedPrice ? matchedPrice.clientUnitPrice : (existingOp?.clientUnitPrice || 0);
    const supplyPrice = Math.floor(unitPrice * qty);
    const tax = Math.floor(supplyPrice * 0.1); 
    const totalAmount = supplyPrice + tax;

    const opData: Operation = {
      id: existingOp ? existingOp.id : generateUUID(), 
      date: targetDispatch.date, clientName: targetDispatch.clientName, vehicleNo: targetDispatch.vehicleNo, 
      origin: targetDispatch.origin, destination: targetDispatch.destination, item: targetDispatch.item, 
      quantity: qty, unitPrice, clientUnitPrice, supplyPrice, tax, totalAmount, 
      remarks: targetDispatch.remarks || '', 
      invoicePhoto: photoUrl || (existingOp ? existingOp.invoicePhoto : undefined),
      isInvoiceIssued: existingOp ? existingOp.isInvoiceIssued : false, 
      settlementStatus: existingOp ? existingOp.settlementStatus : 'PENDING', 
      itemDescription: targetDispatch.item, 
      branchName: matchedPrice?.branchName || (existingOp?.branchName || ''), 
      itemCode: '', isVatIncluded: false,
      type: targetDispatch.type
    };

    if (existingOp && onUpdateOperation) await onUpdateOperation(opData); 
    else await onAddOperation(opData); 
    await onUpdateStatus(targetId, 'completed', photoUrl, qty);
  };

  const handleAdminFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, dispatchId: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try { await handleFinalSubmitInternal(dispatchId, base64, 0); alert('송장이 등록되었습니다.'); } 
        catch (err) { alert('사진 업로드 실패'); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinalSubmit = async (overrideId?: string, overrideQty?: number) => {
    const targetId = overrideId ?? activeDispatchId;
    if (!targetId) return;
    setIsProcessingAI(true);
    try {
      const quantity = overrideQty !== undefined ? overrideQty : (modalQuantity ? parseFloat(modalQuantity) : 0);
      await handleFinalSubmitInternal(targetId, capturedPhoto || undefined, quantity);
      closeCameraModal();
    } catch (error) {
      console.error("배차 처리 중 오류 발생:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally { setIsProcessingAI(false); }
  };

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto custom-scrollbar p-4 space-y-4 flex flex-col">
      <input type="file" ref={fileInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => { 
            setCapturedPhoto(reader.result as string); setCameraOpen(true); setIsCameraMode(false); 
            if (activeDispatchId && cardQuantities[activeDispatchId]) setModalQuantity(cardQuantities[activeDispatchId]);
          };
          reader.readAsDataURL(file);
        }
      }} accept="image/*" className="hidden" />

      <div className="flex justify-between items-center shrink-0">
        <div><h2 className="text-xl font-black text-slate-800 dark:text-slate-100">배차 관리</h2></div>
        {(user.role === 'VEHICLE' || user.role === 'PARTNER') && onNavigate && (
          <button onClick={() => onNavigate(ViewType.DASHBOARD)} className="flex items-center gap-1 bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-600 active:scale-95 transition shadow-sm"><span>🏠 홈으로</span></button>
        )}
      </div>

      {user.role === 'ADMIN' && (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-blue-200 dark:border-slate-700 shadow-sm sticky top-0 z-20">
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
                <input list="vehicleOptions" placeholder="차량(수동)" value={newDispatch.vehicleNo} onChange={e => setNewDispatch(p => ({ ...p, vehicleNo: e.target.value }))} className="col-span-1 border rounded px-2 py-1.5 text-xs font-bold h-9 bg-slate-50"/>
                <datalist id="vehicleOptions">{vehicles.map(v => <option key={v.id} value={v.vehicleNo}>{v.vehicleNo}</option>)}</datalist>
                <input list="clientOptions" placeholder="거래처(수동)" value={newDispatch.clientName} onChange={e => setNewDispatch(p => ({ ...p, clientName: e.target.value }))} className="col-span-1 border rounded px-2 py-1.5 text-xs font-bold h-9 text-blue-600 bg-slate-50"/>
                <datalist id="clientOptions">{uniqueClientNames.map(n => <option key={n} value={n} />)}</datalist>
                <div className="col-span-1 relative"><input placeholder="상차" value={newDispatch.origin} onChange={e => handleOriginChange(e.target.value)} onFocus={() => setActiveField('origin')} onMouseDown={() => setActiveField('origin')} className="w-full border rounded px-2 py-1.5 text-xs h-9" />{renderChips('origin')}</div>
                <div className="col-span-1 relative"><input placeholder="하차" value={newDispatch.destination} onChange={e => setNewDispatch(p => ({ ...p, destination: e.target.value }))} onFocus={() => setActiveField('destination')} onMouseDown={() => setActiveField('destination')} className="w-full border rounded px-2 py-1.5 text-xs h-9" />{renderChips('destination')}</div>
                <div className="col-span-1 relative"><input placeholder="품명" value={newDispatch.item} onChange={e => setNewDispatch(p => ({ ...p, item: e.target.value }))} onFocus={() => setActiveField('item')} onMouseDown={() => setActiveField('item')} className="w-full border rounded px-2 py-1.5 text-xs h-9" />{renderChips('item')}</div>
                <input type="number" placeholder="회전" value={newDispatch.count} onChange={e => setNewDispatch(p => ({ ...p, count: parseInt(e.target.value)||0 }))} className="col-span-1 border rounded px-2 py-1.5 text-xs h-9 text-center" />
                <input placeholder="비고" value={newDispatch.remarks} onChange={e => setNewDispatch(p => ({ ...p, remarks: e.target.value }))} className="col-span-1 border rounded px-2 py-1.5 text-xs h-9" />
            </div>
            <button onClick={handleCreateDispatch} className={`w-full lg:w-auto text-white px-4 py-1.5 rounded font-bold text-xs h-9 shadow shrink-0 ${dispatchType==='SALES'?'bg-blue-600':'bg-green-600'}`}>등록</button>
          </div>
        </div>
      )}

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
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${d.type === 'PURCHASE' ? 'bg-green-500' : 'bg-blue-500'}`}>{d.type === 'PURCHASE' ? '매입' : '매출'}</span>
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
                      ) : (`${d.origin} → ${d.destination}`)}
                    </td>
                    <td className="px-3 py-2">{isEditing ? (<input value={editForm?.item} onChange={e=>setEditForm(p=>p?({...p,item:e.target.value}):null)} className="border rounded w-20 px-1" />) : (d.item)}</td>
                    <td className="px-3 py-2 text-center">{d.count}</td>
                    <td className="px-3 py-2 truncate max-w-[100px]" title={d.remarks}>{d.remarks}</td>
                    <td className="px-3 py-2 text-center flex justify-center gap-1 items-center">
                      {isEditing ? (
                        <button onClick={()=>{if(editForm){onUpdateDispatch(editForm);setEditingId(null);}}} className="bg-blue-500 text-white px-2 py-1 rounded">저장</button>
                      ) : (
                        <>
                          {d.status==='pending'&&<button onClick={()=>onUpdateStatus(d.id,'sent')} className="bg-blue-600 text-white px-2 py-1 rounded">전송</button>}
                          {d.status !== 'completed' && (
                             <label className="text-gray-500 hover:text-blue-600 cursor-pointer p-1" title="송장 등록">
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
                                <button onClick={() => { if(!cardQuantities[d.id]&&!confirm('무게0?')) return; setActiveDispatchId(d.id); handleFinalSubmit(d.id, cardQuantities[d.id] ? parseFloat(cardQuantities[d.id]) : 0); }} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-sm">완료 전송</button>
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

      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
           <div className="p-4 flex justify-between items-center text-white"><button onClick={closeCameraModal} className="text-lg font-bold">취소</button><span className="font-bold">송장/수량 입력</span><div className="w-10"></div></div>
           {isCameraMode ? (
               <div className="flex-1 bg-gray-900 relative flex items-center justify-center">
                   <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                   <button onClick={() => { if(videoRef.current) { const cvs = document.createElement('canvas'); cvs.width = videoRef.current.videoWidth; cvs.height = videoRef.current.videoHeight; cvs.getContext('2d')?.drawImage(videoRef.current,0,0); setCapturedPhoto(cvs.toDataURL('image/jpeg', 0.5)); setIsCameraMode(false); } }} className="absolute bottom-10 w-20 h-20 bg-white rounded-full border-4 border-gray-300"></button>
               </div>
           ) : (
               <div className="flex-1 bg-gray-900 relative flex items-center justify-center overflow-hidden">
                   {capturedPhoto ? (<img src={capturedPhoto} style={{ transform: `rotate(${rotation}deg) scale(${zoomScale})` }} className="max-w-full max-h-full object-contain" />) : (<div className="text-white text-center p-4"><p className="text-lg font-bold mb-2">사진 없음</p><p className="text-sm text-gray-400">수량만 수정하거나 사진을 추가하세요.</p></div>)}
                   {capturedPhoto && <div className="absolute top-4 right-4 flex flex-col gap-2"><button onClick={() => setRotation(r => r + 90)} className="w-10 h-10 bg-black/50 text-white rounded-full">↻</button><button onClick={() => setZoomScale(z => z === 1 ? 2 : 1)} className="w-10 h-10 bg-black/50 text-white rounded-full">🔍</button></div>}
               </div>
           )}
           {!isCameraMode && (
               <div className="bg-white p-5 space-y-4 rounded-t-3xl pb-10">
                   <div className="flex items-center gap-3"><label className="font-bold">실중량:</label><input type="number" inputMode="decimal" autoFocus value={modalQuantity} onChange={e => setModalQuantity(e.target.value)} className="flex-1 border-b-2 border-blue-500 p-2 text-2xl font-black text-blue-600 text-center outline-none" placeholder="0.00" /><span className="font-bold">ton</span></div>
                   <div className="flex gap-2">
                       <button onClick={() => { setIsCameraMode(true); try{navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(s=>{if(videoRef.current)videoRef.current.srcObject=s});}catch{} }} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-600">📸 재촬영</button>
                       <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-600">📁 앨범</button>
                   </div>
                     <button onClick={() => handleFinalSubmit()} disabled={isProcessingAI} className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-lg shadow-lg">
                       {isProcessingAI ? '📤 NAS + Supabase 저장중...' : '확인 및 전송'}
                     </button>
               </div>
           )}
        </div>
      )}
    </div>
  );
};

export default DispatchManagementView;
