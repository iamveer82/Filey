'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Camera, Bot, Upload, Sparkles, ArrowRight, X, Zap, ShieldCheck,
} from 'lucide-react';
import { BRAND, BRAND_DARK, BRAND_SOFT, INK } from './theme';

const KEY = 'filey.web.onboardingDismissed';
const EASE = [0.22, 1, 0.36, 1];

export default function OnboardingCards() {
  // Default hide (SSR) — reveal only if first-run
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    try {
      const dismissed = localStorage.getItem(KEY) === '1';
      if (dismissed) return setShow(false);
      const tx = JSON.parse(localStorage.getItem('filey.web.tx') || '[]');
      const ai = JSON.parse(localStorage.getItem('filey.web.ai') || 'null');
      // Show when ledger is effectively empty OR no AI key connected
      const sparse = !Array.isArray(tx) || tx.length < 3;
      const noKey  = !ai?.apiKey;
      setShow(sparse || noKey);
    } catch { setShow(true); }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(KEY, '1'); } catch {}
    setShow(false);
  };

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-blue-50/40 to-white p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 sm:p-8"
          aria-label="Welcome to Filey — getting started"
        >
          {/* Ambient orb */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full blur-3xl"
            style={{ background: `radial-gradient(closest-side, ${BRAND}22, transparent 70%)` }}
          />

          <button
            onClick={dismiss}
            aria-label="Dismiss onboarding"
            className="absolute right-4 top-4 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative flex flex-wrap items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight" style={{ color: INK }}>
                Welcome to Filey
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Three steps to turn every receipt into an answer. All private. All on-device.
              </p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              <ShieldCheck className="h-3 w-3" /> Zero account · zero server
            </span>
          </div>

          <div className="relative mt-6 grid gap-4 sm:grid-cols-3">
            <Card
              index={0}
              href="/scan"
              icon={Camera}
              tint="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              title="Scan a receipt"
              body="Drag a photo or use your camera — we read it on-device in seconds."
              cta="Open scanner"
            />
            <Card
              index={1}
              href="/settings#ai"
              icon={Bot}
              tint="bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
              title="Connect your AI brain"
              body="Bring a key from Claude, GPT, Gemini, Groq or run Ollama locally."
              cta="Add API key"
            />
            <Card
              index={2}
              href="/transactions?import=1"
              icon={Upload}
              tint="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              title="Import a CSV"
              body="Got a bank or Xero export? Drop it in and map the columns — done."
              cta="Import CSV"
            />
          </div>

          <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" style={{ color: BRAND }} />
              Average first-setup: under 90 seconds.
            </span>
            <button
              onClick={dismiss}
              className="cursor-pointer font-semibold text-slate-500 underline-offset-2 transition hover:text-slate-900 hover:underline dark:hover:text-white"
            >
              Skip for now
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function Card({ index, href, icon: I, tint, title, body, cta }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 + index * 0.07, ease: EASE }}
      whileHover={{ y: -3 }}
    >
      <Link
        href={href}
        className="group relative flex h-full cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700"
      >
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
          <I className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: INK }}>{title}</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
        </div>
        <div
          className="mt-auto inline-flex items-center gap-1 text-xs font-semibold transition group-hover:gap-2"
          style={{ color: BRAND }}
        >
          {cta} <ArrowRight className="h-3.5 w-3.5" />
        </div>
        <span
          aria-hidden
          className="absolute inset-x-4 bottom-0 h-0.5 origin-left scale-x-0 rounded-full transition-transform duration-300 group-hover:scale-x-100"
          style={{ background: `linear-gradient(90deg, ${BRAND}, ${BRAND_DARK})` }}
        />
      </Link>
    </motion.div>
  );
}
