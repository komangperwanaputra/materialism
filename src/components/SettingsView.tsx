import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet as WalletIcon, 
  Save, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Download, 
  Database,
  FileSpreadsheet,
  UploadCloud,
  ExternalLink,
  Link2,
  Info,
  Coins,
  ShieldCheck,
  Calendar,
  CreditCard,
  PieChart,
  Bot,
  User,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Tag,
  RotateCcw
} from 'lucide-react';
import { WalletInitialBalances, Transaction, AutoSyncState, CustomCategoryItem } from '../types';
import { 
  saveWalletInitialBalances, 
  clearAllLocalTransactions,
  getCustomCategories,
  saveCustomCategories,
  DEFAULT_ALL_CATEGORIES,
  DEFAULT_INITIAL_BALANCES
} from '../services/storage';
import { 
  getSavedSpreadsheetId, 
  TARGET_SHEET_NAME 
} from '../services/googleSheetsService';
import { getCategoryIcon } from './DashboardView';

interface SettingsViewProps {
  initialBalances: WalletInitialBalances;
  onSaveBalances: (balances: WalletInitialBalances) => void;
  transactions: Transaction[];
  onClearTransactions: () => void;
  privacyMode: boolean;
  syncState?: AutoSyncState;
  onExportCsv?: () => void;
  onOpenSheetsSync?: () => void;
  onTriggerSync?: () => void;
}

const DEFAULT_ACCOUNTS = [
  { key: 'BCA', name: 'Bank BCA' },
  { key: 'BNI', name: 'Bank BNI' },
  { key: 'JAGO', name: 'Bank JAGO' },
  { key: 'Mandiri', name: 'Bank Mandiri' },
  { key: 'GO Pay', name: 'GOPAY' },
  { key: 'OVO', name: 'OVO' },
  { key: 'DANA', name: 'DANA' },
  { key: 'Cash', name: 'Cash' },
];

type SettingsMenuId = 'categories' | 'balances' | 'sync' | 'backup' | 'about';

