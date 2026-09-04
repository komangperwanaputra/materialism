import React, { useState, useMemo } from 'react';
import { 
  Download, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  TrendingDown, 
  Wallet as WalletIcon, 
  Calendar,
  Layers,
  BarChart3,
  Percent,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { Transaction } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CustomSelect } from './CustomSelect';
import { FrostedGlowDonutChart } from './FrostedGlowDonutChart';
import { getCategoryIcon } from './DashboardView';

interface AnalyticsViewProps {
  transactions: Transaction[];
  privacyMode: boolean;
}

// Professional Monochrome & Crimson Palette with Multi-stop Transparent Gradients
const CATEGORY_GRADIENTS = [
  { 
    id: 'gradRedPrimary', 
    from: '#C5272E', 
    via: '#a71d23', 
    to: '#6a1317', 
    fromOpacity: 0.95, 
    viaOpacity: 0.58, 
    toOpacity: 0.22, 
    solid: '#C5272E', 
    border: '#C5272E' 
  },
  { 
    id: 'gradWhite', 
    from: '#ffffff', 
    via: '#e2e8f0', 
    to: '#64748b', 
    fromOpacity: 0.95, 
    viaOpacity: 0.52, 
    toOpacity: 0.18, 
    solid: '#ffffff', 
    border: '#e5e5e5' 
  },
  { 
    id: 'gradDeepCrimson', 
    from: '#a71d23', 
    via: '#89181d', 
    to: '#3d080b', 
    fromOpacity: 0.9, 
    viaOpacity: 0.52, 
    toOpacity: 0.2, 
    solid: '#a71d23', 
    border: '#a71d23' 
  },
  { 
    id: 'gradSilver', 
    from: '#cbd5e1', 
    via: '#94a3b8', 
    to: '#334155', 
    fromOpacity: 0.85, 
    viaOpacity: 0.48, 
    toOpacity: 0.16, 
    solid: '#94a3b8', 
    border: '#a3a3a3' 
  },
  { 
    id: 'gradBurgundy', 
    from: '#89181d', 
    via: '#6a1317', 
    to: '#3d080b', 
    fromOpacity: 0.9, 
    viaOpacity: 0.5, 
    toOpacity: 0.18, 
    solid: '#89181d', 
    border: '#6a1317' 
  },
  { 
    id: 'gradCharcoal', 
    from: '#a1a1aa', 
    via: '#52525b', 
    to: '#18181b', 
    fromOpacity: 0.82, 
    viaOpacity: 0.42, 
    toOpacity: 0.15, 
    solid: '#71717a', 
    border: '#525252' 
  },
  { 
    id: 'gradScarlet', 
    from: '#e46168', 
    via: '#C5272E', 
    to: '#89181d', 
    fromOpacity: 0.95, 
    viaOpacity: 0.58, 
    toOpacity: 0.22, 
    solid: '#e46168', 
    border: '#a71d23' 
  },
  { 
    id: 'gradZinc', 
    from: '#f8fafc', 
    via: '#cbd5e1', 
    to: '#475569', 
    fromOpacity: 0.9, 
    viaOpacity: 0.5, 
    toOpacity: 0.18, 
    solid: '#cbd5e1', 
    border: '#ffffff' 
  },
];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  privacyMode,
}) => {
  const [timeframe, setTimeframe] = useState<'current_year' | 'monthly' | 'yearly_comparison' | 'all'>('current_year');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    transactions.forEach(t => {
      const y = parseInt(t.date.substring(0, 4), 10);
      if (!isNaN(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Filtered transactions
  const filteredData = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      const y = d.getFullYear();
      const m = d.getMonth();

      if (timeframe === 'current_year') {
        return y === selectedYear;
      }
      if (timeframe === 'monthly') {
        return y === selectedYear && m === selectedMonth;
      }
      if (timeframe === 'yearly_comparison') {
        return true; // We will aggregate by year
      }
      return true; // all
    });
  }, [transactions, timeframe, selectedYear, selectedMonth]);

  // Totals
  const totalIncome = useMemo(() => {
    return filteredData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  }, [filteredData]);

  const totalExpense = useMemo(() => {
    return filteredData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }, [filteredData]);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  // 1. Monthly Breakdown for Current Year (12 Months Jan - Des)
  const monthlyDataForYear = useMemo(() => {
    const monthsMap = monthsList.map((name, idx) => ({
      name: name.substring(0, 3),
      fullName: name,
      monthIndex: idx,
      pemasukan: 0,
      pengeluaran: 0,
      saldoBersih: 0
    }));

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (d.getFullYear() === selectedYear) {
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          if (t.type === 'income') {
            monthsMap[m].pemasukan += t.amount;
          } else {
            monthsMap[m].pengeluaran += t.amount;
          }
          monthsMap[m].saldoBersih = monthsMap[m].pemasukan - monthsMap[m].pengeluaran;
        }
      }
    });

    return monthsMap;
  }, [transactions, selectedYear]);

  // 2. Yearly Multi-Year Comparison
  const yearlyComparisonData = useMemo(() => {
    const map: Record<number, { year: string; pemasukan: number; pengeluaran: number; net: number }> = {};
    
    transactions.forEach(t => {
      const y = parseInt(t.date.substring(0, 4), 10);
      if (!isNaN(y)) {
        if (!map[y]) {
          map[y] = { year: y.toString(), pemasukan: 0, pengeluaran: 0, net: 0 };
        }
        if (t.type === 'income') {
          map[y].pemasukan += t.amount;
        } else {
          map[y].pengeluaran += t.amount;
        }
        map[y].net = map[y].pemasukan - map[y].pengeluaran;
      }
    });

    return Object.values(map).sort((a, b) => a.year.localeCompare(b.year));
  }, [transactions]);

  // 3. Category Distribution (Pie / Donut)
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const c = t.category || 'Lainnya';
        map[c] = (map[c] || 0) + t.amount;
      });

    const list = Object.entries(map).map(([name, value]) => ({
      name,
      value
    }));

    return list.sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // 4. Wallet Distribution
  const walletData = useMemo(() => {
    const map: Record<string, { name: string; income: number; expense: number }> = {};
    filteredData.forEach(t => {
      const w = t.wallet || 'Cash';
      if (!map[w]) map[w] = { name: w, income: 0, expense: 0 };
      if (t.type === 'income') {
        map[w].income += t.amount;
      } else {
        map[w].expense += t.amount;
      }
    });
    return Object.values(map).sort((a, b) => b.expense - a.expense);
  }, [filteredData]);

  const formatRupiah = (num: number) => {
    if (privacyMode) return 'Rp ••••••••';
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-neutral-950/95 border border-neutral-800 p-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs space-y-1">
          <p className="font-bold text-neutral-300 mb-1">{label}</p>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: item.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}:</span>
              </span>
              <span className="font-bold font-heading text-white">
                {formatRupiah(item.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Export PDF Report
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Banner
      doc.setFillColor(15, 15, 15);
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setTextColor(255, 44, 44);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('MATERIALISM', 14, 20);

      doc.setTextColor(180, 180, 180);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('by sinteka  |  Financial & Cash Flow Report', 14, 28);
      doc.text(`Period: ${timeframe.toUpperCase()} (${selectedYear})`, 14, 34);

      // Financial Highlights Box
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(14, 46, pageWidth - 28, 28, 3, 3, 'F');

      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8);
      doc.text('TOTAL INCOME', 20, 54);
      doc.text('TOTAL EXPENSES', 80, 54);
      doc.text('NET BALANCE', 140, 54);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 20);
      doc.text(`Rp ${totalIncome.toLocaleString('id-ID')}`, 20, 66);

      doc.setTextColor(239, 68, 68);
      doc.text(`Rp ${totalExpense.toLocaleString('id-ID')}`, 80, 66);

      doc.setTextColor(20, 20, 20);
      doc.text(`Rp ${netSavings.toLocaleString('id-ID')}`, 140, 66);

      // Category Summary Table
      const catRows = categoryData.map((c, i) => [
        (i + 1).toString(),
        c.name,
        `Rp ${c.value.toLocaleString('id-ID')}`,
        totalExpense > 0 ? `${((c.value / totalExpense) * 100).toFixed(1)}%` : '0%',
      ]);

      autoTable(doc, {
        startY: 82,
        head: [['No', 'Expense Category', 'Amount', 'Share']],
        body: catRows,
        theme: 'striped',
        headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5 },
      });

      doc.save(`Materialism_Analytics_${selectedYear}.pdf`);
    } catch (e) {
      console.error('Failed to export PDF:', e);
    }
  };

  const monthSelectOptions = monthsList.map((m, idx) => ({
    value: idx.toString(),
    label: m
  }));

  const yearSelectOptions = availableYears.map((y) => ({
    value: y.toString(),
    label: y.toString()
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Controls & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div 
          className="flex items-center gap-1 bg-neutral-900/90 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-neutral-800 overflow-x-auto hide-scrollbar no-scrollbar w-full sm:w-auto shadow-inner"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <button
            onClick={() => setTimeframe('current_year')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-shrink-0 ${
              timeframe === 'current_year'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            This Year ({selectedYear})
          </button>
          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-shrink-0 ${
              timeframe === 'monthly'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setTimeframe('yearly_comparison')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-shrink-0 ${
              timeframe === 'yearly_comparison'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Yearly Comparison
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-shrink-0 ${
              timeframe === 'all'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Time
          </button>
        </div>

        {/* Year/Month Selectors & PDF Download (CustomSelect - No Blue) */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {timeframe === 'monthly' && (
            <div className="w-28 sm:w-32">
              <CustomSelect
                value={selectedMonth.toString()}
                onChange={(val) => setSelectedMonth(Number(val))}
                options={monthSelectOptions}
              />
            </div>
          )}

          <div className="w-24 sm:w-28">
            <CustomSelect
              value={selectedYear.toString()}
              onChange={(val) => setSelectedYear(Number(val))}
              options={yearSelectOptions}
            />
          </div>

          <button
            onClick={handleExportPDF}
            className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all shadow-sm flex-shrink-0 active:scale-95"
            title="Export PDF Report"
          >
            <Download size={15} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Income */}
        <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-neutral-300 uppercase tracking-wider">Total Income</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-white/10 text-white border border-white/20">
              <ArrowUpRight size={15} />
            </div>
          </div>
          <p className="text-lg sm:text-xl md:text-lg lg:text-2xl font-black text-white tracking-tight font-heading truncate">
            {formatRupiah(totalIncome)}
          </p>
          <div className="mt-2 text-[10px] sm:text-xs text-neutral-400">
            <span>Accumulated cash inflow</span>
          </div>
        </div>

        {/* Total Expense */}
        <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-red-500 uppercase tracking-wider">Total Expenses</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30">
              <ArrowDownRight size={15} />
            </div>
          </div>
          <p className="text-lg sm:text-xl md:text-lg lg:text-2xl font-black text-red-500 tracking-tight font-heading truncate">
            {formatRupiah(totalExpense)}
          </p>
          <div className="mt-2 text-[10px] sm:text-xs text-neutral-400">
            <span>Total spend &amp; liabilities</span>
          </div>
        </div>

        {/* Net Balance */}
        <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-neutral-300 uppercase tracking-wider">Net Balance</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-neutral-800 text-neutral-300">
              <DollarSign size={15} />
            </div>
          </div>
          <p className={`text-lg sm:text-xl md:text-lg lg:text-2xl font-black tracking-tight font-heading truncate ${netSavings >= 0 ? 'text-white' : 'text-red-500'}`}>
            {formatRupiah(netSavings)}
          </p>
          <div className="mt-2 text-[10px] sm:text-xs text-neutral-400">
            <span>{netSavings >= 0 ? 'Financial Surplus' : 'Cash Deficit'}</span>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-bold text-neutral-300 uppercase tracking-wider">Savings Rate</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-white/10 text-white border border-white/20">
              <Percent size={15} />
            </div>
          </div>
          <p className="text-lg sm:text-xl md:text-lg lg:text-2xl font-black text-white tracking-tight font-heading truncate">
            {savingsRate}%
          </p>
          <div className="mt-2 text-[10px] sm:text-xs text-neutral-400">
            <span>Percentage of income saved</span>
          </div>
        </div>
      </div>

      {/* Main Charts: Cash Flow & Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Chart (Area / Bar) */}
        <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:col-span-2 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={18} className="text-red-500" />
                <span>
                  {timeframe === 'current_year' && `Monthly Cash Flow (${selectedYear})`}
                  {timeframe === 'monthly' && `Cash Flow for ${monthsList[selectedMonth]} ${selectedYear}`}
                  {timeframe === 'yearly_comparison' && 'Yearly Cash Flow Comparison'}
                  {timeframe === 'all' && 'Overall Cash Flow Trend'}
                </span>
              </h3>
              <p className="text-xs text-neutral-400">Income vs Expenses</p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {timeframe === 'yearly_comparison' ? (
                <BarChart data={yearlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="year" stroke="#737373" fontSize={11} tickLine={false} />
                  <YAxis stroke="#737373" fontSize={10} tickLine={false} tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="pemasukan" name="Income" fill="#ffffff" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="pengeluaran" name="Expense" fill="#C5272E" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={monthlyDataForYear} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C5272E" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#C5272E" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="name" stroke="#737373" fontSize={11} tickLine={false} />
                  <YAxis stroke="#737373" fontSize={10} tickLine={false} tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="pemasukan" name="Income" stroke="#ffffff" strokeWidth={2.5} fillOpacity={1} fill="url(#incomeGrad)" />
                  <Area type="monotone" dataKey="pengeluaran" name="Expense" stroke="#C5272E" strokeWidth={2.5} fillOpacity={1} fill="url(#expenseGrad)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Expense Categories */}
        <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 lg:col-span-1 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PieChartIcon size={18} className="text-red-500" />
                <span>Expense Categories</span>
              </h3>
              <p className="text-xs text-neutral-400">Capital allocation breakdown</p>
            </div>
            {categoryData.length > 0 && (
              <span className="text-xs font-bold text-neutral-300 bg-neutral-950 border border-neutral-800 px-2.5 py-1 rounded-xl">
                {categoryData.length} {categoryData.length === 1 ? 'Category' : 'Categories'}
              </span>
            )}
          </div>

          {/* 2-columns on tablet (md), 1-column on mobile/desktop (lg) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6 items-center">
            {/* Frosted Acrylic Donut with Diffuse Light Core & Precision Gauge Rays */}
            <div className="w-full flex items-center justify-center py-2">
            {categoryData.length === 0 ? (
              <div className="text-center text-xs text-neutral-500 py-12">No expense data available</div>
            ) : (
              <FrostedGlowDonutChart
                data={categoryData}
                totalAmount={totalExpense}
                privacyMode={privacyMode}
                activeCategoryIndex={activeCategoryIndex}
                onSelectCategory={setActiveCategoryIndex}
              />
            )}
          </div>

            {/* Clean Minimal Category List (Outline-free) */}
            <div className="space-y-2 max-h-56 md:max-h-72 lg:max-h-56 overflow-y-auto pr-1 custom-scrollbar">
            {categoryData.map((cat, idx) => {
              const percent = totalExpense > 0 ? ((cat.value / totalExpense) * 100).toFixed(1) : '0';
              const isHovered = activeCategoryIndex === idx;

              return (
                <div
                  key={cat.name}
                  onMouseEnter={() => setActiveCategoryIndex(idx)}
                  onMouseLeave={() => setActiveCategoryIndex(null)}
                  className={`group relative overflow-hidden rounded-xl p-2.5 transition-all duration-200 cursor-pointer ${
                    isHovered
                      ? 'bg-neutral-800/80'
                      : 'bg-neutral-950/40 hover:bg-neutral-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    {/* Category Icon & Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          isHovered
                            ? 'bg-red-600 text-white'
                            : 'bg-neutral-900 text-neutral-300 group-hover:text-white'
                        }`}
                      >
                        {getCategoryIcon(cat.name, 14)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                          {cat.name}
                        </p>
                        <p className="text-[11px] font-mono text-neutral-400">
                          {privacyMode ? '••••' : formatRupiah(cat.value)}
                        </p>
                      </div>
                    </div>

                    {/* Percentage */}
                    <div className="flex-shrink-0">
                      <span
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md transition-all ${
                          isHovered
                            ? 'bg-red-500/20 text-red-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {percent}%
                      </span>
                    </div>
                  </div>

                  {/* Clean Gradient Bar */}
                  <div className="w-full bg-neutral-900/80 h-1 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${percent}%`,
                        background: isHovered
                          ? 'linear-gradient(90deg, #C5272E 0%, #a71d23 100%)'
                          : 'linear-gradient(90deg, rgba(197, 39, 46, 0.75) 0%, rgba(137, 24, 29, 0.35) 100%)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Breakdown Grid */}
      <div className="backdrop-blur-xl bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <WalletIcon size={18} className="text-red-500" />
              <span>Account &amp; Wallet Activity</span>
            </h3>
            <p className="text-xs text-neutral-400">Transaction distribution by account</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {walletData.map((w) => (
            <div key={w.name} className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 space-y-2 hover:border-neutral-700 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">{w.name}</span>
                <span className="w-2 h-2 rounded-full bg-red-600" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>In:</span>
                  <span className="text-white font-bold">{formatRupiah(w.income)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Out:</span>
                  <span className="text-red-500 font-bold">{formatRupiah(w.expense)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
