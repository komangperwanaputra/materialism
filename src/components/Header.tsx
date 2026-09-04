import React, { useMemo } from 'react';
import { 
  Settings, 
  Plus, 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  PieChart as PieChartIcon, 
  CreditCard, 
  Eye, 
  EyeOff, 
  Search, 
  X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AutoSyncState, Transaction, WalletInitialBalances } from '../types';
import { MobileHeaderSummary } from './MobileHeaderSummary';

interface HeaderProps {
  activeTab: 'dashboard' | 'debt' | 'analytics' | 'calendar' | 'settings' | 'add';
  setActiveTab: (tab: 'dashboard' | 'debt' | 'analytics' | 'calendar' | 'settings' | 'add') => void;
  privacyMode: boolean;
  onTogglePrivacy: () => void;
  syncState?: AutoSyncState;
  onOpenSheetsSync?: () => void;
  transactions?: Transaction[];
  initialBalances?: WalletInitialBalances;
  selectedMonth?: number | null;
  onSelectMonth?: (m: number | null) => void;
  selectedYear?: number;
  onSelectYear?: (y: number) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isMobileSearchOpen?: boolean;
  onToggleMobileSearch?: () => void;
}

const NAV_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'analytics', label: 'Analytics', icon: PieChartIcon },
  { id: 'debt', label: 'Debt Plan', icon: CreditCard },
] as const;

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  privacyMode,
  onTogglePrivacy,
  transactions = [],
  selectedMonth = null,
  onSelectMonth,
  selectedYear = new Date().getFullYear(),
  onSelectYear,
  searchQuery = '',
  onSearchChange,
  isMobileSearchOpen = false,
  onToggleMobileSearch,
}) => {
  // Compute monthly financial summary for the mobile header
  const { expenses, income, balance, availableMonths } = useMemo(() => {
    const monthsSet = new Set<string>();
    const avail: { year: number; month: number }[] = [];

    let exp = 0;
    let inc = 0;

    transactions.forEach((tx) => {
      const parts = (tx.date || '').split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1; // 0-indexed month
        const key = `${y}-${m}`;
        if (!monthsSet.has(key)) {
          monthsSet.add(key);
          avail.push({ year: y, month: m });
        }

        const matchesYear = selectedYear === y;
        const matchesMonth = selectedMonth === null || selectedMonth === m;

        if (matchesYear && matchesMonth) {
          if (tx.type === 'expense') {
            exp += tx.amount;
          } else if (tx.type === 'income') {
            inc += tx.amount;
          }
        }
      }
    });

    return {
      expenses: exp,
      income: inc,
      balance: inc - exp,
      availableMonths: avail,
    };
  }, [transactions, selectedYear, selectedMonth]);

  return (
    <header 
      id="app-header"
      className="sticky top-0 z-40 w-full bg-[#0a0a0a]/95 backdrop-blur-2xl border-b border-white/10 py-3 sm:py-4 md:py-5 px-3 sm:px-4 md:px-6 lg:px-8 shadow-md shadow-black/40 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* Top Bar Row: Logo / Brand, Desktop Nav, and Header Action Controls */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Brand & Left Area: Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 sm:gap-2.5 text-left group min-w-0"
            >
              {/* Clean Vector Financial Diamond / Vault Logo */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-neutral-900 rounded-xl sm:rounded-2xl flex items-center justify-center border border-neutral-800 shadow-sm group-hover:border-neutral-700 transition-all flex-shrink-0">
                <svg 
                  className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-red-500" 
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
              <div className="flex flex-col min-w-0 justify-center">
                <span className="text-xs sm:text-sm md:text-base lg:text-lg font-black tracking-wider text-white leading-none font-heading uppercase truncate">
                  MATERIALISM
                </span>
              </div>
            </button>

            {/* Desktop Privacy Eye Button */}
            <div className="hidden sm:flex items-center pl-1 sm:pl-2 md:pl-3 border-l border-neutral-800 flex-shrink-0">
              <button
                id="btn-privacy-eye"
                type="button"
                onClick={onTogglePrivacy}
                className={`p-1.5 sm:p-2 rounded-full transition-all border ${
                  privacyMode
                    ? 'bg-neutral-900 text-red-500 border-neutral-800 shadow-sm'
                    : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700 hover:bg-neutral-800'
                }`}
                title={privacyMode ? 'Show Numbers' : 'Hide Numbers'}
              >
                {privacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Center / Tab Navigation with Sliding Active Motion Pill (Desktop) */}
          <nav 
            id="header-desktop-nav"
            className="hidden md:flex items-center gap-0.5 lg:gap-1 bg-neutral-900/90 backdrop-blur-md p-1 rounded-full border border-neutral-800 flex-shrink-0 relative"
          >
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const IconComponent = tab.icon;

              return (
                <button 
                  key={tab.id}
                  id={`nav-${tab.id}-btn`}
                  onClick={() => setActiveTab(tab.id)} 
                  className={`relative px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-full font-bold text-[11px] lg:text-xs xl:text-sm tracking-wider uppercase transition-colors duration-200 flex items-center gap-1.5 whitespace-nowrap z-10 select-none ${
                    isActive
                      ? 'text-white font-extrabold'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktop-active-nav-pill"
                      className="absolute inset-0 bg-red-600 rounded-full shadow-md shadow-red-950/50 -z-10"
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 32,
                      }}
                    />
                  )}
                  <IconComponent size={14} className="lg:w-[15px] lg:h-[15px] flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Section: Action Controls (Mobile & Desktop) */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Mobile Header Quick Actions (Search, Calendar, Privacy) */}
            <div className="flex md:hidden items-center gap-1">
              {/* Quick Search Toggle */}
              {onToggleMobileSearch && (
                <button
                  type="button"
                  onClick={onToggleMobileSearch}
                  className={`p-1.5 rounded-full transition-all border ${
                    isMobileSearchOpen
                      ? 'bg-red-600 text-white border-red-500 shadow-sm'
                      : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                  }`}
                  title="Search Transactions"
                >
                  <Search size={15} />
                </button>
              )}

              {/* Mobile Privacy Toggle */}
              <button
                type="button"
                onClick={onTogglePrivacy}
                className={`p-1.5 rounded-full transition-all border ${
                  privacyMode
                    ? 'bg-neutral-900 text-red-500 border-neutral-800 shadow-sm'
                    : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                }`}
                title={privacyMode ? 'Show Numbers' : 'Hide Numbers'}
              >
                {privacyMode ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Separated Transaction Action Button (Desktop header) */}
            <button
              id="nav-add-btn"
              onClick={() => setActiveTab('add')}
              className={`hidden md:inline-flex px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-full font-bold text-xs lg:text-sm tracking-wider uppercase transition-all duration-200 items-center gap-1.5 shadow-sm active:scale-95 whitespace-nowrap ${
                activeTab === 'add'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              <Plus size={14} className="stroke-[2.5] lg:w-[15px] lg:h-[15px]" />
              <span>Transaction</span>
            </button>

            {/* Rightmost Settings Gear Logo Only */}
            <button
              id="btn-settings-gear-header"
              onClick={() => setActiveTab('settings')}
              className={`p-1.5 sm:p-2 lg:p-2.5 rounded-full transition-all border active:scale-95 flex-shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700 hover:bg-neutral-800'
              }`}
              title="Settings"
            >
              <Settings size={15} className="lg:w-[17px] lg:h-[17px]" />
            </button>
          </div>
        </div>

        {/* Mobile Expandable Search Bar */}
        <AnimatePresence>
          {isMobileSearchOpen && onSearchChange && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="md:hidden overflow-hidden pt-1"
            >
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-neutral-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search note, category, or amount..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  autoFocus
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-9 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-2.5 p-1 text-neutral-400 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile View: Dedicated Money Tracker Header Summary Bar (Expenses, Income, Balance) */}
        {activeTab === 'dashboard' && onSelectMonth && onSelectYear && (
          <div className="block md:hidden">
            <MobileHeaderSummary
              selectedMonth={selectedMonth}
              onSelectMonth={onSelectMonth}
              selectedYear={selectedYear}
              onSelectYear={onSelectYear}
              expenses={expenses}
              income={income}
              balance={balance}
              privacyMode={privacyMode}
              availableMonths={availableMonths}
            />
          </div>
        )}
      </div>
    </header>
  );
};
