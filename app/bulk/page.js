'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Upload, FileImage, Sparkles, Loader2, Check, X, Trash2, Plus,
  FileText, Layers, Zap, AlertTriangle, Wand2,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { UpgradeModal } from '@/components/dashboard/PlanGate';
import { BRAND, BRAND_DARK, BRAND_SOFT, INK } from '@/components/dashboard/theme';
import { useLocalList, SEED_TX, formatAED } from '@/lib/webStore';
import { useCategories } from '@/lib/categories';
import { usePlan } from '@/lib/plan';

const EASE = [0.22, 1, 0.36, 1];

// Reused from /scan — keep parsing logic local
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
  const vat = explicitVat || +(total * 0.05 / 1.05).toFixed(2);
  const category = inferCategory(lines.join(' '));
  return { merchant, total, vat, category, raw: text };
}

const STATUS = { queued: 'queued', running: 'running', done: 'done', error: 'error' };

export default function BulkImportPage() {
  const [items, setItems] = useState([]); // { id, file, preview, status, parsed?, name, amount, vat, type, category, date, error? }
  const [running, setRunning] = useState(false);
  const dropRef = useRef(null);
  const inputRef = useRef(null);
  const { add } = useLocalList('filey.web.tx', SEED_TX);
  const { all: CATEGORIES } = useCategories();
  const { isPro, canUse, remaining, plan, track } = usePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [ai, setAi] = useState(null);
  useEffect(() => {
    try { setAi(JSON.parse(localStorage.getItem('filey.web.ai') || 'null')); } catch {}
  }, []);

  const fileToDataUrl = (f) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(f);
  });

  const acceptFiles = useCallback((files) => {
    const arr = Array.from(files || []).filter(f => f.type.startsWith('image/'));
    if (arr.length === 0) { toast.error('Drop image files (JPG/PNG/WebP)'); return; }
    const today = new Date().toISOString().slice(0, 10);
    const newItems = arr.map((f) => ({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      file: f,
      preview: URL.createObjectURL(f),
      status: STATUS.queued,
      name: f.name.replace(/\.[a-z0-9]+$/i, ''),
      amount: 0,
      vat: 0,
      type: 'expense',
      category: 'Other',
      date: today,
    }));
    setItems((p) => [...p, ...newItems]);
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    dropRef.current?.classList.remove('ring-2');
    acceptFiles(e.dataTransfer.files);
  };
  const onDragOver = (e) => { e.preventDefault(); dropRef.current?.classList.add('ring-2'); };
  const onDragLeave = () => dropRef.current?.classList.remove('ring-2');

  const onPick = (e) => acceptFiles(e.target.files);

  const updateItem = (id, patch) => setItems((p) => p.map((it) => it.id === id ? { ...it, ...patch } : it));
  const removeItem = (id) => setItems((p) => {
    const it = p.find((x) => x.id === id);
    if (it?.preview) URL.revokeObjectURL(it.preview);
    return p.filter((x) => x.id !== id);
  });
  const clearAll = () => {
    items.forEach((it) => it.preview && URL.revokeObjectURL(it.preview));
    setItems([]);
  };

  const runAll = async () => {
    const queued = items.filter((it) => it.status === STATUS.queued);
    if (queued.length === 0) { toast.error('Nothing to process'); return; }

    // Free-plan budget — block if would exceed
    const budget = canUse('scansPerMonth') ? remaining('scansPerMonth') : 0;
    if (!isPro && queued.length > budget) {
      setUpgradeOpen(true);
      return;
    }

    setRunning(true);
    let Tesseract;
    try {
      Tesseract = (await import('tesseract.js')).default;
    } catch (e) {
      toast.error('Could not load OCR engine');
      setRunning(false);
      return;
    }

    for (const it of queued) {
      updateItem(it.id, { status: STATUS.running });
      try {
        const { data } = await Tesseract.recognize(it.preview, 'eng', { logger: () => {} });
        const parsed = parseReceipt(data.text || '');
        updateItem(it.id, {
          status: STATUS.done,
          parsed,
          name: parsed.merchant,
          amount: parsed.total,
          vat: parsed.vat,
          category: parsed.category,
        });
        track('scansPerMonth');
      } catch (e) {
        updateItem(it.id, { status: STATUS.error, error: String(e.message || e) });
      }
    }
    setRunning(false);
    toast.success('Bulk OCR finished — review and save');
  };

  const runAllAi = async () => {
    if (!ai?.apiKey) { toast.error('Add an AI API key in Settings first'); return; }
    const queued = items.filter((it) => it.status === STATUS.queued);
    if (queued.length === 0) { toast.error('Nothing to process'); return; }
    const budget = canUse('scansPerMonth') ? remaining('scansPerMonth') : 0;
    if (!isPro && queued.length > budget) { setUpgradeOpen(true); return; }
    setRunning(true);
    for (const it of queued) {
      updateItem(it.id, { status: STATUS.running });
      try {
        const dataUrl = await fileToDataUrl(it.file);
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            provider: ai.provider, apiKey: ai.apiKey, model: ai.model, baseUrl: ai.baseUrl,
            imageDataUrl: dataUrl,
          }),
        });
        const j = await res.json();
        if (!j.ok) throw new Error(j.error || 'AI failed');
        const d = j.data || {};
        updateItem(it.id, {
          status: STATUS.done,
          name: d.merchant || it.name,
          amount: +d.total || 0,
          vat: +d.vat || +(((+d.total) || 0) * 0.05 / 1.05).toFixed(2),
          category: d.category || 'Other',
          date: d.date || it.date,
          parsed: { merchant: d.merchant, currency: d.currency, lineItems: d.lineItems },
        });
        track('scansPerMonth');
      } catch (e) {
        updateItem(it.id, { status: STATUS.error, error: String(e.message || e) });
      }
    }
    setRunning(false);
    toast.success(`AI extraction finished via ${ai.provider}`);
  };

  const saveAll = () => {
    const ready = items.filter((it) => it.status === STATUS.done && +it.amount > 0);
    if (ready.length === 0) { toast.error('No rows ready to save'); return; }
    for (const it of ready) {
      add({
        name: it.name || 'Receipt',
        merchant: 'Bulk import',
        amount: +it.amount,
        vat: +it.vat || 0,
        type: it.type,
        category: it.category,
        status: 'Cleared',
        ts: new Date(it.date || Date.now()).getTime() || Date.now(),
        customFields: { source: 'bulk-ocr', file: it.file?.name || '' },
      });
    }
    toast.success(`${ready.length} transactions saved to ledger`);
    // Clean only saved entries
    ready.forEach((it) => it.preview && URL.revokeObjectURL(it.preview));
    setItems((p) => p.filter((it) => !ready.includes(it)));
  };

  const queuedCount  = items.filter((it) => it.status === STATUS.queued).length;
  const doneCount    = items.filter((it) => it.status === STATUS.done).length;
  const totalAmount  = items.filter((it) => it.status === STATUS.done).reduce((s, it) => s + (+it.amount || 0), 0);

  return (
    <Shell
      title="Bulk import"
      subtitle="Drop dozens of receipts · OCR each locally · review and save in one go"
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" /> Add files
          </button>
          <button
            onClick={runAll}
            disabled={running || queuedCount === 0}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {running ? 'Running…' : `Run OCR · ${queuedCount}`}
          </button>
          <button
            onClick={runAllAi}
            disabled={running || queuedCount === 0 || !ai?.apiKey}
            title={ai?.apiKey ? `AI extract via ${ai.provider}` : 'Add API key in Settings → AI Provider'}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200"
          >
            <Wand2 className="h-4 w-4" /> AI extract
          </button>
          <button
            onClick={saveAll}
            disabled={doneCount === 0}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" /> Save {doneCount > 0 ? doneCount : ''}
          </button>
        </div>
      }
    >
      {!isPro && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-slate-600 dark:text-slate-400">
            Free plan: <strong className="text-slate-900 dark:text-white">{Math.max(0, remaining('scansPerMonth'))}</strong> of <strong className="text-slate-900 dark:text-white">{plan.limits.scansPerMonth}</strong> scans left this month — bulk respects this budget.
          </span>
          <button onClick={() => setUpgradeOpen(true)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:scale-[1.03]" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
            <Zap className="h-3 w-3" /> Unlimited with Pro
          </button>
        </div>
      )}

      {/* Drop zone */}
      <motion.div
        ref={dropRef}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
        className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-10 text-center ring-blue-300 transition dark:border-slate-700 dark:bg-slate-900/40"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm" style={{ background: BRAND_SOFT }}>
          <Layers className="h-6 w-6" style={{ color: BRAND }} />
        </div>
        <h2 className="mt-4 text-lg font-bold" style={{ color: INK }}>Drop receipts here</h2>
        <p className="mt-1 text-sm text-slate-500">
          JPG · PNG · WebP · upload as many as you like. OCR runs locally — nothing leaves your browser.
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02]"
          style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
        >
          <Upload className="h-4 w-4" /> Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          hidden
          onChange={onPick}
        />
      </motion.div>

      {/* Stats */}
      {items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Queued"  value={queuedCount} icon={FileImage} color={BRAND} />
          <Stat label="Done"    value={doneCount}   icon={Check}     color="#10B981" />
          <Stat label="Sum"     value={formatAED(totalAmount)} icon={FileText} color="#8B5CF6" />
          <Stat label="Errors"  value={items.filter(i => i.status === STATUS.error).length} icon={AlertTriangle} color="#EF4444" />
        </div>
      )}

      {/* Table of items */}
      {items.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{items.length} files</span>
            <button onClick={clearAll} className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600">
              <Trash2 className="h-3 w-3" /> Clear all
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60">
              <tr>
                <th className="w-16 px-4 py-2 text-left">Image</th>
                <th className="px-4 py-2 text-left">Merchant</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-right">VAT</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="w-10 px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {items.map((it) => (
                  <motion.tr
                    key={it.id}
                    layout
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-4 py-2">
                      <img src={it.preview} alt="" className="h-10 w-10 rounded-md object-cover" />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={it.name}
                        onChange={(e) => updateItem(it.id, { name: e.target.value })}
                        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none transition focus:border-slate-200 focus:bg-white dark:focus:bg-slate-800"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number" step="0.01"
                        value={it.amount}
                        onChange={(e) => updateItem(it.id, { amount: e.target.value, vat: +(+e.target.value * 0.05 / 1.05).toFixed(2) })}
                        className="w-24 rounded-md border border-transparent bg-transparent px-2 py-1 text-right text-sm outline-none transition focus:border-slate-200 focus:bg-white dark:focus:bg-slate-800"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number" step="0.01"
                        value={it.vat}
                        onChange={(e) => updateItem(it.id, { vat: e.target.value })}
                        className="w-20 rounded-md border border-transparent bg-transparent px-2 py-1 text-right text-sm outline-none transition focus:border-slate-200 focus:bg-white dark:focus:bg-slate-800"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={it.category}
                        onChange={(e) => updateItem(it.id, { category: e.target.value })}
                        className="rounded-md border border-transparent bg-transparent px-2 py-1 text-xs outline-none transition focus:border-slate-200 focus:bg-white dark:focus:bg-slate-800"
                      >
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={it.date}
                        onChange={(e) => updateItem(it.id, { date: e.target.value })}
                        className="rounded-md border border-transparent bg-transparent px-2 py-1 text-xs outline-none transition focus:border-slate-200 focus:bg-white dark:focus:bg-slate-800"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StatusBadge s={it.status} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => removeItem(it.id)} aria-label="Remove" className="cursor-pointer text-slate-400 transition hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Help */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/40">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: BRAND_SOFT }}>
            <Sparkles className="h-5 w-5" style={{ color: BRAND }} />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: INK }}>Bulk OCR — privacy preserved</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Each file is OCR'd locally with Tesseract.js (WebAssembly). For Arabic + bilingual receipts, install the Filey iOS app — it uses Apple Vision for higher accuracy. Need LLM-grade extraction? Connect a BYOK key in <Link href="/settings" className="font-semibold text-blue-700 hover:underline">Settings</Link>.
            </p>
          </div>
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="scansPerMonth" />
    </Shell>
  );
}

function Stat({ label, value, icon: I, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${color}15` }}>
          <I className="h-4 w-4" style={{ color }} />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500">{label}</div>
          <div className="text-base font-bold" style={{ color: INK }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ s }) {
  const map = {
    queued:  { label: 'Queued',  cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    running: { label: 'OCR…',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    done:    { label: 'Ready',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    error:   { label: 'Error',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  }[s] || { label: s, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map.cls}`}>
      {s === 'running' && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {map.label}
    </span>
  );
}
