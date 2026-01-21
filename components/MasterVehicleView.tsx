
import React, { useState, useMemo, useEffect } from 'react';
import { Vehicle, UserRole, Expense } from '../types';

interface Props {
  vehicles: Vehicle[];
  userRole?: UserRole;
  onSave: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
}

const MasterVehicleView: React.FC<Props> = ({ vehicles, userRole, onSave, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const isVehicleMode = userRole === 'VEHICLE';

  // 기사님 전용 지출 추가 상태
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    category: '유류비',
    amount: 0,
    description: ''
  });

  // 관리자용 차량 정보 폼 상태
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    vehicleNo: '',
    ownerName: '',
    phone: '',
    regNo: '',
    address: '',
    expenses: []
  });

  useEffect(() => {
    if (isVehicleMode && vehicles.length > 0) {
      const v = vehicles[0];
      setSelectedVehicleId(v.id);
      setFormData(v);
    }
  }, [isVehicleMode, vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => 
      v.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);

  const handleAddExpense = () => {
    if (!newExpense.amount || newExpense.amount <= 0) {
      alert('금액을 입력해주세요.');
      return;
    }

    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return;

    const expense: Expense = {
      id: `exp-${Date.now()}`,
      date: newExpense.date || new Date().toISOString().split('T')[0],
      category: newExpense.category as any,
      amount: Number(newExpense.amount),
      description: newExpense.description || ''
    };

    const updatedVehicle: Vehicle = {
      ...vehicle,
      expenses: [expense, ...(vehicle.expenses || [])]
    };

    onSave(updatedVehicle);
    setNewExpense({
      date: new Date().toISOString().split('T')[0],
      category: '유류비',
      amount: 0,
      description: ''
    });
    alert('지출 내역이 추가되었습니다.');
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (!window.confirm('이 지출 내역을 삭제하시겠습니까?')) return;

    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return;

    const updatedVehicle: Vehicle = {
      ...vehicle,
      expenses: (vehicle.expenses || []).filter(e => e.id !== expenseId)
    };

    onSave(updatedVehicle);
  };

  // 차량 선택 핸들러
  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicleId(vehicle.id);
    setFormData(vehicle);
    setIsEditing(false);
  };

  // 신규 차량 등록 핸들러
  const handleAddNew = () => {
    setSelectedVehicleId(null);
    setFormData({
      vehicleNo: '',
      ownerName: '',
      phone: '',
      regNo: '',
      address: '',
      expenses: []
    });
    setIsEditing(true);
  };

  // 차량 삭제 핸들러
  const handleDelete = () => {
    if (selectedVehicleId && window.confirm('정말 삭제하시겠습니까?')) {
      onDelete(selectedVehicleId);
      handleAddNew();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? Number(value) : value 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleNo) {
      alert('차량번호를 입력해주세요.');
      return;
    }
    
    const newVehicle: Vehicle = {
      ...formData as Vehicle,
      id: selectedVehicleId || `v${Date.now()}`
    };
    
    onSave(newVehicle);
    setSelectedVehicleId(newVehicle.id);
    if (!isVehicleMode) setIsEditing(false);
    alert('저장되었습니다.');
  };

  // 기사님 모드 UI (여러 번 적을 수 있는 지출 리스트 구조)
  if (isVehicleMode) {
    const currentVehicle = vehicles.find(v => v.id === selectedVehicleId);
    const expenses = currentVehicle?.expenses || [];
    const totalMonthExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
      <div className="flex flex-col items-center p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-20">
        {/* 요약 카드 */}
        <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black">{currentVehicle?.vehicleNo}</h3>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Expense Tracker</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-[10px] font-black uppercase">이번 달 누적 지출</p>
                <p className="text-3xl font-black text-blue-400">₩{totalMonthExpense.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* 입력 섹션 */}
        <div className="w-full bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <h4 className="font-black text-slate-800 dark:text-slate-100 mb-4 flex items-center">
            <span className="w-1.5 h-4 bg-blue-500 mr-2 rounded-full"></span>
            지출 내역 추가
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">날짜</label>
              <input 
                type="date" 
                value={newExpense.date}
                onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold dark:text-slate-100" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">항목</label>
              <select 
                value={newExpense.category}
                onChange={e => setNewExpense({...newExpense, category: e.target.value as any})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold dark:text-slate-100"
              >
                <option value="유류비">⛽ 유류비</option>
                <option value="정비비">🔧 정비비</option>
                <option value="기타">💳 기타지출</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">금액 (원)</label>
              <input 
                type="number" 
                placeholder="0"
                value={newExpense.amount || ''}
                onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-black text-blue-600 dark:text-blue-400"
              />
            </div>
            <button 
              onClick={handleAddExpense}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-black text-sm shadow-lg shadow-blue-100 transition active:scale-95 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
              <span>추가하기</span>
            </button>
            <div className="md:col-span-4 space-y-1 mt-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">상세 메모 (선택)</label>
              <input 
                type="text" 
                placeholder="예: 현대오일뱅크 가득, 타이어 2개 교체 등"
                value={newExpense.description}
                onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* 내역 리스트 */}
        <div className="w-full bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h4 className="font-black text-slate-800 dark:text-slate-100 flex items-center">
              <span className="w-1.5 h-4 bg-emerald-500 mr-2 rounded-full"></span>
              최근 지출 내역
            </h4>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total {expenses.length} Records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">날짜</th>
                  <th className="px-6 py-4">카테고리</th>
                  <th className="px-6 py-4">설명</th>
                  <th className="px-6 py-4 text-right">금액</th>
                  <th className="px-6 py-4 text-center">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400">{exp.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                        exp.category === '유류비' ? 'bg-red-50 dark:bg-red-900/30 text-red-600' :
                        exp.category === '정비비' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600'
                      }`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[150px]">{exp.description || '-'}</td>
                    <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-slate-100">₩{exp.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold italic">기록된 지출 내역이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 관리자 모드 UI (목록 포함)
  return (
    <div className="flex h-[calc(100vh-180px)] space-x-6">
      {/* Left Pane: Vehicle List */}
      <div className="w-1/3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 dark:text-slate-200">차량 목록</h3>
          <button 
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded flex items-center transition"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            신규 등록
          </button>
        </div>
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <input 
              type="text" 
              placeholder="차량번호 또는 이름 검색" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 pl-9 outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100"
            />
            <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredVehicles.map(vehicle => {
            const totalExp = (vehicle.expenses || []).reduce((sum, e) => sum + e.amount, 0);
            return (
              <button
                key={vehicle.id}
                onClick={() => handleSelectVehicle(vehicle)}
                className={`w-full text-left p-4 border-b border-slate-50 dark:border-slate-800 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${selectedVehicleId === vehicle.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-600' : ''}`}
              >
                <div className="font-bold text-slate-800 dark:text-slate-100">{vehicle.vehicleNo}</div>
                <div className="text-xs text-slate-500 mt-1 flex justify-between">
                  <span>이름: {vehicle.ownerName || '-'}</span>
                  <span className="text-red-500 dark:text-red-400 font-bold">지출: {totalExp.toLocaleString()}원</span>
                </div>
              </button>
            );
          })}
          {filteredVehicles.length === 0 && (
            <div className="p-10 text-center text-slate-400 text-sm">검색 결과가 없습니다.</div>
          )}
        </div>
      </div>

      {/* Right Pane: Detail/Edit Form */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 dark:text-slate-200">
            {selectedVehicleId ? '차량 상세 정보' : '신규 차량 등록'}
          </h3>
          {selectedVehicleId && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs px-4 py-1.5 rounded-lg font-bold hover:bg-blue-200 transition"
            >
              기본 정보 수정
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">차량번호 (필수)</label>
              <input 
                type="text" 
                name="vehicleNo"
                value={formData.vehicleNo || ''}
                onChange={handleInputChange}
                disabled={!isEditing && !!selectedVehicleId}
                placeholder="예: 경북06모 5017"
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50 dark:disabled:bg-slate-800 dark:bg-slate-800 dark:text-slate-100 font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">이름 (차주)</label>
              <input 
                type="text" 
                name="ownerName"
                value={formData.ownerName || ''}
                onChange={handleInputChange}
                disabled={!isEditing && !!selectedVehicleId}
                placeholder="차주 성함을 입력하세요"
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50 dark:disabled:bg-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1 mt-4">
              <label className="text-xs font-bold text-slate-500">전화번호</label>
              <input 
                type="text" 
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                disabled={!isEditing && !!selectedVehicleId}
                placeholder="010-0000-0000"
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50 dark:disabled:bg-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1 mt-4">
              <label className="text-xs font-bold text-slate-500">사업자번호</label>
              <input 
                type="text" 
                name="regNo"
                value={formData.regNo || ''}
                onChange={handleInputChange}
                disabled={!isEditing && !!selectedVehicleId}
                placeholder="000-00-00000"
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50 dark:disabled:bg-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500">주소</label>
              <input 
                type="text" 
                name="address"
                value={formData.address || ''}
                onChange={handleInputChange}
                disabled={!isEditing && !!selectedVehicleId}
                placeholder="상세 주소를 입력하세요"
                className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-50 dark:disabled:bg-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* 관리자 모드 지출 내역 표시 */}
          {selectedVehicleId && (
            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-8">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-4">현재 등록된 지출 내역</h4>
              <div className="space-y-2">
                {(formData.expenses || []).map(exp => (
                  <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs">
                    <div className="flex items-center space-x-3">
                      <span className="text-slate-400 font-bold">{exp.date}</span>
                      <span className="font-black text-blue-600">{exp.category}</span>
                      <span className="text-slate-500">{exp.description}</span>
                    </div>
                    <span className="font-black">₩{exp.amount.toLocaleString()}</span>
                  </div>
                ))}
                {(formData.expenses || []).length === 0 && (
                  <p className="text-xs text-slate-400 italic">내역이 없습니다.</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-12 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-8">
            <div>
              {selectedVehicleId && (
                <button 
                  type="button"
                  onClick={handleDelete}
                  className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-6 py-2.5 rounded-xl font-bold hover:bg-red-100 transition flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  차량 삭제
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              {(isEditing || !selectedVehicleId) && (
                <>
                  <button 
                    type="button"
                    onClick={() => {
                      if(selectedVehicleId) {
                        handleSelectVehicle(vehicles.find(v => v.id === selectedVehicleId)!);
                      } else {
                        handleAddNew();
                      }
                    }}
                    className="px-6 py-2.5 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    취소
                  </button>
                  <button 
                    type="submit"
                    className="bg-blue-600 text-white px-10 py-2.5 rounded-xl font-black hover:bg-blue-700 shadow-md transition flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    정보 저장
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MasterVehicleView;
