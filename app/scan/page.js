'use client';

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Upload, Loader2, Check, X, ScanLine, Sparkles, RotateCw,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_SOFT, INK } from '@/components/dashboard/theme';
import Link from 'next/link';
import { useLocalList, SEED_TX, formatAED, CATEGORIES } from '@/lib/webStore';

const Webcam = dynamic(() => import('react-webcam'), { ssr: false });

// Category inference from merchant/keywords — runs fully local.
function inferCategory(text) {
  const t = (text || '').toLowerCase();
  const rules = [
    [/(talabat|lunch|cafe|coffee|restaurant|dining|zomato|deliveroo|mcdonald|kfc|starbucks|costa|pizza)/, 'Food'],
    [/(dewa|etisalat|du|wifi|electric|water|internet|zain|vodafone)/,                                     'Utilities'],
    [/(careem|uber|taxi|metro|rta|fuel|petrol|shell|adnoc|enoc|flight|emirates|flydubai)/,               'Travel'],
    [/(amazon|officesupplies|staples|ikea|office)/,                                                      'Supplies'],
    [/(adobe|figma|github|slack|notion|atlassian|google workspace|microsoft 365|dropbox|aws|vercel)/,    'Software'],
    [/(rent|landlord|ejari)/,                                                                            'Rent'],
    [/(facebook|google ads|linkedin ads|tiktok ads|instagram ads|marketing)/,                            'Marketing'],
    [/(invoice|client|consulting|freelance|project payment)/,                                            'Freelance'],
  ];
  for (const [re, cat] of rules) if (re.test(t)) return cat;
  return 'Other';
}

