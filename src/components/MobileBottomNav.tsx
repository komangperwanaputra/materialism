import React from 'react';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  PieChart as PieChartIcon, 
  CreditCard, 
  Plus 
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'dashboard' | 'debt' | 'analytics' | 'calendar' | 'settings' | 'add';
  setActiveTab: (tab: 'dashboard' | 'debt' | 'analytics' | 'calendar' | 'settings' | 'add') => void;
  onNewTransaction: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onNewTransaction,
}) => {
  return (
    <nav
      id="mobile-bottom-navbar"
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-2xl border-t border-neutral-800/80 px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.8)]"
    >
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* 1. Dashboard */}
        <button
          id="mobile-nav-dashboard"
          type="button"
          onClick={() => setActiveTab('dashboard')}
          aria-label="Dashboard"
          title="Dashboard"
          className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 active:scale-90 select-none ${
            activeTab === 'dashboard'
              ? 'text-red-500'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <LayoutDashboard 
            size={22} 
            className={`transition-colors ${activeTab === 'dashboard' ? 'text-red-500 stroke-[2.4]' : 'stroke-[1.9]'}`} 
          />
        </button>

        {/* 2. Calendar */}
        <button
          id="mobile-nav-calendar"
          type="button"
          onClick={() => setActiveTab('calendar')}
          aria-label="Calendar"
          title="Calendar"
          className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 active:scale-90 select-none ${
            activeTab === 'calendar'
              ? 'text-red-500'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <CalendarIcon 
            size={22} 
            className={`transition-colors ${activeTab === 'calendar' ? 'text-red-500 stroke-[2.4]' : 'stroke-[1.9]'}`} 
          />
        </button>

        {/* 3. Center Quick Add Button (Refined Luxury Aesthetic - Flush & Elegant) */}
        <button
          id="mobile-nav-add-btn"
          type="button"
          onClick={onNewTransaction}
          aria-label="Add New Transaction"
          title="Add New Transaction"
          className={`relative group w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 select-none ${
            activeTab === 'add'
              ? 'bg-gradient-to-b from-[#C5272E] to-[#89181d] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_0_16px_rgba(197,39,46,0.45)] scale-105'
              : 'bg-gradient-to-b from-[#C5272E] via-[#a71d23] to-[#89181d] hover:from-[#e46168] hover:to-[#a71d23] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_14px_rgba(0,0,0,0.6)]'
          }`}
        >
          {/* Soft ambient jewel glow */}
          <span className="absolute -inset-0.5 rounded-2xl bg-red-500/20 blur-[6px] pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity" />

          {/* Crisp, precision-cut icon */}
          <Plus 
            size={20} 
            className="relative z-10 stroke-[2] text-white transition-transform duration-200 group-active:rotate-45" 
          />
        </button>

        {/* 4. Analytics */}
        <button
          id="mobile-nav-analytics"
          type="button"
          onClick={() => setActiveTab('analytics')}
          aria-label="Analytics"
          title="Analytics"
          className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 active:scale-90 select-none ${
            activeTab === 'analytics'
              ? 'text-red-500'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <PieChartIcon 
            size={22} 
            className={`transition-colors ${activeTab === 'analytics' ? 'text-red-500 stroke-[2.4]' : 'stroke-[1.9]'}`} 
          />
        </button>

        {/* 5. Debt Plan */}
        <button
          id="mobile-nav-debt"
          type="button"
          onClick={() => setActiveTab('debt')}
          aria-label="Debt Plan"
          title="Debt Plan"
          className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 active:scale-90 select-none ${
            activeTab === 'debt'
              ? 'text-red-500'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <CreditCard 
            size={22} 
            className={`transition-colors ${activeTab === 'debt' ? 'text-red-500 stroke-[2.4]' : 'stroke-[1.9]'}`} 
          />
        </button>
      </div>
    </nav>
  );
};
