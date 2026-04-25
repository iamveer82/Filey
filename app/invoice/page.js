'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  FileText, Plus, Trash2, Download, Send, Check, User, Building2,
  CalendarDays, Hash, Sparkles, Receipt, Lock, Palette, Crown, Share2, Copy,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { UpgradeCallout, UpgradeModal } from '@/components/dashboard/PlanGate';
import { BRAND, BRAND_DARK, BRAND_SOFT, INK } from '@/components/dashboard/theme';
import { useLocalList, SEED_TX, formatAED } from '@/lib/webStore';
import { usePlan } from '@/lib/plan';

const EASE = [0.22, 1, 0.36, 1];

// Premium template palettes — drives PDF + live preview
const TEMPLATES = {
  classic: {
    id: 'classic',
    name: 'Classic',
    desc: 'Filey signature blue band',
    locked: false,
    // hex triplets (0-255) for pdf-lib + CSS
    brand:  [0x2a, 0x63, 0xe2],
    accent: [0x2a, 0x63, 0xe2],
    band:   [0x2a, 0x63, 0xe2],
    bandText: [0xff, 0xff, 0xff],
    rowAlt: [0xf6, 0xf9, 0xff],
    style: 'banded',
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    desc: 'Emerald accent, ink header',
    locked: true,
    brand:  [0x0f, 0x17, 0x2a],
    accent: [0x10, 0xb9, 0x81],
    band:   [0x0f, 0x17, 0x2a],
    bandText: [0xff, 0xff, 0xff],
    rowAlt: [0xf3, 0xfa, 0xf6],
    style: 'banded',
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    desc: 'Mono palette, no band — print-ready',
    locked: true,
    brand:  [0x0a, 0x0a, 0x0a],
    accent: [0x0a, 0x0a, 0x0a],
    band:   [0xff, 0xff, 0xff],
    bandText: [0x0a, 0x0a, 0x0a],
    rowAlt: [0xf5, 0xf5, 0xf5],
    style: 'lined',
  },
};
const cssRgb = (a) => `rgb(${a[0]}, ${a[1]}, ${a[2]})`;

const CURRENCIES = {
  AED: { symbol: 'AED', name: 'UAE Dirham',     rateToAed: 1,        decimals: 2 },
  USD: { symbol: '$',   name: 'US Dollar',      rateToAed: 3.6725,   decimals: 2 },
  EUR: { symbol: '€',   name: 'Euro',           rateToAed: 3.95,     decimals: 2 },
  GBP: { symbol: '£',   name: 'British Pound',  rateToAed: 4.65,     decimals: 2 },
  SAR: { symbol: 'SR',  name: 'Saudi Riyal',    rateToAed: 0.98,     decimals: 2 },
  INR: { symbol: '₹',   name: 'Indian Rupee',   rateToAed: 0.044,    decimals: 2 },
};
const fmtCur = (cur, n) => {
  const c = CURRENCIES[cur] || CURRENCIES.AED;
  const v = (+n || 0).toFixed(c.decimals);
  // Symbol style: AED/SR — postfix with space; $/€/£/₹ — prefix
  if (cur === 'AED' || cur === 'SAR') return `${c.symbol} ${v}`;
  return `${c.symbol}${v}`;
};

function nextNumber(invoices) {
  const yr = new Date().getFullYear();
  const max = invoices
    .map(i => +((i.number || '').match(/-(\d+)$/)?.[1] || 0))
    .reduce((a, b) => Math.max(a, b), 0);
  return `INV-${yr}-${String(max + 1).padStart(4, '0')}`;
}

const NEW_LINE = () => ({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), desc: '', qty: 1, rate: 0 });

