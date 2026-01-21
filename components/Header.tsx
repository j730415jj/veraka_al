
import React, { useState } from 'react';
import { AuthUser, ViewType } from '../types';
import PasswordChangeModal from './PasswordChangeModal';

interface HeaderProps {
  user: AuthUser;
  navItems: { label: string; value: ViewType; category: string }[];
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
  onUpdatePassword: (current: string, next: string) => boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  user, 
  navItems, 
  currentView, 
  onViewChange, 
  onLogout, 
  onUpdatePassword, 
  isDarkMode, 
  onToggleTheme 
}) => {
  const [isPwModalOpen, setIsPwModalOpen] = useState(false);

  const getRoleLabel = () => {
    if (user.role === 'VEHICLE') return '기사님';
    if (user.role === 'PARTNER') return '협력업체';
    return '관리자';
  };

  return (
    <>
      <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 no-print shadow-sm z-50 transition-colors duration-300 shrink-0 sticky top-0">
        {/* 1단: 로고 및 사용자 정보 */}
        <div className="w-full px-4 py-2.5 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            {/* BERAKAH 브랜드 로고 (헤더용 소형) */}
            <div className="bg-blue-600 px-2.5 py-1 rounded-lg flex flex-col items-center justify-center shadow-sm">
              <span className="text-white font-black text-[9px] leading-none mb-0.5 tracking-widest">הברכה</span>
              <span className="text-white font-black text-[8px] tracking-tight leading-none border-t border-white/20 pt-0.5">BERAKAH</span>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight uppercase">Berakah Settlement</h1>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">{getRoleLabel()} 전용모드</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700 space-x-2">
              <button 
                onClick={onToggleTheme}
                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
              >
                {isDarkMode ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                )}
              </button>
              <div className="text-right border-r border-slate-200 dark:border-slate-700 pr-2">
                <p className="text-[10px] font-black text-slate-700 dark:text-slate-200">{user.name}</p>
              </div>
              <button 
                onClick={onLogout}
                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              </button>
            </div>
          </div>
        </div>

        {/* 2단: 메뉴 네비게이션 */}
        <nav className="w-full px-4 flex items-center bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800/50 overflow-x-auto custom-scrollbar scroll-smooth">
          {user.role === 'ADMIN' ? (
            <div className="flex items-center space-x-1 py-1">
              {navItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => onViewChange(item.value)}
                  className={`px-3 py-2 text-[11px] font-black transition-all rounded-lg whitespace-nowrap ${
                    currentView === item.value 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-nowrap items-center gap-1.5 py-2">
              {navItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => onViewChange(item.value)}
                  className={`px-4 py-2 text-[12px] font-black transition-all rounded-xl whitespace-nowrap flex items-center space-x-2 border-2 ${
                    currentView === item.value 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100 dark:shadow-none' 
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-blue-200'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </nav>
      </header>

      {isPwModalOpen && (
        <PasswordChangeModal 
          onClose={() => setIsPwModalOpen(false)} 
          onConfirm={onUpdatePassword} 
        />
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
      `}</style>
    </>
  );
};

export default Header;
