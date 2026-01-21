
import React, { useState, useEffect } from 'react';
import { ViewType, Operation, Client, Vehicle, AuthUser, Dispatch, AdminAccount, UnitPriceMaster, Snippet, PartnerAccount } from './types';
import { NAV_ITEMS, MOCK_OPERATIONS, MOCK_CLIENTS, MOCK_VEHICLES, MOCK_ADMINS, MOCK_UNIT_PRICES, MOCK_SNIPPETS, MOCK_PARTNERS } from './constants';
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

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // 데이터 상태 관리
  const [operations, setOperations] = useState<Operation[]>(MOCK_OPERATIONS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [unitPrices, setUnitPrices] = useState<UnitPriceMaster[]>(MOCK_UNIT_PRICES);
  const [snippets, setSnippets] = useState<Snippet[]>(MOCK_SNIPPETS);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [partnerAccounts, setPartnerAccounts] = useState<PartnerAccount[]>(MOCK_PARTNERS);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(MOCK_ADMINS);

  // 테마 적용
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleLogin = (identifier: string, password?: string, type?: 'VEHICLE' | 'PARTNER' | 'ADMIN') => {
    if (type === 'ADMIN') {
      const admin = adminAccounts.find(a => a.username === identifier && a.password === password);
      if (admin) {
        setUser({ id: admin.id, role: 'ADMIN', name: admin.name, identifier: admin.username });
        setCurrentView(ViewType.DASHBOARD);
        return true;
      }
    } else if (type === 'PARTNER') {
      const partner = partnerAccounts.find(p => p.username === identifier && p.password === password);
      if (partner) {
        setUser({ id: partner.id, role: 'PARTNER', name: partner.name, identifier: partner.clientName });
        // 협력업체는 로그인 시 즉시 운행 내역(스프레드시트 뷰) 화면으로 이동
        setCurrentView(ViewType.OPERATION_ENTRY);
        return true;
      }
    } else {
      const vehicle = vehicles.find(v => v.loginCode === identifier && v.password === (password || identifier));
      if (vehicle) {
        setUser({ id: vehicle.id, role: 'VEHICLE', name: vehicle.ownerName, identifier: vehicle.vehicleNo });
        setCurrentView(ViewType.DISPATCH_MGMT);
        return true;
      }
    }
    return false;
  };

  const handleLogout = () => setUser(null);

  // 배차 상태 변경 및 운행 내역 자동 등록 핸들러
  const handleUpdateDispatchStatus = (id: string, status: 'pending' | 'sent' | 'completed', photo?: string, manualQuantity?: number) => {
    setDispatches(prev => prev.map(d => {
      if (d.id === id) {
        if (status === 'completed' && d.status !== 'completed') {
          const matchedPrice = unitPrices.find(up => 
            up.clientName === d.clientName && 
            up.origin === d.origin && 
            up.destination === d.destination
          );

          const uPrice = matchedPrice?.unitPrice || 0;
          const cUPrice = matchedPrice?.clientUnitPrice || 0;
          const qty = manualQuantity || 0;
          const supplyPrice = Math.round(uPrice * qty);
          const tax = Math.round(supplyPrice * 0.1);

          const autoOp: Operation = {
            id: `op-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            vehicleNo: d.vehicleNo,
            clientName: d.clientName,
            clientUnitPrice: cUPrice,
            origin: d.origin,
            destination: d.destination,
            item: d.item,
            itemCode: 'AUTO',
            itemDescription: '',
            unitPrice: uPrice,
            quantity: qty,
            supplyPrice: supplyPrice,
            tax: tax,
            totalAmount: supplyPrice + tax,
            settlementStatus: 'PENDING',
            isVatIncluded: false,
            isInvoiceIssued: !!photo,
            invoicePhoto: photo,
            remarks: d.remarks
          };

          setOperations(ops => [autoOp, ...ops]);
        }
        return { ...d, status };
      }
      return d;
    }));
  };

  const renderView = () => {
    if (!user) return <LoginView onLogin={handleLogin} />;
    
    // 협력업체일 경우 자신의 거래처명 데이터만 필터링
    const filteredOps = user.role === 'PARTNER' 
      ? operations.filter(op => op.clientName === user.identifier) 
      : user.role === 'VEHICLE'
        ? operations.filter(op => op.vehicleNo === user.identifier)
        : operations;

    switch (currentView) {
      case ViewType.DASHBOARD:
        return <DashboardView operations={filteredOps} vehicles={vehicles} dispatches={dispatches} />;
      
      case ViewType.DISPATCH_MGMT:
        return (
          <DispatchManagementView 
            user={user} 
            dispatches={dispatches} 
            vehicles={vehicles} 
            clients={clients} 
            snippets={snippets} 
            operations={operations} 
            onAddDispatch={d => setDispatches(prev => [d, ...prev])} 
            onUpdateDispatch={d => setDispatches(prev => prev.map(x => x.id === d.id ? d : x))} 
            onDeleteDispatch={id => setDispatches(prev => prev.filter(d => d.id !== id))} 
            onUpdateStatus={handleUpdateDispatchStatus} 
            onNavigate={setCurrentView} 
          />
        );

      case ViewType.OPERATION_ENTRY:
        return (
          <OperationEntryView 
            user={user}
            operations={filteredOps} 
            vehicles={vehicles} 
            clients={clients} 
            unitPriceMaster={unitPrices}
            onAddOperation={op => setOperations(prev => [op, ...prev])}
            onUpdateOperation={op => setOperations(prev => prev.map(o => o.id === op.id ? op : o))}
            onDeleteOperation={id => setOperations(prev => prev.filter(o => o.id !== id))}
          />
        );

      case ViewType.CLIENT_SUMMARY:
        return <ClientSummaryView operations={filteredOps} />;

      case ViewType.VEHICLE_REPORT:
        return <StatementView title="차량거래 내역서" type="vehicle" operations={filteredOps} clients={clients} userRole={user.role} userIdentifier={user.identifier} />;

      case ViewType.COMPANY_REPORT:
        return <StatementView title="상호별 내역서" type="company" operations={filteredOps} clients={clients} userRole={user.role} userIdentifier={user.identifier} />;

      case ViewType.CLIENT_REPORT:
        return <StatementView title="거래처 내역서" type="client" operations={filteredOps} clients={clients} userRole={user.role} userIdentifier={user.identifier} />;

      case ViewType.TAX_INVOICE:
        return <StatementView title="세금 계산서" type="client" operations={filteredOps} clients={clients} userRole={user.role} userIdentifier={user.identifier} />;

      case ViewType.VEHICLE_TRACKING:
        return <VehicleTrackingView vehicles={vehicles} />;

      case ViewType.MASTER_CLIENT:
        return <MasterClientView clients={clients} onSave={c => setClients(prev => prev.find(x => x.id === c.id) ? prev.map(x => x.id === c.id ? c : x) : [...prev, c])} onDelete={id => setClients(prev => prev.filter(x => x.id !== id))} />;
      
      case ViewType.MASTER_VEHICLE:
        return <MasterVehicleView vehicles={vehicles} userRole={user.role} onSave={v => setVehicles(prev => prev.find(x => x.id === v.id) ? prev.map(x => x.id === v.id ? v : x) : [...prev, v])} onDelete={id => setVehicles(prev => prev.filter(x => x.id !== id))} />;

      case ViewType.MASTER_UNIT_PRICE:
        return <MasterUnitPriceView unitPrices={unitPrices} clients={clients} onSave={up => setUnitPrices(prev => prev.find(x => x.id === up.id) ? prev.map(x => x.id === up.id ? up : x) : [...prev, up])} onDelete={id => setUnitPrices(prev => prev.filter(x => x.id !== id))} />;

      case ViewType.MASTER_SNIPPET:
        return <MasterSnippetView snippets={snippets} clients={clients} onSave={s => setSnippets(prev => prev.find(x => x.id === s.id) ? prev.map(x => x.id === s.id ? s : x) : [...prev, s])} onDelete={id => setSnippets(prev => prev.filter(x => x.id !== id))} />;

      case ViewType.ACCOUNT_MGMT:
        return (
          <AccountManagementView 
            vehicles={vehicles} 
            adminAccounts={adminAccounts} 
            partnerAccounts={partnerAccounts}
            clients={clients}
            onSaveVehicle={v => setVehicles(prev => prev.map(x => x.id === v.id ? v : x))} 
            onDeleteVehicle={id => setVehicles(prev => prev.filter(x => x.id !== id))} 
            onAddVehicle={v => setVehicles(prev => [...prev, v])} 
            onAddAdmin={a => setAdminAccounts(prev => [...prev, a])} 
            onUpdateAdmin={a => setAdminAccounts(prev => prev.map(x => x.id === a.id ? a : x))} 
            onDeleteAdmin={id => setAdminAccounts(prev => prev.filter(x => x.id !== id))} 
            onAddPartner={p => setPartnerAccounts(prev => [...prev, p])}
            onUpdatePartner={p => setPartnerAccounts(prev => prev.map(x => x.id === p.id ? p : x))}
            onDeletePartner={id => setPartnerAccounts(prev => prev.filter(x => x.id !== id))}
          />
        );

      case ViewType.CHANGE_PASSWORD:
        return <ChangePasswordView user={user} onUpdatePassword={() => true} />;

      default:
        return <DashboardView operations={filteredOps} vehicles={vehicles} dispatches={dispatches} />;
    }
  };

  const filteredNavItems = NAV_ITEMS.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      {user && (
        <Header 
          user={user} 
          navItems={filteredNavItems}
          currentView={currentView}
          onViewChange={setCurrentView}
          onLogout={handleLogout} 
          onUpdatePassword={() => true}
          isDarkMode={isDarkMode} 
          onToggleTheme={() => setIsDarkMode(!isDarkMode)} 
        />
      )}
      <main className="flex-1 min-h-0 relative overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
