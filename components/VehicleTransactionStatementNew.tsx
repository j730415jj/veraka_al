import React, { useState } from 'react';
import { Search, Printer, Download, CheckCircle, FileSpreadsheet, Copy, Check } from 'lucide-react';

// 데이터 타입 정의
interface Transaction {
  id: string;
  date: string;
  vehicleNo: string;
  unitPrice: number;
  origin: string; 
  destination: string; 
  item: string;
  quantity: number;
  supplyPrice: number;
  tax: number;
  total: number;
}

// 샘플 데이터
const SAMPLE_DATA: Transaction[] = [
  { id: '1', date: '2026-01-27', vehicleNo: '5465', unitPrice: 3500, origin: '부강', destination: '경주강동', item: '습슬러지', quantity: 30, supplyPrice: 105000, tax: 10500, total: 115500 },
  { id: '2', date: '2026-01-25', vehicleNo: '5465', unitPrice: 4500, origin: '포항현대', destination: '광양', item: '슈레더', quantity: 25, supplyPrice: 112500, tax: 11250, total: 123750 },
  { id: '3', date: '2026-01-25', vehicleNo: '5465', unitPrice: 3500, origin: '부강', destination: '경주강동', item: '습슬러지', quantity: 33, supplyPrice: 115500, tax: 11550, total: 127050 },
  { id: '4', date: '2026-01-24', vehicleNo: '5465', unitPrice: 3500, origin: '부강', destination: '경주강동', item: '습슬러지', quantity: 30, supplyPrice: 105000, tax: 10500, total: 115500 },
  { id: '5', date: '2026-01-23', vehicleNo: '5465', unitPrice: 3500, origin: '부강', destination: '경주강동', item: '습슬러지', quantity: 10, supplyPrice: 35000, tax: 3500, total: 38500 },
  { id: '6', date: '2026-01-21', vehicleNo: '5465', unitPrice: 4500, origin: '포항현대', destination: '광양', item: '슈레더', quantity: 30, supplyPrice: 135000, tax: 13500, total: 148500 },
  { id: '7', date: '2026-01-21', vehicleNo: '5465', unitPrice: 4500, origin: '포항현대', destination: '광양', item: '슈레더', quantity: 10, supplyPrice: 45000, tax: 4500, total: 49500 },
  { id: '8', date: '2026-01-21', vehicleNo: '5465', unitPrice: 3500, origin: '부강', destination: '경주강동', item: '습슬러지', quantity: 25, supplyPrice: 87500, tax: 8750, total: 96250 },
  { id: '9', date: '2026-01-20', vehicleNo: '5465', unitPrice: 3500, origin: '부강', destination: '경주강동', item: '습슬러지', quantity: 23, supplyPrice: 80500, tax: 8050, total: 88550 },
  { id: '10', date: '2026-01-20', vehicleNo: '5465', unitPrice: 4500, origin: '포항현대', destination: '광양', item: '슈레더', quantity: 30, supplyPrice: 135000, tax: 13500, total: 148500 },
];

