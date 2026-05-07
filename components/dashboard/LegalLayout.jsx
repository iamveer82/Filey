'use client';

import Link from 'next/link';
import { Paperclip, ArrowLeft, Shield } from 'lucide-react';
import { BRAND, BRAND_DARK, INK } from './theme';

export default function LegalLayout({ title, updated, children }) {
  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <nav aria-label="Primary" className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: BRAND }}>
              <Paperclip className="h-4 w-4 text-white" style={{ transform: 'scaleX(-1)' }} />
            </div>
            <span className="text-lg font-bold">Filey</span>
          </Link>
          <Link href="/welcome" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </nav>
      </header>
      <article className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-bold uppercase tracking-wider" style={{ color: BRAND }}>Legal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: INK }}>{title}</h1>
        {updated && <p className="mt-3 text-sm text-slate-500">Last updated: {updated}</p>}
        <div className="prose prose-slate mt-10 max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-10 prose-h3:text-lg prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-li:marker:text-blue-500">
          {children}
        </div>
      </article>
      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-8 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>© {new Date().getFullYear()} Filey. Made in the UAE.</div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900 dark:hover:text-white">Terms</Link>
            <Link href="/pricing" className="hover:text-slate-900 dark:hover:text-white">Pricing</Link>
            <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Private by default</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
