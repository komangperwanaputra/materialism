import { 
  Transaction, 
  GasConfig, 
  WalletInitialBalances, 
  DebtScheduleItem, 
  DebtArchiveRecord,
  CustomCategoryItem,
  CustomWalletItem
} from '../types';

export const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbwJTvtY0Yqikn8TqyD2NeI-pr5H7cjLZOKDEL4DDc_SjhBoaEJ9ccdAS9f6dOI0Xumm/exec";

const STORAGE_KEYS = {
  TRANSACTIONS: 'materialism_transactions_v2',
  GAS_CONFIG: 'materialism_gas_config_v2',
  PRIVACY: 'materialism_privacy_mode',
  WALLET_BALANCES: 'materialism_wallet_initial_balances_v1',
  DEBT_ITEMS: 'materialism_debt_items_v1',
  DEBT_ARCHIVES: 'materialism_debt_archives_v1',
  CUSTOM_CATEGORIES: 'materialism_custom_categories_v2',
  CUSTOM_WALLETS: 'materialism_custom_wallets_v2',
};

export const INITIAL_DEBT_SCHEDULE: DebtScheduleItem[] = [
  // 2024 (7 items: June to Dec - ALL PAID)
  { id: 'tojan-1', no: 1, year: 2024, month: 'JUNE', type: 'TOJAN', interest: 1117708, principal: 2080328, totalPayment: 3198036, remainingDebt: 142919672, isPaid: true, paidDate: '2024-06-25', note: 'Installment 1 (Tojan Land Credit)' },
  { id: 'tojan-2', no: 2, year: 2024, month: 'JULY', type: 'TOJAN', interest: 1101672, principal: 2096364, totalPayment: 3198036, remainingDebt: 140823309, isPaid: true, paidDate: '2024-07-25', note: 'Installment 2' },
  { id: 'tojan-3', no: 3, year: 2024, month: 'AUGUST', type: 'TOJAN', interest: 1085513, principal: 2112523, totalPayment: 3198036, remainingDebt: 138710786, isPaid: true, paidDate: '2024-08-25', note: 'Installment 3' },
  { id: 'tojan-4', no: 4, year: 2024, month: 'SEPTEMBER', type: 'TOJAN', interest: 1069229, principal: 2128807, totalPayment: 3198036, remainingDebt: 136581979, isPaid: true, paidDate: '2024-09-25', note: 'Installment 4' },
  { id: 'tojan-5', no: 5, year: 2024, month: 'OCTOBER', type: 'TOJAN', interest: 1052819, principal: 2145217, totalPayment: 3198036, remainingDebt: 134436762, isPaid: true, paidDate: '2024-10-25', note: 'Installment 5' },
  { id: 'tojan-6', no: 6, year: 2024, month: 'NOVEMBER', type: 'TOJAN', interest: 1036283, principal: 2161753, totalPayment: 3198036, remainingDebt: 132275009, isPaid: true, paidDate: '2024-11-25', note: 'Installment 6' },
  { id: 'tojan-7', no: 7, year: 2024, month: 'DECEMBER', type: 'TOJAN', interest: 1019620, principal: 2178416, totalPayment: 3198036, remainingDebt: 130096593, isPaid: true, paidDate: '2024-12-25', note: 'Installment 7' },

  // 2025 (12 items: Jan to Dec - ALL PAID)
  { id: 'tojan-8', no: 8, year: 2025, month: 'JANUARY', type: 'TOJAN', interest: 1002828, principal: 2195208, totalPayment: 3198036, remainingDebt: 127901385, isPaid: true, paidDate: '2025-01-25', note: 'Installment 8' },
  { id: 'tojan-9', no: 9, year: 2025, month: 'FEBRUARY', type: 'TOJAN', interest: 985907, principal: 2212130, totalPayment: 3198036, remainingDebt: 125689256, isPaid: true, paidDate: '2025-02-25', note: 'Installment 9' },
  { id: 'tojan-10', no: 10, year: 2025, month: 'MARCH', type: 'TOJAN', interest: 968855, principal: 2229181, totalPayment: 3198036, remainingDebt: 123460074, isPaid: true, paidDate: '2025-03-25', note: 'Installment 10' },
  { id: 'tojan-11', no: 11, year: 2025, month: 'APRIL', type: 'TOJAN', interest: 951671, principal: 2246365, totalPayment: 3198036, remainingDebt: 121213710, isPaid: true, paidDate: '2025-04-25', note: 'Installment 11' },
  { id: 'tojan-12', no: 12, year: 2025, month: 'MAY', type: 'TOJAN', interest: 934356, principal: 2263680, totalPayment: 3198036, remainingDebt: 118950029, isPaid: true, paidDate: '2025-05-25', note: 'Installment 12' },
  { id: 'tojan-13', no: 13, year: 2025, month: 'JUNE', type: 'TOJAN', interest: 916906, principal: 2281130, totalPayment: 3198036, remainingDebt: 116668900, isPaid: true, paidDate: '2025-06-25', note: 'Installment 13' },
  { id: 'tojan-14', no: 14, year: 2025, month: 'JULY', type: 'TOJAN', interest: 899323, principal: 2298713, totalPayment: 3198036, remainingDebt: 114370186, isPaid: true, paidDate: '2025-07-25', note: 'Installment 14' },
  { id: 'tojan-15', no: 15, year: 2025, month: 'AUGUST', type: 'TOJAN', interest: 881604, principal: 2316433, totalPayment: 3198036, remainingDebt: 112053754, isPaid: true, paidDate: '2025-08-25', note: 'Installment 15' },
  { id: 'tojan-16', no: 16, year: 2025, month: 'SEPTEMBER', type: 'TOJAN', interest: 863748, principal: 2334288, totalPayment: 3198036, remainingDebt: 109719465, isPaid: true, paidDate: '2025-09-25', note: 'Installment 16' },
  { id: 'tojan-17', no: 17, year: 2025, month: 'OCTOBER', type: 'TOJAN', interest: 845754, principal: 2352282, totalPayment: 3198036, remainingDebt: 107367184, isPaid: true, paidDate: '2025-10-25', note: 'Installment 17' },
  { id: 'tojan-18', no: 18, year: 2025, month: 'NOVEMBER', type: 'TOJAN', interest: 827622, principal: 2370414, totalPayment: 3198036, remainingDebt: 104996770, isPaid: true, paidDate: '2025-11-25', note: 'Installment 18' },
  { id: 'tojan-19', no: 19, year: 2025, month: 'DECEMBER', type: 'TOJAN', interest: 809350, principal: 2388686, totalPayment: 3198036, remainingDebt: 102608084, isPaid: true, paidDate: '2025-12-25', note: 'Installment 19' },

  // 2026 (Items 20 to 28 are PAID - 9 items up to Sept 2026, total 28 paid!)
  { id: 'tojan-20', no: 20, year: 2026, month: 'JANUARY', type: 'TOJAN', interest: 790937, principal: 2407099, totalPayment: 3198036, remainingDebt: 100200985, isPaid: true, paidDate: '2026-01-25', note: 'Installment 20' },
  { id: 'tojan-21', no: 21, year: 2026, month: 'FEBRUARY', type: 'TOJAN', interest: 772383, principal: 2425653, totalPayment: 3198036, remainingDebt: 97775332, isPaid: true, paidDate: '2026-02-25', note: 'Installment 21' },
  { id: 'tojan-22', no: 22, year: 2026, month: 'MARCH', type: 'TOJAN', interest: 753685, principal: 2444351, totalPayment: 3198036, remainingDebt: 95330980, isPaid: true, paidDate: '2026-03-25', note: 'Installment 22' },
  { id: 'tojan-23', no: 23, year: 2026, month: 'APRIL', type: 'TOJAN', interest: 734843, principal: 2463193, totalPayment: 3198036, remainingDebt: 92867787, isPaid: true, paidDate: '2026-04-25', note: 'Installment 23' },
  { id: 'tojan-24', no: 24, year: 2026, month: 'MAY', type: 'TOJAN', interest: 715856, principal: 2482180, totalPayment: 3198036, remainingDebt: 90385607, isPaid: true, paidDate: '2026-05-25', note: 'Installment 24' },
  { id: 'tojan-25', no: 25, year: 2026, month: 'JUNE', type: 'TOJAN', interest: 696722, principal: 2501314, totalPayment: 3198036, remainingDebt: 87884293, isPaid: true, paidDate: '2026-06-25', note: 'Installment 25' },
  { id: 'tojan-26', no: 26, year: 2026, month: 'JULY', type: 'TOJAN', interest: 677441, principal: 2520595, totalPayment: 3198036, remainingDebt: 85363699, isPaid: true, paidDate: '2026-07-25', note: 'Installment 26' },
  { id: 'tojan-27', no: 27, year: 2026, month: 'AUGUST', type: 'TOJAN', interest: 658012, principal: 2540024, totalPayment: 3198036, remainingDebt: 82823675, isPaid: true, paidDate: '2026-08-25', note: 'Installment 27' },
  { id: 'tojan-28', no: 28, year: 2026, month: 'SEPTEMBER', type: 'TOJAN', interest: 638432, principal: 2559604, totalPayment: 3198036, remainingDebt: 80264071, isPaid: true, paidDate: '2026-09-25', note: 'Installment 28' },

  // Remaining Unpaid Installments (29 to 56)
  { id: 'tojan-29', no: 29, year: 2026, month: 'OCTOBER', type: 'TOJAN', interest: 618702, principal: 2579334, totalPayment: 3198036, remainingDebt: 77684737, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-30', no: 30, year: 2026, month: 'NOVEMBER', type: 'TOJAN', interest: 598820, principal: 2599216, totalPayment: 3198036, remainingDebt: 75085521, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-31', no: 31, year: 2026, month: 'DECEMBER', type: 'TOJAN', interest: 578784, principal: 2619252, totalPayment: 3198036, remainingDebt: 72466269, isPaid: false, note: 'Payment Plan' },

  // 2027
  { id: 'tojan-32', no: 32, year: 2027, month: 'JANUARY', type: 'TOJAN', interest: 558594, principal: 2639442, totalPayment: 3198036, remainingDebt: 69826827, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-33', no: 33, year: 2027, month: 'FEBRUARY', type: 'TOJAN', interest: 538248, principal: 2659788, totalPayment: 3198036, remainingDebt: 67167040, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-34', no: 34, year: 2027, month: 'MARCH', type: 'TOJAN', interest: 517746, principal: 2680290, totalPayment: 3198036, remainingDebt: 64486750, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-35', no: 35, year: 2027, month: 'APRIL', type: 'TOJAN', interest: 497085, principal: 2700951, totalPayment: 3198036, remainingDebt: 61785799, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-36', no: 36, year: 2027, month: 'MAY', type: 'TOJAN', interest: 476266, principal: 2721771, totalPayment: 3198036, remainingDebt: 59064029, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-37', no: 37, year: 2027, month: 'JUNE', type: 'TOJAN', interest: 455285, principal: 2742751, totalPayment: 3198036, remainingDebt: 56321278, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-38', no: 38, year: 2027, month: 'JULY', type: 'TOJAN', interest: 434143, principal: 2763893, totalPayment: 3198036, remainingDebt: 53557385, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-39', no: 39, year: 2027, month: 'AUGUST', type: 'TOJAN', interest: 412838, principal: 2785198, totalPayment: 3198036, remainingDebt: 50772187, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-40', no: 40, year: 2027, month: 'SEPTEMBER', type: 'TOJAN', interest: 391369, principal: 2806667, totalPayment: 3198036, remainingDebt: 47965520, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-41', no: 41, year: 2027, month: 'OCTOBER', type: 'TOJAN', interest: 369734, principal: 2828302, totalPayment: 3198036, remainingDebt: 45137218, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-42', no: 42, year: 2027, month: 'NOVEMBER', type: 'TOJAN', interest: 347935, principal: 2850101, totalPayment: 3198036, remainingDebt: 42287117, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-43', no: 43, year: 2027, month: 'DECEMBER', type: 'TOJAN', interest: 325969, principal: 2872067, totalPayment: 3198036, remainingDebt: 39415050, isPaid: false, note: 'Payment Plan' },

  // 2028 - 2029
  { id: 'tojan-44', no: 44, year: 2028, month: 'JANUARY', type: 'TOJAN', interest: 303834, principal: 2894202, totalPayment: 3198036, remainingDebt: 36520848, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-45', no: 45, year: 2028, month: 'FEBRUARY', type: 'TOJAN', interest: 281527, principal: 2916509, totalPayment: 3198036, remainingDebt: 33604339, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-46', no: 46, year: 2028, month: 'MARCH', type: 'TOJAN', interest: 259048, principal: 2938988, totalPayment: 3198036, remainingDebt: 30665351, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-47', no: 47, year: 2028, month: 'APRIL', type: 'TOJAN', interest: 236393, principal: 2961643, totalPayment: 3198036, remainingDebt: 27703708, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-48', no: 48, year: 2028, month: 'MAY', type: 'TOJAN', interest: 213560, principal: 2984476, totalPayment: 3198036, remainingDebt: 24719232, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-49', no: 49, year: 2028, month: 'JUNE', type: 'TOJAN', interest: 190548, principal: 3007488, totalPayment: 3198036, remainingDebt: 21711744, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-50', no: 50, year: 2028, month: 'JULY', type: 'TOJAN', interest: 167357, principal: 3030679, totalPayment: 3198036, remainingDebt: 18681065, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-51', no: 51, year: 2028, month: 'AUGUST', type: 'TOJAN', interest: 143987, principal: 3054049, totalPayment: 3198036, remainingDebt: 15627016, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-52', no: 52, year: 2028, month: 'SEPTEMBER', type: 'TOJAN', interest: 120437, principal: 3077599, totalPayment: 3198036, remainingDebt: 12549417, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-53', no: 53, year: 2028, month: 'OCTOBER', type: 'TOJAN', interest: 96702, principal: 3101334, totalPayment: 3198036, remainingDebt: 9448083, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-54', no: 54, year: 2028, month: 'NOVEMBER', type: 'TOJAN', interest: 72783, principal: 3125253, totalPayment: 3198036, remainingDebt: 6322830, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-55', no: 55, year: 2028, month: 'DECEMBER', type: 'TOJAN', interest: 48675, principal: 3149361, totalPayment: 3198036, remainingDebt: 3173469, isPaid: false, note: 'Payment Plan' },
  { id: 'tojan-56', no: 56, year: 2029, month: 'JANUARY', type: 'TOJAN', interest: 24462, principal: 3173574, totalPayment: 3198036, remainingDebt: 0, isPaid: false, note: 'Final Installment' },
];

export function getDebtScheduleItems(): DebtScheduleItem[] {
  try {
    const raw = localStorage.getItem('materialism_debt_items_tojan_v4');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure that at least items 1-28 are marked as paid
        const paidCount = parsed.filter(i => i.isPaid).length;
        if (paidCount >= 28) return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading debt items:', e);
  }
  // Initialize with the 28 paid items
  saveDebtScheduleItems(INITIAL_DEBT_SCHEDULE);
  return INITIAL_DEBT_SCHEDULE;
}

export function saveDebtScheduleItems(items: DebtScheduleItem[]): void {
  try {
    localStorage.setItem('materialism_debt_items_tojan_v4', JSON.stringify(items));
  } catch (e) {
    console.error('Error saving debt items:', e);
  }
}

export function getDebtArchives(): DebtArchiveRecord[] {
  try {
    const raw = localStorage.getItem('materialism_debt_archives_tojan_v4');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading debt archives:', e);
  }
  return [
    {
      id: 'arc-tojan-28',
      debtId: 'tojan-28',
      no: 28,
      year: 2026,
      month: 'SEPTEMBER',
      type: 'TOJAN',
      amount: 3198036,
      interest: 638432,
      principal: 2559604,
      paidDate: '2026-09-25',
      notes: 'Transfer Installment #28 Tojan Land Credit (Remaining Debt: Rp 80.264.071)',
      createdAt: '2026-09-25T10:00:00Z',
    },
    {
      id: 'arc-tojan-27',
      debtId: 'tojan-27',
      no: 27,
      year: 2026,
      month: 'AUGUST',
      type: 'TOJAN',
      amount: 3198036,
      interest: 658012,
      principal: 2540024,
      paidDate: '2026-08-25',
      notes: 'Transfer Installment #27 Tojan Land Credit (Remaining Debt: Rp 82.823.675)',
      createdAt: '2026-08-25T10:00:00Z',
    },
  ];
}

export function saveDebtArchives(archives: DebtArchiveRecord[]): void {
  try {
    localStorage.setItem('materialism_debt_archives_tojan_v4', JSON.stringify(archives));
  } catch (e) {
    console.error('Error saving debt archives:', e);
  }
}

export const DEFAULT_EXPENSE_CATEGORIES: CustomCategoryItem[] = [
  { id: 'cat-food', name: 'Food', type: 'expense', icon: 'Utensils' },
  { id: 'cat-transport', name: 'Transport', type: 'expense', icon: 'Car' },
  { id: 'cat-shopping', name: 'Shopping', type: 'expense', icon: 'ShoppingBag' },
  { id: 'cat-bills', name: 'Bills', type: 'expense', icon: 'Receipt' },
  { id: 'cat-health', name: 'Health', type: 'expense', icon: 'HeartPulse' },
  { id: 'cat-entertainment', name: 'Entertainment', type: 'expense', icon: 'Gamepad2' },
  { id: 'cat-education', name: 'Education', type: 'expense', icon: 'GraduationCap' },
  { id: 'cat-other-exp', name: 'Other', type: 'expense', icon: 'Tag' },
];

export const DEFAULT_INCOME_CATEGORIES: CustomCategoryItem[] = [
  { id: 'cat-salary', name: 'Salary', type: 'income', icon: 'Briefcase' },
  { id: 'cat-bonus', name: 'Bonus', type: 'income', icon: 'Gift' },
  { id: 'cat-investment', name: 'Investment', type: 'income', icon: 'TrendingUp' },
  { id: 'cat-gift', name: 'Gift', type: 'income', icon: 'Heart' },
  { id: 'cat-other-inc', name: 'Other', type: 'income', icon: 'Tag' },
];

export const DEFAULT_ALL_CATEGORIES: CustomCategoryItem[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

export function getCustomCategories(): CustomCategoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading custom categories:', e);
  }
  return [...DEFAULT_ALL_CATEGORIES];
}

export function saveCustomCategories(categories: CustomCategoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving custom categories:', e);
  }
}

