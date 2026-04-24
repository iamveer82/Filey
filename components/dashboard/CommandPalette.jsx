'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { toast } from 'sonner';
import {
  LayoutDashboard, Receipt, ScanLine, Paperclip, CreditCard, Bot,
  FolderKanban, Users, BarChart3, Settings, Plus, Download, Trash2,
} from 'lucide-react';
import { BRAND } from './theme';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, keywords: 'home overview' },
  { href: '/transactions', label: 'Transactions', icon: Receipt, keywords: 'tx payments' },
  { href: '/scan', label: 'Scan receipt', icon: ScanLine, keywords: 'ocr camera' },
  { href: '/clip', label: 'Clip Tools', icon: Paperclip, keywords: 'pdf merge split compress' },
  { href: '/bills', label: 'Bills', icon: CreditCard, keywords: 'dewa etisalat netflix' },
  { href: '/chat', label: 'Chat AI', icon: Bot, keywords: 'assistant ai' },
  { href: '/projects', label: 'Projects', icon: FolderKanban, keywords: 'clients budget' },
  { href: '/team', label: 'Team', icon: Users, keywords: 'members approvals' },
  { href: '/reports', label: 'Reports', icon: BarChart3, keywords: 'vat analytics charts' },
  { href: '/settings', label: 'Settings', icon: Settings, keywords: 'profile trn ai' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (href) => { setOpen(false); router.push(href); };

  const action = (name, fn) => {
    setOpen(false);
    try { fn(); toast.success(name); } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const exportCSV = () => {
    const tx = JSON.parse(localStorage.getItem('filey.web.tx') || '[]');
    const header = 'Date,Name,Merchant,Type,Category,Amount,VAT,Status\n';
    const rows = tx.map(t => [new Date(t.ts).toISOString(), t.name, t.merchant, t.type, t.category, t.amount, t.vat || 0, t.status].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `filey-tx-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const clearCache = () => {
    Object.keys(localStorage).filter(k => k.startsWith('filey.web.')).forEach(k => localStorage.removeItem(k));
    setTimeout(() => location.reload(), 400);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-[15vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <Command label="Command palette" className="[&_[cmdk-input]]:outline-none">
          <div className="border-b border-slate-100 p-3">
            <Command.Input placeholder="Type a command or search…" className="w-full bg-transparent px-2 py-1.5 text-sm outline-none placeholder-slate-400" />
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-slate-400">No results.</Command.Empty>

            <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400">
              {NAV.map((n) => {
                const I = n.icon;
                return (
                  <Command.Item key={n.href} value={`${n.label} ${n.keywords}`} onSelect={() => go(n.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition data-[selected=true]:bg-slate-900 data-[selected=true]:text-white">
                    <I className="h-4 w-4" />
                    <span className="font-medium">{n.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400">
              <Command.Item value="export csv tx" onSelect={() => action('Exported CSV', exportCSV)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 data-[selected=true]:bg-slate-900 data-[selected=true]:text-white">
                <Download className="h-4 w-4" /><span className="font-medium">Export transactions CSV</span>
              </Command.Item>
              <Command.Item value="new transaction add" onSelect={() => go('/transactions')}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 data-[selected=true]:bg-slate-900 data-[selected=true]:text-white">
                <Plus className="h-4 w-4" /><span className="font-medium">Add transaction</span>
              </Command.Item>
              <Command.Item value="new bill" onSelect={() => go('/bills')}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 data-[selected=true]:bg-slate-900 data-[selected=true]:text-white">
                <Plus className="h-4 w-4" /><span className="font-medium">Add bill</span>
              </Command.Item>
              <Command.Item value="new project" onSelect={() => go('/projects')}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 data-[selected=true]:bg-slate-900 data-[selected=true]:text-white">
                <Plus className="h-4 w-4" /><span className="font-medium">New project</span>
              </Command.Item>
              <Command.Item value="clear cache reset" onSelect={() => confirm('Clear all local data?') && action('Cleared cache', clearCache)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 data-[selected=true]:bg-red-500 data-[selected=true]:text-white">
                <Trash2 className="h-4 w-4" /><span className="font-medium">Clear all local data</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
            <span><kbd className="rounded bg-white px-1.5 py-0.5 font-bold border border-slate-200">↑↓</kbd> navigate <kbd className="ml-2 rounded bg-white px-1.5 py-0.5 font-bold border border-slate-200">↵</kbd> select</span>
            <span><kbd className="rounded bg-white px-1.5 py-0.5 font-bold border border-slate-200">esc</kbd> close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
