import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Upload, 
  Eye, 
  Trash2, 
  Image as ImageIcon, 
  X, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  CreditCard,
  ShieldCheck,
  Check,
  Clock,
  Filter
} from 'lucide-react';
import { DebtScheduleItem, DebtArchiveRecord } from '../types';

interface DebtPlanViewProps {
  debtItems: DebtScheduleItem[];
  archives: DebtArchiveRecord[];
  onUpdateDebtItems: (items: DebtScheduleItem[]) => void;
  onUpdateArchives: (archives: DebtArchiveRecord[]) => void;
  privacyMode: boolean;
}

export const DebtPlanView: React.FC<DebtPlanViewProps> = ({
  debtItems,
  archives,
  onUpdateDebtItems,
  onUpdateArchives,
  privacyMode,
}) => {
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'ARCHIVE'>('SCHEDULE');
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | 'ALL'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('UNPAID');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedItemForProof, setSelectedItemForProof] = useState<DebtScheduleItem | null>(null);
  const [proofImage, setProofImage] = useState<string>('');
  const [proofDate, setProofDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [proofAmount, setProofAmount] = useState<number>(3198036);
  const [proofNotes, setProofNotes] = useState<string>('');
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null);

  const formatRupiah = (num: number) => {
    if (privacyMode) return 'Rp ••••••••';
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  // Calculations based on exact sheet
  const stats = useMemo(() => {
    const totalCredit = 145000000;
    const totalMonths = debtItems.length; // 56
    const monthlyInstallment = 3198036;

    const paidItems = debtItems.filter(d => d.isPaid);
    const paidCount = paidItems.length;
    const unpaidCount = totalMonths - paidCount;

    // Total already paid (Pokok + Bunga)
    const totalPaidAmount = paidItems.reduce((sum, d) => sum + d.totalPayment, 0);
    const totalPrincipalPaid = paidItems.reduce((sum, d) => sum + d.principal, 0);
    const totalInterestPaid = paidItems.reduce((sum, d) => sum + d.interest, 0);

    // Current remaining debt from the latest paid item or starting amount
    const sortedPaid = [...paidItems].sort((a, b) => b.no - a.no);
    const currentRemainingDebt = sortedPaid.length > 0 
      ? sortedPaid[0].remainingDebt 
      : totalCredit;

    const progressPercent = totalMonths > 0 ? Math.round((paidCount / totalMonths) * 100) : 0;

    return {
      totalCredit,
      totalMonths,
      monthlyInstallment,
      paidCount,
      unpaidCount,
      totalPaidAmount,
      totalPrincipalPaid,
      totalInterestPaid,
      currentRemainingDebt,
      progressPercent,
    };
  }, [debtItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    return debtItems.filter(item => {
      const matchYear = selectedYearFilter === 'ALL' || item.year === selectedYearFilter;
      const matchStatus = 
        selectedStatusFilter === 'ALL' ? true :
        selectedStatusFilter === 'PAID' ? item.isPaid :
        !item.isPaid;
      return matchYear && matchStatus;
    });
  }, [debtItems, selectedYearFilter, selectedStatusFilter]);

  // Toggle paid status
  const handleTogglePaid = (item: DebtScheduleItem) => {
    const nextStatus = !item.isPaid;
    if (nextStatus) {
      setSelectedItemForProof(item);
      setProofAmount(item.totalPayment);
      setProofDate(new Date().toISOString().split('T')[0]);
      setProofNotes(`Installment #${item.no} (${item.month} ${item.year}) - Tojan Land Credit`);
    } else {
      const updated = debtItems.map(d => d.id === item.id ? { ...d, isPaid: false, proofUrl: undefined, paidDate: undefined } : d);
      onUpdateDebtItems(updated);
    }
  };

  // Image Upload
  const handleProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save proof & mark paid
  const handleSaveProofAndMarkPaid = () => {
    if (!selectedItemForProof) return;

    const updatedDebtItems = debtItems.map(d => {
      if (d.id === selectedItemForProof.id) {
        return {
          ...d,
          isPaid: true,
          paidDate: proofDate,
          proofUrl: proofImage || d.proofUrl,
          note: proofNotes || d.note,
        };
      }
      return d;
    });
    onUpdateDebtItems(updatedDebtItems);

    const newArchive: DebtArchiveRecord = {
      id: `arc-tojan-${selectedItemForProof.no}-${Date.now()}`,
      debtId: selectedItemForProof.id,
      no: selectedItemForProof.no,
      year: selectedItemForProof.year,
      month: selectedItemForProof.month,
      type: 'TOJAN',
      amount: proofAmount || selectedItemForProof.totalPayment,
      interest: selectedItemForProof.interest,
      principal: selectedItemForProof.principal,
      paidDate: proofDate,
      proofUrl: proofImage,
      notes: proofNotes,
      createdAt: new Date().toISOString(),
    };
    onUpdateArchives([newArchive, ...archives]);

    setSelectedItemForProof(null);
    setProofImage('');
    setProofNotes('');
  };

  const handleDeleteArchive = (archiveId: string) => {
    const updated = archives.filter(a => a.id !== archiveId);
    onUpdateArchives(updated);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header Title & Subtitle */}
      <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-950/60 text-red-400 border border-red-500/40">
              Debt Plan: TOJAN CREDIT
            </span>
            <span className="text-xs text-neutral-400">
              &bull; 56 Payment Periods
            </span>
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight font-heading uppercase">
            TOJAN LAND
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Annuity installment schedule, 9.25% interest rate, remaining balance &amp; transfer receipts
          </p>
        </div>

        {/* Tab Toggle: Table Schedule vs Sheet ARCHIVE */}
        <div className="flex items-center gap-1.5 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800 self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab('SCHEDULE')}
            className={`flex-1 md:flex-none px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'SCHEDULE'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Credit Schedule (56 Mo)
          </button>
          <button
            onClick={() => setActiveTab('ARCHIVE')}
            className={`flex-1 md:flex-none px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ARCHIVE'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Archive Sheet ({archives.length})</span>
          </button>
        </div>
      </div>

      {/* MOBILE ONLY: Compact Financial Summary Bar (Matching Main Board Expenses/Income/Balance Layout) */}
      <div 
        id="debt-mobile-summary-bar"
        className="block sm:hidden backdrop-blur-xl bg-neutral-900/95 border border-neutral-800 rounded-2xl p-3 shadow-sm"
      >
        <div className="w-full flex items-center justify-between gap-2 text-left select-none">
          {/* Left Pill: Tenor & Count */}
          <div 
            className="flex-shrink-0 bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 flex flex-col justify-center min-w-[72px] shadow-sm"
          >
            <span className="text-[10px] text-neutral-400 font-semibold tracking-wider uppercase leading-none">
              Tenor
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs font-black text-red-500 font-mono leading-tight whitespace-nowrap">
                {stats.paidCount}/{stats.totalMonths}
              </span>
            </div>
          </div>

          {/* Right: 2 Column Financial Statistics (Terbayar, Sisa Hutang) */}
          <div className="flex-1 min-w-0 grid grid-cols-2 gap-2 items-center text-center pl-1">
            {/* 1. Terbayar */}
            <div className="flex flex-col items-center justify-center min-w-0">
              <span className="text-[10px] font-medium text-neutral-400 leading-tight block truncate uppercase tracking-wider">
                Terbayar
              </span>
              <span className="text-xs sm:text-sm font-bold text-white font-mono tracking-tight leading-tight mt-0.5 truncate block w-full">
                {formatRupiah(stats.totalPaidAmount)}
              </span>
            </div>

            {/* 2. Sisa Hutang */}
            <div className="flex flex-col items-center justify-center min-w-0 border-l border-neutral-800/80 pl-1.5">
              <span className="text-[10px] font-medium text-red-400 leading-tight block truncate uppercase tracking-wider">
                Sisa Hutang
              </span>
              <span className="text-xs sm:text-sm font-bold text-red-400 font-mono tracking-tight leading-tight mt-0.5 truncate block w-full">
                {formatRupiah(stats.currentRemainingDebt)}
              </span>
            </div>
          </div>
        </div>

        {/* Mini Linear Progress Bar */}
        <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center gap-2">
          <div className="flex-1 bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-800">
            <div 
              className="bg-red-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-neutral-300 font-mono whitespace-nowrap">
            {stats.progressPercent}% lunas ({stats.unpaidCount} bln sisa)
          </span>
        </div>
      </div>

      {/* DESKTOP / TABLET ONLY: 4 Spacious Cards */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Nominal Kredit */}
        <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Credit Principal</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-neutral-800 text-white border border-neutral-700">
              <DollarSign size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white tracking-tight font-heading truncate">
            {formatRupiah(stats.totalCredit)}
          </p>
          <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400">
            <span>Interest: 9.25% / Yr</span>
            <span>Tenor: 56 Mos</span>
          </div>
        </div>

        {/* Angsuran Bulanan (P+B) */}
        <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Monthly Installment</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-neutral-800 text-red-400 border border-neutral-700">
              <CreditCard size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-red-400 tracking-tight font-heading truncate">
            {formatRupiah(stats.monthlyInstallment)}
          </p>
          <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400">
            <span>Paid: {stats.paidCount} / 56 Mos</span>
            <span className="text-white font-bold">{stats.progressPercent}%</span>
          </div>
        </div>

        {/* Total Sudah Terbayarkan */}
        <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-neutral-300 uppercase tracking-wider">Total Paid to Date</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-white/10 text-white border border-white/20">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white tracking-tight font-heading truncate">
            {formatRupiah(stats.totalPaidAmount)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-800">
              <div 
                className="bg-red-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-neutral-300">{stats.paidCount} paid</span>
          </div>
        </div>

        {/* Sisa Hutang Terkini */}
        <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-red-400 uppercase tracking-wider">Remaining Debt</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/40">
              <TrendingDown size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-red-500 tracking-tight font-heading truncate">
            {formatRupiah(stats.currentRemainingDebt)}
          </p>
          <div className="mt-2 text-[10px] sm:text-[11px] text-neutral-400">
            <span>{stats.unpaidCount} months remaining</span>
          </div>
        </div>
      </div>

      {/* View 1: SCHEDULE TABLE */}
      {activeTab === 'SCHEDULE' && (
        <div className="space-y-3 sm:space-y-4">
          {/* Filters Bar */}
          <div className="bg-neutral-900/80 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-neutral-800">
            {/* Mobile View: Filter Button */}
            <div className="sm:hidden">
              <button
                onClick={() => setIsFilterModalOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-bold text-neutral-300 hover:text-white transition-all"
              >
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-red-500" />
                  <span>Filters</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-neutral-800 text-[10px]">
                    Year: {selectedYearFilter === 'ALL' ? 'All' : selectedYearFilter}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-neutral-800 text-[10px]">
                    Status: {selectedStatusFilter === 'ALL' ? 'All' : selectedStatusFilter === 'PAID' ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </button>
            </div>

            {/* Desktop View: Inline Filters */}
            <div className="hidden sm:flex flex-row items-center justify-between gap-3">
              {/* Year Filters */}
              <div className="flex items-center gap-1.5 py-0.5">
                <span className="text-xs font-bold text-neutral-400 flex items-center gap-1 mr-1">
                  <Filter size={12} />
                  <span>Year:</span>
                </span>
                {(['ALL', 2024, 2025, 2026, 2027, 2028] as const).map((yr) => (
                  <button
                    key={String(yr)}
                    onClick={() => setSelectedYearFilter(yr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedYearFilter === yr
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {yr === 'ALL' ? 'All (56)' : yr === 2028 ? '2028-2029' : yr}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                <button
                  onClick={() => setSelectedStatusFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all text-center ${
                    selectedStatusFilter === 'ALL' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedStatusFilter('PAID')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all text-center ${
                    selectedStatusFilter === 'PAID' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Paid ({stats.paidCount})
                </button>
                <button
                  onClick={() => setSelectedStatusFilter('UNPAID')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all text-center ${
                    selectedStatusFilter === 'UNPAID' ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Unpaid ({stats.unpaidCount})
                </button>
              </div>
            </div>
          </div>

          {/* Schedule Container */}
          <div className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm">
            {/* 1. Mobile Card List (md:hidden) */}
            <div className="block md:hidden divide-y divide-neutral-800/60 overflow-y-auto max-h-[600px]">
              {filteredItems.map((item) => (
                <div 
                  key={item.id}
                  className={`p-3.5 transition-colors ${
                    item.isPaid ? 'bg-neutral-950/40' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 font-bold">
                        #{item.no}
                      </span>
                      <span className="font-bold text-xs text-white">
                        {item.month} {item.year}
                      </span>
                    </div>

                    {/* Pay / Status Toggle Button */}
                    <button
                      onClick={() => handleTogglePaid(item)}
                      className={`px-2.5 py-1 rounded-lg font-sans text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 ${
                        item.isPaid
                          ? 'bg-white text-black hover:bg-neutral-200 shadow-sm'
                          : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:border-red-500 hover:text-red-400'
                      }`}
                    >
                      {item.isPaid ? (
                        <>
                          <Check size={11} className="stroke-[3]" />
                          <span>Lunas</span>
                        </>
                      ) : (
                        <>
                          <Circle size={11} />
                          <span>Bayar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Total Payment Amount */}
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <span className="text-[11px] text-neutral-400 uppercase font-bold tracking-wider">
                      Total P+B
                    </span>
                    <span className="text-sm font-black text-white font-mono">
                      {formatRupiah(item.totalPayment)}
                    </span>
                  </div>

                  {/* Details Grid: Principal, Interest, Remaining */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs font-mono mb-2">
                    <div>
                      <span className="text-neutral-400 block text-xs uppercase font-sans font-semibold">Principal</span>
                      <span className="text-neutral-200 font-bold">{formatRupiah(item.principal)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-xs uppercase font-sans font-semibold">Interest</span>
                      <span className="text-neutral-400">{formatRupiah(item.interest)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-xs uppercase font-sans font-semibold">Remaining Debt</span>
                      <span className="text-red-400 font-bold">{formatRupiah(item.remainingDebt)}</span>
                    </div>
                  </div>

                  {/* Receipt Action Button on Mobile */}
                  <div className="flex items-center justify-end">
                    {item.proofUrl ? (
                      <button
                        onClick={() => setPreviewImageModal({ 
                          url: item.proofUrl!, 
                          title: `Transfer Receipt #${item.no} (${item.month} ${item.year})` 
                        })}
                        className="text-[11px] text-neutral-300 hover:text-white inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-neutral-800/80 border border-neutral-700 transition-colors"
                      >
                        <ImageIcon size={13} className="text-red-500" />
                        <span>View Transfer Receipt</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedItemForProof(item);
                          setProofAmount(item.totalPayment);
                          setProofDate(item.paidDate || new Date().toISOString().split('T')[0]);
                          setProofNotes(`Transfer Installment #${item.no} (${item.month} ${item.year})`);
                        }}
                        className="text-[11px] text-neutral-400 hover:text-white inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-neutral-950 border border-neutral-850 hover:border-neutral-700 transition-colors"
                      >
                        <Upload size={12} />
                        <span>Upload Receipt</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Desktop Schedule Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/90 border-b border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-2 md:px-2.5 lg:px-4 text-center w-10 md:w-12 lg:w-14 text-[10px] md:text-xs">NO</th>
                    <th className="py-3 px-2 md:px-2.5 lg:px-4 text-[10px] md:text-xs">Month &amp; Year</th>
                    <th className="py-3 px-2 md:px-2.5 lg:px-4 text-right text-[10px] md:text-xs">Interest (9.25%)</th>
                    <th className="py-3 px-2 md:px-2.5 lg:px-4 text-right text-[10px] md:text-xs">Principal</th>
                    <th className="py-3 px-2 md:px-2.5 lg:px-4 text-right text-[10px] md:text-xs">Total P+I</th>
                    <th className="py-3 px-2 md:px-2.5 lg:px-4 text-right text-[10px] md:text-xs">Remaining Debt</th>
                    <th className="py-3 px-2 md:px-2.5 lg:px-4 text-center w-24 md:w-28 text-[10px] md:text-xs">Status</th>
                    <th className="py-3 px-2 md:px-2.5 lg:px-4 text-center w-16 md:w-20 lg:w-24 text-[10px] md:text-xs">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono">
                  {filteredItems.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-white/[0.02] transition-colors ${
                        item.isPaid 
                          ? 'bg-neutral-950/40 text-neutral-300' 
                          : 'text-neutral-200'
                      }`}
                    >
                      {/* NO */}
                      <td className="py-2.5 px-2 md:px-2.5 lg:px-4 text-center font-bold text-neutral-400 text-[11px] md:text-xs">
                        {item.no}
                      </td>

                      {/* Bulan & Tahun */}
                      <td className="py-2.5 px-2 md:px-2.5 lg:px-4 font-sans font-bold text-white text-[11px] md:text-xs">
                        <div className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                          <span className={`w-1.5 md:w-2 h-1.5 md:h-2 rounded-full ${item.isPaid ? 'bg-white' : 'bg-red-500'}`} />
                          <span>{item.month} {item.year}</span>
                        </div>
                      </td>

                      {/* Bunga */}
                      <td className="py-2.5 px-2 md:px-2.5 lg:px-4 text-right text-neutral-400 text-[11px] md:text-xs whitespace-nowrap">
                        {formatRupiah(item.interest)}
                      </td>

                      {/* Pokok */}
                      <td className="py-2.5 px-2 md:px-2.5 lg:px-4 text-right text-neutral-200 text-[11px] md:text-xs whitespace-nowrap">
                        {formatRupiah(item.principal)}
                      </td>

                      {/* Total P+B */}
                      <td className="py-2.5 px-2 md:px-2.5 lg:px-4 text-right font-black text-white text-[11px] md:text-xs whitespace-nowrap">
                        {formatRupiah(item.totalPayment)}
                      </td>

                      {/* Sisa Hutang */}
                      <td className="py-2.5 px-2 md:px-2.5 lg:px-4 text-right font-bold text-red-400 text-[11px] md:text-xs whitespace-nowrap">
                        {formatRupiah(item.remainingDebt)}
                      </td>

                      {/* Ceklist Status */}
                      <td className="py-2.5 px-2 md:px-2.5 lg:px-4 text-center">
                        <button
                          onClick={() => handleTogglePaid(item)}
                          className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-xl font-sans text-[10px] md:text-[11px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1 md:gap-1.5 mx-auto ${
                            item.isPaid
                              ? 'bg-white text-black hover:bg-neutral-200 shadow-sm'
                              : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:border-red-500 hover:text-red-400'
                          }`}
                          title={item.isPaid ? 'Click to mark unpaid' : 'Click to mark paid & upload transfer receipt'}
                        >
                          {item.isPaid ? (
                            <>
                              <Check size={12} className="stroke-[3]" />
                              <span>Paid</span>
                            </>
                          ) : (
                            <>
                              <Circle size={12} />
                              <span>Pay</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Bukti Transfer */}
                      <td className="py-2.5 px-2 md:px-2.5 lg:px-4 text-center">
                        {item.proofUrl ? (
                          <button
                            onClick={() => setPreviewImageModal({ 
                              url: item.proofUrl!, 
                              title: `Transfer Receipt #${item.no} (${item.month} ${item.year})` 
                            })}
                            className="p-1 md:p-1.5 rounded-xl bg-neutral-800 text-white hover:bg-neutral-700 transition-colors"
                            title="View Receipt"
                          >
                            <ImageIcon size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedItemForProof(item);
                              setProofAmount(item.totalPayment);
                              setProofDate(item.paidDate || new Date().toISOString().split('T')[0]);
                              setProofNotes(`Transfer Installment #${item.no} (${item.month} ${item.year})`);
                            }}
                            className="p-1 md:p-1.5 rounded-xl text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
                            title="Upload Receipt"
                          >
                            <Upload size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Sheet ARSIP (Foto Bukti Transfer & Riwayat) */}
      {activeTab === 'ARCHIVE' && (
        <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider font-heading flex items-center gap-2">
                <ShieldCheck size={18} className="text-white" />
                <span>Archive Sheet &bull; Payment Transfer Receipts</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Receipt photos, m-Banking transfer records, and installment payment dates
              </p>
            </div>
            <span className="text-xs font-bold text-neutral-400 px-3 py-1 rounded-xl bg-neutral-950 border border-neutral-800">
              Total {archives.length} Documents Saved
            </span>
          </div>

          {archives.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-neutral-800 rounded-2xl text-neutral-500 text-xs">
              No transfer receipts archived yet. Check off debt installments to upload receipts.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archives.map((arc) => (
                <div 
                  key={arc.id}
                  className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 hover:border-neutral-700 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-950/60 text-red-400 border border-red-500/30">
                        Installment #{arc.no} &bull; {arc.month} {arc.year}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">{arc.paidDate}</span>
                    </div>

                    <p className="text-lg font-black text-white font-heading">
                      {formatRupiah(arc.amount)}
                    </p>

                    {arc.notes && (
                      <p className="text-xs text-neutral-300 bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                        {arc.notes}
                      </p>
                    )}

                    {arc.proofUrl ? (
                      <div 
                        onClick={() => setPreviewImageModal({ 
                          url: arc.proofUrl!, 
                          title: `Transfer Receipt #${arc.no} (${arc.month} ${arc.year})` 
                        })}
                        className="h-40 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 cursor-pointer group relative"
                      >
                        <img 
                          src={arc.proofUrl} 
                          alt="Transfer Receipt" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-xs">
                          <Eye size={14} />
                          <span>Enlarge Photo</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-16 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-center text-neutral-500 text-xs">
                        No attached image
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-[10px] text-neutral-400">
                    <span className="text-white flex items-center gap-1 font-semibold">
                      <CheckCircle2 size={12} className="text-red-500" />
                      <span>Verified Archive</span>
                    </span>
                    <button
                      onClick={() => handleDeleteArchive(arc.id)}
                      className="text-neutral-500 hover:text-red-400 p-1 transition-colors"
                      title="Delete Archive"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Bukti Transfer Modal */}
      {selectedItemForProof && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-sm relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                  <Upload size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
                    Transfer Receipt &bull; Installment #{selectedItemForProof.no}
                  </h3>
                  <p className="text-xs text-neutral-400">Period {selectedItemForProof.month} {selectedItemForProof.year}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItemForProof(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 font-bold uppercase mb-1">Payment Amount (P+I)</label>
                <input 
                  type="number"
                  value={proofAmount || ''}
                  onChange={(e) => setProofAmount(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-bold uppercase mb-1">Payment Date</label>
                <input 
                  type="date"
                  value={proofDate}
                  onChange={(e) => setProofDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-bold uppercase mb-1">Screenshot / Receipt Photo</label>
                <input 
                  type="file"
                  accept="image/*"
                  onChange={handleProofImageChange}
                  className="w-full text-neutral-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-500"
                />
              </div>

              {proofImage && (
                <div className="h-36 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950">
                  <img src={proofImage} alt="Receipt Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
              )}

              <div>
                <label className="block text-neutral-400 font-bold uppercase mb-1">Payment Notes</label>
                <input 
                  type="text"
                  placeholder="e.g., Transfer to Credit Account"
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedItemForProof(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-800 text-neutral-300 font-bold text-xs uppercase hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProofAndMarkPaid}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase shadow-sm transition-all"
              >
                Save &amp; Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Zoom Modal */}
      {previewImageModal && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImageModal(null)}>
          <div className="max-w-2xl w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="text-xs font-bold text-white uppercase">{previewImageModal.title}</span>
              <button onClick={() => setPreviewImageModal(null)} className="text-neutral-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-2xl bg-neutral-950 flex items-center justify-center p-2">
              <img src={previewImageModal.url} alt={previewImageModal.title} className="max-w-full max-h-[70vh] object-contain rounded-xl" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal for Mobile */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isFilterModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              {/* Blurred Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFilterModalOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              {/* Modal Card */}
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
                      <Filter size={16} />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading leading-tight">
                      Filter Schedule
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsFilterModalOpen(false)}
                    className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Year Selection */}
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
                      Year
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['ALL', 2024, 2025, 2026, 2027, 2028] as const).map((yr) => (
                        <button
                          key={String(yr)}
                          onClick={() => {
                            setSelectedYearFilter(yr);
                          }}
                          className={`px-2 py-2 rounded-xl text-xs font-bold transition-all ${
                            selectedYearFilter === yr
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {yr === 'ALL' ? 'All (56)' : yr === 2028 ? '2028-2029' : yr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Selection */}
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 block">
                      Status
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSelectedStatusFilter('ALL')}
                        className={`px-2 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wider ${
                          selectedStatusFilter === 'ALL'
                            ? 'bg-neutral-700 text-white shadow-sm'
                            : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setSelectedStatusFilter('PAID')}
                        className={`px-2 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wider ${
                          selectedStatusFilter === 'PAID'
                            ? 'bg-white text-black shadow-sm'
                            : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Paid ({stats.paidCount})
                      </button>
                      <button
                        onClick={() => setSelectedStatusFilter('UNPAID')}
                        className={`px-2 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wider ${
                          selectedStatusFilter === 'UNPAID'
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Unpaid ({stats.unpaidCount})
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setIsFilterModalOpen(false)}
                    className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-red-500 transition-colors shadow-sm"
                  >
                    Apply Filters
                  </button>
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
