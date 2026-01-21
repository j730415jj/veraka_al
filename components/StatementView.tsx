import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Operation, Client, UserRole } from '../types';

interface Props {
  title: string;
  type: 'client' | 'vehicle' | 'company';
  operations: Operation[];
  clients: Client[];
  userRole: UserRole;
  userIdentifier: string;
}

const StatementView: React.FC<Props> = ({ title, type, operations, clients, userRole, userIdentifier }) => {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [sidebarWidth, setSidebarWidth] = useState(210);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isResizing = useRef(false);

  const [selectedBranch, setSelectedBranch] = useState('전체');

  // 공급자/공급받는자 수동 선택을 위한 상태
  const [customProvider, setCustomProvider] = useState<string>(''); 
  const [customRecipient, setCustomRecipient] = useState<string>(''); 

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX - 24;
    if (newWidth > 150 && newWidth < 500) {
      setSidebarWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const initialSelectedItem = useMemo(() => {
    if (userRole === 'VEHICLE' && type === 'vehicle') return userIdentifier;
    const field = type === 'vehicle' ? 'vehicleNo' : 'clientName';
    const list = Array.from(new Set(operations.map(op => op[field]))).filter(Boolean).sort();
    return list[0] || '';
  }, [userRole, userIdentifier, type, operations]);

  const [selectedMain, setSelectedMain] = useState(initialSelectedItem);

  useEffect(() => {
    setSelectedBranch('전체');
  }, [selectedMain]);

  const availableBranches = useMemo(() => {
    if (type !== 'client' && type !== 'company') return [];
    const client = clients.find(c => c.clientName === selectedMain);
    if (client && client.branches && client.branches.length > 0) {
      return ['전체', ...client.branches];
    }
    return [];
  }, [clients, selectedMain, type]);

  const finalFilteredOps = useMemo(() => {
    return operations.filter(op => {
      const matchDate = op.date >= startDate && op.date <= endDate;
      const matchMain = (type === 'client' || type === 'company') 
        ? op.clientName === selectedMain 
        : op.vehicleNo === selectedMain;
      
      const matchBranch = (selectedBranch === '전체' || (op.branchName || '미지정') === selectedBranch);
      
      return matchDate && matchMain && matchBranch;
    });
  }, [operations, type, selectedMain, startDate, endDate, selectedBranch]);

  // 공급받는 자 (Recipient) 로직
  const activeHeaderInfo = useMemo(() => {
    if (customRecipient) {
        return clients.find(c => c.clientName === customRecipient) || clients[0];
    }
    return clients.find(c => c.clientName === selectedMain) || clients[0];
  }, [clients, selectedMain, customRecipient]);

  // 공급자 (Provider) 로직
  const providerInfo = useMemo(() => {
    if (customProvider) {
        const found = clients.find(c => c.clientName === customProvider);
        if (found) {
            return {
                clientName: found.clientName,
                businessNo: found.businessNo,
                presidentName: found.presidentName,
                address: found.address || '',
                businessType: found.businessType || '',
                category: found.category || '',
                phone: found.phone || '',
                fax: found.fax || ''
            };
        }
    }

    const found = clients.find(c => c.clientName && c.clientName.includes('베라카'));
    if (found) {
        return {
            clientName: found.clientName,
            businessNo: found.businessNo,
            presidentName: found.presidentName,
            address: found.address || '',
            businessType: found.businessType || '',
            category: found.category || '',
            phone: found.phone || '',
            fax: found.fax || ''
        };
    }
    
    return { 
      clientName: '(주)베라카', 
      businessNo: '', 
      presidentName: '', 
      address: '', businessType: '', category: '', phone: '', fax: ''
    };
  }, [clients, customProvider]);

  const displayRows = useMemo(() => {
    return finalFilteredOps.map(op => {
      const price = (type === 'client') ? op.clientUnitPrice : op.unitPrice;
      const supply = Math.round(price * op.quantity);
      const tax = Math.round(supply * 0.1);
      const total = supply + tax;
      return { ...op, displayPrice: price, displaySupply: supply, displayTax: tax, displayTotal: total };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [finalFilteredOps, type]);

  const totals = useMemo(() => displayRows.reduce((acc, row) => ({
    qty: acc.qty + row.quantity,
    supply: acc.supply + row.displaySupply,
    tax: acc.tax + row.displayTax,
    total: acc.total + row.displayTotal
  }), { qty: 0, supply: 0, tax: 0, total: 0 }), [displayRows]);

  // 👇 [추가] 5% 수수료 및 지급액 계산 (차량용)
  const vehicleCalculations = useMemo(() => {
    if (type !== 'vehicle') return null;
    
    const commissionRate = 0.05; // 5%
    const commission = Math.floor(totals.supply * commissionRate); // 수수료 (공급가의 5%)
    const commissionVat = Math.floor(commission * 0.1); // 수수료 부가세
    
    // 차감 후 실 지급액 관련
    const netSupply = totals.supply - commission;
    const netTax = totals.tax - commissionVat;
    const netTotal = netSupply + netTax;

    return {
        commission,
        commissionVat,
        netSupply,
        netTax,
        netTotal
    };
  }, [totals, type]);

  const sidebarList = useMemo(() => {
    const field = (type === 'client' || type === 'company') ? 'clientName' : 'vehicleNo';
    return Array.from(new Set(operations.map(op => op[field]))).filter(Boolean).sort();
  }, [operations, type]);

  const handleExportExcel = () => {
    const headers = ["일자", "차량번호", "지점명", "상차지", "하차지", "품명", "수량", "단가", "공급가액", "세액", "합계금액"];
    const rows = displayRows.map(r => [
      r.date, r.vehicleNo, r.branchName || '-', r.origin, r.destination, r.item, 
      r.quantity, r.displayPrice, r.displaySupply, r.displayTax, r.displayTotal
    ]);
    
    rows.push(["합계", "", "", "", "", "", totals.qty, "", totals.supply, totals.tax, totals.total]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${title}_${selectedMain}_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    const shareText = `[베라카] ${title}\n대상: ${selectedMain}\n기간: ${startDate} ~ ${endDate}\n합계금액: ₩${totals.total.toLocaleString()}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `[베라카] ${title}`, text: shareText });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareText);
      alert('내역서 요약 정보가 클립보드에 복사되었습니다.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const ReportContent = ({ isPreview = false }) => (
    <div className={`bg-white text-slate-800 w-full overflow-hidden ${isPreview ? 'p-12' : 'p-6 md:p-12'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
        <div className="pt-2">
          {type === 'vehicle' ? (
             <h2 className="text-[34px] font-black tracking-tighter border-b-[4px] border-slate-900 pb-2 inline-block">
                차량번호 {selectedMain}
             </h2>
          ) : (
             <h2 className="text-[28px] md:text-[34px] font-black tracking-tighter border-b-[4px] border-slate-900 pb-2 inline-block">
                {title}({selectedMain})
                {selectedBranch !== '전체' && <span className="text-blue-600 text-xl ml-2">[{selectedBranch}]</span>}
             </h2>
          )}
        </div>
        
        {/* 우측 상단 정보 테이블 */}
        <div className="w-full md:w-[460px] shrink-0 print:w-[460px] flex flex-col gap-2">
            {type === 'vehicle' ? (
                // 👇 차량용 헤더 (기사님 정보 - 여기서는 기본값 또는 providerInfo 대신 선택된 차량 정보가 와야하나 현재 구조상 providerInfo로 대체됨. 추후 차량 정보 매핑 필요)
                <div className="border border-slate-400">
                    <table className="w-full border-collapse text-[10px] leading-snug">
                        <tbody>
                        <tr>
                            <td className="border border-slate-300 bg-slate-50 p-1 text-center font-bold w-16">등록번호</td>
                            <td colSpan={3} className="border border-slate-300 p-1 text-center font-black text-sm tracking-widest"></td>
                        </tr>
                        <tr>
                            <td className="border border-slate-300 bg-slate-50 p-1 text-center font-bold">상 호</td>
                            <td className="border border-slate-300 p-1 font-bold w-24 truncate">{selectedMain} 차주님</td>
                            <td className="border border-slate-300 bg-slate-50 p-1 text-center font-bold w-12">성 명</td>
                            <td className="border border-slate-300 p-1 font-bold truncate"></td>
                        </tr>
                        <tr>
                            <td className="border border-slate-300 bg-slate-50 p-1 text-center font-bold">주 소</td>
                            <td colSpan={3} className="border border-slate-300 p-1 truncate"></td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            ) : (
                // 기존 거래처용 헤더
                <div className="flex flex-col gap-2">
                    <div className="border border-slate-400">
                        <div className="bg-slate-100 p-1 text-center font-black text-xs border-b border-slate-400">공급자 (Provider)</div>
                        <table className="w-full border-collapse text-[10px] leading-snug">
                            <tbody>
                            <tr>
                                <td className="border border-slate-300 bg-slate-50 p-1 text-center font-bold w-16">등록번호</td>
                                <td colSpan={3} className="border border-slate-300 p-1 text-center font-black text-sm tracking-widest">{providerInfo?.businessNo || '-'}</td>
                            </tr>
                            <tr>
                                <td className="border border-slate-300 bg-slate-50 p-1 text-center font-bold">상 호</td>
                                <td className="border border-slate-300 p-1 font-bold w-24 truncate">{providerInfo?.clientName}</td>
                                <td className="border border-slate-300 bg-slate-50 p-1 text-center font-bold w-12">성 명</td>
                                <td className="border border-slate-300 p-1 font-bold truncate">{providerInfo?.presidentName}</td>
                            </tr>
                            <tr>
                                <td className="border border-slate-300 bg-slate-50 p-1 text-center font-bold">주 소</td>
                                <td colSpan={3} className="border border-slate-300 p-1 truncate">{providerInfo?.address}</td>
                            </tr>
                            <tr>
                                <td className="border border-slate-300 bg-slate-50 p-1 text-center font-bold">업 태</td>
                                <td className="border border-slate-300 p-1 truncate">{providerInfo?.businessType}</td>
                                <td className="border border-slate-300 bg-slate-50 p-1 text-center font-bold">종 목</td>
                                <td className="border border-slate-300 p-1 truncate">{providerInfo?.category}</td>
                            </tr>
                            <tr>
                                <td className="border border-slate-300 bg-slate-50 p-1 text-center font-bold">전화번호</td>
                                <td className="border border-slate-300 p-1 truncate font-bold">{providerInfo?.phone}</td>
                                <td className="border border-slate-300 bg-slate-50 p-1 text-center font-bold">팩스번호</td>
                                <td className="border border-slate-300 p-1 truncate font-bold">{providerInfo?.fax}</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-300 rounded-sm">
        <table className="w-full text-[11px] border-collapse min-w-[1000px]">
          <thead className="bg-slate-50">
            <tr className="divide-x divide-slate-300 border-b border-slate-300">
              <th className="p-2.5 font-bold w-16 text-center">일자</th>
              {/* 차량용이면 상차지/하차지 순서 조정 등 가능하지만 기존 유지 */}
              <th className="p-2.5 font-bold w-28 text-center">상차지</th>
              <th className="p-2.5 font-bold w-28 text-center">하차지</th>
              <th className="p-2.5 font-bold w-24 text-center">품명</th>
              <th className="p-2.5 font-bold w-16 text-center">수량</th>
              <th className="p-2.5 font-bold w-24 text-right">단가</th>
              <th className="p-2.5 font-bold w-28 text-right">공급가액</th>
              <th className="p-2.5 font-bold w-24 text-right">세액</th>
              <th className="p-2.5 font-bold w-32 text-right">합계금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {displayRows.map(row => (
              <tr key={row.id} className="divide-x divide-slate-300 hover:bg-slate-50/50 transition-colors">
                <td className="p-2 text-center">{row.date.slice(5)}</td>
                <td className="p-2 text-center truncate px-2">{row.origin}</td>
                <td className="p-2 text-center truncate px-2">{row.destination}</td>
                <td className="p-2 text-center truncate px-2">{row.item}</td>
                <td className="p-2 text-center font-black">{row.quantity.toFixed(2)}</td>
                <td className="p-2 text-right font-bold text-slate-600">{row.displayPrice.toLocaleString()}</td>
                <td className="p-2 text-right font-medium">{row.displaySupply.toLocaleString()}</td>
                <td className="p-2 text-right font-medium">{row.displayTax.toLocaleString()}</td>
                <td className="p-2 text-right font-black bg-slate-50/20">{row.displayTotal.toLocaleString()}</td>
              </tr>
            ))}
            {displayRows.length === 0 && (
              <tr><td colSpan={11} className="p-20 text-center text-slate-300 italic">조회 기간 내 데이터가 없습니다.</td></tr>
            )}
          </tbody>
          
          {/* 👇 [차량용 푸터] 5% 공제 로직 적용 */}
          <tfoot className="border-t-2 border-slate-900 font-black">
            {type === 'vehicle' && vehicleCalculations ? (
                <>
                    {/* 매출 합계 (노란색 배경) */}
                    <tr className="divide-x divide-slate-300 bg-yellow-300">
                        <td colSpan={4} className="p-2 text-center">매출합계</td>
                        <td className="p-2 text-center">{totals.qty.toFixed(2)}</td>
                        <td className="p-2"></td>
                        <td className="p-2 text-right">{totals.supply.toLocaleString()}</td>
                        <td className="p-2 text-right">{totals.tax.toLocaleString()}</td>
                        <td className="p-2 text-right">{totals.total.toLocaleString()}</td>
                    </tr>
                    {/* 5% 공제금 (빨간 글씨) */}
                    <tr className="divide-x divide-slate-300 text-red-600">
                        <td colSpan={4} className="p-2 text-center">5% 공제 후 (공급가 기준)</td>
                        <td className="p-2"></td>
                        <td className="p-2"></td>
                        <td className="p-2 text-right">{vehicleCalculations.netSupply.toLocaleString()}</td>
                        <td className="p-2 text-right">{vehicleCalculations.netTax.toLocaleString()}</td>
                        <td className="p-2 text-right">{vehicleCalculations.netTotal.toLocaleString()}</td>
                    </tr>
                </>
            ) : (
                // 기존 합계 행 (거래처용)
                <tr className="divide-x divide-slate-300 bg-slate-50">
                    <td colSpan={5} className="p-3 text-center">[ 합 계 ]</td>
                    <td className="p-3 text-center">{totals.qty.toFixed(2)}</td>
                    <td className="p-3"></td>
                    <td className="p-3 text-right">{totals.supply.toLocaleString()}</td>
                    <td className="p-3 text-right">{totals.tax.toLocaleString()}</td>
                    <td className="p-3 text-right text-sm text-blue-800">{totals.total.toLocaleString()}</td>
                </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* 👇 [차량용] 하단 지급액 계산표 */}
      {type === 'vehicle' && vehicleCalculations && (
          <div className="mt-6 flex justify-end">
              <table className="w-[300px] border-collapse border border-slate-400 text-sm">
                  <tbody>
                      <tr>
                          <td className="bg-slate-100 p-2 font-bold border border-slate-300 text-center w-1/2">청구금액</td>
                          <td className="p-2 text-right border border-slate-300 font-bold">₩ {totals.total.toLocaleString()}</td>
                      </tr>
                      <tr>
                          <td className="bg-slate-50 p-2 border border-slate-300 text-center text-xs">수수료 (5%)</td>
                          <td className="p-2 text-right border border-slate-300 text-red-500">- {vehicleCalculations.commission.toLocaleString()}</td>
                      </tr>
                      <tr>
                          <td className="bg-slate-50 p-2 border border-slate-300 text-center text-xs">수수료 부가세</td>
                          <td className="p-2 text-right border border-slate-300 text-red-500">- {vehicleCalculations.commissionVat.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-slate-200 border-t-2 border-slate-500">
                          <td className="p-3 font-black text-center border border-slate-300">지급액</td>
                          <td className="p-3 text-right font-black text-blue-800 text-lg border border-slate-300">
                              ₩ {vehicleCalculations.netTotal.toLocaleString()}
                          </td>
                      </tr>
                  </tbody>
              </table>
          </div>
      )}

      {type !== 'vehicle' && (
        <div className="mt-12 pt-6 border-t border-slate-200 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
            위 금액을 정히 영수(청구)함 | 인쇄일시: {new Date().toLocaleString()}<br/>
            베라카 물류 정산 자동화 시스템 (VERAKA LOGISTICS SYSTEM)
            </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full w-full gap-0 p-1.5 overflow-hidden">
      {/* 리포트 본문 뷰어 */}
      <div className="flex-1 overflow-auto bg-slate-200/30 rounded-lg shadow-inner custom-scrollbar pr-1 print:bg-white print:shadow-none print:p-0">
        <div className="p-2 w-full print:p-0">
          <div className="bg-white shadow-md border border-slate-200 print:shadow-none print:border-none print:m-0">
            <ReportContent />
          </div>
        </div>
      </div>

      {/* 너비 조절 핸들 */}
      <div onMouseDown={startResizing} className="w-1.5 hover:w-2 bg-transparent hover:bg-blue-400 cursor-col-resize transition-all shrink-0 no-print flex items-center justify-center group z-10">
        <div className="w-[1px] h-20 bg-slate-300 group-hover:bg-blue-300"></div>
      </div>

      {/* 우측 사이드바 제어판 */}
      <div style={{ width: `${sidebarWidth}px` }} className="space-y-2 no-print shrink-0 flex flex-col h-full ml-1">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
          <div className="px-3 py-1.5 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest text-center">조회 설정</div>
          <div className="p-3 space-y-2">
            <div className="space-y-0.5"><label className="text-[8px] font-black text-slate-400 ml-0.5">시작</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1 text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-400" /></div>
            <div className="space-y-0.5"><label className="text-[8px] font-black text-slate-400 ml-0.5">종료</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1 text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-400" /></div>
            
            {availableBranches.length > 0 && (
              <div className="space-y-0.5 mt-2 border-t pt-2 border-slate-100 dark:border-slate-800">
                <label className="text-[8px] font-black text-blue-500 ml-0.5">지점 필터</label>
                <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="w-full border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-slate-800 rounded px-2 py-1 text-[10px] font-black outline-none focus:ring-1 focus:ring-blue-400">
                  {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}

            {/* 공급자 선택 메뉴 */}
            <div className="space-y-0.5 mt-2 border-t pt-2 border-slate-100 dark:border-slate-800">
              <label className="text-[8px] font-black text-slate-400 ml-0.5">공급자 (보내는 분)</label>
              <select 
                value={customProvider} 
                onChange={e => setCustomProvider(e.target.value)} 
                className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1 text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">자동 (베라카/기본)</option>
                {clients.map(c => <option key={c.id} value={c.clientName}>{c.clientName}</option>)}
              </select>
            </div>

            {/* 공급받는 자 선택 메뉴 */}
            <div className="space-y-0.5 mt-1">
              <label className="text-[8px] font-black text-slate-400 ml-0.5">공급받는자 (받는 분)</label>
              <select 
                value={customRecipient} 
                onChange={e => setCustomRecipient(e.target.value)} 
                className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded px-2 py-1 text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">자동 (선택된 거래처)</option>
                {clients.map(c => <option key={c.id} value={c.clientName}>{c.clientName}</option>)}
              </select>
            </div>

          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 flex-1 flex flex-col min-h-0">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-black text-slate-800 dark:text-slate-200 text-[9px] flex items-center truncate">
              <span className="text-[7px] mr-1 text-blue-500">▼</span>{type === 'vehicle' ? '차량 선택' : '거래처 선택'}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-0.5 bg-slate-50/50 dark:bg-slate-950/50">
            {sidebarList.map(item => (
              <button 
                key={item} 
                onClick={() => setSelectedMain(item)} 
                className={`w-full text-left px-2 py-1.5 rounded text-[11px] font-black transition-all border truncate ${selectedMain === item ? 'bg-blue-600 text-white border-blue-500 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-100 hover:text-blue-600 border-transparent'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* 액션 버튼 그룹 */}
        <div className="grid grid-cols-2 gap-1 shrink-0">
          <button onClick={handlePrint} className="col-span-2 bg-slate-900 hover:bg-black text-white py-3 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center space-x-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            <span>보고서 인쇄</span>
          </button>
          
          <button onClick={() => setIsPreviewOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-black text-[9px] flex items-center justify-center space-x-1.5 shadow-md transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            <span>미리보기</span>
          </button>
          
          <button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-black text-[9px] flex items-center justify-center space-x-1.5 shadow-md transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>엑셀변환</span>
          </button>

          <button onClick={handleShare} className="col-span-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 py-2.5 rounded-lg font-black text-[9px] flex items-center justify-center space-x-2 hover:bg-slate-50 transition-colors">
            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
            <span>내역 공유하기</span>
          </button>
        </div>
      </div>

      {/* 미리보기 모달 */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto no-print">
          <div className="sticky top-0 w-full bg-slate-800/80 backdrop-blur border-b border-slate-700 flex items-center justify-between px-6 py-4 z-[1001]">
            <div className="flex items-center space-x-4">
              <span className="text-white font-black text-xl tracking-tighter">리포트 미리보기</span>
              <span className="text-slate-400 text-xs font-bold px-3 py-1 bg-slate-700/50 rounded-full border border-slate-600 uppercase tracking-widest">
                {title} Layout
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={handlePrint} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-sm flex items-center transition shadow-lg shadow-emerald-900/20">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                즉시 인쇄
              </button>
              <button onClick={() => setIsPreviewOpen(false)} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-black text-sm flex items-center transition">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                창 닫기
              </button>
            </div>
          </div>
          <div className="max-w-5xl w-full my-12 animate-in zoom-in-95 duration-300">
            <div className="bg-white shadow-2xl rounded-sm">
              <ReportContent isPreview={true} />
            </div>
          </div>
        </div>
      )}

      {/* 인쇄 전용 글로벌 스타일 (인쇄 깨짐 방지) */}
      <style>{`
        @media print {
          body, html { height: auto !important; overflow: visible !important; background: white !important; }
          #root { height: auto !important; display: block !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          header, nav { display: none !important; }
          main { overflow: visible !important; height: auto !important; margin: 0 !important; padding: 0 !important; }
          .flex { display: block !important; }
          .bg-slate-200\/30 { background: white !important; }
          .shadow-inner, .shadow-md, .shadow-sm { box-shadow: none !important; }
          .border { border-color: #cbd5e1 !important; }
          .custom-scrollbar { overflow: visible !important; }
          table { width: 100% !important; table-layout: fixed !important; }
          th, td { border-color: #94a3b8 !important; }
          tr { page-break-inside: avoid !important; }
          @page { size: auto; margin: 10mm; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
      `}</style>
    </div>
  );
};

export default StatementView;