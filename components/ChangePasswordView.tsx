
import React, { useState } from 'react';
import { AuthUser } from '../types';

interface Props {
  user: AuthUser;
  onUpdatePassword: (current: string, next: string) => boolean;
}

const ChangePasswordView: React.FC<Props> = ({ user, onUpdatePassword }) => {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPw !== confirmPw) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPw.length < 4) {
      setError('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    const isUpdated = onUpdatePassword(currentPw, newPw);
    if (isUpdated) {
      setSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      alert('비밀번호가 성공적으로 변경되었습니다.');
    } else {
      setError('현재 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-2 flex items-center">
              <svg className="w-6 h-6 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              비밀번호 변경
            </h2>
            <p className="text-slate-400 text-sm font-medium">보안을 위해 비밀번호를 정기적으로 변경해주세요.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">현재 비밀번호</label>
            <input 
              type="password"
              required
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="기존 비밀번호 입력"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-blue-500 ml-1 uppercase tracking-widest">새 비밀번호</label>
              <input 
                type="password"
                required
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className={`w-full bg-slate-50 border rounded-2xl px-6 py-4 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${newPw && newPw.length < 4 ? 'border-red-300' : 'border-slate-200'}`}
                placeholder="4자 이상 입력"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">새 비밀번호 확인</label>
              <input 
                type="password"
                required
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                className={`w-full bg-slate-50 border rounded-2xl px-6 py-4 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${confirmPw && newPw !== confirmPw ? 'border-red-300' : 'border-slate-200'}`}
                placeholder="동일하게 입력"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold text-center border border-red-100 animate-in fade-in duration-300">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 p-4 rounded-2xl text-xs font-bold text-center border border-green-100 animate-in fade-in duration-300">
              비밀번호가 성공적으로 변경되었습니다.
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>보안 정보 업데이트</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </form>

        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
            Identifier: {user.identifier} | Last Profile Update: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordView;
