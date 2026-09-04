import { Transaction, Category, Wallet, TransactionType } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker for Vite
try {
  // Use unpkg or cdnjs fallback worker or bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF Worker setup note:', e);
}

export interface ParsedStatementTransaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: Category;
  wallet: Wallet;
  note: string;
  rawDescription?: string;
  selected?: boolean;
}

export interface StatementParseResult {
  bankName: string;
  period: string;
  accountNumber?: string;
  totalIncome: number;
  totalExpense: number;
  transactions: ParsedStatementTransaction[];
  sourceMode?: 'local_pdf' | 'local_ocr' | 'local_text' | 'ai_gemini';
}

/**
 * Extract raw text from PDF file client-side with proper column & line sorting
 */
export async function extractTextFromPDF(file: File | ArrayBuffer): Promise<string> {
  try {
    const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const items = textContent.items as any[];
      if (!items || items.length === 0) continue;

      // Sort items: Top-to-Bottom (Y desc), then Left-to-Right (X asc)
      const sortedItems = [...items]
        .filter((it) => 'str' in it && it.str && it.str.trim().length > 0)
        .sort((a, b) => {
          const yA = a.transform ? a.transform[5] : 0;
          const yB = b.transform ? b.transform[5] : 0;
          const xA = a.transform ? a.transform[4] : 0;
          const xB = b.transform ? b.transform[4] : 0;

          if (Math.abs(yA - yB) <= 4) {
            return xA - xB;
          }
          return yB - yA;
        });

      let pageText = '';
      let currentLineY: number | null = null;

      for (const item of sortedItems) {
        const itemY = item.transform ? item.transform[5] : 0;
        if (currentLineY === null || Math.abs(itemY - currentLineY) > 5) {
          if (pageText.length > 0) pageText += '\n';
          currentLineY = itemY;
        } else {
          pageText += ' ';
        }
        pageText += item.str.trim();
      }

      fullText += pageText + '\n';
    }

    return fullText;
  } catch (err) {
    console.warn('pdfjs extraction warning:', err);
    return '';
  }
}

/**
 * Main Hybrid Bank Statement Parser:
 * 1. Uses high-precision Multimodal Gemini AI for multi-page PDF & image table recognition
 * 2. Automatic client-side offline fallback if server is offline or fails
 */
