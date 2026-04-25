'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paperclip, Sparkles, ScanLine, Receipt, Bot, Shield, Lock,
  Zap, Globe, Check, ArrowRight, Star, CreditCard, FileText,
  TrendingUp, Users, Smartphone, Moon, Menu, X,
  Layers, Wand2, Coins, Tag, FileSpreadsheet, Server, GitCompare,
} from 'lucide-react';
import { BRAND, BRAND_DARK, INK } from '@/components/dashboard/theme';

const EASE = [0.22, 1, 0.36, 1];

export default function WelcomePage() {
  // Mark welcome as seen so dashboard no longer redirects here.
  // Persist any `?ref=` for attribution.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem('filey.web.seenWelcome', String(Date.now())); } catch {}
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref');
    if (ref) {
      try { localStorage.setItem('filey.web.ref', JSON.stringify({ ref, ts: Date.now() })); } catch {}
    }
  }, []);

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <MarketingNav />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <AiDemo />
      <RoiCalculator />
      <PricingTeaser />
      <Testimonials />
      <FinalCta />
      <MarketingFooter />
    </main>
  );
}

const NAV_LINKS = [
  { href: '#features',     label: 'Features',     external: true },
  { href: '/pricing',      label: 'Pricing' },
  { href: '/vs-taxhacker', label: 'vs TaxHacker' },
  { href: '/self-host',    label: 'Self-host' },
  { href: '/blog',         label: 'Blog' },
  { href: '/about',        label: 'About' },
];

