'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paperclip, ArrowRight, ArrowLeft, Check, AlertCircle, Sparkles, Building2,
  Shield, Bot, ScanLine, FileText, X, Crown,
} from 'lucide-react';
import { BRAND, BRAND_DARK, BRAND_SOFT, INK } from '@/components/dashboard/theme';

const EASE = [0.22, 1, 0.36, 1];

const STEPS = [
  { id: 'welcome',  title: 'Welcome',           hint: 'Tell us who you are' },
  { id: 'business', title: 'Business profile',  hint: 'Company name + UAE TRN' },
  { id: 'ai',       title: 'AI brain',          hint: 'Bring your own key (or skip)' },
  { id: 'first',    title: 'First action',      hint: 'Pick a starter task' },
  { id: 'done',     title: 'All set',           hint: 'Open your dashboard' },
];

function validateTRN(trn) {
  const clean = (trn || '').replace(/\s/g, '');
  if (!clean) return { ok: false, msg: '' };
  if (!/^\d{15}$/.test(clean)) return { ok: false, msg: 'TRN must be 15 digits' };
  if (!clean.startsWith('100')) return { ok: false, msg: 'UAE TRN starts with 100' };
  return { ok: true, msg: 'Valid UAE TRN format' };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ name: '', email: '', company: '', trn: '' });
  const [ai, setAi] = useState({ provider: 'anthropic', apiKey: '', model: 'claude-sonnet-4-20250514' });
  const [firstAction, setFirstAction] = useState(null);

  // Pre-fill from existing localStorage if user is restarting
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const p = JSON.parse(localStorage.getItem('filey.web.profile') || 'null');
      const a = JSON.parse(localStorage.getItem('filey.web.ai') || 'null');
      if (p) setProfile((s) => ({ ...s, ...p }));
      if (a) setAi((s) => ({ ...s, ...a }));
    } catch {}
  }, []);

  const trn = useMemo(() => validateTRN(profile.trn), [profile.trn]);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const canProceed = () => {
    if (step === 0) return profile.name.trim().length > 1;
    if (step === 1) return profile.company.trim().length > 1; // TRN optional
    if (step === 2) return true; // AI key optional
    if (step === 3) return true;
    return true;
  };

  const finish = () => {
    try {
      localStorage.setItem('filey.web.profile', JSON.stringify(profile));
      localStorage.setItem('filey.web.ai', JSON.stringify(ai));
      localStorage.setItem('filey.web.onboarded', String(Date.now()));
      localStorage.setItem('filey.web.seenWelcome', String(Date.now()));
    } catch {}
    if (firstAction === 'scan')        router.push('/scan');
    else if (firstAction === 'invoice') router.push('/invoice');
    else if (firstAction === 'chat')    router.push('/chat');
    else                                router.push('/');
  };

  const skip = () => {
    try { localStorage.setItem('filey.web.onboarded', String(Date.now())); } catch {}
    router.push('/');
  };

  const progress = ((step + 1) / STEPS.length) * 100;
  const current = STEPS[step];

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm" style={{ background: BRAND }}>
            <Paperclip className="h-4 w-4 text-white" style={{ transform: 'scaleX(-1)' }} />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: INK }}>Filey</span>
        </Link>
        <button
          onClick={skip}
          className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
        >
          Skip setup <X className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* Progress bar */}
      <div className="px-6 sm:px-10">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            Step {step + 1} of {STEPS.length} · <span style={{ color: INK }}>{current.title}</span>
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${BRAND}, ${BRAND_DARK})` }}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: EASE }}
          />
        </div>
      </div>

      {/* Step content */}
      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div className="relative w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10"
            >
              {step === 0 && <StepWelcome profile={profile} setProfile={setProfile} />}
              {step === 1 && <StepBusiness profile={profile} setProfile={setProfile} trn={trn} />}
              {step === 2 && <StepAi ai={ai} setAi={setAi} />}
              {step === 3 && <StepFirst firstAction={firstAction} setFirstAction={setFirstAction} />}
              {step === 4 && <StepDone profile={profile} firstAction={firstAction} />}
            </motion.div>
          </AnimatePresence>

          {/* Step dots */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => i < step && setStep(i)}
                aria-label={`Go to ${s.title}`}
                disabled={i > step}
                className={`h-2 rounded-full transition-all ${i === step ? 'w-8' : 'w-2'} ${
                  i < step ? 'cursor-pointer bg-slate-900' : i === step ? '' : 'bg-slate-200'
                } disabled:cursor-not-allowed`}
                style={i === step ? { background: BRAND } : undefined}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer nav */}
      <footer className="flex items-center justify-between border-t border-slate-200 bg-white/60 px-6 py-4 backdrop-blur sm:px-10">
        <button
          onClick={back}
          disabled={step === 0}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <span className="hidden text-xs text-slate-400 sm:inline">{current.hint}</span>
        {step === STEPS.length - 1 ? (
          <button
            onClick={finish}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
          >
            Open dashboard <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={next}
            disabled={!canProceed()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </footer>
    </div>
  );
}

// ---- Steps ----

function StepWelcome({ profile, setProfile }) {
  return (
    <div>
      <Badge>Step 1 · Welcome</Badge>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: INK }}>
        Hi, let's set up your <span style={{ color: BRAND }}>Filey</span>.
      </h1>
      <p className="mt-2 text-slate-500">Two minutes — we keep your data on this device unless you choose to sync.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <input
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            placeholder="Veer Patel"
            className={inputCls}
            autoFocus
          />
        </Field>
        <Field label="Email (optional)">
          <input
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            placeholder="you@business.ae"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong>Privacy-first.</strong> Your name + email stay in this browser. We only call the cloud when you ask AI a question or sync to a team.
        </div>
      </div>
    </div>
  );
}

function StepBusiness({ profile, setProfile, trn }) {
  return (
    <div>
      <Badge icon={Building2}>Step 2 · Business profile</Badge>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: INK }}>
        FTA-ready in one paste.
      </h1>
      <p className="mt-2 text-slate-500">Your TRN goes on every invoice — required for VAT-registered UAE businesses.</p>

      <div className="mt-6 space-y-4">
        <Field label="Company name">
          <input
            value={profile.company}
            onChange={(e) => setProfile({ ...profile, company: e.target.value })}
            placeholder="Acme Trading LLC"
            className={inputCls}
            autoFocus
          />
        </Field>

        <Field label="UAE Tax Registration Number (15 digits)">
          <input
            value={profile.trn}
            onChange={(e) => setProfile({ ...profile, trn: e.target.value })}
            placeholder="100 XXX XXX XXX 003"
            maxLength={19}
            className={inputCls}
          />
        </Field>

        {profile.trn && (
          <motion.div
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
              trn.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {trn.ok ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {trn.msg || 'Add 15 digits'}
          </motion.div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <Shield className="mb-1 inline h-3.5 w-3.5" /> Don't have a TRN yet? Skip — you can add it later from Settings. Filey still works for non-VAT freelancers.
        </div>
      </div>
    </div>
  );
}

function StepAi({ ai, setAi }) {
  return (
    <div>
      <Badge icon={Bot}>Step 3 · AI brain</Badge>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: INK }}>
        Bring your own AI key.
      </h1>
      <p className="mt-2 text-slate-500">Filey is BYOK — you control the model and the bill. Anthropic, OpenAI, Google, Groq, Ollama (local + cloud) and more.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Provider">
          <select value={ai.provider} onChange={(e) => setAi({ ...ai, provider: e.target.value })} className={inputCls}>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (GPT)</option>
            <option value="google">Google (Gemini)</option>
            <option value="groq">Groq</option>
            <option value="mistral">Mistral</option>
            <option value="openrouter">OpenRouter</option>
            <option value="together">Together AI</option>
            <option value="ollama">Ollama (local)</option>
            <option value="ollama-cloud">Ollama Cloud (hosted)</option>
          </select>
        </Field>
        <Field label="Model">
          <input value={ai.model} onChange={(e) => setAi({ ...ai, model: e.target.value })} className={inputCls} />
        </Field>
        <Field label="API key (optional — skip if undecided)" className="sm:col-span-2">
          <input
            type="password"
            value={ai.apiKey}
            onChange={(e) => setAi({ ...ai, apiKey: e.target.value })}
            placeholder={ai.provider === 'ollama' ? '(leave empty for local)' : 'sk-...'}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-5 rounded-xl bg-amber-50 p-4 text-xs text-amber-900">
        <Crown className="mb-0.5 inline h-3.5 w-3.5" /> <strong>Pro</strong> includes a shared rate-limited Claude key + advanced vision OCR. <Link href="/pricing" className="font-bold underline">See plans</Link>.
      </div>
    </div>
  );
}

const FIRST_ACTIONS = [
  { id: 'scan',    icon: ScanLine, title: 'Scan a receipt',          desc: 'Auto-extract merchant, total, VAT', tint: '#10B981' },
  { id: 'invoice', icon: FileText, title: 'Create your first invoice', desc: 'FTA-ready PDF in 30 seconds',       tint: BRAND   },
  { id: 'chat',    icon: Bot,      title: 'Ask the AI assistant',    desc: 'Try: What is my VAT this quarter?',  tint: '#8B5CF6'},
];

function StepFirst({ firstAction, setFirstAction }) {
  return (
    <div>
      <Badge icon={Sparkles}>Step 4 · First action</Badge>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: INK }}>
        What do you want to do first?
      </h1>
      <p className="mt-2 text-slate-500">Pick one — we'll drop you straight in. Skip if you'd rather explore the dashboard.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {FIRST_ACTIONS.map((a) => {
          const I = a.icon;
          const active = firstAction === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setFirstAction(active ? null : a.id)}
              className={`group cursor-pointer rounded-2xl border p-4 text-left transition hover:shadow-md ${
                active ? 'border-2 shadow-lg' : 'border-slate-200'
              }`}
              style={active ? { borderColor: a.tint } : undefined}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: a.tint }}>
                <I className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-bold" style={{ color: INK }}>{a.title}</div>
              <div className="mt-0.5 text-xs text-slate-500">{a.desc}</div>
              {active && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: a.tint }}>
                  <Check className="h-3 w-3" /> Selected
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepDone({ profile, firstAction }) {
  const target = FIRST_ACTIONS.find((a) => a.id === firstAction);
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl shadow-lg"
        style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}
      >
        <Check className="h-10 w-10 text-white" strokeWidth={3} />
      </motion.div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: INK }}>
        You're set, {profile.name?.split(' ')[0] || 'friend'}.
      </h1>
      <p className="mt-2 text-slate-500">
        Profile saved locally. {target ? `Opening ${target.title.toLowerCase()} next.` : 'Heading to your dashboard.'}
      </p>

      <div className="mx-auto mt-6 grid max-w-md gap-2 text-left text-xs">
        <DoneRow ok>Profile + locale saved on this device</DoneRow>
        <DoneRow ok>UAE TRN ready for invoicing</DoneRow>
        <DoneRow ok>AI provider configured (you control the key)</DoneRow>
        <DoneRow ok>5 free invoices + 50 receipt scans every month</DoneRow>
      </div>

      <div className="mt-6 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
        <Sparkles className="h-3 w-3" /> Want unlimited? <Link href="/pricing" className="ml-1 underline">Try Pro free for 14 days</Link>
      </div>
    </div>
  );
}

// ---- Helpers ----

function Badge({ icon: I, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ background: BRAND_SOFT, color: BRAND }}>
      {I && <I className="h-3 w-3" />} {children}
    </span>
  );
}

function DoneRow({ ok, children }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
      </span>
      <span className="text-slate-700">{children}</span>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}
