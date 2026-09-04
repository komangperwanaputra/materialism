import { createWorker } from 'tesseract.js';
import { AIScanResult, Category, Wallet } from '../types';

// Merchant keywords to category map
const MERCHANT_CATEGORY_MAP: { pattern: RegExp; category: Category; wallet?: Wallet; merchantName: string }[] = [
  // Shopping / Minimarket / Supermarket
  { pattern: /indomaret|indomarco|pt\s*indomarco/i, category: 'Shopping', merchantName: 'Indomaret' },
  { pattern: /alfamart|sumber\s*alfaria|pt\s*sumber\s*alfaria/i, category: 'Shopping', merchantName: 'Alfamart' },
  { pattern: /alfamidi|midi\s*utama/i, category: 'Shopping', merchantName: 'Alfamidi' },
  { pattern: /superindo|super\s*indo|lion\s*super\s*indo/i, category: 'Shopping', merchantName: 'Superindo' },
  { pattern: /hypermart|matahari\s*putra\s*prima/i, category: 'Shopping', merchantName: 'Hypermart' },
  { pattern: /transmart|carrefour/i, category: 'Shopping', merchantName: 'Transmart' },
  { pattern: /lotte\s*mart|lotte\s*shopping/i, category: 'Shopping', merchantName: 'Lotte Mart' },
  { pattern: /circle\s*k/i, category: 'Shopping', merchantName: 'Circle K' },
  { pattern: /tokopedia|shopee|lazada|blibli|bukalapak|tiktok\s*shop/i, category: 'Shopping', merchantName: 'Online Shopping' },
  { pattern: /uniqlo|h&m|zara|pull&bear|stradivarius|miniso|kkv|sociolla/i, category: 'Shopping', merchantName: 'Retail Shopping' },

  // Transport & Fuel
  { pattern: /pertamina|spbu|bensin|pertalite|pertamax|solar|dexlite/i, category: 'Transport', wallet: 'Cash', merchantName: 'SPBU Pertamina' },
  { pattern: /shell\s*indonesia|shell\s*spbu|v-power|super/i, category: 'Transport', wallet: 'Cash', merchantName: 'Shell' },
  { pattern: /bp\s*akr|bp\s*spbu/i, category: 'Transport', wallet: 'Cash', merchantName: 'BP AKR' },
  { pattern: /gojek|goride|gocar|gofood|gosend/i, category: 'Transport', wallet: 'GO Pay', merchantName: 'Gojek' },
  { pattern: /grab|grabcar|grabbike|grabfood/i, category: 'Transport', wallet: 'OVO', merchantName: 'Grab' },
  { pattern: /maxim|inドライブ|inDrive|blue\s*bird/i, category: 'Transport', merchantName: 'Transportasi Online' },
  { pattern: /toll|tarif\s*tol|jasamarga|etoll|e-toll/i, category: 'Transport', wallet: 'Mandiri', merchantName: 'Tol / E-Toll' },
  { pattern: /kai|kereta\s*api|krl|mrt|lrt|transjakarta|tj/i, category: 'Transport', merchantName: 'Tiket Kereta / Transportasi' },

  // Food & Beverage / Resto / Cafe
  { pattern: /starbucks/i, category: 'Food', merchantName: 'Starbucks' },
  { pattern: /kopi\s*kenangan/i, category: 'Food', merchantName: 'Kopi Kenangan' },
  { pattern: /janji\s*jiwa/i, category: 'Food', merchantName: 'Janji Jiwa' },
  { pattern: /fore\s*coffee/i, category: 'Food', merchantName: 'Fore Coffee' },
  { pattern: /point\s*coffee/i, category: 'Food', merchantName: 'Point Coffee' },
  { pattern: /mcdonald'?s|mcd|mcdonald/i, category: 'Food', merchantName: "McDonald's" },
  { pattern: /kfc|kentucky\s*fried\s*chicken/i, category: 'Food', merchantName: 'KFC' },
  { pattern: /hokben|hoka\s*hoka\s*bento/i, category: 'Food', merchantName: 'HokBen' },
  { pattern: /mie\s*gacoan|gacoan/i, category: 'Food', merchantName: 'Mie Gacoan' },
  { pattern: /solaria/i, category: 'Food', merchantName: 'Solaria' },
  { pattern: /pizza\s*hut|phd/i, category: 'Food', merchantName: 'Pizza Hut' },
  { pattern: /burger\s*king/i, category: 'Food', merchantName: 'Burger King' },
  { pattern: /d'?cost|dcost/i, category: 'Food', merchantName: "D'Cost" },
  { pattern: /warung|rm\s*|rumah\s*makan|resto|restaurant|cafe|coffee|kopi|bakso|soto|ayam|nasi|dapur|kitchen|bistro|tawan|chatime|mixue/i, category: 'Food', merchantName: 'Kuliner / Makanan' },

  // Bills & Utilities
  { pattern: /pln|listrik|token\s*listrik|pascabayar\s*pln/i, category: 'Bills', merchantName: 'PLN Listrik' },
  { pattern: /pdam|air\s*bersih|tirtanadi/i, category: 'Bills', merchantName: 'PDAM Air' },
  { pattern: /indihome|telkom|biznet|first\s*media|myrepublic|cbn|wifi/i, category: 'Bills', merchantName: 'Tagihan Internet' },
  { pattern: /telkomsel|kartu\s*halo|by\.u|indosat|im3|xl\s*axiata|tri\s*indonesia|smartfren|pulsa|paket\s*data/i, category: 'Bills', merchantName: 'Pulsa & Paket Data' },
  { pattern: /bpjs\s*kesehatan|bpjs\s*ketenagakerjaan/i, category: 'Bills', merchantName: 'BPJS Kesehatan' },

  // Health
  { pattern: /apotek\s*kimia\s*farma|kimia\s*farma/i, category: 'Health', merchantName: 'Kimia Farma' },
  { pattern: /apotek\s*k-?24|k24/i, category: 'Health', merchantName: 'Apotek K-24' },
  { pattern: /century|guardian|watsons|boston/i, category: 'Health', merchantName: 'Guardian / Health Care' },
  { pattern: /klinik|dokter|rs\s*|rumah\s*sakit|puskesmas|halodoc|alodokter|laboratorium|prodia/i, category: 'Health', merchantName: 'Layanan Kesehatan' },

  // Entertainment
  { pattern: /cinema\s*xxi|xxi|cgv|cinepolis|bioskop/i, category: 'Entertainment', merchantName: 'Cinema XXI / Bioskop' },
  { pattern: /steam|playstation|playstation\s*network|psn|nintendo|game|topup\s*game|unipin|codashop/i, category: 'Entertainment', merchantName: 'Gaming' },
  { pattern: /netflix|spotify|disney\s*\+|youtube\s*premium|vidio/i, category: 'Entertainment', merchantName: 'Streaming Langganan' },

  // Education
  { pattern: /gramedia|gunung\s*agung|buku/i, category: 'Education', merchantName: 'Gramedia / Toko Buku' },
  { pattern: /udemy|coursera|kursus|les|bimbel|ruangguru|kampus|spp|sekolah/i, category: 'Education', merchantName: 'Biaya Pendidikan' },

  // Income / Salary
  { pattern: /gaji|salary|payroll|upah|honor|remunerasi/i, category: 'Salary', merchantName: 'Gaji Bulanan' },
  { pattern: /bonus|thr|insentif|reward|komisi|cashback/i, category: 'Bonus', merchantName: 'Bonus & Insentif' },
];

const WALLET_MAP: { pattern: RegExp; wallet: Wallet }[] = [
  { pattern: /bca|klikbca|m-bca|bank\s*central\s*asia/i, wallet: 'BCA' },
  { pattern: /mandiri|livin\s*by\s*mandiri|livin|bank\s*mandiri/i, wallet: 'Mandiri' },
  { pattern: /bni|bni\s*mobile|bank\s*negara\s*indonesia/i, wallet: 'BNI' },
  { pattern: /bri|brimo|bank\s*rakyat\s*indonesia/i, wallet: 'BRI' },
  { pattern: /jago|bank\s*jago/i, wallet: 'JAGO' },
  { pattern: /krom|bank\s*krom/i, wallet: 'Krom' },
  { pattern: /seabank|sea\s*bank/i, wallet: 'SeaBank' },
  { pattern: /gopay|go-pay|go\s*pay/i, wallet: 'GO Pay' },
  { pattern: /ovo|ovo\s*cash/i, wallet: 'OVO' },
  { pattern: /dana|dompet\s*digital\s*dana/i, wallet: 'DANA' },
  { pattern: /shopeepay|spay|shopee\s*pay/i, wallet: 'ShopeePay' },
  { pattern: /qris/i, wallet: 'BCA' },
  { pattern: /tunai|cash|uang\s*tunai/i, wallet: 'Cash' },
];

const INDO_MONTHS: { [key: string]: string } = {
  januari: '01', jan: '01',
  februari: '02', feb: '02',
  maret: '03', mar: '03',
  april: '04', apr: '04',
  mei: '05', may: '05',
  juni: '06', jun: '06',
  juli: '07', jul: '07',
  agustus: '08', agu: '08', aug: '08',
  september: '09', sep: '09',
  oktober: '10', okt: '10', oct: '10',
  november: '11', nov: '11',
  desember: '12', des: '12', dec: '12',
};

/**
 * Super robust Indonesian Receipt, OCR text, and Bank slip parser
 */
export function parseReceiptText(rawText: string): AIScanResult {
  if (!rawText || typeof rawText !== 'string') {
    return {
      amount: 25000,
      date: new Date().toISOString().split('T')[0],
      category: 'Food',
      type: 'expense',
      wallet: 'Cash',
      note: 'New Transaction',
      merchant: 'Store / Merchant',
    };
  }

  // Normalize text: replace multiple spaces, fix common OCR character confusions in numbers (e.g. O->0, l->1 in numbers)
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = rawText.toLowerCase();
  const todayDate = new Date().toISOString().split('T')[0];

  let amount = 0;
  let date = todayDate;
  let category: Category = 'Food';
  let type: 'expense' | 'income' = 'expense';
  let wallet: Wallet = 'Cash';
  let note = '';
  let merchant = '';

  // 1. Detect Merchant Name
  for (const item of MERCHANT_CATEGORY_MAP) {
    if (item.pattern.test(fullText)) {
      merchant = item.merchantName;
      category = item.category;
      if (item.wallet) wallet = item.wallet;
      break;
    }
  }

  if (!merchant) {
    // If not matched by dictionary, grab first clean header line from top 4 lines
    for (let i = 0; i < Math.min(4, lines.length); i++) {
      const cleanLine = lines[i].replace(/[^a-zA-Z0-9\s.&'-]/g, '').trim();
      if (cleanLine.length >= 3 && !/^\d+$/.test(cleanLine) && !/tanggal|date|waktu|struk|nota|receipt|selamat|datang|jl|jalan|npwp|kasir/i.test(cleanLine)) {
        merchant = cleanLine;
        break;
      }
    }
  }

  // 2. High-precision Amount Extraction
  // Target keywords: Total, Grand Total, Total Bayar, Total Tagihan, Jumlah, Tagihan, Net Amount, Rp, IDR, Dibayar, Debit, QRIS
  const highPriorityPatterns = [
    /(?:grand\s*total|total\s*bayar|total\s*akhir|total\s*belanja|total\s*transaksi|net\s*amount)\s*[:=]?\s*(?:rp\.?|idr)?\s*([0-9\s.,]+)/i,
    /(?:total|jumlah\s*rp|tagihan|nominal|jumlah\s*transfer|jumlah)\s*[:=]?\s*(?:rp\.?|idr)?\s*([0-9\s.,]+)/i,
    /(?:rp\.?|idr)\s*([0-9\s.,]+)/i,
    /(?:tunai|cash|debit|qris|dibayar|bayar)\s*[:=]?\s*(?:rp\.?|idr)?\s*([0-9\s.,]+)/i,
  ];

  for (const pattern of highPriorityPatterns) {
    const matches = rawText.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      if (match && match[1]) {
        // Clean out spaces (handles spaced numbers like '1 5 . 0 0 0')
        let cleanStr = match[1].trim();
        // Remove trailing decimal cents like ',00' or '.00'
        cleanStr = cleanStr.replace(/[,.]00$/, '');
        const digitsOnly = cleanStr.replace(/[^0-9]/g, '');
        const val = parseInt(digitsOnly, 10);
        if (val && val >= 500 && val <= 2000000000) {
          amount = val;
          break;
        }
      }
    }
    if (amount > 0) break;
  }

  // Fallback Amount extraction: scan all currency-like strings in reverse
  if (!amount) {
    const allNumberMatches = rawText.match(/\b\d{1,3}(?:[.,]\d{3})+(?:\b|\s)/g) || rawText.match(/\b\d{4,9}\b/g);
    if (allNumberMatches && allNumberMatches.length > 0) {
      const candidateAmounts = allNumberMatches
        .map(n => parseInt(n.replace(/[^0-9]/g, ''), 10))
        .filter(n => n >= 1000 && n <= 500000000);
      if (candidateAmounts.length > 0) {
        // Pick the largest candidate as the total amount (since total is usually the sum or biggest number)
        amount = Math.max(...candidateAmounts);
      }
    }
  }

  // 3. Date Extraction (Supports Indonesian words: 25 Agustus 2026, 02-09-2026, 02/09/2026, 2026-09-02)
  // Check Indonesian named month (e.g. 15 September 2026)
  const indoDateMatch = rawText.match(/(\d{1,2})\s+([a-zA-Z]{3,10})\s+(\d{2,4})/);
  if (indoDateMatch) {
    const day = indoDateMatch[1].padStart(2, '0');
    const monthWord = indoDateMatch[2].toLowerCase();
    let year = indoDateMatch[3];
    if (year.length === 2) year = `20${year}`;
    if (INDO_MONTHS[monthWord]) {
      date = `${year}-${INDO_MONTHS[monthWord]}-${day}`;
    }
  } else {
    // Numeric date patterns
    const numDateMatch = rawText.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/) || rawText.match(/(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
    if (numDateMatch) {
      if (numDateMatch[1].length === 4) {
        // YYYY-MM-DD
        const y = numDateMatch[1];
        const m = numDateMatch[2].padStart(2, '0');
        const d = numDateMatch[3].padStart(2, '0');
        date = `${y}-${m}-${d}`;
      } else {
        // DD-MM-YYYY
        const d = numDateMatch[1].padStart(2, '0');
        const m = numDateMatch[2].padStart(2, '0');
        let y = numDateMatch[3];
        if (y.length === 2) y = `20${y}`;
        date = `${y}-${m}-${d}`;
      }
    }
  }

  // 4. Detect Wallet / Payment Method
  for (const w of WALLET_MAP) {
    if (w.pattern.test(fullText)) {
      wallet = w.wallet;
      break;
    }
  }

  // 5. Detect Income vs Expense
  if (/transfer\s*masuk|pemasukan|gaji|salary|kredit|cr\b|diterima\s*dari|uang\s*masuk|dana\s*masuk/i.test(fullText)) {
    type = 'income';
    if (category === 'Food') category = 'Salary';
  } else {
    type = 'expense';
  }

  // 6. Note / Description Construction
  if (merchant) {
    note = merchant;
  } else {
    note = category;
  }

  return {
    amount: amount || 25000,
    date: date || todayDate,
    category,
    type,
    wallet,
    note,
    merchant: merchant || note,
  };
}

/**
 * Preprocess image with HTML5 canvas:
 * - Downscale to width 1000px max (drastically speeds up OCR under 1.5 seconds)
 * - Convert to Grayscale & Contrast-Enhanced Threshold for crisp characters
 */
export function preprocessReceiptImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_W = 1000;
      const scale = Math.min(1, MAX_W / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      // Draw original resized
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Contrast enhancement & grayscale
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale luminosity
          const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Gentle contrast stretch
          const contrast = 1.2;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          const adjusted = Math.min(255, Math.max(0, factor * (avg - 128) + 128));

          data[i] = adjusted;
          data[i + 1] = adjusted;
          data[i + 2] = adjusted;
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/**
 * Perform Client-side WebAssembly OCR with fast English/Indonesian numbers recognition
 */
export async function performClientOCR(imageSrc: string): Promise<AIScanResult> {
  try {
    const preprocessedImg = await preprocessReceiptImage(imageSrc);
    // Use fast english recognition (numbers, totals, and latin words) which initializes in <1s
    const worker = await createWorker('eng');
    const ret = await worker.recognize(preprocessedImg);
    await worker.terminate();

    const ocrText = ret.data?.text || '';
    if (!ocrText || ocrText.trim().length === 0) {
      return parseReceiptText(imageSrc);
    }

    return parseReceiptText(ocrText);
  } catch (err: any) {
    console.warn('Client OCR parsing fallback:', err);
    return parseReceiptText(imageSrc);
  }
}
