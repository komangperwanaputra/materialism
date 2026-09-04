import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  Mic, 
  FileText, 
  Save, 
  Trash2, 
  Loader2, 
  Sparkles, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle,
  X,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';
import { Transaction, Category, Wallet, TransactionType } from '../types';
import { scanReceiptWithAI, processVoiceWithAI, parseTextTransaction } from '../services/geminiService';
import { parseBankStatementDirect, parseRawStatementText, StatementParseResult } from '../services/bankStatementParser';
import { BankStatementImportModal } from './BankStatementImportModal';
import { CustomSelect } from './CustomSelect';
import { getCustomCategories, getCustomWallets } from '../services/storage';

interface TransactionFormProps {
  initialTransaction?: Transaction | null;
  onSave: (tx: Transaction) => Promise<void>;
  onBatchSave?: (transactions: Transaction[]) => Promise<void>;
  onDelete?: (id: string | number) => Promise<void>;
  onCancel: () => void;
}

const EXPENSE_CATEGORIES: { value: Category; label: string }[] = [
  { value: 'Food', label: 'Food & Dining' },
  { value: 'Transport', label: 'Transport & Fuel' },
  { value: 'Shopping', label: 'Shopping & Groceries' },
  { value: 'Bills', label: 'Bills & Utilities (Electricity, Water, WiFi)' },
  { value: 'Health', label: 'Health & Medical' },
  { value: 'Entertainment', label: 'Entertainment & Leisure' },
  { value: 'Education', label: 'Education & Courses' },
  { value: 'Other', label: 'Other Expenses' },
];

const INCOME_CATEGORIES: { value: Category; label: string }[] = [
  { value: 'Salary', label: 'Salary & Primary Income' },
  { value: 'Bonus', label: 'Bonus & Incentives' },
  { value: 'Investment', label: 'Investment & Dividends' },
  { value: 'Gift', label: 'Gifts & Allowance' },
  { value: 'Other', label: 'Other Income' },
];

const WALLET_OPTIONS: { value: Wallet; label: string }[] = [
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
  { value: 'Cash', label: 'Cash (Physical)' },
  { value: 'Other', label: 'Other Account' },
];

