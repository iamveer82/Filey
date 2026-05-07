'use client';

import { useEffect, useState } from 'react';

/**
 * Client-side plan state. Persists to localStorage.
 * Server enforcement comes later via Stripe webhook → Supabase.
 * For now: honor-system with explicit upgrade flow. Keep logic centralised.
 */

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'AED',
    tagline: 'Forever free core features',
    limits: {
      invoicesPerMonth: 5,
      // OCR is local Tesseract (zero cost) and AI extract is BYOK (user pays
      // the LLM provider directly). Filey has no marginal cost so scans stay
      // unlimited even on free.
      scansPerMonth: Infinity,
      csvImportsPerMonth: 2,
      projects: 2,
      teamMembers: 1,
      premiumTemplates: false,
      bankSync: false,
      prioritySupport: false,
      // BYOK chat works on every plan. `advancedAi` flags Pro-only perks like
      // server-cached context + premium prompt packs (not raw model access).
      advancedAi: false,
      customBranding: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    currency: 'AED',
    tagline: 'For freelancers & solo SMBs',
    billing: 'monthly',
    limits: {
      invoicesPerMonth: Infinity,
      scansPerMonth: Infinity,
      csvImportsPerMonth: Infinity,
      projects: Infinity,
      teamMembers: 1,
      premiumTemplates: true,
      bankSync: true,
      prioritySupport: true,
      advancedAi: true,
      customBranding: true,
    },
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    price: 99,
    currency: 'AED',
    tagline: 'Teams & accountants',
    billing: 'monthly',
    limits: {
      invoicesPerMonth: Infinity,
      scansPerMonth: Infinity,
      csvImportsPerMonth: Infinity,
      projects: Infinity,
      teamMembers: 10,
      premiumTemplates: true,
      bankSync: true,
      prioritySupport: true,
      advancedAi: true,
      customBranding: true,
      multiClient: true,
      whiteLabel: true,
    },
  },
};

const KEY = 'filey.web.plan';

export function loadPlan() {
  if (typeof window === 'undefined') return PLANS.free;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return PLANS.free;
    const data = JSON.parse(raw);
    return PLANS[data.id] ? { ...PLANS[data.id], ...data } : PLANS.free;
  } catch {
    return PLANS.free;
  }
}

export function savePlan(planId, extra = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ id: planId, since: Date.now(), ...extra }));
    window.dispatchEvent(new CustomEvent('filey:plan-changed'));
  } catch {}
}

/**
 * React hook. Returns { plan, isPro, isAgency, setPlan, usage, canUse }.
 * Usage counted per-feature from localStorage (`filey.web.usage`).
 */
export function usePlan() {
  const [plan, setPlan] = useState(PLANS.free);
  const [usage, setUsage] = useState({});

  useEffect(() => {
    setPlan(loadPlan());
    setUsage(loadUsage());
    const sync = () => {
      setPlan(loadPlan());
      setUsage(loadUsage());
    };
    window.addEventListener('filey:plan-changed', sync);
    window.addEventListener('filey:usage-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('filey:plan-changed', sync);
      window.removeEventListener('filey:usage-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isPro = plan.id === 'pro' || plan.id === 'agency';
  const isAgency = plan.id === 'agency';

  // Check whether user can use a limited feature this month.
  const canUse = (featureKey) => {
    const limit = plan.limits?.[featureKey];
    if (limit === Infinity || limit === true) return true;
    if (limit === false || limit == null) return false;
    const count = usage[monthKey(featureKey)] || 0;
    return count < limit;
  };

  const remaining = (featureKey) => {
    const limit = plan.limits?.[featureKey];
    if (limit === Infinity) return Infinity;
    if (typeof limit !== 'number') return 0;
    return Math.max(0, limit - (usage[monthKey(featureKey)] || 0));
  };

  const track = (featureKey, amount = 1) => {
    const key = monthKey(featureKey);
    const next = { ...loadUsage(), [key]: (loadUsage()[key] || 0) + amount };
    saveUsage(next);
  };

  const setPlanId = (id, extra) => {
    savePlan(id, extra);
    setPlan(loadPlan());
  };

  return { plan, isPro, isAgency, usage, canUse, remaining, track, setPlan: setPlanId };
}

// ---- usage tracking ----

const USAGE_KEY = 'filey.web.usage';

function monthKey(feature) {
  const d = new Date();
  return `${feature}:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function loadUsage() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(USAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveUsage(next) {
  try {
    window.localStorage.setItem(USAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('filey:usage-changed'));
  } catch {}
}

export function trackUsage(feature, amount = 1) {
  const next = { ...loadUsage(), [monthKey(feature)]: (loadUsage()[monthKey(feature)] || 0) + amount };
  saveUsage(next);
}
