'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { INK } from './theme';

/**
 * Standardized stat card.
 * Props: icon, label, value, color, delta (% number, +/-), sparkline ([numbers])
 */
export default function StatCard({ icon: I, label, value, color = '#2A63E2', delta, sparkline, hint }) {
  const up = typeof delta === 'number' && delta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-hover rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}15` }}>
          {I && <I className="h-5 w-5" style={{ color }} />}
        </div>
        {typeof delta === 'number' && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${up ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {up ? '+' : ''}{delta.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white" style={{ color: INK }}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{hint}</div>}
      {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} color={color} />}
    </motion.div>
  );
}

function Sparkline({ data, color }) {
  const w = 120, h = 28;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-7 w-full">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#spark-${color.replace('#', '')})`} points={`0,${h} ${pts} ${w},${h}`} />
      <polyline fill="none" stroke={color} strokeWidth="1.75" points={pts} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
