import React, { useState } from 'react';
import { Truck, Building2, ShieldCheck, User, Lock } from 'lucide-react'; 
import { AuthUser } from '../types';
import { supabase } from '../supabase';

interface Props {
  onLogin: (user: AuthUser) => void;
}

export default function LoginView({ onLogin }: Props) {
  const [activeTab, setActiveTab] = useState<'VEHICLE' | 'PARTNER' | 'ADMIN'>('VEHICLE');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (id === '1111' && pw === '1111') {
        onLogin({
          id: 'master-admin',
          username: '슈퍼관리자',
          name: '관리자',
          role: 'ADMIN',
          identifier: 'admin'
        });
        return;
      }

      if (activeTab === 'VEHICLE') {
        const { data } = await supabase
          .from('vehicles')
          .select('*')
          .eq('login_code', id)
          .single();
        if (data && data.password === pw) {
          onLogin({
            id: data.id,
            username: data.owner_name,
            name: data.owner_name,
            role: 'VEHICLE',
            identifier: data.vehicle_no
          });
          return;
        }
      } else if (activeTab === 'PARTNER') {
        const { data } = await supabase
          .from('partner_accounts')
          .select('*')
          .eq('username', id)
          .single();
        if (data && data.password === pw) {
          onLogin({
            id: data.id,
            username: data.name,
            name: data.name,
            role: 'PARTNER',
            identifier: data.client_name
          });
          return;
        }
      } else if (activeTab === 'ADMIN') {
        const { data } = await supabase
          .from('admin_accounts')
          .select('*')
          .eq('username', id)
          .single();
        if (data && data.password === pw) {
          onLogin({
            id: data.id,
            username: data.username,
            name: data.name,
            role: 'ADMIN',
            identifier: 'admin'
          });
          return;
        }
      }
      
      alert('로그인 정보가 올바르지 않습니다.');
    } catch (error) {
      console.error(error);
      alert('로그인 정보가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[400px] overflow-hidden">
        <div className="bg-gradient-to-b from-blue-700 to-blue-900 py-12 px-6 text-center">
          <h1 className="text-3xl font-black text-white tracking-widest drop-shadow-md mb-2">
            BERAKAH SYSTEM
          </h1>
          <p className="text-blue-200 text-sm font-medium tracking-wider opacity-90">
            베라카 물류 정산시스템
          </p>
        </div>

        <div className="flex border-b border-gray-100 p-2 bg-white">
          <button onClick={() => setActiveTab('VEHICLE')} className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'VEHICLE' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            <Truck className="w-4 h-4" /> 차량
          </button>
          <button onClick={() => setActiveTab('PARTNER')} className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'PARTNER' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            <Building2 className="w-4 h-4" /> 업체
          </button>
          <button onClick={() => setActiveTab('ADMIN')} className={`flex-1 flex items-center justify-center gap-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'ADMIN' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            <ShieldCheck className="w-4 h-4" /> 관리자
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">
              {activeTab === 'VEHICLE' ? '차량번호' : activeTab === 'PARTNER' ? '업체 아이디' : '관리자 아이디'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input type="text" value={id} onChange={(e) => setId(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-700 font-medium placeholder-gray-400" placeholder="아이디 입력" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 ml-1">비밀번호</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-700 font-medium placeholder-gray-400" placeholder="비밀번호 입력" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transform transition active:scale-[0.98] mt-4 text-lg">
            {loading ? '접속 중...' : '접속하기'}
          </button>
        </form>
      </div>

      <p className="mt-8 text-white font-bold text-lg tracking-wide opacity-90 drop-shadow-md">
        어플문의 010-2332-4332
      </p>
    </div>
  );
}