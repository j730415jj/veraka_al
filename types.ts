export type UserRole = 'ADMIN' | 'VEHICLE' | 'PARTNER' | 'CLIENT';

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  identifier: string;
  username: string; // 🔥 [에러 해결] 로그인 화면에서 필요함
}

// 🔥 [에러 해결] 대시보드 및 차량내역서용
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
  expenses?: Expense[]; // 🔥 [에러 해결] 대시보드 에러 방지
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
  accessCode?: string; // 🔥 [에러 해결] 업체 로그인용 비번
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

// 🔥 [핵심 수정] ClientSummaryView 에러(image_e4bb37) 해결
// 기존 코드가 totalCount 등을 찾는데, 실제 뷰 파일은 depositAmount 등을 쓰고 있어서 맞췄습니다.
export interface SummaryData {
    clientName: string;
    depositAmount: number; // 입금(매출)
    payoutAmount: number;  // 출금(지출/차량비)
    margin: number;        // 마진
    // 호환성을 위해 아래 필드도 남겨둠 (혹시 다른데서 쓸까봐)
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
}