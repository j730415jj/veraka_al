import { Operation, Client, Vehicle, ViewType, AdminAccount, UnitPriceMaster, Snippet, PartnerAccount } from './types';

export const MOCK_ADMINS: AdminAccount[] = [
  {
    id: 'admin-master',
    name: '최고관리자',
    username: '1111',
    password: '1111',
  }
];

export const MOCK_PARTNERS: PartnerAccount[] = [
  {
    id: 'p1',
    name: '협력업체 담당자',
    username: '0000',
    password: '0000',
    clientName: '동현',
  }
];

export const MOCK_SNIPPETS: Snippet[] = [];
export const MOCK_UNIT_PRICES: UnitPriceMaster[] = [];
export const MOCK_OPERATIONS: Operation[] = [];

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    clientName: '동현',
    presidentName: '장국용',
    phone: '010-2332-4332',
    businessNo: '406-81-64763',
    branches: ['본점', '포항지점'],
    address: '포항시 남구 연일읍 새천년대로 202. 2층',
    businessType: '도매및소매업',
    category: '골재',
    fax: '054-283-1301',
  }
];

export const MOCK_VEHICLES: Vehicle[] = [
  { 
    id: 'v1', 
    vehicleNo: '5017', 
    loginCode: '5017', 
    password: '5017', 
    ownerName: '기사님', 
    phone: '010-0000-0000',
    type: 'VEHICLE' 
  }
];

export const NAV_ITEMS = [
  { label: '홈 (대시보드)', value: ViewType.DASHBOARD, category: '목록관리', roles: ['ADMIN', 'VEHICLE', 'PARTNER'] },
  { label: '배차 관리', value: ViewType.DISPATCH_MGMT, category: '목록관리', roles: ['ADMIN', 'VEHICLE'] },
  { label: '운행내역 확인/입력', value: ViewType.OPERATION_ENTRY, category: '운행입력', roles: ['ADMIN', 'PARTNER'] },
  { label: '거래처별 현황', value: ViewType.CLIENT_SUMMARY, category: '현황관리', roles: ['ADMIN'] },
  { label: '차량거래 내역서', value: ViewType.VEHICLE_REPORT, category: '현황관리', roles: ['ADMIN', 'VEHICLE'] },
  { label: '상호별 내역서', value: ViewType.COMPANY_REPORT, category: '현황관리', roles: ['ADMIN'] },
  { label: '거래처 내역서', value: ViewType.CLIENT_REPORT, category: '현황관리', roles: ['ADMIN', 'PARTNER'] },
  { label: '실시간 위치', value: ViewType.VEHICLE_TRACKING, category: '현황관리', roles: ['ADMIN'] },
  { label: '세금 계산서', value: ViewType.TAX_INVOICE, category: '현황관리', roles: ['ADMIN', 'PARTNER'] },
  
  // 마스터 정보 관리 (ADMIN 전용)
  { label: '거래처 정보', value: ViewType.MASTER_CLIENT, category: '목록관리', roles: ['ADMIN'] },
  { label: '차량 정보', value: ViewType.MASTER_VEHICLE, category: '목록관리', roles: ['ADMIN'] },
  { label: '단가 설정', value: ViewType.MASTER_UNIT_PRICE, category: '목록관리', roles: ['ADMIN'] },
  { label: '배차 스니펫', value: ViewType.MASTER_SNIPPET, category: '목록관리', roles: ['ADMIN'] },
  { label: '계정 관리', value: ViewType.ACCOUNT_MGMT, category: '목록관리', roles: ['ADMIN'] },
  { label: '비밀번호 변경', value: ViewType.CHANGE_PASSWORD, category: '목록관리', roles: ['ADMIN', 'VEHICLE', 'PARTNER'] },
  
  // 기사님 전용
  { label: '나의 지출 관리', value: ViewType.MASTER_VEHICLE, category: '현황관리', roles: ['VEHICLE'] },
];