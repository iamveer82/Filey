'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { BRAND, INK } from './theme';

const SHORTCUTS = [
  { keys: ['g', 'd'], label: 'Go to Dashboard',    path: '/' },
  { keys: ['g', 't'], label: 'Go to Transactions', path: '/transactions' },
  { keys: ['g', 'b'], label: 'Go to Bills',        path: '/bills' },
  { keys: ['g', 's'], label: 'Go to Scan',         path: '/scan' },
  { keys: ['g', 'c'], label: 'Go to Chat',         path: '/chat' },
  { keys: ['g', 'r'], label: 'Go to Reports',      path: '/reports' },
  { keys: ['g', 'p'], label: 'Go to Projects',     path: '/projects' },
  { keys: ['g', ','], label: 'Go to Settings',     path: '/settings' },
  { keys: ['?'],      label: 'Show this help',     action: 'help' },
  { keys: ['⌘', 'k'], label: 'Command palette',    note: 'handled by palette' },
];

function isTyping(e) {
  const t = e.target;
  if (!t) return false;
  const tag = (t.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
}

export default function KeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [lastG, setLastG]       = useState(0);

  useEffect(() => {
    const onKey = (e) => {
      if (isTyping(e)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // ? → help
      if (e.key === '?') { e.preventDefault(); setShowHelp((v) => !v); return; }

      // Esc closes help
      if (e.key === 'Escape' && showHelp) { setShowHelp(false); return; }

      // Two-key combos: g → X
      if (e.key === 'g') { setLastG(Date.now()); return; }
      if (Date.now() - lastG < 800) {
        const k = e.key.toLowerCase();
        const map = { d: '/', t: '/transactions', b: '/bills', s: '/scan', c: '/chat', r: '/reports', p: '/projects', ',': '/settings' };
        if (map[k]) { e.preventDefault(); router.push(map[k]); setLastG(0); return; }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lastG, showHelp, router]);

  return (
    <AnimatePresence>
      {showHelp && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowHelp(false)}
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label="Keyboard shortcuts"
            className="fixed left-1/2 top-1/2 z-[71] w-[min(520px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: BRAND }}>
                  <Keyboard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: INK }}>Keyboard shortcuts</h3>
                  <p className="text-xs text-slate-500">Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-slate-800">?</kbd> any time to toggle</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                aria-label="Close"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {SHORTCUTS.map((s) => (
                <li key={s.label} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    {s.label}
                    {s.note && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.note}</span>}
                  </span>
                  <span className="flex items-center gap-1">
                    {s.keys.map((k, i) => (
                      <kbd key={i} className="min-w-[1.6rem] rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-center text-[11px] font-bold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{k}</kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