interface MenuItemConfig {
  id: SettingsMenuId;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const SETTINGS_MENU_ITEMS: MenuItemConfig[] = [
  {
    id: 'categories',
    title: 'Transaction Categories',
    subtitle: 'Add, edit, or remove expense & income categories',
    icon: Layers,
  },
  {
    id: 'balances',
    title: 'Accounts & Wallets',
    subtitle: 'Add/remove accounts (BCA, Mandiri, OVO, DANA, Cash), set balances',
    icon: WalletIcon,
  },
  {
    id: 'sync',
    title: 'Google Sheets Auto-Sync',
    subtitle: 'Real-time automatic cloud sync & sheet backup',
    icon: FileSpreadsheet,
  },
  {
    id: 'backup',
    title: 'Backup & Data Export',
    subtitle: 'Export transaction CSV archive & clear local data',
    icon: Database,
  },
  {
    id: 'about',
    title: 'About Materialism',
    subtitle: 'Financial system philosophy, features & author profile',
    icon: Info,
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  initialBalances,
  onSaveBalances,
  transactions,
  onClearTransactions,
  privacyMode,
  syncState,
  onOpenSheetsSync,
  onTriggerSync,
}) => {
  // Settings Menu Navigation State (List-based, not a slide bar)
  const [activeMenu, setActiveMenu] = useState<SettingsMenuId>('categories');
  // On mobile: null means showing the menu list; string means drilled into a section
  const [mobileActiveMenu, setMobileActiveMenu] = useState<SettingsMenuId | null>(null);

  // Categories State & Management
  const [categories, setCategories] = useState<CustomCategoryItem[]>(() => getCustomCategories());
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [categoryMsg, setCategoryMsg] = useState<string | null>(null);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase() && c.type === newCatType)) {
      setCategoryMsg(`Category "${trimmed}" already exists.`);
      setTimeout(() => setCategoryMsg(null), 3000);
      return;
    }
    const newCat: CustomCategoryItem = {
      id: `cat-${Date.now()}`,
      name: trimmed,
      type: newCatType,
      icon: 'Tag',
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveCustomCategories(updated);
    setNewCatName('');
    setCategoryMsg(`Category "${trimmed}" added.`);
    setTimeout(() => setCategoryMsg(null), 3000);
  };

  const handleDeleteCategory = (id: string, name: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    saveCustomCategories(updated);
    setCategoryMsg(`Category "${name}" removed.`);
    setTimeout(() => setCategoryMsg(null), 3000);
  };

  const handleResetCategories = () => {
    setCategories([...DEFAULT_ALL_CATEGORIES]);
    saveCustomCategories([...DEFAULT_ALL_CATEGORIES]);
    setCategoryMsg('Categories reset to defaults.');
    setTimeout(() => setCategoryMsg(null), 3000);
  };

  // Account Balances State
  const [balances, setBalances] = useState<WalletInitialBalances>({ ...initialBalances });
  const [balanceSavedMsg, setBalanceSavedMsg] = useState<string | null>(null);

  // New Custom Account State
  const [customAccountName, setCustomAccountName] = useState('');
  const [customAccountAmount, setCustomAccountAmount] = useState('');

  // Calculate Transaction Net for each wallet
  const calculateWalletNet = (walletKey: string) => {
    return transactions
      .filter((t) => (t.wallet || 'Cash').toLowerCase() === walletKey.toLowerCase())
      .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
  };

  const handleBalanceInputChange = (key: string, val: string) => {
    const rawDigits = val.replace(/[^0-9]/g, '');
    const num = rawDigits ? parseInt(rawDigits, 10) : 0;
    setBalances((prev) => ({
      ...prev,
      [key]: num,
    }));
  };

  const handleSaveAllBalances = () => {
    saveWalletInitialBalances(balances);
    onSaveBalances(balances);
    setBalanceSavedMsg('Account balances saved successfully.');
    setTimeout(() => setBalanceSavedMsg(null), 3000);
  };

  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customAccountName.trim();
    if (!name) return;
    const rawDigits = customAccountAmount.replace(/[^0-9]/g, '');
    const amount = rawDigits ? parseInt(rawDigits, 10) : 0;

    const updated = { ...balances, [name]: amount };
    setBalances(updated);
    saveWalletInitialBalances(updated);
    onSaveBalances(updated);
    setCustomAccountName('');
    setCustomAccountAmount('');
    setBalanceSavedMsg(`Account "${name}" added.`);
    setTimeout(() => setBalanceSavedMsg(null), 3000);
  };

  const handleDeleteAccount = (accountKey: string) => {
    if (Object.keys(balances).length <= 1) {
      setBalanceSavedMsg('Cannot delete the last remaining account.');
      setTimeout(() => setBalanceSavedMsg(null), 3000);
      return;
    }
    const updated = { ...balances };
    delete updated[accountKey];
    setBalances(updated);
    saveWalletInitialBalances(updated);
    onSaveBalances(updated);
    setBalanceSavedMsg(`Account "${accountKey}" removed.`);
    setTimeout(() => setBalanceSavedMsg(null), 3000);
  };

  const handleResetAccounts = () => {
    setBalances({ ...DEFAULT_INITIAL_BALANCES });
    saveWalletInitialBalances({ ...DEFAULT_INITIAL_BALANCES });
    onSaveBalances({ ...DEFAULT_INITIAL_BALANCES });
    setBalanceSavedMsg('Accounts reset to defaults.');
    setTimeout(() => setBalanceSavedMsg(null), 3000);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (transactions.length === 0) {
      alert('No transactions to export.');
      return;
    }
    const headers = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Wallet', 'Notes'];
    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.type,
      t.category,
      t.amount,
      t.wallet,
      `"${(t.note || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `materialism_finance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearAllData = () => {
    if (window.confirm('Clear all local transactions? This action cannot be undone.')) {
      clearAllLocalTransactions();
      onClearTransactions();
    }
  };

  const formatRupiah = (num: number) => {
    if (privacyMode) return 'Rp ••••••••';
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  // All accounts combining standard + custom ones
  const allAccountKeys = Array.from(
    new Set([...DEFAULT_ACCOUNTS.map((a) => a.key), ...Object.keys(balances)])
  );

  const totalAllInitial: number = (Object.values(balances) as number[]).reduce(
    (sum: number, v: number) => sum + (Number(v) || 0),
    0
  );

  const savedSheetId = getSavedSpreadsheetId();

  // Relocated Auto-Sync Pill Button (Exactly matching the requested design in Image 1)
  const renderAutoSyncPill = (size: 'sm' | 'md' = 'md') => {
    const isSyncing = syncState?.status === 'syncing';
    const isError = syncState?.status === 'error';

    return (
      <button
        id="settings-auto-sync-button"
        type="button"
        onClick={onOpenSheetsSync}
        className={`group bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white rounded-full inline-flex items-center gap-2 transition-all shadow-md active:scale-95 flex-shrink-0 ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
        }`}
        title={syncState?.message || 'Google Sheets Auto-Sync Active'}
      >
        <FileSpreadsheet 
          size={size === 'sm' ? 14 : 16} 
          className="text-emerald-400 group-hover:scale-110 transition-transform flex-shrink-0" 
        />
        <span className="font-heading tracking-wider uppercase font-black text-white text-[11px] sm:text-xs">
          AUTO-SYNC
        </span>
        {isSyncing ? (
          <Loader2 size={13} className="animate-spin text-amber-400 flex-shrink-0" />
        ) : isError ? (
          <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
        ) : (
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        )}
      </button>
    );
  };

  // Section 1: Google Sheets & Auto-Sync
  const renderSyncSection = () => (
    <div className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600/20 text-red-500 rounded-2xl border border-red-500/30 flex-shrink-0">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-heading">
                Google Sheets Auto-Sync
              </h2>
              <span className="text-[10px] bg-red-950/60 border border-red-500/40 text-red-400 font-mono px-2.5 py-0.5 rounded-full font-bold">
                Tab: {TARGET_SHEET_NAME}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Real-time automatic two-way synchronization between application and Google Sheets.
            </p>
          </div>
        </div>

        {/* Relocated Auto-Sync Pill from Header */}
        <div className="flex items-center gap-2">
          {renderAutoSyncPill('md')}
        </div>
      </div>

      {/* Live Status Overview Banner */}
      <div className="p-4 rounded-2xl bg-neutral-950/90 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
            syncState?.status === 'syncing' 
              ? 'bg-amber-400 animate-spin' 
              : syncState?.status === 'error'
              ? 'bg-red-500'
              : 'bg-emerald-400 animate-pulse'
          }`} />
          <div>
            <span className="text-xs font-bold text-white block uppercase font-heading tracking-wider">
              {syncState?.status === 'syncing'
                ? 'Syncing in Progress...'
                : syncState?.status === 'error'
                ? 'Sync Pending'
                : 'Auto-Sync Active & Ready'}
            </span>
            <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">
              {syncState?.message || 'Every transaction is automatically saved to your spreadsheet'}
              {syncState?.lastSynced && ` • Last: ${syncState.lastSynced}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onTriggerSync && (
            <button
              type="button"
              onClick={onTriggerSync}
              className="bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
            >
              <RefreshCw size={13} className={syncState?.status === 'syncing' ? 'animate-spin' : ''} />
              <span>Sync Now</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSheetsSync}
            className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <UploadCloud size={14} />
            <span>Configure Spreadsheet</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Target Details */}
      {savedSheetId ? (
        <div className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 overflow-hidden text-neutral-300">
            <Link2 size={15} className="text-neutral-500 flex-shrink-0" />
            <div className="truncate">
              <span className="text-neutral-400 block text-[10px] uppercase font-bold">Connected Spreadsheet ID:</span>
              <span className="font-mono text-xs text-neutral-200 truncate block">
                {savedSheetId}
              </span>
            </div>
          </div>
          <a
            href={`https://docs.google.com/spreadsheets/d/${savedSheetId}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 hover:text-red-300 flex items-center gap-1.5 font-bold flex-shrink-0 underline self-start sm:self-auto bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800"
          >
            <span>Open Google Spreadsheet</span>
            <ExternalLink size={13} />
          </a>
        </div>
      ) : (
        <div className="p-4 bg-neutral-950/60 border border-dashed border-neutral-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-white block">No Spreadsheet ID connected yet</span>
            <p className="text-neutral-400 text-[11px]">
              Connect a Google Sheets ID to save permanent records in your Google account.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSheetsSync}
            className="text-red-400 hover:text-red-300 font-bold underline flex items-center gap-1 text-xs self-start sm:self-auto"
          >
            <span>Connect Now &rarr;</span>
          </button>
        </div>
      )}
    </div>
  );

  // Section: Categories Management
  const renderCategoriesSection = () => {
    const filteredCats = categories.filter(c => {
      if (categoryFilter === 'all') return true;
      return c.type === categoryFilter;
    });

    const expenseCount = categories.filter(c => c.type === 'expense').length;
    const incomeCount = categories.filter(c => c.type === 'income').length;

    return (
      <div className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex-shrink-0">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-heading">
                Transaction Categories
              </h2>
              <p className="text-xs text-neutral-400">
                Add, customize, or remove expense and income categories.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetCategories}
            className="self-start sm:self-auto text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 bg-neutral-950 px-3 py-2 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-all"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
        </div>

        {categoryMsg && (
          <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-700 text-white text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{categoryMsg}</span>
          </div>
        )}

        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-3">
          <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block font-heading">
            Add New Category
          </span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Type Selector */}
            <div className="flex p-1 bg-neutral-900 border border-neutral-800 rounded-xl flex-shrink-0">
              <button
                type="button"
                onClick={() => setNewCatType('expense')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  newCatType === 'expense'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setNewCatType('income')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  newCatType === 'income'
                    ? 'bg-white text-black shadow-sm font-extrabold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Income
              </button>
            </div>

            {/* Name Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={`New ${newCatType === 'expense' ? 'expense' : 'income'} category (e.g. Makanan, Wifi, Gaji)...`}
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-red-500 transition-all font-medium"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <Plus size={15} />
              <span>Add Category</span>
            </button>
          </div>
        </form>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-1 border-t border-neutral-800/80">
          <span className="text-[11px] text-neutral-400 uppercase font-bold mr-1">Filter:</span>
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'all'
                ? 'bg-white text-black font-extrabold shadow-sm'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            All ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('expense')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'expense'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            Expenses ({expenseCount})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('income')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'income'
                ? 'bg-white text-black font-extrabold shadow-sm'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            Income ({incomeCount})
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {filteredCats.map((cat) => {
            const isExp = cat.type === 'expense';
            return (
              <div
                key={cat.id}
                className="bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${
                    isExp
                      ? 'bg-red-600/15 text-red-500 border border-red-500/30'
                      : 'bg-neutral-900 text-white border border-neutral-700'
                  }`}>
                    {getCategoryIcon(cat.name, 16)}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-white block truncate">
                      {cat.name}
                    </span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${
                      isExp ? 'text-red-400' : 'text-neutral-300'
                    }`}>
                      {isExp ? 'Expense' : 'Income'}
                    </span>
                  </div>
                </div>

                {categories.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="text-neutral-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-neutral-900 transition-colors flex-shrink-0"
                    title={`Delete category ${cat.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Section 2: Account Balances
  const renderBalancesSection = () => (
    <div className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30 flex-shrink-0">
            <Coins size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-heading">
              Accounts &amp; Wallets
            </h2>
            <p className="text-xs text-neutral-400">
              Add or remove bank accounts and e-wallets (BCA, Mandiri, OVO, DANA, Cash, etc.) and configure balances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleResetAccounts}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 bg-neutral-950 px-3 py-2 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-all"
            title="Reset to default accounts"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
          <button
            id="btn-save-all-balances"
            type="button"
            onClick={handleSaveAllBalances}
            className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl sm:rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
          >
            <Save size={15} />
            <span>Save Balances</span>
          </button>
        </div>
      </div>

      {balanceSavedMsg && (
        <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-700 text-white text-xs flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
          <span className="font-semibold">{balanceSavedMsg}</span>
        </div>
      )}

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {allAccountKeys.map((key) => {
          const initialVal = balances[key] || 0;
          const netTrx = calculateWalletNet(key);
          const currentTotal = initialVal + netTrx;
          const matchedDefault = DEFAULT_ACCOUNTS.find((a) => a.key.toLowerCase() === key.toLowerCase());

          return (
            <div
              key={key}
              className="bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 space-y-3 transition-all relative group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-bold text-xs text-white font-heading tracking-wide uppercase">
                    {matchedDefault ? matchedDefault.name : key}
                  </span>
                </div>
                {allAccountKeys.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(key)}
                    className="text-neutral-500 hover:text-red-400 p-1 rounded-lg transition-colors hover:bg-neutral-900"
                    title={`Delete Account ${key}`}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {/* Saldo Awal Input */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Initial Balance:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={initialVal ? initialVal.toLocaleString('id-ID') : ''}
                    placeholder="0"
                    onChange={(e) => handleBalanceInputChange(key, e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-red-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Real-time Calculation Breakdown */}
              <div className="pt-2 border-t border-neutral-900 flex flex-col gap-1 text-[11px]">
                <div className="flex justify-between text-neutral-400">
                  <span>Transaction Net:</span>
                  <span className={netTrx >= 0 ? 'text-white font-bold' : 'text-red-400 font-bold'}>
                    {netTrx >= 0 ? '+' : ''}{formatRupiah(netTrx)}
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-neutral-900/60">
                  <span className="text-neutral-400">Final Balance:</span>
                  <span className={`font-mono ${currentTotal >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {formatRupiah(currentTotal)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add Suggestions & Form */}
      <div className="pt-4 border-t border-neutral-800 space-y-3">
        {/* Preset suggestions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-neutral-500 uppercase font-bold mr-1">Quick Add:</span>
          {['OVO', 'DANA', 'GoPay', 'ShopeePay', 'BCA', 'Mandiri', 'BRI', 'Cash'].map((preset) => {
            const exists = allAccountKeys.some(k => k.toLowerCase() === preset.toLowerCase());
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setCustomAccountName(preset)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  exists
                    ? 'border-neutral-800/40 text-neutral-600 bg-neutral-950/40 cursor-default'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:text-white hover:border-red-500'
                }`}
                disabled={exists}
              >
                + {preset}
              </button>
            );
          })}
        </div>

        {/* Total Summary Footer & Add Bank Form */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-xs text-neutral-400">
            Total Initial Balances:{' '}
            <strong className="text-white text-sm font-mono">{formatRupiah(totalAllInitial)}</strong>
          </div>

          <form onSubmit={handleAddCustomAccount} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="e.g. OVO, DANA, Mandiri..."
              value={customAccountName}
              onChange={(e) => setCustomAccountName(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-red-500 transition-all flex-1 sm:w-44"
            />
            <input
              type="text"
              placeholder="Initial (Rp)"
              value={customAccountAmount ? parseInt(customAccountAmount.replace(/[^0-9]/g, '') || '0', 10).toLocaleString('id-ID') : ''}
              onChange={(e) => setCustomAccountAmount(e.target.value)}
              className="w-28 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 transition-all font-mono"
            />
            <button
              type="submit"
              disabled={!customAccountName.trim()}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white p-2 rounded-xl transition-all flex items-center justify-center flex-shrink-0"
              title="Add New Account"
            >
              <Plus size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // Section 3: Backup & Data Maintenance
  const renderBackupSection = () => (
    <div className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-600/20 text-red-400 rounded-2xl border border-red-500/30 flex-shrink-0">
          <Database size={22} />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider font-heading">
            Backup &amp; Data Maintenance
          </h2>
          <p className="text-xs text-neutral-400">
            Export transaction archive as CSV or clear local browser storage cache.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {/* Export CSV Card */}
        <div className="p-5 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-xs uppercase font-heading">
            <Download size={16} className="text-red-500" />
            <span>Export CSV Spreadsheet</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Download all transaction records ({transactions.length} data rows) in standard CSV format compatible with Excel and Sheets.
          </p>
          <button
            type="button"
            onClick={handleExportCsv}
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-neutral-700 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Download size={14} className="text-red-500" />
            <span>Download CSV Now</span>
          </button>
        </div>

        {/* Clear Data Card */}
        <div className="p-5 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase font-heading">
            <Trash2 size={16} />
            <span>Clear Local Data</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Erase all local transaction records from this browser. Ensure you have backed up or synced to Google Sheets first.
          </p>
          <button
            type="button"
            onClick={handleClearAllData}
            className="w-full bg-red-950/40 hover:bg-red-900/50 text-red-400 text-xs font-bold px-4 py-2.5 rounded-xl border border-red-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Trash2 size={14} />
            <span>Delete Local Transactions</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Section 4: About Materialism & Sinteka
  const renderAboutSection = () => (
    <div className="space-y-6">
      {/* Main Hero Card */}
      <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-neutral-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-neutral-950 rounded-2xl flex items-center justify-center border border-neutral-800 shadow-md flex-shrink-0">
              <svg 
                className="w-8 h-8 text-red-500" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                <line x1="12" y1="22" x2="12" y2="15.5" />
                <polyline points="22 8.5 12 15.5 2 8.5" />
                <polyline points="2 15.5 12 8.5 22 15.5" />
                <line x1="12" y1="2" x2="12" y2="8.5" />
              </svg>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider font-heading uppercase">
                  MATERIALISM
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 font-mono">
                  v1.2.0
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-xl">
                Executive Financial Vault &amp; Cash Flow Management Operating System.
              </p>
            </div>
          </div>

          {/* Created by Sinteka Signature Badge */}
          <div className="flex items-center gap-3 bg-neutral-950/90 border border-neutral-800 px-4 py-3 rounded-2xl shadow-sm self-stretch md:self-auto justify-between md:justify-start">
            <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0">
              <User size={18} />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                Created by
              </span>
              <span className="text-sm font-black text-white font-heading tracking-wide">
                Sinteka
              </span>
            </div>
          </div>
        </div>

        {/* Purpose & Philosophy */}
        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
            <Sparkles size={14} className="text-red-500" />
            <span>Purpose &amp; Philosophy</span>
          </h3>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-3xl">
            <strong className="text-white">Materialism</strong> is architected for individuals demanding absolute clarity, discipline, and sovereignty over their financial ecosystem. Unifying multi-wallet bookkeeping, amortized debt settlement schedules, instant Google Sheets integration, and complete client-side privacy.
          </p>
        </div>
      </div>

      {/* Detailed Features Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1 flex items-center gap-2">
          <Layers size={14} className="text-neutral-400" />
          <span>Core System Features &amp; Capabilities</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4.5 sm:p-5 space-y-2">
            <div className="flex items-center gap-2.5 text-white">
              <div className="p-2 rounded-xl bg-red-600/15 text-red-400 border border-red-500/20">
                <Coins size={16} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider font-heading">
                Multi-Account &amp; Wallet Tracking
              </h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Real-time balance tracking across BCA, BNI, JAGO, GoPay, Krom, Cash, and custom accounts with instantaneous ledger recalculations.
            </p>
          </div>

          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4.5 sm:p-5 space-y-2">
            <div className="flex items-center gap-2.5 text-white">
              <div className="p-2 rounded-xl bg-red-600/15 text-red-400 border border-red-500/20">
                <CreditCard size={16} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider font-heading">
                Debt Amortization Schedule
              </h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              56-month installment schedule with 9.25% flat interest calculation, transfer receipt archives, and payoff countdown.
            </p>
          </div>

          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4.5 sm:p-5 space-y-2">
            <div className="flex items-center gap-2.5 text-white">
              <div className="p-2 rounded-xl bg-red-600/15 text-red-400 border border-red-500/20">
                <PieChart size={16} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider font-heading">
                In-Depth Analytics &amp; Visualizations
              </h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Visualizations of expense distributions, monthly cash flow trends, savings ratios, and comprehensive PDF report exports.
            </p>
          </div>

          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4.5 sm:p-5 space-y-2">
            <div className="flex items-center gap-2.5 text-white">
              <div className="p-2 rounded-xl bg-red-600/15 text-red-400 border border-red-500/20">
                <Calendar size={16} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider font-heading">
                Interactive Financial Calendar
              </h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Daily, weekly, and monthly scheduling to track bill due dates, cash inflows, and daily liquidity.
            </p>
          </div>

          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4.5 sm:p-5 space-y-2">
            <div className="flex items-center gap-2.5 text-white">
              <div className="p-2 rounded-xl bg-red-600/15 text-red-400 border border-red-500/20">
                <FileSpreadsheet size={16} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider font-heading">
                Google Sheets Synchronization
              </h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Direct two-way cloud integration with Google Sheets on tab "{TARGET_SHEET_NAME}" for permanent record durability.
            </p>
          </div>

          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4.5 sm:p-5 space-y-2">
            <div className="flex items-center gap-2.5 text-white">
              <div className="p-2 rounded-xl bg-red-600/15 text-red-400 border border-red-500/20">
                <Bot size={16} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider font-heading">
                Smart OCR &amp; Intelligent Ingestion
              </h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Receipt extraction via camera, voice command input, and direct bank statement PDF/CSV parsing.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Architecture */}
      <div className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
          <ShieldCheck size={16} className="text-red-500" />
          <span>Security &amp; Privacy Architecture</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-neutral-950 border border-neutral-800/80 rounded-xl space-y-1">
            <span className="font-bold text-white block">Local-First Persistence</span>
            <p className="text-neutral-400 leading-normal">
              All transaction records are stored inside your browser local sandbox with zero intermediary third-party backend servers.
            </p>
          </div>

          <div className="p-3.5 bg-neutral-950 border border-neutral-800/80 rounded-xl space-y-1">
            <span className="font-bold text-white block">Privacy Camouflage</span>
            <p className="text-neutral-400 leading-normal">
              One-touch privacy camouflage mode to obscure balance figures and transaction amounts in public environments.
            </p>
          </div>

          <div className="p-3.5 bg-neutral-950 border border-neutral-800/80 rounded-xl space-y-1">
            <span className="font-bold text-white block">Direct Google OAuth</span>
            <p className="text-neutral-400 leading-normal">
              Cloud sync operates securely directly between browser and Google Sheets via Google's official protocol.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Helper to render active panel
  const renderActiveContent = (menuId: SettingsMenuId) => {
    switch (menuId) {
      case 'categories':
        return renderCategoriesSection();
      case 'balances':
        return renderBalancesSection();
      case 'sync':
        return renderSyncSection();
      case 'backup':
        return renderBackupSection();
      case 'about':
        return renderAboutSection();
      default:
        return renderCategoriesSection();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-heading uppercase">
            System Settings
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Manage Google Sheets synchronization, initial account balances, file backups, and system information.
          </p>
        </div>
      </div>

      {/* DESKTOP VIEW: Split Two-Column Layout with Pure Vertical List Menu */}
      <div className="hidden md:grid md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Vertical List Menu (Menu Berupa List, Bukan Slide Bar) */}
        <div className="md:col-span-4 lg:col-span-4 space-y-3">
          <div className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3.5 shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-2 block font-heading">
              Settings Menu
            </span>

            <nav className="flex flex-col gap-1.5" aria-label="Settings Menu">
              {SETTINGS_MENU_ITEMS.map((item) => {
                const isSelected = activeMenu === item.id;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.id}
                    id={`btn-menu-${item.id}`}
                    type="button"
                    onClick={() => setActiveMenu(item.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 border ${
                      isSelected
                        ? 'bg-neutral-950 border-red-600/70 text-white shadow-md'
                        : 'bg-transparent border-transparent text-neutral-300 hover:bg-neutral-800/50 hover:text-white hover:border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl border flex-shrink-0 ${
                        isSelected 
                          ? 'bg-red-600 text-white border-red-500' 
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                      }`}>
                        <IconComponent size={16} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold font-heading uppercase tracking-wide truncate ${
                            isSelected ? 'text-white' : 'text-neutral-200'
                          }`}>
                            {item.title}
                          </span>
                          {item.id === 'sync' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <ChevronRight 
                      size={16} 
                      className={`flex-shrink-0 transition-transform ${
                        isSelected ? 'text-red-500 translate-x-0.5' : 'text-neutral-600'
                      }`} 
                    />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Right Column: Selected Content Panel with Sliding Animation */}
        <div className="md:col-span-8 lg:col-span-8 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderActiveContent(activeMenu)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* MOBILE VIEW: List-First Navigation with Sliding Screen Transitions */}
      <div className="md:hidden overflow-hidden">
        <AnimatePresence mode="wait">
          {mobileActiveMenu === null ? (
            // Mobile: Full Vertical List of Settings Menus
            <motion.div
              key="mobile-menu-list"
              initial={{ opacity: 0, x: -32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3"
            >
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1 block font-heading">
                Select Settings Menu
              </span>

              <div className="flex flex-col gap-2.5">
                {SETTINGS_MENU_ITEMS.map((item) => {
                  const IconComponent = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveMenu(item.id);
                        setMobileActiveMenu(item.id);
                      }}
                      className="w-full text-left p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 active:scale-[0.99] transition-all flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2.5 rounded-xl bg-neutral-950 text-red-500 border border-neutral-800 flex-shrink-0">
                          <IconComponent size={20} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold font-heading uppercase text-white tracking-wide truncate">
                              {item.title}
                            </span>
                            {item.id === 'sync' && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <ChevronRight size={18} className="text-neutral-500 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            // Mobile: Drill-down into Selected Menu with prominent Back to List button
            <motion.div
              key={`mobile-panel-${mobileActiveMenu}`}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4"
            >
              <button
                type="button"
                onClick={() => setMobileActiveMenu(null)}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 px-3.5 py-2 rounded-xl transition-all active:scale-95 shadow-sm"
              >
                <ChevronLeft size={16} className="text-red-500" />
                <span>&larr; Back to Menu List</span>
              </button>

              {renderActiveContent(mobileActiveMenu)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
