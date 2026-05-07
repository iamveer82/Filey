'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Tag, Plus, Trash2, Edit3, Check, X, Lock } from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_DARK, BRAND_SOFT, INK } from '@/components/dashboard/theme';
import { useCategories } from '@/lib/categories';
import { useLocalList, SEED_TX } from '@/lib/webStore';

const EASE = [0.22, 1, 0.36, 1];

export default function CategoriesPage() {
  const { base, custom, addCategory, removeCategory, renameCategory } = useCategories();
  const { list: tx } = useLocalList('filey.web.tx', SEED_TX);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(null); // { name }
  const [editValue, setEditValue] = useState('');

  // Per-category counts from the ledger
  const counts = useMemo(() => {
    const m = {};
    for (const t of tx) m[t.category] = (m[t.category] || 0) + 1;
    return m;
  }, [tx]);

  const submitNew = (e) => {
    e?.preventDefault?.();
    const n = draft.trim();
    if (!n) return;
    if ([...base, ...custom].some((c) => c.toLowerCase() === n.toLowerCase())) {
      toast.error('Category already exists');
      return;
    }
    addCategory(n);
    setDraft('');
    toast.success(`Added "${n}"`);
  };

  const startEdit = (name) => { setEditing({ name }); setEditValue(name); };
  const saveEdit  = () => {
    const n = editValue.trim();
    if (!n) return;
    if (n.toLowerCase() === editing.name.toLowerCase()) { setEditing(null); return; }
    if ([...base, ...custom].some((c) => c.toLowerCase() === n.toLowerCase())) {
      toast.error('That name is taken');
      return;
    }
    renameCategory(editing.name, n);
    setEditing(null);
    toast.success('Renamed');
  };

  const remove = (name) => {
    const used = counts[name] || 0;
    const ok = used === 0
      ? confirm(`Remove "${name}"?`)
      : confirm(`"${name}" is used by ${used} transaction(s). Remove anyway? Existing transactions keep the label.`);
    if (!ok) return;
    removeCategory(name);
    toast.success(`Removed "${name}"`);
  };

  return (
    <Shell title="Categories" subtitle="Built-in defaults plus your custom labels — saved to this device only.">
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Custom + base list */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold" style={{ color: INK }}>
              <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: BRAND_SOFT }}>
                <Tag className="h-3.5 w-3.5" style={{ color: BRAND }} />
              </span>
              Your custom categories <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">{custom.length}</span>
            </h2>

            {custom.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40">
                None yet. Add one below — they show up everywhere a category is selectable.
              </div>
            ) : (
              <ul className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {custom.map((c) => (
                    <motion.li
                      key={c}
                      layout
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.18, ease: EASE }}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                    >
                      {editing?.name === c ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }}
                            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          />
                          <button onClick={saveEdit} aria-label="Save" className="cursor-pointer rounded-md p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setEditing(null)} aria-label="Cancel" className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold" style={{ color: INK }}>{c}</span>
                            <span className="text-[11px] text-slate-500">{counts[c] || 0} txn</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => startEdit(c)} aria-label="Edit" className="cursor-pointer rounded-md p-1 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30">
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button onClick={() => remove(c)} aria-label="Delete" className="cursor-pointer rounded-md p-1 text-slate-500 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}

            <form onSubmit={submitNew} className="mt-4 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="e.g. R&D, Subscriptions, Hosting"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold" style={{ color: INK }}>
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                <Lock className="h-3.5 w-3.5 text-slate-500" />
              </span>
              Built-in categories
            </h2>
            <div className="flex flex-wrap gap-2">
              {base.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {c} <span className="text-[10px] text-slate-400">{counts[c] || 0}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              Built-ins can't be removed — they're used by AI category inference and CSV templates. Add custom ones above to extend the list.
            </p>
          </section>
        </div>

        {/* Help / preview */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/40">
            <h3 className="text-sm font-bold" style={{ color: INK }}>How it works</h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> Custom categories appear in every dropdown — Transactions, Scan, Bulk, Reports.</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> Stored locally in <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">filey.web.categories</code> — never sent to any server.</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> Removing a custom category leaves existing transactions labeled — they just won't be selectable for new ones.</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> Use them in AI prompts: <em>"Sum my Hosting costs this quarter."</em></li>
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-900/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Tip</h3>
            <p className="mt-1.5 text-xs text-amber-800 dark:text-amber-200">
              Sync custom categories across devices in v0.7 — currently per-device. Export your data from Settings to migrate.
            </p>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
