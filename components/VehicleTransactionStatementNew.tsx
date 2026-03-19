import React, { useState, useMemo, useEffect } from 'react';
import { Search, Printer, FileSpreadsheet, Copy, Check, Image as ImageIcon, ArrowLeft, Calendar } from 'lucide-react';
import { Operation, Vehicle } from '../types';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Props {
  operations: Operation[];
  vehicles: Vehicle[];
}

export default function VehicleTransactionStatementNew({ operations, vehicles }: Props) {
  // 1. 날짜 및 상태 초기화
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  
  // 관리자는 처음에 '전체'로 시작
  const [selectedVehicleNo, setSelectedVehicleNo] = useState<string>('전체');
  const [isCopied, setIsCopied] = useState(false);
  
  // 조회 상태 (모바일용)
  const [isSearched, setIsSearched] = useState(false);

  const savedUser = localStorage.getItem('veraka_user');
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const isVehicleUser = currentUser?.role === 'VEHICLE';

  // 2. 초기값 설정
  useEffect(() => {
    if (isVehicleUser) {
        setSelectedVehicleNo(currentUser.identifier); 
    } else {
        if (!selectedVehicleNo) setSelectedVehicleNo('전체');
    }
  }, [isVehicleUser, currentUser]);

  // 3. 데이터 필터링
  const filteredData = useMemo(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile && !isSearched) return [];

    return operations.filter(op => {
      if (!op.date) return false;
      const opDate = op.date.split('T')[0];
      const isDateMatch = opDate >= startDate && opDate <= endDate;
      const targetVehicle = isVehicleUser ? currentUser.username : selectedVehicleNo;
      const isVehicleMatch = targetVehicle === '전체' || op.vehicleNo === targetVehicle;
      return isDateMatch && isVehicleMatch;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [operations, startDate, endDate, selectedVehicleNo, isSearched, isVehicleUser, currentUser]);

  // 합계 계산
  const totalQty = filteredData.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalSupply = filteredData.reduce((sum, item) => sum + (Number(item.supplyPrice) || 0), 0);
  const totalTax = filteredData.reduce((sum, item) => sum + (Number(item.tax) || 0), 0);
  const grandTotal = filteredData.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

  const deductionTotal = Math.floor(grandTotal * 0.05);
  const commissionSupply = Math.floor(deductionTotal / 1.1);
  const commissionTax = deductionTotal - commissionSupply;
  const finalPayment = grandTotal - deductionTotal;

  // 엑셀 다운로드
  const handleDownloadExcel = async () => {
    if (filteredData.length === 0) { alert("다운로드할 데이터가 없습니다."); return; }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('차량거래내역');
    sheet.columns = [{ width: 15 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 8 }, { width: 15 }, { width: 12 }, { width: 18 }];
    
    const titleRow = sheet.addRow([`차 량 거 래 명 세 서 (${parseInt(startDate.slice(5, 7))}월)`]);
    sheet.mergeCells('A1:I1');
    titleRow.height = 35;
    titleRow.font = { name: '맑은 고딕', size: 20, bold: true };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    sheet.addRow([]);

    const targetVehicle = selectedVehicleNo === '전체' ? '전체 차량' : selectedVehicleNo;
    sheet.getCell('A3').value = `차량번호: ${targetVehicle}`;
    sheet.mergeCells('A3:E6');
    sheet.getCell('A3').font = { size: 16, bold: true };
    sheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.getCell('F3').value = '등록번호'; sheet.getCell('G3').value = '406-81-64763'; sheet.mergeCells('G3:I3');
    sheet.getCell('F4').value = '상호'; sheet.getCell('G4').value = '(주)베라카'; 
    sheet.getCell('H4').value = '성명'; sheet.getCell('I4').value = '장국용';
    sheet.getCell('F5').value = '주소'; sheet.getCell('G5').value = '포항시 남구 연일읍 새천년대로 202. 2층'; sheet.mergeCells('G5:I5');
    sheet.getCell('F6').value = '업태'; sheet.getCell('G6').value = '도매및소매업'; sheet.getCell('H6').value = '종목'; sheet.getCell('I6').value = '골재';

    for(let r=3; r<=6; r++) { for(let c=6; c<=9; c++) { const cell = sheet.getCell(r, c); cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; cell.alignment = { horizontal: 'center', vertical: 'middle' }; if (c === 6 || c === 8) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } }; } }
    sheet.addRow([]); 

    const summaryRow = sheet.addRow(['공급가액', totalSupply.toLocaleString(), '', '세액', totalTax.toLocaleString(), '청구금액', '', '', grandTotal.toLocaleString()]);
    summaryRow.height = 30;
    ['A8', 'D8', 'F8'].forEach(k => { const c = sheet.getCell(k); c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } }; c.font = { bold: true }; c.alignment = { horizontal: 'center', vertical: 'middle' }; });
    sheet.getCell('I8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; sheet.getCell('I8').font = { size: 14, bold: true };
    sheet.mergeCells('B8:C8'); sheet.mergeCells('F8:H8');
    ['A8','B8','C8','D8','E8','F8','G8','H8','I8'].forEach(k => sheet.getCell(k).border = { top: {style:'medium'}, bottom: {style:'medium'} });
    sheet.addRow([]); 

    const headerRow = sheet.addRow(['일자', '상차지', '하차지', '품명', '단가', '수량', '공급가액', '세액', '합계금액']);
    headerRow.height = 25;
    headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } }; cell.font = { bold: true }; cell.alignment = { horizontal: 'center', vertical: 'middle' }; cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; });

    filteredData.forEach(row => {
        const r = sheet.addRow([row.date.split('T')[0], row.origin, row.destination, row.item, Number(row.unitPrice), Number(row.quantity), Number(row.supplyPrice), Number(row.tax), Number(row.totalAmount)]);
        r.eachCell((cell, col) => { cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; if ([5, 6, 7, 8, 9].includes(col)) { cell.alignment = { horizontal: 'right' }; cell.numFmt = '#,##0'; } else { cell.alignment = { horizontal: 'center' }; } });
    });

    const emptyRows = Math.max(0, 15 - filteredData.length);
    for(let i=0; i<emptyRows; i++) { const r = sheet.addRow(['', '', '', '', '', '', '', '', '']); r.eachCell(c => c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }); }

    const footerRow = sheet.addRow(['매출 합계', '', '', '', '', totalQty, totalSupply, totalTax, grandTotal]);
    sheet.mergeCells(`A${footerRow.number}:E${footerRow.number}`);
    footerRow.height = 25;
    footerRow.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; c.font = { bold: true }; c.border = { top: {style:'medium'}, left: {style:'thin'}, bottom: {style:'medium'}, right: {style:'thin'} }; c.numFmt = '#,##0'; });
    footerRow.getCell(1).alignment = { horizontal: 'center' };

    const deductionRow = sheet.addRow(['5% 공제 (수수료+부가세)', '', '', '', '', '', commissionSupply, commissionTax, -deductionTotal]);
    sheet.mergeCells(`A${deductionRow.number}:F${deductionRow.number}`);
    deductionRow.eachCell(c => { c.font = { color: { argb: 'FFFF0000' }, bold: true }; c.alignment = { horizontal: 'right' }; c.numFmt = '#,##0'; });
    deductionRow.getCell(1).alignment = { horizontal: 'center' };

    sheet.addRow([]);
    const finalRow = sheet.addRow(['', '', '', '', '', '실 지급액', '', '', finalPayment]);
    sheet.mergeCells(`F${finalRow.number}:H${finalRow.number}`);
    finalRow.getCell(6).font = { bold: true, size: 12 }; finalRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }; finalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    finalRow.getCell(9).font = { bold: true, size: 14, color: { argb: 'FFFF0000' }, underline: true }; finalRow.getCell(9).numFmt = '#,##0'; finalRow.getCell(9).alignment = { horizontal: 'right' };

    const buffer = await workbook.xlsx.writeBuffer();
    const safeName = targetVehicle.replace(/[\/\\?%*:|"<>]/g, '-');
    saveAs(new Blob([buffer]), `${safeName}_차량거래내역서_${startDate}_${endDate}.xlsx`);
  };

  const handleCopyImage = async () => {
    const element = document.getElementById('vehicle-print-area');
    if (!element) { alert('캡처할 영역을 찾을 수 없습니다.'); return; }
    try {
        setIsCopied(true);
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
        canvas.toBlob((blob) => { if (blob) { navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => { alert("📸 복사 완료!"); setTimeout(() => setIsCopied(false), 2000); }).catch(() => { alert("복사 실패"); setIsCopied(false); }); } });
    } catch { alert("에러"); setIsCopied(false); }
  };

  const handlePrint = () => { window.print(); };

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-100 overflow-hidden relative">
      
      {/* 📱 모바일: 검색창 (조회 전) */}
      <div className={`md:hidden h-full flex items-center justify-center p-6 ${isSearched ? 'hidden' : 'block'}`}>
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 space-y-8 animate-in zoom-in-95 duration-300">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8" /></div>
            <h2 className="text-2xl font-black text-gray-800">거래내역 조회</h2>
            <p className="text-gray-500 text-sm">조회할 기간을 선택해주세요</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase ml-1">Start Date</label><div className="relative"><Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" /><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div></div>
            <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase ml-1">End Date</label><div className="relative"><Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" /><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div></div>
            {!isVehicleUser && (<div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase ml-1">Select Vehicle</label><select value={selectedVehicleNo} onChange={(e) => setSelectedVehicleNo(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-blue-700 outline-none"><option value="전체">전체 차량</option>{vehicles.map((v) => (<option key={v.id} value={v.vehicleNo}>{v.vehicleNo} ({v.ownerName})</option>))}</select></div>)}
          </div>
          <button onClick={() => setIsSearched(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"><span>조회 시작</span><Search className="w-5 h-5" /></button>
        </div>
      </div>

      {/* 📱 모바일: 결과 화면 (조회 후) */}
      <div className={`md:hidden flex-col h-full bg-gray-100 ${isSearched ? 'flex' : 'hidden'}`}>
        <div className="bg-white px-4 py-2 border-b flex justify-between items-center shrink-0 z-10 shadow-sm">
            <button onClick={() => setIsSearched(false)} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-bold text-sm bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"><ArrowLeft className="w-4 h-4" /> 날짜 다시 선택</button>
            <span className="text-xs font-bold text-slate-400">{startDate} ~ {endDate}</span>
        </div>
        
        {/* 모바일용 명세서 본문 (PC와 동일한 구조지만 따로 작성) */}
        <div className="flex-1 overflow-auto bg-gray-50 flex justify-center items-start pt-4 pb-24">
            <div id="vehicle-print-area-mobile" className="bg-white shadow-xl p-6 w-full max-w-[210mm] min-h-[297mm] text-black border border-gray-200 print:shadow-none print:border-none print:w-full print:max-w-none origin-top scale-[0.9]" style={{ fontFamily: '"Malgun Gothic", "Dotum", sans-serif' }}>
                <h1 className="text-3xl font-extrabold text-center mb-6 tracking-widest bg-gray-100 py-2 border-b-2 border-black print:bg-transparent text-black">차 량 거 래 명 세 서 <span className="text-lg ml-2 font-normal">({parseInt(startDate.slice(5,7))}월)</span></h1>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex-1 flex justify-center items-center h-full"><h2 className="text-3xl font-bold tracking-tighter">차량번호 {selectedVehicleNo === '전체' ? '전체 차량' : selectedVehicleNo}</h2></div>
                    <div className="w-[55%]">
                        <div className="text-right mb-1 text-lg font-bold">장 국 용 귀하</div>
                        <table className="w-full border-collapse border-2 border-black text-xs"><tbody><tr><td className="border border-black bg-gray-100 text-center p-1 w-16 print:bg-gray-100">등록번호</td><td className="border border-black p-1 text-center font-bold" colSpan={3}>406-81-64763</td></tr><tr><td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">상 호</td><td className="border border-black p-1 text-center">(주)베라카</td><td className="border border-black bg-gray-100 text-center p-1 w-12 print:bg-gray-100">성 명</td><td className="border border-black p-1 text-center">장국용</td></tr><tr><td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">주 소</td><td className="border border-black p-1 text-center" colSpan={3}>포항시 남구 연일읍 새천년대로 202. 2층</td></tr><tr><td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">업 태</td><td className="border border-black p-1 text-center">도매및소매업</td><td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">종 목</td><td className="border border-black p-1 text-center">골재</td></tr></tbody></table>
                    </div>
                </div>
                <div className="flex border-2 border-black mb-1 text-sm"><div className="w-1/4 border-r border-black bg-gray-50 p-1 font-bold text-center flex flex-col justify-center print:bg-gray-100"><span>공급가액</span><span>세 액</span></div><div className="w-1/4 border-r border-black p-1 text-right flex flex-col justify-center px-2 font-bold"><span>{totalSupply.toLocaleString()}</span><span>{totalTax.toLocaleString()}</span></div><div className="w-1/4 border-r border-black bg-gray-100 p-1 font-bold text-center flex items-center justify-center text-lg print:bg-gray-100">청구 금액</div><div className="w-1/4 p-1 text-right flex items-center justify-end px-2 text-xl font-extrabold bg-yellow-300 print:bg-transparent">{grandTotal.toLocaleString()}</div></div>
                <div className="w-full mb-1">
                    <table className="w-full border-collapse border border-black text-xs text-center table-fixed">
                        <colgroup><col className="w-20"/><col className="w-24"/><col className="w-24"/><col className="w-16"/><col className="w-16"/><col className="w-12"/><col className="w-20"/><col className="w-16"/><col className="w-20"/></colgroup>
                        <thead className="bg-gray-100 font-bold print:bg-gray-100"><tr><th className="border border-black py-1">일자</th><th className="border border-black py-1">상차지</th><th className="border border-black py-1">하차지</th><th className="border border-black py-1">품명</th><th className="border border-black py-1">단가</th><th className="border border-black py-1">수량</th><th className="border border-black py-1">공급가액</th><th className="border border-black py-1">세액</th><th className="border border-black py-1">합계금액</th></tr></thead>
                        <tbody>
                            {filteredData.length > 0 ? (filteredData.map((row) => (<tr key={row.id}><td className="border border-black py-0.5">{row.date.split('T')[0].slice(5)}</td><td className="border border-black py-0.5 truncate">{row.origin}</td><td className="border border-black py-0.5 truncate">{row.destination}</td><td className="border border-black py-0.5">{row.item}</td><td className="border border-black py-0.5 text-right px-1">{Number(row.unitPrice).toLocaleString()}</td><td className="border border-black py-0.5 text-right px-1">{row.quantity}</td><td className="border border-black py-0.5 text-right px-1">{Number(row.supplyPrice).toLocaleString()}</td><td className="border border-black py-0.5 text-right px-1">{Number(row.tax).toLocaleString()}</td><td className="border border-black py-0.5 text-right px-1 font-bold">{Number(row.totalAmount).toLocaleString()}</td></tr>))) : (<tr><td colSpan={9} className="border border-black py-10 text-center text-gray-500">기간 내 거래 내역이 없습니다.</td></tr>)}
                            {Array.from({ length: Math.max(0, 15 - filteredData.length) }).map((_, i) => (<tr key={`empty-${i}`}><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td></tr>))}
                        </tbody>
                        <tfoot className="font-bold border-t-2 border-black"><tr className="bg-yellow-300 print:bg-transparent"><td className="border border-black py-1" colSpan={6}>매 출 합 계</td><td className="border border-black py-1 text-right px-1">{totalSupply.toLocaleString()}</td><td className="border border-black py-1 text-right px-1">{totalTax.toLocaleString()}</td><td className="border border-black py-1 text-right px-1 text-base">{grandTotal.toLocaleString()}</td></tr><tr className="text-red-600"><td className="border border-black py-1" colSpan={6}>5% 공제금 (수수료+부가세)</td><td className="border border-black py-1 text-right px-1">{commissionSupply.toLocaleString()}</td><td className="border border-black py-1 text-right px-1">{commissionTax.toLocaleString()}</td><td className="border border-black py-1 text-right px-1">- {deductionTotal.toLocaleString()}</td></tr></tfoot>
                    </table>
                </div>
                <div className="flex justify-end mt-4">
                    <table className="w-[300px] border-collapse border border-black text-sm bg-gray-50 print:bg-transparent"><tbody><tr><td className="border border-black p-1 text-center font-bold bg-gray-100 print:bg-gray-100">청구금액</td><td className="border border-black p-1 text-right px-2 font-bold w-32">{grandTotal.toLocaleString()}</td></tr><tr><td className="border border-black p-1 text-center">수 수 료</td><td className="border border-black p-1 text-right px-2">{commissionSupply.toLocaleString()}</td></tr><tr><td className="border border-black p-1 text-center">수수료세액</td><td className="border border-black p-1 text-right px-2">{commissionTax.toLocaleString()}</td></tr><tr className="border-t-2 border-black"><td className="border border-black p-2 text-center font-extrabold bg-yellow-100 print:bg-transparent">지 급 액</td><td className="border border-black p-2 text-right px-2 text-lg font-extrabold text-red-600 underline">{finalPayment.toLocaleString()}</td></tr></tbody></table>
                </div>
                <div className="mt-8 text-center pb-4"><p className="text-sm text-gray-500 mb-6">위와 같이 거래하였음을 확인합니다.</p><div className="text-xl font-bold tracking-widest inline-block">(주) 베 라 카 <span className="text-gray-300 text-sm font-normal ml-2">(인)</span></div></div>
            </div>
        </div>
        
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
            <button onClick={handleDownloadExcel} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold shadow-sm flex items-center justify-center gap-2"><FileSpreadsheet className="w-5 h-5" /> 엑셀</button>
            <button onClick={handleCopyImage} className="flex-1 bg-blue-50 text-blue-700 border border-blue-200 font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2">{isCopied ? <Check className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />} 이미지</button>
        </div>
      </div>

      {/* 💻 PC: 분할 화면 (항상 표시 - 모바일 검색창 절대 안 뜸) */}
      <div className="hidden md:flex flex-1 h-full overflow-hidden">
        <div className="flex-1 overflow-auto bg-gray-50 flex justify-center items-start pt-8 pb-10">
            
            {/* PC용 명세서 본문 (모바일과 동일한 코드지만 별도 렌더링) */}
            <div id="vehicle-print-area" className="bg-white shadow-xl p-6 w-full max-w-[210mm] min-h-[297mm] text-black border border-gray-200 print:shadow-none print:border-none print:w-full print:max-w-none origin-top scale-[0.9] md:scale-100" style={{ fontFamily: '"Malgun Gothic", "Dotum", sans-serif' }}>
                <h1 className="text-3xl font-extrabold text-center mb-6 tracking-widest bg-gray-100 py-2 border-b-2 border-black print:bg-transparent text-black">차 량 거 래 명 세 서 <span className="text-lg ml-2 font-normal">({parseInt(startDate.slice(5,7))}월)</span></h1>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex-1 flex justify-center items-center h-full"><h2 className="text-3xl font-bold tracking-tighter">차량번호 {selectedVehicleNo === '전체' ? '전체 차량' : selectedVehicleNo}</h2></div>
                    <div className="w-[55%]">
                        <div className="text-right mb-1 text-lg font-bold">장 국 용 귀하</div>
                        <table className="w-full border-collapse border-2 border-black text-xs"><tbody><tr><td className="border border-black bg-gray-100 text-center p-1 w-16 print:bg-gray-100">등록번호</td><td className="border border-black p-1 text-center font-bold" colSpan={3}>406-81-64763</td></tr><tr><td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">상 호</td><td className="border border-black p-1 text-center">(주)베라카</td><td className="border border-black bg-gray-100 text-center p-1 w-12 print:bg-gray-100">성 명</td><td className="border border-black p-1 text-center">장국용</td></tr><tr><td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">주 소</td><td className="border border-black p-1 text-center" colSpan={3}>포항시 남구 연일읍 새천년대로 202. 2층</td></tr><tr><td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">업 태</td><td className="border border-black p-1 text-center">도매및소매업</td><td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">종 목</td><td className="border border-black p-1 text-center">골재</td></tr></tbody></table>
                    </div>
                </div>
                <div className="flex border-2 border-black mb-1 text-sm"><div className="w-1/4 border-r border-black bg-gray-50 p-1 font-bold text-center flex flex-col justify-center print:bg-gray-100"><span>공급가액</span><span>세 액</span></div><div className="w-1/4 border-r border-black p-1 text-right flex flex-col justify-center px-2 font-bold"><span>{totalSupply.toLocaleString()}</span><span>{totalTax.toLocaleString()}</span></div><div className="w-1/4 border-r border-black bg-gray-100 p-1 font-bold text-center flex items-center justify-center text-lg print:bg-gray-100">청구 금액</div><div className="w-1/4 p-1 text-right flex items-center justify-end px-2 text-xl font-extrabold bg-yellow-300 print:bg-transparent">{grandTotal.toLocaleString()}</div></div>
                <div className="w-full mb-1">
                    <table className="w-full border-collapse border border-black text-xs text-center table-fixed">
                        <colgroup><col className="w-20"/><col className="w-24"/><col className="w-24"/><col className="w-16"/><col className="w-16"/><col className="w-12"/><col className="w-20"/><col className="w-16"/><col className="w-20"/></colgroup>
                        <thead className="bg-gray-100 font-bold print:bg-gray-100"><tr><th className="border border-black py-1">일자</th><th className="border border-black py-1">상차지</th><th className="border border-black py-1">하차지</th><th className="border border-black py-1">품명</th><th className="border border-black py-1">단가</th><th className="border border-black py-1">수량</th><th className="border border-black py-1">공급가액</th><th className="border border-black py-1">세액</th><th className="border border-black py-1">합계금액</th></tr></thead>
                        <tbody>
                            {filteredData.length > 0 ? (filteredData.map((row) => (<tr key={row.id}><td className="border border-black py-0.5">{row.date.split('T')[0].slice(5)}</td><td className="border border-black py-0.5 truncate">{row.origin}</td><td className="border border-black py-0.5 truncate">{row.destination}</td><td className="border border-black py-0.5">{row.item}</td><td className="border border-black py-0.5 text-right px-1">{Number(row.unitPrice).toLocaleString()}</td><td className="border border-black py-0.5 text-right px-1">{row.quantity}</td><td className="border border-black py-0.5 text-right px-1">{Number(row.supplyPrice).toLocaleString()}</td><td className="border border-black py-0.5 text-right px-1">{Number(row.tax).toLocaleString()}</td><td className="border border-black py-0.5 text-right px-1 font-bold">{Number(row.totalAmount).toLocaleString()}</td></tr>))) : (<tr><td colSpan={9} className="border border-black py-10 text-center text-gray-500">기간 내 거래 내역이 없습니다.</td></tr>)}
                            {Array.from({ length: Math.max(0, 15 - filteredData.length) }).map((_, i) => (<tr key={`empty-${i}`}><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td></tr>))}
                        </tbody>
                        <tfoot className="font-bold border-t-2 border-black"><tr className="bg-yellow-300 print:bg-transparent"><td className="border border-black py-1" colSpan={6}>매 출 합 계</td><td className="border border-black py-1 text-right px-1">{totalSupply.toLocaleString()}</td><td className="border border-black py-1 text-right px-1">{totalTax.toLocaleString()}</td><td className="border border-black py-1 text-right px-1 text-base">{grandTotal.toLocaleString()}</td></tr><tr className="text-red-600"><td className="border border-black py-1" colSpan={6}>5% 공제금 (수수료+부가세)</td><td className="border border-black py-1 text-right px-1">{commissionSupply.toLocaleString()}</td><td className="border border-black py-1 text-right px-1">{commissionTax.toLocaleString()}</td><td className="border border-black py-1 text-right px-1">- {deductionTotal.toLocaleString()}</td></tr></tfoot>
                    </table>
                </div>
                <div className="flex justify-end mt-4">
                    <table className="w-[300px] border-collapse border border-black text-sm bg-gray-50 print:bg-transparent"><tbody><tr><td className="border border-black p-1 text-center font-bold bg-gray-100 print:bg-gray-100">청구금액</td><td className="border border-black p-1 text-right px-2 font-bold w-32">{grandTotal.toLocaleString()}</td></tr><tr><td className="border border-black p-1 text-center">수 수 료</td><td className="border border-black p-1 text-right px-2">{commissionSupply.toLocaleString()}</td></tr><tr><td className="border border-black p-1 text-center">수수료세액</td><td className="border border-black p-1 text-right px-2">{commissionTax.toLocaleString()}</td></tr><tr className="border-t-2 border-black"><td className="border border-black p-2 text-center font-extrabold bg-yellow-100 print:bg-transparent">지 급 액</td><td className="border border-black p-2 text-right px-2 text-lg font-extrabold text-red-600 underline">{finalPayment.toLocaleString()}</td></tr></tbody></table>
                </div>
                <div className="mt-8 text-center pb-4"><p className="text-sm text-gray-500 mb-6">위와 같이 거래하였음을 확인합니다.</p><div className="text-xl font-bold tracking-widest inline-block">(주) 베 라 카 <span className="text-gray-300 text-sm font-normal ml-2">(인)</span></div></div>
            </div>

        </div>
        <div className="w-80 bg-white border-l p-6 shadow-xl z-20 flex flex-col">
            <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-4"><Search className="w-5 h-5 text-blue-600" /> 내역서 설정</h2>
            <div className="space-y-6 flex-1">
                <div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">조회 기간</label><div className="flex flex-col gap-2"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold" /><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold" /></div></div>
                {!isVehicleUser && (<div className="space-y-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">차량 선택</label><select value={selectedVehicleNo} onChange={(e) => setSelectedVehicleNo(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold text-blue-600"><option value="전체">전체 차량</option>{vehicles.map((v) => (<option key={v.id} value={v.vehicleNo}>{v.vehicleNo} ({v.ownerName})</option>))}</select></div>)}
            </div>
            <div className="space-y-3 mt-auto">
                <button onClick={handleDownloadExcel} className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"><FileSpreadsheet className="w-5 h-5" /> 엑셀로 다운로드</button>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleCopyImage} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 border border-blue-100 font-bold py-3 rounded-xl hover:bg-blue-100 transition-colors">{isCopied ? '복사됨' : '이미지 복사'}</button>
                    <button onClick={handlePrint} className="flex items-center justify-center gap-2 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition-colors"><Printer className="w-5 h-5" /> 인쇄</button>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
}