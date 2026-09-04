import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Check, 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  Wallet as WalletIcon, 
  Tag, 
  Trash2, 
  CheckCircle2, 
  Filter, 
  Sparkles,
  AlertCircle,
  Zap
} from 'lucide-react';
import { Transaction, Category, Wallet, TransactionType } from '../types';
import { StatementParseResult, ParsedStatementTransaction } from '../services/bankStatementParser';
import { CustomSelect } from './CustomSelect';

interface BankStatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  parseResult: StatementParseResult | null;
  onConfirmImport: (transactions: Transaction[]) => Promise<void>;
  fileName?: string;
}

const CATEGORIES: Category[] = [
  'Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Education', 'Salary', 'Bonus', 'Investment', 'Gift', 'Other'
];

const WALLETS: Wallet[] = [
  'BCA', 'BNI', 'BRI', 'Mandiri', 'JAGO', 'Krom', 'SeaBank', 'GO Pay', 'OVO', 'DANA', 'ShopeePay', 'Cash', 'Other'
];

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));
const WALLET_OPTIONS = WALLETS.map((w) => ({ value: w, label: w }));

export const BankStatementImportModal: React.FC<BankStatementImportModalProps> = ({
  isOpen,
  onClose,
  parseResult,
  onConfirmImport,
  fileName,
}) => {
  if (!isOpen || !parseResult) return null;

  const [items, setItems] = useState<ParsedStatementTransaction[]>(parseResult.transactions || []);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle Selection
  const handleToggleSelect = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleToggleSelectAll = () => {
    const areAllSelected = items.every((i) => i.selected);
    setItems((prev) => prev.map((item) => ({ ...item, selected: !areAllSelected })));
  };

  // Inline Edits
  const handleUpdateItem = (id: string, field: keyof ParsedStatementTransaction, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: val };
        }
        return item;
      })
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Toggle DB / CR
  const handleToggleType = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextType: TransactionType = item.type === 'income' ? 'expense' : 'income';
          return {
            ...item,
            type: nextType,
            category: nextType === 'income' ? 'Salary' : 'Shopping',
          };
        }
        return item;
      })
    );
  };

  // Filtered List
  const filteredItems = items.filter((item) => {
    if (filterType === 'expense') return item.type === 'expense';
    if (filterType === 'income') return item.type === 'income';
    return true;
  });

  const selectedCount = items.filter((i) => i.selected).length;

  const totalSelectedIncome = items
    .filter((i) => i.selected && i.type === 'income')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalSelectedExpense = items
    .filter((i) => i.selected && i.type === 'expense')
    .reduce((sum, i) => sum + i.amount, 0);

  const netSelected = totalSelectedIncome - totalSelectedExpense;

  const handleConfirm = async () => {
    const selectedItems = items.filter((i) => i.selected && i.amount > 0);
    if (selectedItems.length === 0) {
      alert('Please select at least 1 transaction to import.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalTransactions: Transaction[] = selectedItems.map((item) => ({
        id: `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: item.date,
        amount: item.amount,
        type: item.type,
        category: item.category,
        wallet: item.wallet,
        note: item.note,
      }));

      await onConfirmImport(finalTransactions);
      onClose();
    } catch (err: any) {
      console.error('Error batch importing:', err);
      alert('Failed to import transactions: ' + (err.message || 'An error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-neutral-800 bg-neutral-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-500">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight font-heading">
                  Bank Statement Transactions
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-900 text-red-500 border border-neutral-800 uppercase">
                  {parseResult.bankName || 'BCA'}
                </span>
                {parseResult.period && (
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-900 text-neutral-300 border border-neutral-800">
                    {parseResult.period}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <FileSpreadsheet size={13} className="text-red-500" />
                <span>
                  Source: <strong>{fileName || 'e-Statement'}</strong> &bull; {items.length} transactions detected.
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors self-end md:self-auto"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 md:p-6 bg-neutral-950 border-b border-neutral-800/80">
          <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Selected
            </span>
            <span className="text-base font-bold text-white font-mono">
              {selectedCount} <span className="text-xs text-neutral-400 font-sans font-normal">/ {items.length} rows</span>
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <ArrowDownLeft size={12} className="text-white" /> Total Income (CR)
            </span>
            <span className="text-base font-bold text-white font-mono">
              + Rp {totalSelectedIncome.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <ArrowUpRight size={12} className="text-red-500" /> Total Expenses (DB)
            </span>
            <span className="text-base font-bold text-red-500 font-mono">
              - Rp {totalSelectedExpense.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Net Flow
            </span>
            <span className={`text-base font-bold font-mono ${netSelected >= 0 ? 'text-white' : 'text-red-500'}`}>
              {netSelected >= 0 ? '+' : ''} Rp {netSelected.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Filter and Table Tools Bar */}
        <div className="px-5 py-3 border-b border-neutral-800/80 bg-neutral-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'all'
                  ? 'bg-neutral-800 text-white border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterType === 'expense'
                  ? 'bg-red-950/60 text-red-400 border border-red-500/40'
                  : 'text-neutral-400 hover:text-red-300'
              }`}
            >
              <span>Expenses (DB)</span>
              <span className="text-[10px] bg-red-950 px-1.5 py-0.5 rounded-full text-red-400">
                {items.filter((i) => i.type === 'expense').length}
              </span>
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterType === 'income'
                  ? 'bg-neutral-800 text-white border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Income (CR)</span>
              <span className="text-[10px] bg-neutral-900 px-1.5 py-0.5 rounded-full text-white">
                {items.filter((i) => i.type === 'income').length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-xs text-neutral-300 hover:text-white font-medium flex items-center gap-1.5"
            >
              <CheckCircle2 size={15} className="text-red-500" />
              <span>{items.every((i) => i.selected) ? 'Deselect All' : 'Select All Rows'}</span>
            </button>
          </div>
        </div>

        {/* Transactions Table Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2.5">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              No transactions found for this filter.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  item.selected
                    ? 'bg-neutral-900/80 border-neutral-700/80 shadow-sm'
                    : 'bg-neutral-950/40 border-neutral-900 opacity-60'
                }`}
              >
                {/* Left: Checkbox + Date + Type Badge */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={!!item.selected}
                    onChange={() => handleToggleSelect(item.id)}
                    className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                  />

                  {/* Type Badge (Toggleable on click) */}
                  <button
                    type="button"
                    onClick={() => handleToggleType(item.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all flex items-center gap-1 ${
                      item.type === 'income'
                        ? 'bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700'
                        : 'bg-red-950/60 text-red-400 border-red-500/40 hover:bg-red-900/60'
                    }`}
                    title="Click to toggle (CR / DB)"
                  >
                    {item.type === 'income' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                    <span>{item.type === 'income' ? 'CR (In)' : 'DB (Out)'}</span>
                  </button>

                  {/* Date Picker Input */}
                  <input
                    type="date"
                    value={item.date}
                    onChange={(e) => handleUpdateItem(item.id, 'date', e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:border-red-600 font-mono"
                  />
                </div>

                {/* Middle: Note & Category & Wallet */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <input
                      type="text"
                      value={item.note}
                      onChange={(e) => handleUpdateItem(item.id, 'note', e.target.value)}
                      placeholder="Transaction note..."
                      className="w-full bg-neutral-950 border border-neutral-800 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-red-600"
                    />
                  </div>

                  <div>
                    <CustomSelect
                      value={item.category}
                      onChange={(val) => handleUpdateItem(item.id, 'category', val as Category)}
                      options={CATEGORY_OPTIONS}
                      placeholder="Category"
                    />
                  </div>

                  <div>
                    <CustomSelect
                      value={item.wallet}
                      onChange={(val) => handleUpdateItem(item.id, 'wallet', val as Wallet)}
                      options={WALLET_OPTIONS}
                      placeholder="Account"
                    />
                  </div>
                </div>

                {/* Right: Amount & Delete */}
                <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-400">Rp</span>
                    <input
                      type="text"
                      value={item.amount ? item.amount.toLocaleString('id-ID') : '0'}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        handleUpdateItem(item.id, 'amount', parseInt(raw || '0', 10));
                      }}
                      className={`w-32 bg-neutral-950 border border-neutral-800 text-xs font-bold rounded-xl px-2.5 py-1.5 text-right font-mono focus:outline-none focus:border-red-600 ${
                        item.type === 'income' ? 'text-white' : 'text-red-500'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-neutral-500 hover:text-red-500 rounded-lg hover:bg-neutral-800 transition-colors"
                    title="Delete row"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-6 border-t border-neutral-800 bg-neutral-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-neutral-400 text-center sm:text-left">
            Ready to import <strong>{selectedCount} transactions</strong>.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl border border-neutral-800 hover:bg-neutral-800 text-neutral-300 font-bold text-xs uppercase tracking-wider transition-all"
            >
              Cancel
            </button>

            <button
              id="btn-confirm-statement-import"
              type="button"
              disabled={selectedCount === 0 || isSubmitting}
              onClick={handleConfirm}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Check size={16} />
              <span>{isSubmitting ? 'Importing...' : `Import ${selectedCount} Transactions`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
