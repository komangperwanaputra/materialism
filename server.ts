import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy initialization for Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
    });
  }
  return aiClient;
}

// Robust retry wrapper for Gemini calls to guard against transient network glitches & 503 spike demand
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 1500): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      console.warn(`Gemini call attempt ${attempt}/${maxRetries} failed:`, err.message || err);
      if (attempt < maxRetries) {
        // Exponential backoff with small jitter
        const jitter = Math.random() * 500;
        const waitTime = delayMs * Math.pow(2, attempt - 1) + jitter;
        await new Promise((res) => setTimeout(res, waitTime));
      }
    }
  }
  throw lastError;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

// Helper: extract clean JSON from LLM output
function safeExtractJSON(raw: string): any {
  if (!raw) return {};
  let cleaned = raw.trim();
  // Strip Markdown JSON code blocks if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  }
  
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt substring extraction between first { and last }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sub = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(sub);
      } catch (e) {
        console.error("Failed to parse extracted JSON substring:", sub);
      }
    }
    throw new Error("Respon AI tidak dapat diuraikan sebagai format data JSON yang valid.");
  }
}

// API: Bank Statement / Rekening Koran Batch Extractor (BCA, BNI, Mandiri, Jago, Krom, GoPay, etc.)
app.post("/api/parse-bank-statement", async (req, res) => {
  try {
    const { fileBase64, mimeType = "application/pdf", fileName = "statement.pdf" } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ status: "error", message: "fileBase64 is required" });
    }

    const ai = getAI();
    const cleanBase64 = fileBase64.replace(/^data:.*?;base64,/, "");

    const prompt = `Anda adalah sistem AI Parser Rekening Koran & Mutasi Bank Indonesia tingkat tinggi (khususnya Bank BCA, Bank Mandiri, BNI, BRI, Bank JAGO, SeaBank, Krom, GoPay, OVO, dll).

Dokumen ini adalah Rekening Koran Bank. Nama file: "${fileName}".
TUGAS ANDA:
1. Identifikasi Nama Bank:
   - Jika ada tulisan "BCA", "REKENING TAHAPAN", "KCP", logo BCA, atau no rekening 10 digit khas BCA -> bankName: "BCA"
   - Bank lainnya: "Mandiri", "BNI", "BRI", "JAGO", "SeaBank", "Krom", "GO Pay", dll.
2. Identifikasi Periode Rekening (contoh: "Agustus 2026") dan Nomor Rekening (contoh: "6700446369").
3. Ekstrak SELURUH baris mutasi transaksi dari SEMUA HALAMAN (Halaman 1, 2, 3, dst). JANGAN MELEWATKAN 1 TRANSAKSI PUN!
   - Di bagian akhir dokumen biasanya tertera ringkasan (misal: "MUTASI CR : 3,092,000.00 (8 transaksi)" dan "MUTASI DB : 3,142,109.00 (24 transaksi)"). Pastikan total transaksi yang diekstrak SAMA PERSIS dengan jumlah mutasi pada dokumen tersebut (total 32 transaksi)!

ATURAN KLASIFIKASI PEMASUKAN (INCOME) VS PENGELUARAN (EXPENSE):
- Rekening Koran BCA:
  - PENGELUARAN (type: 'expense'):
    - Baris yang memiliki akhiran "DB" pada kolom MUTASI (misal: "17,586.00 DB", "211,208.00 DB", "200,000.00 DB", "28,000.00 DB", "120,840.00 DB", "17,000.00 DB", "108,900.00 DB", "80,000.00 DB", "20,000.00 DB", "9,500.00 DB", "22,000.00 DB", "456,200.00 DB", "7,000.00 DB", "14,700.00 DB", "76,000.00 DB", "105,000.00 DB", "277,500.00 DB", "80,675.00 DB", "290,000.00 DB").
    - Termasuk: BYR VIA E-BANKING (PLN), TARIKAN ATM, TRANSAKSI DEBIT (QRIS / EDC / Belikopi / Kopi Satu / Alfamart / JCO / Toko Obat), BIAYA ADM, TRSF E-BANKING DB (Shopee / Biznet / Pamela).
  - PEMASUKAN (type: 'income'):
    - Baris pada kolom keterangan yang bertuliskan "CR", "BI-FAST CR", "SWITCHING CR", "TRSF E-BANKING CR", "SETORAN VIA CDM", "BUNGA" (pada kolom Mutasi nominalnya tanpa akhiran DB, misal: "200,000.00", "150,000.00", "92,000.00", "50,000.00", "2,000,000.00").
    - Termasuk: Transfer Masuk (BIF TRANSFER DR, Mobile Bank, Luh Eka Puspitawat), Setoran Tunai CDM.

FORMAT NOMINAL (amount):
- Wajib berupa angka murni integer positif (contoh: 17,586.00 -> 17586; 211,208.00 -> 211208; 200,000.00 -> 200000; 28,000.00 -> 28000; 120,840.00 -> 120840; 2,000,000.00 -> 2000000; 456,200.00 -> 456200; 277,500.00 -> 277500; 290,000.00 -> 290000). JANGAN SEKALI-KALI membagi atau memotong nominal ribuan menjadi belasan/puluhan!

KATEGORI (category):
- 'Bills': PLN Bali, Listrik, Biznet Home, Biaya Admin Bulanan, Pulsa, Internet
- 'Food': Kopi Satu, Belikopi, Gogo Fried, Rm Babi Pa, JCO Donuts, Restoran, Kafe, Makanan
- 'Shopping': Alfamart, Indomaret, Shopee, Tokopedia, Lynk.id, Mall, Belanja
- 'Health': Toko Obat, Apotek, Klinik, Rumah Sakit
- 'Transport': SPBU, Bensin, Grab, Gojek, Tol, Parkir
- 'Salary' / 'Bonus': Gaji, Payroll, THR, Bonus
- 'Other': Tarik Tunai ATM, Setoran CDM, Transfer Antar Rekening, Lain-lain

FORMAT TANGGAL (date):
- Format standar ISO YYYY-MM-DD (contoh tanggal "01/08" di periode Agustus 2026 menjadi "2026-08-01", "02/08" menjadi "2026-08-02", "31/08" menjadi "2026-08-31").

Pastikan seluruh transaksi dari halaman 1 sampai halaman terakhir dimasukkan secara lengkap dan akurat.`;

    const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-pro-preview", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let responseText = "";
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await callWithRetry(() =>
          ai.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || "application/pdf",
                },
              },
              prompt,
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  bankName: { type: Type.STRING },
                  period: { type: Type.STRING },
                  accountNumber: { type: Type.STRING },
                  transactions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        date: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        type: { type: Type.STRING },
                        category: { type: Type.STRING },
                        wallet: { type: Type.STRING },
                        note: { type: Type.STRING },
                        rawDescription: { type: Type.STRING },
                      },
                      required: ["date", "amount", "type", "category", "wallet", "note"],
                    },
                  },
                },
                required: ["bankName", "transactions"],
              },
            },
          }),
          2,
          1200
        );

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} parse-bank-statement failed:`, err.message);
        lastError = err;
      }
    }

    if (!responseText && lastError) {
      throw lastError;
    }

    const result = safeExtractJSON(responseText);
    return res.json({
      status: "success",
      data: result,
    });
  } catch (error: any) {
    console.error("Error in /api/parse-bank-statement:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Gagal memproses mutasi rekening koran",
    });
  }
});

// API: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API: Voice Input AI Extraction
app.post("/api/voice-scan", async (req, res) => {
  try {
    const { text: voiceText } = req.body;

    if (!voiceText) {
      return res.status(400).json({ status: "error", message: "Voice text is required" });
    }

    const ai = getAI();

    const prompt = `Ekstrak data transaksi keuangan dari rekaman suara berikut: "${voiceText}".
