import React, { useState, useMemo, useEffect } from 'react';
import { Search, Printer, FileSpreadsheet, Copy, Check, Image as ImageIcon, ArrowLeft, Calendar } from 'lucide-react';
import { Operation, Client, Vehicle } from '../types';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Props {
  operations: Operation[];
  clients: Client[];
  vehicles: Vehicle[]; 
  userRole?: string;
  userIdentifier?: string;
}

export default function CompanyTransactionStatement({ operations, clients, vehicles, userRole, userIdentifier }: Props) {
  // 1. 날짜 및 상태 초기화
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [viewType, setViewType] = useState<'SALES' | 'PURCHASE'>('SALES');
  
  // 🔥 조회 상태 (false: 검색창, true: 명세서)
  const [isSearched, setIsSearched] = useState(false);

  // 초기 거래처 선택 (협력업체 로그인 시 자동 고정)
  useEffect(() => {
    if (userRole === 'PARTNER' && userIdentifier) {
      setSelectedClientName(userIdentifier);
    } else if (clients.length > 0 && !selectedClientName) {
      setSelectedClientName(clients[0].clientName);
    }
  }, [clients, userRole, userIdentifier, selectedClientName]);

  // --------------------------------------------------------------------------
  // 2. 데이터 필터링
  // --------------------------------------------------------------------------
  const filteredData = useMemo(() => {
    if (!isSearched) return []; // 조회 전엔 데이터 없음

    return operations.filter(op => {
      if (!op.date) return false;
      const opDate = op.date.split('T')[0];
      const isDateMatch = opDate >= startDate && opDate <= endDate;
      
      const isClientMatch = selectedClientName === '전체' || op.clientName === selectedClientName;
      
      // 매출(SALES): 내가 청구함 / 매입(PURCHASE): 내가 지급함 (기본값 SALES)
      const opType = op.type || 'SALES'; 
      const isTypeMatch = opType === viewType;

      return isDateMatch && isClientMatch && isTypeMatch;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [operations, startDate, endDate, selectedClientName, viewType, isSearched]);

  // 합계 계산
  const totalSupply = filteredData.reduce((sum, item) => sum + (Number(item.supplyPrice) || 0), 0);
  const totalTax = filteredData.reduce((sum, item) => sum + (Number(item.tax) || 0), 0);
  const grandTotal = filteredData.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

  const getOwnerName = (vNo: string) => {
    const found = vehicles.find(v => v.vehicleNo === vNo);
    return found ? found.ownerName : '';
  };

  // --------------------------------------------------------------------------
  // 3. 엑셀 다운로드 (ExcelJS)
  // --------------------------------------------------------------------------
  const handleDownloadExcel = async () => {
    if (filteredData.length === 0) { alert("다운로드할 데이터가 없습니다."); return; }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('거래내역');

    sheet.columns = [{ width: 12 }, { width: 15 }, { width: 15 }, { width: 10 }, { width: 12 }, { width: 10 }, { width: 8 }, { width: 12 }, { width: 12 }, { width: 15 }];

    const title = viewType === 'SALES' ? '거 래 명 세 서 ( 매 출 )' : '거 래 명 세 서 ( 매 입 )';
    const typeLabel = viewType === 'SALES' ? '청구 금액' : '지급 금액';

    const titleRow = sheet.addRow([`${title} (${parseInt(startDate.slice(5, 7))}월)`]);
    sheet.mergeCells('A1:J1');
    titleRow.height = 35;
    titleRow.font = { name: '맑은 고딕', size: 20, bold: true };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };

    sheet.addRow([]);

    sheet.getCell('A3').value = `${selectedClientName} 귀하`;
    sheet.mergeCells('A3:E6');
    const clientInfo = sheet.getCell('A3');
    clientInfo.font = { size: 16, bold: true };
    clientInfo.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.getCell('F3').value = '등록번호'; sheet.getCell('G3').value = '406-81-64763'; sheet.mergeCells('G3:J3');
    sheet.getCell('F4').value = '상호'; sheet.getCell('G4').value = '(주)베라카'; 
    sheet.getCell('H4').value = '성명'; sheet.getCell('I4').value = '장국용'; sheet.mergeCells('I4:J4');
    sheet.getCell('F5').value = '주소'; sheet.getCell('G5').value = '포항시 남구 연일읍 새천년대로 202. 2층'; sheet.mergeCells('G5:J5');
    sheet.getCell('F6').value = '업태'; sheet.getCell('G6').value = '도매및소매업'; sheet.mergeCells('G6:H6');
    sheet.getCell('I6').value = '종목'; sheet.getCell('J6').value = '골재';

    for(let r=3; r<=6; r++) {
        for(let c=6; c<=10; c++) {
            const cell = sheet.getCell(r, c);
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if(c === 6 || c === 8 && r === 4) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
            if(r===6 && c===9) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
        }
    }

    sheet.addRow([]);
    const summaryRow = sheet.addRow(['공급가액', totalSupply.toLocaleString(), '', '세액', totalTax.toLocaleString(), typeLabel, '', '', '', grandTotal.toLocaleString()]);
    summaryRow.height = 30;
    ['A8', 'D8', 'F8'].forEach(k => {
        const cell = sheet.getCell(k);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getCell('J8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    sheet.getCell('J8').font = { size: 14, bold: true };
    sheet.mergeCells('B8:C8'); sheet.mergeCells('F8:I8');
    ['A8','B8','C8','D8','E8','F8','G8','H8','I8','J8'].forEach(k => sheet.getCell(k).border = { top: {style:'medium'}, bottom: {style:'medium'} });

    sheet.addRow([]);

    const headerRow = sheet.addRow(['일자', '상차지', '하차지', '품명', '차량', '차주명', '수량', '공급가액', '세액', '합계금액']);
    headerRow.height = 25;
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    filteredData.forEach(row => {
        const r = sheet.addRow([row.date.split('T')[0], row.origin, row.destination, row.item, row.vehicleNo, getOwnerName(row.vehicleNo), Number(row.quantity), Number(row.supplyPrice), Number(row.tax), Number(row.totalAmount)]);
        r.eachCell((cell, col) => {
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            cell.alignment = [7,8,9,10].includes(col) ? { horizontal: 'right' } : { horizontal: 'center' };
            if([7,8,9,10].includes(col)) cell.numFmt = '#,##0';
        });
    });

    const emptyRows = Math.max(0, 15 - filteredData.length);
    for(let i=0; i<emptyRows; i++) {
        const r = sheet.addRow(['', '', '', '', '', '', '', '', '', '']);
        r.eachCell(c => c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} });
    }

    const footerRow = sheet.addRow(['합 계', '', '', '', '', '', '', totalSupply, totalTax, grandTotal]);
    sheet.mergeCells(`A${footerRow.number}:G${footerRow.number}`);
    footerRow.height = 25;
    footerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        cell.font = { bold: true };
        cell.border = { top: {style:'medium'}, left: {style:'thin'}, bottom: {style:'medium'}, right: {style:'thin'} };
        cell.numFmt = '#,##0';
    });
    footerRow.getCell(1).alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    const safeClientName = selectedClientName.replace(/[\/\\?%*:|"<>]/g, '-');
    const fileName = `${safeClientName}_${viewType === 'SALES' ? '매출' : '매입'}내역서_${startDate}_${endDate}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
  };

  const handleCopyImage = async () => {
    const element = document.getElementById('company-print-area');
    if (!element) { alert('캡처할 영역을 찾을 수 없습니다.'); return; }
    try {
        setIsCopied(true);
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
        canvas.toBlob((blob) => {
            if (blob) {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                .then(() => { alert("📸 복사 완료!"); setTimeout(() => setIsCopied(false), 2000); })
                .catch(() => { alert("복사 실패"); setIsCopied(false); });
            }
        });
    } catch { alert("에러"); setIsCopied(false); }
  };

  const handlePrint = () => { window.print(); };

  // ==========================================================================
  // 🔥 [CASE 1] 조회 전 화면 (검색창)
  // ==========================================================================
  if (!isSearched) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-gray-100">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 space-y-8 animate-in zoom-in-95 duration-300">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-800">거래내역 조회</h2>
            <p className="text-gray-500 text-sm">기간과 거래처를 선택하세요</p>
          </div>

          <div className="space-y-4">
            
            {/* 구분 선택 */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setViewType('SALES')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${viewType === 'SALES' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>매출 (청구)</button>
              <button onClick={() => setViewType('PURCHASE')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${viewType === 'PURCHASE' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>매입 (지급)</button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Date Range</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pl-9 pr-2 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full pl-9 pr-2 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* 관리자만 거래처 선택 가능 */}
            {userRole !== 'PARTNER' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Client</label>
                <select value={selectedClientName} onChange={(e) => setSelectedClientName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-blue-700 outline-none">
                  <option value="전체">전체 거래처</option>
                  {clients.map((c) => (<option key={c.id} value={c.clientName}>{c.clientName}</option>))}
                </select>
              </div>
            )}
          </div>

          <button onClick={() => setIsSearched(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
            <span>조회하기</span>
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 🔥 [CASE 2] 조회 후 화면 (명세서 100% + 하단 독바)
  // ==========================================================================
  return (
    <div className="h-full flex flex-col bg-gray-100 overflow-hidden relative">
      
      {/* 1. 상단: 뒤로가기 */}
      <div className="bg-white px-4 py-2 border-b flex justify-between items-center shrink-0 print:hidden">
        <button onClick={() => setIsSearched(false)} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-bold text-sm bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" /> 다시 선택
        </button>
        <span className="text-xs font-bold text-slate-400">{startDate} ~ {endDate}</span>
      </div>

      {/* 2. 메인: 명세서 */}
      <div className="flex-1 overflow-auto bg-gray-50 flex justify-center items-start pt-4 pb-20 print:p-0 print:overflow-visible">
        <div id="company-print-area" className="bg-white shadow-xl p-6 w-full max-w-[210mm] min-h-[297mm] text-black border border-gray-200 print:shadow-none print:border-none print:w-full print:max-w-none origin-top scale-[0.9] md:scale-100" style={{ fontFamily: '"Malgun Gothic", "Dotum", sans-serif' }}>
          
          <h1 className="text-3xl font-extrabold text-center mb-6 tracking-widest bg-gray-100 py-2 border-b-2 border-black print:bg-transparent text-black">
            {viewType === 'SALES' ? '거 래 명 세 서 (매 출)' : '거 래 명 세 서 (매 입)'}
            <span className="text-lg ml-2 font-normal text-black">({parseInt(startDate.slice(5,7))}월)</span>
          </h1>

          <div className="flex justify-between items-center mb-4">
            <div className="flex-1 flex flex-col justify-center items-center h-full">
              <h2 className="text-3xl font-bold tracking-tighter">{selectedClientName} 귀하</h2>
              <p className="text-sm text-gray-500 mt-1">
                {viewType === 'SALES' ? '※ 귀하가 운송 의뢰한 내역 (청구)' : '※ 귀하가 당사에 운송 제공한 내역 (지급)'}
              </p>
            </div>
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
            <div className="w-1/4 border-r border-black bg-gray-100 p-1 font-bold text-center flex items-center justify-center text-lg print:bg-gray-100">
              {viewType === 'SALES' ? '청구 금액' : '지급 금액'}
            </div>
            <div className="w-1/4 p-1 text-right flex items-center justify-end px-2 text-xl font-extrabold bg-gray-50 print:bg-transparent">
              {grandTotal.toLocaleString()}
            </div>
          </div>

          <div className="w-full mb-1">
            <table className="w-full border-collapse border border-black text-xs text-center table-fixed">
              <colgroup><col className="w-20"/><col className="w-24"/><col className="w-24"/><col className="w-16"/><col className="w-16"/><col className="w-12"/><col className="w-20"/><col className="w-16"/><col className="w-20"/></colgroup>
              <thead className="bg-gray-100 font-bold print:bg-gray-100">
                <tr><th className="border border-black py-1">일자</th><th className="border border-black py-1">상차지</th><th className="border border-black py-1">하차지</th><th className="border border-black py-1">품명</th><th className="border border-black py-1">차량</th><th className="border border-black py-1">수량</th><th className="border border-black py-1">공급가액</th><th className="border border-black py-1">세액</th><th className="border border-black py-1">합계금액</th></tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (filteredData.map((row) => {
                    const owner = getOwnerName(row.vehicleNo);
                    return (
                      <tr key={row.id}>
                        <td className="border border-black py-0.5">{row.date.split('T')[0].slice(5)}</td>
                        <td className="border border-black py-0.5 truncate">{row.origin}</td>
                        <td className="border border-black py-0.5 truncate">{row.destination}</td>
                        <td className="border border-black py-0.5">{row.item}</td>
                        <td className="border border-black py-0.5 leading-tight">
                          <div className="font-bold">{row.vehicleNo}</div>
                          {owner && <div className="text-[10px] text-gray-500 scale-90">({owner})</div>}
                        </td>
                        <td className="border border-black py-0.5 text-right px-1">{row.quantity}</td>
                        <td className="border border-black py-0.5 text-right px-1">{Number(row.supplyPrice).toLocaleString()}</td>
                        <td className="border border-black py-0.5 text-right px-1">{Number(row.tax).toLocaleString()}</td>
                        <td className="border border-black py-0.5 text-right px-1 font-bold">{Number(row.totalAmount).toLocaleString()}</td>
                      </tr>
                    );
                  })) : (<tr><td colSpan={9} className="border border-black py-10 text-center text-gray-500">기간 내 거래 내역이 없습니다.</td></tr>)}
                {Array.from({ length: Math.max(0, 15 - filteredData.length) }).map((_, i) => (
                  <tr key={`empty-${i}`}><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td></tr>
                ))}
              </tbody>
              <tfoot className="font-bold border-t-2 border-black">
                <tr className="bg-gray-100 print:bg-transparent">
                  <td className="border border-black py-1" colSpan={6}>합 계</td>
                  <td className="border border-black py-1 text-right px-1">{totalSupply.toLocaleString()}</td>
                  <td className="border border-black py-1 text-right px-1">{totalTax.toLocaleString()}</td>
                  <td className="border border-black py-1 text-right px-1 text-base text-black">{grandTotal.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-end mt-4">
             <table className="w-[300px] border-collapse border border-black text-sm print:bg-transparent">
              <tbody><tr className="border-t-2 border-black">
                <td className="border border-black p-2 text-center font-extrabold bg-gray-100 print:bg-gray-100">
                  {viewType === 'SALES' ? '청 구 금 액' : '지 급 금 액'}
                </td>
                <td className="border border-black p-2 text-right px-2 text-lg font-extrabold text-black">
                  {grandTotal.toLocaleString()}
                </td>
              </tr></tbody>
            </table>
          </div>

           <div className="mt-8 text-center pb-4">
            <p className="text-sm text-gray-500 mb-6">위와 같이 거래하였음을 확인합니다.</p>
            <div className="text-xl font-bold tracking-widest inline-block">(주) 베 라 카 <span className="text-gray-300 text-sm font-normal ml-2">(인)</span></div>
          </div>
        </div>
      </div>

      {/* 3. 하단: 고정 메뉴바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] print:hidden z-50">
        <button onClick={handleDownloadExcel} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <FileSpreadsheet className="w-5 h-5" /> 엑셀 저장
        </button>
        <button onClick={handleCopyImage} className={`flex-1 font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform ${isCopied ? 'bg-blue-800 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
            {isCopied ? <Check className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />} {isCopied ? '복사됨' : '이미지 복사'}
        </button>
        <button onClick={handlePrint} className="w-14 bg-gray-700 text-white rounded-xl flex items-center justify-center active:scale-95">
            <Printer className="w-6 h-6" />
        </button>
      </div>

    </div>
  );
}