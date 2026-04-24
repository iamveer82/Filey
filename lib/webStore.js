'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Hook returning [list, setList, ops] backed by localStorage.
 * SSR-safe. Notifies via storage events so multiple tabs sync.
 */
export function useLocalList(key, seed = []) {
  const [list, setList] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setList(JSON.parse(raw));
      else {
        setList(seed);
        window.localStorage.setItem(key, JSON.stringify(seed));
      }
    } catch { setList(seed); }
    setReady(true);
    const onStore = (e) => {
      if (e.key === key && e.newValue) {
        try { setList(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', onStore);
    return () => window.removeEventListener('storage', onStore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const persist = useCallback((next) => {
    setList(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }, [key]);

  const add    = useCallback((item) => persist([{ id: `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`, ts: Date.now(), ...item }, ...list]), [list, persist]);
  const remove = useCallback((id)   => persist(list.filter((x) => x.id !== id)), [list, persist]);
  const update = useCallback((id, patch) => persist(list.map((x) => x.id === id ? { ...x, ...patch } : x)), [list, persist]);
  const clear  = useCallback(()     => persist([]), [persist]);

  return { list, ready, add, remove, update, clear, setAll: persist };
}

export const SEED_TX = [
  { id: 'tx1', name: 'Noor Creative Co.', merchant: 'Invoice INV-2401', amount: 12500, type: 'income',  category: 'Freelance', vat: 625,  status: 'Settled', ts: Date.now() - 1000*60*10 },
  { id: 'tx2', name: 'Zain Wifi',         merchant: 'Monthly sub',      amount: 310,   type: 'expense', category: 'Utilities', vat: 15.5, status: 'Paid',    ts: Date.now() - 1000*60*60*2 },
  { id: 'tx3', name: 'Talabat · Lunch',   merchant: 'Al Barsha',        amount: 48,    type: 'expense', category: 'Food',      vat: 2.4,  status: 'Cleared', ts: Date.now() - 1000*60*60*5 },
  { id: 'tx4', name: 'DEWA Electricity',  merchant: 'Apr bill',         amount: 520,   type: 'expense', category: 'Utilities', vat: 26,   status: 'Paid',    ts: Date.now() - 1000*60*60*24 },
  { id: 'tx5', name: 'Careem ride',       merchant: 'DXB airport',      amount: 87,    type: 'expense', category: 'Travel',    vat: 4.35, status: 'Cleared', ts: Date.now() - 1000*60*60*36 },
  { id: 'tx6', name: 'Amazon AE',         merchant: 'Office supplies',  amount: 245,   type: 'expense', category: 'Supplies',  vat: 12.25,status: 'Paid',    ts: Date.now() - 1000*60*60*48 },
  { id: 'tx7', name: 'Client: Al Futtaim',merchant: 'Consulting Q1',    amount: 25000, type: 'income',  category: 'Freelance', vat: 1250, status: 'Settled', ts: Date.now() - 1000*60*60*72 },
];

export const SEED_BILLS = [
  { id: 'b1', name: 'DEWA',    amount: 520,  dueDate: '2026-04-30', reminder: true,  iconId: 'electric', brand: 'electric' },
  { id: 'b2', name: 'Etisalat',amount: 399,  dueDate: '2026-05-03', reminder: true,  iconId: 'wifi',     brand: 'etisalat' },
  { id: 'b3', name: 'Netflix', amount: 56,   dueDate: '2026-05-05', reminder: true,  iconId: 'netflix',  brand: 'netflix'  },
  { id: 'b4', name: 'Spotify', amount: 19.99,dueDate: '2026-05-12', reminder: false, iconId: 'spotify',  brand: 'spotify'  },
];

export const SEED_THREADS = [
  { id: 't1', title: 'Q1 VAT planning',      updatedAt: Date.now() - 1000*60*30 },
  { id: 't2', title: 'Receipt categorization',updatedAt: Date.now() - 1000*60*60*3 },
  { id: 't3', title: 'Freelance tax advice', updatedAt: Date.now() - 1000*60*60*24 },
];

export const SEED_MESSAGES = {
  t1: [
    { id: 'm1', role: 'user',      content: 'When is my Q1 VAT due?',        ts: Date.now()-1000*60*35 },
    { id: 'm2', role: 'assistant', content: 'UAE Q1 VAT (Jan-Mar) filing & payment due by 28 April. You have **AED 2,340** reclaimable and **AED 4,850** owed. Net payable ≈ AED 2,510.', ts: Date.now()-1000*60*30 },
  ],
};

export const SEED_TEAM = [
  { id: 'u1', name: 'Veer Patel',   role: 'Owner',    email: 'iamveer82@gmail.com', cap: 100000, spent: 18500 },
  { id: 'u2', name: 'Aisha Mansoor',role: 'Approver', email: 'aisha@filey.ae',      cap: 20000,  spent: 6200  },
  { id: 'u3', name: 'Rakesh Kumar', role: 'Member',   email: 'rakesh@filey.ae',     cap: 5000,   spent: 2340  },
];

export const SEED_APPROVALS = [
  { id: 'a1', who: 'Rakesh Kumar', amount: 340,  merchant: 'LuLu Hypermarket', status: 'pending', ts: Date.now() - 1000*60*60 },
  { id: 'a2', who: 'Aisha Mansoor',amount: 1200, merchant: 'Emirates flight',  status: 'pending', ts: Date.now() - 1000*60*60*4 },
  { id: 'a3', who: 'Rakesh Kumar', amount: 88,   merchant: 'Uber',             status: 'approved',ts: Date.now() - 1000*60*60*24 },
];

export const SEED_PROJECTS = [
  { id: 'p1', name: 'Noor Creative Co.', client: 'Noor Co.',     budget: 40000, spent: 12500, status: 'active',    deadline: '2026-06-30' },
  { id: 'p2', name: 'Al Futtaim Q1',     client: 'Al Futtaim',   budget: 60000, spent: 25000, status: 'active',    deadline: '2026-07-15' },
  { id: 'p3', name: 'Brand refresh',     client: 'Self',         budget: 15000, spent: 14800, status: 'completed', deadline: '2026-03-10' },
];

export const CATEGORIES = [
  'Freelance','Utilities','Food','Travel','Supplies','Marketing','Software','Rent','Other',
];

export function formatAED(n) {
  const num = +n || 0;
  return `AED ${Math.abs(num).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatWhen(ts) {
  const d = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
