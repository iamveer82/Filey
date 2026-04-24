'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Receipt, Download,
  Calendar, FileText, PieChart as PieIcon,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_SOFT, BRAND_DARK, INK } from '@/components/dashboard/theme';
import { useLocalList, SEED_TX, formatAED } from '@/lib/webStore';

const PIE_COLORS = [BRAND, '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#F97316', '#64748B'];

function monthKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ReportsPage() {
  const { list: tx } = useLocalList('filey.web.tx', SEED_TX);
  const [range, setRange] = useState('all'); // all|month|quarter|year

  const filtered = useMemo(() => {
    const now = Date.now();
    const cut = range === 'month' ? now - 30*86400000
              : range === 'quarter' ? now - 90*86400000
              : range === 'year' ? now - 365*86400000 : 0;
    return tx.filter(t => t.ts >= cut);
  }, [tx, range]);

  const stats = useMemo(() => {
    const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + +t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + +t.amount, 0);
    const vatIn  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + (+t.vat || 0), 0);
    const vatOut = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (+t.vat || 0), 0);
    return { income, expense, net: income - expense, vatOwed: vatIn, vatReclaim: vatOut, vatNet: vatIn - vatOut };
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map = {};
    filtered.filter(t => t.type === 'expense').forEach((t) => {
      map[t.category] = (map[t.category] || 0) + +t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const byMonth = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      const k = monthKey(t.ts);
      if (!map[k]) map[k] = { month: k, income: 0, expense: 0 };
      if (t.type === 'income') map[k].income += +t.amount;
      else map[k].expense += +t.amount;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [filtered]);

  const exportPDFReport = () => {
    const html = `<!doctype html><html><head><title>Filey Report</title>
      <style>body{font-family:-apple-system,sans-serif;padding:40px;color:#0F172A}h1{color:${BRAND}}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #E2E8F0;padding:8px;text-align:left;font-size:13px}th{background:#F8FAFC}</style>
      </head><body>
      <h1>Filey VAT Report</h1>
      <p>Range: <strong>${range}</strong> · Generated: ${new Date().toLocaleString()}</p>
      <h2>Summary</h2>
      <table>
        <tr><th>Income</th><td>${formatAED(stats.income)}</td></tr>
        <tr><th>Expense</th><td>${formatAED(stats.expense)}</td></tr>
        <tr><th>Net</th><td>${formatAED(stats.net)}</td></tr>
        <tr><th>VAT owed (output)</th><td>${formatAED(stats.vatOwed)}</td></tr>
        <tr><th>VAT reclaimable (input)</th><td>${formatAED(stats.vatReclaim)}</td></tr>
        <tr><th>Net VAT payable</th><td><strong>${formatAED(stats.vatNet)}</strong></td></tr>
      </table>
      <h2>Transactions</h2>
      <table><tr><th>Date</th><th>Name</th><th>Type</th><th>Category</th><th>Amount</th><th>VAT</th></tr>
      ${filtered.map(t => `<tr><td>${new Date(t.ts).toLocaleDateString()}</td><td>${t.name}</td><td>${t.type}</td><td>${t.category}</td><td>${formatAED(t.amount)}</td><td>${formatAED(t.vat || 0)}</td></tr>`).join('')}
      </table>
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close(); w.print();
  };

  return (
    <Shell
      title="Reports"
      subtitle={`${filtered.length} transactions · VAT net ${formatAED(stats.vatNet)}`}
      action={
        <button onClick={exportPDFReport} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:scale-105" style={{ background: BRAND }}>
          <Download className="h-4 w-4" /> Export PDF
        </button>
      }
    >
      {/* Range filter */}
      <div className="flex items-center gap-2">
        {[['all','All time'],['year','Year'],['quarter','Quarter'],['month','Month']].map(([k, label]) => (
          <button key={k} onClick={() => setRange(k)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${range === k ? 'text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}
            style={range === k ? { background: BRAND } : undefined}>
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={TrendingUp} label="Income" value={formatAED(stats.income)} color="#10B981" />
        <StatCard icon={TrendingDown} label="Expense" value={formatAED(stats.expense)} color="#EF4444" />
        <StatCard icon={DollarSign} label="Net profit" value={formatAED(stats.net)} color={BRAND} />
        <StatCard icon={Receipt} label="Net VAT payable" value={formatAED(stats.vatNet)} color="#8B5CF6" />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard icon={BarChart3} title="Income vs Expense (last 6 mo)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 12 }} formatter={(v) => formatAED(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income"  name="Income"  fill={BRAND}     radius={[8,8,0,0]} />
              <Bar dataKey="expense" name="Expense" fill="#EF4444"   radius={[8,8,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={PieIcon} title="Spending by category">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2}>
                {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 12 }} formatter={(v) => formatAED(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* VAT summary */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
            <FileText className="h-4 w-4" style={{ color: BRAND }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: INK }}>UAE VAT snapshot</h3>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <VATRow label="Output VAT (on sales)" value={stats.vatOwed} sub="5% charged on income" color="#10B981" />
          <VATRow label="Input VAT (reclaimable)" value={stats.vatReclaim} sub="5% paid on expenses" color="#3B82F6" />
          <VATRow label="Net payable to FTA" value={stats.vatNet} sub={stats.vatNet >= 0 ? 'You owe' : 'FTA owes you'} color={stats.vatNet >= 0 ? '#EF4444' : '#10B981'} big />
        </div>
        <div className="mt-5 rounded-xl bg-blue-50 p-4 text-xs text-blue-800">
          <strong>Next filing deadline:</strong> 28 {new Date(Date.now() + 30*86400000).toLocaleDateString('en-GB', { month: 'long' })}. File via the FTA EmaraTax portal before the deadline to avoid AED 1,000 late penalty.
        </div>
      </div>

      {/* Top categories list */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
            <BarChart3 className="h-4 w-4" style={{ color: BRAND }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: INK }}>Top spending categories</h3>
        </div>
        <div className="space-y-3">
          {byCategory.slice(0, 6).map((c, i) => {
            const max = byCategory[0]?.value || 1;
            const pct = (c.value / max) * 100;
            return (
              <div key={c.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold" style={{ color: INK }}>{c.name}</span>
                  <span className="text-slate-600">{formatAED(c.value)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.05 }}
                    className="h-full rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                </div>
              </div>
            );
          })}
          {byCategory.length === 0 && <div className="py-12 text-center text-sm text-slate-400">No expense data in this range</div>}
        </div>
      </div>
    </Shell>
  );
}

function StatCard({ icon: I, label, value, color }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}15` }}>
          <I className="h-5 w-5" style={{ color }} />
        </div>
      </div>
      <div className="mt-4 text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color: INK }}>{value}</div>
    </motion.div>
  );
}

function ChartCard({ icon: I, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
          <I className="h-4 w-4" style={{ color: BRAND }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: INK }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function VATRow({ label, value, sub, color, big }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={`mt-1 font-bold ${big ? 'text-3xl' : 'text-xl'}`} style={{ color }}>{formatAED(value)}</div>
      <div className="mt-1 text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}
