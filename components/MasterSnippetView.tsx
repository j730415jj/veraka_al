
import React, { useState, useMemo } from 'react';
import { Snippet, Client } from '../types';

interface Props {
  snippets: Snippet[];
  clients: Client[];
  onSave: (s: Snippet) => void;
  onDelete: (id: string) => void;
}

const MasterSnippetView: React.FC<Props> = ({ snippets, clients, onSave, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<Partial<Snippet>>({
    keyword: '',
    clientName: '',
    origin: '',
    destination: '',
    item: ''
  });

  const filteredList = useMemo(() => {
    return snippets.filter(s => 
      s.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.origin.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [snippets, searchTerm]);

  const handleSelect = (s: Snippet) => {
    setSelectedId(s.id);
    setFormData(s);
    setIsEditing(false);
  };

  const handleAddNew = () => {
    setSelectedId(null);
    setFormData({ keyword: '', clientName: '', origin: '', destination: '', item: '' });
    setIsEditing(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.keyword || !formData.origin || !formData.destination) {
      alert('키워드와 상하차지는 필수입니다.');
      return;
    }
    const newData: Snippet = { ...formData as Snippet, id: selectedId || `sn${Date.now()}` };
    onSave(newData);
    setSelectedId(newData.id);
    setIsEditing(false);
    alert('스니펫이 저장되었습니다.');
  };

  return (
    <div className="flex h-[calc(100vh-180px)] space-x-6">
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-700 text-sm">배차 스니펫 목록</h3>
          <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-3 py-1.5 rounded font-black transition">신규 추가</button>
        </div>
        <div className="p-3 border-b border-gray-100">
          <input type="text" placeholder="키워드 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full text-xs border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredList.map(s => (
            <button key={s.id} onClick={() => handleSelect(s)} className={`w-full text-left p-4 border-b border-gray-50 transition-colors hover:bg-blue-50 ${selectedId === s.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-black text-blue-600 text-[13px]">#{s.keyword}</span>
                <span className="text-[10px] text-gray-400 font-bold">{s.clientName}</span>
              </div>
              <div className="text-[11px] text-gray-500 font-bold truncate">
                {s.origin} → {s.destination}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-700 text-sm">{selectedId ? '스니펫 상세' : '신규 스니펫 등록'}</h3>
          {selectedId && !isEditing && <button onClick={() => setIsEditing(true)} className="bg-blue-100 text-blue-700 text-[10px] px-4 py-1.5 rounded-lg font-black hover:bg-blue-200 transition">수정하기</button>}
        </div>
        <form onSubmit={handleSubmit} className="flex-1 p-8 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black text-blue-500 uppercase">단축 키워드 (예: 포스코)</label>
              <input type="text" name="keyword" value={formData.keyword || ''} onChange={handleInputChange} disabled={!isEditing && !!selectedId} placeholder="배차창에서 입력 시 자동완성될 단어" className="w-full border-2 border-blue-50 rounded-lg px-4 py-3 text-lg font-black text-blue-600 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase">거래처 연동</label>
              <select name="clientName" value={formData.clientName} onChange={handleInputChange} disabled={!isEditing && !!selectedId} className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50 font-bold">
                <option value="">거래처 선택 (선택사항)</option>
                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase">품명 연동</label>
              <input type="text" name="item" value={formData.item || ''} onChange={handleInputChange} disabled={!isEditing && !!selectedId} placeholder="자동 입력될 품명" className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase">상차지 연동</label>
              <input type="text" name="origin" value={formData.origin || ''} onChange={handleInputChange} disabled={!isEditing && !!selectedId} placeholder="자동 입력될 상차지" className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase">하차지 연동</label>
              <input type="text" name="destination" value={formData.destination || ''} onChange={handleInputChange} disabled={!isEditing && !!selectedId} placeholder="자동 입력될 하차지" className="w-full border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-50" />
            </div>
          </div>
          {(isEditing || !selectedId) && (
            <div className="mt-12 flex items-center justify-end space-x-3 border-t pt-8">
              <button type="button" onClick={() => { if(selectedId) { handleSelect(snippets.find(s => s.id === selectedId)!); } else { handleAddNew(); } }} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition text-sm">취소</button>
              <button type="submit" className="bg-blue-600 text-white px-10 py-2.5 rounded-xl font-black hover:bg-blue-700 shadow-md transition text-sm">스니펫 저장</button>
            </div>
          )}
          {selectedId && !isEditing && (
            <div className="mt-12 border-t pt-8">
              <button type="button" onClick={() => { if(window.confirm('정말 삭제하시겠습니까?')) { onDelete(selectedId); handleAddNew(); } }} className="text-red-500 font-bold text-xs hover:underline">이 스니펫 삭제하기</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default MasterSnippetView;
