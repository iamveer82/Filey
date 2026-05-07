'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Mail, Bell, ChevronDown, LogOut, User, Settings, HelpCircle,
  Check, AlertCircle, Info,
} from 'lucide-react';
import { BRAND, BRAND_DARK, INK } from './theme';

const NOTIFS = [
  { id: 1, icon: AlertCircle, tint: '#FEF3C7', color: '#D97706', title: 'VAT filing due in 4 days', sub: 'Q1 2026 · AED 2,510 payable' },
  { id: 2, icon: Check,        tint: '#DCFCE7', color: '#16A34A', title: 'Invoice paid', sub: 'Al Futtaim settled AED 25,000' },
  { id: 3, icon: Info,         tint: '#DBEAFE', color: '#2563EB', title: 'New approval request', sub: 'Rakesh submitted AED 340 at LuLu' },
];

export default function Topbar({ title, subtitle, wave = false, action }) {
  const [openMenu, setOpenMenu] = useState(null); // 'notifs' | 'profile' | null
  const rootRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={rootRef} className="flex flex-wrap items-start justify-between gap-4 pb-6">
      <div className="min-w-0 flex-1">
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl" style={{ color: INK }}>
          <span>{title}</span>
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

      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
        {action || (
          <button
            onClick={() => router.push('/reports')}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export report</span>
          </button>
        )}

        <div className="hidden sm:block">
          <IconBtn label="Mail"><Mail className="h-4 w-4 text-slate-600" /></IconBtn>
        </div>

        <div className="relative">
          <IconBtn label="Notifications" dot active={openMenu === 'notifs'} onClick={() => setOpenMenu(openMenu === 'notifs' ? null : 'notifs')}>
            <Bell className="h-4 w-4 text-slate-600" />
          </IconBtn>
          <AnimatePresence>
            {openMenu === 'notifs' && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <span className="text-sm font-bold text-slate-900">Notifications</span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600">3 new</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {NOTIFS.map((n) => {
                    const I = n.icon;
                    return (
                      <button key={n.id} className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: n.tint }}>
                          <I className="h-4 w-4" style={{ color: n.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">{n.title}</div>
                          <div className="truncate text-xs text-slate-500">{n.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => { setOpenMenu(null); router.push('/reports'); }} className="block w-full border-t border-slate-100 py-2.5 text-center text-xs font-semibold text-blue-600 hover:bg-slate-50">
                  View all
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white" style={{ background: `linear-gradient(135deg, ${BRAND}, #1E4BB0)` }}>V</div>
            <span className="hidden text-sm font-semibold text-slate-900 sm:inline">Veer</span>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${openMenu === 'profile' ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {openMenu === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                <div className="border-b border-slate-100 px-3 py-3">
                  <div className="text-sm font-bold text-slate-900">Veer Patel</div>
                  <div className="truncate text-xs text-slate-500">iamveer82@gmail.com</div>
                </div>
                <MenuItem icon={User}     label="Profile"  onClick={() => { setOpenMenu(null); router.push('/settings'); }} />
                <MenuItem icon={Settings} label="Settings" onClick={() => { setOpenMenu(null); router.push('/settings'); }} />
                <MenuItem icon={HelpCircle} label="Help & support" onClick={() => setOpenMenu(null)} />
                <div className="my-1 h-px bg-slate-100" />
                <MenuItem icon={LogOut} label="Sign out" danger onClick={() => setOpenMenu(null)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, dot, label, active, onClick }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`relative flex h-10 w-10 items-center justify-center rounded-xl border bg-white shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
        active ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
      {dot && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full ring-2 ring-white" style={{ background: BRAND }} />}
    </button>
  );
}

function MenuItem({ icon: I, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <I className="h-4 w-4" />
      {label}
    </button>
  );
}
