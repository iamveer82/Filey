import Link from 'next/link';
import { Paperclip, ArrowLeft, Globe, Heart, Shield, Users, Sparkles, ArrowRight, Code, Zap } from 'lucide-react';
import { BRAND, BRAND_DARK, INK } from '@/components/dashboard/theme';

export const metadata = {
  title: 'About · Filey',
  description: 'Filey is a UAE-first finance copilot — built in Dubai by freelancers, for freelancers. Privacy-first, FTA-ready, AI-native.',
  alternates: { canonical: '/about' },
};

const VALUES = [
  { icon: Shield,   title: 'Privacy by default',  copy: 'Your data lives on your device unless you opt into sync. We never sell, share, or train on your finances.' },
  { icon: Globe,    title: 'UAE-first, not UAE-only', copy: 'Built around FTA rules, AED, and the way Dubai freelancers actually work. Multi-currency comes after we get the home stack right.' },
  { icon: Heart,    title: 'No dark patterns',    copy: 'Free plan is real, not a 7-day tease. Cancel in two clicks. Export your data any time.' },
  { icon: Code,     title: 'Engineering over sales', copy: 'We are operators first. Every feature is something we wanted for our own freelance work.' },
];

const NUMBERS = [
  { v: '5+', l: 'years FTA records covered' },
  { v: '0',  l: 'tracking pixels' },
  { v: '<3s', l: 'on-device receipt OCR' },
  { v: '8',   l: 'LLM providers supported' },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: BRAND }}>
              <Paperclip className="h-4 w-4 text-white" style={{ transform: 'scaleX(-1)' }} />
            </div>
            <span className="text-lg font-bold tracking-tight">Filey</span>
          </Link>
          <Link href="/welcome" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-20 pb-12 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
          <Sparkles className="h-3 w-3" /> About Filey
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: INK }}>
          Built in Dubai, for the people doing the actual work.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Filey started in 2025 as a side project to fix a personal problem: VAT quarter-end was eating two weekends a quarter. We wanted a copilot that lived on the device, respected the FTA rules, and didn't gate everything behind a credit card. So we built one.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-3 sm:grid-cols-4">
          {NUMBERS.map((n) => (
            <div key={n.l} className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
              <div className="text-3xl font-bold tracking-tight" style={{ color: BRAND }}>{n.v}</div>
              <div className="mt-1 text-xs text-slate-500">{n.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>Why we exist</h2>
        <div className="mt-4 space-y-4 text-slate-600">
          <p>
            UAE freelancers — designers, developers, consultants, content creators — generate billions in annual output, but the financial tooling assumes either a salaried Excel-warrior at a corporate, or a US-shaped startup with a Stripe relationship. The middle is a mess of WhatsApp invoices, Carrefour receipts, and EmaraTax panic at quarter-end.
          </p>
          <p>
            Filey is for that middle. Capture the receipt the second it prints. Send the invoice with the right TRN and the right VAT line. Ask an AI assistant grounded in your actual ledger ("how much did I spend on software last quarter?"). Export everything for your accountant on demand.
          </p>
          <p>
            We are <strong>operator-built</strong>: every feature exists because one of us needed it for our own businesses. We are <strong>privacy-pragmatic</strong>: on-device by default, encrypted sync only when you ask. We are <strong>UAE-rooted</strong>: TRN-aware, AED-first, FTA-conformant, with Arabic locale support shipping next.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>What we believe</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {VALUES.map((v) => {
            const I = v.icon;
            return (
              <div key={v.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: BRAND }}>
                  <I className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold" style={{ color: INK }}>{v.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{v.copy}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>The team</h2>
        <p className="mt-3 text-slate-600">
          Filey is a small, distributed engineering team across Dubai and Mumbai. We're hiring two roles in 2026 — full-stack engineer and growth lead. Both remote-friendly with quarterly meetups in DIFC.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-slate-500" />
          <a href="mailto:hello@filey.ae" className="font-semibold text-blue-700 hover:underline">hello@filey.ae</a>
          <span className="text-slate-400">·</span>
          <Link href="/security" className="font-semibold text-blue-700 hover:underline">Security</Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="overflow-hidden rounded-3xl p-10 text-center text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
          <h2 className="text-3xl font-bold tracking-tight">Run your finances like an operator.</h2>
          <p className="mt-2 text-white/80">Free forever for the core. AED 29/mo unlocks unlimited everything.</p>
          <Link href="/welcome?ref=about" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:scale-[1.02]">
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Filey · <Link href="/privacy" className="hover:text-slate-700">Privacy</Link> · <Link href="/security" className="hover:text-slate-700">Security</Link> · <Link href="/changelog" className="hover:text-slate-700">Changelog</Link>
      </footer>
    </main>
  );
}
