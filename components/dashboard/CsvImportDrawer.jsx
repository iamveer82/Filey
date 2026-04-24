'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, FileText, ArrowRight, Check, AlertCircle, Loader2,
} from 'lucide-react';
import { BRAND, BRAND_DARK, BRAND_SOFT, INK } from './theme';
import { CATEGORIES } from '@/lib/webStore';

const EASE = [0.22, 1, 0.36, 1];

const FIELDS = [
  { key: 'date',     label: 'Date',     required: true  },
  { key: 'name',     label: 'Name',     required: true  },
  { key: 'merchant', label: 'Merchant', required: false },
  { key: 'amount',   label: 'Amount',   required: true  },
  { key: 'type',     label: 'Type',     required: false, hint: 'income / expense' },
  { key: 'category', label: 'Category', required: false },
  { key: 'vat',      label: 'VAT',      required: false },
];

// RFC 4180-ish CSV parser — handles quotes, escaped quotes, CRLF
function parseCsv(text) {
  const rows = [];
  let cur = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQ) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (field.length || cur.length) { cur.push(field); rows.push(cur); cur = []; field = ''; }
        if (c === '\r' && n === '\n') i++;
      }
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

function guessMapping(headers) {
  const map = {};
  const lower = headers.map(h => (h || '').toLowerCase().trim());
  const find = (...needles) => {
    for (const n of needles) {
      const i = lower.findIndex(h => h === n || h.includes(n));
      if (i !== -1) return i;
    }
    return -1;
  };
  map.date     = find('date', 'when', 'posted');
  map.name     = find('name', 'description', 'narration', 'memo', 'detail');
  map.merchant = find('merchant', 'payee', 'counterparty', 'vendor');
  map.amount   = find('amount', 'total', 'value', 'debit', 'credit');
  map.type     = find('type', 'direction');
  map.category = find('category', 'class');
  map.vat      = find('vat', 'tax');
  return map;
}

function inferType(row, map) {
  if (map.type != null && map.type !== -1) {
    const v = (row[map.type] || '').toLowerCase().trim();
    if (/income|credit|in|revenue|receipt/.test(v)) return 'income';
    if (/expense|debit|out|bill|pay/.test(v)) return 'expense';
  }
  // Heuristic: negative amount = expense
  const amt = parseFloat((row[map.amount] || '').replace(/[^\d.-]/g, ''));
  if (!isNaN(amt) && amt < 0) return 'expense';
  return 'expense';
}

