import { Transaction, DebtScheduleItem } from '../types';

export interface SyncToSheetsResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  sheetName: string;
  syncedCount: number;
  message?: string;
}

const STORAGE_KEY_SPREADSHEET_ID = 'materialism_user_spreadsheet_id';
export const TARGET_SHEET_NAME = 'materialism';

export function getSavedSpreadsheetId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_SPREADSHEET_ID) || '';
  } catch {
    return '';
  }
}

export function saveSpreadsheetId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_SPREADSHEET_ID, id.trim());
  } catch {
    // Ignore storage issues
  }
}

// Extract Spreadsheet ID from raw input (supports both plain ID or full Google Sheets URL)
export function parseSpreadsheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // Check if it's a full URL e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Format transaction rows for Google Sheets table
 * Headers:
 * [ID, Tanggal, Tipe, Kategori, Nominal (Rp), Akun/Dompet, Keterangan/Catatan]
 */
function formatTransactionRow(t: Transaction): any[] {
  return [
    String(t.id),
    t.date,
    t.type === 'income' ? 'Income' : 'Expense',
    t.category || 'Other',
    t.amount,
    t.wallet || 'Cash',
    t.note || '',
  ];
}

/**
 * Ensure sheet with title "materialism" exists in the spreadsheet.
 * If not found, create it via batchUpdate.
 */
async function ensureMaterialismSheetExists(
  spreadsheetId: string, 
  accessToken: string
): Promise<number | null> {
  const getRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!getRes.ok) {
    const errJson = await getRes.json().catch(() => ({}));
    throw new Error(
      errJson.error?.message || `Failed to fetch spreadsheet metadata (Status ${getRes.status}). Check Spreadsheet ID and edit permissions.`
    );
  }

  const meta = await getRes.json();
  const sheets: Array<{ properties: { sheetId: number; title: string } }> = meta.sheets || [];

  // Look for "materialism" case-insensitively
  const existingSheet = sheets.find(
    (s) => s.properties?.title?.trim().toLowerCase() === TARGET_SHEET_NAME.toLowerCase()
  );

  if (existingSheet) {
    return existingSheet.properties.sheetId;
  }

  // Create sheet with name "materialism"
  const addSheetRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: TARGET_SHEET_NAME,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 10,
                },
                tabColor: {
                  red: 0.86,
                  green: 0.15,
                  blue: 0.15,
                },
              },
            },
          },
        ],
      }),
    }
  );

  if (!addSheetRes.ok) {
    const err = await addSheetRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create sheet tab "materialism".');
  }

  const batchResult = await addSheetRes.json();
  return batchResult.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
}

/**
 * Sync transaction list to Google Sheets into the "materialism" sheet tab.
 * Writes a structured, styled financial table with headers and summary.
 */