export const DEFAULT_CUSTOM_WALLETS: CustomWalletItem[] = [
  { id: 'w-bca', name: 'BCA', type: 'bank', initialBalance: 0 },
  { id: 'w-bni', name: 'BNI', type: 'bank', initialBalance: 0 },
  { id: 'w-jago', name: 'JAGO', type: 'bank', initialBalance: 0 },
  { id: 'w-mandiri', name: 'Mandiri', type: 'bank', initialBalance: 0 },
  { id: 'w-gopay', name: 'GO Pay', type: 'ewallet', initialBalance: 0 },
  { id: 'w-ovo', name: 'OVO', type: 'ewallet', initialBalance: 0 },
  { id: 'w-dana', name: 'DANA', type: 'ewallet', initialBalance: 0 },
  { id: 'w-cash', name: 'Cash', type: 'cash', initialBalance: 0 },
];

export function getCustomWallets(): CustomWalletItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_WALLETS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading custom wallets:', e);
  }
  // Initialize with initial balances if available
  const existingBalances = getWalletInitialBalances();
  return DEFAULT_CUSTOM_WALLETS.map(w => ({
    ...w,
    initialBalance: existingBalances[w.name] ?? 0,
  }));
}

export function saveCustomWallets(wallets: CustomWalletItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_WALLETS, JSON.stringify(wallets));
    // Also synchronize with wallet initial balances map
    const map: WalletInitialBalances = {};
    wallets.forEach(w => {
      map[w.name] = w.initialBalance || 0;
    });
    saveWalletInitialBalances(map);
  } catch (e) {
    console.error('Error saving custom wallets:', e);
  }
}

