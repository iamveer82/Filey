'use client';

import { motion } from 'framer-motion';
import { Download, Mail, Bell, ChevronDown } from 'lucide-react';
import { BRAND, INK } from './theme';

export default function Topbar({ title, subtitle, wave = false, action }) {
  return (
    <div className="flex items-center justify-between pb-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight" style={{ color: INK }}>
          {title}
          {wave && (
            <motion.span
              animate={{ rotate: [0, 18, -8, 18, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 3 }}
              className="inline-block"
            >
              👋
            </motion.span>
          )}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {action || (
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
            <Download className="h-4 w-4" />
            Export report
          </button>
        )}
        <IconBtn><Mail className="h-4 w-4 text-slate-600" /></IconBtn>
        <IconBtn dot><Bell className="h-4 w-4 text-slate-600" /></IconBtn>
        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition hover:bg-slate-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white" style={{ background: BRAND }}>V</div>
          <span className="text-sm font-semibold text-slate-900">Veer</span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>
      </div>
    </div>
  );
}

function IconBtn({ children, dot }) {
  return (
    <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50">
      {children}
      {dot && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full" style={{ background: BRAND }} />}
    </button>
  );
}
