'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCw, Home, Sparkles } from 'lucide-react';
import { BRAND, BRAND_DARK, INK } from './theme';

const EASE = [0.22, 1, 0.36, 1];

/**
 * Shared route-level error boundary.
 * Mount from any `app/**\/error.js` segment: `<RouteError error={error} reset={reset} />`.
 *
 * Graceful, branded, with an "Ask AI" escape hatch that pre-fills the chat
 * with the error message so the LLM can help diagnose.
 */
export default function RouteError({ error, reset, scope = 'this page' }) {
  useEffect(() => {
    // Client-side log only — never ship to a server.
    // eslint-disable-next-line no-console
    console.error('[RouteError]', scope, error);
  }, [error, scope]);

  const message = error?.message || 'Unknown error';
  const digest = error?.digest ? ` (ref: ${error.digest})` : '';
  const askQ = `Something broke on ${scope}: "${message}". Given I am on the Filey app (offline-first UAE finance copilot), what likely caused this and how do I recover?`;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        role="alert"
        aria-live="assertive"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-800 dark:bg-slate-900"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-25 blur-3xl"
          style={{ background: `radial-gradient(circle, ${BRAND}, transparent 60%)` }}
        />
        <motion.div
          initial={{ scale: 0.8, rotate: -6 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 14, delay: 0.1 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
          style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
        >
          <AlertTriangle className="h-8 w-8 text-white" />
        </motion.div>

        <h2 className="mt-5 text-2xl font-bold" style={{ color: INK }}>Something slipped</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {scope[0].toUpperCase() + scope.slice(1)} hit an error. Your data is safe and stored locally on this device{digest}.
        </p>

        <details className="mx-auto mt-4 w-full max-w-sm text-left">
          <summary className="cursor-pointer text-xs font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400">
            Technical details
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
{String(message)}
          </pre>
        </details>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => reset?.()}
            aria-label="Retry"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
          >
            <RotateCw className="h-4 w-4" /> Try again
          </button>
          <Link
            href={{ pathname: '/chat', query: { q: askQ } }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Sparkles className="h-4 w-4" style={{ color: BRAND }} /> Ask AI
          </Link>
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Home className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
