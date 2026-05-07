'use client';

import { motion } from 'framer-motion';
import { BRAND, BRAND_SOFT, INK } from './theme';

export default function EmptyState({ icon: I, title, description, actionLabel, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-800/30"
    >
      {I && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: BRAND_SOFT }}>
          <I className="h-7 w-7" style={{ color: BRAND }} />
        </div>
      )}
      <h3 className="text-base font-bold text-slate-900 dark:text-white" style={{ color: INK }}>{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:scale-105" style={{ background: BRAND }}>
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}

export function SkeletonRow({ lines = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-12 w-full" />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton h-28" />
      ))}
    </div>
  );
}
