// components/CompanyTransactionStatement.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Printer, FileSpreadsheet, Copy, Check } from 'lucide-react';
import { Operation, Client } from '../types';

interface Props {
  operations: Operation[];
  clients: Client[];
}

export default function CompanyTransactionStatement({ operations, clients }: Props) {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (clients.length > 0 && !selectedClientName) {
      setSelectedClientName(clients[0].clientName);
    }
  }, [clients, selectedClientName]);

  const filteredData = useMemo(() => {
    return operations.filter(op => {
      if (!op.date) return false;
      const opDate = op.date.split('T')[0];
      const isDateMatch = opDate >= startDate && opDate <= endDate;
      const isClientMatch = selectedClientName === '전체' || op.clientName === selectedClientName;
      return isDateMatch && isClientMatch;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [operations, startDate, endDate, selectedClientName]);

  const totalQty = filteredData.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalSupply = filteredData.reduce((sum, item) => sum + (Number(item.supplyPrice) || 0), 0);
  const totalTax = filteredData.reduce((sum, item) => sum + (Number(item.tax) || 0), 0);
  const grandTotal = filteredData.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

  const handleDownloadExcel = () => {
    const fileName = `${selectedClientName}_상호별거래내역서_${startDate}_${endDate}.xlsx`;
    alert(`[엑셀 다운로드 요청]\n파일: ${fileName}\n데이터: ${filteredData.length}건`);
  };

  const handleCopy = () => {
    const text = `[${selectedClientName} 거래명세서]\n기간: ${startDate} ~ ${endDate}\n합계: ${grandTotal.toLocaleString()}원`;
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col xl:flex-row gap-4 h-full bg-gray-100 p-2 overflow-hidden print:bg-white print:p-0">
      <div className="flex-1 overflow-auto bg-gray-50 flex justify-center items-start print:overflow-visible print:bg-white print:w-full">
        <div className="bg-white shadow-lg p-6 w-full max-w-[210mm] min-h-[297mm] text-black border border-gray-300 print:shadow-none print:border-none print:w-full print:max-w-none" style={{ fontFamily: '"Malgun Gothic", "Dotum", sans-serif' }}>
          
          <h1 className="text-3xl font-extrabold text-center mb-6 tracking-widest bg-gray-100 py-2 border-b-2 border-black print:bg-transparent">
            상 호 별 거 래 명 세 서 ({parseInt(startDate.slice(5,7))}월)
          </h1>

          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col justify-end h-full"><h2 className="text-3xl font-bold tracking-tighter">{selectedClientName} 귀하</h2></div>
            <div className="w-[55%]">
               <div className="text-right mb-1 text-lg font-bold">장 국 용 귀하</div>
               <table className="w-full border-collapse border-2 border-black text-xs">
                <tbody>
                  <tr><td className="border border-black bg-gray-100 text-center p-1 w-16 print:bg-gray-100">등록번호</td><td className="border border-black p-1 text-center font-bold" colSpan={3}>406-81-64763</td></tr>
                  <tr><td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">상 호</td><td className="border border-black p-1 text-center">(주)베라카</td><td className="border border-black bg-gray-100 text-center p-1 w-12 print:bg-gray-100">성 명</td><td className="border border-black p-1 text-center">장국용</td></tr>
                  <tr><td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">주 소</td><td className="border border-black p-1 text-center" colSpan={3}>포항시 남구 연일읍 새천년대로 202. 2층</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex border-2 border-black mb-1 text-sm">
            <div className="w-1/4 border-r border-black bg-gray-50 p-1 font-bold text-center flex flex-col justify-center print:bg-gray-100"><span>공급가액</span><span>세 액</span></div>
            <div className="w-1/4 border-r border-black p-1 text-right flex flex-col justify-center px-2 font-bold"><span>{totalSupply.toLocaleString()}</span><span>{totalTax.toLocaleString()}</span></div>
            <div className="w-1/4 border-r border-black bg-gray-100 p-1 font-bold text-center flex items-center justify-center text-lg print:bg-gray-100">청구 금액</div>
            <div className="w-1/4 p-1 text-right flex items-center justify-end px-2 text-xl font-extrabold bg-blue-100 text-blue-800 print:bg-transparent">{grandTotal.toLocaleString()}</div>
          </div>

          <div className="w-full mb-1">
            <table className="w-full border-collapse border border-black text-xs text-center table-fixed">
              <colgroup><col className="w-20"/><col className="w-24"/><col className="w-24"/><col className="w-16"/><col className="w-16"/><col className="w-12"/><col className="w-20"/><col className="w-16"/><col className="w-20"/></colgroup>
              <thead className="bg-gray-100 font-bold print:bg-gray-100">
                <tr><th className="border border-black py-1">일자</th><th className="border border-black py-1">상차지</th><th className="border border-black py-1">하차지</th><th className="border border-black py-1">품명</th><th className="border border-black py-1">차량</th><th className="border border-black py-1">수량</th><th className="border border-black py-1">공급가액</th><th className="border border-black py-1">세액</th><th className="border border-black py-1">합계금액</th></tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (filteredData.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-black py-0.5">{row.date.split('T')[0].slice(5)}</td>
                      <td className="border border-black py-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{row.origin}</td>
                      <td className="border border-black py-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{row.destination}</td>
                      <td className="border border-black py-0.5">{row.item}</td>
                      <td className="border border-black py-0.5">{row.vehicleNo}</td>
                      <td className="border border-black py-0.5 text-right px-1">{row.quantity}</td>
                      <td className="border border-black py-0.5 text-right px-1">{Number(row.supplyPrice).toLocaleString()}</td>
                      <td className="border border-black py-0.5 text-right px-1">{Number(row.tax).toLocaleString()}</td>
                      <td className="border border-black py-0.5 text-right px-1 font-bold">{Number(row.totalAmount).toLocaleString()}</td>
                    </tr>
                  ))) : (<tr><td colSpan={9} className="border border-black py-10 text-center text-gray-500">기간 내 거래 내역이 없습니다.</td></tr>)}
                {Array.from({ length: Math.max(0, 15 - filteredData.length) }).map((_, i) => (
                  <tr key={`empty-${i}`}><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td></tr>
                ))}
              </tbody>
              <tfoot className="font-bold border-t-2 border-black">
                <tr className="bg-blue-100 print:bg-transparent"><td className="border border-black py-1" colSpan={6}>합 계</td><td className="border border-black py-1 text-right px-1">{totalSupply.toLocaleString()}</td><td className="border border-black py-1 text-right px-1">{totalTax.toLocaleString()}</td><td className="border border-black py-1 text-right px-1 text-base text-blue-800">{grandTotal.toLocaleString()}</td></tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-end mt-4">
             <table className="w-[300px] border-collapse border border-black text-sm print:bg-transparent">
              <tbody><tr className="border-t-2 border-black"><td className="border border-black p-2 text-center font-extrabold bg-blue-100 print:bg-gray-100">청 구 금 액</td><td className="border border-black p-2 text-right px-2 text-lg font-extrabold text-blue-800">{grandTotal.toLocaleString()}</td></tr></tbody>
            </table>
          </div>

           <div className="mt-8 text-center pb-4">
            <p className="text-sm text-gray-500 mb-6">위와 같이 거래하였음을 확인합니다.</p>
            <div className="text-xl font-bold tracking-widest inline-block">(주) 베 라 카 <span className="text-gray-300 text-sm font-normal ml-2">(인)</span></div>
          </div>
        </div>
      </div>

      <div className="w-full xl:w-72 flex-shrink-0 print:hidden">
        <div className="bg-white rounded-lg shadow-md p-4 sticky top-4 border border-gray-200">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2 border-b pb-2"><Search className="w-4 h-4 text-blue-600" />내역서 설정</h2>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-xs font-bold text-gray-700">조회 기간</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border rounded text-xs" /><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border rounded text-xs" /></div>
            <div className="space-y-2"><label className="text-xs font-bold text-gray-700">거래처(상호) 선택</label><select value={selectedClientName} onChange={(e) => setSelectedClientName(e.target.value)} className="w-full p-2 border rounded text-base font-bold text-blue-800"><option value="전체">전체 거래처</option>{clients.map((c) => (<option key={c.id} value={c.clientName}>{c.clientName}</option>))}</select></div>
            <hr className="border-gray-200 my-2" />
            <div className="space-y-2"><button onClick={handleDownloadExcel} className="w-full flex items-center justify-center gap-2 bg-green-700 text-white font-bold py-2 rounded text-xs shadow-sm hover:bg-green-800 transition-colors"><FileSpreadsheet className="w-4 h-4" />엑셀로 추출하기</button><div className="grid grid-cols-2 gap-2"><button onClick={handleCopy} className={`flex items-center justify-center gap-1 font-bold py-2 rounded text-xs border transition-colors shadow-sm ${isCopied ? 'bg-gray-800 text-white' : 'bg-white hover:bg-gray-50'}`}>{isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{isCopied ? '완료' : '내용 복사'}</button><button onClick={handlePrint} className="flex items-center justify-center gap-1 bg-gray-600 text-white font-bold py-2 rounded text-xs shadow-sm hover:bg-gray-700 transition-colors"><Printer className="w-3 h-3" />인쇄</button></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}