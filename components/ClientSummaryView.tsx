
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Operation, SummaryData } from '../types';

interface Props {
  operations: Operation[];
}

const ClientSummaryView: React.FC<Props> = ({ operations }) => {
  // 오늘 날짜 구하기 (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [sidebarWidth, setSidebarWidth] = useState(210);
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX - 24;
    if (newWidth > 150 && newWidth < 500) {
      setSidebarWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const filteredOps = useMemo(() => {
    return operations.filter(op => op.date >= startDate && op.date <= endDate);
  }, [operations, startDate, endDate]);

  const summary: SummaryData[] = useMemo(() => {
    const map = new Map<string, { deposit: number; payout: number }>();
    filteredOps.forEach(op => {
      const current = map.get(op.clientName) || { deposit: 0, payout: 0 };
      const deposit = op.totalAmount;
      const payout = op.totalAmount - op.tax;
      map.set(op.clientName, {
        deposit: current.deposit + deposit,
        payout: current.payout + payout
      });
    });

    return Array.from(map.entries()).map(([name, vals]) => ({
      clientName: name,
      depositAmount: Math.round(vals.deposit),
      payoutAmount: Math.round(vals.payout),
      margin: Math.round(vals.deposit - vals.payout)
    }));
  }, [filteredOps]);

  const total = summary.reduce((acc, curr) => ({
    deposit: acc.deposit + curr.depositAmount,
    payout: acc.payout + curr.payoutAmount,
    margin: acc.margin + curr.margin
  }), { deposit: 0, payout: 0, margin: 0 });

  const SummaryContent = ({ isPreview = false }) => (
    <div className={`bg-white ${isPreview ? 'p-12 md:p-16' : 'p-8 md:p-14'} text-slate-800 w-full overflow-hidden`}>
      <div className="pt-2 mb-10">
        <h2 className="text-[32px] font-black tracking-tighter border-b-[5px] border-slate-900 pb-2 inline-block">
          거래처별 총현황
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 border-b-4 border-b-blue-500">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Total 매출</p>
          <p className="text-2xl font-black text-blue-800 mt-2">{total.deposit.toLocaleString()} <span className="text-xs font-medium">원</span></p>
        </div>
        <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100 border-b-4 border-b-red-500">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Total 매입(지출)</p>
          <p className="text-2xl font-black text-red-800 mt-2">{total.payout.toLocaleString()} <span className="text-xs font-medium">원</span></p>
        </div>
        <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 border-b-4 border-b-emerald-500">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Net Margin 수익</p>
          <p className="text-2xl font-black text-emerald-800 mt-2">{total.margin.toLocaleString()} <span className="text-xs font-medium">원</span></p>
        </div>
      </div>

      <div className="mb-6 pl-1 flex justify-between items-center text-sm font-bold text-slate-600">
        <p>기준기간 : {startDate.replace(/-/g, '.')} ~ {endDate.replace(/-/g, '.')}</p>
        <span className="text-xs text-slate-400">총 {summary.length}개 거래처 집계됨</span>
      </div>

      <div className="overflow-x-auto border border-slate-300 rounded-sm">
        <table className="w-full text-[12px] border-collapse min-w-[800px]">
          <thead className="bg-slate-50 border-b border-slate-300">
            <tr>
              <th className="border-r border-slate-300 p-4 font-black text-left">거래처명</th>
              <th className="border-r border-slate-300 p-4 font-black text-right">매출 (입금금액)</th>
              <th className="border-r border-slate-300 p-4 font-black text-right">매입 (지출금액)</th>
              <th className="p-4 font-black text-right">수익 (마진액)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {summary.map(item => (
              <tr key={item.clientName} className="hover:bg-slate-50/50 transition-colors">
                <td className="border-r border-slate-300 p-4 font-black text-slate-800">{item.clientName}</td>
                <td className="border-r border-slate-300 p-4 text-right font-medium">{item.depositAmount.toLocaleString()}</td>
                <td className="border-r border-slate-300 p-4 text-right font-medium">{item.payoutAmount.toLocaleString()}</td>
                <td className="p-4 text-right font-black text-blue-600 bg-blue-50/10">{item.margin.toLocaleString()}</td>
              </tr>
            ))}
            {summary.length === 0 && (
              <tr><td colSpan={4} className="p-20 text-center text-slate-300 italic">조회된 데이터가 없습니다.</td></tr>
            )}
          </tbody>
          <tfoot className="border-t-2 border-slate-900 bg-slate-50/30">
            <tr className="font-black text-sm">
              <td className="border-r border-slate-300 p-5 text-center">[ 총 합 계 ]</td>
              <td className="border-r border-slate-300 p-5 text-right text-blue-800">{total.deposit.toLocaleString()}</td>
              <td className="border-r border-slate-300 p-5 text-right text-red-800">{total.payout.toLocaleString()}</td>
              <td className="p-5 text-right text-emerald-800 text-lg">{total.margin.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full gap-0 p-1.5 overflow-hidden">
      {/* 메인 현황 영역 */}
      <div className="flex-1 overflow-auto bg-slate-200/30 rounded-lg shadow-inner custom-scrollbar pr-1">
        <div className="p-2 w-full">
          <div className="bg-white shadow-md border border-slate-200">
            <SummaryContent />
          </div>
        </div>
      </div>

      {/* 너비 조절 핸들 */}
      <div 
        onMouseDown={startResizing}
        className="w-1.5 hover:w-2 bg-transparent hover:bg-blue-400 cursor-col-resize transition-all shrink-0 no-print flex items-center justify-center group z-10"
      >
        <div className="w-[1px] h-20 bg-slate-300 group-hover:bg-blue-300"></div>
      </div>

      {/* 우측 사이드바 */}
      <div 
        style={{ width: `${sidebarWidth}px` }} 
        className="space-y-2 no-print shrink-0 flex flex-col h-full ml-1"
      >
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest text-center">
            현황 필터
          </div>
          <div className="p-3 space-y-3">
            <div className="space-y-0.5">
              <label className="text-[8px] font-black text-slate-400 ml-1 uppercase">시작</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-[10px] font-black outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[8px] font-black text-slate-400 ml-1 uppercase">종료</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-[10px] font-black outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          </div>
        </div>

        <div className="flex-1"></div>

        {/* 액션 버튼 영역 */}
        <div className="flex flex-col gap-2 shrink-0">
          <button onClick={() => window.print()} className="w-full bg-slate-900 text-white py-4 rounded-lg font-black flex flex-col items-center justify-center transition-all hover:bg-slate-800 shadow-xl active:scale-95 group">
            <svg className="w-5 h-5 mb-1 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            <span className="text-[9px] uppercase tracking-widest">보고서 인쇄</span>
          </button>

          <button 
            onClick={() => setIsPreviewOpen(true)} 
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-black flex flex-col items-center justify-center transition-all hover:bg-blue-700 shadow-xl active:scale-95 group"
          >
            <svg className="w-5 h-5 mb-1 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            <span className="text-[9px] uppercase tracking-widest">미리보기</span>
          </button>
        </div>
      </div>

      {/* 미리보기 모달 */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto no-print">
          {/* 상단 고정 제어바 */}
          <div className="sticky top-0 w-full bg-slate-800/80 backdrop-blur border-b border-slate-700 flex items-center justify-between px-6 py-4 z-[1001]">
            <div className="flex items-center space-x-4">
              <span className="text-white font-black text-xl tracking-tighter">인쇄 미리보기</span>
              <span className="text-slate-400 text-xs font-bold px-3 py-1 bg-slate-700/50 rounded-full border border-slate-600">
                거래처별 총현황 집계
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => window.print()} 
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-sm flex items-center transition shadow-lg shadow-emerald-900/20"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                현황 인쇄하기
              </button>
              <button 
                onClick={() => setIsPreviewOpen(false)} 
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-black text-sm flex items-center transition"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                미리보기 닫기
              </button>
            </div>
          </div>

          {/* 리포트 본문 */}
          <div className="max-w-5xl w-full my-12 animate-in zoom-in-95 duration-300 shadow-2xl">
            <div className="bg-white shadow-2xl rounded-sm">
              <SummaryContent isPreview={true} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default ClientSummaryView;