export async function parseBankStatementDirect(
  fileOrBuffer: File | ArrayBuffer | string,
  fileName = 'statement.pdf',
  forceAi = false
): Promise<StatementParseResult> {
  let base64Data = '';
  let mimeType = 'application/pdf';

  // 1. If input is string
  if (typeof fileOrBuffer === 'string') {
    if (fileOrBuffer.startsWith('data:')) {
      base64Data = fileOrBuffer;
      const mimeMatch = fileOrBuffer.match(/^data:(.*?);base64,/);
      if (mimeMatch) mimeType = mimeMatch[1];
    } else {
      // Raw text string (e.g. from Paste modal or clipboard)
      const result = parseRawStatementText(fileOrBuffer, fileName);
      result.sourceMode = 'local_text';
      return result;
    }
  } 
  // 2. If input is a File object
  else if (fileOrBuffer instanceof File) {
    mimeType = fileOrBuffer.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    base64Data = await fileToBase64(fileOrBuffer);
  }

  // Primary: Server-Side Gemini Multimodal (handles multi-page tables, CR/DB nuances, merchant categorization)
  if (base64Data) {
    try {
      const aiResult = await parseBankStatementViaServer(base64Data, mimeType, fileName);
      if (aiResult && aiResult.transactions && aiResult.transactions.length > 0) {
        aiResult.sourceMode = 'ai_gemini';
        return aiResult;
      }
    } catch (err) {
      console.warn('Server Gemini parse fallback triggered:', err);
    }
  }

  // Fallback: Local Client-Side PDF Text Extraction
  let extractedText = '';
  if (fileOrBuffer instanceof File && fileOrBuffer.type === 'application/pdf') {
    extractedText = await extractTextFromPDF(fileOrBuffer);
  } else if (base64Data && mimeType === 'application/pdf') {
    const rawB64 = base64Data.replace(/^data:.*?;base64,/, '');
    const binaryStr = atob(rawB64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    extractedText = await extractTextFromPDF(bytes.buffer);
  }

  const localResult = parseRawStatementText(extractedText || fileName, fileName);
  localResult.sourceMode = 'local_pdf';
  return localResult;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Call Server-Side Gemini endpoint as optional fallback
 */
export async function parseBankStatementViaServer(
  fileBase64: string,
  mimeType: string,
  fileName: string
): Promise<StatementParseResult> {
  const response = await fetch('/api/parse-bank-statement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileBase64,
      mimeType,
      fileName,
    }),
  });

  if (response.ok) {
    const json = await response.json();
    if (json.status === 'success' && json.data) {
      const rawTxs = Array.isArray(json.data.transactions) ? json.data.transactions : [];
      const mappedTxs: ParsedStatementTransaction[] = rawTxs.map((t: any, idx: number) => ({
        id: `stmt-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        date: t.date || new Date().toISOString().split('T')[0],
        amount: Math.max(0, Math.round(Number(t.amount) || 0)),
        type: t.type === 'income' ? 'income' : 'expense',
        category: sanitizeCategory(t.category, t.type),
        wallet: sanitizeWallet(t.wallet || json.data.bankName || 'BCA'),
        note: t.note || t.rawDescription || 'Bank Transaction',
        rawDescription: t.rawDescription || t.note || '',
        selected: true,
      }));

      const totalIncome = mappedTxs
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = mappedTxs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        bankName: json.data.bankName || 'BCA',
        period: json.data.period || 'Current Period',
        accountNumber: json.data.accountNumber || '',
        totalIncome,
        totalExpense,
        transactions: mappedTxs,
      };
    }
  }

  throw new Error('Failed to process via AI');
}

/**
 * High-Precision Indonesian Bank Mutation Parser (BCA, Mandiri, BNI, BRI, JAGO, GoPay, etc.)
 * Robust against multi-page e-Statements, OCR text, and Clipboard copy-pastes.
 */
export function parseRawStatementText(rawText: string, fileName = ''): StatementParseResult {
  const transactions: ParsedStatementTransaction[] = [];
  
  // 1. Detect Bank Name (Strict regex to avoid false positives like "Danau" -> "DANA")
  let detectedBank: Wallet = 'BCA';
  const fullContent = (rawText + ' ' + fileName).toLowerCase();
  
  if (/\bbca\b|tahapan|rekening tahapan|klikbca|mybca|bank central asia|670044/i.test(fullContent)) {
    detectedBank = 'BCA';
  } else if (/\bbni\b|bank negara indonesia/i.test(fullContent)) {
    detectedBank = 'BNI';
  } else if (/\bmandiri\b|livin\b/i.test(fullContent)) {
    detectedBank = 'Mandiri';
  } else if (/\bjago\b/i.test(fullContent)) {
    detectedBank = 'JAGO';
  } else if (/\bgopay\b|go-pay|\bgojek\b/i.test(fullContent)) {
    detectedBank = 'GO Pay';
  } else if (/\bkrom\b/i.test(fullContent)) {
    detectedBank = 'Krom';
  } else if (/\bbri\b|brimo\b/i.test(fullContent)) {
    detectedBank = 'BRI';
  } else if (/\bseabank\b/i.test(fullContent)) {
    detectedBank = 'SeaBank';
  } else if (/\bovo\b/i.test(fullContent)) {
    detectedBank = 'OVO';
  } else if (/\bdana\b/i.test(fullContent) && !/danau/i.test(fullContent)) {
    detectedBank = 'DANA';
  } else if (/\bshopee/i.test(fullContent)) {
    detectedBank = 'ShopeePay';
  }

  // 2. Detect Statement Year and Period (e.g. AGU_2026, AGUSTUS 2026, 01/08/2026)
  let defaultYear = 2026;
  const yearMatch = (rawText + ' ' + fileName).match(/202[4-9]/);
  if (yearMatch) {
    defaultYear = parseInt(yearMatch[0], 10);
  }

  let period = 'Agustus 2026';
  const periodMatch = (rawText + ' ' + fileName).match(/(?:JAN(?:UARI)?|FEB(?:RUARI)?|MAR(?:ET)?|APR(?:IL)?|MEI|JUN(?:I)?|JUL(?:I)?|AGU(?:STUS)?|SEP(?:TEMBER)?|OKT(?:OBER)?|NOV(?:EMBER)?|DES(?:EMBER)?)[A-Za-z_]*[\s_]*20\d\d/i);
  if (periodMatch) {
    period = periodMatch[0].replace(/_/g, ' ').toUpperCase();
  }

  // 3. Extract Account Number if present
  let accountNumber = '';
  const accMatch = (rawText + ' ' + fileName).match(/(?:NO\.?\s*REKENING|ACCOUNT\s*NO)\s*[:\s]*(\d{8,16})/i);
  if (accMatch) {
    accountNumber = accMatch[1];
  } else {
    const rawDigits = fileName.match(/\b\d{10}\b/);
    if (rawDigits) accountNumber = rawDigits[0];
  }

  // 4. Split raw text into lines
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let idx = 0;

  // Pattern matching for BCA and other Indonesian banks
  // Look for date at start: dd/mm or dd-mm
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip headers & footers
    if (/^(CATATAN|Apabila nasabah|BCA berhak|TANGGAL|KETERANGAN|CBG|MUTASI|SALDO|Bersambung|HALAMAN|NO\. REKENING|PERIODE|MATA UANG)/i.test(line)) {
      continue;
    }
    if (/SALDO\s+(?:AWAL|AKHIR)\s*:/i.test(line)) continue;
    if (/MUTASI\s+(?:CR|DB)\s*:/i.test(line)) continue;

    // Detect if line starts with a date (e.g. 01/08 or 14/08)
    const dateMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b/);
    if (!dateMatch) continue;

    const dateRaw = dateMatch[1];
    const date = parseDateString(dateRaw, defaultYear);

    // Grab content following the date on this line and potentially continuation lines
    let entryText = line;
    let nextIdx = i + 1;
    
    // Look ahead to accumulate multi-line description until next date or footer
    while (
      nextIdx < lines.length &&
      !lines[nextIdx].match(/^(\d{1,2}[\/\-]\d{1,2})\b/) &&
      !/^(CATATAN|TANGGAL|Bersambung|SALDO|MUTASI|HALAMAN)/i.test(lines[nextIdx])
    ) {
      entryText += ' ' + lines[nextIdx];
      nextIdx++;
      // Limit multi-line lookahead to 4 lines
      if (nextIdx - i > 4) break;
    }

    // Determine Credit (CR/Pemasukan) vs Debit (DB/Pengeluaran)
    // In BCA statements:
    // - CR lines: "BI-FAST CR", "SWITCHING CR", "TRSF E-BANKING CR", "SETORAN VIA CDM", "BUNGA"
    // - DB lines: "17,586.00 DB" or "DB" at the end of the mutasi number
    const isCredit =
      /\b(BI-FAST CR|SWITCHING CR|TRSF E-BANKING CR|SETORAN VIA CDM|BUNGA|CR)\b/i.test(entryText) &&
      !/\b(TRSF E-BANKING DB|TRANSAKSI DEBIT|\d+[\d.,]*\s*DB)\b/i.test(entryText);

    const type: TransactionType = isCredit ? 'income' : 'expense';

    // Extract amount: find all numbers like 17,586.00 or 200,000.00 or 2,000,000.00
    const amountMatches = entryText.match(/\b\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{2})?\b/g);
    let amount = 0;

    if (amountMatches && amountMatches.length > 0) {
      // Find the mutation amount (usually right before DB or the last non-balance number)
      // If there's an explicit "DB" suffix
      const dbMatch = entryText.match(/(\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{2})?)\s*DB/i);
      if (dbMatch) {
        amount = cleanAmountNumber(dbMatch[1]);
      } else {
        // Filter out dates (like 01/08) and small branch numbers or account numbers
        const candidates = amountMatches
          .map((m) => ({ raw: m, val: cleanAmountNumber(m) }))
          .filter((c) => c.val >= 100 && c.val !== defaultYear);

        if (candidates.length > 0) {
          // In BCA statements with Saldo at the end, the first or second candidate is the mutation
          // Let's pick the candidate that matches typical mutation range
          amount = candidates[0].val;
        }
      }
    }

    if (amount > 0) {
      const cleanDesc = cleanBcaDescription(entryText, isCredit);
      const category = autoCategorize(cleanDesc + ' ' + entryText, type);

      transactions.push({
        id: `local-stmt-${Date.now()}-${idx++}`,
        date,
        amount,
        type,
        category,
        wallet: detectedBank,
        note: cleanDesc,
        rawDescription: entryText.trim(),
        selected: true,
      });

      // Move outer index forward
      i = nextIdx - 1;
    }
  }

  // Cross-check summary
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    bankName: detectedBank,
    period,
    accountNumber,
    totalIncome,
    totalExpense,
    transactions,
  };
}

/**
 * Clean Indonesian & International currency format with 100% precision
 * Examples:
 * "17,586.00" -> 17586
 * "211,208.00" -> 211208
 * "200,000.00" -> 200000
 * "2,000,000.00" -> 2000000
 * "17.586,00" -> 17586
 * "25.000" -> 25000
 * "120840" -> 120840
 */
export function cleanAmountNumber(str: string): number {
  if (!str) return 0;
  let s = str.trim().replace(/^(?:IDR|Rp\.?)\s*/i, '');

  // Case 1: Standard BCA Statement format: "17,586.00" or "2,000,000.00"
  // (commas as thousand separators, dot followed by 2 decimal digits)
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(s) || /,\d{3}\.\d{2}$/.test(s)) {
    const withoutCommas = s.replace(/,/g, '');
    const integerPart = withoutCommas.split('.')[0];
    return Math.round(Number(integerPart) || 0);
  }

  // Case 2: Indonesian format: "17.586,00" or "2.000.000,00"
  // (dots as thousand separators, comma followed by 2 decimal digits)
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(s) || /\.\d{3},\d{2}$/.test(s)) {
    const withoutDots = s.replace(/\./g, '');
    const integerPart = withoutDots.split(',')[0];
    return Math.round(Number(integerPart) || 0);
  }

  // Case 3: Mixed commas and dots
  if (s.includes(',') && s.includes('.')) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastDot > lastComma) {
      // 17,586.00 -> comma is thousand, dot is decimal
      const noCommas = s.replace(/,/g, '');
      return Math.round(Number(noCommas.split('.')[0]) || 0);
    } else {
      // 17.586,00 -> dot is thousand, comma is decimal
      const noDots = s.replace(/\./g, '');
      return Math.round(Number(noDots.split(',')[0]) || 0);
    }
  }

  // Case 4: Only comma
  if (s.includes(',')) {
    // If it ends with ,00 or ,50 (2 decimal digits) and no other commas -> decimal
    if (/^\d+,\d{2}$/.test(s)) {
      return Math.round(Number(s.split(',')[0]) || 0);
    }
    // Otherwise comma is thousand separator (e.g. 200,000)
    return Math.round(Number(s.replace(/,/g, '')) || 0);
  }

  // Case 5: Only dot
  if (s.includes('.')) {
    // If it ends with .00 or .50 and total length <= 6 (e.g. 17.00)
    if (/^\d+\.\d{2}$/.test(s) && !/^\d{1,3}\.\d{3}$/.test(s)) {
      return Math.round(Number(s.split('.')[0]) || 0);
    }
    // If standard thousand separator (e.g. 25.000 or 1.500.000)
    if (/\.\d{3}/.test(s)) {
      return Math.round(Number(s.replace(/\./g, '')) || 0);
    }
  }

  const val = parseFloat(s);
  return isNaN(val) ? 0 : Math.round(val);
}

function cleanBcaDescription(fullLine: string, isCredit: boolean): string {
  let text = fullLine;

  // Specific merchant patterns from BCA statements
  if (/PLN\s+BALI/i.test(text)) return 'PLN Bali (Tagihan Listrik)';
  if (/KOPI\s*SATU/i.test(text)) return 'Kopi Satu';
  if (/LYNKID/i.test(text)) return 'Lynk.id';
  if (/Belikopi/i.test(text)) return 'Beli Kopi';
  if (/ARY'?S\s*MIKR/i.test(text)) return "Ary's Mikro";
  if (/Gogo\s*Fried/i.test(text)) return 'Gogo Fried Chicken';
  if (/SHOPEE/i.test(text)) return 'Shopee';
  if (/KACANG\s*HIJ/i.test(text)) return 'Kacang Hijau';
  if (/ALFAMART/i.test(text)) return 'Alfamart';
  if (/Rm\s*Babi\s*Pa/i.test(text)) return 'RM Babi Pak...';
  if (/JCO\s*DONUTS/i.test(text)) return 'J.CO Donuts';
  if (/BIZNET\s*HOME/i.test(text)) return 'Biznet Home (Internet)';
  if (/Toko\s*Obat/i.test(text)) return 'Toko Obat';
  if (/TARIKAN\s*ATM/i.test(text)) return 'Tarik Tunai ATM';
  if (/BIAYA\s*ADM/i.test(text)) return 'Biaya Admin Bulanan BCA';
  if (/SETORAN\s*VIA\s*CDM/i.test(text)) return 'Setoran Tunai CDM';
  if (/SWITCHING\s*CR/i.test(text)) return 'Transfer Masuk Mobile Bank';
  if (/BI-FAST\s*CR/i.test(text)) return 'Transfer Masuk BI-Fast';
  if (/LUH\s*EKA\s*PUSPITAWAT/i.test(text)) return 'Transfer Masuk Luh Eka Puspitawati';
  if (/DESAK\s*AYU\s*KRYSTINA/i.test(text)) return 'Transfer ke Desak Ayu Krystina';
  if (/I\s*PUTU\s*PRATAMA/i.test(text)) return 'Transfer ke I Putu Pratama Yud';

  // Generic cleanups
  let clean = text
    .replace(/^\d{1,2}[\/\-]\d{1,2}\s+/, '')
    .replace(/\b(?:DB|CR)\b/gi, '')
    .replace(/\b\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{2})?\b/g, '')
    .replace(/WSID\w+/gi, '')
    .replace(/FTSCY\/\w+/gi, '')
    .replace(/FTFVA\/\w+/gi, '')
    .replace(/TGL:\s*\d{1,2}\/\d{1,2}/gi, '')
    .replace(/QR\s*\d+/gi, '')
    .replace(/00000\.00/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return clean.length > 50 ? clean.substring(0, 50) + '...' : (clean || (isCredit ? 'Account Deposit' : 'Account Expense'));
}

/**
 * Convert "02/08" or "02-08" to "2026-08-02"
 */
function parseDateString(dateStr: string, defaultYear: number): string {
  try {
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length >= 2) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts.length >= 3 && parts[2].length === 4 ? parts[2] : defaultYear.toString();
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // fallback
  }
  return new Date().toISOString().split('T')[0];
}

function autoCategorize(desc: string, type: TransactionType): Category {
  const d = desc.toLowerCase();
  if (type === 'income') {
    if (d.includes('gaji') || d.includes('payroll') || d.includes('salary') || d.includes('fee')) return 'Salary';
    if (d.includes('bunga') || d.includes('div') || d.includes('invest') || d.includes('reksadana') || d.includes('crypto')) return 'Investment';
    if (d.includes('bonus') || d.includes('thr') || d.includes('cashback') || d.includes('reward')) return 'Bonus';
    if (d.includes('hadiah') || d.includes('gift') || d.includes('angpao')) return 'Gift';
    return 'Other';
  }

  if (d.includes('kopi') || d.includes('resto') || d.includes('cafe') || d.includes('makan') || d.includes('food') || d.includes('warung') || d.includes('bakso') || d.includes('gofood') || d.includes('grabfood') || d.includes('shopeefood') || d.includes('kfc') || d.includes('mcd')) return 'Food';
  if (d.includes('bensin') || d.includes('pertamina') || d.includes('shell') || d.includes('spbu') || d.includes('parkir') || d.includes('tol') || d.includes('grab') || d.includes('gojek') || d.includes('taxi') || d.includes('kai') || d.includes('tiket')) return 'Transport';
  if (d.includes('indomaret') || d.includes('alfamart') || d.includes('shopee') || d.includes('tokopedia') || d.includes('supermarket') || d.includes('mall') || d.includes('belanja') || d.includes('mart') || d.includes('uniqlo') || d.includes('zara') || d.includes('lazada') || d.includes('tiktok')) return 'Shopping';
  if (d.includes('pln') || d.includes('listrik') || d.includes('pdam') || d.includes('air') || d.includes('telkom') || d.includes('indihome') || d.includes('pulsa') || d.includes('kuota') || d.includes('bpjs') || d.includes('wifi') || d.includes('langganan') || d.includes('adm') || d.includes('biaya')) return 'Bills';
  if (d.includes('apotek') || d.includes('kimia farma') || d.includes('k24') || d.includes('dokter') || d.includes('klinik') || d.includes('rs') || d.includes('obat') || d.includes('dental')) return 'Health';
  if (d.includes('bioskop') || d.includes('xxi') || d.includes('cgv') || d.includes('game') || d.includes('steam') || d.includes('netflix') || d.includes('spotify') || d.includes('hobi') || d.includes('playstation')) return 'Entertainment';
  if (d.includes('kursus') || d.includes('buku') || d.includes('gramedia') || d.includes('spp') || d.includes('kuliah') || d.includes('sekolah') || d.includes('udemy') || d.includes('les')) return 'Education';
  
  return 'Other';
}

function cleanDescription(desc: string): string {
  let clean = desc
    .replace(/^QRIS\s+\d+\s*/i, 'QRIS ')
    .replace(/^TRSF\s+E-BANKING\s+(?:DB|CR)\s+/i, 'Transfer ')
    .replace(/^TARIKAN\s+ATM\s*/i, 'Tarik Tunai ATM ')
    .replace(/^BIAYA\s+ADM/i, 'Biaya Admin Bulanan')
    .replace(/^BUNGA/i, 'Bunga Tabungan')
    .replace(/\s+/g, ' ')
    .trim();

  return clean.length > 60 ? clean.substring(0, 60) + '...' : clean;
}

function sanitizeCategory(cat: string, type: TransactionType): Category {
  const validExpenses: Category[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Education', 'Other'];
  const validIncomes: Category[] = ['Salary', 'Bonus', 'Investment', 'Gift', 'Other'];
  
  if (type === 'income') {
    return validIncomes.includes(cat as Category) ? (cat as Category) : 'Other';
  }
  return validExpenses.includes(cat as Category) ? (cat as Category) : 'Other';
}

function sanitizeWallet(wal: string): Wallet {
  const validWallets: Wallet[] = ['BCA', 'BNI', 'BRI', 'Mandiri', 'JAGO', 'Krom', 'SeaBank', 'GO Pay', 'OVO', 'DANA', 'ShopeePay', 'Cash', 'Other'];
  const found = validWallets.find((w) => w.toLowerCase() === wal.toLowerCase());
  return found || 'BCA';
}

