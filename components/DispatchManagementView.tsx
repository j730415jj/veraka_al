import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthUser, Dispatch, Vehicle, Client, Snippet, Operation, ViewType, UnitPriceMaster } from '../types';
import { supabase } from '../supabase';
import { Camera, CheckCircle } from 'lucide-react';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbG52ZWRwanR4dHpqcHJraGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwNjM1NDcsImV4cCI6MjA1MzYzOTU0N30.yCVDdBmeCGBnKx2ITNF0KWXQ3GH6ZxDyRKoVPGu9FcE';

const uploadToNAS = async (imageBase64: string, fileName: string): Promise<string | null> => {
  try {
    const res = await fetch('https://yglnvedpjtxtzjprkhjp.supabase.co/functions/v1/upload-to-nas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ imageBase64, fileName })
    });
    const data = await res.json();
    if (data.success) return data.nasUrl;
    return null;
  } catch (err) { console.warn('NAS 筌��닀�궧占쎌굷筌��꼷彛좑옙�긿筌��꼹�궙占쎌긿 筌��닀�궆筌욎떝肄э옙�궋筌욑옙:', err); return null; }
};

interface Props {
  user: AuthUser;
  dispatches: Dispatch[];
  vehicles: Vehicle[];
  clients: Client[];
  snippets: Snippet[];
  operations: Operation[];
  unitPrices: UnitPriceMaster[];
  onAddDispatch: (d: Dispatch) => void;
  onAddSnippet: (s: Snippet) => void;
  onAddOperation: (op: Operation) => void; 
  onUpdateDispatch: (d: Dispatch) => void;
  onDeleteDispatch: (id: string) => void;
  onUpdateStatus: (id: string, status: 'pending' | 'sent' | 'completed', photo?: string, manualQuantity?: number) => void;
  onNavigate?: (view: ViewType) => void;
  onUpdateOperation?: (op: Operation) => void;
}

