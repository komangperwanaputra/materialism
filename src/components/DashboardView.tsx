import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, 
  EyeOff, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Wallet as WalletIcon, 
  Sparkles, 
  Search, 
  Utensils, 
  ShoppingBag, 
  Car, 
  Zap, 
  Briefcase, 
  HeartPulse, 
  Film, 
  GraduationCap, 
  Gift, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Edit3, 
  Trash2, 
  Image as ImageIcon,
  Loader2,
  X,
  Database,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Transaction, WalletInitialBalances, AutoSyncState } from '../types';
import { AISummaryResult, getAIFinancialSummary } from '../services/geminiService';
import { CustomSelect } from './CustomSelect';

interface DashboardViewProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string | number) => void;
  privacyMode: boolean;
  onTogglePrivacy: () => void;
  onNewTransaction: () => void;
  initialBalances?: WalletInitialBalances;
  onOpenSheetsSync?: () => void;
  syncState?: AutoSyncState;
  selectedMonth?: number | null;
  onSelectMonth?: (m: number | null) => void;
  selectedYear?: number;
  onSelectYear?: (y: number) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const getCategoryIcon = (category: string, size = 18) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('food') || cat.includes('makan') || cat.includes('minum') || cat.includes('kopi')) {
    return <Utensils size={size} />;
  }
  if (cat.includes('shop') || cat.includes('belanja') || cat.includes('baju')) {
    return <ShoppingBag size={size} />;
  }
  if (cat.includes('transport') || cat.includes('bensin') || cat.includes('ojek') || cat.includes('mobil') || cat.includes('motor')) {
    return <Car size={size} />;
  }
  if (cat.includes('bill') || cat.includes('listrik') || cat.includes('air') || cat.includes('internet') || cat.includes('pulsa') || cat.includes('tagihan')) {
    return <Zap size={size} />;
  }
  if (cat.includes('salary') || cat.includes('gaji') || cat.includes('kantor')) {
    return <Briefcase size={size} />;
  }
  if (cat.includes('health') || cat.includes('kesehatan') || cat.includes('obat') || cat.includes('dokter')) {
    return <HeartPulse size={size} />;
  }
  if (cat.includes('entertain') || cat.includes('hiburan') || cat.includes('nonton') || cat.includes('game')) {
    return <Film size={size} />;
  }
  if (cat.includes('edu') || cat.includes('kuliah') || cat.includes('kursus') || cat.includes('buku')) {
    return <GraduationCap size={size} />;
  }
  if (cat.includes('bonus') || cat.includes('gift') || cat.includes('hadiah')) {
    return <Gift size={size} />;
  }
  if (cat.includes('invest')) {
    return <TrendingUp size={size} />;
  }
  return <FileText size={size} />;
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  onEdit,
  onDelete,
  privacyMode,
  onTogglePrivacy,
  onNewTransaction,
  initialBalances = {},
  onOpenSheetsSync,
  syncState,
  selectedMonth = null,
  onSelectMonth,
  selectedYear = new Date().getFullYear(),
  onSelectYear,
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const activeSearchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const handleSearchChange = externalOnSearchChange || setInternalSearchQuery;

  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterWallet, setFilterWallet] = useState<string>('all');
  const [isMobileWalletsOpen, setIsMobileWalletsOpen] = useState(false);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<AISummaryResult | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Receipt Modal
  const [previewMedia, setPreviewMedia] = useState<{ url: string; title: string } | null>(null);

  // Financial Calculations
  const totalIncome = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalInitialBalances = useMemo(() => {
    return (Object.values(initialBalances) as number[]).reduce((sum: number, val: number) => sum + (Number(val) || 0), 0);
  }, [initialBalances]);

  const netBalance = totalInitialBalances + totalIncome - totalExpense;

  // Wallet Balances Breakdown (Initial Balance + Income - Expense)
  const walletBalances = useMemo(() => {
    const balances: Record<string, number> = {};

    const initialKeys = Object.keys(initialBalances);
    if (initialKeys.length > 0) {
      initialKeys.forEach((key) => {
        balances[key] = initialBalances[key] || 0;
      });
    } else {
      ['BCA', 'BNI', 'JAGO', 'GO Pay', 'Cash'].forEach((key) => {
        balances[key] = 0;
      });
    }

    // Apply transactions mutations
    transactions.forEach((t) => {
      const walletName = t.wallet || 'Cash';
      if (balances[walletName] === undefined) {
        balances[walletName] = initialBalances[walletName] || 0;
      }
      if (t.type === 'income') {
        balances[walletName] += t.amount;
      } else {
        balances[walletName] -= t.amount;
      }
    });
    return balances;
  }, [transactions, initialBalances]);

  const totalWalletBalance = useMemo(() => {
    return (Object.values(walletBalances) as number[]).reduce((sum: number, b: number) => sum + (Number(b) || 0), 0);
  }, [walletBalances]);

  // Categories list for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [transactions]);

  // Wallets list for filter
  const wallets = useMemo(() => {
    const set = new Set<string>();
    Object.keys(walletBalances).forEach((w) => set.add(w));
    transactions.forEach((t) => {
      if (t.wallet) set.add(t.wallet);
    });
    return Array.from(set);
  }, [transactions, walletBalances]);

  // Filtered Transactions with Month & Year Filtering
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        // Month and Year filter if selectedMonth is set
        if (selectedMonth !== null) {
          const parts = (t.date || '').split('-');
          if (parts.length >= 2) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            if (y !== selectedYear || m !== selectedMonth) return false;
          }
        }
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterCategory !== 'all' && t.category !== filterCategory) return false;
        if (filterWallet !== 'all' && t.wallet !== filterWallet) return false;
        if (activeSearchQuery.trim()) {
          const q = activeSearchQuery.toLowerCase();
          const matchNote = (t.note || '').toLowerCase().includes(q);
          const matchCat = (t.category || '').toLowerCase().includes(q);
          const matchWallet = (t.wallet || '').toLowerCase().includes(q);
          const matchAmount = t.amount.toString().includes(q);
          return matchNote || matchCat || matchWallet || matchAmount;
        }
        return true;
      })
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Most recent first
  }, [transactions, selectedMonth, selectedYear, filterType, filterCategory, filterWallet, activeSearchQuery]);

  // Group transactions by date AND by category for Money Tracker mobile layout
  const groupedTransactionsByDate = useMemo(() => {
    const dateMap: Record<string, {
      date: string;
      displayDay: string;
      displayMonthDay: string;
      dayOfWeek: string;
      totalExpense: number;
      totalIncome: number;
      categoryMap: Record<string, {
        category: string;
        totalExpense: number;
        totalIncome: number;
        items: Transaction[];
      }>;
    }> = {};
    const dateOrder: string[] = [];

    filteredTransactions.forEach((tx) => {
      const dateKey = tx.date || 'Unknown';
      if (!dateMap[dateKey]) {
        const parts = (dateKey || '').split('-');
        let dayOfWeek = '';
        let displayMonthDay = dateKey;
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          if (!isNaN(d.getTime())) {
            dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
            displayMonthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }
        }

        dateMap[dateKey] = {
          date: dateKey,
          displayDay: parts[2] || '',
          displayMonthDay,
          dayOfWeek,
          totalExpense: 0,
          totalIncome: 0,
          categoryMap: {},
        };
        dateOrder.push(dateKey);
      }

      const dateEntry = dateMap[dateKey];
      if (tx.type === 'expense') {
        dateEntry.totalExpense += tx.amount;
      } else {
        dateEntry.totalIncome += tx.amount;
      }

      const catKey = tx.category || 'Other';
      if (!dateEntry.categoryMap[catKey]) {
        dateEntry.categoryMap[catKey] = {
          category: catKey,
          totalExpense: 0,
          totalIncome: 0,
          items: [],
        };
      }

      const catEntry = dateEntry.categoryMap[catKey];
      if (tx.type === 'expense') {
        catEntry.totalExpense += tx.amount;
      } else {
        catEntry.totalIncome += tx.amount;
      }
      catEntry.items.push(tx);
    });

    return dateOrder.map((dateKey) => {
      const d = dateMap[dateKey];
      return {
        date: d.date,
        displayDay: d.displayDay,
        displayMonthDay: d.displayMonthDay,
        dayOfWeek: d.dayOfWeek,
        totalExpense: d.totalExpense,
        totalIncome: d.totalIncome,
        categoryGroups: Object.values(d.categoryMap),
      };
    });
  }, [filteredTransactions]);

  // Request AI Summary
  const handleGenerateSummary = async () => {
    if (transactions.length === 0) {
      setSummaryError('No transaction data available to analyze.');
      return;
    }
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const result = await getAIFinancialSummary(transactions);
      setAiSummary(result);
    } catch (err: any) {
      setSummaryError(err.message || 'Failed to load AI analysis.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const formatRupiah = (num: number) => {
    if (privacyMode) return 'Rp ••••••••';
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Overview Cards (Desktop Only - Mobile displays in top sticky header) */}
      <div className="hidden md:grid md:grid-cols-3 gap-3.5 sm:gap-4 md:gap-5 lg:gap-6">
        {/* Net Balance */}
        <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl relative overflow-hidden group shadow-md md:order-1">
          <div className="flex items-center justify-between mb-2 sm:mb-3 relative z-10">
            <div className="flex items-center gap-2 sm:gap-2.5 text-neutral-300">
              <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-neutral-950 text-white border border-neutral-800">
                <WalletIcon size={18} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Net Balance
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full uppercase tracking-wider ${
              netBalance >= 0 ? 'bg-neutral-800 border border-neutral-700 text-white' : 'bg-red-950/40 border border-red-500/30 text-red-500'
            }`}>
              {netBalance >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
          <p className={`text-xl sm:text-2xl lg:text-3xl font-black relative z-10 tracking-tight font-heading mt-1 sm:mt-2 truncate ${
            netBalance >= 0 ? 'text-white' : 'text-red-500'
          }`}>
            {formatRupiah(netBalance)}
          </p>
          <div className="mt-2 sm:mt-3 flex items-center gap-1.5 text-[11px] sm:text-xs text-neutral-400">
            <span>Active liquid cash</span>
          </div>
        </div>

        {/* Total Income */}
        <div className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800 p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl relative overflow-hidden group shadow-md md:order-2">
          <div className="flex items-center justify-between mb-2 sm:mb-3 relative z-10">
            <div className="flex items-center gap-2 sm:gap-2.5 text-white">
              <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-neutral-950 text-white border border-neutral-800">
                <ArrowUpCircle size={18} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                Total Income
              </span>
            </div>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-white relative z-10 tracking-tight font-heading mt-1 sm:mt-2 truncate">
            {formatRupiah(totalIncome)}
          </p>
          <div className="mt-2 sm:mt-3 flex items-center gap-1.5 text-[11px] sm:text-xs text-neutral-400">
            <span>Total incoming cash this period</span>
          </div>
        </div>

        {/* Total Expense */}
        <div className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800 p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl relative overflow-hidden group shadow-md md:order-3">
          <div className="flex items-center justify-between mb-2 sm:mb-3 relative z-10">
            <div className="flex items-center gap-2 sm:gap-2.5 text-red-500">
              <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-neutral-950 text-red-500 border border-neutral-800">
                <ArrowDownCircle size={18} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                Total Expenses
              </span>
            </div>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-red-500 relative z-10 tracking-tight font-heading mt-1 sm:mt-2 truncate">
            {formatRupiah(totalExpense)}
          </p>
          <div className="mt-2 sm:mt-3 flex items-center gap-1.5 text-[11px] sm:text-xs text-neutral-400">
            <span>Spending, bills & living expenses</span>
          </div>
        </div>
      </div>

      {/* Mobile-Only Compact Account & Wallet Button */}
      <div className="block lg:hidden backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm transition-all">
        <button
          type="button"
          id="btn-mobile-wallets-toggle"
          onClick={() => setIsMobileWalletsOpen(true)}
          className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-neutral-950 text-white border border-neutral-800 flex-shrink-0">
              <WalletIcon size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Accounts &amp; Wallets
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-full">
                  {Object.keys(walletBalances).length}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate">
                Tap to view all account balances
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total</span>
              <span className={`text-xs sm:text-sm font-bold font-heading ${
                totalWalletBalance >= 0 ? 'text-white' : 'text-red-500'
              }`}>
                {formatRupiah(totalWalletBalance)}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Mobile Accounts & Wallets Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isMobileWalletsOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileWalletsOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative w-full max-w-sm bg-neutral-900/95 border border-neutral-800 rounded-3xl p-5 shadow-2xl z-10 space-y-4 backdrop-blur-xl my-auto"
              >
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
                      <WalletIcon size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading leading-tight">
                        Account Balances
                      </h3>
                      <p className="text-[11px] text-neutral-400">Your total funds across wallets</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileWalletsOpen(false)}
                    className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Total Net Worth</span>
                    <span className={`text-2xl font-black font-heading ${totalWalletBalance >= 0 ? 'text-white' : 'text-red-500'}`}>
                      {formatRupiah(totalWalletBalance)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto no-scrollbar pb-2">
                    {Object.keys(walletBalances).length === 0 ? (
                      <div className="col-span-full text-center py-4 text-xs text-neutral-500">
                        No accounts found. Add accounts in Settings.
                      </div>
                    ) : (
                      Object.entries(walletBalances).map(([walletName, balance]: [string, number]) => (
                        <div
                          key={walletName}
                          className="bg-neutral-950/80 border border-neutral-800/90 p-3 rounded-2xl flex flex-col justify-between min-w-0"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            <span className="text-[11px] font-bold text-neutral-300 truncate uppercase tracking-wider">
                              {walletName}
                            </span>
                          </div>
                          <span className={`text-sm font-bold font-mono truncate ${
                            balance >= 0 ? 'text-white' : 'text-red-500'
                          }`}>
                            {formatRupiah(balance)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Main Grid: Left (Wallets & AI on Desktop) - Right (Transactions Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column (Desktop Only): permanent accounts & AI insights */}
        <div className="hidden lg:grid grid-cols-1 gap-4 sm:gap-6 lg:col-span-1">
          {/* Wallet Balances Card */}
          <div className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-xs text-neutral-300 font-bold uppercase tracking-wider flex items-center gap-2">
                  <WalletIcon size={16} className="text-red-500" />
                  <span>Account &amp; Wallet Balances</span>
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {Object.keys(walletBalances).length === 0 ? (
                  <div className="text-center py-6 text-xs text-neutral-500">
                    No wallet balances available.
                  </div>
                ) : (
                  Object.entries(walletBalances).map(([walletName, balance]: [string, number]) => (
                    <div
                    key={walletName}
                    className="flex justify-between items-center bg-neutral-950/60 border border-neutral-800 p-3.5 rounded-2xl hover:border-neutral-700 transition-all backdrop-blur-md"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-red-600" />
                      <span className="text-sm text-neutral-200 font-semibold">{walletName}</span>
                    </div>
                    <span className={`font-bold text-sm font-heading ${
                      balance >= 0 ? 'text-white' : 'text-red-500'
                    }`}>
                      {formatRupiah(balance)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* AI Insight Box */}
          <div className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 relative overflow-hidden shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={16} className="text-red-500" />
                <span>Gemini AI Insights</span>
              </h2>
              <button
                id="btn-analyze-ai"
                onClick={handleGenerateSummary}
                disabled={isLoadingSummary}
                className="bg-red-600 hover:bg-red-500 text-white transition-all text-xs px-3.5 py-1.5 rounded-xl uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isLoadingSummary ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-white" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Analyze</span>
                )}
              </button>
            </div>

            {aiSummary ? (
              <div className="space-y-3">
                <div className="bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-800">
                  <p className="text-xs text-neutral-200 leading-relaxed">
                    {aiSummary.shortInsight}
                  </p>
                </div>
                {aiSummary.savingTip && (
                  <div className="bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-800 text-xs text-neutral-300 backdrop-blur-md">
                    <span className="font-bold text-red-500 block mb-1">Saving Tip:</span>
                    {aiSummary.savingTip}
                  </div>
                )}
                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                  <span>Financial Health Score:</span>
                  <span className="font-bold text-white bg-neutral-800 border border-neutral-700 px-2.5 py-0.5 rounded-full">
                    {aiSummary.healthScore}/100
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-400 leading-relaxed">
                {summaryError ? (
                  <p className="text-red-500">{summaryError}</p>
                ) : (
                  <p>
                    Get instant spending breakdown and recommendations powered by Gemini AI to manage your budget better.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Transactions Table */}
        <div className="lg:col-span-2 backdrop-blur-xl bg-neutral-900/80 border border-neutral-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 lg:p-8 flex flex-col h-full min-h-[500px] sm:min-h-[550px] shadow-md">
          {/* Table Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight font-heading">
                Transaction History
              </h2>
              <span className="text-[11px] sm:text-xs text-neutral-400">
                {filteredTransactions.length} of {transactions.length} transactions recorded
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Type Switch Filter */}
              <div className="flex w-full sm:w-auto bg-neutral-950/80 p-1 rounded-xl sm:rounded-2xl border border-neutral-800 text-xs backdrop-blur-md">
                {(['all', 'expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`flex-1 sm:flex-none px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl font-bold uppercase text-[10px] sm:text-xs tracking-wider transition-all ${
                      filterType === t
                        ? t === 'expense'
                          ? 'bg-red-600 text-white shadow-sm'
                          : t === 'income'
                          ? 'bg-white text-black font-extrabold shadow-sm'
                          : 'bg-neutral-800 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {t === 'all' ? 'All' : t === 'expense' ? 'Expenses' : 'Income'}
                  </button>
                ))}
              </div>


              {/* Add Button (Desktop / Tablet only - hidden on mobile as bottom nav center button is available) */}
              <button
                id="btn-add-transaction"
                onClick={onNewTransaction}
                className="hidden sm:flex bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl transition-all shadow-sm items-center gap-1.5 ml-auto sm:ml-0 active:scale-95"
              >
                <span>+ Transaction</span>
              </button>
            </div>
          </div>

          {/* Search & Select Filters (CustomSelect - No Blue) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3.5 sm:mb-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
              <input
                id="input-search-transactions"
                type="text"
                placeholder="Search note, category, amount..."
                value={activeSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl sm:rounded-2xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 focus:bg-neutral-950 backdrop-blur-md transition-all"
              />
            </div>

            {/* Category Filter */}
            <CustomSelect
              value={filterCategory}
              onChange={(val) => setFilterCategory(val)}
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.map((c) => ({ value: c, label: c }))
              ]}
              placeholder="All Categories"
            />

            {/* Wallet Filter */}
            <CustomSelect
              value={filterWallet}
              onChange={(val) => setFilterWallet(val)}
              options={[
                { value: 'all', label: 'All Accounts' },
                ...wallets.map((w) => ({ value: w, label: w }))
              ]}
              placeholder="All Accounts"
            />
          </div>

          {/* Table Container / Mobile View Container */}
          <div className="flex-1 rounded-xl sm:rounded-2xl border border-neutral-800 bg-neutral-950/40 backdrop-blur-md overflow-hidden flex flex-col">
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 sm:h-52 text-neutral-500 text-xs sm:text-sm gap-2 p-4 text-center">
                <FileText size={28} className="text-neutral-600" />
                <span>No matching transactions found.</span>
              </div>
            ) : (
              <>
                {/* 1. Mobile-Optimized Grouped Transaction List (md:hidden) - Grouped by Date & Category */}
                <div className="block md:hidden divide-y divide-neutral-800/80">
                  {groupedTransactionsByDate.map((group) => (
                    <div key={group.date} className="flex flex-col">
                      {/* Date & Daily Summary Header */}
                      <div className="bg-neutral-900/95 px-3.5 py-2 flex items-center justify-between border-y border-neutral-800/80 sticky top-0 z-10 backdrop-blur-md">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-black text-white font-mono flex-shrink-0">
                            {group.displayDay}
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            <span className="text-xs font-bold text-neutral-200">
                              {group.displayMonthDay}
                            </span>
                            {group.dayOfWeek && (
                              <span className="text-[10px] font-semibold text-neutral-400">
                                ({group.dayOfWeek})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Daily Total (Expenses and/or Income) */}
                        <div className="flex items-center gap-2 flex-shrink-0 text-right">
                          {group.totalIncome > 0 && (
                            <span className="text-xs font-bold text-white font-mono">
                              +{privacyMode ? '••••••' : group.totalIncome.toLocaleString('id-ID')}
                            </span>
                          )}
                          {group.totalExpense > 0 && (
                            <span className="text-xs font-bold text-red-500 font-mono">
                              -{privacyMode ? '••••••' : group.totalExpense.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Category Subgroups for this Date */}
                      <div className="divide-y divide-neutral-800/60">
                        {group.categoryGroups.map((catGroup) => (
                          <div key={catGroup.category} className="flex flex-col">
                            {/* Category Subheader */}
                            <div className="bg-neutral-950/80 px-3.5 py-1.5 flex items-center justify-between gap-2 border-b border-neutral-800/40">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="p-1 rounded-lg bg-neutral-900 text-neutral-300 border border-neutral-800 flex-shrink-0">
                                  {getCategoryIcon(catGroup.category, 12)}
                                </div>
                                <span className="text-[11px] font-bold text-neutral-200 uppercase tracking-wider truncate font-heading">
                                  {catGroup.category}
                                </span>
                                <span className="text-[9px] font-semibold text-neutral-400 bg-neutral-900 border border-neutral-800/80 px-1.5 py-0.2 rounded-full">
                                  {catGroup.items.length}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-right flex-shrink-0">
                                {catGroup.totalIncome > 0 && (
                                  <span className="text-[11px] font-mono font-bold text-white">
                                    +{privacyMode ? '••••' : catGroup.totalIncome.toLocaleString('id-ID')}
                                  </span>
                                )}
                                {catGroup.totalExpense > 0 && (
                                  <span className="text-[11px] font-mono font-bold text-red-400">
                                    -{privacyMode ? '••••' : catGroup.totalExpense.toLocaleString('id-ID')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Individual Transactions for this Category */}
                            <div className="divide-y divide-neutral-900/80">
                              {catGroup.items.map((tx) => (
                                <div
                                  key={tx.id}
                                  className="p-3 pl-4 hover:bg-white/5 active:bg-white/10 transition-colors flex items-center justify-between gap-3"
                                >
                                  {/* Left: Note & Wallet Badge */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-xs sm:text-sm text-neutral-100 truncate block">
                                        {tx.note || tx.category || 'Transaction'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                                      <span className="text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-300 px-2 py-0.5 rounded font-medium tracking-wide">
                                        {tx.wallet || 'Cash'}
                                      </span>
                                      {tx.media && (
                                        <button
                                          type="button"
                                          onClick={() => setPreviewMedia({ url: tx.media!, title: tx.note || tx.category })}
                                          className="text-red-400 hover:text-red-300 inline-flex items-center gap-1 text-[11px] underline"
                                          title="View Receipt"
                                        >
                                          <ImageIcon size={11} />
                                          <span>Receipt</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Amount & Actions */}
                                  <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
                                    <span className={`text-xs sm:text-sm font-black whitespace-nowrap font-mono ${
                                      tx.type === 'income' ? 'text-white' : 'text-red-500'
                                    }`}>
                                      {privacyMode
                                        ? '••••••••'
                                        : `${tx.type === 'income' ? '+ ' : '- '}${tx.amount.toLocaleString('id-ID')}`}
                                    </span>

                                    <div className="flex items-center gap-0.5">
                                      <button
                                        type="button"
                                        onClick={() => onEdit(tx)}
                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                                        title="Edit"
                                      >
                                        <Edit3 size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onDelete(tx.id)}
                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Desktop Full Table View (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse min-w-[540px] md:min-w-[580px] lg:min-w-[620px]">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-neutral-900/60 sticky top-0 backdrop-blur-md">
                        <th className="py-3 px-3 lg:px-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="py-3 px-3 lg:px-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="py-3 px-3 lg:px-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                          Description / Note
                        </th>
                        <th className="py-3 px-3 lg:px-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                          Account
                        </th>
                        <th className="py-3 px-3 lg:px-4 text-xs font-bold text-neutral-400 uppercase tracking-wider text-right">
                          Amount
                        </th>
                        <th className="py-3 px-2 lg:px-3 text-xs font-bold text-neutral-400 uppercase tracking-wider text-center w-16 lg:w-20">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/80">
                      {filteredTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-white/5 transition-colors group"
                        >
                          {/* Date */}
                          <td className="py-3.5 px-3 lg:px-4 text-xs text-neutral-400 whitespace-nowrap">
                            {tx.date}
                          </td>

                          {/* Category with Icon */}
                          <td className="py-3.5 px-3 lg:px-4">
                            <div className="flex items-center gap-2 lg:gap-2.5">
                              <div
                                className={`p-1.5 lg:p-2 rounded-xl ${
                                  tx.type === 'income'
                                    ? 'bg-neutral-900 text-white border border-neutral-700'
                                    : 'bg-neutral-900 text-red-500 border border-neutral-800'
                                }`}
                              >
                                {getCategoryIcon(tx.category, 15)}
                              </div>
                              <span className="font-semibold text-xs text-neutral-200">
                                {tx.category || 'Other'}
                              </span>
                            </div>
                          </td>

                          {/* Note & Media badge */}
                          <td className="py-3.5 px-3 lg:px-4 text-xs text-neutral-300 max-w-[130px] md:max-w-[170px] lg:max-w-[220px] truncate">
                            <div className="flex items-center gap-1.5 lg:gap-2">
                              <span className="truncate">{tx.note || '-'}</span>
                              {tx.media && (
                                <button
                                  onClick={() => setPreviewMedia({ url: tx.media!, title: tx.note || tx.category })}
                                  className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                                  title="View Attachment"
                                >
                                  <ImageIcon size={13} className="text-red-500" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Wallet Badge */}
                          <td className="py-3.5 px-3 lg:px-4">
                            <span className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-300 px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-lg uppercase font-semibold tracking-wider">
                              {tx.wallet || 'Cash'}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-3 lg:px-4 text-right font-bold text-xs whitespace-nowrap">
                            <span className={tx.type === 'income' ? 'text-white font-black' : 'text-red-500 font-bold'}>
                              {privacyMode
                                ? 'Rp ••••••••'
                                : `${tx.type === 'income' ? '+ ' : '- '}Rp ${tx.amount.toLocaleString('id-ID')}`}
                            </span>
                          </td>

                          {/* Action buttons */}
                          <td className="py-3.5 px-2 lg:px-3 text-center">
                            <div className="flex items-center justify-center gap-1 lg:gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onEdit(tx)}
                                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Edit"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => onDelete(tx.id)}
                                className="p-1.5 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="backdrop-blur-2xl bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Attachment: {previewMedia.title}
              </h3>
              <button
                onClick={() => setPreviewMedia(null)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/80 max-h-[75vh] overflow-auto">
              <img
                src={previewMedia.url.startsWith('data:') || previewMedia.url.startsWith('http') ? previewMedia.url : `data:image/jpeg;base64,${previewMedia.url}`}
                alt="Receipt Preview"
                className="max-h-[65vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
