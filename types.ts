export type UserRole = 'ADMIN' | 'VEHICLE' | 'PARTNER' | 'CLIENT';

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  identifier: string;
  username: string;
}

export interface Expense {
  date: string;
  amount: number;
  note?: string;
}

export interface Vehicle {
  id: string;
  vehicleNo: string;
  ownerName: string;
  phone: string;
  password?: string;
  loginCode?: string;
  type?: string;
  lat?: number;
  lng?: number;
  speed?: number;
  status?: string;
  expenses?: Expense[];
  role?: string;
}

export interface Client {
  id: string;
  clientName: string;
  presidentName: string;
  phone: string;
  businessNo: string;
  branches: string[];
  address?: string;
  fax?: string;
  businessType?: string;
  category?: string;
  accessCode?: string;
  representative?: string;
  email?: string;
}

export interface Operation {
  id: string;
  date: string;
  clientName: string;
  vehicleNo: string;
  origin: string;
  destination: string;
  item: string;
  unitPrice: number;
  quantity: number;
  supplyPrice: number;
  tax: number;
  totalAmount: number;
  remarks: string;
  settlementStatus: string;
  branchName?: string;
  clientUnitPrice?: number;
  itemCode?: string;
  itemDescription?: string;
  isVatIncluded?: boolean;
  isInvoiceIssued?: boolean;
  invoicePhoto?: string;
  invoice_photo?: string;
  type?: 'SALES' | 'PURCHASE'; 
}

export interface Dispatch {
  id: string;
  date: string;
  clientName: string;
  vehicleNo: string;
  origin: string;
  destination: string;
  item: string;
  remarks?: string;
  status: 'pending' | 'sent' | 'completed';
  count?: number; 
  type?: 'SALES' | 'PURCHASE';
  invoicePhoto?: string;
  time?: string;
  isNujuk?: boolean;
}

export interface AdminAccount {
  id: string;
  username: string;
  password?: string;
  name: string;
  role?: 'ADMIN'; 
}

export interface UnitPriceMaster {
    id: string;
    clientName: string;
    origin: string;
    destination: string;
    unitPrice: number;
    clientUnitPrice: number;
    branchName?: string; 
    item?: string;       
}

export interface Snippet {
    id: string;
    title: string;
    content: string;
    keyword?: string;
    origin?: string;      
    destination?: string; 
    item?: string;        
    clientName?: string;  
}

export interface PartnerAccount {
    id: string;
    username?: string;
    password?: string;
    name: string;
    clientName: string;
    phone?: string;
    role?: 'PARTNER'; 
}

export interface SummaryData {
    clientName: string;
    depositAmount: number;
    payoutAmount: number;
    margin: number;
    clientId?: string;
    totalCount?: number;
    totalAmount?: number;
}

export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  DISPATCH_MGMT = 'DISPATCH_MGMT',
  OPERATION_ENTRY = 'OPERATION_ENTRY',
  CLIENT_SUMMARY = 'CLIENT_SUMMARY',
  VEHICLE_REPORT = 'VEHICLE_REPORT',
  COMPANY_REPORT = 'COMPANY_REPORT',
  CLIENT_REPORT = 'CLIENT_REPORT',
  TAX_INVOICE = 'TAX_INVOICE',
  VEHICLE_TRACKING = 'VEHICLE_TRACKING',
  MASTER_CLIENT = 'MASTER_CLIENT',
  MASTER_VEHICLE = 'MASTER_VEHICLE',
  MASTER_UNIT_PRICE = 'MASTER_UNIT_PRICE',
  MASTER_SNIPPET = 'MASTER_SNIPPET',
  ACCOUNT_MGMT = 'ACCOUNT_MGMT',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  SETTINGS = 'SETTINGS', // ✅ 7번: 설정 메뉴 추가
}