function toRow(row, map) {
  if (!row || !row.length) return null;
  const get = (k) => map[k] != null && map[k] !== -1 ? (row[map[k]] || '').trim() : '';
  const amtRaw = get('amount').replace(/[^\d.-]/g, '');
  const amt = Math.abs(parseFloat(amtRaw));
  if (!amt || isNaN(amt)) return null;
  const name = get('name') || get('merchant') || 'Imported transaction';
  if (!name) return null;
  const dateStr = get('date');
  const ts = dateStr ? new Date(dateStr).getTime() || Date.now() : Date.now();
  const cat = get('category');
  const vatRaw = parseFloat(get('vat').replace(/[^\d.-]/g, ''));
  const type = inferType(row, map);
  return {
    id: `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    ts,
    name,
    merchant: get('merchant') || '',
    amount: amt,
    vat: !isNaN(vatRaw) && vatRaw > 0 ? vatRaw : +(amt * 0.05 / 1.05).toFixed(2),
    type,
    category: CATEGORIES.includes(cat) ? cat : (type === 'income' ? 'Freelance' : 'Other'),
    status: 'Cleared',
  };
}

export default function CsvImportDrawer({ open, onClose, onImport }) {
  const [step, setStep]     = useState(1);    // 1 upload, 2 map, 3 preview, 4 done
  const [raw, setRaw]       = useState(null); // parsed rows
  const [headers, setHeaders] = useState([]);
  const [map, setMap]       = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError]   = useState(null);
  const [busy, setBusy]     = useState(false);
  const inputRef = useRef(null);

  const reset = () => {
    setStep(1); setRaw(null); setHeaders([]); setMap({}); setFileName(''); setError(null); setBusy(false);
  };

  const close = () => { reset(); onClose(); };

  const readFile = useCallback((file) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setError('Please choose a .csv file'); return;
    }
    setFileName(file.name); setError(null); setBusy(true);
    const r = new FileReader();
    r.onload = () => {
      try {
        const rows = parseCsv(String(r.result));
        if (rows.length < 2) { setError('CSV looks empty'); setBusy(false); return; }
        const h = rows[0];
        const body = rows.slice(1).filter(r => r.some(c => c && c.trim()));
        setHeaders(h);
        setRaw(body);
        setMap(guessMapping(h));
        setStep(2);
      } catch (e) { setError('Could not parse CSV: ' + String(e)); }
      finally { setBusy(false); }
    };
    r.onerror = () => { setError('Could not read file'); setBusy(false); };
    r.readAsText(file);
  }, []);

  const preview = useMemo(() => {
    if (!raw || !map) return [];
    return raw.slice(0, 5).map(r => toRow(r, map)).filter(Boolean);
  }, [raw, map]);

  const canMap = map.date !== undefined && map.date !== -1
              && map.name !== undefined && map.name !== -1
              && map.amount !== undefined && map.amount !== -1;

  const commit = () => {
    const rows = raw.map(r => toRow(r, map)).filter(Boolean);
    if (!rows.length) { setError('No valid rows — check the column mapping'); return; }
    onImport(rows);
    setStep(4);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            role="dialog"
            aria-label="Import transactions from CSV"
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
                >
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: INK }}>Import CSV</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {step === 1 && 'Drop a bank or accounting export'}
                    {step === 2 && 'Map your columns to Filey fields'}
                    {step === 3 && 'Preview before committing'}
                    {step === 4 && 'All done'}
                  </p>
                </div>
              </div>
              <button onClick={close} aria-label="Close" className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-3 dark:border-slate-800">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${step >= s ? 'text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}
                    style={step >= s ? { background: BRAND } : undefined}
                  >
                    {step > s ? <Check className="h-3 w-3" /> : s}
                  </div>
                  {s < 4 && <div className={`h-0.5 w-6 rounded-full transition ${step > s ? '' : 'bg-slate-200 dark:bg-slate-700'}`} style={step > s ? { background: BRAND } : undefined} />}
                </div>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: EASE }}>
                    <label
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files?.[0]); }}
                      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition ${dragOver ? 'border-blue-400 bg-blue-50/60 dark:bg-blue-950/20' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50'}`}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: BRAND_SOFT }}>
                        {busy ? <Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND }} /> : <FileText className="h-6 w-6" style={{ color: BRAND }} />}
                      </div>
                      <div className="text-sm font-semibold" style={{ color: INK }}>
                        Drop CSV here, or <span style={{ color: BRAND }}>browse</span>
                      </div>
                      <div className="text-xs text-slate-500">Up to 10,000 rows. Parsed locally — nothing uploaded.</div>
                      <input
                        ref={inputRef}
                        type="file"
                        accept=".csv,text/csv"
                        hidden
                        onChange={(e) => readFile(e.target.files?.[0])}
                      />
                    </label>

                    {error && (
                      <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                        <AlertCircle className="h-4 w-4" /> {error}
                      </div>
                    )}

                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                      <strong className="text-slate-900 dark:text-white">Expected columns:</strong> Date, Name/Description, Amount (required). Optional: Merchant, Type, Category, VAT.
                      <br />Works with exports from <span className="font-semibold">Emirates NBD, Mashreq, ENBD Business, Xero, QuickBooks, Zoho Books</span>.
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: EASE }}>
                    <div className="mb-4 text-xs text-slate-500">
                      File <span className="font-semibold" style={{ color: INK }}>{fileName}</span> · {raw?.length || 0} rows detected
                    </div>
                    <div className="space-y-3">
                      {FIELDS.map((f) => (
                        <div key={f.key} className="flex items-center gap-3">
                          <div className="w-28 shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {f.label}
                            {f.required && <span className="ml-1 text-red-500">*</span>}
                            {f.hint && <div className="text-[10px] font-normal text-slate-400">{f.hint}</div>}
                          </div>
                          <select
                            value={map[f.key] ?? -1}
                            onChange={(e) => setMap({ ...map, [f.key]: parseInt(e.target.value, 10) })}
                            className="flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800"
                          >
                            <option value={-1}>— not mapped —</option>
                            {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: EASE }}>
                    <div className="mb-3 text-xs text-slate-500">Preview first 5 of {raw?.length || 0} rows. If it looks right, commit.</div>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                          <tr className="text-left font-semibold text-slate-500">
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Cat</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                            <th className="px-3 py-2 text-right">VAT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((r) => (
                            <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                              <td className="px-3 py-2 text-slate-500">{new Date(r.ts).toLocaleDateString('en-GB')}</td>
                              <td className="px-3 py-2 font-semibold" style={{ color: INK }}>{r.name}</td>
                              <td className="px-3 py-2 capitalize text-slate-600">{r.type}</td>
                              <td className="px-3 py-2">
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{r.category}</span>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold" style={{ color: r.type === 'income' ? '#059669' : INK }}>
                                {r.type === 'income' ? '+' : '−'}{r.amount.toLocaleString('en-AE')}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-500">{r.vat}</td>
                            </tr>
                          ))}
                          {preview.length === 0 && (
                            <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No valid rows with current mapping.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {error && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                        <AlertCircle className="h-4 w-4" /> {error}
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: EASE }} className="flex flex-col items-center justify-center py-12 text-center">
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
                    >
                      <Check className="h-8 w-8" />
                    </motion.div>
                    <h3 className="mt-4 text-lg font-bold" style={{ color: INK }}>Imported {raw?.length || 0} rows</h3>
                    <p className="mt-1 text-sm text-slate-500">They're now in your ledger on this device.</p>
                    <button
                      onClick={close}
                      className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                      style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
                    >
                      View transactions <ArrowRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer actions */}
            {step !== 4 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
                <button
                  onClick={() => step === 1 ? close() : setStep(step - 1)}
                  className="cursor-pointer text-sm font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  {step === 1 ? 'Cancel' : 'Back'}
                </button>
                {step === 1 && raw && (
                  <button onClick={() => setStep(2)} className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: BRAND }}>
                    Next <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {step === 2 && (
                  <button
                    onClick={() => setStep(3)}
                    disabled={!canMap}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: BRAND }}
                  >
                    Preview <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {step === 3 && (
                  <button onClick={commit} className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
                    Import {raw?.length || 0} rows <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
