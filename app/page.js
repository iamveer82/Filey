'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, Cell as ReCell,
} from 'recharts';
import {
  Search, LayoutDashboard, Receipt, ScanLine, Paperclip, Bell as BellIcon,
  CreditCard, Bot, FolderKanban, Users, BarChart3, Settings as SettingsIcon,
  Moon, Mail, Download, ChevronDown, TrendingUp, TrendingDown, ArrowRight,
  MoreHorizontal, Sparkles, Wallet, ShieldCheck, Calendar,
} from 'lucide-react';

// ─── Brand ────────────────────────────────────────────────────
const BRAND       = '#2A63E2';
const BRAND_DARK  = '#1E4BB0';
const BRAND_SOFT  = '#EBF1FF';
const BRAND_LIGHT = '#F5F8FF';
const INK         = '#0F172A';
const SLATE       = '#64748B';

// ─── Mock data ────────────────────────────────────────────────
const STATS = [
  {
    id: 'balance',
    icon: Wallet,
    label: 'Total Balance',
    value: 'AED 365,500',
    delta: '+12%',
    deltaDir: 'up',
    sub: '+AED 42,300 from last month',
  },
  {
    id: 'vat',
    icon: ShieldCheck,
    label: 'VAT Reclaimable',
    value: 'AED 2,340',
    delta: '+8%',
    deltaDir: 'up',
    sub: 'Filed Q1 PEPPOL • due May 28',
  },
  {
    id: 'bills',
    icon: BellIcon,
    label: 'Bills Due',
    value: '4',
    delta: '-3',
    deltaDir: 'down',
    sub: '−3 from last week',
  },
];

const CATEGORY_SPLIT = [
  { name: 'Utilities',    pct: 45, color: BRAND },
  { name: 'Food & Café',  pct: 30, color: '#10B981' },
  { name: 'Travel',       pct: 15, color: '#38BDF8' },
  { name: 'Misc',         pct: 10, color: '#F59E0B' },
];

const REVENUE = [
  { year: '2019', income: 120, expense: 80 },
  { year: '2020', income: 180, expense: 110 },
  { year: '2021', income: 220, expense: 150 },
  { year: '2022', income: 260, expense: 170 },
  { year: '2023', income: 310, expense: 190, highlight: true },
  { year: '2024', income: 280, expense: 200 },
  { year: '2025', income: 340, expense: 210 },
];

const TX_ROWS = [
  { name: 'Noor Creative Co.',  meta: 'Invoice #INV-2401',  loc: 'Jumeirah, Dubai',   type: 'Income',  status: 'Settled',  amount: 'AED 12,500', flag: '🇦🇪' },
  { name: 'Zain Wifi',          meta: 'Monthly subscription', loc: 'Bur Dubai',         type: 'Bill',    status: 'Paid',     amount: 'AED 310',    flag: '🇦🇪' },
  { name: 'Talabat · Lunch',    meta: 'Food & beverages',   loc: 'Al Barsha',         type: 'Expense', status: 'Cleared',  amount: 'AED 48',     flag: '🇦🇪' },
];

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar({ active = 'Dashboard' }) {
  const main = [
    { id: 'Dashboard',    icon: LayoutDashboard },
    { id: 'Transactions', icon: Receipt, badge: '12' },
    { id: 'Scan',         icon: ScanLine },
    { id: 'Clip Tools',   icon: Paperclip },
    { id: 'Bills',        icon: CreditCard },
    { id: 'Chat AI',      icon: Bot, badge: 'NEW' },
  ];
  const mgmt = [
    { id: 'Projects',     icon: FolderKanban },
    { id: 'Team',         icon: Users },
    { id: 'Reports',      icon: BarChart3 },
  ];
  return (
    <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6">
      {/* Brand */}
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: BRAND }}>
          <Paperclip className="h-5 w-5 text-white" style={{ transform: 'scaleX(-1)' }} />
        </div>
        <span className="text-xl font-bold tracking-tight" style={{ color: INK }}>Filey</span>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-14 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:bg-white"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">⌘ K</span>
      </div>

      {/* Main menu */}
      <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Main menu</div>
      <nav className="mb-6 flex flex-col gap-1">
        {main.map((it) => <NavItem key={it.id} item={it} active={active === it.id} />)}
      </nav>

      <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Management</div>
      <nav className="mb-6 flex flex-col gap-1">
        {mgmt.map((it) => <NavItem key={it.id} item={it} active={active === it.id} />)}
      </nav>

      <div className="mb-2 mt-auto px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Others</div>
      <nav className="flex flex-col gap-1">
        <NavItem item={{ id: 'Settings', icon: SettingsIcon }} />
        <button className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <span className="flex items-center gap-3">
            <Moon className="h-4 w-4" />
            Dark Mode
          </span>
          <span className="inline-flex h-5 w-9 items-center rounded-full bg-slate-200 p-0.5">
            <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
          </span>
        </button>
      </nav>
    </aside>
  );
}

