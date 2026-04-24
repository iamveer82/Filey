'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban, Plus, Calendar, Target, Check, Circle, X, Trash2,
  TrendingUp, Briefcase, Clock,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_SOFT, INK } from '@/components/dashboard/theme';
import { useLocalList, SEED_PROJECTS, formatAED } from '@/lib/webStore';

const STATUS_COLORS = {
  active:    { tint: '#DBEAFE', text: '#2563EB', label: 'Active' },
  completed: { tint: '#DCFCE7', text: '#16A34A', label: 'Completed' },
  paused:    { tint: '#FEF3C7', text: '#D97706', label: 'Paused' },
  archived:  { tint: '#F1F5F9', text: '#64748B', label: 'Archived' },
};

function daysLeft(iso) {
  const d = new Date(iso);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

export default function ProjectsPage() {
  const { list, add, remove, update } = useLocalList('filey.web.projects', SEED_PROJECTS);
  const [drawer, setDrawer] = useState(false);
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => filter === 'all' ? list : list.filter(p => p.status === filter), [list, filter]);

  const totals = useMemo(() => ({
    budget: list.reduce((s, p) => s + +p.budget, 0),
    spent:  list.reduce((s, p) => s + +p.spent,  0),
    active: list.filter(p => p.status === 'active').length,
    done:   list.filter(p => p.status === 'completed').length,
  }), [list]);

  return (
    <Shell
      title="Projects"
      subtitle={`${list.length} projects · ${formatAED(totals.spent)} of ${formatAED(totals.budget)} budget used`}
      action={
        <button onClick={() => setDrawer(true)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:scale-105" style={{ background: BRAND }}>
          <Plus className="h-4 w-4" /> New project
        </button>
      }
    >
      {/* Totals */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Briefcase} label="Total budget" value={formatAED(totals.budget)} color={BRAND} />
        <StatCard icon={TrendingUp} label="Total spent" value={formatAED(totals.spent)} color="#EF4444" />
        <StatCard icon={Circle} label="Active" value={totals.active} color="#10B981" />
        <StatCard icon={Check} label="Completed" value={totals.done} color="#8B5CF6" />
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        {[['all','All'],['active','Active'],['completed','Completed'],['paused','Paused']].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${filter === k ? 'text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            style={filter === k ? { background: BRAND } : undefined}>
            {label}
          </button>
        ))}
      </div>

      {/* Project grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {filtered.map((p, i) => {
            const pct = Math.min(100, Math.round((p.spent / p.budget) * 100));
            const dl = daysLeft(p.deadline);
            const over = pct > 100;
            const cfg = STATUS_COLORS[p.status] || STATUS_COLORS.active;
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: BRAND_SOFT }}>
                      <FolderKanban className="h-5 w-5" style={{ color: BRAND }} />
                    </div>
                    <div>
                      <div className="font-bold" style={{ color: INK }}>{p.name}</div>
                      <div className="text-xs text-slate-500">{p.client}</div>
                    </div>
                  </div>
                  <button onClick={() => remove(p.id)} className="opacity-0 transition group-hover:opacity-100">
                    <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                  </button>
                </div>

                <div className="mt-5">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500">Budget</span>
                    <span className="font-semibold" style={{ color: INK }}>{formatAED(p.spent)} / {formatAED(p.budget)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8, delay: i * 0.05 + 0.2 }}
                      className="h-full rounded-full" style={{ background: over ? '#EF4444' : pct > 80 ? '#F59E0B' : BRAND }} />
                  </div>
                  <div className="mt-1 text-right text-[11px] font-bold" style={{ color: over ? '#EF4444' : INK }}>{pct}% used</div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {dl < 0 ? `${-dl}d overdue` : dl === 0 ? 'Due today' : `${dl}d left`}
                  </span>
                  <select
                    value={p.status}
                    onChange={(e) => update(p.id, { status: e.target.value })}
                    className="cursor-pointer rounded-md border-0 px-2 py-0.5 text-[11px] font-bold outline-none"
                    style={{ background: cfg.tint, color: cfg.text }}
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
            <FolderKanban className="mx-auto h-10 w-10 text-slate-300" />
            <div className="mt-3 text-sm font-semibold text-slate-500">No projects in this filter</div>
            <button onClick={() => setDrawer(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: BRAND }}>
              <Plus className="h-4 w-4" /> Create project
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {drawer && <NewProjectDrawer onClose={() => setDrawer(false)} onAdd={(x) => { add(x); setDrawer(false); }} />}
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

function NewProjectDrawer({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: '', client: '', budget: 10000,
    deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: 'active',
  });
  const submit = () => {
    if (!form.name || !form.client) return;
    onAdd({ ...form, budget: +form.budget, spent: 0 });
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
          <h2 className="text-xl font-bold" style={{ color: INK }}>New project</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="space-y-4">
          <Field label="Project name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Website redesign" /></Field>
          <Field label="Client"><input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} className={inputCls} placeholder="Al Futtaim" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Budget (AED)"><input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className={inputCls} /></Field>
            <Field label="Deadline"><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <button onClick={submit} className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105" style={{ background: BRAND }}>
            Create project
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
