export type TransactionType = 'expense' | 'income';

export type Category = 
  | 'Food' 
  | 'Transport' 
  | 'Shopping' 
  | 'Bills' 
  | 'Health' 
  | 'Entertainment' 
  | 'Education' 
  | 'Salary' 
  | 'Bonus' 
  | 'Investment' 
  | 'Gift' 
  | 'Other';

export type Wallet = 
  | 'BCA' 
  | 'BNI' 
  | 'BRI' 
  | 'Mandiri' 
  | 'JAGO' 
  | 'Krom' 
  | 'SeaBank' 
  | 'GO Pay' 
  | 'OVO' 
  | 'DANA' 
  | 'ShopeePay' 
  | 'Cash' 
  | 'Other';

export interface Transaction {
  id: string | number;
  date: string; // YYYY-MM-DD
  amount: number;
  category: Category | string;
  type: TransactionType;
  wallet: Wallet | string;
  note?: string;
  media?: string; // base64 or URL
  mediaType?: string;
}

export interface AIScanResult {
  amount?: number;
  date?: string;
  category?: Category | string;
  type?: TransactionType;
  wallet?: Wallet | string;
  note?: string;
  merchant?: string;
  items?: Array<{ name: string; price: number; qty?: number }>;
  rawText?: string;
}

export interface CustomCategoryItem {
  id: string;
  name: string;
  type: TransactionType;
  icon?: string;
}

export interface CustomWalletItem {
  id: string;
  name: string;
  type?: 'bank' | 'ewallet' | 'cash' | 'other';
  initialBalance: number;
}

export interface GasConfig {
  scriptUrl: string;
  sheetName: string;
  spreadsheetId?: string;
  isAutoSync: boolean;
}

export interface WalletInitialBalances {
  [walletName: string]: number;
}

export type DebtCategory = 'TOJAN' | 'KELUARGA';

export interface DebtScheduleItem {
  id: string;
  no: number; // 1 to 56
  year: number; // 2024, 2025, 2026, 2027, 2028, 2029
  month: string; // JUNI, JULI, AGUSTUS, etc.
  type: DebtCategory;
  interest: number; // BUNGA (Rp)
  principal: number; // POKOK (Rp)
  totalPayment: number; // TOTAL P+B (Rp 3.198.036)
  remainingDebt: number; // SISA HUTANG (Rp)
  isPaid: boolean; // CEKLIST
  paidDate?: string;
  proofUrl?: string; // base64 screenshot bukti transfer
  note?: string;
}

export interface DebtArchiveRecord {
  id: string;
  debtId: string;
  no: number;
  year: number;
  month: string;
  type: DebtCategory;
  amount: number;
  interest?: number;
  principal?: number;
  paidDate: string;
  proofUrl?: string;
  notes?: string;
  createdAt: string;
}

export type AutoSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface AutoSyncState {
  status: AutoSyncStatus;
  lastSynced: string | null;
  message?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
}
