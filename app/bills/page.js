'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Bell, BellOff, Trash2, X, CalendarDays, Wifi, Zap, Droplet,
  Music, Tv, Phone, CreditCard, ShoppingCart, Home as HomeIcon, Car,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_SOFT, INK } from '@/components/dashboard/theme';
import { useLocalList, SEED_BILLS, formatAED } from '@/lib/webStore';

const ICONS = {
  electric: { icon: Zap,          tint: '#FEF3C7', color: '#D97706' },
  wifi:     { icon: Wifi,         tint: '#DBEAFE', color: '#2563EB' },
  water:    { icon: Droplet,      tint: '#E0F2FE', color: '#0284C7' },
  netflix:  { icon: Tv,           tint: '#FEE2E2', color: '#DC2626' },
  spotify:  { icon: Music,        tint: '#DCFCE7', color: '#16A34A' },
  phone:    { icon: Phone,        tint: '#F3E8FF', color: '#9333EA' },
  creditcard: { icon: CreditCard, tint: '#FEF3C7', color: '#D97706' },
  cart:     { icon: ShoppingCart, tint: '#FFEDD5', color: '#EA580C' },
  home:     { icon: HomeIcon,     tint: '#E0F2FE', color: '#0284C7' },
  car:      { icon: Car,          tint: '#E2E8F0', color: '#475569' },
  misc:     { icon: CreditCard,   tint: '#EBF1FF', color: BRAND },
};

function guessIcon(name) {
  const n = (name || '').toLowerCase();
  if (/dewa|electric|power|elec/.test(n)) return 'electric';
  if (/etisalat|du|wifi|inter|fiber/.test(n)) return 'wifi';
  if (/water/.test(n)) return 'water';
  if (/netflix|prime|tv|shahid/.test(n)) return 'netflix';
  if (/spotify|music/.test(n)) return 'spotify';
  if (/phone|mobile|postpaid/.test(n)) return 'phone';
  if (/card|credit|visa/.test(n)) return 'creditcard';
  if (/rent|lease/.test(n)) return 'home';
  if (/car|salik|rta/.test(n)) return 'car';
  return 'misc';
}

function daysUntil(iso) {
  const d = new Date(iso);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
}

export default function BillsPage() {
  const { list, add, remove, update } = useLocalList('filey.web.bills', SEED_BILLS);
  const [drawer, setDrawer] = useState(false);

  const sorted = useMemo(() => [...list].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)), [list]);
  const totals = useMemo(() => ({
    count: list.length,
    sum: list.reduce((s, b) => s + +b.amount, 0),
    overdue: list.filter(b => daysUntil(b.dueDate) < 0).length,
    reminders: list.filter(b => b.reminder).length,
  }), [list]);

  return (
    <Shell
      title="Bills"
      subtitle={`${totals.count} bills · ${formatAED(totals.sum)} pending`}
      action={
        <button onClick={() => setDrawer(true)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:scale-105" style={{ background: BRAND }}>
          <Plus className="h-4 w-4" /> Add bill
        </button>
      }
    >
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={CreditCard} label="Total pending" value={formatAED(totals.sum)} color={BRAND} />
        <StatCard icon={CalendarDays} label="Bills tracked" value={totals.count} color="#10B981" />
        <StatCard icon={Bell} label="Reminders on" value={totals.reminders} color="#8B5CF6" />
        <StatCard icon={BellOff} label="Overdue" value={totals.overdue} color="#EF4444" />
      </div>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {sorted.map((b, i) => {
            const ic = ICONS[b.iconId || 'misc'] || ICONS.misc;
            const I = ic.icon;
            const days = daysUntil(b.dueDate);
            const overdue = days < 0;
            return (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: ic.tint }}>
                      <I className="h-5 w-5" style={{ color: ic.color }} />
                    </div>
                    <div>
                      <div className="font-bold" style={{ color: INK }}>{b.name}</div>
                      <div className="text-xs text-slate-500">Due {new Date(b.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                    </div>
                  </div>
                  <button onClick={() => remove(b.id)} className="opacity-0 transition group-hover:opacity-100"><Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" /></button>
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div className="text-3xl font-bold" style={{ color: INK }}>{formatAED(b.amount)}</div>
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    overdue ? 'bg-red-50 text-red-600' :
                    days <= 3 ? 'bg-amber-50 text-amber-600' :
                                'bg-emerald-50 text-emerald-600'
                  }`}>
                    {overdue ? `${-days}d overdue` : days === 0 ? 'Today' : `in ${days}d`}
                  </span>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-xs font-semibold text-slate-500">Reminder</span>
                  <button onClick={() => update(b.id, { reminder: !b.reminder })} className={`inline-flex h-6 w-11 items-center rounded-full p-0.5 transition ${b.reminder ? '' : 'bg-slate-200'}`} style={b.reminder ? { background: BRAND } : undefined}>
                    <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${b.reminder ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {drawer && <AddBillDrawer onClose={() => setDrawer(false)} onAdd={(x) => { add(x); setDrawer(false); }} />}
      </AnimatePresence>
    </Shell>
  );
}

function StatCard({ icon: I, label, value, color }) {
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

function AddBillDrawer({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: '', amount: '', dueDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10), reminder: true,
  });
  const submit = () => {
    if (!form.name || !form.amount) return;
    onAdd({ ...form, amount: +form.amount, iconId: guessIcon(form.name), brand: form.name.toLowerCase() });
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
          <h2 className="text-xl font-bold" style={{ color: INK }}>Add bill</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="space-y-4">
          <Field label="Bill name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="e.g. DEWA, Netflix, Etisalat" /></Field>
          <Field label="Amount (AED)"><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="0.00" /></Field>
          <Field label="Due date"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} /></Field>
          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-sm font-semibold text-slate-700">Remind me before due date</span>
            <button onClick={() => setForm({ ...form, reminder: !form.reminder })} className={`inline-flex h-6 w-11 items-center rounded-full p-0.5 transition ${form.reminder ? '' : 'bg-slate-200'}`} style={form.reminder ? { background: BRAND } : undefined}>
              <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.reminder ? 'translate-x-5' : ''}`} />
            </button>
          </label>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700">
            Icon auto-detected: <strong>{guessIcon(form.name)}</strong>
          </div>
          <button onClick={submit} className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105" style={{ background: BRAND }}>
            Add bill
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
