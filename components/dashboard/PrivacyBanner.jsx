'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, ShieldCheck, HardDrive, Server, Eye } from 'lucide-react';
import { BRAND, INK } from './theme';

const STORAGE_KEY = 'filey.web.privacyBannerDismissed';

export default function PrivacyBanner({ variant = 'pill' }) {
  const [open, setOpen]   = useState(false);
  const [dismissed, setD] = useState(true); // default hide on SSR

  useEffect(() => {
    try { setD(localStorage.getItem(STORAGE_KEY) === '1'); } catch { setD(false); }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    setD(true);
  };

  if (variant === 'pill') {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
          aria-label="View privacy details"
        >
          <Lock className="h-3 w-3" /> Private · on-device
        </button>
        <Modal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  // Full dismissible banner
  if (dismissed) return null;
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm dark:border-emerald-800 dark:bg-emerald-900/20"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-emerald-900 dark:text-emerald-200">Your data stays on this device.</div>
          <div className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
            Ledger + receipts live in browser storage only. AI keys forward per-request — never stored by Filey.{' '}
            <button onClick={() => setOpen(true)} className="font-semibold underline-offset-2 hover:underline">Learn more</button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="text-emerald-700/60 hover:text-emerald-900 dark:text-emerald-300/70 dark:hover:text-emerald-100">
          <X className="h-4 w-4" />
        </button>
      </motion.div>
      <Modal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function Modal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 w-[min(520px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: BRAND }}>
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: INK }}>How Filey protects your data</h2>
                  <p className="text-xs text-slate-500">Zero-knowledge by design</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <ul className="space-y-3 text-sm">
              <Item icon={HardDrive} title="Stored on this device only">All transactions, bills, receipts and chat history live in your browser's localStorage. Clearing your browser erases everything.</Item>
              <Item icon={Server} title="No account, no server logs">Filey has no user accounts. The <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-slate-800">/api/chat</code> endpoint is a stateless edge relay — keys + messages pass through, nothing is written.</Item>
              <Item icon={Eye} title="No analytics, no tracking">No Google Analytics. No Sentry. No fingerprinting. No third-party SDKs.</Item>
              <Item icon={Lock} title="Your LLM keys, your choice">Bring your own Anthropic / OpenAI / Google / Groq / Ollama key. Keys sit in your browser and are forwarded per request only.</Item>
            </ul>
            <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              Want to wipe everything? Go to <strong>Settings → Clear all data</strong>.
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Item({ icon: I, title, children }) {
  return (
    <li className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <I className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold" style={{ color: INK }}>{title}</div>
        <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">{children}</div>
      </div>
    </li>
  );
}