function NavItem({ item, active }) {
  const I = item.icon;
  return (
    <button
      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span className="flex items-center gap-3">
        <I className="h-4 w-4" />
        {item.id}
      </span>
      {item.badge && (
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
            active ? 'bg-white/20 text-white' : 'text-white'
          }`}
          style={active ? undefined : { background: BRAND }}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

// ─── Topbar ───────────────────────────────────────────────────
function Topbar() {
  return (
    <div className="flex items-center justify-between pb-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight" style={{ color: INK }}>
          Good Morning, Veer
          <motion.span
            animate={{ rotate: [0, 18, -8, 18, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 3 }}
            className="inline-block"
          >
            👋
          </motion.span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here's your financial overview for today</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
          <Download className="h-4 w-4" />
          Export report
        </button>
        <IconBtn><Mail className="h-4 w-4 text-slate-600" /></IconBtn>
        <IconBtn dot><BellIcon className="h-4 w-4 text-slate-600" /></IconBtn>
        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition hover:bg-slate-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white" style={{ background: BRAND }}>V</div>
          <span className="text-sm font-semibold text-slate-900">Veer</span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>
      </div>
    </div>
  );
}

function IconBtn({ children, dot }) {
  return (
    <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50">
      {children}
      {dot && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full" style={{ background: BRAND }} />}
    </button>
  );
}

// ─── Stat cards ───────────────────────────────────────────────
function StatCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {STATS.map((s, i) => {
        const I = s.icon;
        const up = s.deltaDir === 'up';
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: BRAND_SOFT }}>
                  <I className="h-5 w-5" style={{ color: BRAND }} />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">{s.label}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-2xl font-bold" style={{ color: INK }}>{s.value}</span>
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                      }`}
                    >
                      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {s.delta}
                    </span>
                  </div>
                </div>
              </div>
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">{s.sub}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Category summary (left) ──────────────────────────────────
function CategorySummary() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
            <BarChart3 className="h-4 w-4" style={{ color: BRAND }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: INK }}>Spending Summary</h3>
        </div>
        <button><MoreHorizontal className="h-5 w-5 text-slate-400" /></button>
      </div>

      <div className="mt-6 flex items-end gap-2">
        <span className="text-4xl font-bold" style={{ color: INK }}>AED 27k</span>
        <span className="mb-1 inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
          <TrendingUp className="h-3 w-3" /> +12%
        </span>
      </div>

      {/* Stacked bar */}
      <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {CATEGORY_SPLIT.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ width: 0 }}
            animate={{ width: `${c.pct}%` }}
            transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: 'easeOut' }}
            style={{ background: c.color }}
          />
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {CATEGORY_SPLIT.map((c) => (
          <div key={c.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
              <span className="text-sm text-slate-700">{c.name}</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: INK }}>{c.pct} %</span>
          </div>
        ))}
      </div>

      <button className="mt-5 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
        +AED 12k from last month
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

