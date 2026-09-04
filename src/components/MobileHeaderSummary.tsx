import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const FULL_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface MobileHeaderSummaryProps {
  selectedMonth: number | null; // 0-11, or null for all
  onSelectMonth: (month: number | null) => void;
  selectedYear: number;
  onSelectYear: (year: number) => void;
  expenses: number;
  income: number;
  balance: number;
  privacyMode: boolean;
  availableMonths?: { year: number; month: number }[];
}

export const MobileHeaderSummary: React.FC<MobileHeaderSummaryProps> = ({
  selectedMonth,
  onSelectMonth,
  selectedYear,
  onSelectYear,
  expenses,
  income,
  balance,
  privacyMode,
  availableMonths = [],
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedYear);

  const formatAmount = (num: number) => {
    if (privacyMode) return '••••••';
    return num.toLocaleString('en-US');
  };

  const handleOpenPicker = () => {
    setPickerYear(selectedYear);
    setIsPickerOpen(true);
  };

  const handleSelectMonth = (monthIndex: number | null) => {
    onSelectYear(pickerYear);
    onSelectMonth(monthIndex);
    setIsPickerOpen(false);
  };

  const hasTransactionsInMonth = (monthIdx: number) => {
    return availableMonths.some(
      (item) => item.year === pickerYear && item.month === monthIdx
    );
  };

  return (
    <>
      {/* Compact Mobile Summary Row */}
      <div 
        id="mobile-header-summary-bar"
        className="w-full flex items-center justify-between gap-2 pt-2 pb-1 text-left select-none border-t border-white/5"
      >
        {/* Left: Year & Month Selector - No text clipping, clear layout */}
        <button
          id="btn-mobile-month-picker"
          type="button"
          onClick={handleOpenPicker}
          className="flex-shrink-0 bg-neutral-900/90 hover:bg-neutral-800 active:scale-95 transition-all border border-neutral-700/80 rounded-xl px-2.5 sm:px-3 py-1.5 flex items-center gap-2 shadow-sm group"
          title="Pilih Bulan & Tahun"
        >
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-neutral-400 font-semibold tracking-wider leading-none">
              {selectedMonth === null ? 'Periode' : selectedYear}
            </span>
            <span className="text-xs sm:text-sm font-bold text-white leading-tight mt-0.5 whitespace-nowrap">
              {selectedMonth === null ? 'Semua' : MONTH_NAMES[selectedMonth]}
            </span>
          </div>
          <div className="p-1 rounded-md bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 group-hover:text-white flex-shrink-0">
            <ChevronDown size={12} />
          </div>
        </button>

        {/* Right: 3 Column Financial Statistics (Expenses, Income, Balance) */}
        <div className="flex-1 min-w-0 grid grid-cols-3 gap-1 sm:gap-2 items-center text-center pl-1">
          {/* 1. Expenses */}
          <div className="flex flex-col items-center justify-center min-w-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-neutral-400 leading-tight block truncate uppercase tracking-wider">
              Expenses
            </span>
            <span className="text-xs sm:text-sm font-bold text-white font-mono tracking-tight leading-tight mt-0.5 truncate block w-full">
              {formatAmount(expenses)}
            </span>
          </div>

          {/* 2. Income */}
          <div className="flex flex-col items-center justify-center min-w-0 border-x border-neutral-800/80 px-1">
            <span className="text-[10px] sm:text-[11px] font-medium text-neutral-400 leading-tight block truncate uppercase tracking-wider">
              Income
            </span>
            <span className="text-xs sm:text-sm font-bold text-white font-mono tracking-tight leading-tight mt-0.5 truncate block w-full">
              {formatAmount(income)}
            </span>
          </div>

          {/* 3. Balance */}
          <div className="flex flex-col items-center justify-center min-w-0">
            <span className="text-[10px] sm:text-[11px] font-medium text-neutral-400 leading-tight block truncate uppercase tracking-wider">
              Balance
            </span>
            <span className={`text-xs sm:text-sm font-bold font-mono tracking-tight leading-tight mt-0.5 truncate block w-full ${
              balance < 0 ? 'text-red-400' : 'text-white'
            }`}>
              {balance < 0 && !privacyMode ? `-${formatAmount(Math.abs(balance))}` : formatAmount(balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Month & Year Selection Modal - Mounted to document.body via Portal to escape header stacking context */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isPickerOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              {/* Blurred Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsPickerOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              {/* Modal Card Centered in Screen */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative w-full max-w-sm bg-neutral-900/95 border border-neutral-800 rounded-3xl p-5 shadow-2xl z-10 space-y-4 backdrop-blur-xl my-auto"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
                      <CalendarIcon size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading leading-tight">
                        Pilih Periode
                      </h3>
                      <p className="text-[11px] text-neutral-400">Pilih bulan &amp; tahun transaksi</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(false)}
                    className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    title="Tutup"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Year Navigation */}
                <div className="flex items-center justify-between bg-neutral-950 px-4 py-2.5 rounded-2xl border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setPickerYear((prev) => prev - 1)}
                    className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-all active:scale-95"
                    title="Tahun Sebelumnya"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Tahun</span>
                    <span className="text-base font-black font-mono text-white tracking-wider">
                      {pickerYear}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPickerYear((prev) => prev + 1)}
                    className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-all active:scale-95"
                    title="Tahun Berikutnya"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                {/* 12 Months Grid - Big Easy-to-Tap Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {MONTH_NAMES.map((mName, idx) => {
                    const isSelected = selectedYear === pickerYear && selectedMonth === idx;
                    const hasData = hasTransactionsInMonth(idx);

                    return (
                      <button
                        key={mName}
                        type="button"
                        onClick={() => handleSelectMonth(idx)}
                        className={`relative py-3 px-2 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 border ${
                          isSelected
                            ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-950/50 scale-[1.02]'
                            : hasData
                            ? 'bg-neutral-950 text-white border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 active:scale-95'
                            : 'bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200 active:scale-95'
                        }`}
                      >
                        <span className="text-sm font-bold font-mono">{mName}</span>
                        <span className="text-[10px] font-normal opacity-70">
                          {FULL_MONTH_NAMES[idx]}
                        </span>
                        {hasData && !isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* All Time & Current Month Quick Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => handleSelectMonth(null)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      selectedMonth === null
                        ? 'bg-white text-black border-white shadow'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    Semua Waktu (All)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setPickerYear(now.getFullYear());
                      onSelectYear(now.getFullYear());
                      onSelectMonth(now.getMonth());
                      setIsPickerOpen(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-neutral-950 text-neutral-300 border border-neutral-800 hover:bg-neutral-800 hover:text-white transition-all"
                  >
                    Bulan Ini
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
