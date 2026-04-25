'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, Download, Upload, Receipt, ArrowDownLeft, ArrowUpRight,
  Trash2, X, TrendingUp, TrendingDown, Wallet, Sparkles, Camera, FileUp,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_DARK, BRAND_SOFT, BRAND_LIGHT, INK } from '@/components/dashboard/theme';
import { useLocalList, SEED_TX, CATEGORIES, formatAED, formatWhen } from '@/lib/webStore';
import CsvImportDrawer from '@/components/dashboard/CsvImportDrawer';
import { UpgradeModal } from '@/components/dashboard/PlanGate';
import { usePlan } from '@/lib/plan';

const TYPES = ['all', 'income', 'expense'];

export default function TransactionsPage() {
  return (
    <Suspense fallback={<Shell title="Transactions" subtitle="Loading…"><div className="h-96 animate-pulse rounded-2xl bg-slate-100" /></Shell>}>
      <TransactionsInner />
    </Suspense>
  );
}

function TransactionsInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { list, add, remove, setAll } = useLocalList('filey.web.tx', SEED_TX);
  const [q, setQ]       = useState('');
  const [type, setType] = useState('all');
  const [cat, setCat]   = useState('all');
  const [drawer, setDrawer] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { canUse, track } = usePlan();

  const tryOpenCsv = () => {
    if (!canUse('csvImportsPerMonth')) { setUpgradeOpen(true); return; }
    setCsvOpen(true);
  };

  // Auto-open CSV import when landing with ?import=1
  useEffect(() => {
    if (searchParams.get('import') === '1') {
      tryOpenCsv();
      router.replace('/transactions');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  const filtered = useMemo(() => {
    return list.filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (cat !== 'all' && t.category !== cat) return false;
      if (q && !(`${t.name} ${t.merchant || ''}`).toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [list, q, type, cat]);

  const totals = useMemo(() => {
    const inc = list.filter(t => t.type === 'income').reduce((s, t) => s + +t.amount, 0);
    const exp = list.filter(t => t.type === 'expense').reduce((s, t) => s + +t.amount, 0);
    const vat = list.reduce((s, t) => s + +t.vat || 0, 0);
    return { inc, exp, bal: inc - exp, vat };
  }, [list]);

  const exportCsv = () => {
    const rows = [['Date','Name','Merchant','Type','Category','Amount','VAT','Status'],
      ...list.map(t => [new Date(t.ts).toISOString(), t.name, t.merchant || '', t.type, t.category, t.amount, t.vat || 0, t.status || ''])];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `filey-transactions-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Shell
      title="Transactions"
      subtitle={`${list.length} records · ${formatAED(totals.bal)} net`}
      action={
        <div className="flex items-center gap-2">
          <button onClick={tryOpenCsv} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button onClick={exportCsv} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button onClick={() => setDrawer(true)} className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 hover:scale-[1.02]" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
            <Plus className="h-4 w-4" /> Add transaction
          </button>
        </div>
      }
    >
      {/* Totals */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatMini icon={Wallet}     label="Net balance"  value={formatAED(totals.bal)}  color={BRAND} />
        <StatMini icon={ArrowDownLeft} label="Income" value={formatAED(totals.inc)} color="#10B981" />
        <StatMini icon={ArrowUpRight}  label="Expense" value={formatAED(totals.exp)} color="#EF4444" />
        <StatMini icon={TrendingUp} label="VAT logged" value={formatAED(totals.vat)} color="#8B5CF6" />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or merchant"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
            />
          </div>
          <div className="flex gap-1">
            {TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${type === t ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} style={type === t ? { background: BRAND } : undefined}>
                {t}
              </button>
            ))}
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">VAT</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="w-10 px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && list.length === 0 && (
              <tr><td colSpan={7}>
                <EmptyState onAdd={() => setDrawer(true)} onImport={tryOpenCsv} />
              </td></tr>
            )}
            {filtered.length === 0 && list.length > 0 && (
              <tr><td colSpan={7} className="px-6 py-16 text-center">
                <div className="mx-auto max-w-sm space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Search className="h-5 w-5" /></div>
                  <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">No transactions match the current filters.</div>
                  <button onClick={() => { setQ(''); setType('all'); setCat('all'); }} className="cursor-pointer text-xs font-semibold" style={{ color: BRAND }}>Clear filters</button>
                </div>
              </td></tr>
            )}
            <AnimatePresence initial={false}>
              {filtered.map((t, i) => (
                <motion.tr
                  key={t.id}
                  layout
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`border-t border-slate-100 text-sm ${i % 2 ? 'bg-slate-50/50' : 'bg-white'} hover:bg-blue-50/40`}
                >
                  <td className="px-6 py-4 text-slate-500">{formatWhen(t.ts)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${t.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {t.type === 'income'
                          ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                          : <ArrowUpRight className="h-4 w-4 text-red-500" />}
                      </div>
                      <div>
                        <div className="font-semibold" style={{ color: INK }}>{t.name}</div>
                        <div className="text-[11px] text-slate-500">{t.merchant || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{t.category}</span></td>
                  <td className="px-6 py-4 capitalize text-slate-600">{t.type}</td>
                  <td className="px-6 py-4 text-slate-600">{formatAED(t.vat || 0)}</td>
                  <td className="px-6 py-4 text-right font-bold" style={{ color: t.type === 'income' ? '#059669' : INK }}>
                    {t.type === 'income' ? '+' : '−'}{formatAED(t.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={{ pathname: '/chat', query: { q: `Analyse this transaction: ${t.name}${t.merchant ? ' (' + t.merchant + ')' : ''}, ${t.type} ${formatAED(t.amount)}, category ${t.category}, on ${new Date(t.ts).toLocaleDateString('en-GB')}. Is the VAT treatment correct? Is it an anomaly vs my usual spending? Suggest a better category if needed.` } }}
                        title="Ask AI about this transaction"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Link>
                      <button onClick={() => remove(t.id)} title="Delete" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </motion.div>

      {/* Drawer */}
      <AnimatePresence>
        {drawer && <AddTxDrawer onClose={() => setDrawer(false)} onAdd={(x) => { add(x); setDrawer(false); }} />}
      </AnimatePresence>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="csvImportsPerMonth" />

      <CsvImportDrawer
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onImport={(rows) => { track('csvImportsPerMonth'); setAll([...rows, ...list]); }}
      />
    </Shell>
  );
}

function EmptyState({ onAdd, onImport }) {
  return (
    <div className="px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-xl text-center"
      >
        <motion.div
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 0.1 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl shadow-lg"
          style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
        >
          <Receipt className="h-10 w-10 text-white" />
        </motion.div>
        <h3 className="mt-5 text-xl font-bold" style={{ color: INK }}>No transactions yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Capture one receipt, drop a CSV from your bank, or add a transaction manually.
          All three keep your data on this device.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/scan"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
          >
            <Camera className="h-4 w-4" /> Scan a receipt
          </Link>
          <button
            onClick={onImport}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FileUp className="h-4 w-4" /> Import CSV
          </button>
          <button
            onClick={onAdd}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" /> Add manually
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function StatMini({ icon: I, label, value, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}15` }}>
          <I className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="text-lg font-bold" style={{ color: INK }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function AddTxDrawer({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: '', merchant: '', amount: '', type: 'expense', category: 'Food', status: 'Cleared',
  });
  const submit = () => {
    if (!form.name || !form.amount) return;
    const amt = +form.amount;
    onAdd({ ...form, amount: amt, vat: +(amt * 0.05).toFixed(2) });
  };
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-white p-8 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: INK }}>Add transaction</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="space-y-4">
          <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="e.g. Zain Wifi" /></Field>
          <Field label="Merchant / note"><input value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} className={inputCls} placeholder="Optional" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (AED)"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="0.00" /></Field>
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                <option>Cleared</option><option>Pending</option><option>Paid</option><option>Settled</option>
              </select>
            </Field>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex justify-between"><span>VAT (5%)</span><span className="font-semibold" style={{ color: INK }}>{formatAED((+form.amount || 0) * 0.05)}</span></div>
            <div className="flex justify-between"><span>Net</span><span className="font-semibold" style={{ color: INK }}>{formatAED((+form.amount || 0) * 0.95)}</span></div>
          </div>
          <button onClick={submit} className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105" style={{ background: BRAND }}>
            Add transaction
          </button>
        </div>
      </motion.div>
    </>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400";
function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
