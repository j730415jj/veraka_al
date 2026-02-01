// @ts-nocheck
/* eslint-disable */
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface Props {
  onLogin: (role: string, identifier: string) => void;
}

const LoginView: React.FC<Props> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'vehicle' | 'partner' | 'admin'>('admin');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // [관리자 긴급 접속] 1111 입력 시 무조건 통과
    if (activeTab === 'admin' && id === '1111') {
        onLogin('ADMIN', '최고관리자');
        return;
    }

    try {
      if (activeTab === 'vehicle') {
        const { data } = await supabase.from('vehicles').select('*').eq('vehicleNo', id).eq('password', password).single();
        if (data) onLogin('VEHICLE', data.vehicleNo);
        else setError('차량 정보를 찾을 수 없습니다.');
      } 
      else if (activeTab === 'partner') {
        const { data } = await supabase.from('clients').select('*').eq('clientName', id).eq('password', password).single();
        if (data) onLogin('PARTNER', data.clientName);
        else setError('업체 정보를 찾을 수 없습니다.');
      }
      else if (activeTab === 'admin') {
         const { data } = await supabase.from('snippets').select('*').eq('role', 'ADMIN').eq('username', id).eq('password', password).single();
         if (data) onLogin('ADMIN', '최고관리자');
         else setError('관리자 정보가 틀립니다.');
      }
    } catch (err) {
      setError('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md">
        
        {/* 로고 영역 */}
        <div className="bg-blue-600 p-8 text-center">
          <div className="inline-block border-2 border-white px-4 py-2 rounded mb-4">
             <h1 className="text-3xl font-black text-white tracking-normal">!!!간격수정완료!!!</h1>
             <h2 className="text-sm font-bold text-white mt-1">BERAKAH SYSTEM</h2>
          </div>
          <p className="text-blue-100 font-bold text-lg">베라카 물류 정산시스템</p>
        </div>

        {/* 탭 버튼 */}
        <div className="flex p-2 gap-2 bg-slate-50">
          <button onClick={() => setActiveTab('vehicle')} className={`flex-1 py-3 text-sm font-bold rounded-xl ${activeTab === 'vehicle' ? 'bg-white text-blue-600 shadow' : 'text-slate-400'}`}>🚛 차량</button>
          <button onClick={() => setActiveTab('partner')} className={`flex-1 py-3 text-sm font-bold rounded-xl ${activeTab === 'partner' ? 'bg-white text-blue-600 shadow' : 'text-slate-400'}`}>🏢 업체</button>
          <button onClick={() => setActiveTab('admin')} className={`flex-1 py-3 text-sm font-bold rounded-xl ${activeTab === 'admin' ? 'bg-white text-blue-600 shadow' : 'text-slate-400'}`}>🛡️ 관리자</button>
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {activeTab === 'admin' ? '관리자 아이디 (1111)' : '아이디'}
              </label>
              {/* 여기 tracking-widest 삭제됨 */}
              <input 
                type="text" 
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 outline-none tracking-normal placeholder:font-normal"
                placeholder="입력하세요"
              />
          </div>
          <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">비밀번호</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 outline-none tracking-normal"
                placeholder="••••"
              />
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm font-bold px-4 py-3 rounded-xl">⚠️ {error}</div>}

          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-xl text-lg font-bold shadow-lg hover:bg-black transition-all">
            {loading ? '접속 중...' : '접속하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;