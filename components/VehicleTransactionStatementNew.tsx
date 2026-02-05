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
];

export default function VehicleTransactionStatementNew() {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-02-27');
  const [selectedVehicle, setSelectedVehicle] = useState('5465');
  
  // ✨ 용도 선택 상태 (기본값: 차주용)
  const [viewMode, setViewMode] = useState<'owner' | 'client'>('owner');
  const [isCopied, setIsCopied] = useState(false);

  // 1. 합계 계산
  const totalQty = SAMPLE_DATA.reduce((sum, item) => sum + item.quantity, 0);
  const totalSupply = SAMPLE_DATA.reduce((sum, item) => sum + item.supplyPrice, 0);
  const totalTax = SAMPLE_DATA.reduce((sum, item) => sum + item.tax, 0);
  const grandTotal = SAMPLE_DATA.reduce((sum, item) => sum + item.total, 0);

  // 2. 공제액 계산 (차주용: 5%, 거래처용: 0원)
  // Math.floor로 원단위 절사
  const deductionRate = viewMode === 'owner' ? 0.05 : 0; 
  const deductionAmount = Math.floor(totalSupply * deductionRate);

  // 3. 실지급액
  const finalPayment = grandTotal - deductionAmount;

  // 📥 엑셀 다운로드 (기능 시뮬레이션)
  const handleDownloadExcel = () => {
    const fileName = `${selectedVehicle}_거래내역서_${startDate}_${endDate}.xlsx`;
    alert(`[엑셀 다운로드]\n파일명: ${fileName}\n\n*실제 엑셀 라이브러리가 연결되면 파일이 다운로드됩니다.`);
  };

  // 📋 복사 기능
  const handleCopy = () => {
    const textToCopy = `[${selectedVehicle} 거래명세서]\n기간: ${startDate}~${endDate}\n공급가: ${totalSupply.toLocaleString()}원\n세액: ${totalTax.toLocaleString()}원\n합계: ${grandTotal.toLocaleString()}원\n실지급액: ${finalPayment.toLocaleString()}원`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      alert('복사에 실패했습니다.');
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full bg-gray-100 p-4">
      {/* 📄 왼쪽: A4 미리보기 영역 */}
      <div className="flex-1 overflow-auto flex justify-center">
        <div 
          className="bg-white shadow-lg p-8 w-[210mm] min-h-[297mm] text-black flex flex-col justify-between"
          style={{ fontFamily: '"Malgun Gothic", "Dotum", sans-serif' }}
        >
          <div>
            {/* 1. 상단 헤더 (엑셀 그리드 스타일 적용) */}
            <div className="flex justify-between items-end mb-4 border-b-2 border-black pb-4">
              {/* 왼쪽: 제목 및 수신자 */}
              <div className="w-1/2 pr-4">
                <h1 className="text-4xl font-extrabold tracking-tighter mb-6 text-left">차량거래 내역서</h1>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl font-bold underline decoration-2 underline-offset-4">
                    {selectedVehicle} 귀하
                  </span>
                  {/* 화면용 뱃지 */}
                  <span className={`text-xs px-2 py-1 rounded font-bold text-white ${viewMode === 'owner' ? 'bg-blue-600' : 'bg-green-600'}`}>
                    {viewMode === 'owner' ? '차주용' : '거래처용'}
                  </span>
                </div>
                <p className="text-base text-gray-700 font-medium">
                  거래기간 : {startDate} ~ {endDate}
                </p>
              </div>

              {/* 오른쪽: 공급자 정보 (엑셀 표 형태) */}
              <div className="w-1/2">
                <table className="w-full border-collapse border border-black text-xs">
                  <tbody>
                    <tr>
                      <td className="border border-black bg-gray-100 text-center p-1.5 font-bold w-20">등록번호</td>
                      <td className="border border-black p-1.5 text-center font-bold text-sm" colSpan={3}>
                        406-81-64763
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black bg-gray-100 text-center p-1.5 font-bold">상 호</td>
                      <td className="border border-black p-1.5 text-center w-32">(주)베라카</td>
                      <td className="border border-black bg-gray-100 text-center p-1.5 font-bold w-16">성 명</td>
                      <td className="border border-black p-1.5 text-center">장국용</td>
                    </tr>
                    <tr>
                      <td className="border border-black bg-gray-100 text-center p-1.5 font-bold">주 소</td>
                      <td className="border border-black p-1.5 text-center" colSpan={3}>
                        포항시 남구 연일읍 새천년대로 202. 2층
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black bg-gray-100 text-center p-1.5 font-bold">전화번호</td>
                      <td className="border border-black p-1.5 text-center">054-285-1300</td>
                      <td className="border border-black bg-gray-100 text-center p-1.5 font-bold">팩스</td>
                      <td className="border border-black p-1.5 text-center">054-283-1301</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. 메인 데이터 테이블 (여백 최소화 py-1) */}
            <div className="w-full mb-6">
              <table className="w-full border-collapse border border-black text-sm text-center">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-black py-1.5 w-16">일자</th>
                    <th className="border border-black py-1.5 w-16">차량</th>
                    <th className="border border-black py-1.5">단가</th>
                    <th className="border border-black py-1.5">상차지</th>
                    <th className="border border-black py-1.5">하차지</th>
                    <th className="border border-black py-1.5">품명</th>
                    <th className="border border-black py-1.5 w-14">수량</th>
                    <th className="border border-black py-1.5">공급가액</th>
                    <th className="border border-black py-1.5">세액</th>
                    <th className="border border-black py-1.5">합계금액</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_DATA.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-black py-1">{row.date.slice(5)}</td>
                      <td className="border border-black py-1">{row.vehicleNo}</td>
                      <td className="border border-black py-1 text-right px-2">{row.unitPrice.toLocaleString()}</td>
                      <td className="border border-black py-1">{row.origin}</td>
                      <td className="border border-black py-1">{row.destination}</td>
                      <td className="border border-black py-1">{row.item}</td>
                      <td className="border border-black py-1">{row.quantity}</td>
                      <td className="border border-black py-1 text-right px-2">{row.supplyPrice.toLocaleString()}</td>
                      <td className="border border-black py-1 text-right px-2">{row.tax.toLocaleString()}</td>
                      <td className="border border-black py-1 text-right px-2 font-bold bg-gray-50">{row.total.toLocaleString()}</td>
                    </tr>
                  ))}
                  
                  {/* 빈 줄 채우기 (모양 유지용) */}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td className="border border-black py-3">&nbsp;</td>
                      <td className="border border-black py-3">&nbsp;</td>
                      <td className="border border-black py-3">&nbsp;</td>
                      <td className="border border-black py-3">&nbsp;</td>
                      <td className="border border-black py-3">&nbsp;</td>
                      <td className="border border-black py-3">&nbsp;</td>
                      <td className="border border-black py-3">&nbsp;</td>
                      <td className="border border-black py-3">&nbsp;</td>
                      <td className="border border-black py-3">&nbsp;</td>
                      <td className="border border-black py-3">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 3. 하단 결제 요약 (엑셀 서식 구현) */}
            <div className="w-full flex justify-end mt-2">
              <div className="w-full max-w-md">
                <table className="w-full border-collapse border border-black text-sm">
                  <tbody>
                    {/* 기본 합계 */}
                    <tr>
                      <td className="border border-black bg-gray-100 p-1.5 text-center font-bold w-1/3">공급가액</td>
                      <td className="border border-black p-1.5 text-right px-3 font-bold">{totalSupply.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="border border-black bg-gray-100 p-1.5 text-center font-bold">부 가 세 (10%)</td>
                      <td className="border border-black p-1.5 text-right px-3 font-bold">{totalTax.toLocaleString()}</td>
                    </tr>
                    <tr className="border-t-2 border-black">
                      <td className="border border-black bg-blue-50 p-1.5 text-center font-bold text-blue-900">합 계 금 액</td>
                      <td className="border border-black p-1.5 text-right px-3 text-lg font-bold text-blue-900">{grandTotal.toLocaleString()}</td>
                    </tr>
                    
                    {/* 차주용일 때만 보이는 공제액 & 실지급액 */}
                    {viewMode === 'owner' && (
                      <>
                        <tr>
                          <td className="border border-black bg-red-50 p-1.5 text-center font-bold text-red-700">공 제 액 (5%)</td>
                          <td className="border border-black p-1.5 text-right px-3 font-bold text-red-600">- {deductionAmount.toLocaleString()}</td>
                        </tr>
                        <tr className="border-t-2 border-double border-black">
                          <td className="border border-black bg-yellow-100 p-3 text-center font-extrabold text-black text-base">실 지 급 액</td>
                          <td className="border border-black p-3 text-right px-3 text-2xl font-extrabold text-black underline decoration-double decoration-gray-400 underline-offset-4">
                            {finalPayment.toLocaleString()}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 하단 날인 */}
          <div className="mt-8 text-center pb-8">
            <p className="text-sm text-gray-500 mb-8">위와 같이 거래하였음을 확인합니다.</p>
            <div className="text-xl font-bold tracking-widest relative inline-block">
              (주) 베 라 카 <span className="text-gray-300 text-sm font-normal ml-2">(인)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🛠 오른쪽: 컨트롤 패널 */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-xl p-6 sticky top-6 border border-gray-200">
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2 border-b pb-3">
            <Search className="w-5 h-5 text-blue-600" />
            내역서 설정 및 기능
          </h2>

          <div className="space-y-6">
            {/* 용도 선택 (토글) */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="text-sm font-bold text-gray-800 flex items-center gap-1 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                출력 용도 (필수)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewMode('owner')}
                  className={`py-3 px-2 rounded-md text-sm font-bold transition-all ${
                    viewMode === 'owner' 
                      ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300 scale-105' 
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  차주용 (공제 O)
                </button>
                <button
                  onClick={() => setViewMode('client')}
                  className={`py-3 px-2 rounded-md text-sm font-bold transition-all ${
                    viewMode === 'client' 
                      ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-300 scale-105' 
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  거래처용 (공제 X)
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                * {viewMode === 'owner' ? '실지급액 (5% 공제) 자동 계산' : '공제 없이 합계금액만 표시'}
              </p>
            </div>

            {/* 조회 기간 */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700">조회 정보</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border rounded text-sm" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border rounded text-sm" />
              </div>
              <select 
                value={selectedVehicle} 
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full p-3 border rounded text-lg font-bold text-blue-800"
              >
                <option value="5465">5465</option>
                <option value="6434">6434</option>
                <option value="8428">8428</option>
              </select>
            </div>

            {/* 조회 버튼 (요청하신 파란색 큰 버튼) */}
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 px-4 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 text-lg">
              <Search className="w-6 h-6" />
              조회하기
            </button>

            <div className="border-t border-gray-200 my-4"></div>

            {/* 기능 버튼 모음 */}
            <div className="space-y-3">
              {/* 엑셀 다운로드 */}
              <button 
                onClick={handleDownloadExcel}
                className="w-full flex items-center justify-center gap-2 bg-green-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-800 transition-colors shadow-sm"
              >
                <FileSpreadsheet className="w-5 h-5" />
                엑셀로 추출하기
              </button>

              <div className="grid grid-cols-2 gap-3">
                {/* 복사 버튼 */}
                <button 
                  onClick={handleCopy}
                  className={`flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg transition-colors shadow-sm border ${
                    isCopied 
                    ? 'bg-gray-800 text-white border-gray-800' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {isCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {isCopied ? '완료!' : '내용 복사'}
                </button>

                {/* 출력 버튼 */}
                <button className="flex items-center justify-center gap-2 bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors shadow-sm">
                  <Printer className="w-5 h-5" />
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