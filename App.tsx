import React, { useState, useEffect, useRef } from 'react';
import { ViewType, Operation, Client, Vehicle, AuthUser, Dispatch, AdminAccount, UnitPriceMaster, Snippet, PartnerAccount } from './types';
import { NAV_ITEMS, MOCK_ADMINS, MOCK_PARTNERS } from './constants';
import { supabase } from './supabase'; 

import OperationEntryView from './components/OperationEntryView';
import ClientSummaryView from './components/ClientSummaryView';
import StatementView from './components/StatementView';
import MasterClientView from './components/MasterClientView';
import MasterVehicleView from './components/MasterVehicleView';
import MasterUnitPriceView from './components/MasterUnitPriceView';
import MasterSnippetView from './components/MasterSnippetView';
import VehicleTrackingView from './components/VehicleTrackingView';
import DispatchManagementView from './components/DispatchManagementView';
import AccountManagementView from './components/AccountManagementView';
import DashboardView from './components/DashboardView';
import ChangePasswordView from './components/ChangePasswordView';
import LoginView from './components/LoginView';
import Header from './components/Header';

// 🔔 [수정됨] 끊김 없는 확실한 알람음 (외부 URL 사용)
const ALERT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // 데이터 상태 관리
  const [operations, setOperations] = useState<Operation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(MOCK_ADMINS);
  const [unitPrices, setUnitPrices] = useState<UnitPriceMaster[]>([]); 
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [partnerAccounts, setPartnerAccounts] = useState<PartnerAccount[]>(MOCK_PARTNERS);

  // 👇 [수정됨] HTML5 Audio 객체 사용 (가장 안정적임)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. 초기화: 소리 로딩 및 '터치 시 잠금 해제' (핵심!)
  useEffect(() => {
    // 오디오 객체 생성 및 로드
    audioRef.current = new Audio(ALERT_SOUND_URL);
    audioRef.current.load();

    // 사용자가 화면을 터치하는 순간, 소리를 0.1초 '무음'으로 재생해서 브라우저 보안을 뚫음
    const unlockAudio = () => {
      if(audioRef.current) {
        const originalVolume = audioRef.current.volume;
        audioRef.current.volume = 0; // 소리 안 나게
        audioRef.current.play().then(() => {
            // 재생 성공하면 바로 멈추고 볼륨 복구 -> 이제부터 언제든 소리 재생 가능
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    audioRef.current.volume = 1.0;
                }
            }, 100);
        }).catch((e) => console.log("오디오 권한 획득 실패 (재시도 예정):", e));
      }
      // 이벤트 리스너 제거
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
  }, []);

  // 🔊 [수정됨] 확실한 소리 재생 함수
  const playBeep = () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.warn("브라우저가 소리를 막았습니다. 화면을 터치해주세요.", error);
          });
        }
      }
      // 진동 (모바일)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500]); 
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('veraka_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (parsedUser.role === 'VEHICLE') setCurrentView(ViewType.DISPATCH_MGMT);
      else if (parsedUser.role === 'PARTNER') setCurrentView(ViewType.OPERATION_ENTRY);
      else setCurrentView(ViewType.DASHBOARD);
    }
    fetchData();
  }, []);

  // ⭐ 10초마다 데이터 자동 동기화 (배차 누락/완료 미표시 방지)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchData(); 
    }, 10000); // 10초

    return () => clearInterval(interval);
  }, [user]);

  // 3. 실시간 데이터 동기화
  useEffect(() => {
    if (!user) return;
    console.log(`📡 [${user.role}] 실시간 채널 연결...`);

    const channel = supabase.channel('global-changes')
      // (A) 배차 테이블 감시
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatches' }, (payload) => {
          const newD = payload.new as any;
          // DB 데이터를 앱 데이터로 변환 (값이 없으면 undefined가 될 수 있음)
          const convertDispatch = (d: any): Partial<Dispatch> => ({
            id: d.id, 
            date: d.date, 
            clientName: d.client_name, 
            vehicleNo: d.vehicle_no,
            origin: d.origin, 
            destination: d.destination, 
            item: d.item, 
            count: d.count,
            remarks: d.remarks, 
            status: d.status
          });

          if (payload.eventType === 'INSERT') {
            const newDispatch = convertDispatch(newD) as Dispatch;
            
            setDispatches(prev => {
                const exists = prev.find(p => p.id === newDispatch.id);
                if (exists) return prev;
                return [newDispatch, ...prev];
            });
            
            // 👇 [기사님 알람]
            if (user.role === 'VEHICLE' && newDispatch.vehicleNo === user.identifier) {
              playBeep(); // 소리+진동
              setTimeout(() => alert(`🔔 [새 배차 알림]\n\n상차: ${newDispatch.origin}\n하차: ${newDispatch.destination}\n\n확인해주세요!`), 300);
            }
            fetchData();
          } 
          else if (payload.eventType === 'UPDATE') {
            const updated = convertDispatch(newD);
            
            // 👇 [기존 유지] 데이터 증발 방지 로직
            setDispatches(prev => prev.map(d => {
                if (d.id === updated.id) {
                    return {
                        ...d, 
                        ...updated, 
                        vehicleNo: updated.vehicleNo || d.vehicleNo,
                        clientName: updated.clientName || d.clientName,
                        origin: updated.origin || d.origin,
                        destination: updated.destination || d.destination,
                        item: updated.item || d.item,
                        status: updated.status || d.status
                    } as Dispatch;
                }
                return d;
            }));

            // 👇 [관리자 알람] 완료 시
            const oldStatus = (payload.old as any).status;
            if (user.role === 'ADMIN' && updated.status === 'completed' && oldStatus !== 'completed') {
               playBeep(); // 소리+진동
               setTimeout(() => alert(`✅ [운행 완료]\n차량: ${updated.vehicleNo || '차량'}\n송장 등록됨`), 300);
            }
            fetchData();
          }
          else if (payload.eventType === 'DELETE') {
             setDispatches(prev => prev.filter(d => d.id !== payload.old.id));
          }
      })
      // (B) 운행기록 테이블 감시
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operations' }, (payload) => {
          const newOp = payload.new as any;
          const convertOperation = (o: any): Operation => ({
             id: o.id, date: o.date, clientName: o.client_name, vehicleNo: o.vehicle_no,
             origin: o.origin, destination: o.destination, item: o.item,
             quantity: o.quantity, unitPrice: o.unit_price, supplyPrice: o.supply_price,
             tax: o.tax, totalAmount: o.total_amount, remarks: o.remarks,
             settlementStatus: o.settlement_status, branchName: o.branch_name,
             clientUnitPrice: o.client_unit_price, itemDescription: o.item_description,
             isInvoiceIssued: o.is_invoice_issued, 
             invoicePhoto: o.invoice_photo
          });

          if (payload.eventType === 'INSERT') {
            setOperations(prev => [convertOperation(newOp), ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOperations(prev => prev.map(o => o.id === newOp.id ? convertOperation(newOp) : o));
          } else if (payload.eventType === 'DELETE') {
            setOperations(prev => prev.filter(o => o.id !== payload.old.id));
          }
          fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchData = async () => {
    try {
      const [v, c, o, a, u, s, d] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('operations').select('*').order('date', { ascending: false }),
        supabase.from('admins').select('*'),
        supabase.from('unit_prices').select('*'),
        supabase.from('snippets').select('*'),
        supabase.from('dispatches').select('*').order('created_at', { ascending: false })
      ]);

      if (v.data) setVehicles(v.data.map((x:any) => ({ ...x, id: x.id, vehicleNo: x.vehicle_no, ownerName: x.owner_name, loginCode: x.login_code, type: 'VEHICLE' })));
      if (c.data) setClients(c.data.map((x:any) => ({ ...x, id: x.id, clientName: x.client_name, presidentName: x.president_name, businessNo: x.business_no, businessType: x.business_type })));
      if (o.data) setOperations(o.data.map((x:any) => ({ ...x, id: x.id, clientName: x.client_name, vehicleNo: x.vehicle_no, unitPrice: x.unit_price, supplyPrice: x.supply_price, totalAmount: x.total_amount, settlementStatus: x.settlement_status, branchName: x.branch_name, clientUnitPrice: x.client_unit_price, itemDescription: x.item_description, isInvoiceIssued: x.is_invoice_issued, invoicePhoto: x.invoice_photo })));
      if (a.data) setAdminAccounts(a.data);
      if (u.data) setUnitPrices(u.data.map((x:any) => ({ ...x, id: x.id, clientName: x.client_name, branchName: x.branch_name, unitPrice: x.unit_price, clientUnitPrice: x.client_unit_price })));
      if (s.data) setSnippets(s.data.map((x:any) => ({ ...x, id: x.id, clientName: x.client_name })));
      if (d.data) setDispatches(d.data.map((x:any) => ({ ...x, id: x.id, clientName: x.client_name, vehicleNo: x.vehicle_no, origin: x.origin, destination: x.destination, item: x.item, count: x.count, remarks: x.remarks, status: x.status })));

    } catch (error) { console.error("데이터 로딩 에러:", error); }
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleLogin = (id: string, pw?: string, type?: 'VEHICLE' | 'PARTNER' | 'ADMIN') => {
    let loggedInUser: AuthUser | null = null;
    let nextView = ViewType.DASHBOARD;

    if (type === 'ADMIN') {
      const admin = adminAccounts.find(a => a.username === id && a.password === pw);
      if (admin) { loggedInUser = { id: admin.id, role: 'ADMIN', name: admin.name, identifier: admin.username }; nextView = ViewType.DASHBOARD; }
    } else if (type === 'PARTNER') {
      const partner = partnerAccounts.find(p => p.username === id && p.password === pw);
      if (partner) { loggedInUser = { id: partner.id, role: 'PARTNER', name: partner.name, identifier: partner.clientName }; nextView = ViewType.OPERATION_ENTRY; }
    } else {
      const vehicle = vehicles.find(v => v.loginCode === id && v.password === (pw || id));
      if (vehicle) { loggedInUser = { id: vehicle.id, role: 'VEHICLE', name: vehicle.ownerName, identifier: vehicle.vehicleNo }; nextView = ViewType.DISPATCH_MGMT; }
    }

    if (loggedInUser) {
      setUser(loggedInUser);
      setCurrentView(nextView);
      localStorage.setItem('veraka_user', JSON.stringify(loggedInUser));
      return true;
    }
    return false;
  };

  const handleLogout = () => { setUser(null); localStorage.removeItem('veraka_user'); };

  const handleSaveVehicle = async (v: Vehicle) => {
    const dbData = { vehicle_no: v.vehicleNo, owner_name: v.ownerName, phone: v.phone, password: v.password, login_code: v.loginCode };
    const { error } = v.id.length === 36 ? await supabase.from('vehicles').update(dbData).eq('id', v.id) : await supabase.from('vehicles').insert(dbData);
    if(error) alert("저장 실패: " + error.message); else fetchData();
  };
  
  const handleDeleteVehicle = async (id: string) => { if(window.confirm("삭제?")) { await supabase.from('vehicles').delete().eq('id', id); fetchData(); }};

  const handleSaveClient = async (c: Client) => {
    const dbData = { client_name: c.clientName, president_name: c.presidentName, phone: c.phone, business_no: c.businessNo, branches: c.branches, address: c.address, fax: c.fax, business_type: c.businessType, category: c.category };
    const { error } = c.id.length === 36 ? await supabase.from('clients').update(dbData).eq('id', c.id) : await supabase.from('clients').insert(dbData);
    if(error) alert("실패: "+error.message); else fetchData();
  };
  const handleDeleteClient = async (id: string) => { if(confirm("삭제?")) { await supabase.from('clients').delete().eq('id', id); fetchData(); }};

  const handleAddOperation = async (op: Operation) => {
      const dbData = {
          id: op.id, date: op.date, client_name: op.clientName, vehicle_no: op.vehicleNo, origin: op.origin, destination: op.destination, item: op.item, unit_price: op.unitPrice, quantity: op.quantity, supply_price: op.supplyPrice, tax: op.tax, total_amount: op.totalAmount, remarks: op.remarks, settlement_status: op.settlementStatus, branch_name: op.branchName, client_unit_price: op.clientUnitPrice, item_description: op.itemDescription, is_invoice_issued: op.isInvoiceIssued, invoice_photo: op.invoice_photo
      };
      await supabase.from('operations').insert(dbData);
      fetchData(); // 즉시 재조회
  };

  const handleUpdateOperation = async (op: Operation) => {
      const dbData = {
        date: op.date, client_name: op.clientName, vehicle_no: op.vehicleNo, origin: op.origin, destination: op.destination, item: op.item, quantity: op.quantity, unit_price: op.unitPrice, supply_price: op.supplyPrice, tax: op.tax, total_amount: op.totalAmount, remarks: op.remarks, settlement_status: op.settlementStatus, branch_name: op.branchName, client_unit_price: op.clientUnitPrice, item_description: op.itemDescription, is_invoice_issued: op.isInvoiceIssued, invoice_photo: op.invoice_photo 
      };
      await supabase.from('operations').update(dbData).eq('id', op.id);
      fetchData(); // 즉시 재조회
  };

  const handleSaveUnitPrice = async (u: UnitPriceMaster) => {
    const dbData = { client_name: u.clientName, branch_name: u.branchName, origin: u.origin, destination: u.destination, item: u.item, unit_price: u.unitPrice, client_unit_price: u.clientUnitPrice };
    if(u.id.length===36) await supabase.from('unit_prices').update(dbData).eq('id', u.id); else await supabase.from('unit_prices').insert(dbData);
    fetchData();
  };
  const handleDeleteUnitPrice = async (id: string) => { if(confirm("삭제?")) { await supabase.from('unit_prices').delete().eq('id', id); fetchData(); }};

  const handleSaveSnippet = async (s: Snippet) => {
    const dbData = { title: s.title, content: s.content, keyword: s.keyword, origin: s.origin, destination: s.destination, item: s.item, client_name: s.clientName };
    if(s.id.length===36) await supabase.from('snippets').update(dbData).eq('id', s.id); else await supabase.from('snippets').insert(dbData);
    fetchData();
  };
  const handleDeleteSnippet = async (id: string) => { if(confirm("삭제?")) { await supabase.from('snippets').delete().eq('id', id); fetchData(); }};

  const handleUpdateDispatchStatus = async (id: string, status: 'pending'|'sent'|'completed', photo?: string, manualQuantity?: number) => {
      setDispatches(prev => prev.map(d => d.id === id ? { ...d, status } : d));
      await supabase.from('dispatches').update({ status }).eq('id', id);
      fetchData(); 
  };

  const renderView = () => {
    if (!user) return <LoginView onLogin={handleLogin} />;
    
    const filteredOps = user.role === 'PARTNER' ? operations.filter(op => op.clientName === user.identifier) 
      : user.role === 'VEHICLE' ? operations.filter(op => op.vehicleNo === user.identifier) : operations;

    switch (currentView) {
      case ViewType.DASHBOARD: return <DashboardView operations={filteredOps} vehicles={vehicles} dispatches={dispatches} />;
      
      case ViewType.DISPATCH_MGMT:
        return <DispatchManagementView 
            user={user} dispatches={dispatches} vehicles={vehicles} clients={clients} snippets={snippets} operations={operations} unitPrices={unitPrices} 
            onAddDispatch={async (d) => {
                setDispatches(prev => [d, ...prev]);
                const dbData = { id: d.id, date: d.date, client_name: d.clientName, vehicle_no: d.vehicleNo, origin: d.origin, destination: d.destination, item: d.item, remarks: d.remarks, status: d.status, count: d.count };
                const { error } = await supabase.from('dispatches').insert(dbData);
                if(error) alert(error.message);
                fetchData(); 
            }} 
            onUpdateDispatch={async (d) => {
                 setDispatches(prev => prev.map(old => old.id === d.id ? d : old));
                 const dbData = { date: d.date, client_name: d.clientName, vehicle_no: d.vehicleNo, origin: d.origin, destination: d.destination, item: d.item, remarks: d.remarks, status: d.status, count: d.count };
                await supabase.from('dispatches').update(dbData).eq('id', d.id);
                fetchData(); 
            }} 
            onDeleteDispatch={async (id) => { 
                if(confirm("삭제?")) {
                    setDispatches(prev => prev.filter(d => d.id !== id));
                    await supabase.from('dispatches').delete().eq('id', id); 
                    fetchData(); 
                }
            }} 
            onUpdateStatus={handleUpdateDispatchStatus} 
            onNavigate={setCurrentView} onAddSnippet={handleSaveSnippet} onAddOperation={handleAddOperation}
            onUpdateOperation={handleUpdateOperation} 
          />;

      case ViewType.OPERATION_ENTRY:
        return <OperationEntryView user={user} operations={filteredOps} vehicles={vehicles} clients={clients} unitPriceMaster={unitPrices}
            onAddOperation={handleAddOperation} onUpdateOperation={handleUpdateOperation} 
            onDeleteOperation={async (id) => { if(confirm("삭제?")) { await supabase.from('operations').delete().eq('id', id); fetchData(); }}} />;

      case ViewType.CLIENT_SUMMARY: return <ClientSummaryView operations={filteredOps} />;
      case ViewType.VEHICLE_REPORT: return <StatementView title="차량거래 내역서" type="vehicle" operations={filteredOps} clients={clients} vehicles={vehicles} userRole={user.role} userIdentifier={user.identifier} />;
      case ViewType.COMPANY_REPORT: return <StatementView title="상호별 내역서" type="company" operations={filteredOps} clients={clients} userRole={user.role} userIdentifier={user.identifier} />;
      case ViewType.CLIENT_REPORT: return <StatementView title="거래처 내역서" type="client" operations={filteredOps} clients={clients} userRole={user.role} userIdentifier={user.identifier} />;
      case ViewType.TAX_INVOICE: return <StatementView title="세금 계산서" type="client" operations={filteredOps} clients={clients} userRole={user.role} userIdentifier={user.identifier} />;
      case ViewType.VEHICLE_TRACKING: return <VehicleTrackingView vehicles={vehicles} />;
      case ViewType.MASTER_CLIENT: return <MasterClientView clients={clients} onSave={handleSaveClient} onDelete={handleDeleteClient} />;
      case ViewType.MASTER_VEHICLE: return <MasterVehicleView vehicles={vehicles} userRole={user.role} onSave={handleSaveVehicle} onDelete={handleDeleteVehicle} />;
      case ViewType.MASTER_UNIT_PRICE: return <MasterUnitPriceView unitPrices={unitPrices} clients={clients} onSave={handleSaveUnitPrice} onDelete={handleDeleteUnitPrice} />;
      case ViewType.MASTER_SNIPPET: return <MasterSnippetView snippets={snippets} clients={clients} onSave={handleSaveSnippet} onDelete={handleDeleteSnippet} />;
      case ViewType.ACCOUNT_MGMT: return <AccountManagementView vehicles={vehicles} adminAccounts={adminAccounts} partnerAccounts={partnerAccounts} clients={clients} onSaveVehicle={handleSaveVehicle} onDeleteVehicle={handleDeleteVehicle} onAddVehicle={handleSaveVehicle} onAddAdmin={a => setAdminAccounts(prev => [...prev, a])} onUpdateAdmin={a => setAdminAccounts(prev => prev.map(x => x.id === a.id ? a : x))} onDeleteAdmin={id => setAdminAccounts(prev => prev.filter(x => x.id !== id))} onAddPartner={p => setPartnerAccounts(prev => [...prev, p])} onUpdatePartner={p => setPartnerAccounts(prev => prev.map(x => x.id === p.id ? p : x))} onDeletePartner={id => setPartnerAccounts(prev => prev.filter(x => x.id !== id))} />;
      case ViewType.CHANGE_PASSWORD: return <ChangePasswordView user={user} onUpdatePassword={() => true} />;
      default: return <DashboardView operations={filteredOps} vehicles={vehicles} dispatches={dispatches} />;
    }
  };

  const filteredNavItems = NAV_ITEMS.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      {user && <Header user={user} navItems={filteredNavItems} currentView={currentView} onViewChange={setCurrentView} onLogout={handleLogout} onUpdatePassword={() => true} isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} />}
      <main className="flex-1 min-h-0 relative overflow-hidden">{renderView()}</main>
    </div>
  );
};
export default App;