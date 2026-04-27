'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Banknote, Lock, Crown, Sparkles, Check, Shield, Zap, Building2, Bell,
  ArrowRight,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_DARK, BRAND_SOFT, INK } from '@/components/dashboard/theme';
import { usePlan } from '@/lib/plan';
import { UpgradeModal } from '@/components/dashboard/PlanGate';
import Link from 'next/link';

const BANKS = [
  { name: 'Emirates NBD', bg: '#A41E22' },
  { name: 'Mashreq',      bg: '#FF7300' },
  { name: 'ADCB',         bg: '#003574' },
  { name: 'FAB',          bg: '#021F4E' },
  { name: 'HSBC UAE',     bg: '#DB0011' },
  { name: 'RAKBANK',      bg: '#005CAB' },
  { name: 'CBD',          bg: '#0E4D8C' },
  { name: 'ENBD Liv.',    bg: '#1B1B1B' },
];

export default function BankSyncPage() {
  const { isPro } = usePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const join = (e) => {
    e?.preventDefault?.();
    if (!email || !email.includes('@')) { toast.error('Add a valid email'); return; }
    try {
      const list = JSON.parse(localStorage.getItem('filey.web.bankWaitlist') || '[]');
      list.push({ email, ts: Date.now(), pro: isPro });
      localStorage.setItem('filey.web.bankWaitlist', JSON.stringify(list));
    } catch {}
    setSubmitted(true);
    toast.success('You are on the list — we will email when your bank lights up');
  };

  return (
    <Shell
      title="Bank sync"
      subtitle="Connect your UAE bank · auto-import transactions · zero copy-paste"
      action={
        !isPro && (
          <button
            onClick={() => setUpgradeOpen(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
          >
            <Crown className="h-4 w-4" /> Pro feature
          </button>
        )
      }
    >
      {/* Coming-soon hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-8 sm:p-12"
      >
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
              <Sparkles className="h-3 w-3" /> Coming Q3 2026
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: INK }}>
              Stop copy-pasting from your bank app.
            </h1>
            <p className="mt-3 text-slate-600">
              Filey will auto-import transactions from major UAE banks via secure read-only connections — categorise them, match receipts, and flag VAT — without leaving the app.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              {[
                'Read-only access — Filey can never move money.',
                'OAuth + bank-issued credentials, encrypted in transit.',
                'On-device categorisation — bank data is processed locally, not on our servers.',
                'Auto-match to receipts and recurring bills.',
                'Daily, hourly, or manual sync — your call.',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Waitlist card */}
          <div className="self-start rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            {!isPro && (
              <div className="mb-3 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                <Lock className="h-2.5 w-2.5" /> Pro plan
              </div>
            )}
            <h2 className="text-lg font-bold" style={{ color: INK }}>Get early access</h2>
            <p className="mt-1 text-xs text-slate-500">
              Filey Pro members are first in line. We'll email when your bank is supported.
            </p>

            {!submitted ? (
              <form onSubmit={join} className="mt-4 space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.ae"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <button
                  type="submit"
                  className="w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02]"
                  style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
                >
                  Join waitlist
                </button>
              </form>
            ) : (
              <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
                <Check className="mb-0.5 inline h-3.5 w-3.5" /> You're on the list. We'll email <strong>{email}</strong>.
              </div>
            )}

            {!isPro && (
              <button
                onClick={() => setUpgradeOpen(true)}
                className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Crown className="h-3.5 w-3.5" /> Upgrade to Pro for priority
              </button>
            )}
          </div>
        </div>
      </motion.section>

      {/* Supported banks */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Banks at launch</h2>
          <span className="text-xs text-slate-400">More added every quarter</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {BANKS.map((b) => (
            <div key={b.name} className="rounded-2xl border border-slate-200 bg-white p-4 text-center transition hover:shadow-md">
              <div
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ background: b.bg }}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div className="mt-2 text-xs font-semibold" style={{ color: INK }}>{b.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it will work */}
      <section className="rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-xl font-bold tracking-tight" style={{ color: INK }}>How it will work</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            { icon: Building2, title: '1. Connect',    body: 'Pick your bank, sign in once via OAuth or bank-issued credentials.' },
            { icon: Zap,       title: '2. Auto-import',body: 'Filey pulls fresh transactions on your schedule. Read-only, always.' },
            { icon: Check,     title: '3. Auto-categorise', body: 'On-device AI tags categories, splits VAT, and matches receipts.' },
          ].map((s, i) => {
            const I = s.icon;
            return (
              <div key={i}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: BRAND_SOFT }}>
                  <I className="h-5 w-5" style={{ color: BRAND }} />
                </div>
                <h3 className="mt-3 font-bold" style={{ color: INK }}>{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trust */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            <span className="font-bold text-sm" style={{ color: INK }}>Read-only by design</span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Filey requests <em>only</em> transaction history. We physically cannot initiate transfers, change details, or share with third parties.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-600" />
            <span className="font-bold text-sm" style={{ color: INK }}>Encrypted, on-device first</span>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Bank credentials never touch Filey servers in plaintext. Transaction data is processed locally for categorisation; sync is end-to-end encrypted.
          </p>
        </div>
      </section>

      <div className="text-center text-xs text-slate-500">
        Questions? <Link href="/security" className="font-semibold text-blue-700 hover:underline">Read our security architecture</Link> or <a href="mailto:hello@filey.ae" className="font-semibold text-blue-700 hover:underline">email us</a>.
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="bankSync" />
    </Shell>
  );
}
