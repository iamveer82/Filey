'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import {
  Search, LayoutDashboard, Receipt, ScanLine, Paperclip, Bell,
  CreditCard, Bot, FolderKanban, Users, BarChart3, Settings as SettingsIcon,
  Moon, Sun, FileText, Crown, Sparkles,
} from 'lucide-react';
import { BRAND, BRAND_DARK, INK } from './theme';
import { usePlan } from '@/lib/plan';

const MAIN = [
  { href: '/',              label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/transactions',  label: 'Transactions', icon: Receipt },
  { href: '/scan',          label: 'Scan',         icon: ScanLine },
  { href: '/invoice',       label: 'Invoice',      icon: FileText },
  { href: '/bills',         label: 'Bills',        icon: CreditCard },
  { href: '/chat',          label: 'Chat AI',      icon: Bot, badge: 'AI' },
];

const MGMT = [
  { href: '/projects',      label: 'Projects',     icon: FolderKanban },
  { href: '/team',          label: 'Team',         icon: Users },
  { href: '/reports',       label: 'Reports',      icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && theme === 'dark';
  const { plan, isPro } = usePlan();
  return (
    <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900">
      <Link href="/" className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: BRAND }}>
          <Paperclip className="h-5 w-5 text-white" style={{ transform: 'scaleX(-1)' }} />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white" style={{ color: INK }}>Filey</span>
        {isPro && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" title={`${plan.name} plan`}>
            <Crown className="h-3 w-3" /> {plan.name}
          </span>
        )}
      </Link>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search"
          readOnly
          aria-label="Open command palette (Cmd+K)"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-14 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-800"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">⌘ K</span>
      </div>

      <SectionLabel>Main menu</SectionLabel>
      <nav aria-label="Main menu" className="mb-6 flex flex-col gap-1">
        {MAIN.map((it) => <NavLink key={it.href} item={it} active={isActive(pathname, it.href)} />)}
      </nav>

      <SectionLabel>Management</SectionLabel>
      <nav aria-label="Management" className="mb-6 flex flex-col gap-1">
        {MGMT.map((it) => <NavLink key={it.href} item={it} active={isActive(pathname, it.href)} />)}
      </nav>

      <div className="mt-auto">
        {!isPro && (
          <Link
            href="/pricing"
            className="mb-4 block overflow-hidden rounded-2xl p-4 text-white shadow-lg transition hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
          >
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Upgrade to Pro</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-white/80">Unlimited invoices, bank sync &amp; premium AI.</p>
            <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-[10px] font-bold backdrop-blur">
              <Sparkles className="h-3 w-3" /> 14-day free trial
            </div>
          </Link>
        )}
        <SectionLabel>Others</SectionLabel>
        <nav aria-label="Others" className="flex flex-col gap-1">
          <NavLink item={{ href: '/settings', label: 'Settings', icon: SettingsIcon }} active={isActive(pathname, '/settings')} />
          <button
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={dark}
            className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span className="flex items-center gap-3">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              Dark Mode
            </span>
            <span className={`inline-flex h-5 w-9 items-center rounded-full p-0.5 transition ${dark ? '' : 'bg-slate-200'}`} style={dark ? { background: BRAND } : undefined}>
              <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${dark ? 'translate-x-4' : ''}`} />
            </span>
          </button>
        </nav>
      </div>
    </aside>
  );
}

function SectionLabel({ children }) {
  return <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{children}</div>;
}

function isActive(pathname, href) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function NavLink({ item, active }) {
  const I = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
      style={active ? { background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` } : undefined}
    >
      {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-x-2 -translate-y-1/2 rounded-full" style={{ background: BRAND }} />}
      <span className="flex items-center gap-3">
        <I className="h-4 w-4" />
        {item.label}
      </span>
      {item.badge && (
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'text-white'}`}
          style={active ? undefined : { background: BRAND }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