export async function syncTransactionsToGoogleSheets(
  spreadsheetIdOrUrl: string,
  transactions: Transaction[],
  accessToken: string,
  monthlySummaryData?: Array<{ month: string; totalPayment: string; estBonus: string }>
): Promise<SyncToSheetsResult> {
  const spreadsheetId = parseSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is required. Please paste your Google Sheet URL or ID.');
  }

  // 1. Check or Create sheet "materialism"
  const sheetId = await ensureMaterialismSheetExists(spreadsheetId, accessToken);

  // 2. Prepare Data Matrix
  // We sort transactions by date ascending for clean accounting in sheets
  const sortedTransactions = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  const rows: any[][] = [];

  // Row 1: Strict column headers (essential for programmatic API, GAS, and human read)
  rows.push([
    'Transaction ID',
    'Date (YYYY-MM-DD)',
    'Type',
    'Category',
    'Amount (Rp)',
    'Account / Wallet',
    'Description / Notes',
  ]);

  sortedTransactions.forEach((tx) => {
    rows.push(formatTransactionRow(tx));
  });

  // Calculate totals
  const totalIncome = sortedTransactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = sortedTransactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  rows.push(['', '', '', '', '', '', '']);
  rows.push(['--- FINANCIAL SUMMARY RECAP ---', '', '', '', '', '', '']);
  rows.push(['TOTAL INCOME', '', '', '', totalIncome, '', '']);
  rows.push(['TOTAL EXPENSE', '', '', '', totalExpense, '', '']);
  rows.push(['SURPLUS / NET BALANCE', '', '', '', netBalance, '', '']);
  rows.push(['AUTO-SYNC STATUS', '', '', '', `Auto-synced: ${new Date().toLocaleString('en-US')}`, '', '']);

  // Monthly summary table if provided (as requested in sample prompt)
  if (monthlySummaryData && monthlySummaryData.length > 0) {
    rows.push(['', '', '', '', '', '', '']);
    rows.push(['MONTHLY PAYMENT SUMMARY & BONUS', '', '', '', '', '', '']);
    rows.push(['Month', 'Total Payment', 'Estimated Bonus', '', '', '', '']);
    monthlySummaryData.forEach((m) => {
      rows.push([m.month, m.totalPayment, m.estBonus, '', '', '', '']);
    });
  }

  // 3. Clear existing values in sheet "materialism"
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${TARGET_SHEET_NAME}'!A1:Z5000:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  // 4. Overwrite with fresh updated records
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${TARGET_SHEET_NAME}'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `'${TARGET_SHEET_NAME}'!A1`,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to update spreadsheet cells (Status ${updateRes.status}).`);
  }

  // Save successful spreadsheet ID for future automatic sync
  saveSpreadsheetId(spreadsheetId);

  return {
    success: true,
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId ?? 0}`,
    sheetName: TARGET_SHEET_NAME,
    syncedCount: sortedTransactions.length,
    message: `Successfully exported ${sortedTransactions.length} transactions to sheet "${TARGET_SHEET_NAME}".`,
  };
}

/**
 * Fetch and parse all transactions from Google Sheet tab "materialism"
 */
export async function fetchTransactionsFromGoogleSheets(
  spreadsheetIdOrUrl: string,
  accessToken: string
): Promise<Transaction[]> {
  const spreadsheetId = parseSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId || !accessToken) return [];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${TARGET_SHEET_NAME}'!A1:G5000`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch transactions from Google Sheet (Status ${res.status})`);
  }

  const json = await res.json();
  const rows: any[][] = json.values || [];
  if (rows.length <= 1) return [];

  const results: Transaction[] = [];
  // Skip header row at index 0
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    const rawId = String(r[0]).trim();
    // Stop if reached summary block
    if (
      rawId.startsWith('---') || 
      rawId.startsWith('TOTAL') || 
      rawId.startsWith('STATUS') || 
      rawId.startsWith('RINGKASAN') ||
      rawId.startsWith('AUTO-SYNC') ||
      rawId.startsWith('MONTHLY') ||
      rawId.startsWith('SURPLUS')
    ) {
      continue;
    }

    const tDate = String(r[1] || '').trim();
    const tType = String(r[2] || '').toLowerCase().includes('income') || String(r[2] || '').toLowerCase().includes('masuk') 
      ? 'income' 
      : 'expense';
    const tCat = String(r[3] || 'Other').trim();
    const tAmount = typeof r[4] === 'number' 
      ? r[4] 
      : parseFloat(String(r[4] || 0).replace(/[^0-9.-]+/g, '')) || 0;
    const tWallet = String(r[5] || 'Cash').trim();
    const tNote = String(r[6] || '').trim();

    results.push({
      id: rawId,
      date: tDate || new Date().toISOString().split('T')[0],
      amount: tAmount,
      category: tCat,
      type: tType,
      wallet: tWallet,
      note: tNote,
    });
  }

  return results;
}

/**
 * Automatically create a new Google Spreadsheet in the user's Google Drive
 */
export async function createGoogleSpreadsheet(
  accessToken: string,
  title: string = 'MATERIALISM - Financial Ledger'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: TARGET_SHEET_NAME,
            tabColor: { red: 0.86, green: 0.15, blue: 0.15 },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create new Google Spreadsheet.');
  }

  const data = await createRes.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  saveSpreadsheetId(spreadsheetId);
  return { spreadsheetId, spreadsheetUrl };
}

/**
 * List user spreadsheets from Google Drive for easy 1-click selection
 */
export async function listUserSpreadsheets(
  accessToken: string
): Promise<Array<{ id: string; name: string; modifiedTime?: string }>> {
  try {
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=15`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) return [];
    const json = await res.json();
    return json.files || [];
  } catch {
    return [];
  }
}

/**
 * Append a single new transaction to the Google Sheet tab "materialism"
 */
export async function appendTransactionToGoogleSheets(
  spreadsheetIdOrUrl: string,
  tx: Transaction,
  accessToken: string
): Promise<boolean> {
  const spreadsheetId = parseSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId || !accessToken) return false;

  try {
    await ensureMaterialismSheetExists(spreadsheetId, accessToken);
    const row = formatTransactionRow(tx);

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${TARGET_SHEET_NAME}'!A:G:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );

    return res.ok;
  } catch (e) {
    console.warn('Silent append to Google Sheets failed:', e);
    return false;
  }
}
