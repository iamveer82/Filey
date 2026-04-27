'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, CreditCard, Lock, Shield, Crown, Sparkles, ArrowLeft } from 'lucide-react';
import { BRAND, BRAND_DARK, INK } from '@/components/dashboard/theme';
import { PLANS, savePlan } from '@/lib/plan';
import { toast } from 'sonner';

const EASE = [0.22, 1, 0.36, 1];

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500">Loading…</div>}>
      <UpgradeInner />
    </Suspense>
  );
}

function UpgradeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const planId = params.get('plan') === 'agency' ? 'agency' : 'pro';
  const plan = PLANS[planId];
  const [billing, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('plan'); // plan | payment | done

  const price = Math.round(plan.price * (billing === 'yearly' ? 0.8 : 1));
  const total = billing === 'yearly' ? price * 12 : price;

  async function handleCheckout(e) {
    e.preventDefault();
    setLoading(true);
    // Stub: real Stripe Checkout integration lands later.
    // For now: short simulated delay → activate plan locally + toast.
    await new Promise((r) => setTimeout(r, 1200));
    savePlan(planId, { billing, trialStarted: Date.now(), trialEndsAt: Date.now() + 14 * 24 * 60 * 60 * 1000 });
    setLoading(false);
    setStep('done');
    toast.success(`${plan.name} activated!`, { description: '14-day free trial started.' });
    setTimeout(() => router.push('/'), 2200);
  }

  if (step === 'done') return <Success plan={plan} />;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl">
        <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to pricing
        </Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Checkout form */}
          <motion.form
            onSubmit={handleCheckout}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: INK }}>Upgrade to {plan.name}</h1>
                <p className="text-sm text-slate-500">14-day free trial · No card required now</p>
              </div>
            </div>

            {/* Billing */}
            <section className="mt-8">
              <h2 className="text-sm font-bold" style={{ color: INK }}>Billing cycle</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { id: 'monthly', label: 'Monthly', sub: `AED ${plan.price}/mo` },
                  { id: 'yearly',  label: 'Yearly',  sub: `AED ${Math.round(plan.price * 0.8)}/mo · save 20%`, badge: 'Best value' },
                ].map((o) => {
                  const active = billing === o.id;
                  return (
                    <button
                      type="button"
                      key={o.id}
                      onClick={() => setBilling(o.id)}
                      aria-pressed={active}
                      className={`relative cursor-pointer rounded-2xl border p-4 text-left transition ${active ? 'border-blue-500 bg-blue-50/50 shadow-sm dark:bg-blue-950/20' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}
                    >
                      {o.badge && <span className="absolute -top-2 right-3 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{o.badge}</span>}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold" style={{ color: INK }}>{o.label}</span>
                        <span className={`inline-block h-4 w-4 rounded-full border-2 ${active ? 'border-blue-500' : 'border-slate-300'}`}>
                          {active && <span className="block h-full w-full rounded-full" style={{ background: BRAND, transform: 'scale(0.5)' }} />}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{o.sub}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Payment (stub) */}
            <section className="mt-8">
              <h2 className="flex items-center gap-2 text-sm font-bold" style={{ color: INK }}>
                <CreditCard className="h-4 w-4" /> Payment method
              </h2>
              <div className="mt-3 space-y-3">
                <Field label="Cardholder name">
                  <input name="name" placeholder="Full name on card" className={input} />
                </Field>
                <Field label="Card number">
                  <input name="number" placeholder="4242 4242 4242 4242" className={input} inputMode="numeric" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expiry"><input name="exp" placeholder="MM / YY" className={input} /></Field>
                  <Field label="CVC"><input name="cvc" placeholder="123" className={input} inputMode="numeric" /></Field>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                <Lock className="h-3 w-3" /> Encrypted via Stripe · PCI-DSS Level 1 · 3-D Secure supported
              </p>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="mt-8 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90 hover:scale-[1.01] disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
            >
              {loading ? 'Activating…' : <><Sparkles className="h-4 w-4" /> Start 14-day free trial</>}
            </button>
            <p className="mt-3 text-center text-[11px] text-slate-500">
              You will not be charged today. After the trial, billed {billing === 'yearly' ? `yearly at AED ${total}` : `monthly at AED ${price}`}. Cancel anytime.
            </p>
          </motion.form>

          {/* Summary */}
          <motion.aside
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: EASE }}
            className="sticky top-6 h-fit overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="px-6 py-5" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
              <div className="flex items-center gap-2 text-white">
                <Crown className="h-4 w-4" />
                <span className="text-sm font-bold">Filey {plan.name}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1 text-white">
                <span className="text-4xl font-bold">AED {price}</span>
                <span className="text-sm text-white/80">/mo</span>
              </div>
              <div className="mt-1 text-xs text-white/80">{billing === 'yearly' ? `Billed yearly at AED ${total}` : 'Billed monthly'}</div>
            </div>
            <div className="px-6 py-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">What you get</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  'Unlimited invoices & scans',
                  'Premium templates + custom branding',
                  'UAE bank sync (read-only)',
                  'GPT-4 Turbo & Claude Opus 4',
                  'Priority support',
                  'Early access to features',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND }} /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                <p className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: BRAND }} />
                  14-day trial, then AED {price}/mo. Cancel any time — your data stays.
                </p>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </main>
  );
}

function Success({ plan }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <motion.div
          initial={{ scale: 0.6, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 0.1 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
          style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
        >
          <Check className="h-8 w-8 text-white" />
        </motion.div>
        <h1 className="mt-5 text-2xl font-bold" style={{ color: INK }}>Welcome to Filey {plan.name}!</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Your 14-day trial has started. Taking you back to the dashboard…</p>
      </motion.div>
    </main>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>{children}</label>;
}
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800';
