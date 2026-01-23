import React, { useMemo } from 'react';
import { Operation, Vehicle, Dispatch } from '../types';

interface Props {
  operations: Operation[];
  vehicles: Vehicle[];
  dispatches: Dispatch[];
}

const DashboardView: React.FC<Props> = ({ operations, vehicles, dispatches }) => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // 1. 통계 계산 (기존 로직 유지)
  const stats = useMemo(() => {
    const mOps = operations.filter(op => op.date.startsWith(currentMonth));
    const revenue = mOps.reduce((sum, op) => sum + op.totalAmount, 0);
    const operationCosts = mOps.reduce((sum, op) => sum + (op.unitPrice * op.quantity * 1.1), 0);
    const vehicleCosts = vehicles.reduce((sum, v) => {
      const expensesTotal = (v.expenses || []).reduce((acc, exp) => {
        return exp.date.startsWith(currentMonth) ? acc + exp.amount : acc;
      }, 0);
      return sum + expensesTotal;
    }, 0);
    const totalExpenditure = operationCosts + vehicleCosts;
    const netProfit = revenue - totalExpenditure;
    const unpaid = operations
      .filter(op => op.settlementStatus !== 'PAID')
      .reduce((sum, op) => sum + op.totalAmount, 0);
    const pendingInvoices = operations.filter(op => !op.isInvoiceIssued).length;
    
    return { 
      revenue, 
      expenditure: totalExpenditure,
      netProfit, 
      unpaid, 
      pendingInvoices, 
      monthOpsCount: mOps.length,
      vehicleExpenditure: vehicleCosts
    };
  }, [operations, vehicles, currentMonth]);

  // 2. 👇 [추가됨] 카톡/문자 공유 기능 (시스템 공유창 호출)
  const handleSharePhoto = async (photoUrl: string, vehicleNo: string, date: string) => {
    try {
      // 이미지 URL을 파일 객체로 변환
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const file = new File([blob], `${date}_${vehicleNo}_invoice.jpg`, { type: 'image/jpeg' });

      // 모바일 공유 기능 실행
      if (navigator.share) {
        await navigator.share({
          title: `[배차관리] ${vehicleNo} 송장`,
          text: `${date} ${vehicleNo} 차량 송장사진입니다.`,
          files: [file] // 파일을 직접 첨부해서 카톡 등으로 보냄
        });
      } else {
        // PC 등 지원 안 하는 경우 새 창으로 열기
        window.open(photoUrl, '_blank');
      }
    } catch (error) {
      console.error("공유 실패 또는 취소:", error);
      // 에러 시 이미지를 그냥 보여줌
      window.open(photoUrl, '_blank');
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 상단 타이틀 & 차량 가동 상태 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">비즈니스 요약</h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">실시간 운영 지표 및 재무 현황</p>
        </div>
        <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3 transition-colors">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-500 dark:text-slate-400`}>
                {i}
              </div>
            ))}
          </div>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">현재 {vehicles.length}대 가동 중</span>
        </div>
      </div>

      {/* 통계 카드 4개 (매출, 지출, 순이익, 미입금) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-900 p-6 rounded-[2rem] shadow-xl shadow-blue-100 dark:shadow-none text-white group hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg uppercase">Revenue</span>
          </div>
          <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">이번 달 총 매출</p>
          <h3 className="text-2xl font-black mt-1">₩{stats.revenue.toLocaleString()}</h3>
          <div className="mt-4 flex items-center text-[10px] font-bold text-blue-100">
            총 {stats.monthOpsCount}건 운행 집계
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-600 dark:group-hover:bg-red-500 group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <span className="text-[10px] font-black text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-lg uppercase tracking-tighter">Expenditure</span>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">총 지출 (유지비 포함)</p>
          <h3 className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">₩{stats.expenditure.toLocaleString()}</h3>
          <div className="mt-4 flex items-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
            직접 지출 합계: ₩{stats.vehicleExpenditure.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            </div>
            <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg uppercase tracking-tighter">Profit</span>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">순수 이익</p>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₩{stats.netProfit.toLocaleString()}</h3>
          <div className="mt-4 flex items-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
            순이익률 {stats.revenue > 0 ? ((stats.netProfit / stats.revenue) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 dark:group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <span className="text-[10px] font-black text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-lg uppercase tracking-tighter">Unpaid</span>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">미입금 합계</p>
          <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">₩{stats.unpaid.toLocaleString()}</h3>
          <div className="mt-4 flex items-center text-[10px] font-bold text-orange-500">
            송장 미발행 {stats.pendingInvoices}건 포함
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        {/* 👇 [수정] 최근 운행 내역 (송장 공유 기능 추가됨) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-black text-slate-800 dark:text-slate-100 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              최근 운행 내역
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
                <tr>
                  <th className="pb-3">날짜</th>
                  <th className="pb-3">차량</th>
                  <th className="pb-3">거래처</th>
                  <th className="pb-3 text-right">금액</th>
                  <th className="pb-3 text-center">상태</th>
                  {/* 👇 송장 컬럼 추가 */}
                  <th className="pb-3 text-center">송장</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {operations.slice(0, 6).map(op => (
                  <tr key={op.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 text-slate-500 dark:text-slate-500 text-xs">{op.date.slice(5)}</td>
                    <td className="py-4 font-bold text-slate-700 dark:text-slate-300">{op.vehicleNo.slice(-4)}</td>
                    <td className="py-4 font-bold text-blue-600 dark:text-blue-400">{op.clientName}</td>
                    <td className="py-4 text-right font-black text-slate-700 dark:text-slate-200">₩{op.totalAmount.toLocaleString()}</td>
                    <td className="py-4 text-center">
                      <div className={`inline-block w-2 h-2 rounded-full ${
                        op.settlementStatus === 'PAID' ? 'bg-green-500' : 
                        op.settlementStatus === 'INVOICED' ? 'bg-blue-500' : 'bg-orange-500'
                      }`}></div>
                    </td>
                    {/* 👇 송장 공유 버튼 추가 */}
                    <td className="py-4 text-center">
                      {op.invoicePhoto ? (
                        <button 
                          onClick={() => handleSharePhoto(op.invoicePhoto!, op.vehicleNo, op.date)}
                          className="bg-yellow-400 text-black px-2 py-1 rounded font-bold hover:bg-yellow-500 transition shadow-sm text-[10px] inline-flex items-center gap-1"
                        >
                          📤 공유
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 차량 가동 현황 (유지) */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col transition-colors">
          <h4 className="font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
            차량 가동 현황
          </h4>
          <div className="space-y-6 flex-1">
            {vehicles.map(v => {
              const totalExp = (v.expenses || []).filter(e => e.date.startsWith(currentMonth)).reduce((acc, e) => acc + e.amount, 0);
              return (
                <div key={v.id} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <div className="flex flex-col">
                      <span className="text-slate-800 dark:text-slate-200">{v.vehicleNo}</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">기록된 지출: ₩{totalExp.toLocaleString()}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
                      v.status === 'active' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                    }`}>
                      {v.status === 'active' ? '운행 중' : '대기 중'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${v.status === 'active' ? 'bg-blue-500' : 'bg-slate-300'}`} style={{ width: '100%' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 p-5 bg-blue-600 dark:bg-blue-900/40 rounded-[1.5rem] text-white relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Expense Status</p>
              <p className="text-[11px] font-medium leading-relaxed opacity-90">
                기사님이 직접 기록한 <span className="font-black">매일의 지출</span>이 실시간으로 반영됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;