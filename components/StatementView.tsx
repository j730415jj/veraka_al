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

  const componentRef = useRef<HTMLDivElement>(null);

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

  const filteredData = useMemo(() => {
    return operations.filter(op => {
      const opDate = op.date;
      const dateMatch = (!filterStartDate || opDate >= filterStartDate) && (!filterEndDate || opDate <= filterEndDate);
      
      let targetMatch = true;
      if (filterTarget) {
        if (type === 'vehicle') targetMatch = op.vehicleNo === filterTarget;
        else targetMatch = op.clientName === filterTarget;
      }
      if (userRole === 'PARTNER') targetMatch = targetMatch && op.clientName === userIdentifier;
      if (userRole === 'VEHICLE') targetMatch = targetMatch && op.vehicleNo === userIdentifier;
      return dateMatch && targetMatch;
    });
  }, [operations, filterStartDate, filterEndDate, filterTarget, type, userRole, userIdentifier]);

  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      supply: acc.supply + (curr.supplyPrice || 0),
      tax: acc.tax + (curr.tax || 0),
      total: acc.total + (curr.totalAmount || 0)
    }), { supply: 0, tax: 0, total: 0 });
  }, [filteredData]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `${title}_${filterTarget}_${filterStartDate}`,
  });

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

  const recipient = useMemo(() => {
    if (type === 'vehicle') {
      const v = vehicles.find(v => v.vehicleNo === filterTarget);
      return { registNo: v?.loginCode || '', tradeName: v?.ownerName || '', name: v?.ownerName || '', address: v?.vehicleNo || '' };
    } else {
      const c = clients.find(c => c.clientName === filterTarget);
      return { registNo: c?.businessNo || '', tradeName: c?.clientName || '', name: c?.presidentName || '', address: c?.address || '' };
    }
  }, [type, filterTarget, vehicles, clients]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 p-4 overflow-hidden">
      
      {/* 상단 컨트롤 패널 */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 flex flex-wrap gap-4 items-center justify-between shrink-0 no-print">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">
            <span className="text-xs font-bold text-slate-500">기간</span>
            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="bg-transparent border-none text-sm font-bold outline-none dark:text-white" />
            <span className="text-slate-400">~</span>
            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="bg-transparent border-none text-sm font-bold outline-none dark:text-white" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{type === 'vehicle' ? '차량선택' : '거래처선택'}</span>
            <select value={filterTarget} onChange={e => setFilterTarget(e.target.value)} className="bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded px-3 py-1.5 text-sm font-bold min-w-[200px] dark:text-white shadow-sm">
              {type === 'vehicle' ? vehicles.map(v => <option key={v.id} value={v.vehicleNo}>{v.vehicleNo} ({v.ownerName})</option>) : clients.map(c => <option key={c.id} value={c.clientName}>{c.clientName}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95">
          <span>🖨️ 인쇄 / PDF 저장</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex justify-center bg-gray-100 dark:bg-slate-900/50 p-4">
        <div ref={componentRef} className="bg-white text-black w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl relative box-border flex flex-col">
          
          {type === 'tax' ? (
            <div className="space-y-8 flex-1 h-full flex flex-col justify-between">
              <div className="border border-blue-600 p-3 relative h-[48%] flex flex-col">
                <div className="flex justify-between items-end mb-2 border-b-2 border-blue-600 pb-1">
                    <div className="text-3xl font-bold text-blue-600 tracking-[10px]">세 금 계 산 서</div>
                    <div className="text-sm font-bold text-blue-600 border-2 border-blue-600 px-2">[공급받는자 보관용]</div>
                </div>
                <div className="grid grid-cols-2 gap-0 border border-blue-600 mb-2">
                   <div className="border-r border-blue-600 p-1 flex">
                      <div className="w-8 bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-center text-sm writing-vertical py-2 border-r border-blue-200">공<br/>급<br/>자</div>
                      <div className="flex-1 p-2 text-xs space-y-2">
                         <div className="flex border-b border-blue-100"><span className="w-14 text-blue-500 font-bold">등록번호</span><span className="font-bold flex-1 text-blue-900 text-sm">{provider.registNo}</span></div>
                         <div className="flex border-b border-blue-100"><span className="w-14 text-blue-500 font-bold">상호</span><span className="font-bold flex-1">{provider.tradeName}</span><span className="w-10 text-blue-500 font-bold">성명</span><span className="font-bold">{provider.name}</span></div>
                         <div className="flex"><span className="w-14 text-blue-500 font-bold">사업장</span><span className="flex-1 truncate">{provider.address}</span></div>
                         <div className="flex"><span className="w-14 text-blue-500 font-bold">업태</span><span className="flex-1">{provider.bizCondition}</span><span className="w-10 text-blue-500 font-bold">종목</span><span className="flex-1">{provider.item}</span></div>
                      </div>
                   </div>
                   <div className="p-1 flex">
                      <div className="w-8 bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-center text-sm writing-vertical py-2 border-r border-blue-200">공<br/>급<br/>받<br/>는<br/>자</div>
                      <div className="flex-1 p-2 text-xs space-y-2">
                         <div className="flex border-b border-blue-100"><span className="w-14 text-blue-500 font-bold">등록번호</span><span className="font-bold flex-1 text-blue-900 text-sm">{recipient.registNo}</span></div>
                         <div className="flex border-b border-blue-100"><span className="w-14 text-blue-500 font-bold">상호</span><span className="font-bold flex-1">{recipient.tradeName}</span><span className="w-10 text-blue-500 font-bold">성명</span><span className="font-bold">{recipient.name}</span></div>
                         <div className="flex"><span className="w-14 text-blue-500 font-bold">사업장</span><span className="flex-1 truncate">{recipient.address}</span></div>
                         <div className="flex"><span className="w-14 text-blue-500 font-bold">업태</span><span className="flex-1">{recipient.bizCondition}</span><span className="w-10 text-red-500 font-bold">종목</span><span className="flex-1">{recipient.item}</span></div>
                      </div>
                   </div>
                </div>
                <div className="flex border-x border-b border-blue-600 text-xs text-center">
                    <div className="w-24 bg-blue-50 py-1.5 border-r border-blue-300 font-bold text-blue-700">작성일자</div>
                    <div className="flex-1 bg-blue-50 py-1.5 border-r border-blue-300 font-bold text-blue-700">공급가액</div>
                    <div className="flex-1 bg-blue-50 py-1.5 border-r border-blue-300 font-bold text-blue-700">세액</div>
                    <div className="flex-1 bg-blue-50 py-1.5 font-bold text-blue-700">비고</div>
                </div>
                <div className="flex border-x border-b border-blue-600 text-sm text-center font-bold mb-2">
                    <div className="w-24 py-2 border-r border-blue-300">{new Date().toLocaleDateString()}</div>
                    <div className="flex-1 py-2 border-r border-blue-300 text-right px-3">{totals.supply.toLocaleString()}</div>
                    <div className="flex-1 py-2 border-r border-blue-300 text-right px-3">{totals.tax.toLocaleString()}</div>
                    <div className="flex-1 py-2"></div>
                </div>
                <table className="w-full text-xs border border-blue-600 flex-1">
                   <thead className="bg-blue-50 text-blue-700 text-center">
                      <tr>
                         <th className="border-r border-b border-blue-300 py-1.5 w-10">월</th>
                         <th className="border-r border-b border-blue-300 py-1.5 w-10">일</th>
                         <th className="border-r border-b border-blue-300 py-1.5">품목</th>
                         <th className="border-r border-b border-blue-300 py-1.5 w-10">규격</th>
                         <th className="border-r border-b border-blue-300 py-1.5 w-10">수량</th>
                         <th className="border-r border-b border-blue-300 py-1.5 w-16">단가</th>
                         <th className="border-r border-b border-blue-300 py-1.5 w-20">공급가액</th>
                         <th className="border-r border-b border-blue-300 py-1.5 w-16">세액</th>
                         <th className="border-b border-blue-300 py-1.5">비고</th>
                      </tr>
                   </thead>
                   <tbody>
                      {Array.from({ length: 4 }).map((_, i) => {
                         const op = filteredData[i];
                         return (
                             <tr key={i} className="text-center h-8">
                                <td className="border-r border-b border-blue-200">{op ? op.date.split('-')[1] : ''}</td>
                                <td className="border-r border-b border-blue-200">{op ? op.date.split('-')[2] : ''}</td>
                                <td className="border-r border-b border-blue-200 text-left px-2">{op ? op.item : ''}</td>
                                <td className="border-r border-b border-blue-200"></td>
                                <td className="border-r border-b border-red-200">{op ? op.quantity : ''}</td>
                                <td className="border-r border-b border-red-200 text-right px-2">{op ? op.clientUnitPrice.toLocaleString() : ''}</td>
                                <td className="border-r border-b border-red-200 text-right px-2">{op ? Math.floor(op.clientUnitPrice * op.quantity).toLocaleString() : ''}</td>
                                <td className="border-r border-b border-red-200 text-right px-2">{Math.floor(op.clientUnitPrice * op.quantity * 0.1).toLocaleString() : ''}</td>
                                <td className="border-b border-red-200 text-left px-2 truncate">{op ? op.remarks : ''}</td>
                             </tr>
                         );
                      })}
                   </tbody>
                </table>
                <div className="mt-2 flex text-xs justify-between font-bold">
                    <div>합계금액: <span className="text-base text-blue-700">{totals.total.toLocaleString()}</span> 원</div>
                    <div>이 금액을 ( 영수 / 청구 ) 함</div>
                </div>
              </div>
              <div className="border border-red-600 p-3 relative h-[48%] flex flex-col border-t-2 border-dashed border-slate-400 pt-8 mt-4">
                <div className="flex justify-between items-end mb-2 border-b-2 border-red-600 pb-1">
                    <div className="text-3xl font-bold text-red-600 tracking-[10px]">세 금 계 산 서</div>
                    <div className="text-sm font-bold text-red-600 border-2 border-red-600 px-2">[공급자 보관용]</div>
                </div>
                <div className="grid grid-cols-2 gap-0 border border-red-600 mb-2">
                   <div className="border-r border-red-600 p-1 flex">
                      <div className="w-8 bg-red-100 text-red-700 font-bold flex items-center justify-center text-center text-sm writing-vertical py-2 border-r border-red-200">공<br/>급<br/>자</div>
                      <div className="flex-1 p-2 text-xs space-y-2">
                         <div className="flex border-b border-red-100"><span className="w-14 text-red-500 font-bold">등록번호</span><span className="font-bold flex-1 text-red-900 text-sm">{provider.registNo}</span></div>
                         <div className="flex border-b border-red-100"><span className="w-14 text-red-500 font-bold">상호</span><span className="font-bold flex-1">{provider.tradeName}</span><span className="w-10 text-red-500 font-bold">성명</span><span className="font-bold">{provider.name}</span></div>
                         <div className="flex"><span className="w-14 text-red-500 font-bold">사업장</span><span className="flex-1 truncate">{provider.address}</span></div>
                         <div className="flex"><span className="w-14 text-red-500 font-bold">업태</span><span className="flex-1">{provider.bizCondition}</span><span className="w-10 text-red-500 font-bold">종목</span><span className="flex-1">{provider.item}</span></div>
                      </div>
                   </div>
                   <div className="p-1 flex">
                      <div className="w-8 bg-red-100 text-red-700 font-bold flex items-center justify-center text-center text-sm writing-vertical py-2 border-r border-red-200">공<br/>급<br/>받<br/>는<br/>자</div>
                      <div className="flex-1 p-2 text-xs space-y-2">
                         <div className="flex border-b border-red-100"><span className="w-14 text-red-500 font-bold">등록번호</span><span className="font-bold flex-1 text-red-900 text-sm">{recipient.registNo}</span></div>
                         <div className="flex border-b border-red-100"><span className="w-14 text-red-500 font-bold">상호</span><span className="font-bold flex-1">{recipient.tradeName}</span><span className="w-10 text-red-500 font-bold">성명</span><span className="font-bold">{recipient.name}</span></div>
                         <div className="flex"><span className="w-14 text-red-500 font-bold">사업장</span><span className="flex-1 truncate">{recipient.address}</span></div>
                         <div className="flex"><span className="w-14 text-red-500 font-bold">업태</span><span className="flex-1">{recipient.bizCondition}</span><span className="w-10 text-red-500 font-bold">종목</span><span className="flex-1">{recipient.item}</span></div>
                      </div>
                   </div>
                </div>
                <div className="flex border-x border-b border-red-600 text-xs text-center">
                    <div className="w-24 bg-red-50 py-1.5 border-r border-red-300 font-bold text-red-700">작성일자</div>
                    <div className="flex-1 bg-red-50 py-1.5 border-r border-red-300 font-bold text-red-700">공급가액</div>
                    <div className="flex-1 bg-red-50 py-1.5 border-r border-red-300 font-bold text-red-700">세액</div>
                    <div className="flex-1 bg-red-50 py-1.5 font-bold text-red-700">비고</div>
                </div>
                <div className="flex border-x border-b border-red-600 text-sm text-center font-bold mb-2">
                    <div className="w-24 py-2 border-r border-red-300">{new Date().toLocaleDateString()}</div>
                    <div className="flex-1 py-2 border-r border-red-300 text-right px-3">{totals.supply.toLocaleString()}</div>
                    <div className="flex-1 py-2 border-r border-red-300 text-right px-3">{totals.tax.toLocaleString()}</div>
                    <div className="flex-1 py-2"></div>
                </div>
                <table className="w-full text-xs border border-red-600 flex-1">
                   <thead className="bg-red-50 text-red-700 text-center">
                      <tr>
                         <th className="border-r border-b border-red-300 py-1.5 w-10">월</th>
                         <th className="border-r border-b border-red-300 py-1.5 w-10">일</th>
                         <th className="border-r border-b border-red-300 py-1.5">품목</th>
                         <th className="border-r border-b border-red-300 py-1.5 w-10">규격</th>
                         <th className="border-r border-b border-red-300 py-1.5 w-10">수량</th>
                         <th className="border-r border-b border-red-300 py-1.5 w-16">단가</th>
                         <th className="border-r border-b border-red-300 py-1.5 w-20">공급가액</th>
                         <th className="border-r border-b border-red-300 py-1.5 w-16">세액</th>
                         <th className="border-b border-blue-300 py-1.5">비고</th>
                      </tr>
                   </thead>
                   <tbody>
                      {Array.from({ length: 4 }).map((_, i) => {
                         const op = filteredData[i];
                         return (
                             <tr key={i} className="text-center h-8">
                                <td className="border-r border-b border-red-200">{op ? op.date.split('-')[1] : ''}</td>
                                <td className="border-r border-b border-red-200">{op ? op.date.split('-')[2] : ''}</td>
                                <td className="border-r border-b border-red-200 text-left px-2">{op ? op.item : ''}</td>
                                <td className="border-r border-b border-red-200"></td>
                                <td className="border-r border-b border-red-200">{op ? op.quantity : ''}</td>
                                <td className="border-r border-b border-red-200 text-right px-2">{op ? op.clientUnitPrice.toLocaleString() : ''}</td>
                                <td className="border-r border-b border-red-200 text-right px-2">{op ? Math.floor(op.clientUnitPrice * op.quantity).toLocaleString() : ''}</td>
                                <td className="border-r border-b border-red-200 text-right px-2">{Math.floor(op.clientUnitPrice * op.quantity * 0.1).toLocaleString() : ''}</td>
                                <td className="border-b border-red-200 text-left px-2 truncate">{op ? op.remarks : ''}</td>
                             </tr>
                         );
                      })}
                   </tbody>
                </table>
                <div className="mt-2 flex text-xs justify-between font-bold">
                    <div>합계금액: <span className="text-base text-red-700">{totals.total.toLocaleString()}</span> 원</div>
                    <div>이 금액을 ( 영수 / 청구 ) 함</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-6">
                
                <div className="space-y-4">
                   <h1 className="text-4xl font-black text-black">
                     {title}
                   </h1>
                   
                   <div className="text-5xl font-black text-blue-800 underline decoration-4 underline-offset-8">
                     {filterTarget}
                   </div>

                   <div className="text-lg font-bold text-slate-700">
                     거래기간 : {filterStartDate} ~ {filterEndDate}
                   </div>
                </div>

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

              <table className="w-full text-[11px] border-collapse border border-slate-400 mb-8">
                <thead>
                  <tr className="bg-slate-100 text-center h-8 border-b border-slate-400">
                    <th className="border-r border-slate-400 w-16">일자</th>
                    <th className="border-r border-slate-400 w-16">차량번호</th>
                    <th className="border-r border-slate-400 w-20">단가</th>
                    <th className="border-r border-slate-400">상차지</th>
                    <th className="border-r border-slate-400">하차지</th>
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
                  {Array.from({ length: Math.max(0, 15 - filteredData.length) }).map((_, i) => (
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
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default StatementView;