function MarketingNav() {
  const [open, setOpen] = useState(false);

  // Lock scroll when drawer open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <nav aria-label="Primary" className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/welcome" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: BRAND }}>
            <Paperclip className="h-4 w-4 text-white" style={{ transform: 'scaleX(-1)' }} />
          </div>
          <span className="text-lg font-bold tracking-tight">Filey</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) =>
            l.external ? (
              <a key={l.href} href={l.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">{l.label}</a>
            ) : (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">{l.label}</Link>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:inline-flex">
            Open app
          </Link>
          <Link
            href="/"
            className="hidden cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:scale-[1.03] hover:opacity-90 sm:inline-flex"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
          >
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 md:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 flex h-full w-[85%] max-w-sm flex-col bg-white p-6 shadow-2xl dark:bg-slate-950 md:hidden"
            >
              <div className="mb-8 flex items-center justify-between">
                <Link href="/welcome" onClick={() => setOpen(false)} className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: BRAND }}>
                    <Paperclip className="h-4 w-4 text-white" style={{ transform: 'scaleX(-1)' }} />
                  </div>
                  <span className="text-lg font-bold tracking-tight">Filey</span>
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((l) => {
                  const C = l.external ? 'a' : Link;
                  return (
                    <C
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="rounded-xl px-3 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      {l.label}
                    </C>
                  );
                })}
              </nav>

              <div className="mt-auto space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
                >
                  Get started <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setOpen(false)}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  See pricing
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 sm:pt-24">
      {/* Background gradient */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[1200px] -translate-x-1/2 rounded-full opacity-25 blur-3xl" style={{ background: `radial-gradient(circle at center, ${BRAND}, transparent 60%)` }} />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <motion.a
          href="#"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 backdrop-blur transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
        >
          <span className="flex h-1.5 w-1.5 rounded-full" style={{ background: BRAND }} />
          FTA-ready · Privacy-first · Free forever
        </motion.a>
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
          className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl md:text-7xl"
          style={{ color: INK }}
        >
          Your UAE finances,{' '}
          <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">on autopilot</span>.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400 sm:text-xl"
        >
          Scan receipts, invoice clients, track VAT, ask AI — all in one private,
          offline-first app built for freelancers and SMBs in the Emirates.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:scale-[1.03] hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
          >
            <Sparkles className="h-4 w-4" /> Start free — no signup
          </Link>
          <Link
            href="/pricing"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            See pricing
          </Link>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-4 text-xs text-slate-400"
        >
          Works offline · Your data stays on your device · Bring your own AI key
        </motion.p>
      </div>

      {/* Product mock */}
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
        className="mx-auto mt-16 max-w-5xl"
      >
        <div className="relative rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-2 shadow-2xl dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
          <div className="rounded-2xl bg-white p-6 dark:bg-slate-900">
            <MockDashboard />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function MockDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[
        { label: 'Income',  value: 'AED 37,500', delta: '+12%', color: '#10B981' },
        { label: 'Expenses',value: 'AED 5,210',  delta: '-4%',  color: '#EF4444' },
        { label: 'VAT net', value: 'AED 1,614',  delta: '+8%',  color: BRAND },
        { label: 'Cashflow',value: 'AED 32,290', delta: '+18%', color: '#8B5CF6' },
      ].map((s) => (
        <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{s.label}</span>
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: `${s.color}20`, color: s.color }}>{s.delta}</span>
          </div>
          <div className="mt-2 text-xl font-bold" style={{ color: INK }}>{s.value}</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white dark:bg-slate-900">
            <motion.div initial={{ width: 0 }} animate={{ width: '70%' }} transition={{ duration: 1, ease: EASE, delay: 0.5 }} className="h-full" style={{ background: s.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SocialProof() {
  return (
    <section className="border-y border-slate-100 bg-slate-50/50 py-12 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
          Built for UAE businesses · Works with
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-bold text-slate-500 dark:text-slate-400">
          {['Emirates NBD', 'Mashreq', 'ADCB', 'Wio', 'Zoho Books', 'QuickBooks', 'Xero'].map((n) => (
            <span key={n} className="opacity-70 transition hover:opacity-100">{n}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { icon: ScanLine,        title: 'OCR receipt scanner',      desc: 'Point camera → extract merchant, date, VAT, items. Works offline.' },
    { icon: Wand2,           title: 'AI vision extract',        desc: 'One tap → LLM reads merchant, total, VAT, line items as strict JSON.' },
    { icon: Layers,          title: 'Bulk import',              desc: 'Drop 50 receipts at once. Queue OCR + AI in parallel. Edit + save all.' },
    { icon: FileText,        title: 'FTA invoices, multi-FX',   desc: 'AED/USD/EUR/GBP/SAR/INR with FX rate. AED equivalent stamped on PDF.' },
    { icon: Receipt,         title: 'Smart ledger + custom fields', desc: 'Every tx categorised. Recurring bills auto-detected. Add your own fields.' },
    { icon: Tag,             title: 'Custom categories',        desc: 'Build your own taxonomy. Rename, delete, count — synced across tabs.' },
    { icon: Bot,             title: 'Ask AI anything (BYOK)',   desc: 'GPT-4, Claude, Gemini, Groq, Mistral or local Ollama. Grounded on your numbers.' },
    { icon: TrendingUp,      title: 'VAT & tax reports',        desc: 'One-click quarterly filing export. Profit, expenses, VAT net.' },
    { icon: FileSpreadsheet, title: 'CSV + Excel export',       desc: 'Full ledger out as CSV or .xls — including every custom field column.' },
    { icon: Server,          title: 'Self-host in 60 seconds',  desc: 'Docker compose up. Your VPS, your keys, your data. Zero database needed.' },
    { icon: GitCompare,      title: 'Better than TaxHacker',    desc: 'Browser-native, UAE-aware, multi-LLM. See feature-by-feature comparison.' },
    { icon: Lock,             title: 'Offline & private',        desc: 'Data lives on your device. No cloud unless you ask. BYO AI key.' },
  ];
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wider" style={{ color: BRAND }}>Everything you need</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: INK }}>One app. Complete peace of mind.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Stop juggling spreadsheets, bank statements and WhatsApp receipts. Filey puts your finances in one place — and keeps them private.
          </p>
        </div>
        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => {
            const I = it.icon;
            return (
              <motion.div
                key={it.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white transition group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
                  <I className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold" style={{ color: INK }}>{it.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{it.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Open Filey',        desc: 'No signup. No credit card. Land on dashboard in 2 seconds.' },
    { n: '02', title: 'Scan or import',    desc: 'Snap a receipt, import bank CSV, or add manually. Takes < 1 min.' },
    { n: '03', title: 'Ask AI anything',   desc: 'Plug your favourite LLM key. Get answers grounded on your ledger.' },
  ];
  return (
    <section className="bg-slate-50 px-6 py-24 dark:bg-slate-900/30">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: BRAND }}>From zero to insights</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: INK }}>90 seconds to your first AI answer.</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Most finance tools demand weeks of onboarding. Filey works instantly — and gets smarter as you use it.
            </p>
          </div>
          <ol className="space-y-4">
            {steps.map((s, i) => (
              <motion.li
                key={s.n}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
                className="flex items-start gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="shrink-0 text-4xl font-bold text-slate-200 dark:text-slate-700">{s.n}</span>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: INK }}>{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{s.desc}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function AiDemo() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: BRAND }}>
                  <Bot className="h-4 w-4" />
                </div>
                <div className="text-sm font-bold">Filey AI</div>
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Online</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-blue-600 px-4 py-2.5 text-sm text-white">
                  How much VAT do I owe this quarter?
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="max-w-[90%] rounded-xl rounded-tl-sm border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  You collected <strong>AED 3,125</strong> in output VAT and paid <strong>AED 1,511</strong> in input VAT, so your net liability is <strong>AED 1,614</strong>. Next FTA filing is 28 May — you have 34 days. Want me to draft the return?
                </motion.div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: BRAND }}>Grounded AI</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: INK }}>AI that actually knows your numbers.</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Connect OpenAI, Anthropic, Groq, Gemini, Mistral or run Ollama locally. Filey injects your ledger context into every prompt — so answers are grounded, not generic.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                '9 providers supported — pay the LLM, never us',
                'System prompt built from your real transactions',
                'Full conversations stay on your device',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                  <Check className="mt-0.5 h-4 w-4" style={{ color: BRAND }} /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function RoiCalculator() {
  const [hoursPerWeek, setHoursPerWeek] = useState(6);
  const [hourlyRate, setHourlyRate] = useState(150);
  const [invoicesPerMonth, setInvoicesPerMonth] = useState(12);

  // Assumptions (conservative)
  const ADMIN_TIME_REDUCTION = 0.65;     // Filey saves ~65% of admin hours
  const HOURS_PER_INVOICE = 0.5;         // 30 min per invoice manually
  const INVOICE_TIME_REDUCTION = 0.85;   // Filey reduces to ~5 min

  const adminHoursSaved = hoursPerWeek * 4 * ADMIN_TIME_REDUCTION;
  const invoiceHoursSaved = invoicesPerMonth * HOURS_PER_INVOICE * INVOICE_TIME_REDUCTION;
  const totalHoursSaved = adminHoursSaved + invoiceHoursSaved;
  const monthlySavings = Math.round(totalHoursSaved * hourlyRate);
  const yearlySavings = monthlySavings * 12;
  const proCost = 29 * 12;
  const roi = Math.round(((yearlySavings - proCost) / proCost) * 100);

  return (
    <section className="border-y border-slate-100 bg-slate-50 px-6 py-24 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <TrendingUp className="h-3 w-3" /> ROI Calculator
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">How much would Filey save you?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
            Most UAE freelancers we surveyed waste 6–10 hours a week on receipts, VAT bookkeeping and chasing invoices. Move those sliders.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]"
        >
          {/* Inputs */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <RoiSlider
              label="Hours/week on admin (receipts, VAT, expense tracking)"
              value={hoursPerWeek} setValue={setHoursPerWeek} min={1} max={20} step={0.5} suffix="h"
            />
            <RoiSlider
              label="Your hourly rate"
              value={hourlyRate} setValue={setHourlyRate} min={50} max={500} step={10} prefix="AED"
            />
            <RoiSlider
              label="Invoices you send per month"
              value={invoicesPerMonth} setValue={setInvoicesPerMonth} min={1} max={50} step={1}
            />
            <p className="mt-4 text-[11px] text-slate-500">
              Estimates based on time-reduction studies for OCR + AI tools. Your mileage may vary; we'd rather under-promise.
            </p>
          </div>

          {/* Result */}
          <div className="relative overflow-hidden rounded-3xl p-8 text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">You'd save</div>
              <motion.div
                key={monthlySavings}
                initial={{ scale: 0.95, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="mt-2 text-5xl font-bold tracking-tight sm:text-6xl"
              >
                AED {monthlySavings.toLocaleString()}
              </motion.div>
              <div className="mt-1 text-sm opacity-80">per month</div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <RoiStat label="Per year" value={`AED ${yearlySavings.toLocaleString()}`} />
                <RoiStat label="Hours back / mo" value={`${totalHoursSaved.toFixed(1)} h`} />
              </div>

              <div className="mt-6 rounded-2xl bg-white/15 p-4 backdrop-blur">
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-90">vs Pro plan</div>
                <div className="mt-1 text-sm">
                  <span className="font-bold">AED {proCost}/year</span> for unlimited Filey ·{' '}
                  <span className="font-bold text-emerald-200">{roi}% ROI</span>
                </div>
              </div>

              <Link
                href="/pricing"
                className="mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:scale-[1.02]"
              >
                Start free trial <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function RoiSlider({ label, value, setValue, min, max, step, prefix, suffix }) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        <span className="rounded-lg px-2.5 py-1 text-sm font-bold text-white" style={{ background: BRAND }}>
          {prefix && `${prefix} `}{value}{suffix && ` ${suffix}`}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => setValue(+e.target.value)}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600 dark:bg-slate-700"
        aria-label={label}
      />
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{prefix && `${prefix} `}{min}{suffix && ` ${suffix}`}</span>
        <span>{prefix && `${prefix} `}{max}{suffix && ` ${suffix}`}</span>
      </div>
    </div>
  );
}

function RoiStat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/15 p-3 backdrop-blur">
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function PricingTeaser() {
  const tiers = [
    { name: 'Free', price: 'AED 0', desc: 'Forever free core.',           features: ['5 invoices/mo', 'Unlimited OCR + AI scans (BYOK)', 'Unlimited AI chat (BYOK)', '10 LLM providers', 'All reports'] },
    { name: 'Pro',  price: 'AED 29', desc: 'For freelancers & solo SMBs.', features: ['Unlimited everything', 'Premium templates', 'Bank sync', 'GPT-4 / Claude Opus'], highlight: true },
    { name: 'Agency', price: 'AED 99', desc: '10 seats, multi-client.',     features: ['Everything in Pro', '10 team seats', 'White-label', 'Priority support'] },
  ];
  return (
    <section id="pricing" className="bg-slate-50 px-6 py-24 dark:bg-slate-900/30">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wider" style={{ color: BRAND }}>Pricing</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: INK }}>Fair. Transparent. Cancel anytime.</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600 dark:text-slate-400">Free forever for the core. Pay only for power-user features.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {tiers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
              className={`relative rounded-3xl border p-7 transition ${t.highlight ? 'border-transparent text-white shadow-2xl' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
              style={t.highlight ? { background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` } : undefined}
            >
              {t.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: BRAND }}>Most popular</span>}
              <h3 className={`text-lg font-bold ${t.highlight ? '' : ''}`} style={t.highlight ? undefined : { color: INK }}>{t.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{t.price}</span>
                <span className={`text-sm ${t.highlight ? 'text-white/70' : 'text-slate-500'}`}>/ month</span>
              </div>
              <p className={`mt-1 text-sm ${t.highlight ? 'text-white/80' : 'text-slate-600 dark:text-slate-400'}`}>{t.desc}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.highlight ? 'white' : BRAND }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={t.name === 'Free' ? '/' : `/upgrade?plan=${t.name.toLowerCase()}`}
                className={`mt-6 block cursor-pointer rounded-xl py-3 text-center text-sm font-bold transition ${
                  t.highlight ? 'bg-white text-blue-700 hover:scale-[1.02]' : 'border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                {t.name === 'Free' ? 'Start free' : `Choose ${t.name}`}
              </Link>
            </motion.div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/pricing" className="font-semibold transition hover:underline" style={{ color: BRAND }}>See full feature matrix →</Link>
        </p>
      </div>
    </section>
  );
}

function Testimonials() {
  const quotes = [
    { name: 'Riya K.',  role: 'Freelance designer, Dubai', text: 'Saved me 3 hours a week on invoicing. FTA return takes 10 minutes now.' },
    { name: 'Ahmed A.', role: 'SMB owner, Sharjah',        text: 'The AI caught a duplicate DEWA payment I missed for months. Pays for itself.' },
    { name: 'Omar R.',  role: 'Developer, Abu Dhabi',      text: 'Finally — a finance app that doesn\'t mine my data. BYO-LLM is the way.' },
  ];
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wider" style={{ color: BRAND }}>Loved by UAE builders</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: INK }}>From freelancers, for freelancers.</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {quotes.map((q, i) => (
            <motion.figure
              key={q.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                &ldquo;{q.text}&rdquo;
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
                  {q.name[0]}
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: INK }}>{q.name}</div>
                  <div className="text-xs text-slate-500">{q.role}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-12"
        style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -right-20 -bottom-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        </div>
        <h2 className="relative text-4xl font-bold text-white sm:text-5xl">Ready to stop juggling?</h2>
        <p className="relative mx-auto mt-4 max-w-2xl text-lg text-white/80">
          Free forever. No signup. No credit card. Your data never leaves your device.
        </p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-blue-700 shadow-lg transition hover:scale-[1.03]"
          >
            <Sparkles className="h-4 w-4" /> Open Filey now
          </Link>
          <Link href="/pricing" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
            View pricing
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 px-6 py-12 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/welcome" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: BRAND }}>
                <Paperclip className="h-4 w-4 text-white" style={{ transform: 'scaleX(-1)' }} />
              </div>
              <span className="text-lg font-bold">Filey</span>
            </Link>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              The private, offline-first finance copilot for UAE freelancers and SMBs.
            </p>
          </div>
          <FooterCol title="Product" links={[['Dashboard', '/'], ['Pricing', '/pricing'], ['Features', '/welcome#features'], ['AI chat', '/chat']]} />
          <FooterCol title="Company" links={[['About', '/welcome#features'], ['Privacy', '/privacy'], ['Terms', '/terms']]} />
          <FooterCol title="Resources" links={[['Get started', '/'], ['Support', 'mailto:support@filey.ae'], ['FAQ', '/pricing#faq']]} />
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800">
          <div>© {new Date().getFullYear()} Filey. Made in the UAE.</div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Data never leaves your device</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="text-sm font-bold" style={{ color: INK }}>{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
