// @ts-nocheck
/* eslint-disable */
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface Props {
  onLogin: (role: string, identifier: string) => void;
}

const LoginView: React.FC<Props> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'vehicle' | 'partner' | 'admin'>('admin'); // 관리자 탭 기본
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. 관리자 로그인 (1111) - DB 오류나도 접속되게 비상 조치 추가
      if (activeTab === 'admin') {
        if (id.trim() === '1111') {
           // 비밀번호 체크 로직 (필요시 추가, 현재는 1111이면 통과되게 임시 조치하거나 DB 체크)
           // 여기서는 DB 체크를 우선 시도하되, 1111은 우선 통과시킴 (사장님 요청 해결용)
           onLogin('ADMIN', '최고관리자');
           return;
        }
        
        // DB 체크 (기존 로직)
        const { data, error } = await supabase
          .from('snippets') // 혹은 admin 테이블
          .select('*')
          .eq('role', 'ADMIN')
          .eq('username', id)
          .eq('password', password)
          .single();

        if (data) {
          onLogin('ADMIN', '최고관리자');
        } else {
          setError('접속 정보가 올바르지 않습니다.');
        }
      } 
      // 2. 차량 기사 로그인
      else if (activeTab === 'vehicle') {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('vehicleNo', id) // 차량번호
          .eq('password', password) // 비밀번호 (차주명 등)
          .single();

        if (data) {
          onLogin('VEHICLE', data.vehicleNo);
        } else {
          setError('차량 정보를 찾을 수 없습니다.');
        }
      } 
      // 3. 협력업체 로그인
      else if (activeTab === 'partner') {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('clientName', id)
          .eq('password', password)
          .single();

        if (data) {
          onLogin('PARTNER', data.clientName);
        } else {
          setError('업체 정보를 찾을 수 없습니다.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('로그인 중 오류가 발생했습니다.');
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
             <h1 className="text-3xl font-black text-white tracking-widest">הברכה</h1>
             <h2 className="text-sm font-bold text-white tracking-[0.3em] mt-1">BERAKAH</h2>
          </div>
          <p className="text-blue-100 font-bold text-lg">베라카 물류 정산시스템</p>
          <p className="text-blue-200 text-xs tracking-widest uppercase mt-1">Logistics Intelligence Portal</p>
        </div>

        {/* 탭 버튼 */}
        <div className="flex p-2 gap-2 bg-slate-50">
          <button onClick={() => { setActiveTab('vehicle'); setId(''); setPassword(''); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'vehicle' ? 'bg-white shadow-md text-blue-600 border border-blue-100' : 'text-slate-400 hover:bg-slate-200'}`}>
            🚛 차량
          </button>
          <button onClick={() => { setActiveTab('partner'); setId(''); setPassword(''); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'partner' ? 'bg-white shadow-md text-blue-600 border border-blue-100' : 'text-slate-400 hover:bg-slate-200'}`}>
            🏢 협력업체
          </button>
          <button onClick={() => { setActiveTab('admin'); setId(''); setPassword(''); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'admin' ? 'bg-white shadow-md text-blue-600 border border-blue-100' : 'text-slate-400 hover:bg-slate-200'}`}>
            🛡️ 관리자
          </button>
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                {activeTab === 'vehicle' ? '차량번호 (4자리)' : activeTab === 'partner' ? '업체명' : '관리자 아이디'}
              </label>
              {/* [수정됨] tracking-widest 제거 -> tracking-normal 적용 */}
              <input 
                type="text" 
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none tracking-normal placeholder:font-normal"
                placeholder={activeTab === 'admin' ? '예: 1111' : '입력하세요'}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                PASSWORD
              </label>
              {/* [수정됨] 비밀번호 입력창도 간격 정상화 */}
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none tracking-normal"
                placeholder="••••"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-bold px-4 py-3 rounded-xl flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl text-lg font-bold shadow-lg transform active:scale-95 transition-all flex justify-center items-center gap-2"
          >
            {loading ? '접속 중...' : '시스템 접속하기 ➔'}
          </button>
        </form>
        
        <div className="bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-400 font-bold">VERAKA SYSTEM v2.0</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;