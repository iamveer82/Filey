'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Bell, Receipt, BarChart3, TrendingUp, TrendingDown, ArrowRight,
  MoreHorizontal, Sparkles, Wallet, ShieldCheck,
  ScanLine, Layers, Wand2, Tag, FileSpreadsheet, Server, GitCompare, FileText,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import FirstVisitGate from '@/components/dashboard/FirstVisitGate';
import InsightsCard from '@/components/dashboard/InsightsCard';
import PrivacyBanner from '@/components/dashboard/PrivacyBanner';
import OnboardingCards from '@/components/dashboard/OnboardingCards';
import { BRAND, BRAND_DARK, BRAND_SOFT, BRAND_LIGHT, INK } from '@/components/dashboard/theme';
import { useLocalList, SEED_TX, SEED_BILLS, computeInsights, formatAED } from '@/lib/webStore';

// Lazy-load recharts (~120KB) — dashboard paints first without it
const RevenueChart = dynamic(() => import('@/components/dashboard/RevenueChart'), {
  ssr: false,
  loading: () => <div className="h-[260px] w-full animate-pulse rounded-xl bg-slate-100" />,
});

export default function HomePage() {
  const { list: tx } = useLocalList('filey.web.tx', SEED_TX);
  const { list: bills } = useLocalList('filey.web.bills', SEED_BILLS);

  // ── Compute real stats ────────────────────────────────────────
  const ins = computeInsights({ tx, bills });

  const totalIncome = tx.filter(t => t.type === 'income').reduce((s, t) => s + (+t.amount || 0), 0);
  const totalExpense = tx.filter(t => t.type === 'expense').reduce((s, t) => s + (+t.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  const prevIncome = tx.filter(t => t.type === 'income' && t.ts < Date.now() - 30 * 86_400_000 && t.ts >= Date.now() - 60 * 86_400_000).reduce((s, t) => s + (+t.amount || 0), 0);
  const prevExpense = tx.filter(t => t.type === 'expense' && t.ts < Date.now() - 30 * 86_400_000 && t.ts >= Date.now() - 60 * 86_400_000).reduce((s, t) => s + (+t.amount || 0), 0);
  const prevNet = prevIncome - prevExpense;
  const netChange = ins.net30 - prevNet;
  const netPct = prevNet !== 0 ? Math.round((netChange / Math.abs(prevNet)) * 100) : (ins.net30 > 0 ? 100 : 0);

  const upcomingBills = bills.filter(b => b.dueDate && new Date(b.dueDate).getTime() > Date.now()).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const billsDue = upcomingBills.length;

  const stats = [
    {
      id: 'balance', href: '/transactions', icon: Wallet,
      label: 'Total Balance',
      value: formatAED(balance),
      delta: `${netChange >= 0 ? '+' : ''}${netPct}%`,
      up: netChange >= 0,
      sub: `${netChange >= 0 ? '+' : ''}${formatAED(Math.abs(netChange)).replace('AED ', 'AED ')} vs last 30 days`,
    },
    {
      id: 'vat', href: '/reports', icon: ShieldCheck,
      label: 'VAT Reclaimable',
      value: formatAED(Math.abs(ins.vatNet)),
      delta: ins.vatNet >= 0 ? '+8%' : '-8%',
      up: ins.vatNet < 0,
      sub: ins.vatNet >= 0 ? `Payable Q1 · ${formatAED(ins.vatNet)}` : `Refundable Q1 · ${formatAED(Math.abs(ins.vatNet))}`,
    },
    {
      id: 'bills', href: '/bills', icon: Bell,
      label: 'Bills Due',
      value: String(billsDue),
      delta: billsDue > 0 ? `+${billsDue}` : '0',
      up: false,
      sub: billsDue > 0 ? `Next: ${upcomingBills[0]?.name} · ${formatAED(upcomingBills[0]?.amount)}` : 'All clear for next 14 days',
    },
  ];

  // ── Category breakdown ──────────────────────────────────────
  const byCategory = {};
  tx.filter(t => t.type === 'expense' && t.ts >= Date.now() - 30 * 86_400_000).forEach(t => {
    byCategory[t.category || 'Other'] = (byCategory[t.category || 'Other'] || 0) + (+t.amount || 0);
  });
  const catTotal = Object.values(byCategory).reduce((a, b) => a + b, 0) || 1;
  const spendingTotal30 = Object.values(byCategory).reduce((a, b) => a + b, 0);
  const categoryColors = { Utilities: BRAND, Food: '#10B981', Travel: '#38BDF8', Freelance: '#F59E0B', Supplies: '#8B5CF6', Software: '#EC4899', Marketing: '#06B6D4', Rent: '#F97316', Other: '#94A3B8' };
  const categories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, amount]) => ({ name, pct: Math.round((amount / catTotal) * 100), color: categoryColors[name] || '#94A3B8' }));
  if (categories.length === 0) {
    categories.push({ name: 'No data', pct: 100, color: '#CBD5E1' });
  }

  // ── Recent transactions ─────────────────────────────────────
  const recentTx = tx.slice().sort((a, b) => b.ts - a.ts).slice(0, 5);

  return (
    <FirstVisitGate>
    <Shell fixed title="Good Morning, Veer" subtitle="Here's your financial overview for today" wave>
      <div className="flex-shrink-0"><OnboardingCards /></div>
      <div className="flex-shrink-0"><PrivacyBanner variant="banner" /></div>
      <div className="flex-shrink-0"><InsightsCard /></div>
      <div className="flex-shrink-0"><QuickActions /></div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 flex-shrink-0">
        {stats.map((s, i) => {
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
      <div className="grid gap-6 md:grid-cols-3 flex-shrink-0">
        {/* Category */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="rounded-2xl border border-slate-200 bg-white p-6">
          <SectionHead icon={BarChart3} title="Spending Summary" />
          <div className="mt-6 flex items-end gap-2">
            <span className="text-4xl font-bold" style={{ color: INK }}>{spendingTotal30 >= 1000 ? `AED ${Math.round(spendingTotal30 / 1000)}k` : formatAED(spendingTotal30)}</span>
            <span className="mb-1 inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3" /> +12%
            </span>
          </div>
          <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {categories.map((c, i) => (
              <motion.div key={c.name} initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ duration: 0.8, delay: 0.4 + i * 0.1, ease: 'easeOut' }} style={{ background: c.color }} />
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {categories.map((c) => (
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
      <div className="grid gap-6 md:grid-cols-3 flex-1 min-h-0 overflow-hidden">
        {/* Tx */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }} className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2 flex flex-col h-full overflow-hidden">
          <div className="flex-shrink-0"><SectionHead icon={Receipt} title="Recent Transactions" href="/transactions" /></div>
          <div className="mt-4 overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10">
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
                {recentTx.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">No transactions yet</td></tr>
                )}
                {recentTx.map((r, i) => {
                  const avatarColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
                  const capitalizedType = r.type ? r.type.charAt(0).toUpperCase() + r.type.slice(1) : '';
                  return (
                    <tr key={r.id || i} className="text-sm">
                      <td className="py-3"><input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300" /></td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full font-bold text-white" style={{ background: avatarColors[i % avatarColors.length] }}>
                            {(r.name || '?').charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold" style={{ color: INK }}>{r.name}</div>
                            <div className="text-[11px] text-slate-500">{r.merchant || r.category || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600">🇦🇪 Dubai</td>
                      <td className="py-3 text-slate-600">{capitalizedType}</td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          r.status === 'Settled' ? 'bg-emerald-50 text-emerald-600' :
                          r.status === 'Paid'    ? 'bg-blue-50 text-blue-600' :
                                                   'bg-amber-50 text-amber-600'
                        }`}>
                          {r.status || 'Cleared'}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold" style={{ color: INK }}>{formatAED(r.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Link href="/transactions" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold flex-shrink-0" style={{ color: BRAND }}>
            View all transactions <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>

        {/* AI promo */}
        <Link href="/chat" className="block h-full" aria-label="Open Chat AI">
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
    </FirstVisitGate>
  );
}

const QUICK_ACTIONS = [
  { href: '/scan',          icon: ScanLine,        label: 'Scan receipt',     desc: 'OCR + AI extract',     tone: 'blue'    },
  { href: '/bulk',          icon: Layers,          label: 'Bulk import',      desc: 'Drop many at once',    tone: 'violet'  },
  { href: '/invoice',       icon: FileText,        label: 'New invoice',      desc: 'Multi-currency + FX',  tone: 'emerald' },
  { href: '/categories',    icon: Tag,             label: 'Categories',       desc: 'Custom rules',         tone: 'amber'   },
  { href: '/transactions',  icon: FileSpreadsheet, label: 'Export XLSX',      desc: 'CSV + Excel',          tone: 'sky'     },
  { href: '/vs-taxhacker',  icon: GitCompare,      label: 'vs TaxHacker',     desc: 'Feature matrix',       tone: 'rose'    },
  { href: '/self-host',     icon: Server,          label: 'Self-host',        desc: 'Docker in 60s',        tone: 'slate'   },
  { href: '/chat',          icon: Wand2,           label: 'Ask Filey AI',     desc: 'BYOK copilot',         tone: 'indigo'  },
];

const TONE_BG = {
  blue:    '#EBF1FF',
  violet:  '#F3EEFF',
  emerald: '#E6F8F0',
  amber:   '#FFF4E0',
  sky:     '#E0F2FE',
  rose:    '#FFE4E9',
  slate:   '#F1F5F9',
  indigo:  '#E0E7FF',
};
const TONE_FG = {
  blue:    BRAND,
  violet:  '#7C3AED',
  emerald: '#059669',
  amber:   '#D97706',
  sky:     '#0284C7',
  rose:    '#E11D48',
  slate:   '#475569',
  indigo:  '#4F46E5',
};

function QuickActions() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
            <Sparkles className="h-4 w-4" style={{ color: BRAND }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: INK }}>Quick actions</h3>
          <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">NEW</span>
        </div>
        <Link href="/welcome#features" className="text-xs font-semibold" style={{ color: BRAND }}>See all features →</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {QUICK_ACTIONS.map((a) => {
          const I = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              aria-label={a.label}
              className="group flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg transition group-hover:scale-110"
                style={{ background: TONE_BG[a.tone] }}
              >
                <I className="h-4.5 w-4.5" style={{ color: TONE_FG[a.tone], width: 18, height: 18 }} />
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: INK }}>{a.label}</div>
                <div className="text-[10px] text-slate-500">{a.desc}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </motion.section>
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
