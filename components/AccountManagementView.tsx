import React, { useState } from 'react';
import { Vehicle, AdminAccount, PartnerAccount, Client } from '../types';

interface Props {
  vehicles: Vehicle[];
  adminAccounts: AdminAccount[];
  partnerAccounts: PartnerAccount[];
  clients: Client[];
  onSaveVehicle: (v: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
  onAddVehicle: (v: Vehicle) => void;
  onAddAdmin: (a: AdminAccount) => void;
  onUpdateAdmin: (a: AdminAccount) => void;
  onDeleteAdmin: (id: string) => void;
  onAddPartner: (p: PartnerAccount) => void;
  onUpdatePartner: (p: PartnerAccount) => void;
  onDeletePartner: (id: string) => void;
}

const AccountManagementView: React.FC<Props> = ({ 
  vehicles, 
  adminAccounts, 
  partnerAccounts,
  clients,
  onSaveVehicle, 
  onDeleteVehicle, 
  onAddVehicle,
  onAddAdmin,
  onUpdateAdmin,
  onDeleteAdmin,
  onAddPartner,
  onUpdatePartner,
  onDeletePartner
}) => {
  const [activeTab, setActiveTab] = useState<'VEHICLE' | 'PARTNER' | 'ADMIN'>('VEHICLE');
  const [isAdding, setIsAdding] = useState(false);
  const [editingPwId, setEditingPwId] = useState<string | null>(null);
  const [tempPw, setTempPw] = useState('');

  // 폼 상태들
  const [vehicleFormData, setVehicleFormData] = useState<Partial<Vehicle>>({
    vehicleNo: '',
    loginCode: '',
    password: ''
  });
  
  const [partnerFormData, setPartnerFormData] = useState<Partial<PartnerAccount>>({
    name: '',
    username: '',
    password: '',
    clientName: ''
  });

  const [newAdminData, setNewAdminData] = useState<Partial<AdminAccount>>({
    name: '',
    username: '',
    password: ''
  });

  // 중복 아이디 체크
  const isIdDuplicate = (newId: string) => {
    const isVehicleDup = vehicles.some(v => v.loginCode === newId);
    const isPartnerDup = partnerAccounts.some(p => p.username === newId);
    const isAdminDup = adminAccounts.some(a => a.username === newId);
    return isVehicleDup || isPartnerDup || isAdminDup;
  };

  const handleAddNewAdmin = () => {
    if (!newAdminData.name || !newAdminData.username || !newAdminData.password) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }
    if (isIdDuplicate(newAdminData.username)) {
      alert('이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.');
      return;
    }
    const newAdmin: AdminAccount = {
      id: `admin-${Date.now()}`,
      name: newAdminData.name || '',
      username: newAdminData.username || '',
      password: newAdminData.password || '',
    };
    onAddAdmin(newAdmin);
    setIsAdding(false);
    setNewAdminData({ name: '', username: '', password: '' });
  };

  const handleAddNewVehicle = () => {
    if (!vehicleFormData.vehicleNo || !vehicleFormData.loginCode || !vehicleFormData.password) {
      alert('차량 번호와 접속 코드(아이디), 비밀번호를 모두 입력해주세요.');
      return;
    }
    if (isIdDuplicate(vehicleFormData.loginCode)) {
      alert('이미 사용 중인 접속 코드(아이디)입니다. 다른 번호를 입력해주세요.');
      return;
    }
    
    // 🔥 [수정됨] 에러를 유발하던 expenses, status, address, regNo 모두 제거
    const newVehicle: Vehicle = {
      id: `v-${Date.now()}`,
      vehicleNo: vehicleFormData.vehicleNo || '',
      loginCode: vehicleFormData.loginCode || '',
      password: vehicleFormData.password || '',
      ownerName: '기사님', 
      phone: '',
    };
    
    onAddVehicle(newVehicle);
    setIsAdding(false);
    setVehicleFormData({ vehicleNo: '', loginCode: '', password: '' });
    alert(`${newVehicle.vehicleNo} 차량 및 기사 계정이 등록되었습니다.`);
  };

  const handleAddNewPartner = () => {
    if (!partnerFormData.name || !partnerFormData.username || !partnerFormData.password || !partnerFormData.clientName) {
      alert('협력업체 정보와 비밀번호, 매칭될 거래처를 모두 선택해주세요.');
      return;
    }
    if (isIdDuplicate(partnerFormData.username)) {
      alert('이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.');
      return;
    }
    const newPartner: PartnerAccount = {
      id: `p-${Date.now()}`,
      name: partnerFormData.name || '',
      username: partnerFormData.username || '',
      password: partnerFormData.password || '',
      clientName: partnerFormData.clientName || '',
    };
    onAddPartner(newPartner);
    setIsAdding(false);
    setPartnerFormData({ name: '', username: '', password: '', clientName: '' });
  };

  const startEditPw = (id: string, currentPw: string) => {
    setEditingPwId(id);
    setTempPw(currentPw);
  };

