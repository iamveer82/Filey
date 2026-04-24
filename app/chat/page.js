'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User as UserIcon, Plus, Sparkles, MessageSquare, ArrowRight,
  Paperclip, Mic, Square, Copy, RotateCw,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_DARK, BRAND_SOFT, INK } from '@/components/dashboard/theme';
import { useLocalList, SEED_THREADS, SEED_MESSAGES, formatWhen } from '@/lib/webStore';

const SUGGESTIONS = [
  'Log 500 AED I paid to Zain today',
  'What is my VAT reclaimable this quarter?',
  'Show me my 3 largest expenses this month',
  'Export my Q1 ledger as CSV',
];

function mockReply(user) {
  const u = user.toLowerCase();
  if (/\b(paid|spent|logged|sent)\b.*\d/.test(u)) {
    const amt = u.match(/(\d+(?:\.\d+)?)/)?.[1] || '0';
    return `✓ Logged expense of AED ${amt}. VAT 5% = AED ${(+amt * 0.05).toFixed(2)}. Added to ledger.`;
  }
  if (/vat/.test(u)) {
    return 'Current quarter VAT snapshot:\n• Reclaimable: AED 2,340\n• Owed on sales: AED 4,850\n• Net payable: **AED 2,510** due 28 May.';
  }
  if (/expense|spend|largest/.test(u)) {
    return 'Top 3 expenses this month:\n1. Rent — AED 8,500\n2. Al Futtaim invoice payment — AED 5,200\n3. DEWA bill — AED 520.';
  }
  if (/export|csv/.test(u)) {
    return 'Ledger export ready. Head to /transactions and click "Export CSV" to download.';
  }
  return 'Noted. I can log money movements, summarize VAT, explain UAE tax rules, and export data. What would you like next?';
}

export default function ChatPage() {
  const { list: threads, add: addThread } = useLocalList('filey.web.threads', SEED_THREADS);
  const [activeId, setActiveId] = useState(threads[0]?.id || 't1');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => { setActiveId(threads[0]?.id || 't1'); }, [threads.length]);

  // Load messages per thread from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `filey.web.msgs.${activeId}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setMessages(JSON.parse(raw));
      else {
        const seed = SEED_MESSAGES[activeId] || [];
        setMessages(seed);
        window.localStorage.setItem(key, JSON.stringify(seed));
      }
    } catch { setMessages([]); }
  }, [activeId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const persist = (next) => {
    setMessages(next);
    try { window.localStorage.setItem(`filey.web.msgs.${activeId}`, JSON.stringify(next)); } catch {}
  };

  const send = async (text) => {
    const content = (text || draft).trim();
    if (!content || sending) return;
    const userMsg  = { id: `m_${Date.now()}`, role: 'user', content, ts: Date.now() };
    const typing   = { id: `m_${Date.now()}_t`, role: 'assistant', content: '…', ts: Date.now() + 1, typing: true };
    const next = [...messages, userMsg, typing];
    persist(next); setDraft(''); setSending(true);
    setTimeout(() => {
      const reply = { id: `m_${Date.now()}_r`, role: 'assistant', content: mockReply(content), ts: Date.now() };
      persist([...messages, userMsg, reply]);
      setSending(false);
    }, 800 + Math.random() * 600);
  };

  const newThread = () => {
    const id = `t_${Date.now().toString(36)}`;
    const t = { id, title: 'New chat', updatedAt: Date.now() };
    addThread(t);
    setActiveId(id);
    setMessages([]);
  };

  const activeThread = threads.find(t => t.id === activeId);

  return (
    <Shell title="Chat AI" subtitle="Tool-calling agent — log transactions, query VAT, export data">
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        {/* Threads */}
        <div className="flex flex-col gap-2">
          <button onClick={newThread} className="inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition hover:scale-105" style={{ background: BRAND }}>
            <Plus className="h-4 w-4" /> New chat
          </button>
          <div className="rounded-2xl border border-slate-200 bg-white p-2">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${activeId === t.id ? 'text-white' : 'hover:bg-slate-50'}`}
                style={activeId === t.id ? { background: 'linear-gradient(135deg, ' + BRAND + ', ' + BRAND_DARK + ')' } : undefined}
              >
                <MessageSquare className={`mt-0.5 h-4 w-4 ${activeId === t.id ? 'text-white' : 'text-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-semibold ${activeId === t.id ? '' : 'text-slate-900'}`}>{t.title}</div>
                  <div className={`truncate text-[11px] ${activeId === t.id ? 'text-white/60' : 'text-slate-500'}`}>{formatWhen(t.updatedAt)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div className="flex h-[calc(100vh-280px)] min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: BRAND_SOFT }}>
                <Bot className="h-5 w-5" style={{ color: BRAND }} />
              </div>
              <div>
                <div className="font-bold" style={{ color: INK }}>{activeThread?.title || 'Filey AI'}</div>
                <div className="text-xs text-slate-500">Claude Sonnet 4 · Tool-calling enabled</div>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">● Online</span>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, ' + BRAND + ', ' + BRAND_DARK + ')' }}>
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: INK }}>How can I help?</h3>
                  <p className="mt-1 text-sm text-slate-500">Ask anything about your finances. Try:</p>
                </div>
                <div className="grid w-full max-w-md gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition hover:bg-white hover:shadow-sm">
                      {s}
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: m.role === 'user' ? BRAND : BRAND_SOFT }}>
                    {m.role === 'user' ? <UserIcon className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4" style={{ color: BRAND }} />}
                  </div>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'text-white' : 'bg-slate-50 text-slate-800'}`} style={m.role === 'user' ? { background: BRAND } : undefined}>
                    {m.typing ? (
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                            className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400"
                          />
                        ))}
                      </span>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Composer */}
          <div className="border-t border-slate-100 p-4">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600"><Paperclip className="h-4 w-4" /></button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask anything… Shift+Enter for newline"
                rows={1}
                className="max-h-32 flex-1 resize-none bg-transparent p-2 text-sm outline-none"
              />
              <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600"><Mic className="h-4 w-4" /></button>
              <button
                onClick={() => send()}
                disabled={!draft.trim() || sending}
                className="inline-flex items-center justify-center rounded-xl p-2.5 text-white shadow-sm transition hover:scale-105 disabled:opacity-50"
                style={{ background: BRAND }}
              >
                {sending ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