export const DEFAULT_INITIAL_BALANCES: WalletInitialBalances = {
  'BCA': 0,
  'BNI': 0,
  'JAGO': 0,
  'Mandiri': 0,
  'GO Pay': 0,
  'OVO': 0,
  'DANA': 0,
  'Cash': 0,
};

export function getWalletInitialBalances(): WalletInitialBalances {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WALLET_BALANCES);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_INITIAL_BALANCES, ...parsed };
    }
  } catch (e) {
    console.error('Error loading initial balances:', e);
  }
  return { ...DEFAULT_INITIAL_BALANCES };
}

export function saveWalletInitialBalances(balances: WalletInitialBalances): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WALLET_BALANCES, JSON.stringify(balances));
  } catch (e) {
    console.error('Error saving initial balances:', e);
  }
}

export function getLocalTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading local transactions:', e);
    return [];
  }
}

export function saveLocalTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error('Error saving local transactions:', e);
  }
}

export function clearAllLocalTransactions(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  } catch (e) {
    console.error('Error clearing local transactions:', e);
  }
}

export function getGasConfig(): GasConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GAS_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        sheetName: parsed.sheetName || 'materialism',
      };
    }
  } catch (e) {
    console.error('Error reading GAS config:', e);
  }
  return {
    scriptUrl: DEFAULT_GAS_URL,
    sheetName: 'materialism',
    isAutoSync: true,
  };
}