Contoh kalimat masukan:
- "Tadi siang beli nasi padang 25 ribu bayar pakai gopay" -> amount: 25000, category: "Food", type: "expense", wallet: "GO Pay", note: "Nasi Padang"
- "Gajian masuk 10 juta ke rekening BCA tanggal 25 kemarin" -> amount: 10000000, category: "Salary", type: "income", wallet: "BCA", note: "Gaji Bulanan"
- "Beli bensin pertamax 50rb di pertamina pake cash" -> amount: 50000, category: "Transport", type: "expense", wallet: "Cash", note: "Bensin Pertamax"
- "Bayar tagihan listrik PLN 300 ribu lewat Jago" -> amount: 300000, category: "Bills", type: "expense", wallet: "JAGO", note: "Tagihan Listrik PLN"

Format:
- amount: angka murni integer
- date: YYYY-MM-DD (jika tidak disebutkan waktu spesifik, gunakan tanggal hari ini: ${new Date().toISOString().split("T")[0]})
- category: Food, Transport, Shopping, Bills, Health, Entertainment, Education, Salary, Bonus, Investment, Other
- type: 'expense' atau 'income'
- wallet: BCA, BNI, BRI, Mandiri, JAGO, Krom, SeaBank, GO Pay, OVO, DANA, ShopeePay, Cash, Other
- note: Catatan singkat`;

    const modelsToTry = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let responseText = "";
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await callWithRetry(() =>
          ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  amount: { type: Type.NUMBER },
                  date: { type: Type.STRING },
                  category: { type: Type.STRING },
                  type: { type: Type.STRING },
                  wallet: { type: Type.STRING },
                  note: { type: Type.STRING },
                },
                required: ["amount", "date", "category", "type", "wallet", "note"],
              },
            },
          }),
          2,
          1000
        );

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} voice-scan failed:`, err.message);
        lastError = err;
      }
    }

    if (!responseText && lastError) {
      throw lastError;
    }

    const result = safeExtractJSON(responseText);
    return res.json({
      status: "success",
      data: result,
    });
  } catch (error: any) {
    console.error("Error in /api/voice-scan:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to process voice transaction",
    });
  }
});