const DispatchManagementView: React.FC<Props> = ({ 
  user, dispatches, vehicles, clients, snippets, operations, unitPrices = [],
  onAddDispatch, onAddSnippet, onAddOperation, onUpdateDispatch, onDeleteDispatch, onUpdateStatus, onNavigate, onUpdateOperation
}) => {
  const [newDispatch, setNewDispatch] = useState({ vehicleNo: '', clientName: '', origin: '', destination: '', item: '', count: 1, remarks: '' });
  const [dispatchType, setDispatchType] = useState<'SALES' | 'PURCHASE'>('SALES');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Dispatch | null>(null);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [activeDispatchId, setActiveDispatchId] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [rotation, setRotation] = useState(0); 
  const [zoomScale, setZoomScale] = useState(1);
  const [modalQuantity, setModalQuantity] = useState('');
  const [cardQuantities, setCardQuantities] = useState<Record<string, string>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || user.role !== 'VEHICLE') return;
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await supabase.from('vehicles').update({ lat: latitude, lng: longitude }).eq('id', user.id);
      },
      (error) => console.error("GPS 筌��닀�궧占쎌궔筌��꼹�깑筌욑옙:", error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user]);

  const uniqueClientNames = useMemo(() => Array.from(new Set(clients.map(c => c.clientName))).sort(), [clients]);

  const recentData = useMemo(() => {
    const getUniqueRecent = (key: 'origin' | 'destination' | 'item' | 'remarks') => {
      const fromDispatches = dispatches.map(d => String(d[key as keyof Dispatch] || ''));
      const fromOps = operations.map(o => String(o[key as keyof Operation] || ''));
      const combined = [...fromDispatches, ...fromOps].map(v => v.trim()).filter(v => v !== '' && v !== 'undefined' && v !== 'null');
      return Array.from(new Set(combined)).reverse().slice(0, 8);
    };
    return { origin: getUniqueRecent('origin'), destination: getUniqueRecent('destination'), item: getUniqueRecent('item'), remarks: getUniqueRecent('remarks') };
  }, [dispatches, operations]);

  const handleOriginChange = (val: string) => {
    setNewDispatch(prev => ({ ...prev, origin: val }));
    const match = snippets.find(s => s.keyword === val);
    if (match) setNewDispatch(prev => ({ ...prev, origin: match.origin || prev.origin, destination: match.destination || prev.destination, item: match.item || prev.item, clientName: match.clientName || prev.clientName }));
  };

  const applySnippet = (s: Snippet) => {
    setNewDispatch(prev => ({ ...prev, origin: s.origin || '', destination: s.destination || '', item: s.item || '', clientName: s.clientName || prev.clientName }));
    setActiveField(null);
  };

  const selectSuggestion = (field: string, value: string) => {
    if (field === 'origin') handleOriginChange(value);
    else setNewDispatch(prev => ({ ...prev, [field]: value } as any));
    setActiveField(null);
  };

  const handleCreateDispatch = () => {
    if (!newDispatch.vehicleNo || !newDispatch.origin || !newDispatch.destination) { alert('筌��늿�럮筌욑옙筌��꼹�깑占쎌궃, 筌��닀�굯占쎌굩筌��늿�럮筌욑옙筌��늿彛у뜝�룞�삕, 筌�醫륁궥占쎌궨筌��늿�럮筌욑옙筌��늿彛у뜝�룞�삕筌��꼹�궅占쎌궞 筌�醫륁궥占쎌굲筌��닀�궀占쎌궨 筌��닀�깇占쎌굷筌��꼹�깓筌욑옙 筌��닀�굮筌욑옙筌�醫륁궥筌욑옙筌��닀�깇占쎌굷筌��꼹�궆占쎌궀筌��꼹�궆筌욑옙.'); return; }
    const d: Dispatch = { id: generateUUID(), date: new Date().toISOString().split('T')[0], vehicleNo: newDispatch.vehicleNo, clientName: newDispatch.clientName || '筌��꼷�렅鸚룸씮肄∽쭪醫묒삕�뜝�럩肄∽옙�깓占쎌궥', origin: newDispatch.origin, destination: newDispatch.destination, item: newDispatch.item, count: newDispatch.count, remarks: newDispatch.remarks, status: 'pending', type: dispatchType };
    onAddDispatch(d);
    const newSnippet: Snippet = { id: generateUUID(), title: `${d.origin} 筌≪���궦鸚뤄옙 ${d.destination}`, content: d.item || '筌��닀�깇占쎌궔筌��꼹�궓占쎌궩筌��닀�굯占쎌깂筌��닀�굲筌욑옙', keyword: d.origin, origin: d.origin, destination: d.destination, item: d.item, clientName: d.clientName };
    onAddSnippet(newSnippet);
    setNewDispatch({ vehicleNo: '', clientName: '', origin: '', destination: '', item: '', count: 1, remarks: '' });
    setActiveField(null);
    setTimeout(() => { if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' }); }, 100);
  };

  const startEditing = (d: Dispatch) => { setEditingId(d.id); setEditForm({ ...d }); };
  
  const userDispatches = dispatches.filter(d => user.role === 'ADMIN' || String(d.vehicleNo).trim() === String(user.identifier).trim() || (user.role === 'PARTNER' && d.clientName === user.identifier));

  const renderChips = (field: keyof typeof recentData) => {
    const items = recentData[field];
    const matchingSnippets = field === 'origin' ? snippets.filter(s => (s.keyword && s.keyword.includes(newDispatch.origin)) || (s.origin && s.origin.includes(newDispatch.origin))) : [];
    if (activeField !== field) return null;
    if (items.length === 0 && matchingSnippets.length === 0) return null;
    return (
      <div className="absolute top-full left-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-2 mt-1 flex flex-col gap-1 w-full max-h-60 overflow-y-auto" onMouseDown={(e) => e.preventDefault()}>
        {field === 'origin' && matchingSnippets.map(s => (
          <button key={`snip-${s.id}`} onMouseDown={(e) => { e.preventDefault(); applySnippet(s); }} className="text-left bg-blue-50 text-blue-700 px-3 py-2 rounded text-xs font-bold hover:bg-blue-100 border border-blue-100">筌≪럩�렃占쎌궔 {s.keyword || s.title}</button>
        ))}
        {items.map((item, idx) => (
          <button key={`${String(field)}-${idx}`} onMouseDown={(e) => { e.preventDefault(); selectSuggestion(String(field), item); }} className="text-left bg-slate-50 text-slate-700 px-3 py-2 rounded text-xs font-medium hover:bg-slate-100 border border-slate-100">{item}</button>
        ))}
      </div>
    );
  };

  const closeCameraModal = () => {
    setCameraOpen(false); setIsCameraMode(false); setCapturedPhoto(null);
    setModalQuantity(''); setRotation(0); setZoomScale(1); setActiveDispatchId(null);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const uploadPhoto = async (photoBase64: string, dispatchId: string): Promise<string> => {
    const fileName = `invoice_${dispatchId}_${Date.now()}.jpg`;
    const base64Data = photoBase64.split(',')[1];
    const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const { error } = await supabase.storage.from('invoices').upload(fileName, byteArray, { contentType: 'image/jpeg' });
    let supabaseUrl = '';
    if (!error) supabaseUrl = supabase.storage.from('invoices').getPublicUrl(fileName).data.publicUrl;
    uploadToNAS(photoBase64, fileName).then(nasUrl => { if (nasUrl) console.log('筌≪���긿占쎌굷 NAS 筌��닀�궧占쎌굷筌��꼷彛좑옙�긿筌��꼹�궙占쎌긿 筌��닀�궩占쎌굲筌��꼷彛ο옙�궋:', nasUrl); });
    return supabaseUrl;
  };

  const handleFinalSubmitInternal = async (targetId: string, photoBase64: string | undefined, qty: number) => {
    const targetDispatch = dispatches.find(d => d.id === targetId);
    if (!targetDispatch) throw new Error('�뛾�룄��ｅ첎占� �뜝�럩�젧�솻洹ｏ옙占썲뜝�룞�삕 嶺뚢돦堉싷옙諭� �뜝�럥�빢 �뜝�럥�뵪�뜝�럥裕멨뜝�럥鍮띶뜝�럥堉�.');

    let photoUrl = photoBase64;
    if (photoBase64 && photoBase64.startsWith('data:')) {
      photoUrl = await uploadPhoto(photoBase64, targetId);
    }

    // 筌≪���긿占쎌굷 dispatch ID筌��꼷彛좑옙�긿 筌��꼷�럷冶⑤슣肄∽옙�깓�뜝�룞�삕 筌��늿�럮冶⑤Ŋ肄잌ㅇ占쏙옙�깓 筌��닀�궧占쎌굸筌��닀�긿冶⑤슣肄좑쭪�끉怡� 筌��늿彛좑쭪紐꾩퐶筌욌��怡ワ㎖�닀�긿冶⑤슣肄좑쭪類μ긿 筌��늿�럮冶⑤Ŋ肄잌ㅇ�씮�럮
    const existingOp = operations.find(o => o.id === targetId) ||
      operations.find(o => 
        o.vehicleNo === targetDispatch.vehicleNo && 
        o.date === targetDispatch.date && 
        o.origin === targetDispatch.origin && 
        o.destination === targetDispatch.destination
      );

    const matchedPrice = unitPrices?.find(up => up.clientName === targetDispatch.clientName && up.origin === targetDispatch.origin && up.destination === targetDispatch.destination && up.item === targetDispatch.item);
    
    const unitPrice = matchedPrice ? matchedPrice.unitPrice : (existingOp?.unitPrice || 0);
    const clientUnitPrice = matchedPrice ? matchedPrice.clientUnitPrice : (existingOp?.clientUnitPrice || 0);
    const supplyPrice = Math.floor(unitPrice * qty);
    const tax = Math.floor(supplyPrice * 0.1); 
    const totalAmount = supplyPrice + tax;

    const opData: Operation = {
      id: existingOp ? existingOp.id : generateUUID(), 
      date: targetDispatch.date, clientName: targetDispatch.clientName, vehicleNo: targetDispatch.vehicleNo, 
      origin: targetDispatch.origin, destination: targetDispatch.destination, item: targetDispatch.item, 
      quantity: qty, unitPrice, clientUnitPrice, supplyPrice, tax, totalAmount, 
      remarks: targetDispatch.remarks || '', 
      invoicePhoto: photoUrl || (existingOp ? existingOp.invoicePhoto : undefined),
      isInvoiceIssued: existingOp ? existingOp.isInvoiceIssued : false, 
      settlementStatus: existingOp ? existingOp.settlementStatus : 'PENDING', 
      itemDescription: targetDispatch.item, 
      branchName: matchedPrice?.branchName || (existingOp?.branchName || ''), 
      itemCode: '', isVatIncluded: false,
      type: targetDispatch.type
    };

    if (existingOp && onUpdateOperation) await onUpdateOperation(opData); 
    else await onAddOperation(opData); 
    await onUpdateStatus(targetId, 'completed', photoUrl, qty);
  };

  const handleAdminFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, dispatchId: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try { await handleFinalSubmitInternal(dispatchId, base64, 0); alert('筌��닀�굸筌욌벡肄∽옙�깇筌욎뮇肄∽옙�깂鸚뤄옙 筌��꼹�궙筌욌��肄좑쭪類μ깂筌��꼹�궔占쎌궨筌��닀�궧占쎌궀筌��닀�궅鸚룸맩肄좑옙�궆占쎌궀筌��꼹�궆筌욑옙.'); } 
        catch (err) { alert('筌��닀�굮筌욑옙筌��늿彛э옙�굲 筌��닀�궧占쎌굷筌��꼷彛좑옙�긿筌��꼹�궙占쎌긿 筌��닀�궆筌욎떝肄э옙�궋筌욑옙'); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinalSubmit = async (overrideId?: string, overrideQty?: number) => {
    const targetId = overrideId ?? activeDispatchId;
    if (!targetId) return;
    setIsProcessingAI(true);
    try {
      const quantity = overrideQty !== undefined ? overrideQty : (modalQuantity ? parseFloat(modalQuantity) : 0);
      await handleFinalSubmitInternal(targetId, capturedPhoto || undefined, quantity);
      closeCameraModal();
    } catch (error) {
      console.error("筌��꼷�럮筌욌챷肄∽쭪紐꾠럷 筌��늿�룉占쎌궨筌��꼷彛⑼쭪占� 筌��늿彛�占쎌궕 筌��닀�궨筌욎떝肄좑쭪�뮉�궨 筌��꼷�럮占쎌긿筌��닀�굯占쎌깂:", error);
      alert("筌��늿�룉占쎌궨筌��꼷彛⑼쭪占� 筌��늿彛�占쎌궕 筌��닀�궨筌욎떝肄좑쭪�뮉�궨筌���с럮�뜝�룞�삕 筌��꼷�럮占쎌긿筌��닀�굯占쎌깂筌�醫륁궦占쎌궀筌��닀�궅鸚룸맩肄좑옙�궆占쎌궀筌��꼹�궆筌욑옙.");
    } finally { setIsProcessingAI(false); }
  };

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto custom-scrollbar p-4 space-y-4 flex flex-col">
      <input type="file" ref={fileInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => { 
            setCapturedPhoto(reader.result as string); setCameraOpen(true); setIsCameraMode(false); 
            if (activeDispatchId && cardQuantities[activeDispatchId]) setModalQuantity(cardQuantities[activeDispatchId]);
          };
          reader.readAsDataURL(file);
        }
      }} accept="image/*" className="hidden" />

      <div className="flex justify-between items-center shrink-0">
        <div><h2 className="text-xl font-black text-slate-800 dark:text-slate-100">筌��꼷�럮筌욌챷肄∽쭪紐꾠럷 筌���ъ�ュ뜝�룞�삕筌��꼷彛⑼쭪占�</h2></div>
        {(user.role === 'VEHICLE' || user.role === 'PARTNER') && onNavigate && (
          <button onClick={() => onNavigate(ViewType.DASHBOARD)} className="flex items-center gap-1 bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-600 active:scale-95 transition shadow-sm"><span>筌™뫂�깑占쎌궓占쎌깓 筌�醫륁궩占쎌궀筌��닀�긿冶⑤슣肄좑쭪類μ긿</span></button>
        )}
      </div>

      {user.role === 'ADMIN' && (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-blue-200 dark:border-slate-700 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-4 mb-3 pb-2 border-b border-gray-100">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="dType" checked={dispatchType === 'SALES'} onChange={() => setDispatchType('SALES')} className="w-4 h-4 text-blue-600"/>
                <span className={`text-xs font-bold ${dispatchType==='SALES'?'text-blue-600':'text-gray-500'}`}>筌��꼷彛э쭪�떝肄▼ㅇ�뿮�긿 (筌��늿�룉筌욑옙筌���ъ�э쭪占�)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="dType" checked={dispatchType === 'PURCHASE'} onChange={() => setDispatchType('PURCHASE')} className="w-4 h-4 text-green-600"/>
                <span className={`text-xs font-bold ${dispatchType==='PURCHASE'?'text-green-600':'text-gray-500'}`}>筌��꼷彛э쭪�떝肄∽옙�깇占쎌굷 (筌��늿彛у뜝�룞�삕筌���ъ�곤옙�궃)</span>
              </label>
          </div>
          <div className="flex flex-col lg:flex-row gap-2 items-end">
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-7 gap-2 w-full relative">
                <input list="vehicleOptions" placeholder="筌��늿�럮筌욑옙筌��꼹�깑占쎌궃(筌��닀�궀占쎌궨筌��꼹�궓占쎌궩)" value={newDispatch.vehicleNo} onChange={e => setNewDispatch(p => ({ ...p, vehicleNo: e.target.value }))} className="col-span-1 border rounded px-2 py-1.5 text-xs font-bold h-9 bg-slate-50"/>
                <datalist id="vehicleOptions">{vehicles.map(v => <option key={v.id} value={v.vehicleNo}>{v.vehicleNo}</option>)}</datalist>
                <input list="clientOptions" placeholder="筌���с룒筌욌챷肄좑옙�깇占쎌궨筌��늿�룉占쎌궨(筌��닀�궀占쎌궨筌��꼹�궓占쎌궩)" value={newDispatch.clientName} onChange={e => setNewDispatch(p => ({ ...p, clientName: e.target.value }))} className="col-span-1 border rounded px-2 py-1.5 text-xs font-bold h-9 text-blue-600 bg-slate-50"/>
                <datalist id="clientOptions">{uniqueClientNames.map(n => <option key={n} value={n} />)}</datalist>
                <div className="col-span-1 relative"><input placeholder="筌��닀�굯占쎌굩筌��늿�럮筌욑옙" value={newDispatch.origin} onChange={e => handleOriginChange(e.target.value)} onFocus={() => setActiveField('origin')} onMouseDown={() => setActiveField('origin')} className="w-full border rounded px-2 py-1.5 text-xs h-9" />{renderChips('origin')}</div>
                <div className="col-span-1 relative"><input placeholder="筌�醫륁궥占쎌궨筌��늿�럮筌욑옙" value={newDispatch.destination} onChange={e => setNewDispatch(p => ({ ...p, destination: e.target.value }))} onFocus={() => setActiveField('destination')} onMouseDown={() => setActiveField('destination')} className="w-full border rounded px-2 py-1.5 text-xs h-9" />{renderChips('destination')}</div>
                <div className="col-span-1 relative"><input placeholder="筌�醫륁궖占쎌궀筌��꼷�렍占쎌굷" value={newDispatch.item} onChange={e => setNewDispatch(p => ({ ...p, item: e.target.value }))} onFocus={() => setActiveField('item')} onMouseDown={() => setActiveField('item')} className="w-full border rounded px-2 py-1.5 text-xs h-9" />{renderChips('item')}</div>
                <input type="number" placeholder="筌�醫륁궬占쎌궋筌��닀�깓占쎌굲" value={newDispatch.count} onChange={e => setNewDispatch(p => ({ ...p, count: parseInt(e.target.value)||0 }))} className="col-span-1 border rounded px-2 py-1.5 text-xs h-9 text-center" />
                <input placeholder="筌��꼷怡뤄옙�굲筌���э옙占쏙옙�깓" value={newDispatch.remarks} onChange={e => setNewDispatch(p => ({ ...p, remarks: e.target.value }))} className="col-span-1 border rounded px-2 py-1.5 text-xs h-9" />
            </div>
            <button onClick={handleCreateDispatch} className={`w-full lg:w-auto text-white px-4 py-1.5 rounded font-bold text-xs h-9 shadow shrink-0 ${dispatchType==='SALES'?'bg-blue-600':'bg-green-600'}`}>筌��꼹�궙筌욌��肄좑쭪類μ깂</button>
          </div>
        </div>
      )}

      {user.role === 'ADMIN' ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto min-h-[300px]">
          <table className="w-full min-w-[900px] text-xs text-left text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 font-bold uppercase border-b sticky top-0">
              <tr>
                <th className="px-3 py-2 w-14 text-center">筌���ъ�э쭪占쏙㎖�꼷怡�占쎌굲</th>
                <th className="px-3 py-2 w-16 text-center">筌��닀�굯占쎌굩筌�醫륁굯占쎌긿</th>
                <th className="px-3 py-2 w-24">筌��꼹�굮占쎌깓筌��늿彛э옙�긿</th>
                <th className="px-3 py-2 w-28">筌��늿�럮筌욑옙筌��꼹�깑占쎌궃</th>
                <th className="px-3 py-2 w-32">筌���с룒筌욌챷肄좑옙�깇占쎌궨筌��늿�룉占쎌궨</th>
                <th className="px-3 py-2">筌���ъ�э쭪占쏙㎖��с럮占쎌굲</th>
                <th className="px-3 py-2 w-24">筌�醫륁궖占쎌궀筌��꼷�렍占쎌굷</th>
                <th className="px-3 py-2 w-14 text-center">筌�醫륁궬占쎌궋筌��닀�깓占쎌굲</th>
                <th className="px-3 py-2 w-32">筌��꼷怡뤄옙�굲筌���э옙占쏙옙�깓</th>
                <th className="px-3 py-2 w-36 text-center">筌���ъ�ュ뜝�룞�삕筌��꼷彛⑼쭪占�</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {userDispatches.map(d => {
                const isEditing = editingId === d.id;
                return (
                  <tr key={d.id} className={`hover:bg-slate-50 ${d.status === 'completed' ? 'bg-green-50/30' : ''}`}>
                    <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${d.type === 'PURCHASE' ? 'bg-green-500' : 'bg-blue-500'}`}>{d.type === 'PURCHASE' ? '筌��꼷彛э쭪�떝肄∽옙�깇占쎌굷' : '筌��꼷彛э쭪�떝肄▼ㅇ�뿮�긿'}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${d.status==='completed'?'bg-green-50 text-green-600 border-green-200':d.status==='sent'?'bg-blue-50 text-blue-600 border-blue-200':'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {d.status==='pending'?'筌��꼹�궋�뜝�룞�삕筌���ъ�곤쭪占�':d.status==='sent'?'筌��꼷�럮筌욌챷肄∽쭪紐꾠럷筌��늿彛�占쎌궕':'筌��닀�궩占쎌굲筌��꼷彛ο옙�궋'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{d.date.substring(5)}</td>
                    <td className="px-3 py-2 font-bold text-blue-600">{d.vehicleNo}</td>
                    <td className="px-3 py-2">{d.clientName}</td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <input value={editForm?.origin} onChange={e=>setEditForm(p=>p?({...p,origin:e.target.value}):null)} className="border rounded w-20 px-1" />
                          <input value={editForm?.destination} onChange={e=>setEditForm(p=>p?({...p,destination:e.target.value}):null)} className="border rounded w-20 px-1" />
                        </div>
                      ) : (`${d.origin} 筌≪���굸占쎌궖 ${d.destination}`)}
                    </td>
                    <td className="px-3 py-2">{isEditing ? (<input value={editForm?.item} onChange={e=>setEditForm(p=>p?({...p,item:e.target.value}):null)} className="border rounded w-20 px-1" />) : (d.item)}</td>
                    <td className="px-3 py-2 text-center">{d.count}</td>
                    <td className="px-3 py-2 truncate max-w-[100px]" title={d.remarks}>{d.remarks}</td>
                    <td className="px-3 py-2 text-center flex justify-center gap-1 items-center">
                      {isEditing ? (
                        <button onClick={()=>{if(editForm){onUpdateDispatch(editForm);setEditingId(null);}}} className="bg-blue-500 text-white px-2 py-1 rounded">筌��닀�깓�뜝�룞�삕筌��닀�깇筌욑옙</button>
                      ) : (
                        <>
                          {d.status==='pending'&&<button onClick={()=>onUpdateStatus(d.id,'sent')} className="bg-blue-600 text-white px-2 py-1 rounded">筌��닀�깓占쎌굲筌��닀�굸筌욑옙</button>}
                          {d.status !== 'completed' && (
                             <label className="text-gray-500 hover:text-blue-600 cursor-pointer p-1" title="筌��닀�굸筌욌벡肄∽옙�깇筌욑옙 筌��꼹�궙筌욌��肄좑쭪類μ깂">
                                <Camera className="w-4 h-4"/>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAdminFileUpload(e, d.id)} />
                             </label>
                          )}
                          <button onClick={()=>startEditing(d)} className="text-slate-400 p-1">筌≪���긿占쎌궓筌�占썲ㅇ�엨�궓</button>
                          <button onClick={()=>{if(confirm('筌��닀�굮筌욑옙筌��닀�깓占쎌긿?'))onDeleteDispatch(d.id)}} className="text-slate-400 p-1">筌™뫂�깑占쎌궧占쎌궕筌�占썲ㅇ�엨�궓</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
            {userDispatches.map(d => (
                <div key={d.id} className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border ${d.status === 'completed' ? 'border-green-500 ring-1 ring-green-500 bg-green-50/10' : 'border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1"><span className="text-xs font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{d.vehicleNo}</span><span className="text-[10px] text-slate-400">{d.date}</span></div>
                            <h4 className="font-black text-lg">{d.origin} 筌≪���굸占쎌궖 {d.destination}</h4>
                            <div className="text-xs text-slate-500 font-bold mt-1">{d.clientName} {d.item && `| ${d.item}`}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-black ${d.status==='completed'?'bg-green-100 text-green-700':d.status==='sent'?'bg-blue-100 text-blue-700':'bg-slate-100'}`}>{d.status==='pending'?'筌��꼹�궋�뜝�룞�삕筌���ъ�곤쭪占�':d.status==='sent'?'筌��꼷�럮筌욌챷肄∽쭪紐꾠럷筌��늿彛�占쎌궕':'筌��닀�궩占쎌굲筌��꼷彛ο옙�궋'}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        {d.status === 'sent' && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border"><span className="text-xs font-bold text-slate-500">筌��닀�궆筌욎떝肄∽쭪�떞�궕筌��꼹�깑占쎌궃:</span><input type="number" inputMode="decimal" value={cardQuantities[d.id] || ''} onChange={(e) => setCardQuantities(p => ({ ...p, [d.id]: e.target.value }))} className="flex-1 bg-transparent text-right font-black text-lg text-blue-600 outline-none" placeholder="0.00" /><span className="text-xs font-bold text-slate-500">ton</span></div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => { setActiveDispatchId(d.id); setCameraOpen(true); setIsCameraMode(true); setCapturedPhoto(null); setModalQuantity(cardQuantities[d.id]||''); try{navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(s=>{if(videoRef.current)videoRef.current.srcObject=s});}catch{alert('筌��늿怡룟ㅇ�뜆肄좑쭪�끋�궞筌��꼹�깂冶⑤삗');setCameraOpen(false);} }} className="bg-blue-50 text-blue-600 py-2.5 rounded-xl font-bold text-sm border border-blue-100">筌™뫂�깑占쎌궙鸚뤄옙 筌��늿怡ワ쭪占쏙㎖�닀�궨占쎌굩</button>
                                    <button onClick={() => { setActiveDispatchId(d.id); fileInputRef.current?.click(); }} className="bg-slate-50 text-slate-600 py-2.5 rounded-xl font-bold text-sm border border-slate-200">筌™뫂�깑占쎌궙占쎌굩 筌��닀�궥筌욑옙筌��꼷�룉占쎌궞</button>
                                </div>
                                <button onClick={() => { if(!cardQuantities[d.id]&&!confirm('筌��꼷�럾鸚룸뜆肄잞쭪�눛�궋0?')) return; setActiveDispatchId(d.id); handleFinalSubmit(d.id, cardQuantities[d.id] ? parseFloat(cardQuantities[d.id]) : 0); }} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-sm">筌��닀�궩占쎌굲筌��꼷彛ο옙�궋 筌��닀�깓占쎌굲筌��닀�굸筌욑옙</button>
                            </div>
                        )}
                        {d.status === 'completed' && (
                            <div className="flex flex-col gap-2">
                                <div className="text-center text-xs font-bold text-green-600 flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4"/> 筌��닀�굸筌욌벡肄∽옙�깇筌욑옙 筌��꼹�궙筌욌��肄좑쭪類μ깂 筌��닀�궩占쎌굲筌��꼷彛ο옙�궋</div>
                                <button onClick={() => { setActiveDispatchId(d.id); setModalQuantity(cardQuantities[d.id] || ''); setCameraOpen(true); setIsCameraMode(false); }} className="w-full bg-white border border-green-500 text-green-600 py-2.5 rounded-xl font-bold text-sm hover:bg-green-50">筌™뫂�깑占쎌궞占쎌굲 筌��닀�궀占쎌궨筌��닀�깓占쎌궥</button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      )}

      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
           <div className="p-4 flex justify-between items-center text-white"><button onClick={closeCameraModal} className="text-lg font-bold">筌��늿怡�筌욑옙筌��닀�굸占쎌궋</button><span className="font-bold">筌��닀�굸筌욌벡肄∽옙�깇筌욑옙/筌��닀�궀占쎌궨筌��꼹�깑占쎌궃 筌��닀�깇占쎌굷筌��꼹�깓筌욑옙</span><div className="w-10"></div></div>
           {isCameraMode ? (
               <div className="flex-1 bg-gray-900 relative flex items-center justify-center">
                   <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                   <button onClick={() => { if(videoRef.current) { const cvs = document.createElement('canvas'); cvs.width = videoRef.current.videoWidth; cvs.height = videoRef.current.videoHeight; cvs.getContext('2d')?.drawImage(videoRef.current,0,0); setCapturedPhoto(cvs.toDataURL('image/jpeg', 0.5)); setIsCameraMode(false); } }} className="absolute bottom-10 w-20 h-20 bg-white rounded-full border-4 border-gray-300"></button>
               </div>
           ) : (
               <div className="flex-1 bg-gray-900 relative flex items-center justify-center overflow-hidden">
                   {capturedPhoto ? (<img src={capturedPhoto} style={{ transform: `rotate(${rotation}deg) scale(${zoomScale})` }} className="max-w-full max-h-full object-contain" />) : (<div className="text-white text-center p-4"><p className="text-lg font-bold mb-2">筌��닀�굮筌욑옙筌��늿彛э옙�굲 筌��닀�궧占쎌굸筌��닀�깂占쎌궋</p><p className="text-sm text-gray-400">筌��닀�궀占쎌궨筌��꼹�깑占쎌궃筌��꼷彛э옙�궋 筌��닀�궀占쎌궨筌��닀�깓占쎌궥筌�醫륁궥占쎌궨筌���с룒筌욌챷肄좑옙�굮占쎌궨 筌��닀�굮筌욑옙筌��늿彛э옙�굲筌��닀�깂占쎌굲 筌��늿怡�占쎌궞筌���с럮�뜝�룞�삕筌�醫륁궥占쎌궨筌��닀�굲鸚룸씮肄∽옙�궬占쎌궞.</p></div>)}
                   {capturedPhoto && <div className="absolute top-4 right-4 flex flex-col gap-2"><button onClick={() => setRotation(r => r + 90)} className="w-10 h-10 bg-black/50 text-white rounded-full">筌≪���굸鸚뤄옙</button><button onClick={() => setZoomScale(z => z === 1 ? 2 : 1)} className="w-10 h-10 bg-black/50 text-white rounded-full">筌™뫂�깑占쎌궞占쎌궑</button></div>}
               </div>
           )}
           {!isCameraMode && (
               <div className="bg-white p-5 space-y-4 rounded-t-3xl pb-10">
                   <div className="flex items-center gap-3"><label className="font-bold">筌��닀�궆筌욎떝肄∽쭪�떞�궕筌��꼹�깑占쎌궃:</label><input type="number" inputMode="decimal" autoFocus value={modalQuantity} onChange={e => setModalQuantity(e.target.value)} className="flex-1 border-b-2 border-blue-500 p-2 text-2xl font-black text-blue-600 text-center outline-none" placeholder="0.00" /><span className="font-bold">ton</span></div>
                   <div className="flex gap-2">
                       <button onClick={() => { setIsCameraMode(true); try{navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(s=>{if(videoRef.current)videoRef.current.srcObject=s});}catch{} }} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-600">筌™뫂�깑占쎌궙鸚뤄옙 筌��닀�깇筌욑옙筌��늿怡ワ쭪占쏙㎖�닀�궨占쎌굩</button>
                       <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-600">筌™뫂�깑占쎌궙占쎌굩 筌��닀�궥筌욑옙筌��꼷�룉占쎌궞</button>
                   </div>
                     <button onClick={() => handleFinalSubmit()} disabled={isProcessingAI} className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-lg shadow-lg">
                       {isProcessingAI ? '筌™뫂�깑占쎌궙筌욑옙 NAS + Supabase 筌��닀�깓�뜝�룞�삕筌��닀�깇筌욎뮇肄∽쭪�떞�궕...' : '筌�醫륁궩占쎌궥筌��닀�깂鸚뤄옙 筌��꼷�럮占쎌궓 筌��닀�깓占쎌굲筌��닀�굸筌욑옙'}
                     </button>
               </div>
           )}
        </div>
      )}
    </div>
  );
};

export default DispatchManagementView;
