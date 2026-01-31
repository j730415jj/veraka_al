// @ts-nocheck
/* eslint-disable */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Operation, Vehicle, Client } from '../types';
import { useReactToPrint } from 'react-to-print';

interface Props {
  title: string;
  type: 'vehicle' | 'client' | 'company' | 'tax';
  operations: Operation[];
  clients: Client[];
  vehicles: Vehicle[];
  userRole: string;
  userIdentifier: string;
}

const StatementView: React.FC<Props> = ({ 
  title, 
  type, 
  operations, 
  clients = [], 
  vehicles = [], 
  userRole, 
  userIdentifier 
}) => {
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [filterSite, setFilterSite] = useState(''); // 지점(현장) 필터 추가

  const componentRef = useRef<HTMLDivElement>(null);

  // 날짜 및 초기값 세팅
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    if (!filterStartDate) setFilterStartDate(firstDay);
    if (!filterEndDate) setFilterEndDate(lastDay);
    
    if (!filterTarget) {
      if (type === 'vehicle' && vehicles.length > 0) {
        setFilterTarget(vehicles[0].vehicleNo);
      } else if (clients.length > 0) {
        setFilterTarget(clients[0].clientName);
      }
    }
  }, [type, vehicles, clients, filterTarget]);

  // 데이터 필터링 로직
  const filteredData = useMemo(() => {
    return operations.filter(op => {
      const opDate = op.date;
      const dateMatch = (!filterStartDate || opDate >= filterStartDate) && (!filterEndDate || opDate <= filterEndDate);
      
      let targetMatch = true;
      if (filterTarget) {
        if (type === 'vehicle') targetMatch = op.vehicleNo === filterTarget;
        else targetMatch = op.clientName === filterTarget;
      }

      // 지점(현장) 필터링
      let siteMatch = true;
      if (filterSite) {
        siteMatch = op.destination === filterSite;
      }

      if (userRole === 'PARTNER') targetMatch = targetMatch && op.clientName === userIdentifier;
      if (userRole === 'VEHICLE') targetMatch = targetMatch && op.vehicleNo === userIdentifier;
      
      return dateMatch && targetMatch && siteMatch;
    });
  }, [operations, filterStartDate, filterEndDate, filterTarget, filterSite, type, userRole, userIdentifier]);

  // 합계 계산
  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      supply: acc.supply + (curr.supplyPrice || 0),
      tax: acc.tax + (curr.tax || 0),
      total: acc.total + (curr.totalAmount || 0)
    }), { supply: 0, tax: 0, total: 0 });
  }, [filteredData]);

  // 현장(지점) 목록 추출 (중복제거)
  const siteList = useMemo(() => {
    const sites = operations
      .filter(op => {
        if (type === 'vehicle') return op.vehicleNo === filterTarget;
        return op.clientName === filterTarget;
      })
      .map(op => op.destination)
      .filter(Boolean);
    return [...new Set(sites)];
  }, [operations, filterTarget, type]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `${title}_${filterTarget}_${filterStartDate}`,
  });

  // 공급자 정보 (베라카 고정)
  const provider = {
    registNo: '406-81-64763', 
    tradeName: '(주)베라카',
    name: '장국용',
    address: '포항시 남구 연일읍 새천년대로 202. 2층',
    bizCondition: '도매및소매업',
    item: '골재',
    phone: '054-285-1300',
    fax: '054-283-1301'
  };

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      
      {/* 1. 메인 콘텐츠 (왼쪽: 엑셀 화면) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex justify-center bg-gray-100 dark:bg-slate-900/50">
        <div ref={componentRef} className="bg-white text-black w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl relative box-border flex flex-col">
          
            {/* 상단 타이틀 및 정보 */}
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-4">
                 <h1 className="text-4xl font-black text-black">
                   {title} (거래명세서)
                 </h1>
                 <div className="text-5xl font-black text-blue-800 underline decoration-4 underline-offset-8">
                   {filterTarget}
                 </div>
                 <div className="text-lg font-bold text-slate-700">
                   거래기간 : {filterStartDate} ~ {filterEndDate}
                 </div>
              </div>

              {/* 공급자 정보 박스 (베라카 고정) */}
              <div className="border border-slate-400 w-[350px] text-xs">
                 <div className="flex border-b border-slate-400">
                    <div className="w-16 bg-slate-100 text-center py-1 font-bold border-r border-slate-400 flex items-center justify-center">등록번호</div>
                    <div className="flex-1 text-center py-1 font-bold">{provider.registNo}</div>
                 </div>
                 <div className="flex border-b border-slate-400">
                    <div className="w-16 bg-slate-100 text-center py-1 font-bold border-r border-slate-400 flex items-center justify-center">상 호</div>
                    <div className="flex-1 text-center py-1 border-r border-slate-400">{provider.tradeName}</div>
                    <div className="w-12 bg-slate-100 text-center py-1 font-bold border-r border-slate-400 flex items-center justify-center">성 명</div>
                    <div className="w-16 text-center py-1">{provider.name}</div>
                 </div>
                 <div className="flex border-b border-slate-400">
                    <div className="w-16 bg-slate-100 text-center py-1 font-bold border-r border-slate-400 flex items-center justify-center">주 소</div>
                    <div className="flex-1 text-center py-1">{provider.address}</div>
                 </div>
                 <div className="flex border-b border-slate-400">
                    <div className="w-16 bg-slate-100 text-center py-1 font-bold border-r border-slate-400 flex items-center justify-center">업 태</div>
                    <div className="flex-1 text-center py-1 border-r border-slate-400">{provider.bizCondition}</div>
                    <div className="w-12 bg-slate-100 text-center py-1 font-bold border-r border-slate-400 flex items-center justify-center">종 목</div>
                    <div className="w-16 text-center py-1">{provider.item}</div>
                 </div>
                 <div className="flex">
                    <div className="w-16 bg-slate-100 text-center py-1 font-bold border-r border-slate-400 flex items-center justify-center">전화번호</div>
                    <div className="flex-1 text-center py-1 border-r border-slate-400">{provider.phone}</div>
                    <div className="w-16 bg-slate-100 text-center py-1 font-bold border-r border-slate-400 flex items-center justify-center">팩스번호</div>
                    <div className="flex-1 text-center py-1">{provider.fax}</div>
                 </div>
              </div>
            </div>

            {/* 엑셀 스타일 거래 리스트 테이블 */}
            <table className="w-full text-[11px] border-collapse border border-slate-400 mb-8">
              <thead>
                <tr className="bg-slate-100 text-center h-8 border-b border-slate-400">
                  <th className="border-r border-slate-400 w-16">일자</th>
                  <th className="border-r border-slate-400 w-16">차량번호</th>
                  <th className="border-r border-slate-400 w-20">단가</th>
                  <th className="border-r border-slate-400">상차지</th>
                  <th className="border-r border-slate-400">하차지(지점)</th>
                  <th className="border-r border-slate-400 w-24">품명</th>
                  <th className="border-r border-slate-400 w-14">수량</th>
                  <th className="border-r border-slate-400 w-24">공급가액</th>
                  <th className="border-r border-slate-400 w-20">세액</th>
                  <th className="w-24">합계금액</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? filteredData.map((op, idx) => (
                  <tr key={idx} className="text-center h-8 border-b border-slate-200">
                    <td className="border-r border-slate-200">{op.date.slice(5)}</td>
                    <td className="border-r border-slate-200">{op.vehicleNo}</td>
                    <td className="border-r border-slate-200 text-right px-2">
                      {(type === 'vehicle' ? op.unitPrice : op.clientUnitPrice).toLocaleString()}
                    </td>
                    <td className="border-r border-slate-200 truncate px-1 text-left">{op.origin}</td>
                    <td className="border-r border-slate-200 truncate px-1 text-left">{op.destination}</td>
                    <td className="border-r border-slate-200">{op.item}</td>
                    <td className="border-r border-slate-200 font-bold">{op.quantity}</td>
                    <td className="border-r border-slate-200 text-right px-2">
                      {Math.floor(type === 'vehicle' ? op.supplyPrice : (op.clientUnitPrice * op.quantity)).toLocaleString()}
                    </td>
                    <td className="border-r border-slate-200 text-right px-2">
                      {Math.floor(type === 'vehicle' ? op.tax : (op.clientUnitPrice * op.quantity * 0.1)).toLocaleString()}
                    </td>
                    <td className="text-right px-2 font-bold">
                      {Math.floor((type === 'vehicle' ? op.supplyPrice : (op.clientUnitPrice * op.quantity)) * 1.1).toLocaleString()}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={10} className="py-20 text-center text-slate-400">조회된 내역이 없습니다.</td></tr>
                )}
                {/* 빈 줄 채우기 (A4 포맷 유지용) */}
                {Array.from({ length: Math.max(0, 20 - filteredData.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-8 border-b border-slate-200 text-slate-300">
                      <td colSpan={10}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-400 h-9">
                      <td colSpan={6} className="text-center border-r border-slate-400">[ 합 계 ]</td>
                      <td className="text-center border-r border-slate-400 text-blue-700">
                          {filteredData.reduce((sum, op) => sum + op.quantity, 0).toFixed(2)}
                      </td>
                      <td className="text-right px-2 border-r border-slate-400">
                          {totals.supply.toLocaleString()}
                      </td>
                      <td className="text-right px-2 border-r border-slate-400">
                          {totals.tax.toLocaleString()}
                      </td>
                      <td className="text-right px-2 text-blue-700 border-slate-400">
                          {totals.total.toLocaleString()}
                      </td>
                  </tr>
              </tfoot>
            </table>
        </div>
      </div>

      {/* 2. 우측 사이드바 (검색 컨트롤) */}
      <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-6 shadow-xl z-10 shrink-0 no-print">
        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
          🔍 검색 옵션
        </h2>

        {/* 1) 기간 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-500 block">조회 기간</label>
          <div className="flex flex-col gap-2">
            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} 
                   className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 font-bold dark:text-white" />
            <div className="text-center text-slate-400">~</div>
            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} 
                   className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 font-bold dark:text-white" />
          </div>
        </div>

        <hr className="border-slate-200 dark:border-slate-700" />

        {/* 2) 대분류 선택 (차량/거래처) */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-500 block">
            {type === 'vehicle' ? '차량 선택' : '거래처 선택'}
          </label>
          <select value={filterTarget} onChange={e => { setFilterTarget(e.target.value); setFilterSite(''); }} 
                  className="w-full bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded px-3 py-2 font-bold text-lg dark:text-white shadow-sm">
            {type === 'vehicle' ? vehicles.map(v => <option key={v.id} value={v.vehicleNo}>{v.vehicleNo} ({v.ownerName})</option>) : clients.map(c => <option key={c.id} value={c.clientName}>{c.clientName}</option>)}
          </select>
        </div>

        {/* 3) 지점(현장) 선택 (신규 기능) */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-500 block">지점 / 현장 선택</label>
          <select value={filterSite} onChange={e => setFilterSite(e.target.value)} 
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-500 rounded px-3 py-2 font-bold dark:text-white">
            <option value="">전체 보기</option>
            {siteList.map((site, i) => (
              <option key={i} value={site}>{site}</option>
            ))}
          </select>
        </div>

        <div className="flex-1"></div>

        {/* 인쇄 버튼 */}
        <button onClick={handlePrint} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl text-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-transform active:scale-95">
          <span>🖨️ 인쇄 / PDF 저장</span>
        </button>
      </div>

    </div>
  );
};

export default StatementView;