// @ts-nocheck
/* eslint-disable */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import StatementReport from './StatementReport'; // 방금 만든 파일 불러오기

interface Props {
  title: any;
  type: any;
  operations: any[];
  clients: any[];
  vehicles: any[];
  userRole: any;
  userIdentifier: any;
}

const StatementView: React.FC<Props> = ({ 
  title, 
  type, 
  operations = [], 
  clients = [], 
  vehicles = [], 
  userRole, 
  userIdentifier 
}) => {
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [filterSite, setFilterSite] = useState('');

  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const today = new Date();
      const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      if(!filterStartDate) setFilterStartDate(first);
      if(!filterEndDate) setFilterEndDate(last);
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (!filterTarget) {
      if (type === 'vehicle' && vehicles?.length > 0) setFilterTarget(vehicles[0].vehicleNo);
      else if (clients?.length > 0) setFilterTarget(clients[0].clientName);
    }
  }, [type, vehicles, clients, filterTarget]);

  const filteredData = useMemo(() => {
    if(!operations) return [];
    return operations.filter(op => {
      const opDate = op.date || '';
      const dateMatch = (!filterStartDate || opDate >= filterStartDate) && (!filterEndDate || opDate <= filterEndDate);
      let targetMatch = true;
      if (filterTarget) {
        if (type === 'vehicle') targetMatch = op.vehicleNo === filterTarget;
        else targetMatch = op.clientName === filterTarget;
      }
      let siteMatch = true;
      if (filterSite && filterSite !== '전체') {
        siteMatch = op.destination === filterSite;
      }
      return dateMatch && targetMatch && siteMatch;
    });
  }, [operations, filterStartDate, filterEndDate, filterTarget, filterSite, type]);

  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      supply: acc.supply + (curr.supplyPrice || 0),
      tax: acc.tax + (curr.tax || 0),
      total: acc.total + (curr.totalAmount || 0),
      qty: acc.qty + (Number(curr.quantity) || 0)
    }), { supply: 0, tax: 0, total: 0, qty: 0 });
  }, [filteredData]);

  const siteList = useMemo(() => {
    if(!operations) return ['전체'];
    const sites = operations.map(op => op.destination).filter(Boolean);
    // @ts-ignore
    return ['전체', ...new Set(sites)];
  }, [operations]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `거래명세서_${filterTarget}`,
    pageStyle: `
      @page { size: A4; margin: 10mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
      }
    `
  });

  const provider = {
    registNo: '406-81-64763', tradeName: '(주)베라카', name: '장국용',
    address: '포항시 남구 연일읍 새천년대로 202. 2층',
    bizCondition: '도매및소매업', item: '골재',
    phone: '054-285-1300', fax: '054-283-1301'
  };

  return (
    // 🔥 구조 단순화: flex-1 안에 overflow-auto를 넣어서 스크롤 문제 해결
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
      
      {/* 왼쪽 메인 화면 (StatementReport 컴포넌트 사용) */}
      <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-8 flex justify-center bg-gray-200 dark:bg-slate-900/50">
        <StatementReport 
          reportRef={componentRef}
          title={title}
          filterTarget={filterTarget}
          filterStartDate={filterStartDate}
          filterEndDate={filterEndDate}
          provider={provider}
          filteredData={filteredData}
          totals={totals}
        />
      </div>

      {/* 오른쪽 사이드바 */}
      <div className="w-80 bg-white border-l border-slate-300 p-6 flex flex-col gap-6 shadow-2xl z-20 shrink-0 h-full no-print">
        <div className="pb-4 border-b border-slate-200">
            <h2 className="text-xl font-black text-slate-800 mb-1">검색 옵션</h2>
            <p className="text-xs text-slate-500 text-blue-600 font-bold">시스템 정상화 완료</p>
        </div>
        
        {/* 입력폼들 */}
        <div className="space-y-1 mt-4">
          <label className="text-xs font-bold text-slate-500">기간</label>
          <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full border border-slate-300 rounded p-2 mb-2"/>
          <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full border border-slate-300 rounded p-2"/>
        </div>
        <div className="space-y-1 mt-4">
          <label className="text-xs font-bold text-slate-500">대상 선택</label>
          <select value={filterTarget} onChange={e => setFilterTarget(e.target.value)} className="w-full border-2 border-blue-500 rounded p-3 font-bold text-lg">
             {type === 'vehicle' ? vehicles.map(v => <option key={v.id} value={v.vehicleNo}>{v.vehicleNo}</option>) : clients.map(c => <option key={c.id} value={c.clientName}>{c.clientName}</option>)}
          </select>
        </div>
        <div className="space-y-1 mt-4">
          <label className="text-xs font-bold text-slate-500">현장 선택</label>
          <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="w-full border border-slate-300 rounded p-2">
            <option value="전체">전체</option>
            {siteList.map((s, i) => <option key={i} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={handlePrint} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold mt-auto mb-4 hover:bg-blue-700 shadow-lg transition-all">
          🖨️ 인쇄하기
        </button>
      </div>

    </div>
  );
};

export default StatementView;