export function saveGasConfig(config: GasConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GAS_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving GAS config:', e);
  }
}

export function getPrivacyMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.PRIVACY) === 'true';
  } catch {
    return false;
  }
}

export function savePrivacyMode(hidden: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRIVACY, String(hidden));
  } catch (e) {
    console.error('Error saving privacy mode:', e);
  }
}

// Fetch transactions from GAS via server proxy (with local fallback)
export async function fetchTransactionsFromGas(scriptUrl?: string): Promise<{ success: boolean; data: Transaction[]; message?: string }> {
  const url = scriptUrl || getGasConfig().scriptUrl || DEFAULT_GAS_URL;
  try {
    const response = await fetch(`/api/proxy-gas?scriptUrl=${encodeURIComponent(url)}`);
    const rawText = await response.text();
    let json: any;
    try {
      json = JSON.parse(rawText);
    } catch {
      return { success: false, data: getLocalTransactions(), message: 'Respons server tidak valid' };
    }

    if (json.status === 'success' && Array.isArray(json.data)) {
      const formatted: Transaction[] = json.data
        .filter((row: any) => {
          if (!row || typeof row !== 'object') return false;
          const firstVal = String(Object.values(row)[0] || '').trim();
          if (
            firstVal.startsWith('---') ||
            firstVal.startsWith('TOTAL') ||
            firstVal.startsWith('STATUS') ||
            firstVal.startsWith('RINGKASAN') ||
            firstVal.startsWith('Synced on')
          ) {
            return false;
          }
          return true;
        })
        .map((row: any, idx: number) => {
          const rawAmount = row['Nominal (Rp)'] ?? row.Nominal ?? row.amount ?? row['Nominal'] ?? 0;
          const nominal = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, '')) || 0;
          
          let tgl = String(row['Tanggal (YYYY-MM-DD)'] || row.Tanggal || row.date || new Date().toISOString().split('T')[0]);
          if (tgl.includes('T')) {
            tgl = tgl.split('T')[0];
          }
          const tipeStr = String(row['Tipe'] || row.Tipe || row.type || 'expense').toLowerCase();
          const tipe = tipeStr.includes('masuk') || tipeStr.includes('income') ? 'income' : 'expense';

          const idVal = row['ID Transaksi'] || row.ID || row.id || `gas_${Date.now()}_${idx}`;
          const catVal = row['Kategori'] || row.Kategori || row.category || 'Other';
          const walletVal = row['Akun / Dompet'] || row.Dompet || row.wallet || 'Cash';
          const noteVal = row['Keterangan / Catatan'] || row.Keterangan || row.note || '';

          return {
            id: String(idVal),
            date: tgl,
            amount: nominal,
            category: String(catVal),
            type: tipe as 'expense' | 'income',
            wallet: String(walletVal),
            note: String(noteVal),
            media: row.Media || row.media || '',
          };
        })
        .filter((t) => t.amount > 0 || t.note !== '');

      if (formatted.length > 0) {
        saveLocalTransactions(formatted);
      }
      return { success: true, data: formatted };
    } else {
      return { success: false, data: getLocalTransactions(), message: json.message || 'No data from Sheet' };
    }
  } catch (error: any) {
    console.warn('Failed to fetch from GAS, using local data:', error);
    return { success: false, data: getLocalTransactions(), message: error.message };
  }
}

