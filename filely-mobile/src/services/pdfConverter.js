/**
 * Mini PDF converters.
 *   - convertPdfToWord(asset)  → emits .rtf (opens in Word/Pages)
 *   - convertPdfToExcel(asset) → emits .csv (opens in Excel/Numbers)
 *
 * Extraction: LLM vision reads the PDF; for tables we request JSON rows.
 * Output formats:
 *   - RTF: plain-text Unicode-safe RTF, no binary deps
 *   - CSV: RFC-4180 quoted — Excel parses directly
 *
 * .docx/.xlsx would need JSZip + schema XML. RTF/CSV open cleanly
 * in the same apps without the dep weight.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { send as llmSend } from './llmProvider';

const TEXT_PROMPT = `Extract all text from this PDF, preserving paragraph breaks.
Do NOT summarise. Do NOT add headings. Output the raw text only.`;

const TABLE_PROMPT = `Extract every data table from this PDF as JSON.
Return ONLY a JSON object: {"headers":["A","B"],"rows":[["v1","v2"]]}.
If multiple tables exist, merge them with an empty row between.
No prose, no markdown fences.`;

export async function pickPdf() {
  const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.[0]) return null;
  return r.assets[0];
}

async function pdfToBase64(uri) {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

async function askLlm(prompt, b64, maxTokens = 6000) {
  const out = await llmSend([
    { role: 'system', content: prompt },
    { role: 'user', content: [
      { type: 'text', text: 'Process this document.' },
      { type: 'document', source: { type: 'base64', mediaType: 'application/pdf', data: b64 } },
    ] },
  ], { maxTokens });
  return (out.text || '').trim();
}

/* ───── RTF helpers ───── */

function rtfEscape(s) {
  let out = '';
  for (const ch of String(s ?? '')) {
    const code = ch.codePointAt(0);
    if (ch === '\\') out += '\\\\';
    else if (ch === '{') out += '\\{';
    else if (ch === '}') out += '\\}';
    else if (ch === '\n') out += '\\par\n';
    else if (code < 128) out += ch;
    else out += `\\u${code > 32767 ? code - 65536 : code}?`;
  }
  return out;
}

function toRtf(text) {
  return `{\\rtf1\\ansi\\deff0\n{\\fonttbl{\\f0 Calibri;}}\n\\fs22\n${rtfEscape(text)}\n}`;
}

/* ───── CSV helpers ───── */

function csvCell(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv({ headers = [], rows = [] }) {
  const lines = [];
  if (headers.length) lines.push(headers.map(csvCell).join(','));
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  return lines.join('\r\n');
}

/* ───── public API ───── */

export async function convertPdfToWord(asset, { filename } = {}) {
  if (!asset?.uri) throw new Error('PDF asset required');
  const b64 = await pdfToBase64(asset.uri);
  const text = await askLlm(TEXT_PROMPT, b64, 8000);
  if (!text) throw new Error('No text extracted');
  const rtf = toRtf(text);
  const base = (asset.name || `filey-${Date.now()}`).replace(/\.pdf$/i, '');
  const fname = filename || `${base}.rtf`;
  const path = `${FileSystem.cacheDirectory}${fname}`;
  await FileSystem.writeAsStringAsync(path, rtf, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'application/rtf', dialogTitle: 'Save as Word' });
  }
  return { path, format: 'rtf' };
}

export async function convertPdfToExcel(asset, { filename } = {}) {
  if (!asset?.uri) throw new Error('PDF asset required');
  const b64 = await pdfToBase64(asset.uri);
  const raw = await askLlm(TABLE_PROMPT, b64, 8000);
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed;
  try { parsed = JSON.parse(cleaned); }
  catch { throw new Error('Could not parse tables from PDF'); }
  const csv = toCsv(parsed);
  const base = (asset.name || `filey-${Date.now()}`).replace(/\.pdf$/i, '');
  const fname = filename || `${base}.csv`;
  const path = `${FileSystem.cacheDirectory}${fname}`;
  await FileSystem.writeAsStringAsync(path, '\uFEFF' + csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Save as Excel' });
  }
  return { path, format: 'csv', rowCount: parsed?.rows?.length || 0 };
}

export { toRtf, toCsv };
