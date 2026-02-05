import React, { useState } from 'react';
import { Truck, Building2, ShieldCheck, User, Lock } from 'lucide-react'; // 아이콘 추가

interface Props {
  onLogin: (id: string, pw?: string, type?: 'VEHICLE' | 'PARTNER' | 'ADMIN') => boolean;
}

export default function LoginView({ onLogin }: Props) {
  const [activeTab, setActiveTab] = useState<'VEHICLE' | 'PARTNER' | 'ADMIN'>('VEHICLE');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onLogin(id, pw, activeTab)) {
      alert('로그인 정보가 올바르지 않습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      
      {/* 메인 카드 */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[400px] overflow-hidden">
        
        {/* 1. 헤더 (블루 그라데이션) */}
        <div className="bg-gradient-to-b from-blue-700 to-blue-900 py-12 px-6 text-center">
          <h1 className="text-3xl font-black text-white tracking-widest drop-shadow-md mb-2">
            BERAKAH SYSTEM
          </h1>
          <p className="text-blue-200 text-sm font-medium tracking-wider opacity-90">
            베라카 물류 정산시스템
          </p>
        </div>

        {/* 2. 탭 버튼 (아이콘 포함) */}
        <div className="flex border-b border-gray-100 p-2 bg-white">
          <button 
            onClick={() => setActiveTab('VEHICLE')} 
            className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'VEHICLE' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Truck className="w-4 h-4" /> 차량
          </button>
          <button 
            onClick={() => setActiveTab('PARTNER')} 
            className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'PARTNER' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Building2 className="w-4 h-4" /> 업체
          </button>
          <button 
            onClick={() => setActiveTab('ADMIN')} 
            className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'ADMIN' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <ShieldCheck className="w-4 h-4" /> 관리자
          </button>
        </div>

        {/* 3. 입력 폼 */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          
          {/* 아이디 입력 */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">
              {activeTab === 'VEHICLE' ? '차량번호' : activeTab === 'PARTNER' ? '업체 아이디' : '관리자 아이디'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="text" 
                value={id} 
                onChange={(e) => setId(e.target.value)} 
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-700 font-medium placeholder-gray-400"
                placeholder={activeTab === 'VEHICLE' ? '차량번호 입력' : '아이디 입력'}
              />
            </div>
          </div>

          {/* 비밀번호 입력 */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">비밀번호</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input 
                type="password" 
                value={pw} 
                onChange={(e) => setPw(e.target.value)} 
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-700 font-medium placeholder-gray-400"
                placeholder="비밀번호"
              />
            </div>
          </div>

          {/* 접속하기 버튼 */}
          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transform transition active:scale-[0.98] mt-4 text-lg"
          >
            접속하기
          </button>
        </form>
      </div>

      {/* 4. 하단 문의 문구 (요청하신 부분) */}
      <p className="mt-8 text-white font-bold text-lg tracking-wide opacity-90 drop-shadow-md">
        어플문의 010-2332-4332
      </p>

    </div>
  );
}