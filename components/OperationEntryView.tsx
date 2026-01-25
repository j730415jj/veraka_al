import React, { useMemo, useState, useRef } from 'react';
import { Operation, Vehicle, Client, UnitPriceMaster, AuthUser } from '../types';

// 테이블 컬럼 너비 설정 (전송완료 컬럼 추가 및 너비 조정)
const colWidths = {
  check: 'w-[40px]', 
  date: 'w-[80px]',
  vehicle: 'w-[100px]',
  client: 'w-[120px]',
  branch: 'w-[100px]',
  clientPrice: 'w-[100px]',
  origin: 'w-[150px]',
  dest: 'w-[150px]',
  unitPrice: 'w-[100px]',
  item: 'w-[120px]',
  qty: 'w-[80px]',
  supply: 'w-[110px]',
  tax: 'w-[100px]',
  total: 'w-[120px]',
  photo: 'w-[90px]', // 사진+체크박스 공간 확보
  trans: 'w-[70px]', // 전송완료(NEW)
  invoice: 'w-[70px]', // 송장상태
  remarks: 'w-[200px]',
  manage: 'w-[100px]',
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
  user,
  operations, 
  vehicles, 
  clients, 
  unitPriceMaster,
  onAddOperation, 
  onUpdateOperation, 
  onDeleteOperation 
}) => {
  const isPartner = user.role === 'PARTNER';

  // 필터 상태
  const [filterDate, setFilterDate] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterClient, setFilterClient] = useState(isPartner ? user.identifier : '');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [filterRemarks, setFilterRemarks] = useState('');
  
  const [editTarget, setEditTarget] = useState<Operation | null>(null);
  
  // 공유를 위한 선택된 ID 목록
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 뷰어 관련 상태
  const [viewingOp, setViewingOp] = useState<Operation | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [newEntry, setNewEntry] = useState<Partial<Operation>>({
    date: new Date().toISOString().split('T')[0],
    vehicleNo: '',
    clientName: isPartner ? user.identifier : '',
    branchName: '', 
    clientUnitPrice: 0,
    origin: '',
    destination: '',
    unitPrice: 0,
    item: '',
    quantity: 0,
    remarks: '',
    settlementStatus: 'PENDING',
    isVatIncluded: false,
    isInvoiceIssued: false
  });

  const clientNames = useMemo(() => clients.map(c => c.clientName).sort(), [clients]);

  const availableBranchesForNew = useMemo(() => {
    const client = clients.find(c => c.clientName === newEntry.clientName);
    return client?.branches || [];
  }, [clients, newEntry.clientName]);

  const availableBranchesForEdit = useMemo(() => {
    if (!editTarget) return [];
    const client = clients.find(c => c.clientName === editTarget.clientName);
    return client?.branches || [];
  }, [clients, editTarget?.clientName]);

  const memory = useMemo(() => {
    return {
      origins: Array.from(new Set(operations.map(op => op.origin))).filter(Boolean).sort(),
      destinations: Array.from(new Set(operations.map(op => op.destination))).filter(Boolean).sort(),
      items: Array.from(new Set(operations.map(op => op.item))).filter(Boolean).sort(),
      vehicles: Array.from(new Set(operations.map(op => op.vehicleNo))).filter(Boolean).sort(),
      branches: Array.from(new Set(operations.map(op => op.branchName))).filter(Boolean).sort()
    };
  }, [operations]);

  const calculatePrices = (unitPrice: number, qty: number) => {
    const supplyPrice = Math.round(unitPrice * qty);
    const tax = Math.round(supplyPrice * 0.1);
    const totalAmount = supplyPrice + tax;
    return { supplyPrice, tax, totalAmount };
  };

  const handleNewEntryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? Number(value) : value;
    
    if (name === 'clientName') {
       setNewEntry(prev => ({ ...prev, clientName: value, branchName: '' }));
       return;
    }

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
          ...prev,
          [name]: finalValue,
          unitPrice: matched.unitPrice,
          clientUnitPrice: matched.clientUnitPrice,
          item: matched.item || prev.item
        }));
        return;
      }
    }
    
    setNewEntry(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleAdd = () => {
    if (!newEntry.vehicleNo || !newEntry.clientName) {
      alert('차량번호와 거래처명은 필수입니다.');
      return;
    }
    const { supplyPrice, tax, totalAmount } = calculatePrices(newEntry.unitPrice || 0, newEntry.quantity || 0);
    const op: Operation = {
      ...newEntry as Operation,
      id: Date.now().toString(),
      itemCode: 'AUTO',
      itemDescription: '',
      supplyPrice,
      tax,
      totalAmount,
      isVatIncluded: false,
      isInvoiceIssued: newEntry.isInvoiceIssued || false,
      remarks: newEntry.remarks || ''
    };
    onAddOperation(op);
    setNewEntry(prev => ({ ...prev, quantity: 0, remarks: '', isInvoiceIssued: false }));
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editTarget) return;
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? Number(value) : value;
    if (name === 'clientName') {
      setEditTarget({ ...editTarget, clientName: value, branchName: '' });
      return;
    }
    const updatedTarget = { ...editTarget, [name]: finalValue };
    if (name === 'unitPrice' || name === 'quantity') {
      const { supplyPrice, tax, totalAmount } = calculatePrices(updatedTarget.unitPrice, updatedTarget.quantity);
      updatedTarget.supplyPrice = supplyPrice;
      updatedTarget.tax = tax;
      updatedTarget.totalAmount = totalAmount;
    }
    setEditTarget(updatedTarget);
  };

  const handleInlineUpdate = () => {
    if (editTarget) {
      onUpdateOperation(editTarget);
      setEditTarget(null);
    }
  };

  const toggleInvoice = (op: Operation) => {
    // 🚀 반응 속도 개선: 즉시 반영된 것처럼 보이게 하고 서버 요청
    const updatedOp = { ...op, isInvoiceIssued: !op.isInvoiceIssued };
    onUpdateOperation(updatedOp);
  };

  const filteredOperations = useMemo(() => {
    return operations.filter(op => 
      op.date.includes(filterDate) &&
      op.vehicleNo.toLowerCase().includes(filterVehicle.toLowerCase()) &&
      op.clientName.toLowerCase().includes(filterClient.toLowerCase()) &&
      (op.branchName || '').toLowerCase().includes(filterBranch.toLowerCase()) &&
      op.origin.toLowerCase().includes(filterOrigin.toLowerCase()) &&
      op.destination.toLowerCase().includes(filterDestination.toLowerCase()) &&
      (op.remarks || '').toLowerCase().includes(filterRemarks.toLowerCase())
    );
  }, [operations, filterDate, filterVehicle, filterClient, filterBranch, filterOrigin, filterDestination, filterRemarks]);

  const handleViewerQuantityChange = (newQty: number) => {
    if (!viewingOp) return;
    const { supplyPrice, tax, totalAmount } = calculatePrices(viewingOp.unitPrice, newQty);
    const updated = { ...viewingOp, quantity: newQty, supplyPrice, tax, totalAmount };
    setViewingOp(updated);
  };

  const handleSaveFromViewer = () => {
    if (viewingOp) {
      onUpdateOperation(viewingOp);
      alert('수정사항이 저장되었습니다.');
      setViewingOp(null);
    }
  };

  const handleDownload = () => {
    if (!viewingOp?.invoicePhoto) return;
    const link = document.createElement('a');
    link.href = viewingOp.invoicePhoto;
    link.download = `송장_${viewingOp.vehicleNo}_${viewingOp.date}.jpg`;
    link.click();
  };

  // 상단 일괄 공유 로직 (전송 완료 자동 체크)
  const handleBulkShare = async () => {
    if (selectedIds.length === 0) return alert("선택된 항목이 없습니다.");
    
    const targets = operations.filter(op => selectedIds.includes(op.id) && op.invoicePhoto);
    if (targets.length === 0) return alert("선택된 항목 중 공유할 송장 사진이 없습니다.");

    try {
      const filesArray: File[] = [];
      for (const op of targets) {
        const arr = op.invoicePhoto!.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){ u8arr[n] = bstr.charCodeAt(n); }
        const file = new File([u8arr], `${op.date}_${op.vehicleNo}_${op.id.slice(0,4)}.jpg`, { type: mime });
        filesArray.push(file);
      }

      if (navigator.share && navigator.canShare && navigator.canShare({ files: filesArray })) {
        await navigator.share({
          files: filesArray,
          title: '송장 일괄 공유',
          text: `${targets.length}건의 송장 사진입니다.`
        });

        // 🚀 공유 성공 시 [전송완료] 자동 체크 (DB 업데이트)
        targets.forEach(op => {
            // (any 타입 캐스팅: 임시 필드 처리)
            const updated = { ...op, settlementStatus: 'SHARED' } as Operation; 
            onUpdateOperation(updated);
        });
        alert("공유 완료! '전송완료' 처리되었습니다.");
        setSelectedIds([]); // 선택 초기화

      } else {
        alert("이 브라우저는 일괄 공유를 지원하지 않습니다.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 체크박스 토글 함수
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoom(prev => Math.min(Math.max(0.5, prev + delta), 5));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="flex flex-col h-full space-y-3 p-4 overflow-hidden relative">
      <datalist id="past-origins">{memory.origins.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="past-destinations">{memory.destinations.map(d => <option key={d} value={d} />)}</datalist>
      <datalist id="past-items">{memory.items.map(i => <option key={i} value={i} />)}</datalist>
      <datalist id="past-vehicles">{memory.vehicles.map(v => <option key={v} value={v} />)}</datalist>
      <datalist id="past-branches">{memory.branches.map(b => <option key={b} value={b} />)}</datalist>

      {/* 검색 필터 영역 */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 no-print transition-colors shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-4">
          {[
            { label: '일자 검색', val: filterDate, set: setFilterDate, ph: 'YYYY-MM-DD' },
            { label: '차량번호', val: filterVehicle, set: setFilterVehicle, ph: '차량번호', list: 'past-vehicles' },
            { label: '거래처명', val: filterClient, set: setFilterClient, ph: '거래처', disabled: isPartner },
            { label: '지점명', val: filterBranch, set: setFilterBranch, ph: '지점명', list: 'past-branches' },
            { label: '상차지 검색', val: filterOrigin, set: setFilterOrigin, ph: '상차지', list: 'past-origins' },
            { label: '하차지 검색', val: filterDestination, set: setFilterDestination, ph: '하차지', list: 'past-destinations' },
            { label: '비고 검색', val: filterRemarks, set: setFilterRemarks, ph: '비고 내용' }
          ].map((f, i) => (
            <div key={i} className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-600 ml-1">{f.label}</label>
              <input type="text" placeholder={f.ph} list={f.list} value={f.val} onChange={e => f.set(e.target.value)} disabled={(f as any).disabled} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:text-slate-100 disabled:opacity-50" />
            </div>
          ))}
        </div>
        
        {/* 👇 [수정됨] 버튼 배치 변경: 공유 버튼을 맨 앞으로 이동 */}
        <div className="flex justify-end items-center">
          <div className="flex space-x-2">
            <button onClick={handleBulkShare} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1">
               <span>📤</span> 
               <span>공유 ({selectedIds.length})</span>
            </button>
            <button onClick={() => { setFilterDate(''); setFilterVehicle(''); !isPartner && setFilterClient(''); setFilterBranch(''); setFilterOrigin(''); setFilterDestination(''); setFilterRemarks(''); }} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-lg text-xs font-bold transition">초기화</button>
            <button className="bg-[#2563eb] hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-xs font-black shadow-sm">조회하기</button>
          </div>
        </div>
      </div>

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
                
                {/* 👇 [수정됨] 헤더 순서 및 이름 변경 */}
                <th className={`${colWidths.photo} px-2 py-3`}>송장 / 선택</th>
                <th className={`${colWidths.trans} px-2 py-3`}>전송완료</th>
                <th className={`${colWidths.invoice} px-2 py-3`}>송장상태</th>
                
                <th className={`${colWidths.remarks} px-2 py-3`}>비고</th>
                <th className={`${colWidths.manage} px-2 py-3`}>관리</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {/* 입력 행 */}
              <tr className="bg-amber-50 dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-800 divide-x divide-slate-200 dark:divide-slate-800 no-print shadow-md sticky top-[41px] z-20">
                <td className="p-1"><input type="date" name="date" value={newEntry.date} onChange={handleNewEntryChange} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1 py-1 text-xs" /></td>
                <td className="p-1"><input type="text" name="vehicleNo" list="past-vehicles" value={newEntry.vehicleNo} onChange={handleNewEntryChange} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1 py-1 text-xs text-center font-bold" /></td>
                <td className="p-1">
                  <select name="clientName" value={newEntry.clientName} onChange={handleNewEntryChange} disabled={isPartner} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-0.5 py-1 text-xs font-bold">
                    <option value="">거래처</option>
                    {clientNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </td>
                <td className="p-1">
                  <select name="branchName" value={newEntry.branchName} onChange={handleNewEntryChange} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-0.5 py-1 text-xs font-bold">
                    <option value="">지점 선택</option>
                    {availableBranchesForNew.map(branch => <option key={branch} value={branch}>{branch}</option>)}
                  </select>
                </td>
                <td className="p-1"><input type="number" name="clientUnitPrice" value={newEntry.clientUnitPrice} onChange={handleNewEntryChange} className="w-full bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900 rounded px-1 py-1 text-xs text-right font-black text-rose-700" /></td>
                <td className="p-1"><input type="text" name="origin" list="past-origins" value={newEntry.origin} onChange={handleNewEntryChange} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1 py-1 text-xs text-center" /></td>
                <td className="p-1"><input type="text" name="destination" list="past-destinations" value={newEntry.destination} onChange={handleNewEntryChange} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1 py-1 text-xs text-center" /></td>
                {!isPartner && <td className="p-1"><input type="number" name="unitPrice" value={newEntry.unitPrice} onChange={handleNewEntryChange} className="w-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-900 rounded px-1 py-1 text-xs text-right font-black text-blue-700" /></td>}
                <td className="p-1"><input type="text" name="item" list="past-items" value={newEntry.item} onChange={handleNewEntryChange} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1 py-1 text-xs text-center" /></td>
                <td className="p-1"><input type="number" step="0.01" name="quantity" value={newEntry.quantity} onChange={handleNewEntryChange} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1 py-1 text-xs font-bold text-center" /></td>
                <td className="p-2 text-slate-400 text-center font-bold">자동</td>
                <td className="p-2 text-slate-400 text-center font-bold">자동</td>
                <td className="p-2 text-slate-400 text-center font-bold">자동</td>
                <td className="p-1 text-center bg-amber-50 dark:bg-slate-800 text-[9px] text-slate-400">사진등록</td>
                <td className="p-1 text-center bg-amber-50 dark:bg-slate-800 text-[9px] text-slate-400">자동체크</td>
                <td className="p-1 text-center bg-amber-50 dark:bg-slate-800">
                  <button onClick={() => setNewEntry(prev => ({ ...prev, isInvoiceIssued: !prev.isInvoiceIssued }))} className={`w-7 h-7 rounded-lg border flex items-center justify-center mx-auto ${newEntry.isInvoiceIssued ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-300'}`}>✔</button>
                </td>
                <td className="p-1 bg-amber-50 dark:bg-slate-800"><input type="text" name="remarks" value={newEntry.remarks} onChange={handleNewEntryChange} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-xs" /></td>
                <td className="p-1 text-center"><button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white w-full py-1.5 rounded text-xs font-black shadow-md">등록</button></td>
              </tr>

              {/* 데이터 목록 */}
              {filteredOperations.map((op) => {
                const isEditing = editTarget?.id === op.id;
                const displaySupply = isPartner ? Math.round(op.clientUnitPrice * op.quantity) : op.supplyPrice;
                const displayTax = isPartner ? Math.round(displaySupply * 0.1) : op.tax;
                const displayTotal = isPartner ? (displaySupply + displayTax) : op.totalAmount;
                const isShared = op.settlementStatus === 'SHARED'; // 전송완료 여부 확인

                return (
                  <tr key={op.id} className={`border-b dark:border-slate-800 transition-colors divide-x divide-slate-100 dark:divide-slate-800 ${isEditing ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`} onClick={() => !isEditing && setEditTarget(op)}>
                    {isEditing ? (
                      <>
                        <td className="p-1"><input type="date" name="date" value={editTarget.date} onChange={handleEditChange} className="w-full bg-white dark:bg-slate-800 border border-blue-300 rounded px-1 py-1 text-xs" /></td>
                        <td className="p-1"><input type="text" name="vehicleNo" list="past-vehicles" value={editTarget.vehicleNo} onChange={handleEditChange} className="w-full bg-white dark:bg-slate-800 border border-blue-300 rounded px-1 py-1 text-xs text-center font-bold" /></td>
                        <td className="p-1">
                          <select name="clientName" value={editTarget.clientName} onChange={handleEditChange} disabled={isPartner} className="w-full bg-white dark:bg-slate-800 border border-blue-300 rounded px-0.5 py-1 text-xs font-bold">
                            {clientNames.map(name => <option key={name} value={name}>{name}</option>)}
                          </select>
                        </td>
                        <td className="p-1">
                          <select name="branchName" value={editTarget.branchName || ''} onChange={handleEditChange} className="w-full bg-white dark:bg-slate-800 border border-blue-300 rounded px-0.5 py-1 text-xs font-bold">
                            <option value="">지점 선택</option>
                            {availableBranchesForEdit.map(branch => <option key={branch} value={branch}>{branch}</option>)}
                          </select>
                        </td>
                        <td className="p-1"><input type="number" name="clientUnitPrice" value={editTarget.clientUnitPrice} onChange={handleEditChange} className="w-full bg-white dark:bg-slate-800 border border-blue-300 rounded px-1 py-1 text-xs text-right font-black text-rose-600" /></td>
                        <td className="p-1"><input type="text" name="origin" list="past-origins" value={editTarget.origin} onChange={handleEditChange} className="w-full bg-white dark:bg-slate-800 border border-blue-300 rounded px-1 py-1 text-xs text-center" /></td>
                        <td className="p-1"><input type="text" name="destination" list="past-destinations" value={editTarget.destination} onChange={handleEditChange} className="w-full bg-white dark:bg-slate-800 border border-blue-300 rounded px-1 py-1 text-xs text-center" /></td>
                        {!isPartner && <td className="p-1"><input type="number" name="unitPrice" value={editTarget.unitPrice} onChange={handleEditChange} className="w-full bg-white dark:bg-slate-800 border border-blue-300 rounded px-1 py-1 text-xs text-right font-black text-blue-600" /></td>}
                        <td className="p-1"><input type="text" name="item" list="past-items" value={editTarget.item} onChange={handleEditChange} className="w-full bg-white dark:bg-slate-800 border border-blue-300 rounded px-1 py-1 text-xs text-center" /></td>
                        <td className="p-1"><input type="number" step="0.01" name="quantity" value={editTarget.quantity} onChange={handleEditChange} className="w-full bg-white dark:bg-slate-800 border border-blue-300 rounded px-1 py-1 text-xs font-black text-center" /></td>
                        <td className="p-2 text-right font-bold text-slate-400">{displaySupply.toLocaleString()}</td>
                        <td className="p-2 text-right font-bold text-slate-400">{displayTax.toLocaleString()}</td>
                        <td className="p-2 text-right font-black text-blue-600">{displayTotal.toLocaleString()}</td>
                        
                        <td className="p-1 text-center">{op.invoicePhoto ? <img src={op.invoicePhoto} className="w-8 h-8 rounded border mx-auto" /> : <span className="text-slate-300">없음</span>}</td>
                        <td className="p-1 text-center"><input type="checkbox" checked={isShared} disabled /></td>
                        
                        <td className="p-1 text-center">
                           <button onClick={(e) => { e.stopPropagation(); setEditTarget({...editTarget!, isInvoiceIssued: !editTarget!.isInvoiceIssued}) }} className={`w-7 h-7 rounded-lg border flex items-center justify-center mx-auto ${editTarget!.isInvoiceIssued ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-300'}`}>✔</button>
                        </td>
                        <td className="p-1"><input type="text" name="remarks" value={editTarget!.remarks} onChange={handleEditChange} className="w-full bg-white dark:bg-slate-800 border border-blue-300 rounded px-2 py-1 text-xs" /></td>
                        <td className="p-1 text-center space-x-1">
                          <button onClick={(e) => { e.stopPropagation(); handleInlineUpdate(); }} className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-black">저장</button>
                          <button onClick={(e) => { e.stopPropagation(); setEditTarget(null); }} className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-[10px] font-black">취소</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2.5 text-center text-slate-500 dark:text-slate-400">{op.date.slice(5)}</td>
                        <td className="px-2 py-2.5 text-center font-bold dark:text-slate-200">{op.vehicleNo}</td>
                        <td className="px-2 py-2.5 text-center font-bold text-rose-600 dark:text-rose-400">{op.clientName}</td>
                        <td className="px-2 py-2.5 text-center font-medium text-slate-500 dark:text-slate-400">{op.branchName || '-'}</td>
                        <td className="px-2 py-2.5 text-right font-bold text-rose-500 dark:text-rose-400">{op.clientUnitPrice.toLocaleString()}</td>
                        <td className="px-2 py-2.5 text-center truncate dark:text-slate-300">{op.origin}</td>
                        <td className="px-2 py-2.5 text-center truncate dark:text-slate-300">{op.destination}</td>
                        {!isPartner && <td className="px-2 py-2.5 text-right font-bold text-blue-600 dark:text-blue-400">{op.unitPrice.toLocaleString()}</td>}
                        <td className="px-2 py-2.5 text-center dark:text-slate-300">{op.item}</td>
                        <td className="px-2 py-2.5 text-center font-bold dark:text-slate-300">{op.quantity.toFixed(2)}</td>
                        <td className="px-2 py-2.5 text-right font-bold text-rose-500">{displaySupply.toLocaleString()}</td>
                        <td className="px-2 py-2.5 text-right font-bold text-rose-500">{displayTax.toLocaleString()}</td>
                        <td className="px-2 py-2.5 text-right font-black text-rose-600 dark:text-rose-400">{displayTotal.toLocaleString()}</td>
                        
                        {/* 👇 [수정됨] 사진 + 선택 체크박스 */}
                        <td className="px-2 py-1 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-2">
                            {op.invoicePhoto ? (
                              <img src={op.invoicePhoto} className="w-8 h-8 rounded border dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform object-cover" onClick={() => { setViewingOp(op); setZoom(1); setPosition({x:0, y:0}); }} />
                            ) : <span className="text-[9px] text-slate-300">없음</span>}
                            
                            <input 
                                type="checkbox" 
                                checked={selectedIds.includes(op.id)} 
                                onChange={() => toggleSelection(op.id)} 
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                        </td>

                        {/* 👇 [추가됨] 전송완료 (자동 체크) */}
                        <td className="px-1 py-2 text-center" onClick={e => e.stopPropagation()}>
                           <input type="checkbox" checked={isShared} disabled className="w-4 h-4 rounded border-gray-300 text-green-600 bg-gray-100" />
                        </td>

                        {/* 👇 [기존] 송장상태 (수동 체크, 반응 속도 개선됨) */}
                        <td className="px-1 py-2 text-center" onClick={e => { e.stopPropagation(); toggleInvoice(op); }}>
                          <button className={`w-6 h-6 rounded border ${op.isInvoiceIssued ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-700'}`}>✔</button>
                        </td>

                        <td className="px-2 py-2 truncate text-slate-500 dark:text-slate-400">{op.remarks}</td>
                        <td className="px-2 py-2 text-center">
                          <button onClick={(e) => { e.stopPropagation(); onDeleteOperation(op.id); }} className="text-red-400 hover:text-red-600 font-bold">삭제</button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {viewingOp && (
        <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 select-none animate-in fade-in duration-200" onWheel={handleWheel}>
          <div className="w-full max-w-6xl h-[90vh] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="h-16 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>
                <div><h3 className="text-slate-800 dark:text-white font-black text-sm">송장 이미지 미리보기</h3><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{viewingOp.vehicleNo} | {viewingOp.date}</p></div>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={handleDownload} className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black transition shadow-sm active:scale-95">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  <span>이미지 저장</span>
                </button>
                <button onClick={handleSaveFromViewer} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-black transition-all active:scale-95 shadow-xl">
                  <span>수정사항 저장</span>
                </button>
                <button onClick={() => setViewingOp(null)} className="p-2 text-slate-400 hover:text-red-500 transition ml-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 flex overflow-hidden bg-slate-100 dark:bg-slate-950/50">
              <div className="w-72 border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-6 space-y-6 overflow-y-auto hidden md:block">
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <label className="text-[10px] font-black text-blue-500 uppercase">수량 수정 (t)</label>
                    <input type="number" step="0.01" value={viewingOp.quantity} onChange={(e) => handleViewerQuantityChange(Number(e.target.value))} className="w-full mt-2 bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-700 rounded-xl px-4 py-2 text-lg font-black text-blue-600 outline-none" />
                  </div>
                  <div className="space-y-3 px-1">
                    {[
                      { label: '거래처', val: viewingOp.clientName, color: 'text-rose-500' },
                      { label: '품명', val: viewingOp.item, color: 'text-slate-700 dark:text-slate-300' },
                      { label: '공급가액', val: `₩${viewingOp.supplyPrice.toLocaleString()}`, color: 'text-slate-700 dark:text-slate-300' },
                      { label: '합계금액', val: `₩${viewingOp.totalAmount.toLocaleString()}`, color: 'text-blue-600 dark:text-blue-400 font-black' }
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-[10px] font-bold text-slate-400">{item.label}</span>
                        <span className={`text-xs font-bold ${item.color}`}>{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`flex-1 relative overflow-hidden flex items-center justify-center transition-all ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                <img src={viewingOp.invoicePhoto} style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`, transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} className="max-w-[90%] max-h-[90%] object-contain shadow-2xl pointer-events-none bg-white" alt="Invoice" />
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white dark:border-slate-700 shadow-2xl space-x-6">
                  <div className="flex items-center space-x-3 pr-6 border-r border-slate-200 dark:border-slate-700">
                    <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path></svg></button>
                    <span className="text-slate-800 dark:text-white font-black text-xs w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
                    <button onClick={() => setZoom(prev => Math.min(5, prev + 0.2))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg></button>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => setRotation(prev => prev - 90)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg></button>
                    <button onClick={() => setRotation(prev => prev + 90)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"></path></svg></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationEntryView;