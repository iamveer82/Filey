'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, CalendarClock, ShieldCheck, ArrowRight, Lock,
} from 'lucide-react';
import { BRAND, BRAND_DARK, BRAND_SOFT, INK } from './theme';
import { computeInsights, SEED_TX, SEED_BILLS, formatAED } from '@/lib/webStore';

export default function InsightsCard() {
  const [ins, setIns] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const tx      = JSON.parse(localStorage.getItem('filey.web.tx')    || 'null') || SEED_TX;
      const bills   = JSON.parse(localStorage.getItem('filey.web.bills') || 'null') || SEED_BILLS;
      const profile = JSON.parse(localStorage.getItem('filey.web.profile') || 'null') || {};
      setIns(computeInsights({ tx, bills, profile }));
    } catch {}
  }, []);

  if (!ins) return null;

  const items = [
    {
      icon: ins.net30 >= 0 ? TrendingUp : TrendingDown,
      tint: ins.net30 >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
      title: `Net ${ins.net30 >= 0 ? 'profit' : 'loss'} last 30 days`,
      value: formatAED(Math.abs(ins.net30)),
      sub: `Income ${formatAED(ins.income30)} · Expense ${formatAED(ins.expense30)}`,
      ask: `Explain why my net for the last 30 days is ${ins.net30 >= 0 ? 'positive' : 'negative'} and what I should watch.`,
    },
    {
      icon: ShieldCheck,
      tint: 'bg-blue-50 text-blue-700',
      title: ins.vatNet >= 0 ? 'VAT net payable (quarter)' : 'VAT net refundable (quarter)',
      value: formatAED(Math.abs(ins.vatNet)),
      sub: `Output ${formatAED(ins.vatOnIncome)} · Input ${formatAED(ins.vatReclaimable)}`,
      ask: 'Summarise my current VAT position and any actions I should take before the next filing.',
    },
    {
      icon: CalendarClock,
      tint: 'bg-amber-50 text-amber-700',
      title: ins.upcomingBills[0] ? `Next bill: ${ins.upcomingBills[0].name}` : 'No bills due soon',
      value: ins.upcomingBills[0] ? formatAED(ins.upcomingBills[0].amount) : '—',
      sub: ins.upcomingBills[0] ? `Due ${new Date(ins.upcomingBills[0].dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'Next 14 days clear',
      ask: 'List my upcoming bills and suggest which to pay first.',
    },
    ins.outliers.length > 0 && {
      icon: AlertTriangle,
      tint: 'bg-rose-50 text-rose-700',
      title: `${ins.outliers.length} unusual expense${ins.outliers.length > 1 ? 's' : ''}`,
      value: formatAED(ins.outliers.reduce((s, t) => s + (+t.amount || 0), 0)),
      sub: ins.outliers.slice(0, 2).map(t => t.name).join(', '),
      ask: 'Which of my recent expenses look unusual and why?',
    },
  ].filter(Boolean);

  const topCat = ins.topCategories[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: INK }}>AI Insights</h3>
            <p className="text-[11px] text-slate-500">Computed locally from your {ins.txCount30} recent transactions</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          <Lock className="h-3 w-3" /> Private · on-device
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => {
          const I = it.icon;
          return (
            <Link
              key={i}
              href={{ pathname: '/chat', query: { q: it.ask } }}
              className="group relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition hover:border-blue-300 hover:bg-white hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
            >
              <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${it.tint}`}>
                <I className="h-3.5 w-3.5" />
              </div>
              <div className="text-[11px] font-semibold text-slate-500">{it.title}</div>
              <div className="text-lg font-bold leading-tight" style={{ color: INK }}>{it.value}</div>
              <div className="truncate text-[11px] text-slate-500">{it.sub}</div>
              <div className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold opacity-0 transition group-hover:opacity-100" style={{ color: BRAND }}>
                Ask AI <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>

      {topCat && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            <span className="font-semibold" style={{ color: INK }}>Top category</span> · {topCat[0]} at {formatAED(topCat[1])} over 30 days · daily avg {formatAED(ins.avgDaily)}
          </div>
          <Link
            href={{ pathname: '/chat', query: { q: `Review my top spending category (${topCat[0]}) and suggest ways to cut cost without hurting operations.` } }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
          >
            <Sparkles className="h-3 w-3" /> Ask AI to advise
          </Link>
        </div>
      )}
    </motion.div>
  );
}
