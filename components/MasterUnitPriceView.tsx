import React, { useState, useMemo } from 'react';
import { UnitPriceMaster, Client } from '../types';

interface Props {
  unitPrices: UnitPriceMaster[];
  clients: Client[];
  onSave: (up: UnitPriceMaster) => void;
  onDelete: (id: string) => void;
}

const MasterUnitPriceView: React.FC<Props> = ({ unitPrices, clients, onSave, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<Partial<UnitPriceMaster>>({
    clientName: '',
    branchName: '',
    origin: '',
    destination: '',
    item: '',
    unitPrice: 0,
    clientUnitPrice: 0
  });

  const filteredList = useMemo(() => {
    return unitPrices.filter(up => 
      up.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (up.branchName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      up.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      up.destination.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [unitPrices, searchTerm]);

  const handleSelect = (up: UnitPriceMaster) => {
    setSelectedId(up.id);
    setFormData(up);
    setIsEditing(false);
  };

  const handleAddNew = () => {
    setSelectedId(null);
    setFormData({ clientName: '', branchName: '', origin: '', destination: '', item: '', unitPrice: 0, clientUnitPrice: 0 });
    setIsEditing(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: (name === 'unitPrice' || name === 'clientUnitPrice') ? Number(value) : value 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.origin || !formData.destination) {
      alert('필수 정보를 모두 입력하세요.');
      return;
    }
    const newData: UnitPriceMaster = { ...formData as UnitPriceMaster, id: selectedId || `up${Date.now()}` };
    onSave(newData);
    setSelectedId(newData.id);
    setIsEditing(false);
    alert('저장되었습니다.');
  };

  return (
    <div className="flex h-[calc(100vh-180px)] space-x-6 p-4">
      <div className="w-2/5 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-700 text-sm">표준 단가 목록</h3><button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-3 py-1.5 rounded font-black transition">단가 신규 등록</button></div>
        <div className="p-3 border-b border-gray-100"><input type="text" placeholder="업체/지점/상하차지 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full text-xs border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500" /></div>
        <div className="flex-1 overflow-y-auto">
          {filteredList.map(up => (
            <button key={up.id} onClick={() => handleSelect(up)} className={`w-full text-left p-4 border-b border-gray-50 transition-colors hover:bg-blue-50 ${selectedId === up.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}>
              <div className="flex justify-between items-center mb-1"><span className="font-black text-gray-800 text-[13px]">{up.clientName} {up.branchName ? <span className="text-blue-500 text-[10px] ml-1">[{up.branchName}]</span> : ''}</span><div className="flex flex-col items-end"><span className="text-blue-600 font-black text-[11px]">차량: ₩{up.unitPrice.toLocaleString()}</span><span className="text-rose-600 font-black text-[11px]">거래처: ₩{(up.clientUnitPrice || 0).toLocaleString()}</span></div></div>
              <div className="text-[11px] text-gray-500 font-bold">{up.origin} <span className="text-gray-300">→</span> {up.destination}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-700 text-sm">{selectedId ? '단가 정보 상세' : '신규 단가 등록'}</h3>{selectedId && !isEditing && <button onClick={() => setIsEditing(true)} className="bg-blue-100 text-blue-700 text-[10px] px-4 py-1.5 rounded-lg font-black hover:bg-blue-200 transition">수정하기</button>}</div>
        <form onSubmit={handleSubmit} className="flex-1 p-8 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase">거래처명 (업체)</label>
              <select name="clientName" value={formData.clientName} onChange={handleInputChange} disabled={!isEditing && !!selectedId} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50 font-bold">
                <option value="">거래처 선택</option>
                {/* ✨ [수정 완료] c.name -> c.clientName 으로 변경해서 목록이 잘 나오게 했습니다! */}
                {Array.from(new Set(clients.map(c => c.clientName))).map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="space-y-1"><label className="text-[10px] font-black text-blue-500 uppercase">지점명 (거래처)</label>
              <input type="text" name="branchName" value={formData.branchName || ''} onChange={handleInputChange} disabled={!isEditing && !!selectedId} placeholder="예: 포항지점 (없으면 공란)" className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50" />
            </div>
            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase">표준 품명</label><input type="text" name="item" value={formData.item || ''} onChange={handleInputChange} disabled={!isEditing && !!selectedId} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50" /></div>
            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase">상차지</label><input type="text" name="origin" value={formData.origin || ''} onChange={handleInputChange} disabled={!isEditing && !!selectedId} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50" /></div>
            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase">하차지</label><input type="text" name="destination" value={formData.destination || ''} onChange={handleInputChange} disabled={!isEditing && !!selectedId} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50" /></div>
            <div className="space-y-1"><label className="text-[10px] font-black text-blue-500 uppercase">표준 차량 단가 (₩)</label><input type="number" name="unitPrice" value={formData.unitPrice || 0} onChange={handleInputChange} disabled={!isEditing && !!selectedId} className="w-full border-2 border-blue-100 rounded-lg px-4 py-3 text-lg font-black text-blue-600 outline-none disabled:bg-gray-50" /></div>
            <div className="space-y-1"><label className="text-[10px] font-black text-rose-500 uppercase">표준 거래처 단가 (₩)</label><input type="number" name="clientUnitPrice" value={formData.clientUnitPrice || 0} onChange={handleInputChange} disabled={!isEditing && !!selectedId} className="w-full border-2 border-rose-100 rounded-lg px-4 py-3 text-lg font-black text-rose-600 outline-none disabled:bg-gray-50" /></div>
          </div>
          {(isEditing || !selectedId) && (<div className="mt-12 flex items-center justify-end space-x-3 border-t pt-8"><button type="button" onClick={() => selectedId ? handleSelect(unitPrices.find(u => u.id === selectedId)!) : handleAddNew()} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition text-sm">취소</button><button type="submit" className="bg-blue-600 text-white px-10 py-2.5 rounded-xl font-black hover:bg-blue-700 shadow-md transition text-sm">설정 저장</button></div>)}
        </form>
      </div>
    </div>
  );
};

export default MasterUnitPriceView;