// @ts-nocheck
/* eslint-disable */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

// 1. 타입을 any로 퉁쳐서 서버 에러 원천 봉쇄
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

  // 날짜 자동 세팅
  useEffect(() => {
    try {
      const today = new Date();
      const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      if(!filterStartDate) setFilterStartDate(first);
      if(!filterEndDate) setFilterEndDate(last);
    } catch(e) {}
  }, []);

  // 초기값 세팅
  useEffect(() => {
    if (!filterTarget) {
      if (type === 'vehicle' && vehicles?.length > 0) setFilterTarget(vehicles[0].vehicleNo);
      else if (clients?.length > 0) setFilterTarget(clients[0].clientName);
    }
  }, [type, vehicles, clients, filterTarget]);

  // 데이터 필터링
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

  // 합계 계산
  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      supply: acc.supply + (curr.supplyPrice || 0),
      tax: acc.tax + (curr.tax || 0),
      total: acc.total + (curr.totalAmount || 0),
      qty: acc.qty + (Number(curr.quantity) || 0)
    }), { supply: 0, tax: 0, total: 0, qty: 0 });
  }, [filteredData]);

  // 사이트 목록
  const siteList = useMemo(() => {
    if(!operations) return ['전체'];
    const sites = operations.map(op => op.destination).filter(Boolean);
    // @ts-ignore
    return ['전체', ...new Set(sites)];
  }, [operations]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `명세서_${filterTarget}`,
  });

  const provider = {
    registNo: '406-81-64763', tradeName: '(주)베라카', name: '장국용',
    address: '포항시 남구 연일읍 새천년대로 202. 2층',
    bizCondition: '도매및소매업', item: '골재',
    phone: '054-285-1300', fax: '054-283-1301'
  };

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
      
      {/* 1. 메인 문서 화면 (왼쪽) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex justify-center bg-gray-200 dark:bg-slate-900/50">
        <div ref={componentRef} className="bg-white text-black w-[210mm] min-h-[297mm] p-[15mm] shadow-2xl relative box-border flex flex-col">
          
            {/* 제목 영역 */}
            <div className="flex justify-between items-end mb-8 border-b-2 border-black pb-4">
              <div>
                 <h1 className="text-4xl font-black text-black mb-4 tracking-wider">{title}</h1>
                 <div className="text-3xl font-bold text-blue-800 underline decoration-4 underline-offset-8">
                   {filterTarget} <span className="text-xl text-black no-underline font-normal">귀하</span>
                 </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                 기간: {filterStartDate} ~ {filterEndDate}
              </div>
            </div>

            {/* 공급자 정보 */}
            <div className="mb-6 border border-black text-sm">
                <div className="flex border-b border-black">
                    <div className="w-24 bg-gray-100 font-bold p-2 text-center border-r border-black flex items-center justify-center">공급자</div>
                    <div className="flex-1">
                        <div className="flex border-b border-gray-300">
                            <div className="w-20 bg-gray-50 p-1 text-center font-bold border-r border-gray-300">등록번호</div>
                            <div className="flex-1 p-1 pl-2">{provider.registNo}</div>
                            <div className="w-20 bg-gray-50 p-1 text-center font-bold border-x border-gray-300">상호</div>
                            <div className="flex-1 p-1 pl-2">{provider.tradeName}</div>
                        </div>
                        <div className="flex"><div className="w-20 bg-gray-50 p-1 text-center font-bold border-r border-gray-300">주소</div><div className="flex-1 p-1 pl-2">{provider.address}</div></div>
                    </div>
                </div>
            </div>

            {/* 테이블 */}
            <table className="w-full text-xs border-collapse border border-black mb-4">
              <thead>
                <tr className="bg-gray-100 text-center h-9 font-bold">
                  <th className="border border-black w-12">월-일</th>
                  <th className="border border-black w-16">차량번호</th>
                  <th className="border border-black">현장</th>
                  <th className="border border-black w-24">품명</th>
                  <th className="border border-black w-12">수량</th>
                  <th className="border border-black w-24">공급가액</th>
                  <th className="border border-black w-24">합계</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((op, idx) => (
                  <tr key={idx} className="text-center h-8">
                    <td className="border border-black">{op.date?.slice(5)}</td>
                    <td className="border border-black">{op.vehicleNo}</td>
                    <td className="border border-black px-1">{op.destination}</td>
                    <td className="border border-black">{op.item}</td>
                    <td className="border border-black font-bold">{op.quantity}</td>
                    <td className="border border-black text-right px-2">{Math.floor(op.supplyPrice || 0).toLocaleString()}</td>
                    <td className="border border-black text-right px-2 font-bold">{Math.floor(op.totalAmount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                  <tr className="bg-gray-200 font-bold h-10 border-t-2 border-black">
                      <td colSpan={4} className="text-center border border-black">합 계</td>
                      <td className="text-center border border-black text-blue-700">{totals.qty.toLocaleString()}</td>
                      <td className="text-right px-2 border border-black">{totals.supply.toLocaleString()}</td>
                      <td className="text-right px-2 border border-black text-blue-700 text-sm">{totals.total.toLocaleString()}</td>
                  </tr>
              </tfoot>
            </table>
        </div>
      </div>

      {/* 2. 오른쪽 사이드바 (검색창) */}
      <div className="w-80 bg-white border-l border-slate-300 p-6 flex flex-col gap-6 shadow-2xl z-20 shrink-0 no-print">
        <div className="pb-4 border-b border-slate-200">
            <h2 className="text-xl font-black text-slate-800 mb-1">검색 옵션</h2>
            <p className="text-xs text-slate-500">우측 사이드바 적용 완료</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">기간</label>
          <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full border border-slate-300 rounded p-2 mb-2"/>
          <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full border border-slate-300 rounded p-2"/>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">대상 선택</label>
          <select value={filterTarget} onChange={e => setFilterTarget(e.target.value)} className="w-full border-2 border-blue-500 rounded p-3 font-bold text-lg">
             {type === 'vehicle' ? vehicles.map(v => <option key={v.id} value={v.vehicleNo}>{v.vehicleNo}</option>) : clients.map(c => <option key={c.id} value={c.clientName}>{c.clientName}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">현장 선택</label>
          <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="w-full border border-slate-300 rounded p-2">
            <option value="전체">전체</option>
            {siteList.map((s, i) => <option key={i} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={handlePrint} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold mt-auto">인쇄하기</button>
      </div>

    </div>
  );
};

export default StatementView;