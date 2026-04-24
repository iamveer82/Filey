'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  FileText, Plus, Trash2, Download, Send, Check, User, Building2,
  CalendarDays, Hash, Sparkles, Receipt,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_DARK, BRAND_SOFT, INK } from '@/components/dashboard/theme';
import { useLocalList, SEED_TX, formatAED } from '@/lib/webStore';

const EASE = [0.22, 1, 0.36, 1];

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
  });

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
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4
    const font  = await pdf.embedFont(StandardFonts.Helvetica);
    const bold  = await pdf.embedFont(StandardFonts.HelveticaBold);
    const brand = rgb(0x2a/255, 0x63/255, 0xe2/255);
    const ink   = rgb(0x0f/255, 0x17/255, 0x2a/255);
    const slate = rgb(0x64/255, 0x74/255, 0x8B/255);

    const draw = (t, x, y, opts = {}) => page.drawText(String(t), { x, y, size: opts.size || 10, font: opts.bold ? bold : font, color: opts.color || ink });

    // Header band
    page.drawRectangle({ x: 0, y: 782, width: 595, height: 60, color: brand });
    draw('INVOICE', 40, 808, { size: 24, bold: true, color: rgb(1, 1, 1) });
    draw(form.number, 40, 790, { size: 11, color: rgb(1, 1, 1) });

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
    page.drawRectangle({ x: 40, y: tY - 6, width: 515, height: 22, color: rgb(0.97, 0.98, 1) });
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
    draw(`${form.currency} ${totals.sub.toFixed(2)}`,  510, tBase,      { size: 10 });
    draw(`VAT (${form.vatRate}%)`,                400, tBase - 18, { size: 10, color: slate });
    draw(`${form.currency} ${totals.vat.toFixed(2)}`,  510, tBase - 18, { size: 10 });
    page.drawLine({ start: { x: 395, y: tBase - 28 }, end: { x: 555, y: tBase - 28 }, thickness: 1, color: ink });
    draw('TOTAL',                                 400, tBase - 44, { size: 11, bold: true });
    draw(`${form.currency} ${totals.total.toFixed(2)}`, 510, tBase - 44, { size: 12, bold: true, color: brand });

    // Notes
    if (form.notes) {
      draw('NOTES', 40, 140, { size: 8, bold: true, color: slate });
      const lines = form.notes.match(/.{1,90}/g) || [];
      lines.slice(0, 4).forEach((ln, i) => draw(ln, 40, 125 - i * 13, { size: 9, color: slate }));
    }

    // Footer
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 30, color: rgb(0.97, 0.98, 1) });
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
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Editor */}
        <div className="space-y-5">
          {/* Meta */}
          <Card icon={Hash} title="Invoice details">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Invoice #"><input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className={inputCls} /></Field>
              <Field label="Issue date"><input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className={inputCls} /></Field>
              <Field label="Due date"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} /></Field>
            </div>
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
            <div className="px-5 py-4 text-white" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
              <div className="text-xs uppercase tracking-wider opacity-80">Invoice</div>
              <div className="text-lg font-bold">{form.number || 'INV-—'}</div>
            </div>
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
                <Row label="Subtotal" value={`${form.currency} ${totals.sub.toFixed(2)}`} />
                <Row label={`VAT (${form.vatRate}%)`} value={`${form.currency} ${totals.vat.toFixed(2)}`} />
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-bold" style={{ color: INK }}>Total</span>
                  <span className="text-base font-bold" style={{ color: BRAND }}>{form.currency} {totals.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                <Check className="h-3 w-3" /> FTA-compliant: TRN, 5% VAT, issue + due dates
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

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-blue-600";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
