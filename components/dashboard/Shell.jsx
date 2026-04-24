'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import PageTransition from './PageTransition';
import { INK } from './theme';

export default function Shell({ title, subtitle, wave, action, children }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F3F5F9] font-sans dark:bg-[#0B1220]" style={{ color: INK }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {navOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setNavOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 md:hidden"
              onClick={(e) => e.target.closest('a') && setNavOpen(false)}
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-hidden p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="rounded-[24px] border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/60 sm:p-6 md:rounded-[32px] md:p-8">
            {/* Mobile hamburger */}
            <div className="mb-3 flex items-center gap-2 md:hidden">
              <button
                onClick={() => setNavOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5 text-slate-700 dark:text-slate-200" />
              </button>
            </div>

            <Topbar title={title} subtitle={subtitle} wave={wave} action={action} />
            <PageTransition>
              <div className="space-y-6">{children}</div>
            </PageTransition>

            <div className="mt-8 flex flex-col items-start gap-3 border-t border-slate-100 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-4">
                <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-sans text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:inline-block">⌘ K</kbd>
                <Link href="/app" className="font-medium hover:text-slate-900 dark:hover:text-white">Open mobile app →</Link>
                <span>v1.0 · UAE</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