export const TransactionForm: React.FC<TransactionFormProps> = ({
  initialTransaction,
  onSave,
  onBatchSave,
  onDelete,
  onCancel,
}) => {
  const isEditing = !!initialTransaction;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [type, setType] = useState<TransactionType>(initialTransaction?.type || 'expense');
  const [amountStr, setAmountStr] = useState<string>(
    initialTransaction ? initialTransaction.amount.toLocaleString('id-ID') : ''
  );
  const [date, setDate] = useState<string>(
    initialTransaction?.date || new Date().toISOString().split('T')[0]
  );
  const [category, setCategory] = useState<string>(
    initialTransaction?.category || (initialTransaction?.type === 'income' ? 'Salary' : 'Food')
  );
  const [wallet, setWallet] = useState<string>(initialTransaction?.wallet || 'BCA');
  const [note, setNote] = useState<string>(initialTransaction?.note || '');
  const [media, setMedia] = useState<string | undefined>(initialTransaction?.media);

  // AI & Operation State
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [scanStatusTitle, setScanStatusTitle] = useState('Analyzing Document...');
  const [scanStatusDesc, setScanStatusDesc] = useState('Extracting transaction name, amount (Debit & Credit), date, and category automatically.');
  const [aiScanSuccessMsg, setAiScanSuccessMsg] = useState<string | null>(null);
  const [aiScanErrorMsg, setAiScanErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Bank Statement Modal State
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [statementParseResult, setStatementParseResult] = useState<StatementParseResult | null>(null);
  const [statementFileName, setStatementFileName] = useState('');
  
  // Quick Paste Raw Text Modal State
  const [pasteTextModalOpen, setPasteTextModalOpen] = useState(false);
  const [rawPastedText, setRawPastedText] = useState('');

  // Voice AI State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Submitting
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clipboard Paste Support for Receipts & Direct Text OCR
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // If user is currently focused on an input or textarea, let default text paste happen
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      // 1. Check for Image Paste
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processImageFile(blob, 'Image from Clipboard');
            return;
          }
        }
      }

      // 2. Check for Text Paste (e.g. copied from KlikBCA, myBCA, or SMS)
      const textData = e.clipboardData?.getData('text');
      if (textData && textData.trim().length > 5) {
        // If it looks like a bank statement table / multiple lines
        if (textData.includes('\n') && (/DB|CR|DEBET|KREDIT|\d{1,2}\/\d{1,2}/i.test(textData))) {
          const stmtResult = parseRawStatementText(textData, 'Clipboard Statement');
          if (stmtResult.transactions.length > 0) {
            setStatementParseResult(stmtResult);
            setStatementFileName('Statement Text from Clipboard');
            setStatementModalOpen(true);
            setAiScanSuccessMsg(`Successfully extracted ${stmtResult.transactions.length} mutations directly without AI!`);
            return;
          }
        }

        const extracted = parseTextTransaction(textData);
        applyExtractedData(extracted, 'Clipboard text successfully extracted');
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechRecognitionSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecordingVoice(true);
      };

      recognition.onresult = async (event: any) => {
        setIsRecordingVoice(false);
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleProcessVoiceText(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsRecordingVoice(false);
        setAiScanErrorMsg(`Voice recording failed: ${event.error || 'An error occurred'}`);
      };

      recognition.onend = () => {
        setIsRecordingVoice(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleVoiceRecording = () => {
    if (!speechRecognitionSupported || !recognitionRef.current) {
      const manualText = window.prompt("Speech recognition is not supported in this browser. Enter your transaction details (e.g., 'Lunch 50k with BCA'):");
      if (manualText) {
        handleProcessVoiceText(manualText);
      }
      return;
    }

    if (isRecordingVoice) {
      recognitionRef.current.stop();
    } else {
      setAiScanErrorMsg(null);
      setAiScanSuccessMsg(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
      }
    }
  };

  const handleProcessVoiceText = async (voiceText: string) => {
    setIsAiScanning(true);
    setAiScanErrorMsg(null);
    setAiScanSuccessMsg(null);
    try {
      const extracted = await processVoiceWithAI(voiceText);
      applyExtractedData(extracted, `Recorded: "${voiceText}"`);
    } catch (err: any) {
      setAiScanErrorMsg(err.message || 'Failed to process voice transaction');
    } finally {
      setIsAiScanning(false);
    }
  };

  // Helper to process document file (PDF / CSV / Statement) - Client-Side Direct!
  const processDocumentFile = async (file: File | Blob, fileName: string) => {
    setIsAiScanning(true);
    setScanStatusTitle('Reading & Extracting Bank Statement...');
    setScanStatusDesc('Direct text extraction (Debit & Credit, dates, amounts, and automatic categorization).');
    setAiScanErrorMsg(null);
    setAiScanSuccessMsg(null);

    try {
      // 1. First run 100% direct client-side PDF / Text extraction (NO Gemini required!)
      const stmtResult = await parseBankStatementDirect(
        file instanceof File ? file : fileName,
        fileName,
        false // local first
      );

      if (stmtResult && stmtResult.transactions && stmtResult.transactions.length > 0) {
        setStatementParseResult(stmtResult);
        setStatementFileName(fileName);
        setStatementModalOpen(true);
        
        // Also prefill first transaction into form
        const first = stmtResult.transactions[0];
        applyExtractedData(
          {
            amount: first.amount,
            date: first.date,
            type: first.type,
            category: first.category,
            wallet: first.wallet,
            note: first.note,
          },
          `Document "${fileName}" (${stmtResult.transactions.length} transactions extracted)`
        );
      } else {
        // Fallback: Read as base64 for fallback
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = reader.result as string;
          setMedia(base64Data);
          try {
            const fallbackResult = await parseBankStatementDirect(base64Data, fileName, true);
            if (fallbackResult.transactions.length > 0) {
              setStatementParseResult(fallbackResult);
              setStatementFileName(fileName);
              setStatementModalOpen(true);
            }
          } catch (e: any) {
            setAiScanErrorMsg(`Failed to process document: ${e.message}`);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.warn('Local PDF parse fallback error:', err);
      setAiScanErrorMsg(`Analysis Error: ${err.message || 'Failed to read document'}.`);
    } finally {
      setIsAiScanning(false);
    }
  };

  // Helper to process and scan image file via Instant Client OCR
  const processImageFile = (file: File | Blob, fileName = 'Image') => {
    setIsAiScanning(true);
    setScanStatusTitle('Analyzing Image...');
    setScanStatusDesc('Extracting merchant, total amount (Rp), date, and category.');
    setAiScanErrorMsg(null);
    setAiScanSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        // High quality resize up to 1200px to maintain text clarity
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        const base64Data = canvas.toDataURL('image/jpeg', 0.85);
        setMedia(base64Data);

        // Check if image filename looks like a bank mutation screenshot
        const isMutationScreenshot = /mutasi|rekening|bca|bni|mandiri|jago|statement/i.test(fileName);
        if (isMutationScreenshot) {
          try {
            const stmtResult = await parseBankStatementDirect(base64Data, fileName, true);
            if (stmtResult && stmtResult.transactions && stmtResult.transactions.length > 0) {
              setStatementParseResult(stmtResult);
              setStatementFileName(fileName);
              setStatementModalOpen(true);
              const first = stmtResult.transactions[0];
              applyExtractedData(
                {
                  amount: first.amount,
                  date: first.date,
                  type: first.type,
                  category: first.category,
                  wallet: first.wallet,
                  note: first.note,
                },
                `Statement Screenshot "${fileName}" (${stmtResult.transactions.length} rows)`
              );
              return;
            }
          } catch (e) {
            console.warn('Screenshot statement parse fallback:', e);
          }
        }

        try {
          const extracted = await scanReceiptWithAI(base64Data, 'image/jpeg');
          applyExtractedData(extracted, `"${fileName}" successfully scanned`);
        } catch (err: any) {
          setAiScanErrorMsg(`Scan Error: ${err.message}. Image remains attached.`);
        } finally {
          setIsAiScanning(false);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Process file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      processImageFile(file, file.name);
    } else {
      processDocumentFile(file, file.name);
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  // Drag and Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        processImageFile(file, file.name);
      } else {
        processDocumentFile(file, file.name);
      }
    }
  };

  const applyExtractedData = (extracted: any, successNote: string) => {
    if (extracted.amount && !isNaN(extracted.amount)) {
      setAmountStr(Math.round(extracted.amount).toLocaleString('id-ID'));
    }
    if (extracted.date) {
      setDate(extracted.date);
    }
    if (extracted.type && (extracted.type === 'income' || extracted.type === 'expense')) {
      setType(extracted.type);
    }
    if (extracted.category) {
      setCategory(extracted.category);
    }
    if (extracted.wallet) {
      const matched = WALLET_OPTIONS.find(w => w.value.toLowerCase() === String(extracted.wallet).toLowerCase());
      setWallet(matched ? matched.value : extracted.wallet);
    }
    if (extracted.note || extracted.merchant) {
      setNote(extracted.note || extracted.merchant || '');
    }
    setAiScanSuccessMsg(`${successNote} — Form auto-filled.`);
  };

  // Form Amount Input formatting
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/[^0-9]/g, '');
    if (!rawDigits) {
      setAmountStr('');
      return;
    }
    const num = parseInt(rawDigits, 10);
    setAmountStr(num.toLocaleString('id-ID'));
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawNumber = parseFloat(amountStr.replace(/[^0-9]/g, ''));
    if (isNaN(rawNumber) || rawNumber <= 0) {
      setAiScanErrorMsg('Please enter a valid transaction amount.');
      return;
    }

    setIsSaving(true);
    setAiScanErrorMsg(null);
    try {
      const tx: Transaction = {
        id: initialTransaction?.id || Date.now().toString(),
        date,
        amount: rawNumber,
        type,
        category,
        wallet,
        note: note.trim(),
        media: media || undefined,
      };

      await onSave(tx);
    } catch (err: any) {
      setAiScanErrorMsg(err.message || 'Failed to save transaction.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialTransaction || !onDelete) return;
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      setIsDeleting(true);
      try {
        await onDelete(initialTransaction.id);
      } catch (err: any) {
        setAiScanErrorMsg(err.message || 'Failed to delete transaction.');
        setIsDeleting(false);
      }
    }
  };

  const customCategories = useMemo(() => getCustomCategories(), []);
  const customWallets = useMemo(() => getCustomWallets(), []);

  const expenseCategoryOptions = useMemo(() => {
    const custom = customCategories.filter(c => c.type === 'expense');
    if (custom.length > 0) {
      return custom.map(c => ({ value: c.name, label: c.name }));
    }
    return EXPENSE_CATEGORIES;
  }, [customCategories]);

  const incomeCategoryOptions = useMemo(() => {
    const custom = customCategories.filter(c => c.type === 'income');
    if (custom.length > 0) {
      return custom.map(c => ({ value: c.name, label: c.name }));
    }
    return INCOME_CATEGORIES;
  }, [customCategories]);

  const currentCategoryOptions = type === 'expense' ? expenseCategoryOptions : incomeCategoryOptions;

  const walletOptions = useMemo(() => {
    if (customWallets.length > 0) {
      return customWallets.map(w => ({ value: w.name, label: w.name }));
    }
    return WALLET_OPTIONS;
  }, [customWallets]);

  return (
    <div className="max-w-2xl mx-auto pb-6 space-y-3 sm:space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors backdrop-blur-md"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-heading">
            {isEditing ? 'Edit Transaction' : 'New Transaction'}
          </h2>
        </div>

        {isEditing && onDelete && (
          <button
            id="btn-delete-tx"
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 rounded-2xl text-red-400 hover:bg-red-500/10 border border-red-500/30 transition-colors disabled:opacity-50 backdrop-blur-md"
            title="Delete Transaction"
          >
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
        )}
      </div>

      {/* Smart Input AI Dropzone Bar */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`backdrop-blur-xl bg-neutral-900/80 border rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-md relative overflow-hidden transition-all ${
          isDragging ? 'border-red-600 bg-red-950/20' : 'border-neutral-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2.5 sm:mb-4">
          <h3 className="text-[10px] sm:text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1 sm:gap-1.5">
            <Sparkles size={13} className="text-red-500" />
            <span>Smart Input</span>
          </h3>
          <span className="text-[9px] sm:text-xs text-neutral-300 bg-neutral-800 border border-neutral-700 px-1.5 sm:px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Auto-Extract / Paste
          </span>
        </div>

        {/* Hidden inputs */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          type="file"
          accept="application/pdf,image/*"
          ref={pdfInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* 4 Smart Input Buttons */}
        {/* Top 3 Smart Action Buttons */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* 1. Camera / Receipt Scan */}
          <button
            type="button"
            id="btn-scan-receipt"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAiScanning || isRecordingVoice}
            className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-red-600 hover:bg-neutral-950 transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 text-neutral-300 hover:text-white disabled:opacity-50 group backdrop-blur-md"
          >
            {isAiScanning ? (
              <Loader2 size={16} className="animate-spin text-red-500" />
            ) : (
              <Camera size={16} className="text-red-500 group-hover:scale-105 transition-transform" />
            )}
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-center">
              Scan Photo
            </span>
          </button>

          {/* 2. Voice AI */}
          <button
            type="button"
            id="btn-voice-ai"
            onClick={handleToggleVoiceRecording}
            disabled={isAiScanning}
            className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 disabled:opacity-50 group backdrop-blur-md ${
              isRecordingVoice
                ? 'bg-red-950/40 border-red-500 text-red-400'
                : 'bg-neutral-950/80 border-neutral-800 hover:border-red-600 text-neutral-300 hover:text-white'
            }`}
          >
            <Mic
              size={16}
              className={isRecordingVoice ? 'text-red-400' : 'text-neutral-400 group-hover:scale-105 transition-transform'}
            />
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-center">
              {isRecordingVoice ? 'Listening' : 'Voice Input'}
            </span>
          </button>

          {/* 3. Bank PDF / Mutasi Statement */}
          <button
            type="button"
            id="btn-bank-pdf"
            onClick={() => pdfInputRef.current?.click()}
            disabled={isAiScanning || isRecordingVoice}
            className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-red-600 hover:bg-neutral-950 transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 text-neutral-300 hover:text-white disabled:opacity-50 group backdrop-blur-md"
            title="Upload Bank Statement PDF"
          >
            <UploadCloud size={16} className="text-red-500 group-hover:scale-105 transition-transform" />
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-center">
              Upload PDF
            </span>
          </button>
        </div>

        {/* Scanning in Progress Feedback */}
        {isAiScanning && (
          <div className="mt-4 p-4 rounded-2xl bg-neutral-950/90 border border-red-500/40 flex items-center gap-3 text-xs text-white backdrop-blur-md animate-pulse">
            <Loader2 size={18} className="animate-spin text-red-500 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-white">{scanStatusTitle}</span>
              <span className="text-[11px] text-neutral-400">{scanStatusDesc}</span>
            </div>
          </div>
        )}

        {/* Bank Statement Detected Quick Action Banner */}
        {statementParseResult && statementParseResult.transactions.length > 0 && !isAiScanning && (
          <div className="mt-4 p-4 rounded-2xl bg-neutral-950 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet size={20} className="text-red-500 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Bank Statement {statementParseResult.bankName} Detected ({statementParseResult.transactions.length} Transactions)
                </span>
                <span className="text-[11px] text-neutral-400">
                  {statementFileName} &bull; Income (CR): Rp {statementParseResult.totalIncome.toLocaleString('id-ID')} &bull; Expense (DB): Rp {statementParseResult.totalExpense.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <button
              type="button"
              id="btn-open-statement-review"
              onClick={() => setStatementModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
            >
              <Sparkles size={14} />
              <span>Review & Batch Import ({statementParseResult.transactions.length})</span>
            </button>
          </div>
        )}

        {/* Feedback Message */}
        {aiScanSuccessMsg && !isAiScanning && (
          <div className="mt-4 p-4 rounded-2xl bg-neutral-950 border border-neutral-700 flex flex-col gap-2.5 text-xs text-white backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2 font-bold text-neutral-100">
              <CheckCircle2 size={16} className="text-white flex-shrink-0" />
              <span>{aiScanSuccessMsg}</span>
            </div>
            {amountStr && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-800 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300">
                  Total: <strong className="text-white">Rp {amountStr}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300">
                  Date: <strong className="text-white">{date}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300">
                  Category: <strong className="text-white">{category}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300">
                  Account: <strong className="text-white">{wallet}</strong>
                </span>
                {note && (
                  <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300">
                    Store/Note: <strong className="text-white">{note}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        {aiScanErrorMsg && !isAiScanning && (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-950/50 border border-red-500/50 flex items-center gap-2.5 text-xs text-red-300 backdrop-blur-md">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <span>{aiScanErrorMsg}</span>
          </div>
        )}
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="backdrop-blur-xl bg-neutral-900/80 border border-neutral-800 rounded-2xl sm:rounded-3xl p-3 sm:p-6 md:p-8 space-y-3 sm:space-y-5 shadow-2xl relative overflow-hidden">
        {/* Type Switcher */}
        <div className="flex p-1 sm:p-1.5 bg-neutral-950 border border-neutral-800 rounded-xl sm:rounded-2xl backdrop-blur-md">
          <button
            type="button"
            id="btn-type-expense"
            onClick={() => {
              setType('expense');
              setCategory('Food');
            }}
            className={`flex-1 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all active:scale-95 ${
              type === 'expense'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            id="btn-type-income"
            onClick={() => {
              setType('income');
              setCategory('Salary');
            }}
            className={`flex-1 py-2 sm:py-3 rounded-lg sm:rounded-xl font-extrabold text-[10px] sm:text-xs uppercase tracking-wider transition-all active:scale-95 ${
              type === 'income'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Income
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-[10px] sm:text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1 sm:mb-1.5 px-1">
            Amount (IDR) *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-sm sm:text-base font-bold text-neutral-400">
              Rp
            </span>
            <input
              type="text"
              id="input-amount"
              required
              placeholder="0"
              value={amountStr}
              onChange={handleAmountChange}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl sm:rounded-2xl pl-9 sm:pl-11 pr-3 py-2 sm:py-4 text-white text-lg sm:text-2xl font-black focus:outline-none focus:border-red-600 backdrop-blur-md transition-all font-heading"
            />
          </div>
        </div>

        {/* Compact Grid for Date, Category, Account */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {/* Date Picker */}
          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1 px-1">
              Date *
            </label>
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={14} />
              <input
                type="date"
                id="input-date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl sm:rounded-2xl pl-8 sm:pl-10 pr-2 sm:pr-4 py-2 sm:py-3 text-[11px] sm:text-sm text-white focus:outline-none focus:border-red-600 backdrop-blur-md font-semibold"
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1 px-1">
              Category *
            </label>
            <CustomSelect
              id="select-category"
              value={category}
              onChange={(val) => setCategory(val)}
              options={currentCategoryOptions}
              placeholder="Category"
              buttonClassName="py-2 sm:py-3 text-[11px] sm:text-sm"
            />
          </div>

          {/* Wallet Selector */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] sm:text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1 px-1">
              Account / Wallet *
            </label>
            <CustomSelect
              id="select-wallet"
              value={wallet}
              onChange={(val) => setWallet(val)}
              options={walletOptions}
              placeholder="Select Account"
              buttonClassName="py-2 sm:py-3 text-[11px] sm:text-sm"
            />
          </div>
        </div>

        {/* Note / Description */}
        <div>
          <label className="block text-[10px] sm:text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1 px-1">
            Notes (Optional)
          </label>
          <input
            type="text"
            id="input-note"
            placeholder="e.g. Lunch with team..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 backdrop-blur-md transition-all"
          />
        </div>

        {/* Attached Media Preview (if any) */}
        {media && (
          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-3 overflow-hidden">
              <img
                src={media.startsWith('data:') || media.startsWith('http') ? media : `data:image/jpeg;base64,${media}`}
                alt="Thumbnail"
                className="w-12 h-12 rounded-xl object-cover border border-neutral-700 flex-shrink-0"
              />
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-neutral-200 truncate">
                  Attached Document
                </span>
                <span className="text-xs text-neutral-400">
                  Will be saved with this transaction
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMedia(undefined)}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-neutral-900 transition-colors"
              title="Remove Attachment"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Submit Actions */}
        <div className="pt-3 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 font-bold py-3.5 rounded-2xl border border-neutral-800 transition-colors text-xs sm:text-sm uppercase tracking-wider backdrop-blur-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            id="btn-save-transaction"
            disabled={isSaving}
            className="flex-[2] bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>{isEditing ? 'Save Changes' : 'Save Transaction'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Bank Statement Batch Review & Import Modal */}
      {statementParseResult && (
        <BankStatementImportModal
          isOpen={statementModalOpen}
          onClose={() => setStatementModalOpen(false)}
          parseResult={statementParseResult}
          fileName={statementFileName}
          onConfirmImport={async (txs) => {
            if (onBatchSave) {
              await onBatchSave(txs);
            } else {
              for (const t of txs) {
                await onSave(t);
              }
            }
          }}
        />
      )}
    </div>
  );
};
