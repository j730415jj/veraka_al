
import React, { useState } from 'react';

interface Props {
  onClose: () => void;
  onConfirm: (current: string, next: string) => boolean;
}

const PasswordChangeModal: React.FC<Props> = ({ onClose, onConfirm }) => {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPw !== confirmPw) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPw.length < 4) {
      setError('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    const success = onConfirm(currentPw, newPw);
    if (success) {
      alert('비밀번호가 안전하게 변경되었습니다.');
      onClose();
    } else {
      setError('현재 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-slate-50 p-8 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800">비밀번호 변경</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Security Update</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Current Password</label>
            <input 
              type="password"
              required
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="현재 비밀번호를 입력하세요"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-50">
            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase text-blue-500">New Password</label>
            <input 
              type="password"
              required
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="새 비밀번호 (4자 이상)"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Confirm Password</label>
            <input 
              type="password"
              required
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="한 번 더 입력하세요"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs font-bold text-center border border-red-100">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition"
            >
              취소
            </button>
            <button 
              type="submit"
              className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition active:scale-95"
            >
              변경 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
