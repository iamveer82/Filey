'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Lock, Sparkles, X, Check } from 'lucide-react';
import { BRAND, BRAND_DARK, INK } from './theme';
import { usePlan } from '@/lib/plan';

const EASE = [0.22, 1, 0.36, 1];

/**
 * Soft-gate wrapper. Children render normally when plan allows feature;
 * otherwise a blurred overlay with upgrade CTA.
 */
export function PlanGate({ feature, children, fallback, blur = true }) {
  const { plan, isPro } = usePlan();
  const allowed =
    feature === 'pro' ? isPro :
    plan.limits?.[feature] === true || plan.limits?.[feature] === Infinity;

  if (allowed) return children;
  if (fallback) return fallback;

  return (
    <div className="relative">
      <div className={blur ? 'pointer-events-none select-none opacity-40 blur-[2px]' : 'hidden'}>{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <UpgradeCallout feature={feature} />
      </div>
    </div>
  );
}

/**
 * Inline upgrade prompt card — used as fallback or standalone.
 */
export function UpgradeCallout({ feature = 'pro', title, description, compact = false }) {
  const copy = FEATURE_COPY[feature] || FEATURE_COPY.pro;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={`relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-${compact ? '4' : '6'} shadow-sm dark:border-blue-900/40 dark:from-blue-950/30 dark:to-slate-900`}
    >
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: BRAND }} />
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
          <Crown className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold" style={{ color: INK }}>{title || copy.title}</h4>
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Pro</span>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{description || copy.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href="/pricing"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90 hover:scale-[1.03]"
              style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
            >
              <Sparkles className="h-3 w-3" /> Upgrade to Pro
            </Link>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">AED 29/mo · cancel anytime</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Modal variant. Use after blocked action (e.g. cap hit).
 */
export function UpgradeModal({ open, onClose, feature = 'pro' }) {
  if (!open) return null;
  const copy = FEATURE_COPY[feature] || FEATURE_COPY.pro;
  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
          aria-hidden
        />
        <motion.div
          role="dialog" aria-modal="true" aria-labelledby="upgrade-title"
          initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="fixed left-1/2 top-1/2 z-[81] w-[min(520px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="relative px-7 py-6" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
            <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 id="upgrade-title" className="text-xl font-bold text-white">{copy.title}</h2>
                <p className="text-sm text-white/80">{copy.description}</p>
              </div>
            </div>
          </div>
          <div className="px-7 py-6">
            <ul className="space-y-2.5">
              {PRO_PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND }} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-3xl font-bold" style={{ color: INK }}>AED 29</span>
              <span className="text-sm text-slate-500">/ month</span>
              <span className="ml-auto rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">14-day free trial</span>
            </div>
            <Link
              href="/upgrade?plan=pro"
              className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
              onClick={onClose}
            >
              <Sparkles className="h-4 w-4" /> Start free trial
            </Link>
            <p className="mt-3 text-center text-[11px] text-slate-400">No card required for trial · cancel anytime</p>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}

const FEATURE_COPY = {
  pro:               { title: 'Unlock Filey Pro',           description: 'Unlimited invoices, premium templates, bank sync & more.' },
  invoicesPerMonth:  { title: 'Invoice limit reached',      description: 'Free plan includes 5 invoices/month. Upgrade for unlimited.' },
  scansPerMonth:     { title: 'Scan limit reached',         description: 'Free plan includes 50 scans/month. Upgrade for unlimited OCR.' },
  csvImportsPerMonth:{ title: 'CSV import limit reached',   description: 'Free plan includes 2 imports/month. Upgrade for unlimited.' },
  premiumTemplates:  { title: 'Premium invoice templates',  description: 'Unlock 5 designer templates with custom branding.' },
  bankSync:          { title: 'Automatic bank sync',        description: 'Connect Emirates NBD, Mashreq, ADCB and more. Read-only & encrypted.' },
  advancedAi:        { title: 'GPT-4 & Claude Opus',        description: 'Use premium reasoning models for complex VAT questions.' },
  customBranding:    { title: 'Custom branding',            description: 'Your logo on invoices, reports & PDF exports.' },
  projects:          { title: 'More projects',              description: 'Free plan allows 2 projects. Upgrade for unlimited.' },
  teamMembers:       { title: 'Invite your team',           description: 'Agency plan includes 10 seats with role-based access.' },
};

const PRO_PERKS = [
  'Unlimited invoices, scans, CSV imports',
  '5 premium invoice templates with your logo',
  'Automatic bank sync (UAE banks, read-only)',
  'GPT-4 Turbo & Claude Opus 4 access',
  'Priority email support (< 4h response)',
  'Early access to new features',
];