export default function VehicleTransactionStatementNew() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-02-27');
  const [selectedVehicle, setSelectedVehicle] = useState('5465');
  const [viewMode, setViewMode] = useState<'owner' | 'client'>('owner');
  const [isCopied, setIsCopied] = useState(false);

  // 1. 합계 계산
  const totalQty = SAMPLE_DATA.reduce((sum, item) => sum + item.quantity, 0);
  const totalSupply = SAMPLE_DATA.reduce((sum, item) => sum + item.supplyPrice, 0);
  const totalTax = SAMPLE_DATA.reduce((sum, item) => sum + item.tax, 0);
  const grandTotal = SAMPLE_DATA.reduce((sum, item) => sum + item.total, 0);

  // 2. 공제액 계산 (사진처럼 5% 전체 공제)
  const deductionTotal = viewMode === 'owner' ? Math.floor(grandTotal * 0.05) : 0;
  
  // 수수료 내역 역산 (공제액 = 공급가 + 부가세)
  const commissionSupply = Math.floor(deductionTotal / 1.1);
  const commissionTax = deductionTotal - commissionSupply;

  // 3. 최종 지급액
  const finalPayment = grandTotal - deductionTotal;

  // 📥 엑셀 다운로드
  const handleDownloadExcel = () => {
    alert(`[엑셀 다운로드]\n파일명: ${selectedVehicle}_거래내역서.xlsx`);
  };

  // 📋 복사 기능
  const handleCopy = () => {
    const textToCopy = `[${selectedVehicle} 거래명세서]\n합계: ${grandTotal.toLocaleString()}원\n실지급액: ${finalPayment.toLocaleString()}원`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col xl:flex-row gap-4 h-full bg-gray-100 p-2 overflow-hidden">
      {/* 📄 왼쪽: 엑셀 스타일 내역서 (여백 최소화) */}
      <div className="flex-1 overflow-auto bg-gray-50 flex justify-center items-start">
        <div 
          className="bg-white shadow-lg p-6 w-full max-w-[210mm] min-h-[297mm] text-black border border-gray-300"
          style={{ fontFamily: '"Malgun Gothic", "Dotum", sans-serif' }}
        >
          {/* --- 1. 헤더 영역 (엑셀 사진 스타일) --- */}
          {/* 🔥 수정됨: parseInt를 사용하여 '01월' -> '1월'로 표시 */}
          <h1 className="text-3xl font-extrabold text-center mb-6 tracking-widest bg-gray-100 py-2 border-b-2 border-black">
            거 래 명 세 서 ({parseInt(startDate.slice(5,7))}월)
          </h1>

          <div className="flex justify-between items-start mb-4">
            {/* 왼쪽: 차량번호 */}
            <div className="flex flex-col justify-end h-full">
              <h2 className="text-3xl font-bold tracking-tighter">
                차량번호 {selectedVehicle}
              </h2>
            </div>

            {/* 오른쪽: 공급자 정보 (표) */}
            <div className="w-[55%]">
               {/* 수신자 이름 */}
               <div className="text-right mb-1 text-lg font-bold">
                  장 국 용 귀하
               </div>
               <table className="w-full border-collapse border-2 border-black text-xs">
                <tbody>
                  <tr>
                    <td className="border border-black bg-gray-100 text-center p-1 w-16">등록번호</td>
                    <td className="border border-black p-1 text-center font-bold" colSpan={3}>406-81-64763</td>
                  </tr>
                  <tr>
                    <td className="border border-black bg-gray-100 text-center p-1">상 호</td>
                    <td className="border border-black p-1 text-center">(주)베라카</td>
                    <td className="border border-black bg-gray-100 text-center p-1 w-12">성 명</td>
                    <td className="border border-black p-1 text-center">장국용</td>
                  </tr>
                  <tr>
                    <td className="border border-black bg-gray-100 text-center p-1">주 소</td>
                    <td className="border border-black p-1 text-center" colSpan={3}>포항시 남구 연일읍 새천년대로 202. 2층</td>
                  </tr>
                  <tr>
                    <td className="border border-black bg-gray-100 text-center p-1">업 태</td>
                    <td className="border border-black p-1 text-center">도매및소매업</td>
                    <td className="border border-black bg-gray-100 text-center p-1">종 목</td>
                    <td className="border border-black p-1 text-center">골재</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* --- 2. 상단 요약 바 (공급가/세액/청구금액) --- */}
          <div className="flex border-2 border-black mb-1 text-sm">
            <div className="w-1/4 border-r border-black bg-gray-50 p-1 font-bold text-center flex flex-col justify-center">
              <span>공급가액</span>
              <span>세 액</span>
            </div>
            <div className="w-1/4 border-r border-black p-1 text-right flex flex-col justify-center px-2 font-bold">
              <span>{totalSupply.toLocaleString()}</span>
              <span>{totalTax.toLocaleString()}</span>
            </div>
            <div className="w-1/4 border-r border-black bg-gray-100 p-1 font-bold text-center flex items-center justify-center text-lg">
              청구 금액
            </div>
            <div className="w-1/4 p-1 text-right flex items-center justify-end px-2 text-xl font-extrabold bg-yellow-300">
              {grandTotal.toLocaleString()}
            </div>
          </div>


          {/* --- 3. 메인 테이블 (여백 없이 빡빡하게) --- */}
          <div className="w-full mb-1">
            <table className="w-full border-collapse border border-black text-xs text-center table-fixed">
              <colgroup>
                <col className="w-20" /> {/* 일자 */}
                <col className="w-24" /> {/* 상차지 */}
                <col className="w-24" /> {/* 하차지 */}
                <col className="w-16" /> {/* 품명 */}
                <col className="w-16" /> {/* 단가 */}
                <col className="w-12" /> {/* 수량 */}
                <col className="w-20" /> {/* 공급가액 */}
                <col className="w-16" /> {/* 세액 */}
                <col className="w-20" /> {/* 합계 */}
              </colgroup>
              <thead className="bg-gray-100 font-bold">
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
                {SAMPLE_DATA.map((row) => (
                  <tr key={row.id}>
                    <td className="border border-black py-0.5">{row.date}</td>
                    <td className="border border-black py-0.5 whitespace-nowrap overflow-hidden">{row.origin}</td>
                    <td className="border border-black py-0.5 whitespace-nowrap overflow-hidden">{row.destination}</td>
                    <td className="border border-black py-0.5">{row.item}</td>
                    <td className="border border-black py-0.5 text-right px-1">{row.unitPrice.toLocaleString()}</td>
                    <td className="border border-black py-0.5 text-right px-1">{row.quantity}</td>
                    <td className="border border-black py-0.5 text-right px-1">{row.supplyPrice.toLocaleString()}</td>
                    <td className="border border-black py-0.5 text-right px-1">{row.tax.toLocaleString()}</td>
                    <td className="border border-black py-0.5 text-right px-1 font-bold">{row.total.toLocaleString()}</td>
                  </tr>
                ))}
                
                {/* 빈 줄 채우기 (화면 꽉 차게) */}
                {Array.from({ length: 15 }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="border border-black py-2">&nbsp;</td>
                    <td className="border border-black py-2">&nbsp;</td>
                    <td className="border border-black py-2">&nbsp;</td>
                    <td className="border border-black py-2">&nbsp;</td>
                    <td className="border border-black py-2">&nbsp;</td>
                    <td className="border border-black py-2">&nbsp;</td>
                    <td className="border border-black py-2">&nbsp;</td>
                    <td className="border border-black py-2">&nbsp;</td>
                    <td className="border border-black py-2">&nbsp;</td>
                    <td className="border border-black py-2">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
              
              {/* --- 4. 하단 합계 (노란색) --- */}
              <tfoot className="font-bold border-t-2 border-black">
                {/* 1. 매출 합계 */}
                <tr className="bg-yellow-300">
                  <td className="border border-black py-1" colSpan={6}>매 출 합 계</td>
                  <td className="border border-black py-1 text-right px-1">{totalSupply.toLocaleString()}</td>
                  <td className="border border-black py-1 text-right px-1">{totalTax.toLocaleString()}</td>
                  <td className="border border-black py-1 text-right px-1 text-base">{grandTotal.toLocaleString()}</td>
                </tr>
                {/* 2. 5% 공제금 (빨간 글씨) - 차주용일 때만 표시 */}
                {viewMode === 'owner' && (
                  <tr className="text-red-600">
                    <td className="border border-black py-1" colSpan={6}>5% 공제금 (수수료+부가세)</td>
                    <td className="border border-black py-1 text-right px-1">{commissionSupply.toLocaleString()}</td>
                    <td className="border border-black py-1 text-right px-1">{commissionTax.toLocaleString()}</td>
                    <td className="border border-black py-1 text-right px-1">{deductionTotal.toLocaleString()}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {/* --- 5. 최종 결제 박스 (오른쪽 하단) --- */}
          <div className="flex justify-end mt-4">
             {viewMode === 'owner' ? (
                /* 차주용: 수수료 상세 계산 박스 */
                <table className="w-[300px] border-collapse border border-black text-sm bg-gray-50">
                  <tbody>
                    <tr>
                       <td className="border border-black p-1 text-center font-bold bg-gray-100">청구금액</td>
                       <td className="border border-black p-1 text-right px-2 font-bold w-32">{grandTotal.toLocaleString()}</td>
                    </tr>
                    <tr>
                       <td className="border border-black p-1 text-center">수 수 료</td>
                       <td className="border border-black p-1 text-right px-2">{commissionSupply.toLocaleString()}</td>
                    </tr>
                    <tr>
                       <td className="border border-black p-1 text-center">수수료부가세</td>
                       <td className="border border-black p-1 text-right px-2">{commissionTax.toLocaleString()}</td>
                    </tr>
                    <tr className="border-t-2 border-black">
                       <td className="border border-black p-2 text-center font-extrabold bg-yellow-100">지 급 액</td>
                       <td className="border border-black p-2 text-right px-2 text-lg font-extrabold text-red-600 underline">
                          {finalPayment.toLocaleString()}
                       </td>
                    </tr>
                  </tbody>
                </table>
             ) : (
                /* 거래처용: 깔끔하게 총액만 */
                <table className="w-[300px] border-collapse border border-black text-sm">
                  <tbody>
                    <tr className="border-t-2 border-black">
                       <td className="border border-black p-2 text-center font-extrabold bg-blue-100">청 구 금 액</td>
                       <td className="border border-black p-2 text-right px-2 text-lg font-extrabold text-blue-800">
                          {grandTotal.toLocaleString()}
                       </td>
                    </tr>
                  </tbody>
                </table>
             )}
          </div>

        </div>
      </div>

      {/* 🛠 오른쪽: 컨트롤 패널 (여백 없이 꽉 차게) */}
      <div className="w-full xl:w-72 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-md p-4 sticky top-4 border border-gray-200">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2 border-b pb-2">
            <Search className="w-4 h-4 text-blue-600" />
            내역서 설정
          </h2>

          <div className="space-y-4">
            {/* 용도 선택 */}
            <div className="bg-gray-50 p-2 rounded border border-gray-200">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1 mb-2">
                <CheckCircle className="w-3 h-3 text-green-600" />
                출력 용도
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setViewMode('owner')}
                  className={`py-2 px-1 rounded text-xs font-bold transition-all ${
                    viewMode === 'owner' ? 'bg-blue-600 text-white shadow' : 'bg-white border hover:bg-gray-100'
                  }`}
                >
                  차주용 (공제 O)
                </button>
                <button
                  onClick={() => setViewMode('client')}
                  className={`py-2 px-1 rounded text-xs font-bold transition-all ${
                    viewMode === 'client' ? 'bg-green-600 text-white shadow' : 'bg-white border hover:bg-gray-100'
                  }`}
                >
                  거래처용 (공제 X)
                </button>
              </div>
            </div>

            {/* 조회 기간 & 차량 */}
            <div className="space-y-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border rounded text-xs" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border rounded text-xs" />
              <select 
                value={selectedVehicle} 
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full p-2 border rounded text-base font-bold text-blue-800"
              >
                <option value="5465">5465</option>
                <option value="6434">6434</option>
                <option value="8428">8428</option>
              </select>
            </div>

            {/* 조회 버튼 */}
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded shadow transition-colors flex items-center justify-center gap-2 text-sm">
              <Search className="w-4 h-4" />
              조회하기
            </button>

            <hr className="border-gray-200 my-2" />

            {/* 기능 버튼 */}
            <div className="space-y-2">
              <button onClick={handleDownloadExcel} className="w-full flex items-center justify-center gap-2 bg-green-700 text-white font-bold py-2 rounded hover:bg-green-800 shadow-sm text-xs">
                <FileSpreadsheet className="w-4 h-4" />
                엑셀로 추출하기
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleCopy} className={`flex items-center justify-center gap-1 font-bold py-2 rounded shadow-sm text-xs border ${isCopied ? 'bg-gray-800 text-white' : 'bg-white hover:bg-gray-50'}`}>
                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {isCopied ? '완료' : '내용 복사'}
                </button>
                <button className="flex items-center justify-center gap-1 bg-gray-600 text-white font-bold py-2 rounded hover:bg-gray-700 shadow-sm text-xs">
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