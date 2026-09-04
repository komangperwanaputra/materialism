import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Link2,
  Table,
  UploadCloud,
  Check
} from 'lucide-react';
import { Transaction } from '../types';
import { 
  initAuth, 
  signInWithGoogle, 
  logoutGoogle, 
  getCachedAccessToken, 
  auth 
} from '../services/googleAuth';
import { 
  syncTransactionsToGoogleSheets, 
  getSavedSpreadsheetId, 
  saveSpreadsheetId, 
  parseSpreadsheetId,
  createGoogleSpreadsheet,
  listUserSpreadsheets,
  fetchTransactionsFromGoogleSheets,
  TARGET_SHEET_NAME 
} from '../services/googleSheetsService';
import { fetchTransactionsFromGas, syncAllTransactionsToGas } from '../services/storage';
import { User } from 'firebase/auth';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onSyncSuccess?: (msg: string) => void;
  onImportFromRemote?: (transactions: Transaction[]) => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onSyncSuccess,
  onImportFromRemote,
}) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [token, setToken] = useState<string | null>(getCachedAccessToken());
  const [spreadsheetInput, setSpreadsheetInput] = useState<string>(getSavedSpreadsheetId());
  const [userSheetsList, setUserSheetsList] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingSheetsList, setIsLoadingSheetsList] = useState(false);
  
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string; url?: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const savedId = getSavedSpreadsheetId();
    setSpreadsheetInput(savedId);
    setToken(getCachedAccessToken());
    setUser(auth.currentUser);

    const unsubscribe = initAuth(
      (u, tok) => {
        setUser(u);
        setToken(tok);
        if (tok) {
          loadDriveSheets(tok);
        }
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    if (getCachedAccessToken()) {
      loadDriveSheets(getCachedAccessToken()!);
    }

    return () => unsubscribe();
  }, [isOpen]);

  const loadDriveSheets = async (activeToken: string) => {
    setIsLoadingSheetsList(true);
    try {
      const list = await listUserSpreadsheets(activeToken);
      setUserSheetsList(list);
    } catch {
      // Ignore
    } finally {
      setIsLoadingSheetsList(false);
    }
  };

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setStatusMsg(null);
    try {
      const res = await signInWithGoogle();
      setUser(res.user);
      setToken(res.accessToken);
      setStatusMsg({
        type: 'success',
        text: `Connected as ${res.user.email || 'Google User'}. Ready to sync.`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to sign in with Google.',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      setToken(null);
      setStatusMsg(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSyncNow = async () => {
    const rawId = parseSpreadsheetId(spreadsheetInput);
    if (!rawId) {
      setStatusMsg({
        type: 'error',
        text: 'Please enter your Google Spreadsheet URL or Spreadsheet ID.',
      });
      return;
    }

    // If user has no active token, prompt Google sign in with popup
    let activeToken = token || getCachedAccessToken();
    if (!activeToken) {
      try {
        setIsSigningIn(true);
        const loginRes = await signInWithGoogle();
        activeToken = loginRes.accessToken;
        setUser(loginRes.user);
        setToken(activeToken);
      } catch (err: any) {
        setIsSigningIn(false);
        setStatusMsg({
          type: 'error',
          text: err.message || 'Google account authorization required to access spreadsheet.',
        });
        return;
      } finally {
        setIsSigningIn(false);
      }
    }

    setIsSyncing(true);
    setStatusMsg(null);

    try {
      // Monthly summary table corresponding to user template
      const monthlySummary = [
        { month: 'JANUARI', totalPayment: 'Rp50.000.000', estBonus: 'Rp5.000.000' },
        { month: 'FEBRUARI', totalPayment: 'Rp50.000.000', estBonus: 'Rp5.000.000' },
        { month: 'MARET', totalPayment: 'Rp50.000.000', estBonus: 'Rp5.000.000' },
        { month: 'APRIL', totalPayment: 'Rp50.000.000', estBonus: 'Rp5.000.000' },
        { month: 'MEI', totalPayment: 'Rp50.000.000', estBonus: 'Rp5.000.000' },
        { month: 'JUNI', totalPayment: 'Rp50.000.000', estBonus: 'Rp5.000.000' },
        { month: 'JULI', totalPayment: 'Rp50.000.000', estBonus: 'Rp5.000.000' },
        { month: 'AGUSTUS', totalPayment: 'Rp80.770.000', estBonus: 'Rp2.423.100' },
      ];

      const res = await syncTransactionsToGoogleSheets(
        rawId,
        transactions,
        activeToken,
        monthlySummary
      );

      saveSpreadsheetId(rawId);

      setStatusMsg({
        type: 'success',
        text: `Transaction data successfully synced to Google Sheets tab "${TARGET_SHEET_NAME}". Total ${res.syncedCount} transactions synced!`,
        url: res.spreadsheetUrl,
      });

      if (onSyncSuccess) {
        onSyncSuccess(`Successfully synced ${res.syncedCount} transactions to Google Sheets ("${TARGET_SHEET_NAME}")`);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to sync data to Google Sheets.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateNewSpreadsheet = async () => {
    let activeToken = token || getCachedAccessToken();
    if (!activeToken) {
      try {
        setIsSigningIn(true);
        const loginRes = await signInWithGoogle();
        activeToken = loginRes.accessToken;
        setUser(loginRes.user);
        setToken(activeToken);
      } catch (err: any) {
        setIsSigningIn(false);
        setStatusMsg({
          type: 'error',
          text: err.message || 'Please sign in with Google first to create an automatic spreadsheet.',
        });
        return;
      } finally {
        setIsSigningIn(false);
      }
    }

    setIsCreatingSheet(true);
    setStatusMsg(null);
    try {
      const res = await createGoogleSpreadsheet(activeToken, 'MATERIALISM - Financial Ledger');
      setSpreadsheetInput(res.spreadsheetId);

      // Perform initial sync into the newly created sheet
      await syncTransactionsToGoogleSheets(res.spreadsheetId, transactions, activeToken);

      setStatusMsg({
        type: 'success',
        text: `New Google Spreadsheet created successfully and ${transactions.length} transactions synced automatically!`,
        url: res.spreadsheetUrl,
      });

      if (onSyncSuccess) {
        onSyncSuccess('New Google Spreadsheet ready & synced');
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to create new Google Spreadsheet.',
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handlePullFromRemote = async () => {
    setIsPulling(true);
    setStatusMsg(null);
    try {
      const rawId = parseSpreadsheetId(spreadsheetInput);
      let activeToken = token || getCachedAccessToken();
      let fetched: Transaction[] = [];

      if (rawId && activeToken) {
        try {
          fetched = await fetchTransactionsFromGoogleSheets(rawId, activeToken);
        } catch (e) {
          console.warn('Google Sheets API direct pull failed, falling back to GAS proxy:', e);
        }
      }

      if (fetched.length === 0) {
        const gasRes = await fetchTransactionsFromGas();
        if (gasRes.success && gasRes.data.length > 0) {
          fetched = gasRes.data;
        }
      }

      if (fetched.length > 0) {
        if (onImportFromRemote) {
          onImportFromRemote(fetched);
        }
        setStatusMsg({
          type: 'success',
          text: `Successfully pulled ${fetched.length} transactions from Google Sheets! Local data updated.`,
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: 'No transaction data found in sheet or connection failed.',
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to load data from remote spreadsheet.',
      });
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-red-600/20 text-red-500 rounded-xl sm:rounded-2xl border border-red-500/30 flex-shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-heading uppercase tracking-wide">
                Google Sheets Auto-Sync
              </h3>
              <p className="text-xs text-neutral-400">
                Data automatically saved neatly in tab <strong className="text-white">"{TARGET_SHEET_NAME}"</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Auto-Sync Guarantee Banner */}
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0 mt-1" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-emerald-300">Auto-Sync Active</p>
            <p className="text-emerald-400/90 leading-relaxed text-[11px]">
              Whenever you add, edit, or delete a transaction, data is automatically saved to Google Sheets without requiring manual action.
            </p>
          </div>
        </div>

        {/* Google Account Authentication Status */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Google Account
            </span>
            {user ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                <Check size={12} /> Connected
              </span>
            ) : (
              <span className="text-xs text-neutral-500">Not Connected</span>
            )}
          </div>

          {user ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-xs overflow-hidden">
                <div className="font-bold text-white truncate">{user.displayName || 'Google User'}</div>
                <div className="text-neutral-400 truncate">{user.email}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg border border-neutral-800 hover:border-neutral-700"
              >
                <LogOut size={12} /> Disconnect
              </button>
            </div>
          ) : (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Spreadsheet Link / ID & Quick Creation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Google Spreadsheet Link / ID:
            </label>
            {user && (
              <button
                type="button"
                onClick={handleCreateNewSpreadsheet}
                disabled={isCreatingSheet}
                className="text-[11px] text-red-400 hover:text-red-300 font-bold underline flex items-center gap-1 disabled:opacity-50"
              >
                {isCreatingSheet ? 'Creating Sheet...' : '+ Create New Sheet Automatically'}
              </button>
            )}
          </div>
          
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500">
              <Link2 size={16} />
            </span>
            <input
              type="text"
              value={spreadsheetInput}
              onChange={(e) => {
                setSpreadsheetInput(e.target.value);
                const parsed = parseSpreadsheetId(e.target.value);
                if (parsed) saveSpreadsheetId(parsed);
              }}
              placeholder="https://docs.google.com/spreadsheets/d/your-spreadsheet-id/edit"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 font-mono transition-all"
            />
          </div>

          {/* Quick picker from Google Drive if loaded */}
          {userSheetsList.length > 0 && (
            <div className="pt-1">
              <label className="text-[11px] text-neutral-400 block mb-1">
                Or select a spreadsheet from your Google Drive:
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    setSpreadsheetInput(e.target.value);
                    saveSpreadsheetId(e.target.value);
                  }
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-red-500 font-mono"
              >
                <option value="">-- Select from Google Drive --</option>
                {userSheetsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id.substring(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="text-[11px] text-neutral-400">
            Tab <span className="text-white font-bold font-mono">"{TARGET_SHEET_NAME}"</span> will be created and updated automatically with a neat structure.
          </p>
        </div>

        {/* Notification Status */}
        {statusMsg && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
              statusMsg.type === 'success'
                ? 'bg-neutral-950 border border-neutral-700 text-neutral-200'
                : 'bg-red-950/40 border border-red-500/40 text-red-400'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 overflow-hidden">
              <p className="font-medium leading-relaxed">{statusMsg.text}</p>
              {statusMsg.url && (
                <a
                  href={statusMsg.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-red-400 hover:text-red-300 underline mt-1"
                >
                  <span>Open Google Sheets</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-neutral-800">
          <button
            type="button"
            onClick={handlePullFromRemote}
            disabled={isPulling}
            className="text-xs font-bold text-neutral-300 hover:text-white bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
            title="Pull transaction data from cloud if opening on a new browser/device"
          >
            <RefreshCw size={13} className={isPulling ? 'animate-spin' : ''} />
            <span>Pull Data from Sheet</span>
          </button>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial text-neutral-400 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all border border-neutral-800 sm:border-transparent text-center"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing || isSigningIn}
              className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl sm:rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {isSyncing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={14} />
                  <span>Sync Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

