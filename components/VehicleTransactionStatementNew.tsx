import React, { useState, useMemo, useEffect } from 'react';
import { Search, Printer, FileSpreadsheet, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { Operation, Vehicle } from '../types';
import html2canvas from 'html2canvas';
// 🔥 [변경] 엑셀 디자인 도구 추가
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Props {
  operations: Operation[];
  vehicles: Vehicle[];
}

export default function VehicleTransactionStatementNew({ operations, vehicles }: Props) {
  // --------------------------------------------------------------------------
  // 1. 날짜 및 상태 초기화
  // --------------------------------------------------------------------------
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [selectedVehicleNo, setSelectedVehicleNo] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // 초기 차량 선택 (목록이 로드되면 첫 번째 차량 자동 선택)
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleNo) {
      setSelectedVehicleNo(vehicles[0].vehicleNo);
    }
  }, [vehicles, selectedVehicleNo]);

  // --------------------------------------------------------------------------
  // 2. 데이터 필터링 및 계산
  // --------------------------------------------------------------------------
  const filteredData = useMemo(() => {
    return operations.filter(op => {
      if (!op.date) return false;
      const opDate = op.date.split('T')[0];
      const isDateMatch = opDate >= startDate && opDate <= endDate;
      const isVehicleMatch = selectedVehicleNo === '전체' || op.vehicleNo === selectedVehicleNo;
      return isDateMatch && isVehicleMatch;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [operations, startDate, endDate, selectedVehicleNo]);

  // 합계 계산
  const totalQty = filteredData.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalSupply = filteredData.reduce((sum, item) => sum + (Number(item.supplyPrice) || 0), 0);
  const totalTax = filteredData.reduce((sum, item) => sum + (Number(item.tax) || 0), 0);
  const grandTotal = filteredData.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

  // 공제액 계산 (5%)
  const deductionTotal = Math.floor(grandTotal * 0.05);
  const commissionSupply = Math.floor(deductionTotal / 1.1);
  const commissionTax = deductionTotal - commissionSupply;
  const finalPayment = grandTotal - deductionTotal;

  // --------------------------------------------------------------------------
  // 3. 엑셀 다운로드 (ExcelJS 적용 - 디자인 완벽 구현)
  // --------------------------------------------------------------------------
  const handleDownloadExcel = async () => {
    if (filteredData.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    // 워크북 생성
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('차량거래내역');

    // 컬럼 너비 설정
    sheet.columns = [
      { width: 15 }, // A 일자
      { width: 15 }, // B 상차지
      { width: 15 }, // C 하차지
      { width: 12 }, // D 품명
      { width: 12 }, // E 단가
      { width: 8 },  // F 수량
      { width: 15 }, // G 공급가
      { width: 12 }, // H 세액
      { width: 18 }, // I 합계
    ];

    // [제목]
    const titleRow = sheet.addRow([`차 량 거 래 명 세 서 (${parseInt(startDate.slice(5, 7))}월)`]);
    sheet.mergeCells('A1:I1');
    titleRow.height = 35;
    titleRow.font = { name: '맑은 고딕', size: 20, bold: true };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };

    sheet.addRow([]); // 빈 줄

    // [상단 정보 박스]
    // 왼쪽: 차량번호 (병합)
    sheet.getCell('A3').value = `차량번호: ${selectedVehicleNo}`;
    sheet.mergeCells('A3:E6');
    const vehicleInfoCell = sheet.getCell('A3');
    vehicleInfoCell.font = { size: 16, bold: true };
    vehicleInfoCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // 오른쪽: 사업자 정보 배치
    sheet.getCell('F3').value = '등록번호'; sheet.getCell('G3').value = '406-81-64763'; sheet.mergeCells('G3:I3');
    sheet.getCell('F4').value = '상호'; sheet.getCell('G4').value = '(주)베라카'; 
    sheet.getCell('H4').value = '성명'; sheet.getCell('I4').value = '장국용';
    sheet.getCell('F5').value = '주소'; sheet.getCell('G5').value = '포항시 남구 연일읍 새천년대로 202. 2층'; sheet.mergeCells('G5:I5');
    sheet.getCell('F6').value = '업태'; sheet.getCell('G6').value = '도매및소매업'; 
    sheet.getCell('H6').value = '종목'; sheet.getCell('I6').value = '골재';

    // 상단 정보 테두리 및 스타일 적용
    for(let r=3; r<=6; r++) {
        for(let c=6; c<=9; c++) {
            const cell = sheet.getCell(r, c);
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            // 항목명(F열, H열) 회색 배경
            if (c === 6 || c === 8) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
        }
    }

    sheet.addRow([]); // 빈 줄

    // [중간 요약 바]
    const summaryRow = sheet.addRow(['공급가액', totalSupply.toLocaleString(), '', '세액', totalTax.toLocaleString(), '청구금액', '', '', grandTotal.toLocaleString()]);
    summaryRow.height = 30;
    
    // 스타일 적용 (회색 배경, 노란색 배경)
    ['A8', 'D8', 'F8'].forEach(key => {
        const cell = sheet.getCell(key);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } }; // 회색
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    
    // 합계 금액 노란색 강조
    const totalCell = sheet.getCell('I8');
    totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // 노란색
    totalCell.font = { size: 14, bold: true };
    
    // 병합 및 테두리
    sheet.mergeCells('B8:C8'); sheet.mergeCells('F8:H8');
    ['A8','B8','C8','D8','E8','F8','G8','H8','I8'].forEach(k => {
        sheet.getCell(k).border = { top: {style:'medium'}, bottom: {style:'medium'} };
    });

    sheet.addRow([]); // 빈 줄

    // [메인 표 헤더]
    const headerRow = sheet.addRow(['일자', '상차지', '하차지', '품명', '단가', '수량', '공급가액', '세액', '합계금액']);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } }; // 회색 배경
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    // [데이터 루프]
    filteredData.forEach(row => {
        const r = sheet.addRow([
            row.date.split('T')[0],
            row.origin,
            row.destination,
            row.item,
            Number(row.unitPrice),
            Number(row.quantity),
            Number(row.supplyPrice),
            Number(row.tax),
            Number(row.totalAmount)
        ]);
        
        r.eachCell((cell, colNumber) => {
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            if ([5, 6, 7, 8, 9].includes(colNumber)) { // 숫자 컬럼 우측 정렬
                cell.alignment = { horizontal: 'right' };
                cell.numFmt = '#,##0';
            } else {
                cell.alignment = { horizontal: 'center' };
            }
        });
    });

    // 빈 줄 채우기 (최소 15줄 유지)
    const emptyRows = Math.max(0, 15 - filteredData.length);
    for(let i=0; i<emptyRows; i++) {
        const r = sheet.addRow(['', '', '', '', '', '', '', '', '']);
        r.eachCell(cell => { 
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; 
        });
    }

    // [하단 합계] (노란색 배경)
    const footerRow = sheet.addRow(['매출 합계', '', '', '', '', totalQty, totalSupply, totalTax, grandTotal]);
    sheet.mergeCells(`A${footerRow.number}:E${footerRow.number}`);
    footerRow.height = 25;
    footerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // 노란색
        cell.font = { bold: true };
        cell.border = { top: {style:'medium'}, left: {style:'thin'}, bottom: {style:'medium'}, right: {style:'thin'} };
        cell.numFmt = '#,##0';
    });
    footerRow.getCell(1).alignment = { horizontal: 'center' };

    // [공제액] (빨간 글씨)
    const deductionRow = sheet.addRow(['5% 공제 (수수료+부가세)', '', '', '', '', '', commissionSupply, commissionTax, -deductionTotal]);
    sheet.mergeCells(`A${deductionRow.number}:F${deductionRow.number}`);
    deductionRow.eachCell(cell => {
        cell.font = { color: { argb: 'FFFF0000' }, bold: true }; // 빨간색
        cell.alignment = { horizontal: 'right' };
        cell.numFmt = '#,##0';
    });
    deductionRow.getCell(1).alignment = { horizontal: 'center' };

    // [실 지급액]
    sheet.addRow([]);
    const finalRow = sheet.addRow(['', '', '', '', '', '실 지급액', '', '', finalPayment]);
    sheet.mergeCells(`F${finalRow.number}:H${finalRow.number}`);
    
    // 스타일: 라벨 회색 배경, 금액 빨간색+밑줄
    const labelCell = finalRow.getCell(6);
    labelCell.font = { bold: true, size: 12 };
    labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    
    const amountCell = finalRow.getCell(9);
    amountCell.font = { bold: true, size: 14, color: { argb: 'FFFF0000' }, underline: true };
    amountCell.numFmt = '#,##0';
    amountCell.alignment = { horizontal: 'right' };

    // 파일 저장
    const buffer = await workbook.xlsx.writeBuffer();
    const safeVehicleNo = selectedVehicleNo.replace(/[\/\\?%*:|"<>]/g, '-');
    saveAs(new Blob([buffer]), `${safeVehicleNo}_차량거래내역서_${startDate}_${endDate}.xlsx`);
  };

  // --------------------------------------------------------------------------
  // 4. 이미지 복사 기능
  // --------------------------------------------------------------------------
  const handleCopyImage = async () => {
    const element = document.getElementById('vehicle-print-area');
    if (!element) { alert('캡처할 영역을 찾을 수 없습니다.'); return; }
    try {
        setIsCopied(true);
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
        canvas.toBlob((blob) => {
            if (blob) {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                .then(() => {
                    alert("📸 이미지로 복사되었습니다!\n카톡에 붙여넣기(Ctrl+V) 하세요.");
                    setTimeout(() => setIsCopied(false), 2000);
                })
                .catch(() => { alert("이미지 복사 실패"); setIsCopied(false); });
            }
        });
    } catch { alert("이미지 생성 오류"); setIsCopied(false); }
  };

  const handlePrint = () => { window.print(); };

  return (
    <div className="flex flex-col xl:flex-row gap-4 h-full bg-gray-100 p-2 overflow-hidden print:bg-white print:p-0">
      
      {/* 📄 왼쪽: 내역서 화면 (A4 스타일) */}
      <div className="flex-1 overflow-auto bg-gray-50 flex justify-center items-start print:overflow-visible print:bg-white print:w-full">
        <div id="vehicle-print-area" className="bg-white shadow-lg p-4 w-full max-w-[210mm] min-h-[297mm] text-black border border-gray-300 print:shadow-none print:border-none print:w-full print:max-w-none" style={{ fontFamily: '"Malgun Gothic", "Dotum", sans-serif' }}>
          
          <h1 className="text-3xl font-extrabold text-center mb-6 tracking-widest bg-gray-100 py-2 border-b-2 border-black print:bg-transparent text-black">
            차 량 거 래 명 세 서 <span className="text-lg ml-2 font-normal">({parseInt(startDate.slice(5,7))}월)</span>
          </h1>

          {/* 🔥 [수정됨] 헤더 레이아웃: flex-1과 justify-center를 사용하여 '차량번호'를 왼쪽 빈 공간의 중앙에 배치 */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1 flex justify-center items-center h-full">
              <h2 className="text-3xl font-bold tracking-tighter">차량번호 {selectedVehicleNo}</h2>
            </div>
            <div className="w-[55%]">
               <div className="text-right mb-1 text-lg font-bold">장 국 용 귀하</div>
               <table className="w-full border-collapse border-2 border-black text-xs">
                <tbody>
                  <tr>
                    <td className="border border-black bg-gray-100 text-center p-1 w-16 print:bg-gray-100">등록번호</td>
                    <td className="border border-black p-1 text-center font-bold" colSpan={3}>406-81-64763</td>
                  </tr>
                  <tr>
                    <td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">상 호</td>
                    <td className="border border-black p-1 text-center">(주)베라카</td>
                    <td className="border border-black bg-gray-100 text-center p-1 w-12 print:bg-gray-100">성 명</td>
                    <td className="border border-black p-1 text-center">장국용</td>
                  </tr>
                  <tr>
                    <td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">주 소</td>
                    <td className="border border-black p-1 text-center" colSpan={3}>포항시 남구 연일읍 새천년대로 202. 2층</td>
                  </tr>
                  <tr>
                    <td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">업 태</td>
                    <td className="border border-black p-1 text-center">도매및소매업</td>
                    <td className="border border-black bg-gray-100 text-center p-1 print:bg-gray-100">종 목</td>
                    <td className="border border-black p-1 text-center">골재</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 상단 요약 바 */}
          <div className="flex border-2 border-black mb-1 text-sm">
            <div className="w-1/4 border-r border-black bg-gray-50 p-1 font-bold text-center flex flex-col justify-center print:bg-gray-100">
              <span>공급가액</span><span>세 액</span>
            </div>
            <div className="w-1/4 border-r border-black p-1 text-right flex flex-col justify-center px-2 font-bold">
              <span>{totalSupply.toLocaleString()}</span>
              <span>{totalTax.toLocaleString()}</span>
            </div>
            <div className="w-1/4 border-r border-black bg-gray-100 p-1 font-bold text-center flex items-center justify-center text-lg print:bg-gray-100">
              청구 금액
            </div>
            <div className="w-1/4 p-1 text-right flex items-center justify-end px-2 text-xl font-extrabold bg-yellow-300 print:bg-transparent">
              {grandTotal.toLocaleString()}
            </div>
          </div>

          {/* 메인 테이블 */}
          <div className="w-full mb-1">
            <table className="w-full border-collapse border border-black text-xs text-center table-fixed">
              <colgroup>
                <col className="w-20" /><col className="w-24" /><col className="w-24" /><col className="w-16" />
                <col className="w-16" /><col className="w-12" /><col className="w-20" /><col className="w-16" /><col className="w-20" />
              </colgroup>
              <thead className="bg-gray-100 font-bold print:bg-gray-100">
                <tr>
                  <th className="border border-black py-1">일자</th>
                  <th className="border border-black py-1">상차지</th>
                  <th className="border border-black py-1">하차지</th>
                  <th className="border border-black py-1">품명</th>
                  <th className="border border-black py-1">단가</th>
                  <th className="border border-black py-1">수량</th>
                  <th className="border border-black py-1">공급가액</th>
                  <th className="border border-black py-1">세액</th>
                  <th className="border border-black py-1">합계금액</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-black py-0.5">{row.date.split('T')[0].slice(5)}</td>
                      <td className="border border-black py-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{row.origin}</td>
                      <td className="border border-black py-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{row.destination}</td>
                      <td className="border border-black py-0.5">{row.item}</td>
                      <td className="border border-black py-0.5 text-right px-1">{Number(row.unitPrice).toLocaleString()}</td>
                      <td className="border border-black py-0.5 text-right px-1">{row.quantity}</td>
                      <td className="border border-black py-0.5 text-right px-1">{Number(row.supplyPrice).toLocaleString()}</td>
                      <td className="border border-black py-0.5 text-right px-1">{Number(row.tax).toLocaleString()}</td>
                      <td className="border border-black py-0.5 text-right px-1 font-bold">{Number(row.totalAmount).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={9} className="border border-black py-10 text-center text-gray-500">기간 내 거래 내역이 없습니다.</td></tr>
                )}
                {/* 빈 행 채우기 (모양 유지용) */}
                {Array.from({ length: Math.max(0, 15 - filteredData.length) }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td>
                    <td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td>
                    <td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td>
                    <td className="border border-black py-2">&nbsp;</td><td className="border border-black py-2">&nbsp;</td>
                    <td className="border border-black py-2">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="font-bold border-t-2 border-black">
                <tr className="bg-yellow-300 print:bg-transparent">
                  <td className="border border-black py-1" colSpan={6}>매 출 합 계</td>
                  <td className="border border-black py-1 text-right px-1">{totalSupply.toLocaleString()}</td>
                  <td className="border border-black py-1 text-right px-1">{totalTax.toLocaleString()}</td>
                  <td className="border border-black py-1 text-right px-1 text-base">{grandTotal.toLocaleString()}</td>
                </tr>
                <tr className="text-red-600">
                  <td className="border border-black py-1" colSpan={6}>5% 공제금 (수수료+부가세)</td>
                  <td className="border border-black py-1 text-right px-1">{commissionSupply.toLocaleString()}</td>
                  <td className="border border-black py-1 text-right px-1">{commissionTax.toLocaleString()}</td>
                  <td className="border border-black py-1 text-right px-1">- {deductionTotal.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 우측 하단 결제 박스 (수수료 상세) */}
          <div className="flex justify-end mt-4">
             <table className="w-[300px] border-collapse border border-black text-sm bg-gray-50 print:bg-transparent">
              <tbody>
                <tr>
                    <td className="border border-black p-1 text-center font-bold bg-gray-100 print:bg-gray-100">청구금액</td>
                    <td className="border border-black p-1 text-right px-2 font-bold w-32">{grandTotal.toLocaleString()}</td>
                </tr>
                <tr>
                    <td className="border border-black p-1 text-center">수 수 료</td>
                    <td className="border border-black p-1 text-right px-2">{commissionSupply.toLocaleString()}</td>
                </tr>
                <tr>
                    <td className="border border-black p-1 text-center">수수료세액</td>
                    <td className="border border-black p-1 text-right px-2">{commissionTax.toLocaleString()}</td>
                </tr>
                <tr className="border-t-2 border-black">
                    <td className="border border-black p-2 text-center font-extrabold bg-yellow-100 print:bg-transparent">지 급 액</td>
                    <td className="border border-black p-2 text-right px-2 text-lg font-extrabold text-red-600 underline">
                        {finalPayment.toLocaleString()}
                    </td>
                </tr>
              </tbody>
            </table>
          </div>
          
           {/* 하단 날인 */}
           <div className="mt-8 text-center pb-4">
            <p className="text-sm text-gray-500 mb-6">위와 같이 거래하였음을 확인합니다.</p>
            <div className="text-xl font-bold tracking-widest inline-block">
              (주) 베 라 카 <span className="text-gray-300 text-sm font-normal ml-2">(인)</span>
            </div>
          </div>

        </div>
      </div>

      {/* 🛠 오른쪽: 컨트롤 패널 */}
      <div className="w-full xl:w-72 flex-shrink-0 print:hidden">
        <div className="bg-white rounded-lg shadow-md p-4 sticky top-4 border border-gray-200">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2 border-b pb-2">
            <Search className="w-4 h-4 text-blue-600" />
            내역서 설정
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">조회 기간</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="w-full p-2 border rounded text-xs" 
              />
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="w-full p-2 border rounded text-xs" 
              />
            </div>
            <div className="space-y-2">
               <label className="text-xs font-bold text-gray-700">차량 선택</label>
               <select 
                value={selectedVehicleNo} 
                onChange={(e) => setSelectedVehicleNo(e.target.value)} 
                className="w-full p-2 border rounded text-base font-bold text-blue-800"
              >
                <option value="전체">전체 차량</option>
                {vehicles.map((v) => (
                    <option key={v.id} value={v.vehicleNo}>
                        {v.vehicleNo} ({v.ownerName})
                    </option>
                ))}
              </select>
            </div>

            <hr className="border-gray-200 my-2" />
            
            <div className="space-y-2">
              <button 
                onClick={handleDownloadExcel} 
                className="w-full flex items-center justify-center gap-2 bg-green-700 text-white font-bold py-2 rounded text-xs shadow-sm hover:bg-green-800 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                엑셀로 다운로드
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleCopyImage} 
                  className={`flex items-center justify-center gap-1 font-bold py-2 rounded text-xs border transition-colors shadow-sm ${isCopied ? 'bg-blue-800 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                >
                  {isCopied ? <Check className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                  {isCopied ? '복사됨!' : '이미지 복사'}
                </button>
                <button 
                  onClick={handlePrint} 
                  className="flex items-center justify-center gap-1 bg-gray-600 text-white font-bold py-2 rounded text-xs shadow-sm hover:bg-gray-700 transition-colors"
                >
                  <Printer className="w-3 h-3" />
                  인쇄
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}