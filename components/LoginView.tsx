
import React, { useState } from 'react';

type LoginTab = 'VEHICLE' | 'PARTNER' | 'ADMIN';

interface Props {
  onLogin: (identifier: string, password?: string, type?: LoginTab) => boolean;
}

const LoginView: React.FC<Props> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<LoginTab>('VEHICLE');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(identifier, password, activeTab);
    if (!success) {
      setError('접속 정보가 올바르지 않습니다.');
    }
  };

  const getLabel = () => {
    switch (activeTab) {
      case 'VEHICLE': return '차량번호 뒤 4자리 (ID)';
      case 'PARTNER': return '협력업체 아이디';
      case 'ADMIN': return '관리자 아이디';
    }
  };

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'VEHICLE': return '5017';
      case 'PARTNER': return '0000';
      case 'ADMIN': return '1111';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-8 md:p-10 transform transition-all animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
        {/* 디자인 포인트: 상단 그라데이션 장식 */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-blue-400"></div>
        
        <div className="text-center mb-10 mt-4">
          {/* BERAKAH 브랜드 로고 영역 */}
          <div className="inline-block bg-gradient-to-b from-blue-600 to-blue-700 p-4 rounded-3xl shadow-xl shadow-blue-900/20 mb-6 group transition-all hover:scale-105">
            <div className="flex flex-col items-center justify-center px-4 py-2 border-2 border-white/20 rounded-2xl">
              {/* 상단 텍스트 (이미지의 특수 문자 느낌 재현) */}
              <div className="text-white text-3xl font-black tracking-[0.3em] leading-none mb-2 select-none" style={{ fontFamily: 'Inter, sans-serif' }}>
                הברכה
              </div>
              {/* 메인 영문 로고 */}
              <div className="text-white text-xl font-black tracking-[0.2em] select-none border-t border-white/30 pt-2 w-full text-center">
                BERAKAH
              </div>
            </div>
          </div>
          
          <h2 className="text-xl font-black text-slate-800 tracking-tight">베라카 물류 정산시스템</h2>
          <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-[0.2em]">Logistics Intelligence Portal</p>
        </div>

        {/* 3단 탭 네비게이션 */}
        <div className="flex mb-8 bg-slate-50 p-1.5 rounded-2xl relative border border-slate-100">
          <button 
            onClick={() => { setActiveTab('VEHICLE'); setError(''); }}
            className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all z-10 flex flex-col items-center ${activeTab === 'VEHICLE' ? 'bg-white text-blue-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17h5m10 0h-5"></path></svg>
            차량
          </button>
          <button 
            onClick={() => { setActiveTab('PARTNER'); setError(''); }}
            className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all z-10 flex flex-col items-center ${activeTab === 'PARTNER' ? 'bg-white text-blue-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            협력업체
          </button>
          <button 
            onClick={() => { setActiveTab('ADMIN'); setError(''); }}
            className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all z-10 flex flex-col items-center ${activeTab === 'ADMIN' ? 'bg-white text-blue-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <svg className="w-4 h-4 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            관리자
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              {getLabel()}
            </label>
            <input 
              type="text" 
              required
              placeholder={getPlaceholder()}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-lg"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <input 
              type="password" 
              required
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-red-500 text-[11px] font-bold text-center animate-shake">
              {error}
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-slate-900 hover:bg-black text-white py-4.5 rounded-[1.5rem] font-black shadow-xl shadow-slate-900/10 transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>시스템 접속하기</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-100 text-center">
          <p className="text-slate-400 text-[10px] font-bold">전산문의: 010-2332-4332</p>
          <p className="text-slate-300 text-[9px] mt-1 font-medium tracking-tighter uppercase">ⓒ BERAKAH LOGISTICS. ALL RIGHTS RESERVED.</p>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default LoginView;
