import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Edit3, 
  Trash2,
  Calendar as CalendarIcon,
  CreditCard,
  Tag,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Utensils,
  Car,
  ShoppingBag,
  FileText,
  HeartPulse,
  Film,
  GraduationCap,
  Briefcase,
  Gift,
  HelpCircle,
  X
} from 'lucide-react';
import { Transaction, Category, Wallet, TransactionType } from '../types';
import { CustomSelect } from './CustomSelect';

interface CalendarViewProps {
  transactions: Transaction[];
  onSelectDateToCreate: (dateStr: string) => void;
  onSaveTransaction?: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string | number) => void;
  privacyMode: boolean;
}

const CATEGORY_OPTIONS: Array<{ value: Category; label: string }> = [
  { value: 'Food', label: 'Food & Dining' },
  { value: 'Transport', label: 'Transport & Fuel' },
  { value: 'Shopping', label: 'Shopping & Groceries' },
  { value: 'Bills', label: 'Bills & Utilities' },
  { value: 'Health', label: 'Health & Medical' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Education', label: 'Education' },
  { value: 'Salary', label: 'Salary' },
  { value: 'Bonus', label: 'Bonus' },
  { value: 'Investment', label: 'Investment' },
  { value: 'Gift', label: 'Gift' },
  { value: 'Other', label: 'Other' },
];

const WALLET_OPTIONS: Array<{ value: Wallet; label: string }> = [
  { value: 'BCA', label: 'Bank BCA' },
  { value: 'BNI', label: 'Bank BNI' },
  { value: 'BRI', label: 'Bank BRI' },
  { value: 'Mandiri', label: 'Bank Mandiri' },
  { value: 'JAGO', label: 'Bank JAGO' },
  { value: 'Krom', label: 'Bank Krom' },
  { value: 'SeaBank', label: 'SeaBank' },
  { value: 'GO Pay', label: 'GoPay' },
  { value: 'OVO', label: 'OVO' },
  { value: 'DANA', label: 'DANA' },
  { value: 'ShopeePay', label: 'ShopeePay' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Other', label: 'Other Account' },
];

export const CalendarView: React.FC<CalendarViewProps> = ({
  transactions,
  onSelectDateToCreate,
  onSaveTransaction,
  onEdit,
  onDelete,
  privacyMode,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Sidebar Inline Quick Add Form State
  const [sidebarFormOpen, setSidebarFormOpen] = useState<boolean>(true);
  const [inlineType, setInlineType] = useState<TransactionType>('expense');
  const [inlineAmount, setInlineAmount] = useState<string>('');
  const [inlineCategory, setInlineCategory] = useState<Category>('Food');
  const [inlineWallet, setInlineWallet] = useState<Wallet>('BCA');
  const [inlineNote, setInlineNote] = useState<string>('');
  const [inlineSuccessMessage, setInlineSuccessMessage] = useState<string>('');
  const [isMobileDateModalOpen, setIsMobileDateModalOpen] = useState<boolean>(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDayStr(today.toISOString().split('T')[0]);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = totalDaysInPrevMonth - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month filler days to complete grid (42 cells)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining && days.length < 42; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [year, month]);

  // Aggregate daily totals map
  const dailySummary = useMemo(() => {
    const map: Record<string, { income: number; expense: number; count: number }> = {};
    transactions.forEach((tx) => {
      if (!map[tx.date]) {
        map[tx.date] = { income: 0, expense: 0, count: 0 };
      }
      if (tx.type === 'income') {
        map[tx.date].income += tx.amount;
      } else {
        map[tx.date].expense += tx.amount;
      }
      map[tx.date].count += 1;
    });
    return map;
  }, [transactions]);

  // Transactions for selected day
  const selectedDayTransactions = useMemo(() => {
    return transactions.filter((t) => t.date === selectedDayStr);
  }, [transactions, selectedDayStr]);

  const selectedDayIncome = useMemo(() => {
    return selectedDayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  }, [selectedDayTransactions]);

  const selectedDayExpense = useMemo(() => {
    return selectedDayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }, [selectedDayTransactions]);

  const formatShortRupiah = (val: number) => {
    if (privacyMode) return '••••';
    if (val >= 1000000) return `${(val / 1000000).toFixed(1).replace('.0', '')}jt`;
    if (val >= 1000) return `${Math.round(val / 1000)}k`;
    return val.toString();
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(inlineAmount.replace(/[^0-9]/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) return;

    const newTx: Transaction = {
      id: `tx-cal-${Date.now()}`,
      date: selectedDayStr,
      amount: cleanAmount,
      type: inlineType,
      category: inlineCategory,
      wallet: inlineWallet,
      note: inlineNote.trim() || undefined,
    };

    if (onSaveTransaction) {
      onSaveTransaction(newTx);
    }

    // Reset Form
    setInlineAmount('');
    setInlineNote('');
    setInlineSuccessMessage('Transaction added successfully!');
    setTimeout(() => setInlineSuccessMessage(''), 2500);
  };

  const dayDetailsContent = (
    <>
      {/* Selected Date Header Banner */}
      <div className="pb-4 border-b border-neutral-800 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
            Date &bull; {selectedDayStr}
          </span>
          <h3 className="text-base md:text-lg font-black text-white font-heading">
            {new Date(selectedDayStr).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
        </div>
        <button
          onClick={() => setSidebarFormOpen(!sidebarFormOpen)}
          className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            sidebarFormOpen 
              ? 'bg-neutral-800 text-neutral-300' 
              : 'bg-red-600 hover:bg-red-500 text-white shadow-sm'
          }`}
        >
          <Plus size={15} />
          <span>{sidebarFormOpen ? 'Close Form' : '+ Add'}</span>
        </button>
      </div>

      {/* Day Income / Expense Summary Chips */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-300 uppercase font-bold tracking-wider">Total In</span>
            <ArrowDownLeft size={14} className="text-white" />
          </div>
          <p className="text-base font-black text-white font-heading mt-1">
            {privacyMode ? '••••' : `+Rp ${selectedDayIncome.toLocaleString('id-ID')}`}
          </p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-500 uppercase font-bold tracking-wider">Total Out</span>
            <ArrowUpRight size={14} className="text-red-500" />
          </div>
          <p className="text-base font-black text-red-500 font-heading mt-1">
            {privacyMode ? '••••' : `-Rp ${selectedDayExpense.toLocaleString('id-ID')}`}
          </p>
        </div>
      </div>

      {/* INLINE QUICK ADD TRANSACTION FORM (Direct in Sidebar) */}
      {sidebarFormOpen && (
        <form onSubmit={handleQuickAddSubmit} className="bg-neutral-950 border border-neutral-800 p-4.5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Plus size={15} className="text-red-500" />
              <span>Quick Add Transaction</span>
            </span>
            {inlineSuccessMessage && (
              <span className="text-xs font-bold text-white bg-red-600 px-2.5 py-1 rounded-xl shadow-sm">
                {inlineSuccessMessage}
              </span>
            )}
          </div>

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-900 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setInlineType('expense')}
              className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                inlineType === 'expense'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setInlineType('income')}
              className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                inlineType === 'income'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              Amount (IDR)
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder="0"
                value={inlineAmount}
                onChange={(e) => setInlineAmount(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-red-600 rounded-xl py-2.5 px-3.5 text-base font-black text-white focus:outline-none placeholder:text-neutral-600"
                required
              />
            </div>
            {/* Shortcut Quick Amount Chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {[25000, 50000, 100000, 500000, 1000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setInlineAmount(amt.toString())}
                  className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-bold text-neutral-300 hover:text-white border border-neutral-800 transition-colors"
                >
                  +{formatShortRupiah(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Category & Wallet Grid (CustomSelect - No Blue) */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <CustomSelect
                value={inlineCategory}
                onChange={(val) => setInlineCategory(val as Category)}
                options={CATEGORY_OPTIONS}
                placeholder="Category"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                Wallet / Account
              </label>
              <CustomSelect
                value={inlineWallet}
                onChange={(val) => setInlineWallet(val as Wallet)}
                options={WALLET_OPTIONS}
                placeholder="Account"
              />
            </div>
          </div>

          {/* Note / Description */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              Note / Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Lunch, Fuel, Salary"
              value={inlineNote}
              onChange={(e) => setInlineNote(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-red-600 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none placeholder:text-neutral-600"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <Plus size={15} />
            <span>Save Transaction to {selectedDayStr}</span>
          </button>
        </form>
      )}

      {/* List of Transactions on Selected Day */}
      <div className="space-y-2.5 flex-1 flex flex-col">
        <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
          Transactions ({selectedDayTransactions.length})
        </span>

        <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-1 custom-scrollbar">
          {selectedDayTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-neutral-400 text-xs text-center border border-dashed border-neutral-800 rounded-2xl">
              <span className="font-semibold text-neutral-300">No transactions on this date.</span>
              <span className="text-xs text-neutral-500 mt-1">Use the form above to add a transaction.</span>
            </div>
          ) : (
            selectedDayTransactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl flex items-center justify-between gap-2 group hover:border-neutral-700 transition-all"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div
                    className={`p-2 rounded-xl flex-shrink-0 ${
                      tx.type === 'income'
                        ? 'bg-neutral-900 text-white border border-neutral-700'
                        : 'bg-neutral-900 text-red-500 border border-neutral-800'
                    }`}
                  >
                    {tx.type === 'income' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-neutral-100 truncate">
                      {tx.note || tx.category}
                    </p>
                    <span className="text-xs text-neutral-400">
                      {tx.wallet} &bull; {tx.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <span
                    className={`text-sm font-black font-heading ${
                      tx.type === 'income' ? 'text-white' : 'text-red-500'
                    }`}
                  >
                    {privacyMode
                      ? '••••'
                      : `${tx.type === 'income' ? '+' : '-'}Rp ${tx.amount.toLocaleString('id-ID')}`}
                  </span>
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(tx)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(tx.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Calendar Header & Month Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-neutral-950 border border-neutral-800 text-red-500 flex-shrink-0">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-black text-white tracking-tight font-heading uppercase">
              {monthNames[month]} {year}
            </h2>
            <span className="text-[11px] sm:text-xs text-neutral-400">
              Select date to view or record transactions
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5">
          <button
            onClick={goToToday}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-xs font-bold text-neutral-200 hover:text-white transition-all active:scale-95"
          >
            Today
          </button>
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl sm:rounded-2xl border border-neutral-800">
            <button
              onClick={prevMonth}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Layout: Calendar Box (Left) + Right Sidebar for Direct Add & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Calendar Matrix (Left 7 Cols on lg) */}
        <div className="lg:col-span-7 backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 p-2.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl shadow-md flex flex-col justify-between">
          <div>
            {/* Day Names Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-3">
              {dayNames.map((name, i) => (
                <div
                  key={name}
                  className={`text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider py-1 ${
                    i === 0 ? 'text-red-500' : 'text-neutral-400'
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((d) => {
                const summary = dailySummary[d.dateStr];
                const isSelected = d.dateStr === selectedDayStr;

                return (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDayStr(d.dateStr);
                      setIsMobileDateModalOpen(true);
                    }}
                    className={`min-h-[58px] sm:min-h-[72px] md:min-h-[85px] p-1 sm:p-2 rounded-xl sm:rounded-2xl border flex flex-col justify-between text-left transition-all relative group backdrop-blur-md active:scale-95 ${
                      isSelected
                        ? 'border-red-600 bg-red-950/30'
                        : d.isCurrentMonth
                        ? 'bg-neutral-950/90 border-neutral-800 hover:bg-neutral-900 hover:border-neutral-700'
                        : 'bg-neutral-950/30 border-neutral-900/80 text-neutral-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-[11px] sm:text-xs md:text-sm font-bold w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full transition-colors ${
                          d.isToday
                            ? 'bg-red-600 text-white shadow-sm font-black'
                            : d.isCurrentMonth
                            ? 'text-neutral-200'
                            : 'text-neutral-600'
                        }`}
                      >
                        {d.dayNum}
                      </span>
                      {summary && summary.count > 0 && (
                        <span className="text-[10px] sm:text-xs text-neutral-300 font-semibold px-1 sm:px-1.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800">
                          {summary.count}
                        </span>
                      )}
                    </div>

                    {/* Badges for Income & Expense (Unified Red & White palette) */}
                    <div className="flex flex-col gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 w-full overflow-hidden">
                      {summary?.income ? (
                        <span className="text-[10px] sm:text-xs font-bold text-white bg-neutral-800 border border-neutral-700 rounded sm:rounded-lg px-1 sm:px-2 py-0.5 truncate text-center block">
                          +{formatShortRupiah(summary.income)}
                        </span>
                      ) : null}
                      {summary?.expense ? (
                        <span className="text-[10px] sm:text-xs font-bold text-white bg-red-600 border border-red-500 rounded sm:rounded-lg px-1 sm:px-2 py-0.5 truncate text-center block shadow-sm">
                          -{formatShortRupiah(summary.expense)}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Info Legend */}
          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span>Income</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                <span>Expense</span>
              </span>
            </div>
            <span className="text-[11px] text-neutral-500">Click date to manage</span>
          </div>
        </div>

        {/* Right Sidebar (5 Cols on lg) - Direct Add Transaction & Day Details */}
        <div className="hidden lg:flex lg:col-span-5 backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 p-5 md:p-6 rounded-3xl shadow-md flex-col gap-5">
          {dayDetailsContent}
        </div>
      </div>

      {/* Mobile Modal for Day Details */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isMobileDateModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileDateModalOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative w-full max-w-lg bg-neutral-900/95 border border-neutral-800 rounded-3xl p-5 shadow-2xl z-10 flex flex-col gap-5 backdrop-blur-xl my-auto max-h-[85vh] overflow-hidden"
              >
                {/* Close Button for Modal */}
                <button
                  onClick={() => setIsMobileDateModalOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors z-20"
                >
                  <X size={20} />
                </button>
                <div className="overflow-y-auto no-scrollbar flex flex-col gap-5 pr-1" style={{ maxHeight: '100%' }}>
                  {dayDetailsContent}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