export default function InvoicePage() {
  const { list: invoices, add: addInvoice } = useLocalList('filey.web.invoices', []);
  const { list: tx, add: addTx } = useLocalList('filey.web.tx', SEED_TX);
  const { plan, isPro, canUse, remaining, track } = usePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('invoicesPerMonth');
  const openUpgrade = (feature) => { setUpgradeFeature(feature); setUpgradeOpen(true); };

  const [profile, setProfile] = useState({ name: 'Filey Technologies', email: 'hello@filey.ae', trn: '100123456789003' });
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('filey.web.profile') || 'null');
      if (p) setProfile({
        name: p.company || p.name || 'Filey Technologies',
        email: p.email || '',
        trn: p.trn || '',
      });
    } catch {}
  }, []);

  const [form, setForm] = useState({
    number: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate:   new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    clientAddress: '',
    notes: 'Thank you for the business. Bank transfer to IBAN AE00-0000-0000-0000 — include invoice number as reference.',
    lines: [NEW_LINE()],
    vatRate: 5,
    currency: 'AED',
    fxRate: 1,
    template: 'classic',
  });

  const tpl = TEMPLATES[form.template] || TEMPLATES.classic;

  const pickTemplate = (id) => {
    const t = TEMPLATES[id];
    if (!t) return;
    if (t.locked && !isPro) { openUpgrade('premiumTemplates'); return; }
    setForm((f) => ({ ...f, template: id }));
  };

  useEffect(() => { setForm((f) => ({ ...f, number: f.number || nextNumber(invoices) })); }, [invoices]);

  const totals = useMemo(() => {
    const sub = form.lines.reduce((s, l) => s + (+l.qty || 0) * (+l.rate || 0), 0);
    const vat = sub * (+form.vatRate || 0) / 100;
    return { sub, vat, total: sub + vat };
  }, [form.lines, form.vatRate]);

  const updateLine = (id, patch) => setForm({ ...form, lines: form.lines.map(l => l.id === id ? { ...l, ...patch } : l) });
  const removeLine = (id) => setForm({ ...form, lines: form.lines.filter(l => l.id !== id) });
  const addLine    = () => setForm({ ...form, lines: [...form.lines, NEW_LINE()] });

  const canSave = form.clientName && form.lines.some(l => l.desc && +l.rate > 0);

  const downloadPdf = async () => {
    if (!canSave) { toast.error('Add a client + at least one line item'); return; }
    if (!canUse('invoicesPerMonth')) {
      openUpgrade('invoicesPerMonth');
      return;
    }
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4
    const font  = await pdf.embedFont(StandardFonts.Helvetica);
    const bold  = await pdf.embedFont(StandardFonts.HelveticaBold);
    const T = TEMPLATES[form.template] || TEMPLATES.classic;
    const toRgb = (a) => rgb(a[0]/255, a[1]/255, a[2]/255);
    const brand    = toRgb(T.brand);
    const accent   = toRgb(T.accent);
    const bandCol  = toRgb(T.band);
    const bandText = toRgb(T.bandText);
    const rowAlt   = toRgb(T.rowAlt);
    const ink   = rgb(0x0f/255, 0x17/255, 0x2a/255);
    const slate = rgb(0x64/255, 0x74/255, 0x8B/255);

    const draw = (t, x, y, opts = {}) => page.drawText(String(t), { x, y, size: opts.size || 10, font: opts.bold ? bold : font, color: opts.color || ink });

    // Header — banded vs lined
    if (T.style === 'banded') {
      page.drawRectangle({ x: 0, y: 782, width: 595, height: 60, color: bandCol });
      draw('INVOICE', 40, 808, { size: 24, bold: true, color: bandText });
      draw(form.number, 40, 790, { size: 11, color: bandText });
    } else {
      // Minimal: hairline rule + ink heading
      draw('INVOICE', 40, 800, { size: 28, bold: true, color: ink });
      draw(form.number, 40, 782, { size: 11, color: slate });
      page.drawLine({ start: { x: 40, y: 770 }, end: { x: 555, y: 770 }, thickness: 1, color: ink });
    }

    // Issuer
    draw('FROM', 40, 750, { size: 8, bold: true, color: slate });
    draw(profile.name, 40, 735, { size: 11, bold: true });
    if (profile.email) draw(profile.email, 40, 720, { size: 9, color: slate });
    if (profile.trn)   draw(`TRN ${profile.trn}`, 40, 707, { size: 9, color: slate });

    // Client
    draw('BILL TO', 310, 750, { size: 8, bold: true, color: slate });
    draw(form.clientName, 310, 735, { size: 11, bold: true });
    if (form.clientCompany) draw(form.clientCompany, 310, 720, { size: 9, color: slate });
    if (form.clientEmail)   draw(form.clientEmail, 310, 707, { size: 9, color: slate });
    if (form.clientAddress) {
      const wrap = form.clientAddress.slice(0, 80);
      draw(wrap, 310, 694, { size: 9, color: slate });
    }

    // Meta dates
    draw(`Issue date: ${form.issueDate}`, 40, 665, { size: 9, color: slate });
    draw(`Due date:   ${form.dueDate}`,   40, 652, { size: 9, color: slate });

    // Table header
    const tY = 620;
    page.drawRectangle({ x: 40, y: tY - 6, width: 515, height: 22, color: rowAlt });
    draw('Description', 48,  tY, { size: 9, bold: true, color: slate });
    draw('Qty',         340, tY, { size: 9, bold: true, color: slate });
    draw('Rate',        400, tY, { size: 9, bold: true, color: slate });
    draw('Amount',      510, tY, { size: 9, bold: true, color: slate });

    let rowY = tY - 22;
    for (const l of form.lines.filter(l => l.desc || +l.rate > 0)) {
      const amt = (+l.qty || 0) * (+l.rate || 0);
      draw(l.desc.slice(0, 60),        48,  rowY, { size: 10 });
      draw(String(l.qty || 0),         340, rowY, { size: 10 });
      draw(Number(l.rate).toFixed(2),  400, rowY, { size: 10 });
      draw(amt.toFixed(2),              510, rowY, { size: 10, bold: true });
      page.drawLine({ start: { x: 40, y: rowY - 6 }, end: { x: 555, y: rowY - 6 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.93) });
      rowY -= 22;
    }

    // Totals
    const tBase = Math.max(rowY - 20, 180);
    draw('Subtotal',                              400, tBase,      { size: 10, color: slate });
    draw(`${fmtCur(form.currency, totals.sub)}`,  510, tBase,      { size: 10 });
    draw(`VAT (${form.vatRate}%)`,                400, tBase - 18, { size: 10, color: slate });
    draw(`${fmtCur(form.currency, totals.vat)}`,  510, tBase - 18, { size: 10 });
    page.drawLine({ start: { x: 395, y: tBase - 28 }, end: { x: 555, y: tBase - 28 }, thickness: 1, color: ink });
    draw('TOTAL',                                 400, tBase - 44, { size: 11, bold: true });
    draw(`${fmtCur(form.currency, totals.total)}`, 510, tBase - 44, { size: 12, bold: true, color: accent });

    // FTA: foreign-currency invoices must show AED equivalent
    if (form.currency !== 'AED' && +form.fxRate > 0) {
      const aedTotal = totals.total * (+form.fxRate);
      const aedVat   = totals.vat * (+form.fxRate);
      draw(`AED equivalent (FX ${(+form.fxRate).toFixed(4)}):`, 40, tBase - 44, { size: 8, color: slate });
      draw(`${fmtCur('AED', aedTotal)} total · ${fmtCur('AED', aedVat)} VAT`, 40, tBase - 56, { size: 9, bold: true });
    }

    // Notes
    if (form.notes) {
      draw('NOTES', 40, 140, { size: 8, bold: true, color: slate });
      const lines = form.notes.match(/.{1,90}/g) || [];
      lines.slice(0, 4).forEach((ln, i) => draw(ln, 40, 125 - i * 13, { size: 9, color: slate }));
    }

    // Footer
    if (T.style === 'banded') {
      page.drawRectangle({ x: 0, y: 0, width: 595, height: 30, color: rowAlt });
    } else {
      page.drawLine({ start: { x: 40, y: 30 }, end: { x: 555, y: 30 }, thickness: 0.5, color: slate });
    }
    draw(`Generated by Filey · ${new Date().toLocaleDateString('en-GB')}`, 40, 12, { size: 8, color: slate });

    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${form.number}.pdf`;
    a.click();
    toast.success('Invoice PDF downloaded');

    // Save invoice to ledger of invoices
    addInvoice({
      number: form.number,
      clientName: form.clientName,
      total: +totals.total.toFixed(2),
      vat: +totals.vat.toFixed(2),
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      status: 'sent',
    });

    // Count against free-plan monthly cap
    track('invoicesPerMonth');

    // Roll to next invoice number for subsequent downloads
    setForm((f) => ({ ...f, number: nextNumber([...invoices, { number: f.number }]) }));
  };

  const shareLink = async () => {
    if (!canSave) { toast.error('Fill the invoice first'); return; }
    const payload = {
      invoice: {
        number: form.number,
        clientName: form.clientName,
        clientCompany: form.clientCompany,
        clientEmail: form.clientEmail,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        lines: form.lines.filter(l => l.desc || +l.rate > 0),
        vatRate: form.vatRate,
        currency: form.currency,
        fxRate: form.fxRate,
        notes: form.notes,
        status: 'sent',
      },
      profile: { company: profile.name, email: profile.email, trn: profile.trn },
    };
    const json = JSON.stringify(payload);
    const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const url = `${location.origin}/i/${encodeURIComponent(form.number)}?d=${b64}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Public link copied — paste it anywhere');
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  const recordAsIncome = () => {
    if (!canSave) { toast.error('Fill the invoice first'); return; }
    addTx({
      name: `Invoice ${form.number}`,
      merchant: form.clientName,
      amount: +totals.total.toFixed(2),
      vat: +totals.vat.toFixed(2),
      type: 'income',
      category: 'Freelance',
      status: 'Pending',
    });
    toast.success('Recorded to ledger as pending income');
  };

  return (
    <Shell
      title="Invoice"
      subtitle="Create FTA-ready invoices with your TRN — downloads as PDF"
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={shareLink}
            disabled={!canSave}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Share2 className="h-4 w-4" /> Copy share link
          </button>
          <button
            onClick={recordAsIncome}
            disabled={!canSave}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Receipt className="h-4 w-4" /> Record as income
          </button>
          <button
            onClick={downloadPdf}
            disabled={!canSave}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      }
    >
      {/* Plan usage banner */}
      {!isPro && (
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-slate-600 dark:text-slate-400">
            Free plan: <strong className="text-slate-900 dark:text-white">{Math.max(0, remaining('invoicesPerMonth'))}</strong> of <strong className="text-slate-900 dark:text-white">{plan.limits.invoicesPerMonth}</strong> invoices left this month.
          </span>
          <button onClick={() => openUpgrade('invoicesPerMonth')} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:scale-[1.03]" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
            <Sparkles className="h-3 w-3" /> Unlimited with Pro
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Editor */}
        <div className="space-y-5">
          {/* Template picker */}
          <Card icon={Palette} title="Template">
            <div className="grid grid-cols-3 gap-3">
              {Object.values(TEMPLATES).map((t) => {
                const active = form.template === t.id;
                const locked = t.locked && !isPro;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pickTemplate(t.id)}
                    aria-pressed={active}
                    aria-label={`Use ${t.name} template${locked ? ' (Pro)' : ''}`}
                    className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-white text-left transition hover:shadow-md dark:bg-slate-800 ${
                      active ? 'border-2' : 'border-slate-200 dark:border-slate-700'
                    }`}
                    style={active ? { borderColor: cssRgb(t.accent) } : undefined}
                  >
                    <TemplateThumb tpl={t} />
                    <div className="flex items-center justify-between px-3 py-2">
                      <div>
                        <div className="text-xs font-bold" style={{ color: INK }}>{t.name}</div>
                        <div className="text-[10px] text-slate-500">{t.desc}</div>
                      </div>
                      {locked ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          <Lock className="h-2.5 w-2.5" /> Pro
                        </span>
                      ) : active ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: cssRgb(t.accent) }}>
                          <Check className="h-3 w-3" />
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
            {!isPro && (
              <p className="mt-2 text-[11px] text-slate-500">
                Modern + Minimal templates unlock with Pro · custom logo + accent colors coming soon.
              </p>
            )}
          </Card>

          {/* Meta */}
          <Card icon={Hash} title="Invoice details">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Invoice #"><input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className={inputCls} /></Field>
              <Field label="Issue date"><input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className={inputCls} /></Field>
              <Field label="Due date"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="Currency">
                <select
                  value={form.currency}
                  onChange={(e) => {
                    const c = e.target.value;
                    setForm({ ...form, currency: c, fxRate: CURRENCIES[c]?.rateToAed || 1 });
                  }}
                  className={inputCls}
                >
                  {Object.entries(CURRENCIES).map(([code, c]) => (
                    <option key={code} value={code}>{code} — {c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="VAT rate (%)">
                <input type="number" min={0} max={100} step={0.1} value={form.vatRate}
                  onChange={(e) => setForm({ ...form, vatRate: +e.target.value })}
                  className={inputCls} />
              </Field>
              {form.currency !== 'AED' && (
                <Field label={`FX rate (1 ${form.currency} = ? AED)`}>
                  <input type="number" min={0} step="0.0001" value={form.fxRate}
                    onChange={(e) => setForm({ ...form, fxRate: +e.target.value })}
                    className={inputCls} />
                </Field>
              )}
            </div>
            {form.currency !== 'AED' && (
              <p className="mt-2 text-[11px] text-slate-500">
                FTA tip: tax invoices in foreign currency must show the AED equivalent. Filey adds it to the PDF automatically.
              </p>
            )}
          </Card>

          {/* From / To */}
          <div className="grid gap-5 md:grid-cols-2">
            <Card icon={Building2} title="From (your business)">
              <Field label="Business name"><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={inputCls} /></Field>
              <Field label="Email"><input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputCls} /></Field>
              <Field label="TRN (15 digits)"><input value={profile.trn} onChange={(e) => setProfile({ ...profile, trn: e.target.value })} className={inputCls} placeholder="100 XXX XXX XXX 003" /></Field>
              <p className="text-[11px] text-slate-500">Saved to Settings → Profile on download.</p>
            </Card>

            <Card icon={User} title="Bill to">
              <Field label="Client name"><input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className={inputCls} placeholder="Jane Doe" /></Field>
              <Field label="Company"><input value={form.clientCompany} onChange={(e) => setForm({ ...form, clientCompany: e.target.value })} className={inputCls} placeholder="Acme Trading LLC" /></Field>
              <Field label="Email"><input value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} className={inputCls} placeholder="jane@acme.ae" /></Field>
              <Field label="Address"><input value={form.clientAddress} onChange={(e) => setForm({ ...form, clientAddress: e.target.value })} className={inputCls} placeholder="Office 303, Dubai" /></Field>
            </Card>
          </div>

          {/* Line items */}
          <Card icon={FileText} title="Line items">
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {form.lines.map((l, i) => (
                  <motion.div
                    key={l.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="grid grid-cols-[1fr_80px_100px_100px_40px] items-center gap-2"
                  >
                    <input
                      value={l.desc}
                      onChange={(e) => updateLine(l.id, { desc: e.target.value })}
                      className={inputCls}
                      placeholder={`Line ${i + 1} description`}
                      aria-label={`Description line ${i + 1}`}
                    />
                    <input type="number" min={0} value={l.qty} onChange={(e) => updateLine(l.id, { qty: +e.target.value })} className={inputCls} aria-label="Quantity" />
                    <input type="number" min={0} step="0.01" value={l.rate} onChange={(e) => updateLine(l.id, { rate: +e.target.value })} className={inputCls} aria-label="Rate" />
                    <div className="text-right text-sm font-semibold" style={{ color: INK }}>
                      {((+l.qty || 0) * (+l.rate || 0)).toFixed(2)}
                    </div>
                    <button
                      onClick={() => removeLine(l.id)}
                      disabled={form.lines.length === 1}
                      aria-label="Remove line"
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <button
              onClick={addLine}
              className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-blue-50 dark:hover:bg-blue-900/20"
              style={{ color: BRAND }}
            >
              <Plus className="h-3.5 w-3.5" /> Add line
            </button>
          </Card>

          <Card icon={FileText} title="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className={`${inputCls} min-h-[80px] resize-y`}
              placeholder="Payment terms, bank details, thank-you note…"
            />
          </Card>
        </div>

        {/* Live preview */}
        <aside className="sticky top-4 h-fit">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
          >
            {tpl.style === 'banded' ? (
              <div className="px-5 py-4" style={{ background: cssRgb(tpl.band), color: cssRgb(tpl.bandText) }}>
                <div className="text-xs uppercase tracking-wider opacity-80">Invoice · {tpl.name}</div>
                <div className="text-lg font-bold">{form.number || 'INV-—'}</div>
              </div>
            ) : (
              <div className="border-b-2 px-5 py-4" style={{ borderColor: cssRgb(tpl.brand) }}>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Invoice · {tpl.name}</div>
                <div className="mt-1 text-xl font-bold tracking-tight" style={{ color: cssRgb(tpl.brand) }}>{form.number || 'INV-—'}</div>
              </div>
            )}
            <div className="space-y-4 p-5 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="font-semibold uppercase tracking-wider text-slate-400">From</div>
                  <div className="mt-1 font-semibold" style={{ color: INK }}>{profile.name}</div>
                  <div className="text-slate-500">{profile.email || '—'}</div>
                  {profile.trn && <div className="text-slate-500">TRN {profile.trn}</div>}
                </div>
                <div>
                  <div className="font-semibold uppercase tracking-wider text-slate-400">To</div>
                  <div className="mt-1 font-semibold" style={{ color: INK }}>{form.clientName || '—'}</div>
                  <div className="text-slate-500">{form.clientCompany || '—'}</div>
                  <div className="text-slate-500">{form.clientEmail || '—'}</div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> Issue</span>
                  <span className="font-semibold" style={{ color: INK }}>{form.issueDate}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> Due</span>
                  <span className="font-semibold" style={{ color: INK }}>{form.dueDate}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                {form.lines.filter(l => l.desc || +l.rate > 0).length === 0
                  ? <div className="text-slate-400">No line items yet</div>
                  : form.lines.filter(l => l.desc || +l.rate > 0).map((l) => (
                      <div key={l.id} className="flex items-center justify-between">
                        <span className="truncate pr-2" style={{ color: INK }}>{l.desc || '—'} <span className="text-slate-400">×{l.qty}</span></span>
                        <span className="shrink-0 font-semibold" style={{ color: INK }}>{((+l.qty || 0) * (+l.rate || 0)).toFixed(2)}</span>
                      </div>
                    ))
                }
              </div>

              <div className="space-y-1 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <Row label="Subtotal" value={`${fmtCur(form.currency, totals.sub)}`} />
                <Row label={`VAT (${form.vatRate}%)`} value={`${fmtCur(form.currency, totals.vat)}`} />
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-bold" style={{ color: INK }}>Total</span>
                  <span className="text-base font-bold" style={{ color: cssRgb(tpl.accent) }}>{fmtCur(form.currency, totals.total)}</span>
                </div>
                {form.currency !== 'AED' && +form.fxRate > 0 && (
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span>≈ AED equiv. (FX {(+form.fxRate).toFixed(4)})</span>
                    <span className="font-semibold" style={{ color: INK }}>{fmtCur('AED', totals.total * (+form.fxRate))}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                <Check className="h-3 w-3" /> FTA-compliant: TRN, {form.vatRate}% VAT, issue + due dates{form.currency !== 'AED' ? ' · AED equivalent on PDF' : ''}
              </div>
            </div>
          </motion.div>

          {invoices.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Recent invoices</div>
              <ul className="space-y-1 text-xs">
                {invoices.slice(0, 5).map(i => (
                  <li key={i.id} className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span className="font-semibold" style={{ color: INK }}>{i.number}</span>
                    <span className="text-slate-500">{i.clientName}</span>
                    <span className="font-bold" style={{ color: BRAND }}>{formatAED(i.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature={upgradeFeature} />
    </Shell>
  );
}

function Card({ icon: I, title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
          <I className="h-4 w-4" style={{ color: BRAND }} />
        </div>
        <h2 className="text-sm font-bold" style={{ color: INK }}>{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold" style={{ color: INK }}>{value}</span>
    </div>
  );
}

function TemplateThumb({ tpl }) {
  const banded = tpl.style === 'banded';
  return (
    <div className="aspect-[1/1.18] w-full overflow-hidden bg-white p-2 dark:bg-slate-900">
      {banded ? (
        <div className="h-3 rounded-sm" style={{ background: cssRgb(tpl.band) }} />
      ) : (
        <div className="h-3 border-b" style={{ borderColor: cssRgb(tpl.brand) }} />
      )}
      <div className="mt-1.5 h-1.5 w-1/2 rounded-sm bg-slate-200 dark:bg-slate-700" />
      <div className="mt-1 h-1 w-1/3 rounded-sm bg-slate-100 dark:bg-slate-800" />
      <div className="mt-2 space-y-0.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="h-1 flex-1 rounded-sm bg-slate-200 dark:bg-slate-700" />
            <div className="h-1 w-3 rounded-sm" style={{ background: cssRgb(tpl.accent) }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-end">
        <div className="h-1.5 w-8 rounded-sm" style={{ background: cssRgb(tpl.accent) }} />
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-600";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
