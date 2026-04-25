'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import {
  Send, Sparkles, Plus, MessageSquare, Trash2, Copy, Check, Square,
  PanelLeftClose, PanelLeftOpen, Settings as Cog, AlertTriangle, Bot,
  Paperclip, X, ImageIcon, FileText as FileIcon, FileType,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_DARK, BRAND_SOFT, INK } from '@/components/dashboard/theme';
import { useLocalList, SEED_THREADS, SEED_MESSAGES, formatWhen, buildFinanceContext } from '@/lib/webStore';
import { readAttachment, attachmentSupport } from '@/lib/chatAttachments';
import { toast } from 'sonner';

const SUGGESTIONS = [
  { label: 'Log 500 AED paid to Zain today',           icon: '💸' },
  { label: 'What is my VAT reclaimable this quarter?', icon: '📊' },
  { label: 'Show 3 largest expenses this month',       icon: '🧾' },
  { label: 'Export my Q1 ledger as CSV',               icon: '📤' },
];

function loadAI() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('filey.web.ai') || 'null'); } catch { return null; }
}

export default function ChatPage() {
  return (
    <Suspense fallback={<Shell title="Chat AI" subtitle="Loading…"><div className="h-[560px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /></Shell>}>
      <ChatInner />
    </Suspense>
  );
}

function ChatInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { list: threads, add: addThread, remove: removeThread, update: updateThread } = useLocalList('filey.web.threads', SEED_THREADS);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pendingAtts, setPendingAtts] = useState([]); // attachments staged on the composer
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ai, setAi] = useState(null);
  const [abortCtrl, setAbortCtrl] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const listRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { setAi(loadAI()); }, []);
  useEffect(() => { if (!activeId && threads.length) setActiveId(threads[0].id); }, [threads, activeId]);

  // Prefill from ?q= — open new thread with the prompt queued in the composer
  const prefillRef = useRef(false);
  useEffect(() => {
    if (prefillRef.current) return;
    const q = searchParams.get('q');
    if (!q) return;
    prefillRef.current = true;
    // Start a fresh thread so the incoming question is isolated from history
    const id = `t_${Date.now().toString(36)}`;
    addThread({ id, title: q.slice(0, 48), updatedAt: Date.now() });
    setActiveId(id);
    setMessages([]);
    setDraft(q);
    // Strip ?q from URL so refresh doesn't re-trigger
    router.replace('/chat');
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, [searchParams, addThread, router]);

  // Per-thread message load
  useEffect(() => {
    if (!activeId || typeof window === 'undefined') return;
    const key = `filey.web.msgs.${activeId}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setMessages(JSON.parse(raw));
      else { const seed = SEED_MESSAGES[activeId] || []; setMessages(seed); window.localStorage.setItem(key, JSON.stringify(seed)); }
    } catch { setMessages([]); }
  }, [activeId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [draft]);

  const persist = useCallback((next) => {
    setMessages(next);
    if (activeId) try { window.localStorage.setItem(`filey.web.msgs.${activeId}`, JSON.stringify(next)); } catch {}
  }, [activeId]);

  const newThread = () => {
    const id = `t_${Date.now().toString(36)}`;
    addThread({ id, title: 'New chat', updatedAt: Date.now() });
    setActiveId(id); setMessages([]); setDraft('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const deleteThread = (id) => {
    removeThread(id);
    try { localStorage.removeItem(`filey.web.msgs.${id}`); } catch {}
    if (activeId === id) { setActiveId(null); setMessages([]); }
  };

  const addFiles = useCallback(async (files) => {
    const cfg = loadAI();
    const sup = attachmentSupport(cfg?.provider);
    const ok = [];
    for (const f of files) {
      try {
        const att = await readAttachment(f);
        if (att.kind === 'image' && !sup.image) {
          toast.error(`${cfg?.provider || 'This provider'} doesn't support image input. Try Claude, GPT-4o, or Gemini.`);
          continue;
        }
        if (att.kind === 'document' && !sup.pdf) {
          toast.error(`PDFs only work with Claude or Gemini. ${cfg?.provider} cannot read them — convert to text or screenshot first.`);
          continue;
        }
        ok.push(att);
      } catch (e) {
        toast.error(e.message || String(e));
      }
    }
    if (ok.length) setPendingAtts((prev) => [...prev, ...ok]);
  }, []);

  const removeAtt = (id) => setPendingAtts((prev) => prev.filter(a => a.id !== id));

  const send = async (text) => {
    const content = (text || draft).trim();
    if ((!content && pendingAtts.length === 0) || sending) return;

    const cfg = loadAI();
    if (!cfg?.apiKey) {
      const errMsg = { id: `m_${Date.now()}_err`, role: 'assistant', content: '⚠ No API key configured. Go to **[Settings → AI Brain](/settings)** to add one. Then try again.', ts: Date.now() };
      persist([...messages, { id: `u_${Date.now()}`, role: 'user', content, ts: Date.now() }, errMsg]);
      setDraft(''); return;
    }

    const userMsg = { id: `u_${Date.now()}`, role: 'user', content, attachments: pendingAtts, ts: Date.now() };
    const asstId  = `a_${Date.now()}`;
    const asstMsg = { id: asstId, role: 'assistant', content: '', ts: Date.now() + 1, streaming: true };
    const baseline = [...messages, userMsg];
    persist([...baseline, asstMsg]);
    setDraft(''); setPendingAtts([]); setSending(true);

    // Auto-title from first message
    if (activeId && messages.length === 0) {
      updateThread(activeId, { title: content.slice(0, 48), updatedAt: Date.now() });
    }

    const ctrl = new AbortController(); setAbortCtrl(ctrl);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: cfg.provider, apiKey: cfg.apiKey, model: cfg.model, baseUrl: cfg.baseUrl,
          system: buildFinanceContext(),
          messages: baseline.map(m => ({ role: m.role, content: m.content, attachments: m.attachments || [] })),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const txt = await res.text();
        persist([...baseline, { ...asstMsg, content: `⚠ ${txt || 'Request failed'}`, streaming: false, error: true }]);
        setSending(false); return;
      }

      const reader = res.body.getReader(); const dec = new TextDecoder();
      let buf = '', acc = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const d = line.slice(5).trim(); if (!d || d === '[DONE]') continue;
          try {
            const j = JSON.parse(d);
            if (j.error) { acc += `\n\n⚠ ${j.error}`; }
            if (j.delta) acc += j.delta;
            setMessages((prev) => prev.map(m => m.id === asstId ? { ...m, content: acc } : m));
          } catch {}
        }
      }
      const final = [...baseline, { ...asstMsg, content: acc || '(no response)', streaming: false }];
      persist(final);
    } catch (e) {
      if (e.name !== 'AbortError') {
        persist([...baseline, { ...asstMsg, content: `⚠ ${String(e)}`, streaming: false, error: true }]);
      } else {
        persist((prev => prev.map(m => m.id === asstId ? { ...m, streaming: false, content: m.content + '\n\n_(stopped)_' } : m))(messages));
      }
    } finally { setSending(false); setAbortCtrl(null); }
  };

  const stop = () => { abortCtrl?.abort(); };

  const copy = (id, text) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); };

  const activeThread = threads.find(t => t.id === activeId);
  const hasKey = !!ai?.apiKey;
  const providerLabel = ai?.provider ? ({ anthropic: 'Claude', openai: 'GPT', google: 'Gemini', groq: 'Groq', mistral: 'Mistral', openrouter: 'OpenRouter', together: 'Together', ollama: 'Ollama', 'openai-compat': 'Custom' }[ai.provider] || ai.provider) : 'Not configured';

  return (
    <Shell title="Chat AI" subtitle={hasKey ? `Connected to ${providerLabel} · ${ai.model || ''}` : 'No AI brain connected — set one in Settings'}>
      <div className="flex h-[calc(100vh-240px)] min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* Threads sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }} animate={{ width: 260, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden border-r border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50"
            >
              <div className="flex h-full w-[260px] flex-col">
                <div className="p-3">
                  <button onClick={newThread} className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
                    <Plus className="h-4 w-4" /> New chat
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-3">
                  <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Recent</div>
                  {threads.map((t) => (
                    <div key={t.id} className={`group relative mb-1 rounded-xl transition ${activeId === t.id ? 'text-white' : 'text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800'}`} style={activeId === t.id ? { background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` } : undefined}>
                      <button onClick={() => setActiveId(t.id)} className="flex w-full items-start gap-2 p-2.5 pr-9 text-left">
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{t.title}</div>
                          <div className={`truncate text-[11px] ${activeId === t.id ? 'text-white/60' : 'text-slate-500'}`}>{formatWhen(t.updatedAt)}</div>
                        </div>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete chat?')) deleteThread(t.id); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 opacity-0 transition hover:bg-black/20 group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 p-3 dark:border-slate-800">
                  <Link href="/settings" className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800">
                    <Cog className="h-3.5 w-3.5" /> AI settings
                  </Link>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main conversation */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button onClick={() => setSidebarOpen(v => !v)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}>
                {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </button>
              <div className="font-bold" style={{ color: INK }}>{activeThread?.title || 'Filey AI'}</div>
            </div>
            <div className="flex items-center gap-2">
              {hasKey ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {providerLabel}
                </span>
              ) : (
                <Link href="/settings" className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                  <AlertTriangle className="h-3 w-3" /> Connect LLM
                </Link>
              )}
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <EmptyWelcome onPick={send} />
            ) : (
              <div className="mx-auto max-w-3xl px-4 py-8">
                {messages.map((m, i) => (
                  <MessageRow key={m.id} msg={m} onCopy={() => copy(m.id, m.content)} copied={copiedId === m.id} />
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div
            className={`border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${dragOver ? 'ring-2 ring-blue-300' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              const files = Array.from(e.dataTransfer?.files || []);
              if (files.length) addFiles(files);
            }}
          >
            <div className="mx-auto max-w-3xl">
              {/* Pending attachments row */}
              {pendingAtts.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {pendingAtts.map((a) => (
                    <AttachmentChip key={a.id} att={a} onRemove={() => removeAtt(a.id)} />
                  ))}
                </div>
              )}
              <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:border-slate-700 dark:bg-slate-800">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  onPaste={(e) => {
                    const files = Array.from(e.clipboardData?.files || []);
                    if (files.length) { e.preventDefault(); addFiles(files); }
                  }}
                  placeholder={hasKey ? (dragOver ? 'Drop files to attach…' : 'Message Filey AI…  (Shift+Enter for newline · paste or drop files)') : 'Set an API key in Settings to start chatting'}
                  rows={1}
                  className="block w-full resize-none rounded-2xl bg-transparent px-4 py-3.5 pl-12 pr-14 text-sm outline-none placeholder-slate-400 dark:text-slate-100"
                  style={{ minHeight: 52 }}
                />
                {/* Attach button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach files"
                  title="Attach images, PDFs, or text files"
                  className="absolute bottom-2.5 left-2.5 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,text/*,.csv,.json,.md,.log,.yml,.yaml,.xml,.html,.js,.ts,.py"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) addFiles(files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                {sending ? (
                  <button onClick={stop} aria-label="Stop" className="absolute bottom-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm transition hover:opacity-90" style={{ background: '#1E293B' }}>
                    <Square className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={() => send()} disabled={!draft.trim() && pendingAtts.length === 0} aria-label="Send" className="absolute bottom-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm transition hover:opacity-90 disabled:opacity-40" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-2 text-center text-[11px] text-slate-400">
                Filey AI can make mistakes. Verify critical financial figures.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function EmptyWelcome({ onPick }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }} className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
        <Sparkles className="h-7 w-7 text-white" />
      </motion.div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>How can I help today?</h2>
        <p className="mt-2 text-sm text-slate-500">Your UAE finance copilot. Ask about VAT, log transactions, or query your ledger.</p>
      </div>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button key={s.label} onClick={() => onPick(s.label)} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <span className="text-xl">{s.icon}</span>
            <span className="flex-1">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AttachmentChip({ att, onRemove, compact }) {
  const Icon = att.kind === 'image' ? ImageIcon : att.kind === 'document' ? FileType : FileIcon;
  const sizeLabel = att.size > 1024 * 1024 ? `${(att.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(att.size / 1024))} KB`;
  return (
    <div className={`group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 ${compact ? '' : 'pr-1.5'}`}>
      {att.kind === 'image' && att.dataB64 ? (
        <img src={`data:${att.mediaType};base64,${att.dataB64}`} alt={att.name} className="h-6 w-6 rounded object-cover" />
      ) : (
        <Icon className="h-4 w-4 text-slate-500" />
      )}
      <span className="max-w-[160px] truncate font-medium text-slate-700 dark:text-slate-200">{att.name}</span>
      <span className="text-[10px] text-slate-400">{sizeLabel}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove ${att.name}`}
          className="ml-0.5 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function MessageRow({ msg, onCopy, copied }) {
  const isUser = msg.role === 'user';
  const atts = msg.attachments || [];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`mb-6 flex gap-4 ${isUser ? 'justify-end' : ''}`}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}>
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={`group min-w-0 ${isUser ? 'max-w-[85%]' : 'flex-1'}`}>
        {isUser && atts.length > 0 && (
          <div className="mb-2 flex flex-wrap justify-end gap-2">
            {atts.map((a) => <AttachmentChip key={a.id} att={a} compact />)}
          </div>
        )}
        <div className={`${isUser ? 'rounded-2xl rounded-tr-md bg-slate-100 px-4 py-3 text-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100' : 'text-[15px] leading-relaxed text-slate-800 dark:text-slate-100'}`}>
          {isUser ? (
            msg.content ? <div className="whitespace-pre-wrap">{msg.content}</div> : <span className="italic text-slate-500">(attachment only)</span>
          ) : msg.streaming && !msg.content ? (
            <TypingDots />
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-pre:my-3 prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-a:text-blue-600">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && !msg.streaming && msg.content && (
          <div className="mt-2 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
            <button onClick={onCopy} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1">
      {[0, 1, 2].map(i => (
        <motion.span key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
      ))}
    </span>
  );
}
