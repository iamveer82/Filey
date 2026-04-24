'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Shield, Bot, Palette, Download, Upload, Trash2, Check, AlertCircle,
  Key, Globe, Bell, Moon, Sun, Save,
} from 'lucide-react';
import Shell from '@/components/dashboard/Shell';
import { BRAND, BRAND_SOFT, INK } from '@/components/dashboard/theme';

const STORAGE_KEYS = [
  'filey.web.tx', 'filey.web.bills', 'filey.web.threads', 'filey.web.team',
  'filey.web.approvals', 'filey.web.projects',
];

const PROVIDER_DEFAULTS = {
  anthropic:      { model: 'claude-sonnet-4-20250514', keyHint: 'sk-ant-…' },
  openai:         { model: 'gpt-4o-mini',              keyHint: 'sk-…' },
  google:         { model: 'gemini-2.0-flash',         keyHint: 'AIza…' },
  groq:           { model: 'llama-3.3-70b-versatile',  keyHint: 'gsk_…' },
  mistral:        { model: 'mistral-large-latest',     keyHint: '…' },
  openrouter:     { model: 'anthropic/claude-sonnet-4',keyHint: 'sk-or-…' },
  together:       { model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', keyHint: '…' },
  ollama:         { model: 'llama3.2',                 keyHint: '(empty — local)' },
  'openai-compat':{ model: '',                         keyHint: 'your-key' },
};

function validateTRN(trn) {
  const clean = (trn || '').replace(/\s/g, '');
  if (!clean) return { ok: false, msg: 'Enter TRN to validate' };
  if (!/^\d{15}$/.test(clean)) return { ok: false, msg: 'TRN must be 15 digits' };
  if (!clean.startsWith('100')) return { ok: false, msg: 'UAE TRN starts with 100' };
  return { ok: true, msg: 'Valid UAE TRN format' };
}

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: 'Veer Patel', email: 'iamveer82@gmail.com', company: 'Filey Technologies', trn: '100123456789003' });
  const [ai, setAi] = useState({ provider: 'anthropic', apiKey: '', model: 'claude-sonnet-4-20250514', baseUrl: '' });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [prefs, setPrefs] = useState({ theme: 'light', notifications: true, currency: 'AED', locale: 'en-AE' });
  const [saved, setSaved] = useState(false);
  const trn = validateTRN(profile.trn);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const p = JSON.parse(localStorage.getItem('filey.web.profile') || 'null');
      const a = JSON.parse(localStorage.getItem('filey.web.ai') || 'null');
      const r = JSON.parse(localStorage.getItem('filey.web.prefs') || 'null');
      if (p) setProfile(p); if (a) setAi(a); if (r) setPrefs(r);
    } catch {}
  }, []);

  const save = () => {
    try {
      localStorage.setItem('filey.web.profile', JSON.stringify(profile));
      localStorage.setItem('filey.web.ai', JSON.stringify(ai));
      localStorage.setItem('filey.web.prefs', JSON.stringify(prefs));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  const exportAll = () => {
    const dump = {};
    STORAGE_KEYS.concat(['filey.web.profile', 'filey.web.ai', 'filey.web.prefs']).forEach((k) => {
      const v = localStorage.getItem(k); if (v) dump[k] = JSON.parse(v);
    });
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `filey-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const importAll = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        Object.entries(d).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
        alert('Restored. Reloading…'); location.reload();
      } catch { alert('Invalid backup file'); }
    };
    r.readAsText(f);
  };

  const wipe = () => {
    if (!confirm('Erase ALL Filey web data? This cannot be undone.')) return;
    STORAGE_KEYS.concat(['filey.web.profile', 'filey.web.ai', 'filey.web.prefs']).forEach((k) => localStorage.removeItem(k));
    Object.keys(localStorage).filter(k => k.startsWith('filey.web.msgs.')).forEach(k => localStorage.removeItem(k));
    alert('Wiped. Reloading…'); location.reload();
  };

  return (
    <Shell
      title="Settings"
      subtitle="Profile, VAT, AI providers, and data management"
      action={
        <button onClick={save} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:scale-105" style={{ background: BRAND }}>
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved' : 'Save changes'}
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <Card icon={User} title="Profile" className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name"><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={inputCls} /></Field>
            <Field label="Email"><input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputCls} /></Field>
            <Field label="Company"><input value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} className={inputCls} /></Field>
            <Field label="Locale">
              <select value={profile.locale || 'en-AE'} onChange={(e) => setPrefs({ ...prefs, locale: e.target.value })} className={inputCls}>
                <option value="en-AE">English (UAE)</option>
                <option value="ar-AE">العربية (UAE)</option>
                <option value="en-GB">English (UK)</option>
              </select>
            </Field>
          </div>
        </Card>

        {/* Avatar */}
        <Card icon={Palette} title="Avatar">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl text-3xl font-bold text-white" style={{ background: `linear-gradient(135deg, ${BRAND}, #1E4BB0)` }}>
              {profile.name.charAt(0)}
            </div>
            <div className="text-center">
              <div className="font-semibold" style={{ color: INK }}>{profile.name}</div>
              <div className="text-xs text-slate-500">{profile.email}</div>
            </div>
            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Change avatar</button>
          </div>
        </Card>

        {/* TRN Validator */}
        <Card icon={Shield} title="UAE Tax Registration" className="lg:col-span-3">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Field label="TRN (Tax Registration Number)">
              <input value={profile.trn} onChange={(e) => setProfile({ ...profile, trn: e.target.value })} className={inputCls} placeholder="100 XXX XXX XXX 003" maxLength={19} />
            </Field>
            <div className="flex flex-col justify-end">
              <motion.div
                key={trn.ok + trn.msg}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                  trn.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {trn.ok ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {trn.msg}
              </motion.div>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-blue-50 p-4 text-xs text-blue-800">
            Your TRN is embedded on all outgoing invoices and used to auto-calc 5% VAT on income and expenses.
          </div>
        </Card>

        {/* AI Provider */}
        <Card icon={Bot} title="AI Brain — connect any LLM" className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Provider">
              <select value={ai.provider} onChange={(e) => setAi({ ...ai, provider: e.target.value, model: PROVIDER_DEFAULTS[e.target.value]?.model || '' })} className={inputCls}>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="google">Google (Gemini)</option>
                <option value="groq">Groq</option>
                <option value="mistral">Mistral</option>
                <option value="openrouter">OpenRouter</option>
                <option value="together">Together AI</option>
                <option value="ollama">Ollama (local)</option>
                <option value="openai-compat">Custom OpenAI-compatible</option>
              </select>
            </Field>
            <Field label="Model ID">
              <input value={ai.model} onChange={(e) => setAi({ ...ai, model: e.target.value })} className={inputCls} placeholder={PROVIDER_DEFAULTS[ai.provider]?.model || 'model-name'} />
            </Field>
            <Field label="API key" className="md:col-span-2">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="password" value={ai.apiKey} onChange={(e) => setAi({ ...ai, apiKey: e.target.value })} className={`${inputCls} pl-9`} placeholder={PROVIDER_DEFAULTS[ai.provider]?.keyHint || 'sk-...'} />
              </div>
            </Field>
            {(ai.provider === 'openai-compat' || ai.provider === 'ollama') && (
              <Field label="Base URL" className="md:col-span-2">
                <input value={ai.baseUrl || ''} onChange={(e) => setAi({ ...ai, baseUrl: e.target.value })} className={inputCls} placeholder={ai.provider === 'ollama' ? 'http://localhost:11434' : 'https://your-endpoint.com'} />
              </Field>
            )}
            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  setTesting(true); setTestResult(null);
                  try {
                    const res = await fetch('/api/chat', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ provider: ai.provider, apiKey: ai.apiKey, model: ai.model, baseUrl: ai.baseUrl, messages: [{ role: 'user', content: 'Reply with exactly: OK' }] }),
                    });
                    if (!res.ok) { setTestResult({ ok: false, msg: await res.text() }); return; }
                    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '', got = '';
                    while (true) {
                      const { done, value } = await reader.read(); if (done) break;
                      buf += dec.decode(value, { stream: true });
                      const lines = buf.split('\n'); buf = lines.pop() || '';
                      for (const l of lines) {
                        if (!l.startsWith('data:')) continue;
                        const d = l.slice(5).trim(); if (!d || d === '[DONE]') continue;
                        try { const j = JSON.parse(d); if (j.error) { setTestResult({ ok: false, msg: j.error }); return; } if (j.delta) got += j.delta; } catch {}
                      }
                    }
                    setTestResult({ ok: true, msg: got.trim().slice(0, 80) || '(empty)' });
                  } catch (e) { setTestResult({ ok: false, msg: String(e) }); }
                  finally { setTesting(false); }
                }}
                disabled={!ai.apiKey || testing}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
                style={{ background: BRAND }}
              >
                {testing ? 'Testing…' : 'Test connection'}
              </button>
              {testResult && (
                <span className={`text-xs font-semibold ${testResult.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                  {testResult.ok ? `✓ ${testResult.msg}` : `✗ ${testResult.msg.slice(0, 120)}`}
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
            Keys live in your browser (localStorage). Requests relay through Filey's edge function — keys never stored server-side.
          </div>
        </Card>

        {/* Preferences */}
        <Card icon={Globe} title="Preferences">
          <ToggleRow icon={prefs.theme === 'dark' ? Moon : Sun} label={`Theme (${prefs.theme})`}
            on={prefs.theme === 'dark'} onToggle={() => setPrefs({ ...prefs, theme: prefs.theme === 'dark' ? 'light' : 'dark' })} />
          <ToggleRow icon={Bell} label="Notifications"
            on={prefs.notifications} onToggle={() => setPrefs({ ...prefs, notifications: !prefs.notifications })} />
          <div className="mt-3">
            <Field label="Currency">
              <select value={prefs.currency} onChange={(e) => setPrefs({ ...prefs, currency: e.target.value })} className={inputCls}>
                <option>AED</option><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option>
              </select>
            </Field>
          </div>
        </Card>

        {/* Data */}
        <Card icon={Download} title="Data management" className="lg:col-span-3">
          <div className="grid gap-3 md:grid-cols-3">
            <button onClick={exportAll} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <Download className="h-4 w-4" /> Export backup (.json)
            </button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <Upload className="h-4 w-4" /> Import backup
              <input type="file" accept="application/json" hidden onChange={importAll} />
            </label>
            <button onClick={wipe} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100">
              <Trash2 className="h-4 w-4" /> Erase all data
            </button>
          </div>
        </Card>
      </div>
    </Shell>
  );
}

function Card({ icon: I, title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 ${className}`}>
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: BRAND_SOFT }}>
          <I className="h-4 w-4" style={{ color: BRAND }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: INK }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ icon: I, label, on, onToggle }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
        <I className="h-4 w-4 text-slate-500" /> {label}
      </span>
      <button onClick={onToggle} className={`inline-flex h-6 w-11 items-center rounded-full p-0.5 transition ${on ? '' : 'bg-slate-200'}`} style={on ? { background: BRAND } : undefined}>
        <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400";
function Field({ label, children, className = '' }) {
  return <label className={`block ${className}`}><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
