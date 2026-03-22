import React, { useState } from 'react';

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'notification' | 'data' | 'info'>('system');

  const tabs = [
    { id: 'system', label: '⚙️ 시스템', },
    { id: 'notification', label: '🔔 알림', },
    { id: 'data', label: '📊 데이터', },
    { id: 'info', label: 'ℹ️ 정보', },
  ];

  return (
    <div className="flex flex-col h-full p-6 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800 dark:text-white">⚙️ 설정</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">베라카 운송 관리 시스템 설정</p>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 font-bold text-sm rounded-t-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-800 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 시스템 설정 */}
        {activeTab === 'system' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-slate-700 dark:text-white mb-4 text-lg">🖥️ 화면 설정</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">다크 모드</p>
                    <p className="text-xs text-slate-400">헤더의 🌙 버튼으로 전환 가능</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold">헤더에서 설정</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">자동 새로고침</p>
                    <p className="text-xs text-slate-400">30초마다 데이터 자동 동기화</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded font-bold">✅ 활성화됨</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">실시간 위치 추적</p>
                    <p className="text-xs text-slate-400">기사님 로그인 시 30초마다 위치 전송</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded font-bold">✅ 활성화됨</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-slate-700 dark:text-white mb-4 text-lg">🔐 보안 설정</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">자동 로그아웃</p>
                    <p className="text-xs text-slate-400">브라우저 종료 시 로그인 유지</p>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded font-bold">로컬 저장</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">비밀번호 변경</p>
                    <p className="text-xs text-slate-400">관리자/기사/파트너 비밀번호 변경</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold">메뉴에서 설정</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 알림 설정 */}
        {activeTab === 'notification' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-slate-700 dark:text-white mb-4 text-lg">🔔 푸시 알림 설정</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">새 배차 알림</p>
                    <p className="text-xs text-slate-400">관리자가 배차 등록 시 기사님 앱으로 알림 발송</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded font-bold">✅ FCM 활성화</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">운행 완료 알림</p>
                    <p className="text-xs text-slate-400">기사님이 완료 처리 시 관리자 알림</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded font-bold">✅ 활성화됨</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">알림음</p>
                    <p className="text-xs text-slate-400">새 배차 도착 시 알림음 재생</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded font-bold">✅ 활성화됨</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-slate-700 dark:text-white mb-4 text-lg">📱 앱 알림 안내</h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-2">📌 앱 알림이 오지 않을 경우</p>
                <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
                  <li>폰 설정 → 앱 → 베라카 → 알림 → 허용</li>
                  <li>배터리 최적화 → 베라카 → 최적화 안함</li>
                  <li>앱 완전 종료 후 재실행</li>
                  <li>기사님 계정으로 로그인 필수</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* 데이터 설정 */}
        {activeTab === 'data' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-slate-700 dark:text-white mb-4 text-lg">📊 데이터베이스 정보</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">데이터베이스</p>
                    <p className="text-xs text-slate-400">Supabase PostgreSQL</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded font-bold">✅ 연결됨</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">실시간 동기화</p>
                    <p className="text-xs text-slate-400">Supabase Realtime</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded font-bold">✅ 활성화됨</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">이미지 저장소</p>
                    <p className="text-xs text-slate-400">Supabase Storage (invoices 버킷)</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded font-bold">✅ 연결됨</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">푸시 알림 서버</p>
                    <p className="text-xs text-slate-400">Firebase Cloud Messaging (FCM)</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded font-bold">✅ 연결됨</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-slate-700 dark:text-white mb-4 text-lg">🗂️ 데이터 관리</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">운행내역 조회 제한</p>
                    <p className="text-xs text-slate-400">최근 300건 조회</p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">300건</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">배차 조회 제한</p>
                    <p className="text-xs text-slate-400">최근 200건 조회</p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">200건</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 시스템 정보 */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-black text-slate-700 dark:text-white mb-4 text-lg">ℹ️ 시스템 정보</h3>
              <div className="space-y-3">
                {[
                  { label: '서비스명', value: 'BERAKAH 운송 관리 시스템' },
                  { label: '버전', value: 'v2.0.0' },
                  { label: '프론트엔드', value: 'React + TypeScript + Tailwind CSS' },
                  { label: '백엔드', value: 'Supabase (PostgreSQL + Storage + Realtime)' },
                  { label: '배포', value: 'Vercel' },
                  { label: '모바일 앱', value: 'Android (WebView 기반)' },
                  { label: '푸시 알림', value: 'Firebase Cloud Messaging (FCM)' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{item.label}</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-sm text-white">
              <h3 className="font-black text-xl mb-2">🚛 BERAKAH</h3>
              <p className="text-blue-200 text-sm">운송 관리 시스템</p>
              <p className="text-blue-300 text-xs mt-4">© 2024 BERAKAH. All rights reserved.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