function parseReceipt(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const amounts = [];
  let explicitTotal = 0, explicitVat = 0;
  for (const l of lines) {
    const totalMatch = l.match(/(?:grand\s*total|total|amount\s*due|net\s*total)[\s:]*(?:aed|dhs?|dh)?[\s:]*([0-9]+[.,][0-9]{2})/i);
    if (totalMatch) { const v = parseFloat(totalMatch[1].replace(',', '.')); if (v > explicitTotal) explicitTotal = v; continue; }
    const vatMatch = l.match(/(?:vat|tax)\s*(?:\(5%\)|5%)?[\s:]*(?:aed|dhs?|dh)?[\s:]*([0-9]+[.,][0-9]{2})/i);
    if (vatMatch) { explicitVat = parseFloat(vatMatch[1].replace(',', '.')); continue; }
    const m = l.match(/^([0-9]+[.,][0-9]{2})$/) || l.match(/(?:aed|dhs?|dh)\s*([0-9]+[.,][0-9]{2})/i);
    if (m) amounts.push(parseFloat(m[1].replace(',', '.')));
  }
  const total = explicitTotal || (amounts.length ? Math.max(...amounts) : 0);
  const merchant = (lines[0] || 'Receipt').replace(/[^\w\s&'.-]/g, '').slice(0, 40) || 'Receipt';
  const vat = explicitVat || +(total * 0.05 / 1.05).toFixed(2); // VAT portion of VAT-inclusive total
  const category = inferCategory(lines.join(' '));
  return { merchant, total, vat, category, raw: text };
}

export default function ScanPage() {
  const [mode, setMode] = useState('camera'); // camera | upload
  const [img, setImg] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const webcamRef = useRef(null);
  const { add } = useLocalList('filey.web.tx', SEED_TX);

  const capture = useCallback(() => {
    const src = webcamRef.current?.getScreenshot();
    if (src) { setImg(src); setOcr(null); setSaved(false); }
  }, []);

  const onUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setImg(r.result); setOcr(null); setSaved(false); };
    r.readAsDataURL(f);
  };

  const runOcr = async () => {
    if (!img) return;
    setRunning(true);
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const { data } = await Tesseract.recognize(img, 'eng', { logger: () => {} });
      setOcr(parseReceipt(data.text || ''));
    } catch (e) {
      setOcr({ merchant: 'OCR failed', total: 0, vat: 0, raw: String(e.message || e) });
    }
    setRunning(false);
  };

  const [draft, setDraft] = useState(null); // editable form populated from ocr

  const runOcrThenDraft = async () => {
    await runOcr();
  };

  // Sync ocr → draft when new OCR result arrives
  if (ocr && !draft) {
    setDraft({
      name: ocr.merchant,
      amount: ocr.total,
      vat: ocr.vat,
      type: 'expense',
      category: ocr.category || 'Other',
      date: new Date().toISOString().slice(0, 10),
    });
  }

  const saveTx = () => {
    if (!draft || !draft.amount) return;
    const d = new Date(draft.date || Date.now()).getTime() || Date.now();
    add({
      name: draft.name || 'Receipt',
      merchant: 'Scanned receipt',
      amount: +draft.amount,
      vat: +draft.vat || 0,
      type: draft.type,
      category: draft.category,
      status: 'Cleared',
      ts: d,
    });
    setSaved(true);
  };

  const resetAll = () => { setImg(null); setOcr(null); setDraft(null); setSaved(false); };

  return (
    <Shell title="Scan" subtitle="Capture receipts w/ browser camera. OCR runs locally via tesseract.js.">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Capture panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
              <ScanLine className="h-4 w-4" style={{ color: BRAND }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: INK }}>Capture</h3>
            <div className="ml-auto flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
              <button onClick={() => setMode('camera')} className={`rounded-md px-3 py-1 ${mode === 'camera' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Camera</button>
              <button onClick={() => setMode('upload')} className={`rounded-md px-3 py-1 ${mode === 'upload' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Upload</button>
            </div>
          </div>

          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-900">
            {mode === 'camera' && !img && (
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'environment' }}
                className="h-full w-full object-cover"
              />
            )}
            {img && <img src={img} alt="Capture" className="h-full w-full object-cover" />}
            {!img && mode === 'upload' && (
              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 bg-slate-800 text-white">
                <Upload className="h-10 w-10 opacity-70" />
                <span className="text-sm font-semibold">Click to choose image</span>
                <input type="file" accept="image/*" hidden onChange={onUpload} />
              </label>
            )}
            {/* Corner markers */}
            {mode === 'camera' && !img && (
              <>
                {[['top-4 left-4','border-t-2 border-l-2'],['top-4 right-4','border-t-2 border-r-2'],['bottom-4 left-4','border-b-2 border-l-2'],['bottom-4 right-4','border-b-2 border-r-2']].map(([pos, bd]) => (
                  <div key={pos} className={`absolute ${pos} h-10 w-10 ${bd}`} style={{ borderColor: BRAND }} />
                ))}
              </>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {mode === 'camera' && !img && (
              <button onClick={capture} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105" style={{ background: BRAND }}>
                <Camera className="h-4 w-4" /> Capture
              </button>
            )}
            {img && (
              <>
                <button onClick={() => { setImg(null); setOcr(null); setSaved(false); }} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  <RotateCw className="h-4 w-4" /> Retake
                </button>
                <button onClick={runOcr} disabled={running} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105 disabled:opacity-50" style={{ background: BRAND }}>
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {running ? 'Reading…' : 'Extract data'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* OCR Result */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
              <Sparkles className="h-4 w-4" style={{ color: BRAND }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: INK }}>Parsed data</h3>
          </div>

          {!draft && !saved && (
            <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-slate-400">
              <ScanLine className="h-10 w-10" />
              <span className="text-sm">Capture or upload a receipt to see extracted data</span>
            </div>
          )}

          {draft && !saved && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <FormField label="Merchant / description">
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Amount (AED)">
                  <input type="number" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value, vat: +(+e.target.value * 0.05 / 1.05).toFixed(2) })} className={inputCls} />
                </FormField>
                <FormField label="VAT portion">
                  <input type="number" step="0.01" value={draft.vat} onChange={(e) => setDraft({ ...draft, vat: e.target.value })} className={inputCls} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Type">
                  <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={inputCls}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </FormField>
                <FormField label="Category">
                  <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={inputCls}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="Date">
                <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={inputCls} />
              </FormField>
              {ocr?.raw && (
                <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <summary className="cursor-pointer font-semibold text-slate-600">Raw OCR text</summary>
                  <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-slate-500">{ocr.raw}</pre>
                </details>
              )}
              <button onClick={saveTx} disabled={!draft.amount} className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${BRAND}, #1E4BB0)` }}>
                <Check className="h-4 w-4" /> Save as transaction
              </button>
            </motion.div>
          )}

          {saved && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex h-[300px] flex-col items-center justify-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <div className="font-bold text-emerald-700">Saved to your ledger</div>
                <div className="mt-1 text-xs text-slate-500">{draft?.name} · {formatAED(draft?.amount)}</div>
              </div>
              <div className="flex gap-2">
                <Link href="/transactions" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: BRAND }}>
                  View transactions
                </Link>
                <button onClick={resetAll} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Scan another
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: BRAND_SOFT }}>
            <Sparkles className="h-5 w-5" style={{ color: BRAND }} />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: INK }}>100% local OCR</h3>
            <p className="mt-1 text-sm text-slate-600">
              Tesseract.js runs a WebAssembly OCR engine right in your browser. Your receipt image never leaves this device.
              For Arabic receipts, the iOS app uses Vision framework w/ bilingual support — coming to web in next release.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
