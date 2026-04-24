'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Bell, Receipt, BarChart3, TrendingUp, TrendingDown, ArrowRight,
  MoreHorizontal, Sparkles, Wallet, ShieldCheck,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import InsightsCard from '@/components/dashboard/InsightsCard';
import PrivacyBanner from '@/components/dashboard/PrivacyBanner';
import OnboardingCards from '@/components/dashboard/OnboardingCards';
import { BRAND, BRAND_DARK, BRAND_SOFT, BRAND_LIGHT, INK } from '@/components/dashboard/theme';

// Lazy-load recharts (~120KB) — dashboard paints first without it
const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart'), {
  ssr: false,
  loading: () => <div className="h-[260px] w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />,
});

const STATS = [
  { id: 'balance', href: '/transactions', icon: Wallet,       label: 'Total Balance',    value: 'AED 365,500', delta: '+12%', up: true,  sub: '+AED 42,300 from last month' },
  { id: 'vat',     href: '/reports',      icon: ShieldCheck,  label: 'VAT Reclaimable',  value: 'AED 2,340',   delta: '+8%',  up: true,  sub: 'Filed Q1 PEPPOL • due May 28' },
  { id: 'bills',   href: '/bills',        icon: Bell,         label: 'Bills Due',        value: '4',           delta: '-3',   up: false, sub: '−3 from last week' },
];

const CATEGORY = [
  { name: 'Utilities',   pct: 45, color: BRAND },
  { name: 'Food & Café', pct: 30, color: '#10B981' },
  { name: 'Travel',      pct: 15, color: '#38BDF8' },
  { name: 'Misc',        pct: 10, color: '#F59E0B' },
];

const TX_ROWS = [
  { name: 'Noor Creative Co.', meta: 'Invoice #INV-2401',   loc: 'Jumeirah, Dubai', type: 'Income',  status: 'Settled', amount: 'AED 12,500' },
  { name: 'Zain Wifi',         meta: 'Monthly subscription', loc: 'Bur Dubai',       type: 'Bill',    status: 'Paid',    amount: 'AED 310' },
  { name: 'Talabat · Lunch',   meta: 'Food & beverages',     loc: 'Al Barsha',       type: 'Expense', status: 'Cleared', amount: 'AED 48' },
];

export default function HomePage() {
  return (
    <Shell title="Good Morning, Veer" subtitle="Here's your financial overview for today" wave>
      {/* First-run onboarding (self-hides once tx seeded + AI configured, or dismissed) */}
      <OnboardingCards />

      {/* Privacy trust banner — dismissible */}
      <PrivacyBanner variant="banner" />

      {/* AI Insights — computed from user's real ledger */}
      <InsightsCard />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {STATS.map((s, i) => {
          const I = s.icon;
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }} className="card-hover rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: BRAND_SOFT }}>
                    <I className="h-5 w-5" style={{ color: BRAND }} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500">{s.label}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-2xl font-bold" style={{ color: INK }}>{s.value}</span>
                      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${s.up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                        {s.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {s.delta}
                      </span>
                    </div>
                  </div>
                </div>
                <Link href={s.href} aria-label={`Open ${s.label}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-3 text-xs text-slate-500">{s.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Category + Revenue */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Category */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="rounded-2xl border border-slate-200 bg-white p-6">
          <SectionHead icon={BarChart3} title="Spending Summary" />
          <div className="mt-6 flex items-end gap-2">
            <span className="text-4xl font-bold" style={{ color: INK }}>AED 27k</span>
            <span className="mb-1 inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3" /> +12%
            </span>
          </div>
          <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {CATEGORY.map((c, i) => (
              <motion.div key={c.name} initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: 'easeOut' }} style={{ background: c.color }} />
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {CATEGORY.map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
                  <span className="text-sm text-slate-700">{c.name}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: INK }}>{c.pct} %</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Revenue */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2">
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
            <RevenueChart />
          </div>
        </motion.div>
      </div>

      {/* Tx + AI */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Tx */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }} className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2">
          <SectionHead icon={Receipt} title="Recent Transactions" href="/transactions" />
          <div className="mt-4 overflow-x-auto">
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
                  <tr key={i} className="text-sm" style={i === 1 ? { background: BRAND_LIGHT } : undefined}>
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
                    <td className="py-3 text-slate-600">🇦🇪 {r.loc}</td>
                    <td className="py-3 text-slate-600">{r.type}</td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        r.status === 'Settled' ? 'bg-emerald-50 text-emerald-600' :
                        r.status === 'Paid'    ? 'bg-blue-50 text-blue-600' :
                                                 'bg-amber-50 text-amber-600'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold" style={{ color: INK }}>{r.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/transactions" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: BRAND }}>
            View all transactions <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>

        {/* AI promo */}
        <Link href="/chat" className="block" aria-label="Open Chat AI">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45 }} className="relative h-full overflow-hidden rounded-2xl p-6 text-white transition hover:shadow-xl" style={{ background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)` }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-12 -bottom-12 h-60 w-60 opacity-40">
            <svg viewBox="0 0 200 200" className="h-full w-full">
              <defs>
                <radialGradient id="orb2" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="100" cy="100" r="90" fill="url(#orb2)" />
              {Array.from({ length: 24 }).map((_, i) => (
                <line key={i} x1="100" y1="10" x2="100" y2="190" stroke="#fff" strokeOpacity="0.15" strokeWidth="0.5" transform={`rotate(${(i * 360) / 24} 100 100)`} />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <ellipse key={i} cx="100" cy="100" rx={90 - i * 12} ry={30 + i * 10} fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="0.5" />
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
            <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white py-2 pl-3 pr-4 text-sm font-semibold shadow-lg transition hover:scale-105" style={{ color: BRAND }}>
              <Sparkles className="h-4 w-4" />
              Get an insight
            </span>
          </div>
        </motion.div>
        </Link>
      </div>
    </Shell>
  );
}

function SectionHead({ icon: I, title, href }) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
          <I className="h-4 w-4" style={{ color: BRAND }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: INK }}>{title}</h3>
      </div>
      {href ? (
        <Link href={href} aria-label={`Open ${title}`}><MoreHorizontal className="h-5 w-5 text-slate-400 hover:text-slate-700" /></Link>
      ) : (
        <button aria-label="More"><MoreHorizontal className="h-5 w-5 text-slate-400" /></button>
      )}
    </div>
  );
}
