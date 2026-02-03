// @ts-nocheck
/* eslint-disable */
import React, { forwardRef } from 'react';

// ----------------------------------------------------------------------
// 1. 인쇄용 명세서 부품 (StatementReport)
//    : forwardRef로 감싸서 인쇄 기능이 이 컴포넌트 내부의 div를 
//      확실하게 잡을 수 있게 수정함 (에러 해결 핵심)
// ----------------------------------------------------------------------
interface ReportProps {
  title: string;
  filterTarget: string;
  filterStartDate: string;
  filterEndDate: string;
  provider: any;
  filteredData: any[];
  totals: any;
  // reportRef는 제거됨 (forwardRef로 대체)
}

// 🔥 핵심 수정: 컴포넌트를 forwardRef로 감쌈
const StatementReport = forwardRef<HTMLDivElement, ReportProps>(({
  title,
  filterTarget,
  filterStartDate,
  filterEndDate,
  provider,
  filteredData,
  totals
}, ref) => {
  return (
    // 🔥 ref를 여기서 직접 연결
    <div ref={ref} className="bg-white text-black w-[210mm] min-h-[297mm] p-[15mm] shadow-2xl relative box-border flex flex-col">
      {/* 제목 */}
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
          {filteredData.map((op: any, idx: number) => (
            <tr key={idx} className="text-center h-8">
              {/* 날짜 방어 코드 유지 */}
              <td className="border border-black">{op.date ? op.date.slice(5) : ''}</td>
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
      
      <div className="mt-auto text-center text-gray-500 text-xs">
          위와 같이 거래하였음을 확인합니다. (주)베라카
      </div>
    </div>
  );
});

StatementReport.displayName = 'StatementReport'; // 디버깅용 이름
export default StatementReport;