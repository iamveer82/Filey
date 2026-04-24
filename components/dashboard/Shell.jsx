'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { INK } from './theme';

export default function Shell({ title, subtitle, wave, action, children }) {
  return (
    <div className="flex min-h-screen bg-[#F3F5F9] font-sans" style={{ color: INK }}>
      <Sidebar />
      <main className="flex-1 overflow-hidden p-6 md:p-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="rounded-[32px] border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm md:p-8">
            <Topbar title={title} subtitle={subtitle} wave={wave} action={action} />
            <div className="space-y-6">{children}</div>
            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-4">
                <Link href="/app" className="font-medium hover:text-slate-900">Open mobile app →</Link>
                <span>v1.0 · UAE</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
