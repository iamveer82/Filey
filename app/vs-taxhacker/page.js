import Link from 'next/link';
import { Paperclip, ArrowLeft, Check, X, ArrowRight, Sparkles, Github, Globe, Shield, Zap } from 'lucide-react';
import { BRAND, BRAND_DARK, INK } from '@/components/dashboard/theme';

export const metadata = {
  title: 'Filey vs TaxHacker — feature comparison',
  description: 'How Filey stacks up against the open-source TaxHacker (vas3k/TaxHacker). UAE-first, browser-native, BYOK-LLM, no Postgres required.',
  alternates: { canonical: '/vs-taxhacker' },
};

const ROWS = [
  { feat: 'Smart receipt OCR',                       fy: 'Tesseract.js (local) + AI vision (BYOK)', th: 'Server-side OCR + LLM' },
  { feat: 'Multi-receipt bulk import (drag/drop)',   fy: true, th: true },
  { feat: 'AI field extraction (8 providers, BYOK)', fy: '8 providers · key never leaves browser', th: 'OpenAI / OpenRouter only' },
  { feat: 'Local-only mode (no DB needed)',          fy: true, th: false, note: 'TaxHacker requires Postgres' },
  { feat: 'Multi-currency invoice + FX',             fy: 'AED · USD · EUR · GBP · SAR · INR', th: 'Multi-currency w/ ECB rates' },
  { feat: 'Custom fields per transaction',           fy: true, th: true },
  { feat: 'Custom categories',                       fy: true, th: true },
  { feat: 'Projects & clients',                      fy: true, th: true },
  { feat: 'Invoice PDF generator',                   fy: '3 templates · TRN · 5% VAT', th: 'Templated' },
  { feat: 'Public shareable invoice link',           fy: 'Encoded in URL (no DB)', th: false },
  { feat: 'CSV + Excel export',                      fy: true, th: 'CSV only' },
  { feat: 'UAE FTA preset (5% VAT, TRN, AED)',       fy: true, th: false },
  { feat: 'iOS / Android app',                       fy: 'iOS w/ Vision OCR + Gemma on-device', th: false },
  { feat: 'Bank sync (UAE banks)',                   fy: 'Q3 2026 (Pro)', th: false },
  { feat: 'Self-host (Docker)',                      fy: true, th: true },
  { feat: 'Stack',                                   fy: 'Next.js · React 19 · Edge runtime', th: 'Next.js · Postgres · Prisma' },
  { feat: 'License',                                 fy: 'Source-available, free for personal', th: 'AGPLv3' },
  { feat: 'On-device AI (no cloud)',                 fy: true,  th: false, note: 'Filey iOS uses Gemma 3 4B locally' },
  { feat: 'Onboarding wizard',                       fy: true,  th: 'Manual setup' },
];

function Cell({ v }) {
  if (v === true)  return <Check className="mx-auto h-5 w-5 text-emerald-600" />;
  if (v === false) return <X className="mx-auto h-5 w-5 text-slate-300" />;
  return <span className="text-xs text-slate-700 dark:text-slate-300">{v}</span>;
}