// ─── Revenue metrics (right) ──────────────────────────────────
function RevenueMetrics() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
            <TrendingUp className="h-4 w-4" style={{ color: BRAND }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: INK }}>Annual Revenue</h3>
          <span className="ml-1 text-lg font-bold" style={{ color: INK }}>AED 310k</span>
          <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
            <TrendingUp className="h-3 w-3" /> +12%
          </span>
        </div>
        <button><MoreHorizontal className="h-5 w-5 text-slate-400" /></button>
      </div>

      <div className="mt-6 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={REVENUE} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: SLATE, fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: SLATE, fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg">
                    {label} · AED {payload[0].value}k
                  </div>
                );
              }}
            />
            <ReferenceLine y={310} stroke={BRAND} strokeDasharray="4 4" strokeOpacity={0.5} />
            <Bar dataKey="income" radius={[8, 8, 8, 8]} barSize={32}>
              {REVENUE.map((r, i) => (
                <ReCell key={i} fill={r.highlight ? BRAND : '#E2E8F0'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// ─── Transactions table (left) ────────────────────────────────
function TxTable() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
            <Receipt className="h-4 w-4" style={{ color: BRAND }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: INK }}>Recent Transactions</h3>
        </div>
        <button><MoreHorizontal className="h-5 w-5 text-slate-400" /></button>
      </div>

      <div className="mt-4 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="w-6 pb-3"><input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300" /></th>
              <th className="pb-3">Name</th>
              <th className="pb-3">Location</th>
              <th className="pb-3">Type</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {TX_ROWS.map((r, i) => (
              <tr key={i} className={`text-sm ${i === 1 ? 'rounded-lg' : ''}`} style={i === 1 ? { background: BRAND_LIGHT } : undefined}>
                <td className="py-3"><input type="checkbox" defaultChecked={i === 1} className="h-3.5 w-3.5 rounded border-slate-300" /></td>
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full font-bold text-white" style={{ background: ['#3B82F6', '#10B981', '#F59E0B'][i] }}>
                      {r.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: INK }}>{r.name}</div>
                      <div className="text-[11px] text-slate-500">{r.meta}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 text-slate-600">
                  <span className="mr-1.5">{r.flag}</span>{r.loc}
                </td>
                <td className="py-3 text-slate-600">{r.type}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      r.status === 'Settled' ? 'bg-emerald-50 text-emerald-600'
                      : r.status === 'Paid'  ? 'bg-blue-50 text-blue-600'
                                             : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="py-3 text-right font-bold" style={{ color: INK }}>{r.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ─── AI promo card (right) ────────────────────────────────────
function AiPromo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
      className="relative overflow-hidden rounded-2xl p-6 text-white"
      style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)` }}
    >
      {/* Decorative orb */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute -right-12 -bottom-12 h-60 w-60 opacity-40"
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <defs>
            <radialGradient id="orb" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="90" fill="url(#orb)" />
          {Array.from({ length: 24 }).map((_, i) => (
            <line
              key={i}
              x1="100"
              y1="10"
              x2="100"
              y2="190"
              stroke="#ffffff"
              strokeOpacity="0.15"
              strokeWidth="0.5"
              transform={`rotate(${(i * 360) / 24} 100 100)`}
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <ellipse
              key={i}
              cx="100"
              cy="100"
              rx={90 - i * 12}
              ry={30 + i * 10}
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.2"
              strokeWidth="0.5"
            />
          ))}
        </svg>
      </motion.div>

      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold">Filey AI</span>
          <ArrowRight className="ml-auto h-4 w-4 opacity-60" />
        </div>
        <div className="mt-6 text-xs font-medium text-white/70">AI Insights</div>
        <h3 className="mt-1 text-2xl font-bold leading-tight">Try Filey AI Copilot</h3>
        <p className="mt-2 text-xs text-white/70">Ask "log 500 AED to Zain" or "show VAT due Q1" — agent handles it.</p>
        <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-white py-2 pl-3 pr-4 text-sm font-semibold shadow-lg transition hover:scale-105" style={{ color: BRAND }}>
          <Sparkles className="h-4 w-4" />
          Get an insight
        </button>
      </div>
    </motion.div>
  );
}

// ─── Page shell ───────────────────────────────────────────────
export default function Page() {
  return (
    <div className="flex min-h-screen bg-[#F3F5F9] font-sans" style={{ color: INK }}>
      <Sidebar active="Dashboard" />

      <main className="flex-1 overflow-hidden p-6 md:p-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="rounded-[32px] border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm md:p-8">
            <Topbar />
            <div className="space-y-6">
              <StatCards />
              <div className="grid gap-6 md:grid-cols-3">
                <CategorySummary />
                <RevenueMetrics />
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                <TxTable />
                <AiPromo />
              </div>
            </div>

            {/* Footer strip */}
            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-4">
                <Link href="/app" className="font-medium hover:text-slate-900">Open mobile app →</Link>
                <span>v1.0 · UAE</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
