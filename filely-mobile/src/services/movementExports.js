/**
 * CSV / PDF exporters for the home-screen money ledger (in/out movements).
 * Receipts have their own exporter in exportLedger.js — keep these separate
 * so the column shape matches what the user actually sees in chat + dashboard.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { listTx, getOpeningBalance } from './localLedger';

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function fmtAmt(n) {
  const v = Math.abs(+n || 0);
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDate(t) {
  if (t.date) return t.date;
  if (t.ts) {
    const d = new Date(+t.ts);
    return d.toISOString().slice(0, 10);
  }
  return '';
}

/**
 * Pull movements + opening balance + running totals for the export.
 */
async function snapshot({ limit, direction } = {}) {
  const [list, opening] = await Promise.all([listTx({ limit, direction }), getOpeningBalance()]);
  let totalIn = 0, totalOut = 0;
  for (const t of list) {
    const a = Math.abs(+t.amount) || 0;
    if (t.direction === 'in') totalIn += a;
    else if (t.direction === 'out') totalOut += a;
  }
  return {
    rows: list,
    opening: +opening || 0,
    totalIn,
    totalOut,
    balance: (+opening || 0) + totalIn - totalOut,
  };
}

export async function exportMovementsCSV({ limit, direction } = {}) {
  const { rows, opening, totalIn, totalOut, balance } = await snapshot({ limit, direction });
  const headers = ['Date', 'Direction', 'Amount (AED)', 'Counterparty', 'Category', 'Note'];
  const body = rows.map(r => [
    fmtDate(r),
    r.direction === 'in' ? 'Credit' : 'Debit',
    fmtAmt(r.amount),
    r.counterparty || '',
    r.category || '',
    r.note || '',
  ]);
  const summary = [
    [],
    ['Opening balance', '', fmtAmt(opening)],
    ['Total credits',   '', fmtAmt(totalIn)],
    ['Total debits',    '', fmtAmt(totalOut)],
    ['Total balance',   '', fmtAmt(balance)],
  ];
  const lines = [headers, ...body, ...summary].map(r => r.map(csvEscape).join(','));
  const csv = lines.join('\n');
  const fname = `filey-movements-${new Date().toISOString().slice(0, 10)}.csv`;
  const path = `${FileSystem.cacheDirectory}${fname}`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Share movements CSV' });
  }
  return { path, count: rows.length, balance };
}

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export async function exportMovementsPDF({ limit, direction, title } = {}) {
  const { rows, opening, totalIn, totalOut, balance } = await snapshot({ limit, direction });
  const heading = title || 'Filey — Money Ledger';
  const stamp = new Date().toLocaleString();
  const tableRows = rows.map(r => `
    <tr class="${r.direction === 'in' ? 'cr' : 'dr'}">
      <td>${htmlEscape(fmtDate(r))}</td>
      <td>${r.direction === 'in' ? 'Credit' : 'Debit'}</td>
      <td class="num">${r.direction === 'in' ? '+' : '−'}${htmlEscape(fmtAmt(r.amount))}</td>
      <td>${htmlEscape(r.counterparty || '')}</td>
      <td>${htmlEscape(r.category || '')}</td>
      <td>${htmlEscape(r.note || '')}</td>
    </tr>`).join('');

  const html = `<!doctype html>
  <html><head><meta charset="utf-8" />
  <style>
    @page { margin: 24mm 16mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0B1735; font-size: 11pt; }
    h1 { font-size: 18pt; margin: 0 0 4px; letter-spacing: -0.4px; }
    .sub { color: #64748B; font-size: 10pt; margin-bottom: 18px; }
    .totals { display: flex; gap: 18px; margin: 16px 0 22px; flex-wrap: wrap; }
    .pill { background: #F3F6FC; border: 1px solid rgba(11,23,53,0.08); border-radius: 12px; padding: 10px 14px; min-width: 130px; }
    .pill .l { font-size: 9pt; color: #64748B; letter-spacing: 0.6px; text-transform: uppercase; }
    .pill .v { font-size: 14pt; font-weight: 700; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid rgba(11,23,53,0.08); font-size: 10pt; vertical-align: top; }
    th { background: #F3F6FC; color: #475569; text-transform: uppercase; letter-spacing: 0.6px; font-size: 9pt; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    tr.cr td.num { color: #16A34A; }
    tr.dr td.num { color: #DC2626; }
    .footer { margin-top: 18px; color: #94A3B8; font-size: 9pt; text-align: right; }
  </style></head>
  <body>
    <h1>${htmlEscape(heading)}</h1>
    <div class="sub">Generated ${htmlEscape(stamp)} · ${rows.length} entries</div>
    <div class="totals">
      <div class="pill"><div class="l">Opening</div><div class="v">AED ${htmlEscape(fmtAmt(opening))}</div></div>
      <div class="pill"><div class="l">Credits</div><div class="v">+AED ${htmlEscape(fmtAmt(totalIn))}</div></div>
      <div class="pill"><div class="l">Debits</div><div class="v">−AED ${htmlEscape(fmtAmt(totalOut))}</div></div>
      <div class="pill"><div class="l">Balance</div><div class="v">AED ${htmlEscape(fmtAmt(balance))}</div></div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Type</th><th class="num">Amount</th><th>Counterparty</th><th>Category</th><th>Note</th></tr></thead>
      <tbody>${tableRows || '<tr><td colspan="6" style="text-align:center;color:#64748B;padding:24px">No movements yet.</td></tr>'}</tbody>
    </table>
    <div class="footer">Filey — Total Balance = Opening + Σ credits − Σ debits</div>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  // expo-print writes to a temp path; rename to a friendlier filename for sharing.
  const fname = `filey-movements-${new Date().toISOString().slice(0, 10)}.pdf`;
  const dest = `${FileSystem.cacheDirectory}${fname}`;
  try { await FileSystem.copyAsync({ from: uri, to: dest }); } catch {}
  const finalPath = (await FileSystem.getInfoAsync(dest)).exists ? dest : uri;
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(finalPath, { mimeType: 'application/pdf', dialogTitle: 'Share movements PDF' });
  }
  return { path: finalPath, count: rows.length, balance };
}
