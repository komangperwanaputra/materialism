/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { DebtPlanView } from './components/DebtPlanView';
import { CalendarView } from './components/CalendarView';
import { AnalyticsView } from './components/AnalyticsView';
import { TransactionForm } from './components/TransactionForm';
import { SettingsView } from './components/SettingsView';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Transaction, WalletInitialBalances, DebtScheduleItem, DebtArchiveRecord, AutoSyncState } from './types';
import { 
  getLocalTransactions, 
  saveLocalTransactions, 
  getPrivacyMode, 
  savePrivacyMode,
  getWalletInitialBalances,
  saveWalletInitialBalances,
  getDebtScheduleItems,
  saveDebtScheduleItems,
  getDebtArchives,
  saveDebtArchives,
  fetchTransactionsFromGas,
  syncAllTransactionsToGas
} from './services/storage';
import { 
  getSavedSpreadsheetId, 
  syncTransactionsToGoogleSheets, 
  fetchTransactionsFromGoogleSheets 
} from './services/googleSheetsService';
import { getCachedAccessToken } from './services/googleAuth';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'debt' | 'analytics' | 'calendar' | 'settings' | 'add'>('dashboard');
  const [returnTabAfterAdd, setReturnTabAfterAdd] = useState<'dashboard' | 'debt' | 'analytics' | 'calendar' | 'settings'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>(() => getLocalTransactions());
  const [initialBalances, setInitialBalances] = useState<WalletInitialBalances>(() => getWalletInitialBalances());
  const [debtItems, setDebtItems] = useState<DebtScheduleItem[]>(() => getDebtScheduleItems());
  const [debtArchives, setDebtArchives] = useState<DebtArchiveRecord[]>(() => getDebtArchives());
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => getPrivacyMode());
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Auto-Sync Status State
  const [syncState, setSyncState] = useState<AutoSyncState>({
    status: 'idle',
    message: 'Google Sheets Auto-Sync Ready',
  });

  // Selected Month & Year for Header and Dashboard (defaulting to the latest transaction's period or current month)
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const local = getLocalTransactions();
    if (local.length > 0) {
      const parts = local[0].date.split('-');
      if (parts.length >= 1) {
        const y = parseInt(parts[0], 10);
        if (!isNaN(y)) return y;
      }
    }
    return new Date().getFullYear();
  });

  const [selectedMonth, setSelectedMonth] = useState<number | null>(() => {
    const local = getLocalTransactions();
    if (local.length > 0) {
      const parts = local[0].date.split('-');
      if (parts.length >= 2) {
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(m) && m >= 0 && m <= 11) return m;
      }
    }
    return new Date().getMonth();
  });

  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Background Auto-Sync to Google Sheets
  const performAutoSync = useCallback(async (currentTxs: Transaction[]) => {
    setSyncState({
      status: 'syncing',
      message: 'Syncing changes to Google Sheets...',
    });

    try {
      let synced = false;
      const token = getCachedAccessToken();
      const sheetId = getSavedSpreadsheetId();

      // Strategy 1: Direct Google Sheets API (if authenticated with Google OAuth)
      if (token && sheetId) {
        try {
          await syncTransactionsToGoogleSheets(sheetId, currentTxs, token);
          synced = true;
        } catch (apiErr) {
          console.warn('Direct Google Sheets API auto-sync failed, trying GAS proxy:', apiErr);
        }
      }

      // Strategy 2: Google Apps Script Backend Proxy (syncs without client OAuth)
      if (!synced) {
        const gasResult = await syncAllTransactionsToGas(currentTxs);
        if (gasResult.success) {
          synced = true;
        }
      }

      const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      if (synced) {
        setSyncState({
          status: 'synced',
          lastSynced: nowStr,
          message: `Auto-sync successful at ${nowStr}`,
        });
      } else {
        setSyncState({
          status: 'idle',
          lastSynced: nowStr,
          message: 'Saved locally & ready to cloud sync',
        });
      }
    } catch (err: any) {
      console.error('Auto-sync error:', err);
      setSyncState({
        status: 'error',
        message: 'Cloud sync delayed',
      });
    }
  }, []);

  // Queue a debounced auto-sync whenever transactions change
  const queueAutoSync = useCallback((newTxs: Transaction[]) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    setSyncState({
      status: 'syncing',
      message: 'Preparing automatic sync...',
    });
    syncTimeoutRef.current = setTimeout(() => {
      performAutoSync(newTxs);
    }, 800);
  }, [performAutoSync]);

  // Cloud Data Recovery on initial load (if browser storage was cleared or accessed from a new device)
  useEffect(() => {
    const local = getLocalTransactions();
    if (local.length === 0) {
      (async () => {
        setSyncState({
          status: 'syncing',
          message: 'Checking data in Google Sheets...',
        });

        try {
          // Attempt recovery from GAS proxy
          const gasRes = await fetchTransactionsFromGas();
          if (gasRes.success && gasRes.data.length > 0) {
            setTransactions(gasRes.data);
            saveLocalTransactions(gasRes.data);
            const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            setSyncState({
              status: 'synced',
              lastSynced: now,
              message: `Restored ${gasRes.data.length} transactions from Google Sheets`,
            });
            showToast(`Restored ${gasRes.data.length} transactions from cloud`, 'success');
            return;
          }

          // Attempt recovery from direct Google Sheets API if logged in
          const token = getCachedAccessToken();
          const sheetId = getSavedSpreadsheetId();
          if (token && sheetId) {
            const direct = await fetchTransactionsFromGoogleSheets(sheetId, token);
            if (direct.length > 0) {
              setTransactions(direct);
              saveLocalTransactions(direct);
              const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              setSyncState({
                status: 'synced',
                lastSynced: now,
                message: `Restored ${direct.length} transactions from Google Sheets`,
              });
              showToast(`Restored ${direct.length} transactions from Google Sheets`, 'success');
              return;
            }
          }
        } catch (e) {
          console.warn('Initial cloud recovery check:', e);
        } finally {
          setSyncState((prev) => (prev.status === 'syncing' ? { status: 'idle', message: 'Ready' } : prev));
        }
      })();
    } else {
      // Trigger initial silent sync to ensure sheet matches
      queueAutoSync(local);
    }
  }, [queueAutoSync]);

  const handleTogglePrivacy = () => {
    const next = !privacyMode;
    setPrivacyMode(next);
    savePrivacyMode(next);
  };

  const handleUpdateDebtItems = (items: DebtScheduleItem[]) => {
    setDebtItems(items);
    saveDebtScheduleItems(items);
    showToast('Debt schedule updated');
  };

  const handleUpdateDebtArchives = (archives: DebtArchiveRecord[]) => {
    setDebtArchives(archives);
    saveDebtArchives(archives);
    showToast('Transfer proof archive updated');
  };

  const handleSaveTransaction = async (tx: Transaction) => {
    let updatedList: Transaction[];
    const isEdit = !!editingTransaction;

    if (isEdit) {
      updatedList = transactions.map((item) => (item.id === tx.id ? tx : item));
    } else {
      updatedList = [...transactions, tx];
    }

    setTransactions(updatedList);
    saveLocalTransactions(updatedList);
    setEditingTransaction(null);

    // Auto-sync instantly in background to Google Sheets
    queueAutoSync(updatedList);

    // If saving directly from Calendar view (e.g. inline quick add), DO NOT auto switch to dashboard!
    if (activeTab === 'calendar') {
      // Stay on calendar
    } else if (activeTab === 'add') {
      setActiveTab(returnTabAfterAdd || 'dashboard');
    }

    showToast(isEdit ? 'Transaction updated' : 'Transaction added');
  };

  const handleBatchSaveTransactions = async (newTxs: Transaction[]) => {
    if (!newTxs || newTxs.length === 0) return;

    const updatedList = [...transactions, ...newTxs];
    setTransactions(updatedList);
    saveLocalTransactions(updatedList);
    setEditingTransaction(null);

    // Auto-sync batch to Google Sheets
    queueAutoSync(updatedList);

    if (activeTab === 'add') {
      setActiveTab(returnTabAfterAdd || 'dashboard');
    }

    showToast(`${newTxs.length} transactions imported successfully`);
  };

  const handleDeleteTransaction = async (id: string | number) => {
    const updatedList = transactions.filter((t) => String(t.id) !== String(id));
    setTransactions(updatedList);
    saveLocalTransactions(updatedList);
    setEditingTransaction(null);

    // Auto-sync deletion to Google Sheets
    queueAutoSync(updatedList);

    // Retain current tab so deleting inside Calendar or Analytics does not throw user to dashboard
    showToast('Transaction deleted');
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    if (activeTab !== 'add') {
      setReturnTabAfterAdd(activeTab);
    }
    setActiveTab('add');
  };

  const handleSelectDateToCreate = (dateStr: string) => {
    setEditingTransaction({
      id: Date.now().toString(),
      date: dateStr,
      amount: 0,
      category: 'Food',
      type: 'expense',
      wallet: 'Cash',
      note: '',
    });
    setReturnTabAfterAdd('calendar');
    setActiveTab('add');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-neutral-100 relative font-sans">
      {/* Subtle Red & Dark Charcoal Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-red-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neutral-800/25 blur-[160px] rounded-full" />
        <div className="absolute top-[35%] right-[15%] w-[35%] h-[35%] bg-red-950/20 blur-[150px] rounded-full" />
      </div>

      {/* Top Header with Live Auto-Sync Status & Mobile Expenses/Income/Balance Summary */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'add') {
            setEditingTransaction(null);
          }
          setActiveTab(tab);
        }}
        privacyMode={privacyMode}
        onTogglePrivacy={handleTogglePrivacy}
        syncState={syncState}
        onOpenSheetsSync={() => setIsSheetsModalOpen(true)}
        transactions={transactions}
        initialBalances={initialBalances}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
        searchQuery={headerSearchQuery}
        onSearchChange={setHeaderSearchQuery}
        isMobileSearchOpen={isMobileSearchOpen}
        onToggleMobileSearch={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
      />

      {/* Main View Area with generous bottom clearance for Mobile Bottom Nav */}
      <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-8 max-w-7xl mx-auto w-full relative z-10 pb-24 sm:pb-28 md:pb-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            transactions={transactions}
            onEdit={handleStartEdit}
            onDelete={handleDeleteTransaction}
            privacyMode={privacyMode}
            onTogglePrivacy={handleTogglePrivacy}
            initialBalances={initialBalances}
            onOpenSheetsSync={() => setIsSheetsModalOpen(true)}
            syncState={syncState}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            selectedYear={selectedYear}
            onSelectYear={setSelectedYear}
            searchQuery={headerSearchQuery}
            onSearchChange={setHeaderSearchQuery}
            onNewTransaction={() => {
              setEditingTransaction(null);
              setReturnTabAfterAdd('dashboard');
              setActiveTab('add');
            }}
          />
        )}

        {activeTab === 'debt' && (
          <DebtPlanView
            debtItems={debtItems}
            archives={debtArchives}
            onUpdateDebtItems={handleUpdateDebtItems}
            onUpdateArchives={handleUpdateDebtArchives}
            privacyMode={privacyMode}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            transactions={transactions}
            privacyMode={privacyMode}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            transactions={transactions}
            onSelectDateToCreate={handleSelectDateToCreate}
            onSaveTransaction={handleSaveTransaction}
            onEdit={handleStartEdit}
            onDelete={handleDeleteTransaction}
            privacyMode={privacyMode}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            initialBalances={initialBalances}
            onSaveBalances={(updated) => {
              setInitialBalances(updated);
              saveWalletInitialBalances(updated);
              showToast('Account balances saved successfully');
            }}
            transactions={transactions}
            onClearTransactions={() => {
              setTransactions([]);
              showToast('All local transactions cleared');
            }}
            privacyMode={privacyMode}
            syncState={syncState}
            onOpenSheetsSync={() => setIsSheetsModalOpen(true)}
            onTriggerSync={() => queueAutoSync(transactions)}
          />
        )}

        {activeTab === 'add' && (
          <TransactionForm
            initialTransaction={editingTransaction}
            onSave={handleSaveTransaction}
            onBatchSave={handleBatchSaveTransactions}
            onDelete={editingTransaction ? handleDeleteTransaction : undefined}
            onCancel={() => {
              setEditingTransaction(null);
              setActiveTab(returnTabAfterAdd || 'dashboard');
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Dedicated touch dock on mobile) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'add') {
            setEditingTransaction(null);
          }
          setActiveTab(tab);
        }}
        onNewTransaction={() => {
          setEditingTransaction(null);
          setReturnTabAfterAdd(activeTab !== 'add' ? activeTab : 'dashboard');
          setActiveTab('add');
        }}
      />

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        transactions={transactions}
        onSyncSuccess={(msg) => showToast(msg, 'success')}
        onImportFromRemote={(imported) => {
          setTransactions(imported);
          saveLocalTransactions(imported);
          queueAutoSync(imported);
          showToast(`Successfully restored ${imported.length} transactions from Google Sheets`, 'success');
        }}
      />

      {/* Toast Notification (Floated above mobile bottom nav bar) */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-2xl border shadow-2xl text-xs font-bold flex items-center gap-2 backdrop-blur-xl ${
            toastMessage.type === 'error'
              ? 'bg-neutral-900 border-red-500 text-red-400'
              : toastMessage.type === 'info'
              ? 'bg-neutral-900 border-neutral-700 text-neutral-200'
              : 'bg-neutral-900 border-neutral-700 text-white'
          }`}>
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
