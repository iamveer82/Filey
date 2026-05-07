import Link from 'next/link';
import { Paperclip, Sparkles, Wrench, Bug, Zap, ArrowLeft, Crown, Receipt, Bot, Shield } from 'lucide-react';
import { BRAND, BRAND_DARK, INK } from '@/components/dashboard/theme';

export const metadata = {
  title: 'Changelog · Filey',
  description: 'Recent updates, fixes, and releases shipped in Filey — UAE-first finance copilot for freelancers and SMBs.',
  alternates: { canonical: '/changelog' },
};

const RELEASES = [
  {
    version: '0.6.0',
    date: '2026-04-24',
    headline: 'Pro plan, premium templates & ROI calculator',
    items: [
      { type: 'feature', text: 'Pro plan (AED 29/mo) with 14-day free trial.' },
      { type: 'feature', text: 'Three invoice templates: Classic (free), Modern + Minimal (Pro).' },
      { type: 'feature', text: 'Public invoice share links — every PDF carries a viewable URL.' },
      { type: 'feature', text: '5-step onboarding wizard for first-run setup.' },
      { type: 'feature', text: 'ROI calculator on the marketing site.' },
      { type: 'feature', text: 'Plan & Billing tab in Settings with monthly usage bars.' },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-04-14',
    headline: 'iOS Vision OCR & on-device Gemma',
    items: [
      { type: 'feature', text: 'Native iOS receipt OCR via Apple Vision — 3x faster than Tesseract.' },
      { type: 'feature', text: 'Gemma 2B local inference for offline AI on supported devices.' },
      { type: 'fix', text: 'Recurring detector no longer flags refunded transactions.' },
      { type: 'perf', text: 'Cold-start time reduced 40% via dynamic chart imports.' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-03-28',
    headline: 'Recurring expenses & Bills',
    items: [
      { type: 'feature', text: 'On-device recurring expense detection — clusters merchant + cadence.' },
      { type: 'feature', text: 'Bills page with monthly/quarterly views and dismissible suggestions.' },
      { type: 'feature', text: 'Per-route error boundaries with retry + Ask-AI handoff.' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-03-10',
    headline: 'Invoice generator + AI assistant',
    items: [
      { type: 'feature', text: 'FTA-compliant invoice PDF generator with TRN injection.' },
      { type: 'feature', text: 'BYOK AI chat — Anthropic, OpenAI, Google, Groq, Ollama.' },
      { type: 'feature', text: 'CSV import for transactions.' },
      { type: 'fix', text: 'Dark mode contrast fixes on Reports.' },
    ],
  },
];

const TYPE_META = {
  feature: { icon: Sparkles, color: '#10B981', label: 'New' },
  fix:     { icon: Bug,      color: '#F59E0B', label: 'Fix' },
  perf:    { icon: Zap,      color: '#8B5CF6', label: 'Perf' },
  chore:   { icon: Wrench,   color: '#64748B', label: 'Chore' },
};

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
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

      <article className="mx-auto max-w-3xl px-6 py-16">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
          <Sparkles className="h-3 w-3" /> Changelog
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: INK }}>What's new in Filey.</h1>
        <p className="mt-3 text-lg text-slate-600">
          We ship every week. Big features, tiny polish, every fix that matters.
        </p>

        <div className="mt-12 space-y-12">
          {RELEASES.map((r) => (
            <section key={r.version} className="relative border-l-2 border-slate-200 pl-8">
              <div className="absolute -left-2.5 top-0 flex h-5 w-5 items-center justify-center rounded-full border-4 border-white shadow-sm" style={{ background: BRAND }}>
                <span className="h-1 w-1 rounded-full bg-white" />
              </div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: BRAND }}>v{r.version}</span>
                <span className="text-xs text-slate-500">
                  {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: INK }}>{r.headline}</h2>
              <ul className="mt-4 space-y-2.5">
                {r.items.map((it, i) => {
                  const meta = TYPE_META[it.type] || TYPE_META.chore;
                  const I = meta.icon;
                  return (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span
                        className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: `${meta.color}15`, color: meta.color }}
                      >
                        <I className="h-2.5 w-2.5" /> {meta.label}
                      </span>
                      <span className="text-slate-700">{it.text}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <aside className="mt-16 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
          <div className="text-sm font-semibold" style={{ color: INK }}>Want to see what's coming next?</div>
          <p className="mt-1 text-xs text-slate-500">
            Bank sync, multi-currency, white-label invoices, accountant collab. Join the waitlist for early access.
          </p>
          <Link href="/welcome?ref=changelog" className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
            Try Filey free
          </Link>
        </aside>
      </article>

      <footer className="border-t border-slate-100 py-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Filey · <Link href="/privacy" className="hover:text-slate-700">Privacy</Link> · <Link href="/security" className="hover:text-slate-700">Security</Link>
      </footer>
    </main>
  );
}