export default function VsTaxhackerPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: BRAND }}>
              <Paperclip className="h-4 w-4 text-white" style={{ transform: 'scaleX(-1)' }} />
            </div>
            <span className="text-lg font-bold tracking-tight">Filey</span>
          </Link>
          <Link href="/welcome" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-20 pb-12 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          <Sparkles className="h-3 w-3" /> Comparison
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: INK }}>
          Filey vs TaxHacker
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
          TaxHacker is a great open-source receipt &amp; invoice tracker. Filey takes the same
          idea and rebuilds it for the browser, the UAE, and bring-your-own-LLM economics.
          No Postgres, no SaaS lock-in, no copy-pasting your VAT lines.
        </p>
      </section>

      {/* Hero pair */}
      <section className="mx-auto max-w-5xl px-6 pb-12">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm" style={{ background: BRAND }}>
                <Paperclip className="h-5 w-5 text-white" style={{ transform: 'scaleX(-1)' }} />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">This is</div>
                <div className="text-lg font-bold" style={{ color: INK }}>Filey</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Browser-native finance copilot for UAE freelancers. Offline-first, BYOK-AI,
              FTA-conformant. Self-host in 30 seconds without a database.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
              <Tag>UAE-first</Tag>
              <Tag>localStorage</Tag>
              <Tag>8 LLM providers</Tag>
              <Tag>iOS + on-device AI</Tag>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50/40 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
                <Github className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Compared with</div>
                <div className="text-lg font-bold" style={{ color: INK }}>TaxHacker</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Open-source self-hosted accounting tool by <a href="https://github.com/vas3k/TaxHacker" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline">vas3k</a>.
              AGPL-licensed, Postgres-backed, server-side LLM extraction.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
              <Tag>Generic / global</Tag>
              <Tag>Postgres + Prisma</Tag>
              <Tag>OpenAI / OpenRouter</Tag>
              <Tag>AGPLv3</Tag>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60">
              <tr>
                <th className="w-1/2 px-6 py-4 text-left">Feature</th>
                <th className="w-1/4 px-6 py-4 text-center" style={{ color: BRAND }}>Filey</th>
                <th className="w-1/4 px-6 py-4 text-center">TaxHacker</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={r.feat} className={`border-t border-slate-100 dark:border-slate-800 ${i % 2 ? 'bg-slate-50/40 dark:bg-slate-900/40' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-semibold" style={{ color: INK }}>{r.feat}</div>
                    {r.note && <div className="mt-0.5 text-[11px] text-slate-500">{r.note}</div>}
                  </td>
                  <td className="px-6 py-4 text-center"><Cell v={r.fy} /></td>
                  <td className="px-6 py-4 text-center"><Cell v={r.th} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-500">
          TaxHacker info compiled from <a href="https://github.com/vas3k/TaxHacker" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline">github.com/vas3k/TaxHacker</a> as of April 2026. PRs welcome if anything is out of date.
        </p>
      </section>

      {/* When to pick which */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>Pick the one that fits</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border-2 p-6" style={{ borderColor: BRAND }}>
            <div className="flex items-center gap-2 text-sm font-bold" style={{ color: BRAND }}>
              <Zap className="h-4 w-4" /> Pick Filey if…
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> You file UAE VAT and want TRN + 5% baked in</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> You don't want to run a Postgres instance just for receipts</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> You already pay for an LLM and want BYOK with 8 providers</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> You need iOS app + on-device AI when offline</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> You want a public shareable invoice link without a server backend</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              <Github className="h-4 w-4" /> Pick TaxHacker if…
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> You want a fully AGPL-licensed stack</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> You're outside the UAE and don't need FTA presets</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> You prefer server-side persistence over browser localStorage</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> You're comfortable with Postgres + Prisma migrations</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Migrating */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-xl font-bold tracking-tight" style={{ color: INK }}>Migrating from TaxHacker?</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            <li>Export your TaxHacker transactions as CSV (Settings → Export).</li>
            <li>Open Filey → <Link href="/transactions" className="font-semibold text-blue-700 hover:underline">/transactions</Link> → <strong>Import CSV</strong>.</li>
            <li>Map fields once — Filey remembers the mapping for next time.</li>
            <li>Drop your receipt image folder onto <Link href="/bulk" className="font-semibold text-blue-700 hover:underline">/bulk</Link> for re-OCR with your BYOK key.</li>
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="overflow-hidden rounded-3xl p-10 text-center text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
          <h2 className="text-3xl font-bold tracking-tight">Try Filey in 30 seconds</h2>
          <p className="mt-2 text-white/80">Free forever for the core. Self-host with one Docker command.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/welcome?ref=vs-taxhacker" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:scale-[1.02]">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/self-host" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-white/10">
              <Globe className="h-4 w-4" /> Self-host docs
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-10 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        © {new Date().getFullYear()} Filey · <Link href="/privacy" className="hover:text-slate-700 dark:hover:text-slate-200">Privacy</Link> · <Link href="/security" className="hover:text-slate-700 dark:hover:text-slate-200">Security</Link> · <Link href="/changelog" className="hover:text-slate-700 dark:hover:text-slate-200">Changelog</Link>
      </footer>
    </main>
  );
}

function Tag({ children }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {children}
    </span>
  );
}
