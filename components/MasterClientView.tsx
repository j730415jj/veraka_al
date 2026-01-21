import React, { useState, useEffect } from 'react';
import { Client } from '../types';

interface MasterClientViewProps {
  clients: Client[];
  onSave: (client: Client) => void;
  onDelete: (id: string) => void;
}

const MasterClientView: React.FC<MasterClientViewProps> = ({ clients, onSave, onDelete }) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // 입력 폼 상태 (지점 목록 branches 포함 + 새로 추가된 필드들)
  const [form, setForm] = useState<{
    clientName: string;
    presidentName: string;
    businessNo: string;
    phone: string;
    branches: string[]; 
    // 👇 [추가] 상세 정보 필드
    address: string;
    fax: string;
    businessType: string; // 업태
    category: string;     // 종목
  }>({
    clientName: '',
    presidentName: '',
    businessNo: '',
    phone: '',
    branches: [],
    // 👇 초기화
    address: '',
    fax: '',
    businessType: '',
    category: ''
  });

  const [branchInput, setBranchInput] = useState(''); // 지점 입력 임시 저장소
  const [searchTerm, setSearchTerm] = useState('');

  // 리스트에서 거래처를 클릭했을 때 입력칸에 채워넣기
  useEffect(() => {
    if (selectedClient) {
      setForm({
        clientName: selectedClient.clientName || '',
        presidentName: selectedClient.presidentName || '',
        businessNo: selectedClient.businessNo || '',
        phone: selectedClient.phone || '',
        branches: selectedClient.branches || [],
        // 👇 선택된 데이터 불러오기
        address: selectedClient.address || '',
        fax: selectedClient.fax || '',
        businessType: selectedClient.businessType || '',
        category: selectedClient.category || ''
      });
    } else {
      // 선택 해제되면 초기화
      setForm({ 
          clientName: '', presidentName: '', businessNo: '', phone: '', branches: [],
          address: '', fax: '', businessType: '', category: '' 
      });
    }
    setBranchInput('');
  }, [selectedClient]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // 지점 추가 함수
  const handleAddBranch = () => {
    if (branchInput.trim()) {
      setForm(prev => ({
        ...prev,
        branches: [...prev.branches, branchInput.trim()]
      }));
      setBranchInput('');
    }
  };

  // 지점 삭제 함수
  const handleRemoveBranch = (index: number) => {
    setForm(prev => ({
      ...prev,
      branches: prev.branches.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    if (!form.clientName) {
        alert("거래처 이름을 입력해주세요.");
        return;
    }

    const clientData: Client = {
      id: selectedClient ? selectedClient.id : 'temp-' + Date.now(),
      clientName: form.clientName,
      presidentName: form.presidentName,
      businessNo: form.businessNo,
      phone: form.phone,
      branches: form.branches,
      // 👇 새로 추가된 필드도 함께 저장
      address: form.address,
      fax: form.fax,
      businessType: form.businessType,
      category: form.category
    };
    
    onSave(clientData);
    
    // 저장 후 초기화
    if (!selectedClient) {
        setForm({ 
            clientName: '', presidentName: '', businessNo: '', phone: '', branches: [],
            address: '', fax: '', businessType: '', category: ''
        });
    }
  };

  const filteredClients = clients.filter(c => 
    c.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full gap-4 p-4">
      {/* 왼쪽: 거래처 목록 리스트 */}
      <div className="w-1/3 bg-white rounded-lg shadow p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">거래처 목록</h2>
          <button 
            onClick={() => setSelectedClient(null)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
          >
            신규 등록
          </button>
        </div>

        <input 
          type="text"
          placeholder="상호명 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded mb-4 bg-slate-50"
        />

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredClients.map(client => (
            <div 
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className={`p-3 rounded cursor-pointer border hover:bg-blue-50 transition ${
                selectedClient?.id === client.id ? 'bg-blue-100 border-blue-300' : 'bg-white border-slate-200'
              }`}
            >
              <div className="font-bold text-slate-800">{client.clientName}</div>
              <div className="text-xs text-slate-500">
                {client.presidentName} | {client.branches && client.branches.length > 0 ? `지점 ${client.branches.length}개` : '본점'}
              </div>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="text-center text-slate-400 py-8">검색 결과가 없습니다.</div>
          )}
        </div>
      </div>

      {/* 오른쪽: 입력/수정 폼 */}
      <div className="flex-1 bg-white rounded-lg shadow p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {selectedClient ? `${selectedClient.clientName} 정보 수정` : '새 거래처 등록'}
            </h2>
          </div>
          {selectedClient && (
             <button 
               onClick={() => onDelete(selectedClient.id!)}
               className="text-red-500 hover:text-red-700 underline text-sm"
             >
               거래처 삭제
             </button>
          )}
        </div>

        <div className="space-y-6 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">거래처명 (상호) <span className="text-red-500">*</span></label>
            <input 
              name="clientName"
              value={form.clientName}
              onChange={handleInputChange}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="예: 베라카 물류"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">대표자 성함</label>
                <input 
                name="presidentName"
                value={form.presidentName}
                onChange={handleInputChange}
                className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">사업자 등록번호</label>
                <input 
                name="businessNo"
                value={form.businessNo}
                onChange={handleInputChange}
                className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
          </div>

          {/* 👇 [추가됨] 업태 / 종목 입력란 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">업태</label>
                <input 
                name="businessType"
                value={form.businessType}
                onChange={handleInputChange}
                className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="예: 운수업"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">종목</label>
                <input 
                name="category"
                value={form.category}
                onChange={handleInputChange}
                className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="예: 화물운송"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">전화번호</label>
                <input 
                name="phone"
                value={form.phone}
                onChange={handleInputChange}
                className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            {/* 👇 [추가됨] 팩스번호 입력란 */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">팩스번호</label>
                <input 
                name="fax"
                value={form.fax}
                onChange={handleInputChange}
                className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="02-1234-5678"
                />
            </div>
          </div>

          {/* 👇 [추가됨] 주소 입력란 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">사업장 주소</label>
            <input 
              name="address"
              value={form.address}
              onChange={handleInputChange}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="예: 서울특별시 강남구..."
            />
          </div>

          {/* ✨ 지점 관리 섹션 (기존 기능 유지) ✨ */}
          <div className="p-4 bg-slate-50 rounded border border-slate-200">
            <label className="block text-sm font-bold text-slate-700 mb-2">지점 관리</label>
            <div className="flex gap-2 mb-3">
              <input 
                value={branchInput}
                onChange={(e) => setBranchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddBranch()}
                className="flex-1 p-2 border rounded text-sm"
                placeholder="지점명 입력 (예: 강남점)"
              />
              <button 
                onClick={handleAddBranch}
                className="px-4 py-2 bg-slate-600 text-white text-sm rounded hover:bg-slate-700"
              >
                추가
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {form.branches.map((branch, index) => (
                <div key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2">
                  <span>{branch}</span>
                  <button 
                    onClick={() => handleRemoveBranch(index)}
                    className="text-blue-400 hover:text-red-500 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
              {form.branches.length === 0 && (
                <span className="text-xs text-slate-400">등록된 지점이 없습니다.</span>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
             {selectedClient && (
               <button 
                 onClick={() => setSelectedClient(null)}
                 className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded"
               >
                 취소
               </button>
             )}
             <button 
               onClick={handleSubmit}
               className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-md transition transform active:scale-95"
             >
               {selectedClient ? '수정 내용 저장' : '신규 등록 완료'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterClientView;