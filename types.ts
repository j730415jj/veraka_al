export type UserRole = 'ADMIN' | 'VEHICLE' | 'PARTNER';

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  identifier: string;
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
  // 👇 DB와 앱 양쪽 호환을 위해 둘 다 허용
  invoicePhoto?: string;
  invoice_photo?: string;
  // 🔥 [추가] 매출(SALES) / 매입(PURCHASE) 구분
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
  // 🔥 [추가] 배차 시 매출/매입 구분
  type?: 'SALES' | 'PURCHASE';
  // 🔥 [추가] 관리자가 올린 송장 사진 (배차 단계에서 저장될 경우)
  invoicePhoto?: string;
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
}