  const saveEditedPw = (type: 'VEHICLE' | 'PARTNER' | 'ADMIN', id: string) => {
    if (tempPw.length < 4) {
      alert('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    if (type === 'VEHICLE') {
      const vehicle = vehicles.find(v => v.id === id);
      if (vehicle) onSaveVehicle({ ...vehicle, password: tempPw });
    } else if (type === 'PARTNER') {
      const partner = partnerAccounts.find(p => p.id === id);
      if (partner) onUpdatePartner({ ...partner, password: tempPw });
    } else {
      const admin = adminAccounts.find(a => a.id === id);
      if (admin) onUpdateAdmin({ ...admin, password: tempPw });
    }
    setEditingPwId(null);
    setTempPw('');
    alert('비밀번호가 성공적으로 변경되었습니다.');
  };

  const getTabLabel = () => {
    switch(activeTab) {
      case 'VEHICLE': return '차량/기사';
      case 'PARTNER': return '협력업체';
      case 'ADMIN': return '관리자';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 h-full flex flex-col overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">계정 권한 및 보안 설정</h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">기사(차량), 협력업체, 운영진의 접속 권한 통합 관리</p>
        </div>
        <button 
          onClick={() => { setIsAdding(!isAdding); setEditingPwId(null); }}
          className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-slate-200 dark:shadow-none hover:bg-slate-800 dark:hover:bg-blue-700 transition flex items-center group"
        >
          <svg className={`w-5 h-5 mr-2 transition-transform duration-300 ${isAdding ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          {isAdding ? '닫기' : `${getTabLabel()} 신규 등록`}
        </button>
      </div>

      <div className="flex space-x-1 bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-2xl w-fit shrink-0">
        {(['VEHICLE', 'PARTNER', 'ADMIN'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => { setActiveTab(tab); setIsAdding(false); setEditingPwId(null); }}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
          >
            {tab === 'VEHICLE' ? '기사님 (차량연동)' : tab === 'PARTNER' ? '협력업체' : '관리자'}
          </button>
        ))}
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300 shrink-0">
          <h3 className="font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center">
            <span className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mr-3">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"></path></svg>
            </span>
            새 {getTabLabel()} 등록
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeTab === 'VEHICLE' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Vehicle Number (차량번호)</label>
                  <input type="text" placeholder="예: 5017" className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 font-bold dark:text-white" value={vehicleFormData.vehicleNo} onChange={e => setVehicleFormData({...vehicleFormData, vehicleNo: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Login ID (접속용 4자리)</label>
                  <input type="text" placeholder="예: 5017" className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 font-bold dark:text-white" value={vehicleFormData.loginCode} onChange={e => setVehicleFormData({...vehicleFormData, loginCode: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Password</label>
                  <input type="password" placeholder="초기 비밀번호" className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 dark:text-white" value={vehicleFormData.password} onChange={e => setVehicleFormData({...vehicleFormData, password: e.target.value})} />
                </div>
              </>
            )}
            {activeTab === 'PARTNER' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Partner Name</label>
                  <input type="text" placeholder="담당자 성함" className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 dark:text-white" value={partnerFormData.name} onChange={e => setPartnerFormData({...partnerFormData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Login ID</label>
                  <input type="text" placeholder="아이디 (예: 0000)" className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 font-bold dark:text-white" value={partnerFormData.username} onChange={e => setPartnerFormData({...partnerFormData, username: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Client Match</label>
                  <select className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 font-bold dark:text-white" value={partnerFormData.clientName} onChange={e => setPartnerFormData({...partnerFormData, clientName: e.target.value})}>
                    <option value="">담당 거래처 선택</option>
                    {clients.map(c => <option key={c.id} value={c.clientName}>{c.clientName}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Password</label>
                  <input type="password" placeholder="비밀번호" className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 dark:text-white" value={partnerFormData.password} onChange={e => setPartnerFormData({...partnerFormData, password: e.target.value})} />
                </div>
              </>
            )}
            {activeTab === 'ADMIN' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Admin Name</label>
                  <input type="text" placeholder="관리자 이름" className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 dark:text-white" value={newAdminData.name} onChange={e => setNewAdminData({...newAdminData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Login ID</label>
                  <input type="text" placeholder="접속 아이디" className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 font-bold dark:text-white" value={newAdminData.username} onChange={e => setNewAdminData({...newAdminData, username: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">Password</label>
                  <input type="password" placeholder="비밀번호" className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 dark:text-white" value={newAdminData.password} onChange={e => setNewAdminData({...newAdminData, password: e.target.value})} />
                </div>
              </>
            )}
            <div className="md:col-span-3 flex justify-end mt-4">
              <button 
                onClick={() => {
                  if(activeTab === 'VEHICLE') handleAddNewVehicle();
                  else if(activeTab === 'PARTNER') handleAddNewPartner();
                  else handleAddNewAdmin();
                }}
                className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 transition active:scale-95"
              >
                계정 등록 및 저장
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] border-b dark:border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="px-8 py-6">사용자 정보</th>
                <th className="px-8 py-6">접속 아이디</th>
                <th className="px-8 py-6 text-center">보안/암호</th>
                <th className="px-8 py-6 text-center">계정 제어</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {activeTab === 'VEHICLE' && vehicles.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-600 mr-4 font-black text-[10px]">VEH</div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 dark:text-slate-100">{v.vehicleNo}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{v.ownerName || '미입력'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-600 dark:text-slate-400 font-bold">{v.loginCode}</td>
                  <td className="px-8 py-5 text-center">
                    {editingPwId === v.id ? (
                      <div className="flex items-center justify-center space-x-2">
                        <input type="text" value={tempPw} onChange={e => setTempPw(e.target.value)} className="border border-blue-300 rounded-lg px-3 py-1 text-xs outline-none w-28 font-bold dark:bg-slate-800 dark:text-white" autoFocus />
                        <button onClick={() => saveEditedPw('VEHICLE', v.id)} className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </button>
                        <button onClick={() => setEditingPwId(null)} className="bg-slate-200 dark:bg-slate-700 text-slate-500 p-1.5 rounded-lg transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEditPw(v.id, v.password || '')} className="text-[10px] font-black text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900 transition-all">암호 변경</button>
                    )}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <button 
                      onClick={() => { if(window.confirm(`${v.vehicleNo} 차량 및 기사 계정을 삭제하시겠습니까?\n삭제 시 마스터 차량 목록에서도 제거됩니다.`)) onDeleteVehicle(v.id); }} 
                      className="text-red-400 hover:text-red-600 transition-colors p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30"
                      title="계정 삭제"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </td>
                </tr>
              ))}

              {activeTab === 'PARTNER' && partnerAccounts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-500 mr-4 font-black text-[10px]">PRT</div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 dark:text-slate-100">{p.name}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">매칭: {p.clientName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-600 dark:text-slate-400 font-bold">{p.username}</td>
                  <td className="px-8 py-5 text-center">
                    {editingPwId === p.id ? (
                      <div className="flex items-center justify-center space-x-2">
                        <input type="text" value={tempPw} onChange={e => setTempPw(e.target.value)} className="border border-blue-300 rounded-lg px-3 py-1 text-xs outline-none w-28 font-bold dark:bg-slate-800 dark:text-white" autoFocus />
                        <button onClick={() => saveEditedPw('PARTNER', p.id)} className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </button>
                        <button onClick={() => setEditingPwId(null)} className="bg-slate-200 dark:bg-slate-700 text-slate-500 p-1.5 rounded-lg transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEditPw(p.id, p.password)} className="text-[10px] font-black text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900 transition-all">암호 변경</button>
                    )}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <button 
                      onClick={() => { if(window.confirm(`${p.name} 협력업체 계정을 삭제하시겠습니까?`)) onDeletePartner(p.id); }} 
                      className="text-red-400 hover:text-red-600 transition-colors p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30"
                      title="계정 삭제"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </td>
                </tr>
              ))}

              {activeTab === 'ADMIN' && adminAccounts.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-500 mr-4 font-black text-[10px]">ADM</div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 dark:text-slate-100">{a.name}</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">{a.id === 'admin-master' ? '마스터 관리자' : '일반 관리자'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-600 dark:text-slate-400 font-bold">{a.username}</td>
                  <td className="px-8 py-5 text-center">
                    {editingPwId === a.id ? (
                      <div className="flex items-center justify-center space-x-2">
                        <input type="text" value={tempPw} onChange={e => setTempPw(e.target.value)} className="border border-blue-300 rounded-lg px-3 py-1 text-xs outline-none w-28 font-bold dark:bg-slate-800 dark:text-white" autoFocus />
                        <button onClick={() => saveEditedPw('ADMIN', a.id)} className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        </button>
                        <button onClick={() => setEditingPwId(null)} className="bg-slate-200 dark:bg-slate-700 text-slate-500 p-1.5 rounded-lg transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEditPw(a.id, a.password)} className="text-[10px] font-black text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900 transition-all">암호 변경</button>
                    )}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <button 
                      disabled={a.id === 'admin-master'}
                      onClick={() => { if(window.confirm(`${a.name} 관리자 계정을 삭제하시겠습니까?`)) onDeleteAdmin(a.id); }} 
                      className={`transition-colors p-2 rounded-xl ${a.id === 'admin-master' ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' : 'text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'}`}
                      title={a.id === 'admin-master' ? '마스터 계정은 삭제 불가' : '계정 삭제'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(activeTab === 'VEHICLE' && vehicles.length === 0) || (activeTab === 'PARTNER' && partnerAccounts.length === 0) || (activeTab === 'ADMIN' && adminAccounts.length === 0) ? (
            <div className="p-20 text-center text-slate-300 font-bold italic">등록된 계정이 없습니다.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AccountManagementView;