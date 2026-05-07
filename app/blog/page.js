import Link from 'next/link';
import { ArrowRight, Calendar, Clock, Tag, Paperclip } from 'lucide-react';
import { POSTS } from '@/lib/blog';
import { BRAND, BRAND_DARK, INK } from '@/components/dashboard/theme';

export const metadata = {
  title: 'Blog · Filey — UAE freelancer & SMB finance playbook',
  description: 'Practical guides for UAE freelancers and solo SMBs: VAT, FTA compliance, invoicing, expenses, and financial copilot workflows.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog · Filey',
    description: 'Practical UAE finance guides — VAT, FTA, invoicing.',
    type: 'website',
  },
};

export default function BlogIndexPage() {
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
          <div className="flex items-center gap-6">
            <Link href="/welcome" className="text-sm font-medium text-slate-600 hover:text-slate-900">Home</Link>
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">Pricing</Link>
            <Link href="/" className="rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
              Open app
            </Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
          <Tag className="h-3 w-3" /> Filey Blog
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: INK }}>
          UAE freelance finance — minus the jargon.
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">
          Plain-English guides on VAT, invoicing, FTA reporting and the daily admin that eats your billable hours.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {POSTS.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <Tag className="h-2.5 w-2.5" /> {p.tag}
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight group-hover:text-blue-700" style={{ color: INK }}>
                {p.title}
              </h2>
              <p className="mt-2 flex-1 text-sm text-slate-600">{p.description}</p>
              <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-3">
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {p.readingMinutes} min</span>
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-blue-700 transition group-hover:gap-2">
                  Read <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-12 border-t border-slate-100 py-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Filey · <Link href="/privacy" className="hover:text-slate-700">Privacy</Link> · <Link href="/terms" className="hover:text-slate-700">Terms</Link>
      </footer>
    </main>
  );
}
