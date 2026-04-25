'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paperclip, Check, X, ArrowRight, Sparkles, ChevronDown, Crown, Shield,
} from 'lucide-react';
import { BRAND, BRAND_DARK, INK } from '@/components/dashboard/theme';

const EASE = [0.22, 1, 0.36, 1];

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly'); // 'monthly' | 'yearly'
  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <MarketingNav />
      <Hero billing={billing} setBilling={setBilling} />
      <Tiers billing={billing} />
      <FeatureMatrix />
      <FAQ />
      <Final />
      <Footer />
    </main>
  );
}

function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <nav aria-label="Primary" className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/welcome" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: BRAND }}>
            <Paperclip className="h-4 w-4 text-white" style={{ transform: 'scaleX(-1)' }} />
          </div>
          <span className="text-lg font-bold tracking-tight">Filey</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link href="/welcome#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300">Features</Link>
          <Link href="/pricing" className="text-sm font-semibold text-slate-900 dark:text-white">Pricing</Link>
          <Link href="/privacy" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300">Privacy</Link>
        </div>
        <Link
          href="/"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:scale-[1.03]"
          style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
        >
          Open app <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </nav>
    </header>
  );
}

function Hero({ billing, setBilling }) {
  return (
    <section className="relative px-6 pt-16 text-center sm:pt-24">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10">
        <div className="mx-auto h-[400px] w-[900px] opacity-20 blur-3xl" style={{ background: `radial-gradient(circle, ${BRAND}, transparent 60%)` }} />
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-wider" style={{ color: BRAND }}>Pricing</p>
        <h1 className="mt-3 text-5xl font-bold tracking-tight sm:text-6xl" style={{ color: INK }}>Simple, honest pricing.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          The core is free forever. Upgrade only when you need power-user features. No hidden fees, no seat gotchas.
        </p>
      </motion.div>

      {/* Billing toggle */}
      <div className="mt-10 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={() => setBilling('monthly')}
          aria-pressed={billing === 'monthly'}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-bold transition ${billing === 'monthly' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500'}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling('yearly')}
          aria-pressed={billing === 'yearly'}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-bold transition ${billing === 'yearly' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500'}`}
        >
          Yearly <span className="ml-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">Save 20%</span>
        </button>
      </div>
    </section>
  );
}

function Tiers({ billing }) {
  const mul = billing === 'yearly' ? 0.8 : 1;
  const tiers = [
    {
      name: 'Free',
      price: 0,
      desc: 'Forever free core features.',
      features: [
        '5 invoices per month',
        'Unlimited OCR + AI receipt scans (BYOK)',
        'Unlimited AI chat with your own API key',
        '10 LLM providers (Anthropic, OpenAI, Google, Groq, Mistral, Together, OpenRouter, Ollama local + cloud, custom)',
        '2 CSV imports per month',
        '2 projects',
        'All reports & VAT summary',
        'Offline-first, private',
      ],
      cta: 'Start free',
      href: '/',
    },
    {
      name: 'Pro',
      price: Math.round(29 * mul),
      desc: 'For freelancers & solo businesses.',
      features: [
        'Unlimited invoices, scans, imports',
        'Unlimited projects',
        '5 premium invoice templates',
        'Custom branding on PDFs',
        'Automatic UAE bank sync',
        'GPT-4 & Claude Opus access',
        'Priority email support (< 4h)',
        'Early access to new features',
      ],
      cta: 'Start 14-day trial',
      href: '/upgrade?plan=pro',
      highlight: true,
    },
    {
      name: 'Agency',
      price: Math.round(99 * mul),
      desc: 'Teams & accountants with multiple clients.',
      features: [
        'Everything in Pro, plus:',
        '10 team seats included',
        'Multi-client workspace switcher',
        'White-label invoices & reports',
        'Role-based access controls',
        'Dedicated account manager',
        'SLA-backed support',
      ],
      cta: 'Start 14-day trial',
      href: '/upgrade?plan=agency',
    },
  ];
  return (
    <section className="px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
        {tiers.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
            className={`relative flex flex-col rounded-3xl border p-8 transition ${
              t.highlight
                ? 'border-transparent text-white shadow-2xl'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            }`}
            style={t.highlight ? { background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` } : undefined}
          >
            {t.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: BRAND }}>
                Most popular
              </span>
            )}
            <div className="flex items-center gap-2">
              {t.highlight && <Crown className="h-4 w-4" />}
              <h3 className="text-xl font-bold" style={t.highlight ? undefined : { color: INK }}>{t.name}</h3>
            </div>
            <p className={`mt-2 text-sm ${t.highlight ? 'text-white/80' : 'text-slate-600 dark:text-slate-400'}`}>{t.desc}</p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-5xl font-bold">{t.price === 0 ? 'Free' : `AED ${t.price}`}</span>
              {t.price > 0 && <span className={`text-sm ${t.highlight ? 'text-white/70' : 'text-slate-500'}`}>/ month{billing === 'yearly' ? ', billed yearly' : ''}</span>}
            </div>
            <ul className="mt-6 flex-1 space-y-2.5">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.highlight ? 'white' : BRAND }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={t.href}
              className={`mt-7 cursor-pointer rounded-xl py-3 text-center text-sm font-bold transition ${
                t.highlight
                  ? 'bg-white text-blue-700 hover:scale-[1.02]'
                  : 'border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              {t.cta}
            </Link>
          </motion.div>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        All plans include: offline-first, BYO AI key support, AES-256 encrypted optional backup, and the same privacy guarantees.
      </p>
    </section>
  );
}

function FeatureMatrix() {
  const rows = [
    { label: 'Invoices per month',       free: '5',       pro: 'Unlimited',    agency: 'Unlimited' },
    { label: 'OCR + AI receipt scans',   free: 'Unlimited (BYOK)', pro: 'Unlimited', agency: 'Unlimited' },
    { label: 'AI chat (BYOK key)',       free: 'Unlimited', pro: 'Unlimited',  agency: 'Unlimited' },
    { label: 'CSV bank imports',         free: '2 / mo',  pro: 'Unlimited',    agency: 'Unlimited' },
    { label: 'Projects',                 free: '2',       pro: 'Unlimited',    agency: 'Unlimited' },
    { label: 'Team seats',               free: '1',       pro: '1',            agency: '10' },
    { label: 'Premium invoice templates',free: false,     pro: true,           agency: true },
    { label: 'Custom branding on PDFs',  free: false,     pro: true,           agency: true },
    { label: 'Automatic bank sync',      free: false,     pro: true,           agency: true },
    { label: 'GPT-4 / Claude Opus',      free: false,     pro: true,           agency: true },
    { label: 'Multi-client workspaces',  free: false,     pro: false,          agency: true },
    { label: 'White-label exports',      free: false,     pro: false,          agency: true },
    { label: 'Priority support',         free: 'Email',   pro: '< 4h email',   agency: '< 1h + phone' },
    { label: 'Data stays on your device',free: true,      pro: true,           agency: true },
    { label: 'BYO AI provider',          free: true,      pro: true,           agency: true },
  ];
  const cell = (v) => {
    if (v === true)  return <Check className="mx-auto h-4 w-4" style={{ color: BRAND }} />;
    if (v === false) return <X className="mx-auto h-4 w-4 text-slate-300 dark:text-slate-600" />;
    return <span className="text-sm font-medium">{v}</span>;
  };
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: INK }}>Full feature comparison</h2>
        <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                <th className="px-5 py-4 font-bold" style={{ color: INK }}>Feature</th>
                <th className="px-5 py-4 text-center font-bold">Free</th>
                <th className="px-5 py-4 text-center font-bold" style={{ color: BRAND }}>Pro</th>
                <th className="px-5 py-4 text-center font-bold">Agency</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.label} className={i % 2 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{r.label}</td>
                  <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-400">{cell(r.free)}</td>
                  <td className="px-5 py-3 text-center">{cell(r.pro)}</td>
                  <td className="px-5 py-3 text-center">{cell(r.agency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    { q: 'Is the free plan really free forever?', a: 'Yes. The core — manual ledger, receipt scanning (with caps), FTA reports, CSV export, BYO AI — is free indefinitely. We make money only when power users upgrade to Pro.' },
    { q: 'Can I cancel anytime?',                 a: 'Anytime, with one click. We do not bill the next cycle. No "contact sales" friction.' },
    { q: 'What happens to my data if I downgrade?', a: 'All your data stays. You keep every invoice, transaction and report. Free-plan caps resume from the next month.' },
    { q: 'Do you store my financial data?',       a: 'No. By default, your data lives in your browser (IndexedDB / localStorage) or your device filesystem. Optional encrypted backup is AES-256 and you hold the key.' },
    { q: 'Which AI providers do you support?',    a: 'OpenAI, Anthropic, Groq, Google Gemini, Mistral, Perplexity, Together, OpenRouter, and self-hosted Ollama. You pay the LLM provider — never us.' },
    { q: 'Is Filey FTA-compliant for UAE VAT?',   a: 'Invoices include TRN, 5% VAT line items, sequential numbering, and PDF A4 format — the FTA-compliant format for Emirates businesses.' },
    { q: 'Do you support other GCC countries?',   a: 'Today Filey is UAE-first. Saudi and Oman VAT rules are on the roadmap.' },
    { q: 'How does bank sync work in Pro?',       a: 'We connect read-only via open-banking providers (Emirates NBD API, Mashreq etc). Transactions import directly. No credentials touch our servers.' },
  ];
  return (
    <section id="faq" className="bg-slate-50 px-6 py-24 dark:bg-slate-900/30">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-4xl font-bold tracking-tight" style={{ color: INK }}>Frequently asked questions</h2>
        <div className="mt-10 space-y-3">
          {items.map((it) => <FaqItem key={it.q} {...it} />)}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-bold" style={{ color: INK }}>{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} style={{ color: BRAND }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Final() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <Sparkles className="mx-auto h-10 w-10" style={{ color: BRAND }} />
        <h2 className="mt-5 text-3xl font-bold sm:text-4xl" style={{ color: INK }}>Ready to try Filey?</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600 dark:text-slate-400">Get started on the free plan in 10 seconds. Upgrade later if it earns its keep.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:scale-[1.03]" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
            <Sparkles className="h-4 w-4" /> Start free
          </Link>
          <Link href="/upgrade?plan=pro" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            Try Pro free for 14 days
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 px-6 py-8 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div>© {new Date().getFullYear()} Filey. Made in the UAE.</div>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white">Terms</Link>
          <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Private by default</span>
        </div>
      </div>
    </footer>
  );
}
