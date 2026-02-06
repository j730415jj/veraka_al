import React, { useState, useMemo, useEffect } from 'react';
import { Search, Printer, FileSpreadsheet, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { Operation, Vehicle } from '../types';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas'; // 🔥 이미지 복사 기능용

interface Props {
  operations: Operation[];
  vehicles: Vehicle[];
}

export default function VehicleTransactionStatementNew({ operations, vehicles }: Props) {
  // 1. 날짜 초기값 설정
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  // 2. 상태 관리
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [selectedVehicleNo, setSelectedVehicleNo] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // 초기 차량 선택
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleNo) {
      setSelectedVehicleNo(vehicles[0].vehicleNo);
    }
  }, [vehicles, selectedVehicleNo]);

  // 3. 데이터 필터링
  const filteredData = useMemo(() => {
    return operations.filter(op => {
      if (!op.date) return false;
      const opDate = op.date.split('T')[0];
      const isDateMatch = opDate >= startDate && opDate <= endDate;
      const isVehicleMatch = selectedVehicleNo === '전체' || op.vehicleNo === selectedVehicleNo;
      return isDateMatch && isVehicleMatch;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [operations, startDate, endDate, selectedVehicleNo]);

  // 4. 합계 계산
  const totalQty = filteredData.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalSupply = filteredData.reduce((sum, item) => sum + (Number(item.supplyPrice) || 0), 0);
  const totalTax = filteredData.reduce((sum, item) => sum + (Number(item.tax) || 0), 0);
  const grandTotal = filteredData.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

  // 5. 공제액 계산 (5%)
  const deductionTotal = Math.floor(grandTotal * 0.05);
  const commissionSupply = Math.floor(deductionTotal / 1.1);
  const commissionTax = deductionTotal - commissionSupply;
  const finalPayment = grandTotal - deductionTotal;

  // 🔥 [수정] 엑셀 다운로드 (진짜 기능 구현)
  const handleDownloadExcel = () => {
    if (filteredData.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    const excelData = filteredData.map(row => ({
      '일자': row.date.split('T')[0],
      '상차지': row.origin,
      '하차지': row.destination,
      '품명': row.item,
      '단가': Number(row.unitPrice),
      '수량': Number(row.quantity),
      '공급가액': Number(row.supplyPrice),
      '세액': Number(row.tax),
      '합계금액': Number(row.totalAmount)
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 15 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "차량거래내역");

    const safeVehicleNo = selectedVehicleNo.replace(/[\/\\?%*:|"<>]/g, '-');
    const fileName = `${safeVehicleNo}_차량거래내역서_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 🔥 [수정] 이미지 복사 기능 (html2canvas)
  const handleCopyImage = async () => {
    const element = document.getElementById('vehicle-print-area');
    if (!element) {
        alert('캡처할 영역을 찾을 수 없습니다.');
        return;
    }
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
                .catch(err => {
                    console.error(err);
                    alert("이미지 복사 실패 (브라우저 보안 설정 확인)");
                    setIsCopied(false);
                });
            }
        });
    } catch (err) {
        console.error(err);
        alert("이미지 생성 오류");
        setIsCopied(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col xl:flex-row gap-4 h-full bg-gray-100 p-2 overflow-hidden print:bg-white print:p-0">
      
      {/* 📄 왼쪽: 내역서 (캡처 영역 id="vehicle-print-area" 추가) */}
      <div className="flex-1 overflow-auto bg-gray-50 flex justify-center items-start print:overflow-visible print:bg-white print:w-full">
        <div 
          id="vehicle-print-area" // 🔥 캡처 영역 지정
          className="bg-white shadow-lg p-4 w-full max-w-[210mm] min-h-[297mm] text-black border border-gray-300 print:shadow-none print:border-none print:w-full print:max-w-none"
          style={{ fontFamily: '"Malgun Gothic", "Dotum", sans-serif' }}
        >
          {/* 헤더 */}
          <h1 className="text-3xl font-extrabold text-center mb-6 tracking-widest bg-gray-100 py-2 border-b-2 border-black print:bg-transparent text-black">
            차 량 거 래 명 세 서 <span className="text-lg ml-2 font-normal">({parseInt(startDate.slice(5,7))}월)</span>
          </h1>

          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col justify-end h-full">
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
                {/* 빈 행 채우기 */}
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

          {/* 우측 하단 결제 박스 */}
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
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border rounded text-xs" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border rounded text-xs" />
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
              {/* 🔥 [수정] 엑셀로 다운로드 (이름 변경됨) */}
              <button 
                onClick={handleDownloadExcel} 
                className="w-full flex items-center justify-center gap-2 bg-green-700 text-white font-bold py-2 rounded text-xs shadow-sm hover:bg-green-800 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                엑셀로 다운로드
              </button>

              {/* 🔥 [수정] 이미지 복사 버튼 추가 */}
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