// Sync single action to GAS
export async function syncTransactionToGas(
  action: 'insert' | 'edit' | 'delete',
  transaction: Partial<Transaction> & { id: string | number },
  scriptUrl?: string
): Promise<{ success: boolean; message?: string }> {
  const gasConfig = getGasConfig();
  const url = scriptUrl || gasConfig.scriptUrl || DEFAULT_GAS_URL;
  try {
    const payload = {
      action: action === 'insert' ? undefined : action,
      sheetName: gasConfig.sheetName || 'materialism',
      ...transaction,
    };

    const response = await fetch('/api/proxy-gas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: url,
        payload,
      }),
    });

    const rawText = await response.text();
    let result: any;
    try {
      result = JSON.parse(rawText);
    } catch {
      result = { status: 'success', message: 'Tersinkronisasi' };
    }

    return {
      success: result.status === 'success',
      message: result.message || 'Synced successfully',
    };
  } catch (error: any) {
    console.error('GAS sync failed:', error);
    return { success: false, message: error.message };
  }
}

// Full batch sync to GAS proxy
export async function syncAllTransactionsToGas(
  transactions: Transaction[],
  scriptUrl?: string
): Promise<{ success: boolean; message?: string }> {
  const gasConfig = getGasConfig();
  const url = scriptUrl || gasConfig.scriptUrl || DEFAULT_GAS_URL;
  try {
    const response = await fetch('/api/proxy-gas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl: url,
        payload: {
          action: 'syncAll',
          sheetName: gasConfig.sheetName || 'materialism',
          transactions: transactions.map((t) => ({
            id: t.id,
            date: t.date,
            type: t.type,
            category: t.category,
            amount: t.amount,
            wallet: t.wallet,
            note: t.note || '',
          })),
        },
      }),
    });

    return { success: response.ok, message: 'Batch synced to GAS' };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}