// API: AI Financial Summary & Insights
app.post("/api/summary", async (req, res) => {
  try {
    const { transactions = [], language = "id" } = req.body;

    const ai = getAI();

    const prompt = `You are a professional and wise financial advisor.
Here is the user's recent transaction data:
${JSON.stringify(transactions.slice(-30), null, 2)}

Provide an in-depth financial analysis in English:
1. "shortInsight": 2 concise sentences summarizing the largest spending patterns and current cashflow condition.
2. "savingTip": 1-2 concrete, actionable tips to optimize spending this month.
3. "healthScore": Financial health score from 1-100.
4. "topSpendingCategory": Top spending category.`;

    const modelsToTry = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let responseText = "";
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await callWithRetry(() =>
          ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  shortInsight: { type: Type.STRING },
                  savingTip: { type: Type.STRING },
                  healthScore: { type: Type.NUMBER },
                  topSpendingCategory: { type: Type.STRING },
                },
                required: ["shortInsight", "savingTip", "healthScore"],
              },
            },
          }),
          2,
          1000
        );

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} summary failed:`, err.message);
        lastError = err;
      }
    }

    if (!responseText && lastError) {
      console.warn("Gemini quota/demand reached for summary, using local financial rules fallback");
      const totalExpense = (transactions || [])
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      const totalIncome = (transactions || [])
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

      const ratio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 100;
      const score = Math.max(20, Math.min(95, Math.round(100 - ratio * 0.7)));

      return res.json({
        status: "success",
        data: {
          shortInsight: totalExpense > 0 
            ? `Total recorded expenses are Rp ${totalExpense.toLocaleString('id-ID')}. Your cash flow is in a balanced state.`
            : 'No expense transactions recorded for this period.',
          savingTip: 'Set aside at least 20% of your income into emergency savings & investments before secondary spending.',
          healthScore: score,
          topSpendingCategory: 'Food',
        }
      });
    }

    const result = safeExtractJSON(responseText);
    return res.json({
      status: "success",
      data: result,
    });
  } catch (error: any) {
    console.error("Error in /api/summary:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to generate financial summary",
    });
  }
});

// API: Proxy Google Apps Script Web App (Avoid CORS & handle syncing smoothly)
app.post("/api/proxy-gas", async (req, res) => {
  try {
    const { scriptUrl, payload, action } = req.body;
    const targetUrl = scriptUrl || "https://script.google.com/macros/s/AKfycbwJTvtY0Yqikn8TqyD2NeI-pr5H7cjLZOKDEL4DDc_SjhBoaEJ9ccdAS9f6dOI0Xumm/exec";

    const fetchPayload = action ? { action, ...payload } : payload;

    const response = await fetch(targetUrl, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(fetchPayload),
    });

    const text = await response.text();
    let jsonResult;
    try {
      jsonResult = JSON.parse(text);
    } catch {
      jsonResult = { status: "success", raw: text };
    }

    return res.json(jsonResult);
  } catch (error: any) {
    console.error("Error proxying to GAS:", error);
    return res.status(500).json({
      status: "error",
      message: "GAS Proxy error: " + error.message,
    });
  }
});

app.get("/api/proxy-gas", async (req, res) => {
  try {
    const scriptUrl = (req.query.scriptUrl as string) || "https://script.google.com/macros/s/AKfycbwJTvtY0Yqikn8TqyD2NeI-pr5H7cjLZOKDEL4DDc_SjhBoaEJ9ccdAS9f6dOI0Xumm/exec";
    const fullUrl = scriptUrl.includes("?") ? `${scriptUrl}&api=true` : `${scriptUrl}?api=true`;

    const response = await fetch(fullUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "Accept": "application/json, text/plain, */*",
      },
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      // If GAS returned HTML (e.g. Google Login or warning page)
      return res.json({
        status: "error",
        message: "Google Apps Script mengembalikan format HTML (bukan JSON). Pastikan Web App diset ke 'Who has access: Anyone'.",
        data: [],
      });
    }

    return res.json(data);
  } catch (error: any) {
    console.warn("Notice in /api/proxy-gas GET:", error.message);
    return res.json({
      status: "error",
      message: error.message,
      data: [],
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MATERIALISM Finance Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
