import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Tag, Paperclip, Sparkles } from 'lucide-react';
import { BRAND, BRAND_DARK, INK } from './dashboard/theme';

export default function BlogShell({ post, children }) {
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
          <div className="flex items-center gap-6 text-sm">
            <Link href="/blog" className="font-medium text-slate-600 hover:text-slate-900">Blog</Link>
            <Link href="/pricing" className="font-medium text-slate-600 hover:text-slate-900">Pricing</Link>
            <Link href="/" className="rounded-xl px-4 py-2 font-bold text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
              Open app
            </Link>
          </div>
        </nav>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-700">
          <ArrowLeft className="h-3 w-3" /> All articles
        </Link>

        <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
          <Tag className="h-3 w-3" /> {post.tag}
        </span>

        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl" style={{ color: INK }}>
          {post.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Published {new Date(post.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          {post.updated && (
            <span className="inline-flex items-center gap-1">Updated {new Date(post.updated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          )}
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readingMinutes} min read</span>
          <span>· by {post.author}</span>
        </div>

        <div className="prose prose-slate prose-headings:font-bold prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-2xl prose-h3:mt-8 prose-a:text-blue-700 prose-a:no-underline hover:prose-a:underline mt-10 max-w-none">
          {children}
        </div>

        <aside className="mt-16 overflow-hidden rounded-3xl p-8 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Built for this</div>
              <div className="mt-1 text-2xl font-bold">Try Filey free.</div>
              <div className="mt-1 text-sm opacity-90">FTA-ready invoicing + receipt OCR + AI bookkeeping copilot. UAE-first, privacy-first.</div>
            </div>
            <Link
              href={`/welcome?ref=blog-${post.slug}`}
              className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:scale-[1.02]"
            >
              <Sparkles className="h-4 w-4" /> Start for free
            </Link>
          </div>
        </aside>
      </article>

      <footer className="mt-12 border-t border-slate-100 py-10 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Filey · <Link href="/privacy" className="hover:text-slate-700">Privacy</Link> · <Link href="/terms" className="hover:text-slate-700">Terms</Link>
      </footer>
    </main>
  );
}
