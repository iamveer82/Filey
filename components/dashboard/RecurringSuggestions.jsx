'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Plus, X, Wifi, Zap, Droplet, Music, Tv, Phone,
  CreditCard, ShoppingCart, Home as HomeIcon, Car, Repeat,
} from 'lucide-react';
import { BRAND, BRAND_DARK, INK } from './theme';
import { detectRecurring, matchesExistingBill, toBill } from '@/lib/recurring';
import { formatAED } from '@/lib/webStore';

const ICONS = {
  electric:   Zap,
  wifi:       Wifi,
  water:      Droplet,
  netflix:    Tv,
  spotify:    Music,
  phone:      Phone,
  creditcard: CreditCard,
  cart:       ShoppingCart,
  home:       HomeIcon,
  car:        Car,
  misc:       CreditCard,
};

const EASE = [0.22, 1, 0.36, 1];
const DISMISS_KEY = 'filey.web.recurringDismissed';

function loadDismissed() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(window.localStorage.getItem(DISMISS_KEY) || '[]'); } catch { return []; }
}
function saveDismissed(ids) {
  try { window.localStorage.setItem(DISMISS_KEY, JSON.stringify(ids)); } catch {}
}

export default function RecurringSuggestions({ tx, bills, onAdd }) {
  const [dismissed, setDismissed] = useState(loadDismissed);

  const suggestions = useMemo(() => {
    const found = detectRecurring(tx || []);
    return found.filter(r => !matchesExistingBill(r, bills) && !dismissed.includes(r.id));
  }, [tx, bills, dismissed]);

  if (!suggestions.length) return null;

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    saveDismissed(next);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      aria-label="Recurring expense suggestions"
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
        style={{ background: `radial-gradient(circle, ${BRAND}, transparent 65%)` }}
      />
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: INK }}>Recurring expenses detected</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {suggestions.length} pattern{suggestions.length === 1 ? '' : 's'} found in your ledger — convert to tracked bills for reminders.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          <Repeat className="h-3 w-3" /> Private · on-device
        </span>
      </header>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {suggestions.slice(0, 6).map((r, i) => {
            const I = ICONS[r.iconId] || ICONS.misc;
            return (
              <motion.article
                key={r.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.04, ease: EASE }}
                className="group relative flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${BRAND}18`, color: BRAND }}>
                    <I className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold capitalize" style={{ color: INK }}>{r.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{formatAED(r.avgAmount)}</span>
                      <span aria-hidden>·</span>
                      <span className="capitalize">{r.cadence}</span>
                      <span aria-hidden>·</span>
                      <span>{r.occurrences}x</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => onAdd(toBill(r))}
                    aria-label={`Track ${r.name} as a bill`}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
                  >
                    <Plus className="h-3 w-3" /> Track
                  </button>
                  <button
                    onClick={() => dismiss(r.id)}
                    aria-label={`Dismiss ${r.name} suggestion`}
                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
