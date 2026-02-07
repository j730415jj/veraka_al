import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Operation, Vehicle, Client, UnitPriceMaster, AuthUser } from '../types';

// PC용 컬럼 너비 설정
const colWidths = {
  check: 'w-[40px]', date: 'w-[80px]', vehicle: 'w-[100px]', client: 'w-[120px]',
  branch: 'w-[100px]', clientPrice: 'w-[100px]', origin: 'w-[150px]', dest: 'w-[150px]',
  unitPrice: 'w-[100px]', item: 'w-[120px]', qty: 'w-[80px]', supply: 'w-[110px]',
  tax: 'w-[100px]', total: 'w-[120px]', photo: 'w-[100px]', trans: 'w-[70px]',
  invoice: 'w-[70px]', remarks: 'w-[200px]', manage: 'w-[100px]',
};

interface Props {
  user: AuthUser;
  operations: Operation[];
  vehicles: Vehicle[];
  clients: Client[];
  unitPriceMaster: UnitPriceMaster[];
  onAddOperation: (op: Operation) => void;
  onUpdateOperation: (op: Operation) => void;
  onDeleteOperation: (id: string) => void;
}

const OperationEntryView: React.FC<Props> = ({ 
  user, operations, vehicles, clients, unitPriceMaster,
  onAddOperation, onUpdateOperation, onDeleteOperation 
}) => {
  // 사용자 권한 확인
  const isPartner = user.role === 'PARTNER'; // 협력업체
  const isAdmin = user.role === 'ADMIN';     // 관리자
  const isVehicle = user.role === 'VEHICLE'; // 기사님

  // 🔥 화면 모드 결정 (기사님/협력업체는 앱 모드, 관리자는 선택 가능)
  const [isAppMode, setIsAppMode] = useState(isVehicle || isPartner);

  // 검색 필터 상태
  const [filterDate, setFilterDate] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterClient, setFilterClient] = useState(isPartner ? user.identifier : '');
  const [filterBranch, setFilterBranch] = useState('');
  
  // 편집 및 상태
  const [editTarget, setEditTarget] = useState<Operation | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewingOp, setViewingOp] = useState<Operation | null>(null);
  
  // 이미지 뷰어 상태
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 🔥 [앱 모드 전용] 배차 등록 모달 상태
  const [isAppAdding, setIsAppAdding] = useState(false);

  // 신규 등록 데이터
  const [newEntry, setNewEntry] = useState<Partial<Operation>>({
    date: new Date().toISOString().split('T')[0],
    vehicleNo: isVehicle ? user.identifier : '', // 기사님은 본인 차 고정
    clientName: isPartner ? user.identifier : '', // 협력업체는 본인 상호 고정
    branchName: '', clientUnitPrice: 0, origin: '', destination: '', unitPrice: 0, 
    item: '', quantity: 0, remarks: '', settlementStatus: 'PENDING', 
    isVatIncluded: false, isInvoiceIssued: false
  });

  // 데이터 메모이제이션 (자동완성용)
  const memory = useMemo(() => ({
    origins: Array.from(new Set(operations.map(op => op.origin))).filter(Boolean).sort(),
    destinations: Array.from(new Set(operations.map(op => op.destination))).filter(Boolean).sort(),
    items: Array.from(new Set(operations.map(op => op.item))).filter(Boolean).sort(),
    vehicles: Array.from(new Set(operations.map(op => op.vehicleNo))).filter(Boolean).sort(),
    branches: Array.from(new Set(operations.map(op => op.branchName))).filter(Boolean).sort()
  }), [operations]);

  const clientNames = useMemo(() => clients.map(c => c.clientName).sort(), [clients]);

  // 가격 계산 로직
  const calculatePrices = (unitPrice: number, qty: number) => {
    const supplyPrice = Math.round(unitPrice * qty);
    const tax = Math.round(supplyPrice * 0.1);
    const totalAmount = supplyPrice + tax;
    return { supplyPrice, tax, totalAmount };
  };

  // 입력값 변경 핸들러
  const handleNewEntryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? Number(value) : value;
    
    // 거래처 변경 시 지점 초기화
    if (name === 'clientName') { 
        setNewEntry(prev => ({ ...prev, clientName: value, branchName: '' })); 
        return; 
    }

    // 단가표 자동 매칭 (지점, 상차지, 하차지 변경 시)
    if (name === 'branchName' || name === 'origin' || name === 'destination') {
      const updated = { ...newEntry, [name]: finalValue };
      const matched = unitPriceMaster.find(up => 
        up.clientName === updated.clientName &&
        (up.branchName || '') === (name === 'branchName' ? finalValue : (updated.branchName || '')) &&
        up.origin === (name === 'origin' ? finalValue : updated.origin) &&
        up.destination === (name === 'destination' ? finalValue : updated.destination)
      );
      if (matched) {
        setNewEntry(prev => ({ 
            ...prev, [name]: finalValue, 
            unitPrice: matched.unitPrice, 
            clientUnitPrice: matched.clientUnitPrice, 
            item: matched.item || prev.item 
        }));
        return;
      }
    }
    setNewEntry(prev => ({ ...prev, [name]: finalValue }));
  };

  // 배차 등록 실행
  const handleAdd = () => {
    if (!newEntry.vehicleNo && !isVehicle) { alert('차량번호는 필수입니다.'); return; }
    if (!newEntry.clientName) { alert('거래처명은 필수입니다.'); return; }
    
    const { supplyPrice, tax, totalAmount } = calculatePrices(newEntry.unitPrice || 0, newEntry.quantity || 0);
    const op: Operation = {
      ...newEntry as Operation,
      id: Date.now().toString(), itemCode: 'AUTO', itemDescription: '',
      supplyPrice, tax, totalAmount, isVatIncluded: false,
      isInvoiceIssued: newEntry.isInvoiceIssued || false, remarks: newEntry.remarks || ''
    };
    onAddOperation(op);
    setNewEntry(prev => ({ ...prev, quantity: 0, remarks: '', isInvoiceIssued: false }));
    
    // 앱 모드에서는 등록 후 창 닫기
    if (isAppMode) {
        setIsAppAdding(false);
        alert('배차가 등록되었습니다.');
    } else {
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 목록 필터링
  const filteredOperations = useMemo(() => {
    return operations.filter(op => {
      // 기사님은 본인 차만, 협력업체는 본인 거래처만 조회 (보안)
      if (isVehicle && op.vehicleNo !== user.identifier) return false;
      if (isPartner && op.clientName !== user.identifier) return false;

      return (
        op.date.includes(filterDate) &&
        op.vehicleNo.toLowerCase().includes(filterVehicle.toLowerCase()) &&
        op.clientName.toLowerCase().includes(filterClient.toLowerCase()) &&
        (op.branchName || '').toLowerCase().includes(filterBranch.toLowerCase())
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // 최신순 정렬
  }, [operations, filterDate, filterVehicle, filterClient, filterBranch, isVehicle, isPartner, user]);

  // 이미지 뷰어 관련
  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); const delta = e.deltaY > 0 ? -0.2 : 0.2; setZoom(prev => Math.min(Math.max(0.5, prev + delta), 5)); };
  const handleMouseDown = (e: React.MouseEvent) => { if (zoom <= 1) return; setIsDragging(true); dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }); };
  const handleMouseUp = () => setIsDragging(false);
  const handleDownload = () => { if (!viewingOp?.invoicePhoto) return; const link = document.createElement('a'); link.href = viewingOp.invoicePhoto; link.download = `송장_${viewingOp.vehicleNo}.jpg`; link.click(); };

  // ------------------------------------------------------------------
  // 🔥 1. 앱 모드 (카드형 UI) - 기사님/협력업체/관리자 모바일용
  // ------------------------------------------------------------------
  if (isAppMode) {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 p-4 overflow-hidden relative">
        
        {/* 상단 헤더 & 필터 */}
        <div className="flex justify-between items-center mb-4 shrink-0">
            <h2 className="text-xl font-black text-slate-800 dark:text-white">
                {isPartner ? '협력업체 배차관리' : '배차 및 운행내역'}
            </h2>
            <div className="flex gap-2">
                {/* 관리자용 전환 버튼 */}
                {isAdmin && (
                    <button onClick={() => setIsAppMode(false)} className="bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                        🖥️ PC모드
                    </button>
                )}
                <button onClick={() => setIsAppAdding(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg active:scale-95 transition-transform">
                    ➕ 배차 등록
                </button>
            </div>
        </div>

        {/* 날짜 필터 */}
        <div className="mb-4 shrink-0">
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-bold bg-white dark:bg-slate-800 dark:text-white shadow-sm" />
        </div>

        {/* 카드 리스트 */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-20 custom-scrollbar">
            {filteredOperations.length > 0 ? (
                filteredOperations.map(op => (
                    <div key={op.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                        {/* 상태 뱃지 */}
                        <div className={`absolute top-0 right-0 px-3 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-wider ${op.settlementStatus === 'SHARED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                            {op.settlementStatus === 'SHARED' ? '완료됨' : '대기중'}
                        </div>

                        {/* 날짜 & 차량 */}
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">{op.date.slice(5)}</span>
                            <span className="text-lg font-black text-slate-800 dark:text-white">{op.vehicleNo}</span>
                        </div>

                        {/* 경로 (상차지 -> 하차지) */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl text-center">
                                <span className="block text-[10px] text-slate-400 font-bold">상차</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{op.origin}</span>
                            </div>
                            <span className="text-slate-300">➜</span>
                            <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl text-center">
                                <span className="block text-[10px] text-slate-400 font-bold">하차</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{op.destination}</span>
                            </div>
                        </div>

                        {/* 상세 정보 (품명, 수량, 금액) */}
                        <div className="grid grid-cols-3 gap-2 text-center mb-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl">
                                <span className="block text-[10px] text-blue-400 font-bold">품명</span>
                                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{op.item}</span>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl">
                                <span className="block text-[10px] text-blue-400 font-bold">수량</span>
                                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{op.quantity}t</span>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-900/20 p-2 rounded-xl">
                                <span className="block text-[10px] text-rose-400 font-bold">합계</span>
                                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{(isPartner ? Math.round(op.clientUnitPrice * op.quantity * 1.1) : op.totalAmount).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* 송장 사진 (터치하면 확대) */}
                        {op.invoicePhoto ? (
                            <div 
                                onClick={() => { setViewingOp(op); setZoom(1); }}
                                className="w-full h-12 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
                            >
                                <span className="text-xl">📸</span>
                                <span className="text-xs font-bold text-slate-500">송장 사진 확인하기</span>
                            </div>
                        ) : (
                            <div className="w-full h-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-xs text-slate-400 font-bold">
                                송장 미등록
                            </div>
                        )}
                        
                        {/* 관리자용 삭제 버튼 */}
                        {isAdmin && (
                            <button onClick={() => { if(window.confirm('삭제하시겠습니까?')) onDeleteOperation(op.id); }} className="absolute bottom-2 right-2 text-red-400 text-xs p-2">삭제</button>
                        )}
                    </div>
                ))
            ) : (
                <div className="flex flex-col items-center justify-center h-60 text-slate-400 opacity-50">
                    <span className="text-4xl mb-2">📭</span>
                    <span className="font-bold">내역이 없습니다.</span>
                </div>
            )}
        </div>

        {/* 🔥 배차 등록 모달 (앱용) */}
        {isAppAdding && (
            <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">새 배차 등록</h3>
                    <button onClick={() => setIsAppAdding(false)} className="text-slate-400 p-2">✕</button>
                </div>
                
                <div className="flex-1 space-y-4 overflow-y-auto">
                    <div>
                        <label className="text-xs font-bold text-slate-500 ml-1">날짜</label>
                        <input type="date" name="date" value={newEntry.date} onChange={handleNewEntryChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold dark:text-white" />
                    </div>
                    {!isVehicle && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 ml-1">차량번호</label>
                            <input type="text" name="vehicleNo" list="past-vehicles" value={newEntry.vehicleNo} onChange={handleNewEntryChange} placeholder="차량번호 입력" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold dark:text-white" />
                        </div>
                    )}
                    {!isPartner && (
                        <div>
                            <label className="text-xs font-bold text-slate-500 ml-1">거래처</label>
                            <select name="clientName" value={newEntry.clientName} onChange={handleNewEntryChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold dark:text-white">
                                <option value="">거래처 선택</option>
                                {clientNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 ml-1">상차지</label>
                            <input type="text" name="origin" list="past-origins" value={newEntry.origin} onChange={handleNewEntryChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-center dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 ml-1">하차지</label>
                            <input type="text" name="destination" list="past-destinations" value={newEntry.destination} onChange={handleNewEntryChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-center dark:text-white" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 ml-1">품명</label>
                            <input type="text" name="item" list="past-items" value={newEntry.item} onChange={handleNewEntryChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-center dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 ml-1">수량 (t)</label>
                            <input type="number" step="0.01" name="quantity" value={newEntry.quantity} onChange={handleNewEntryChange} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-center dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 ml-1">비고</label>
                        <input type="text" name="remarks" value={newEntry.remarks} onChange={handleNewEntryChange} placeholder="특이사항 입력" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl dark:text-white" />
                    </div>
                </div>

                <button onClick={handleAdd} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl mt-4">
                    등록 완료
                </button>
            </div>
        )}

        {/* 데이터 리스트 (자동완성용) */}
        <datalist id="past-origins">{memory.origins.map(o => <option key={o} value={o} />)}</datalist>
        <datalist id="past-destinations">{memory.destinations.map(d => <option key={d} value={d} />)}</datalist>
        <datalist id="past-items">{memory.items.map(i => <option key={i} value={i} />)}</datalist>
        <datalist id="past-vehicles">{memory.vehicles.map(v => <option key={v} value={v} />)}</datalist>

        {/* 이미지 뷰어 (앱용) */}
        {viewingOp && (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-center animate-in fade-in">
                <button onClick={() => setViewingOp(null)} className="absolute top-4 right-4 text-white p-4 z-50">✕ 닫기</button>
                <div className="flex-1 overflow-hidden flex items-center justify-center" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
                    <img 
                        src={viewingOp.invoicePhoto} 
                        style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)` }} 
                        className="max-w-full max-h-full object-contain" 
                    />
                </div>
                <div className="h-20 bg-slate-900 flex justify-center items-center gap-8">
                    <button onClick={() => setRotation(r => r - 90)} className="text-white p-4">↺</button>
                    <button onClick={() => setZoom(z => Math.max(1, z - 0.5))} className="text-white p-4">－</button>
                    <button onClick={() => setZoom(z => Math.min(5, z + 0.5))} className="text-white p-4">＋</button>
                    <button onClick={() => setRotation(r => r + 90)} className="text-white p-4">↻</button>
                    <button onClick={handleDownload} className="text-emerald-400 font-bold p-4">저장</button>
                </div>
            </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // 🔥 2. PC 모드 (기존 테이블 화면) - 관리자 전용
  // ------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full space-y-3 p-4 overflow-hidden relative">
      <datalist id="past-origins">{memory.origins.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="past-destinations">{memory.destinations.map(d => <option key={d} value={d} />)}</datalist>
      <datalist id="past-items">{memory.items.map(i => <option key={i} value={i} />)}</datalist>
      <datalist id="past-vehicles">{memory.vehicles.map(v => <option key={v} value={v} />)}</datalist>
      <datalist id="past-branches">{memory.branches.map(b => <option key={b} value={b} />)}</datalist>

      {/* 필터 박스 */}
      <div className="bg-white dark:bg-slate-900 p-3 md:p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 no-print transition-colors shrink-0">
        <div className="flex justify-between mb-2">
            <h3 className="font-bold text-slate-600 dark:text-slate-300">PC 관리자 모드</h3>
            <button onClick={() => setIsAppMode(true)} className="bg-slate-100 px-3 py-1 rounded text-xs font-bold hover:bg-slate-200">📱 앱 모드로 전환</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 md:gap-4 mb-2">
          {[
            { label: '일자 검색', val: filterDate, set: setFilterDate, ph: 'YYYY-MM-DD' },
            { label: '차량번호', val: filterVehicle, set: setFilterVehicle, ph: '차량번호', list: 'past-vehicles' },
            { label: '거래처명', val: filterClient, set: setFilterClient, ph: '거래처', disabled: isPartner },
            { label: '지점명', val: filterBranch, set: setFilterBranch, ph: '지점명', list: 'past-branches' },
          ].map((f, i) => (
            <div key={i} className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 ml-1">{f.label}</label>
              <input type="text" placeholder={f.ph} list={(f as any).list} value={f.val} onChange={e => f.set(e.target.value)} disabled={(f as any).disabled} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none" />
            </div>
          ))}
        </div>
        <div className="flex justify-end items-center mt-2">
            <button className="bg-[#2563eb] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-black shadow-sm">조회하기</button>
        </div>
      </div>

      {/* 테이블 영역 */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-colors min-h-0 relative">
        <div ref={scrollContainerRef} className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
          <table className="w-full text-[11px] text-left border-collapse table-fixed min-w-[1850px]">
            <thead className="bg-[#445164] dark:bg-slate-800 text-white sticky top-0 z-30">
              <tr className="divide-x divide-slate-500 dark:divide-slate-700 text-center">
                <th className={`${colWidths.date} px-2 py-3`}>일자</th>
                <th className={`${colWidths.vehicle} px-2 py-3`}>차량번호</th>
                <th className={`${colWidths.client} px-2 py-3`}>거래처명</th>
                <th className={`${colWidths.branch} px-2 py-3`}>지점명</th>
                <th className={`${colWidths.clientPrice} px-2 py-3`}>거래처 단가</th>
                <th className={`${colWidths.origin} px-2 py-3`}>상차지</th>
                <th className={`${colWidths.dest} px-2 py-3`}>하차지</th>
                {!isPartner && <th className={`${colWidths.unitPrice} px-2 py-3`}>차량 단가</th>}
                <th className={`${colWidths.item} px-2 py-3`}>품명</th>
                <th className={`${colWidths.qty} px-2 py-3`}>수량</th>
                <th className={`${colWidths.supply} px-2 py-3`}>공급가액</th>
                <th className={`${colWidths.tax} px-2 py-3`}>세액</th>
                <th className={`${colWidths.total} px-2 py-3`}>합계금액</th>
                <th className={`${colWidths.photo} px-2 py-3`}>송장 / 선택</th>
                <th className={`${colWidths.manage} px-2 py-3`}>관리</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {/* 입력 행 */}
                <tr className="bg-amber-50 dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-800 divide-x divide-slate-200 dark:divide-slate-800 no-print shadow-md sticky top-[41px] z-20">
                    <td className="p-1"><input type="date" name="date" value={newEntry.date} onChange={handleNewEntryChange} className="w-full bg-white dark:bg-slate-800 border rounded px-1 py-1 text-xs" /></td>
                    <td className="p-1"><input type="text" name="vehicleNo" list="past-vehicles" value={newEntry.vehicleNo} onChange={handleNewEntryChange} className="w-full bg-white border rounded px-1 py-1 text-xs text-center font-bold" /></td>
                    <td className="p-1"><select name="clientName" value={newEntry.clientName} onChange={handleNewEntryChange} disabled={isPartner} className="w-full bg-white border rounded px-0.5 py-1 text-xs font-bold"><option value="">거래처</option>{clientNames.map(name => <option key={name} value={name}>{name}</option>)}</select></td>
                    <td className="p-1"><select name="branchName" value={newEntry.branchName} onChange={handleNewEntryChange} className="w-full bg-white border rounded px-0.5 py-1 text-xs font-bold"><option value="">지점</option></select></td>
                    <td className="p-1"><input type="number" name="clientUnitPrice" value={newEntry.clientUnitPrice} onChange={handleNewEntryChange} className="w-full bg-rose-50 border-2 border-rose-200 rounded px-1 py-1 text-xs text-right font-black text-rose-700" /></td>
                    <td className="p-1"><input type="text" name="origin" list="past-origins" value={newEntry.origin} onChange={handleNewEntryChange} className="w-full bg-white border rounded px-1 py-1 text-xs text-center" /></td>
                    <td className="p-1"><input type="text" name="destination" list="past-destinations" value={newEntry.destination} onChange={handleNewEntryChange} className="w-full bg-white border rounded px-1 py-1 text-xs text-center" /></td>
                    {!isPartner && <td className="p-1"><input type="number" name="unitPrice" value={newEntry.unitPrice} onChange={handleNewEntryChange} className="w-full bg-blue-50 border-2 border-blue-200 rounded px-1 py-1 text-xs text-right font-black text-blue-700" /></td>}
                    <td className="p-1"><input type="text" name="item" list="past-items" value={newEntry.item} onChange={handleNewEntryChange} className="w-full bg-white border rounded px-1 py-1 text-xs text-center" /></td>
                    <td className="p-1"><input type="number" step="0.01" name="quantity" value={newEntry.quantity} onChange={handleNewEntryChange} className="w-full bg-white border rounded px-1 py-1 text-xs font-bold text-center" /></td>
                    <td colSpan={3} className="p-2 text-center text-slate-400 font-bold">자동계산</td>
                    <td className="p-1 text-center bg-amber-50 text-[9px] text-slate-400">사진</td>
                    <td className="p-1 text-center"><button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white w-full py-1.5 rounded text-xs font-black shadow-md">등록</button></td>
                </tr>

                {/* 데이터 리스트 */}
                {filteredOperations.map((op) => (
                    <tr key={op.id} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors divide-x divide-slate-100 dark:divide-slate-800">
                        <td className="px-2 py-2.5 text-center">{op.date.slice(5)}</td>
                        <td className="px-2 py-2.5 text-center font-bold">{op.vehicleNo}</td>
                        <td className="px-2 py-2.5 text-center font-bold text-rose-600">{op.clientName}</td>
                        <td className="px-2 py-2.5 text-center font-medium">{op.branchName || '-'}</td>
                        <td className="px-2 py-2.5 text-right font-bold text-rose-500">{op.clientUnitPrice.toLocaleString()}</td>
                        <td className="px-2 py-2.5 text-center truncate">{op.origin}</td>
                        <td className="px-2 py-2.5 text-center truncate">{op.destination}</td>
                        {!isPartner && <td className="px-2 py-2.5 text-right font-bold text-blue-600">{op.unitPrice.toLocaleString()}</td>}
                        <td className="px-2 py-2.5 text-center">{op.item}</td>
                        <td className="px-2 py-2.5 text-center font-bold">{op.quantity}</td>
                        <td className="px-2 py-2.5 text-right font-bold text-slate-500">{op.supplyPrice.toLocaleString()}</td>
                        <td className="px-2 py-2.5 text-right font-bold text-slate-500">{op.tax.toLocaleString()}</td>
                        <td className="px-2 py-2.5 text-right font-black text-rose-600">{op.totalAmount.toLocaleString()}</td>
                        <td className="px-2 py-1 text-center">
                            {op.invoicePhoto ? <img src={op.invoicePhoto} className="w-8 h-8 rounded border mx-auto cursor-pointer" onClick={() => { setViewingOp(op); setZoom(1); }} /> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-2 py-2 text-center">
                            <button onClick={() => onDeleteOperation(op.id)} className="text-red-400 hover:text-red-600 font-bold">삭제</button>
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 이미지 뷰어 (PC용) */}
      {viewingOp && (
        <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6" onWheel={handleWheel}>
            <div className="w-full max-w-6xl h-[90vh] bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
                <div className="h-16 bg-slate-50 flex items-center justify-between px-6">
                    <h3 className="font-black text-slate-800">송장 미리보기</h3>
                    <div className="flex gap-2">
                        <button onClick={handleDownload} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold">저장</button>
                        <button onClick={() => setViewingOp(null)} className="text-slate-400 hover:text-red-500">✕</button>
                    </div>
                </div>
                <div className="flex-1 flex justify-center items-center overflow-hidden bg-slate-100" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
                    <img src={viewingOp.invoicePhoto} style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)` }} className="max-w-[90%] max-h-[90%] object-contain shadow-2xl" />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default OperationEntryView;