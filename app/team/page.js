'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Check, X, Plus, Mail, AtSign, Shield, TrendingUp, MoreHorizontal,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_SOFT, INK } from '@/components/dashboard/theme';
import { useLocalList, SEED_TEAM, SEED_APPROVALS, formatAED, formatWhen } from '@/lib/webStore';

const MENTIONS = [
  { id: 1, who: 'Aisha M.',  text: 'Can you review the Al Futtaim Q1 invoice?', ts: Date.now() - 1000*60*15 },
  { id: 2, who: 'Rakesh K.', text: '@Veer need approval on the LuLu receipt.',   ts: Date.now() - 1000*60*60 },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

export default function TeamPage() {
  const { list: team, add: addMember } = useLocalList('filey.web.team', SEED_TEAM);
  const { list: approvals, update: updateApp } = useLocalList('filey.web.approvals', SEED_APPROVALS);
  const [inviting, setInviting] = useState(false);

  const pending = approvals.filter(a => a.status === 'pending');

  return (
    <Shell
      title="Team"
      subtitle={`${team.length} members · ${pending.length} approvals pending`}
      action={
        <button onClick={() => setInviting(true)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:scale-105" style={{ background: BRAND }}>
          <Plus className="h-4 w-4" /> Invite member
        </button>
      }
    >
      <div className="grid gap-6 md:grid-cols-3">
        {/* Members */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
              <Users className="h-4 w-4" style={{ color: BRAND }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: INK }}>Members</h3>
          </div>
          <div className="space-y-3">
            {team.map((m, i) => {
              const pct = Math.min(100, Math.round((m.spent / m.cap) * 100));
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl font-bold text-white" style={{ background: COLORS[i % COLORS.length] }}>
                    {m.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: INK }}>{m.name}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{m.role}</span>
                    </div>
                    <div className="text-xs text-slate-500">{m.email}</div>
                  </div>
                  <div className="hidden w-48 md:block">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-slate-500">Monthly cap</span>
                      <span style={{ color: INK }}>{formatAED(m.spent)} / {formatAED(m.cap)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.05 + 0.2 }} className="h-full rounded-full" style={{ background: pct > 80 ? '#EF4444' : BRAND }} />
                    </div>
                  </div>
                  <button><MoreHorizontal className="h-5 w-5 text-slate-400" /></button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mentions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
              <AtSign className="h-4 w-4" style={{ color: BRAND }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: INK }}>Mentions</h3>
          </div>
          <div className="space-y-3">
            {MENTIONS.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="font-semibold" style={{ color: INK }}>{m.who}</span>
                  <span className="text-slate-400">{formatWhen(m.ts)}</span>
                </div>
                <div className="text-sm text-slate-700">{m.text}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Approvals */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 p-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
            <Shield className="h-4 w-4" style={{ color: BRAND }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: INK }}>Approvals Queue</h3>
          <span className="ml-2 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">{pending.length} pending</span>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Who</th>
              <th className="px-6 py-3">Merchant</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Submitted</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 text-sm">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg font-bold text-white" style={{ background: a.who.includes('Aisha') ? '#10B981' : '#F59E0B' }}>
                      {a.who.charAt(0)}
                    </div>
                    <span className="font-semibold" style={{ color: INK }}>{a.who}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{a.merchant}</td>
                <td className="px-6 py-4 font-bold" style={{ color: INK }}>{formatAED(a.amount)}</td>
                <td className="px-6 py-4 text-slate-500">{formatWhen(a.ts)}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    a.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                    a.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                              'bg-red-50 text-red-600'
                  }`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {a.status === 'pending' && (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => updateApp(a.id, { status: 'rejected' })} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                      <button onClick={() => updateApp(a.id, { status: 'approved' })} className="rounded-lg p-1.5 text-white transition hover:scale-105" style={{ background: '#10B981' }}>
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {inviting && <InviteDrawer onClose={() => setInviting(false)} onInvite={(x) => { addMember(x); setInviting(false); }} />}
      </AnimatePresence>
    </Shell>
  );
}

function InviteDrawer({ onClose, onInvite }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'Member', cap: 5000 });
  const submit = () => {
    if (!form.name || !form.email) return;
    onInvite({ ...form, cap: +form.cap, spent: 0 });
  };
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-white p-8 shadow-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: INK }}>Invite member</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        <div className="space-y-4">
          <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Jane Doe" /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="jane@filey.ae" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Role">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
                <option>Member</option><option>Approver</option><option>Admin</option>
              </select>
            </Field>
            <Field label="Monthly cap (AED)"><input type="number" value={form.cap} onChange={(e) => setForm({ ...form, cap: e.target.value })} className={inputCls} /></Field>
          </div>
          <button onClick={submit} className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg transition hover:scale-105" style={{ background: BRAND }}>
            <Mail className="mr-2 inline h-4 w-4" /> Send invite
          </button>
        </div>
      </motion.div>
    </>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400";
function Field({ label, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
