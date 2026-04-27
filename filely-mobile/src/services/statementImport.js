/**
 * Bank PDF statement import.
 * User drops a PDF (Emirates NBD, ADCB, Mashreq, etc.) → we extract rows,
 * match against existing receipts by (date ± 2d, amount ± 0.02 AED),
 * report missing ones so user can scan + attach.
 *
 * Parsing: we pass PDF bytes to LLM with a structured-extraction prompt
 * since bank layouts vary wildly and regex-per-bank is brittle.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { send as llmSend } from './llmProvider';

const EXTRACT_PROMPT = `Extract every debit row from this UAE bank statement.
Return ONLY a JSON array. No prose, no markdown fences.
Each row: {"date":"YYYY-MM-DD","amount":number,"merchant":"string","ref":"string"}
Skip credits (deposits, salary, refunds). Amount = positive AED number.`;

export async function pickStatementPdf() {
  const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.[0]) return null;
  return r.assets[0];
}

async function pdfToBase64(uri) {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

/** Parse statement rows via LLM. Returns [] on failure. */
export async function extractRows(asset) {
  if (!asset?.uri) return [];
  const b64 = await pdfToBase64(asset.uri);
  try {
    const out = await llmSend([
      { role: 'system', content: EXTRACT_PROMPT },
      { role: 'user', content: [
        { type: 'text', text: 'Extract debit rows.' },
        { type: 'document', source: { type: 'base64', mediaType: 'application/pdf', data: b64 } },
      ] },
    ], { maxTokens: 4000 });
    const raw = (out.text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

/**
 * Match statement rows to existing tx. Row is "matched" if:
 *   - amount within 0.02 AED, AND
 *   - date within ±2 days
 * Returns { matched: [{row, tx}], missing: [row] }.
 */
export function reconcile(rows, transactions) {
  const matched = [];
  const missing = [];
  const used = new Set();
  for (const row of rows) {
    const rowDate = row.date ? new Date(row.date).getTime() : NaN;
    const rowAmt = Number(row.amount) || 0;
    let hit = null;
    for (const tx of transactions) {
      if (used.has(tx.id)) continue;
      const txAmt = Number(tx.amount) || 0;
      if (Math.abs(txAmt - rowAmt) > 0.02) continue;
      const txDate = tx.date ? new Date(tx.date).getTime() : NaN;
      if (isNaN(rowDate) || isNaN(txDate)) continue;
      const days = Math.abs(txDate - rowDate) / 86400000;
      if (days > 2) continue;
      hit = tx; break;
    }
    if (hit) { matched.push({ row, tx: hit }); used.add(hit.id); }
    else missing.push(row);
  }
  return { matched, missing };
}
