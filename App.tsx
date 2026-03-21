import React, { useState, useEffect, useRef } from 'react';
import { getFCMToken, onForegroundMessage } from './firebase';
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
import DispatchManagementView from './components/DispatchManagementView';
import AccountManagementView from './components/AccountManagementView';
import DashboardView from './components/DashboardView';
import ChangePasswordView from './components/ChangePasswordView';
import LoginView from './components/LoginView';
import Header from './components/Header';
import VehicleTrackingView from './components/VehicleTrackingView';
import VehicleTransactionStatementNew from './components/VehicleTransactionStatementNew';
import CompanyTransactionStatement from './components/CompanyTransactionStatement';
import ClientTransactionStatement from './components/ClientTransactionStatement';

const SUPABASE_FUNCTION_URL = 'https://yglnvedpjtxtzjprkhjp.supabase.co/functions/v1/send-push-notification';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnbG52ZWRwanR4dHpqcHJraGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwNjM1NDcsImV4cCI6MjA1MzYzOTU0N30.yCVDdBmeCGBnKx2ITNF0KWXQ3GH6ZxDyRKoVPGu9FcE';

const sendPushNotification = async (vehicleNo: string, title: string, body: string) => {
  try {
    await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ vehicle_no: vehicleNo, title, body })
    });
  } catch (err) {
    console.warn('푸시 발송 실패:', err);
  }
};

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const [operations, setOperations] = useState<Operation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(MOCK_ADMINS);
  const [unitPrices, setUnitPrices] = useState<UnitPriceMaster[]>([]); 
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [partnerAccounts, setPartnerAccounts] = useState<PartnerAccount[]>(MOCK_PARTNERS);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any>(null);
  const locationIntervalRef = useRef<any>(null);
  const refreshIntervalRef = useRef<any>(null);

  useEffect(() => {
    audioRef.current = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
    audioRef.current.load();

    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    
    const unlockAudioAndScreen = async () => {
      if(audioRef.current) {
        audioRef.current.volume = 1.0; 
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      try { 
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {}
      document.removeEventListener('click', unlockAudioAndScreen);
      document.removeEventListener('touchstart', unlockAudioAndScreen);
    };
    document.addEventListener('click', unlockAudioAndScreen);
    document.addEventListener('touchstart', unlockAudioAndScreen);
  }, []);

  const playAlertSound = (title: string, body: string) => {
    try {
      if (audioRef.current) { 
        audioRef.current.currentTime = 0; 
        audioRef.current.play().catch(e => console.warn(e)); 
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500, 200, 500, 200, 500]); 
      }
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: '/vite.svg' });
      }
    } catch (e) { console.error(e); }
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

    refreshIntervalRef.current = setInterval(() => {
      fetchData();
    }, 30000);

    getFCMToken().then(token => {
      if (token) {
        const savedUser = localStorage.getItem('veraka_user');
        if (savedUser) {
          const u = JSON.parse(savedUser);
          if (u.role === 'VEHICLE') {
            supabase.from('vehicles')
              .update({ fcm_token: token })
              .eq('vehicle_no', u.identifier)
              .then(({ error }) => {
                if (error) console.warn('FCM 토큰 저장 실패:', error);
                else console.log('✅ FCM 토큰 저장 완료');
              });
          }
        }
      }
    });

    onForegroundMessage((payload) => {
      const title = payload.notification?.title || '베라카 알림';
      const body = payload.notification?.body || '';
      playAlertSound(title, body);
      alert(`🔔 ${title}\n${body}`);
    });

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('global-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatches' }, (payload) => {
          const newD = payload.new as any;
          const safeVehicleNo = newD.vehicle_no || newD.vehicleNo || '';
          const safeClientName = newD.client_name || newD.clientName || '';

          const convertDispatch = (d: any): Dispatch => ({
            id: d.id, date: d.date, 
            clientName: safeClientName, 
            vehicleNo: safeVehicleNo,
            origin: d.origin, destination: d.destination, item: d.item, count: d.count,
            remarks: d.remarks, status: d.status,
            type: d.type
          });

          if (payload.eventType === 'INSERT') {
            const newDispatch = convertDispatch(newD);
            setDispatches(prev => [newDispatch, ...prev]);
            const cleanVehicleNo = String(newDispatch.vehicleNo || '').replace(/\s+/g, '');
            const cleanIdentifier = String(user.identifier || '').replace(/\s+/g, '');
            if (user.role === 'VEHICLE' && (cleanVehicleNo.includes(cleanIdentifier) || cleanIdentifier.includes(cleanVehicleNo))) {
              playAlertSound("🔔 [배차] 새 오더 도착!", `${newDispatch.origin} ▶ ${newDispatch.destination}`);
              setTimeout(() => alert(`🔔 [새 배차 알림]\n\n상차: ${newDispatch.origin}\n하차: ${newDispatch.destination}\n품명: ${newDispatch.item}`), 200);
            }
          } 
          else if (payload.eventType === 'UPDATE') {
            const updated = convertDispatch(newD);
            setDispatches(prev => prev.map(d => {
                if (d.id === updated.id) {
                    const protectedVehicleNo = updated.vehicleNo ? updated.vehicleNo : d.vehicleNo;
                    return { ...d, ...updated, vehicleNo: protectedVehicleNo };
                }
                return d;
            }));
            const oldStatus = (payload.old as any).status;
            if (user.role === 'ADMIN' && updated.status === 'completed' && oldStatus !== 'completed') {
              playAlertSound("✅ 운행 완료", `차량: ${updated.vehicleNo}`);
              fetchData();
            }
          }
          else if (payload.eventType === 'DELETE') {
             setDispatches(prev => prev.filter(d => d.id !== payload.old.id));
          }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operations' }, () => {
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
        supabase.from('operations').select('*').order('date', { ascending: false }).limit(300), 
        supabase.from('admins').select('*'),
        supabase.from('unit_prices').select('*'),
        supabase.from('snippets').select('*'),
        supabase.from('dispatches').select('*').order('created_at', { ascending: false }).limit(200)
      ]);

      if (v.data) setVehicles(v.data.map((x:any) => ({ ...x, id: x.id, vehicleNo: x.vehicle_no || x.vehicleNo || '', ownerName: x.owner_name || x.ownerName || '', loginCode: x.login_code || x.loginCode || '', password: x.password || '', type: 'VEHICLE' })));
      if (c.data) setClients(c.data.map((x:any) => ({ ...x, id: x.id, clientName: x.client_name || x.clientName || '', presidentName: x.president_name || x.presidentName || '', businessNo: x.business_no || x.businessNo || '', businessType: x.business_type || x.businessType || '', branches: x.branches })));
      if (o.data) setOperations(o.data.map((x:any) => ({ ...x, id: x.id, date: x.date || '', clientName: x.client_name || x.clientName || '', vehicleNo: x.vehicle_no || x.vehicleNo || '', unitPrice: x.unit_price || 0, supplyPrice: x.supply_price || 0, totalAmount: x.total_amount || 0, settlementStatus: x.settlement_status || 'PENDING', branchName: x.branch_name || '', clientUnitPrice: x.client_unit_price || 0, itemDescription: x.item_description || '', isInvoiceIssued: x.is_invoice_issued || false, invoicePhoto: x.invoice_photo || undefined, origin: x.origin || '', destination: x.destination || '', item: x.item || '', quantity: x.quantity || 0, remarks: x.remarks || '', type: x.type || 'SALES' })));
      if (a.data) setAdminAccounts(a.data);
      if (u.data) setUnitPrices(u.data.map((x:any) => ({ ...x, id: x.id, clientName: x.client_name, branchName: x.branch_name, unitPrice: x.unit_price, clientUnitPrice: x.client_unit_price })));
      if (s.data) setSnippets(s.data.map((x:any) => ({ ...x, id: x.id, clientName: x.client_name })));
      if (d.data) setDispatches(d.data.map((x:any) => ({ id: x.id, date: x.date, clientName: x.client_name || x.clientName || '', vehicleNo: x.vehicle_no || x.vehicleNo || '', origin: x.origin, destination: x.destination, item: x.item, count: x.count, remarks: x.remarks, status: x.status, type: x.type || 'SALES' })));

    } catch (error) { console.error("데이터 로딩 에러:", error); }
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const startLocationTracking = (vehicleNo: string) => {
    if (!navigator.geolocation) return;
    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          await supabase.from('vehicle_locations').upsert({
            vehicle_no: vehicleNo,
            latitude: coords.latitude,
            longitude: coords.longitude,
            speed: coords.speed ? Math.round(coords.speed * 3.6) : 0,
            updated_at: new Date().toISOString()
          }, { onConflict: 'vehicle_no' });
        },
        (err) => console.warn('위치 오류:', err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };
    sendLocation();
    locationIntervalRef.current = setInterval(sendLocation, 30000);
  };

  const stopLocationTracking = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  const handleLogin = (loggedInUser: AuthUser) => {
    setUser(loggedInUser);
    let nextView = ViewType.DASHBOARD;
    if (loggedInUser.role === 'VEHICLE') nextView = ViewType.DISPATCH_MGMT;
    else if (loggedInUser.role === 'PARTNER') nextView = ViewType.OPERATION_ENTRY;
    setCurrentView(nextView);
    localStorage.setItem('veraka_user', JSON.stringify(loggedInUser));
    if (loggedInUser.role === 'VEHICLE') {
      startLocationTracking(loggedInUser.identifier);
    }
  };

  const handleLogout = () => {
    stopLocationTracking();
    setUser(null);
    localStorage.removeItem('veraka_user');
  };

  const handleSaveVehicle = async (v: Vehicle) => { const dbData = { vehicle_no: v.vehicleNo, owner_name: v.ownerName, phone: v.phone, password: v.password, login_code: v.loginCode }; const { error } = v.id.length === 36 ? await supabase.from('vehicles').update(dbData).eq('id', v.id) : await supabase.from('vehicles').insert(dbData); if(error) alert("저장 실패: " + error.message); else fetchData(); };
  const handleDeleteVehicle = async (id: string) => { if(window.confirm("삭제?")) { await supabase.from('vehicles').delete().eq('id', id); fetchData(); }};
  const handleSaveClient = async (c: Client) => { const dbData = { client_name: c.clientName, president_name: c.presidentName, phone: c.phone, business_no: c.businessNo, branches: c.branches, address: c.address, fax: c.fax, business_type: c.businessType, category: c.category }; const { error } = c.id.length === 36 ? await supabase.from('clients').update(dbData).eq('id', c.id) : await supabase.from('clients').insert(dbData); if(error) alert("실패: "+error.message); else fetchData(); };
  const handleDeleteClient = async (id: string) => { if(confirm("삭제?")) { await supabase.from('clients').delete().eq('id', id); fetchData(); }};
  const handleAddOperation = async (op: Operation) => { setOperations(prev => [op, ...prev]); await supabase.from('operations').insert({ id: op.id, date: op.date, client_name: op.clientName, vehicle_no: op.vehicleNo, origin: op.origin, destination: op.destination, item: op.item, unit_price: op.unitPrice, quantity: op.quantity, supply_price: op.supplyPrice, tax: op.tax, total_amount: op.totalAmount, remarks: op.remarks, settlement_status: op.settlementStatus, branch_name: op.branchName, client_unit_price: op.clientUnitPrice, item_description: op.itemDescription, is_invoice_issued: op.isInvoiceIssued, invoice_photo: op.invoice_photo, type: op.type }); };
  const handleUpdateOperation = async (op: Operation) => { setOperations(prev => prev.map(o => o.id === op.id ? op : o)); await supabase.from('operations').update({ date: op.date, client_name: op.clientName, vehicle_no: op.vehicleNo, origin: op.origin, destination: op.destination, item: op.item, quantity: op.quantity, unit_price: op.unitPrice, supply_price: op.supplyPrice, tax: op.tax, total_amount: op.totalAmount, remarks: op.remarks, settlement_status: op.settlementStatus, branch_name: op.branchName, client_unit_price: op.clientUnitPrice, item_description: op.itemDescription, is_invoice_issued: op.isInvoiceIssued, invoice_photo: op.invoice_photo, type: op.type }).eq('id', op.id); };
  const handleSaveUnitPrice = async (u: UnitPriceMaster) => { const dbData = { client_name: u.clientName, branch_name: u.branchName, origin: u.origin, destination: u.destination, item: u.item, unit_price: u.unitPrice, client_unit_price: u.clientUnitPrice }; if(u.id.length===36) await supabase.from('unit_prices').update(dbData).eq('id', u.id); else await supabase.from('unit_prices').insert(dbData); fetchData(); };
  const handleDeleteUnitPrice = async (id: string) => { if(confirm("삭제?")) { await supabase.from('unit_prices').delete().eq('id', id); fetchData(); }};
  const handleSaveSnippet = async (s: Snippet) => { const dbData = { title: s.title, content: s.content, keyword: s.keyword, origin: s.origin, destination: s.destination, item: s.item, client_name: s.clientName }; if(s.id.length===36) await supabase.from('snippets').update(dbData).eq('id', s.id); else await supabase.from('snippets').insert(dbData); fetchData(); };
  const handleDeleteSnippet = async (id: string) => { if(confirm("삭제?")) { await supabase.from('snippets').delete().eq('id', id); fetchData(); }};
  const handleUpdateDispatchStatus = async (id: string, status: 'pending'|'sent'|'completed', photo?: string, manualQuantity?: number) => { setDispatches(prev => prev.map(d => d.id === id ? { ...d, status } : d)); await supabase.from('dispatches').update({ status }).eq('id', id); fetchData(); };

  const renderView = () => {
    if (!user) return <LoginView onLogin={handleLogin} />;
    
    const matchVehicle = (opVehicleNo: string, identifier: string) => {
      const clean1 = String(opVehicleNo || '').replace(/\s+/g, '');
      const clean2 = String(identifier || '').replace(/\s+/g, '');
      return clean1.includes(clean2) || clean2.includes(clean1);
    };

    const filteredOps = user.role === 'PARTNER' 
      ? operations.filter(op => op.clientName === user.identifier) 
      : user.role === 'VEHICLE' 
        ? operations.filter(op => matchVehicle(op.vehicleNo, user.identifier)) 
        : operations;

    const filteredDispatches = user.role === 'VEHICLE'
      ? dispatches.filter(d => matchVehicle(d.vehicleNo, user.identifier))
      : dispatches;

    switch (currentView) {
      case ViewType.DASHBOARD: return <DashboardView operations={filteredOps} vehicles={vehicles} dispatches={filteredDispatches} onUpdateOperation={handleUpdateOperation} />;
      case ViewType.DISPATCH_MGMT:
        return <DispatchManagementView 
            user={user} dispatches={filteredDispatches} vehicles={vehicles} clients={clients} snippets={snippets} operations={operations} unitPrices={unitPrices} 
            onAddDispatch={async (d) => {
                setDispatches(prev => [d, ...prev]);
                const dbData = { id: d.id, date: d.date, client_name: d.clientName, vehicle_no: d.vehicleNo, origin: d.origin, destination: d.destination, item: d.item, remarks: d.remarks, status: d.status, count: d.count, type: d.type };
                await supabase.from('dispatches').insert(dbData);
                await sendPushNotification(d.vehicleNo, '🔔 새 배차 알림', `${d.origin} ▶ ${d.destination} / ${d.item}`);
                fetchData(); 
            }} 
            onUpdateDispatch={async (d) => {
                 setDispatches(prev => prev.map(old => old.id === d.id ? d : old));
                 const dbData = { date: d.date, client_name: d.clientName, vehicle_no: d.vehicleNo, origin: d.origin, destination: d.destination, item: d.item, remarks: d.remarks, status: d.status, count: d.count, type: d.type };
                await supabase.from('dispatches').update(dbData).eq('id', d.id);
                fetchData(); 
            }} 
            onDeleteDispatch={async (id) => { 
                setDispatches(prev => prev.filter(d => d.id !== id));
                if(confirm("삭제?")) { await supabase.from('dispatches').delete().eq('id', id); fetchData(); }
            }} 
            onUpdateStatus={handleUpdateDispatchStatus} 
            onNavigate={setCurrentView} onAddSnippet={handleSaveSnippet} onAddOperation={handleAddOperation}
            onUpdateOperation={handleUpdateOperation} 
          />;
      case ViewType.OPERATION_ENTRY: return <OperationEntryView user={user} operations={filteredOps} vehicles={vehicles} clients={clients} unitPriceMaster={unitPrices} onAddOperation={handleAddOperation} onUpdateOperation={handleUpdateOperation} onDeleteOperation={async (id) => { setOperations(prev => prev.filter(o => o.id !== id)); if(confirm("삭제?")) { await supabase.from('operations').delete().eq('id', id); fetchData(); } }} />;
      case ViewType.CLIENT_SUMMARY: return <ClientSummaryView operations={filteredOps} />;
      case ViewType.VEHICLE_REPORT: return <VehicleTransactionStatementNew operations={filteredOps} vehicles={vehicles} />;
      case ViewType.COMPANY_REPORT: return <CompanyTransactionStatement operations={filteredOps} clients={clients} vehicles={vehicles} userRole={user.role} userIdentifier={user.identifier} />;
      case ViewType.CLIENT_REPORT: return <ClientTransactionStatement operations={filteredOps} clients={clients} vehicles={vehicles} userRole={user.role} userIdentifier={user.identifier} />;
      case ViewType.VEHICLE_TRACKING: return <VehicleTrackingView vehicles={vehicles} />;
      case ViewType.TAX_INVOICE: return <StatementView key="tax" title="세금 계산서" type="client" operations={filteredOps} clients={clients} vehicles={vehicles} userRole={user.role} userIdentifier={user.identifier} />;
      case ViewType.MASTER_CLIENT: return <MasterClientView clients={clients} onSave={handleSaveClient} onDelete={handleDeleteClient} />;
      case ViewType.MASTER_VEHICLE: return <MasterVehicleView vehicles={vehicles} userRole={user.role} onSave={handleSaveVehicle} onDelete={handleDeleteVehicle} />;
      case ViewType.MASTER_UNIT_PRICE: return <MasterUnitPriceView unitPrices={unitPrices} clients={clients} onSave={handleSaveUnitPrice} onDelete={handleDeleteUnitPrice} />;
      case ViewType.MASTER_SNIPPET: return <MasterSnippetView snippets={snippets} clients={clients} onSave={handleSaveSnippet} onDelete={handleDeleteSnippet} />;
      case ViewType.ACCOUNT_MGMT: return <AccountManagementView vehicles={vehicles} adminAccounts={adminAccounts} partnerAccounts={partnerAccounts} clients={clients} onSaveVehicle={handleSaveVehicle} onDeleteVehicle={handleDeleteVehicle} onAddVehicle={handleSaveVehicle} onAddAdmin={a => setAdminAccounts(prev => [...prev, a])} onUpdateAdmin={a => setAdminAccounts(prev => prev.map(x => x.id === a.id ? a : x))} onDeleteAdmin={id => setAdminAccounts(prev => prev.filter(x => x.id !== id))} onAddPartner={p => setPartnerAccounts(prev => [...prev, p])} onUpdatePartner={p => setPartnerAccounts(prev => prev.map(x => x.id === p.id ? p : x))} onDeletePartner={id => setPartnerAccounts(prev => prev.filter(x => x.id !== id))} />;
      case ViewType.CHANGE_PASSWORD: return <ChangePasswordView user={user} onUpdatePassword={() => true} />;
      default: return <DashboardView operations={filteredOps} vehicles={vehicles} dispatches={filteredDispatches} onUpdateOperation={handleUpdateOperation} />;
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
