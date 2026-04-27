'use client';

// Custom categories — extends the built-in CATEGORIES list. Lives in localStorage
// at `filey.web.categories` as an array of strings. SSR-safe.

import { useEffect, useState } from 'react';
import { CATEGORIES as BASE } from './webStore';

const KEY = 'filey.web.categories';
const EVENT = 'filey:categories-changed';

function loadRaw() {
  if (typeof window === 'undefined') return [];
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string' && s.trim()) : [];
  } catch { return []; }
}

function saveRaw(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {}
}

export function useCategories() {
  const [custom, setCustom] = useState([]);

  useEffect(() => {
    setCustom(loadRaw());
    const onChange = () => setCustom(loadRaw());
    window.addEventListener(EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const all = mergeUnique(BASE, custom);

  const addCategory = (name) => {
    const n = String(name || '').trim();
    if (!n) return false;
    const next = mergeUnique(custom, [n]);
    setCustom(next);
    saveRaw(next);
    return true;
  };

  const removeCategory = (name) => {
    const next = custom.filter((c) => c !== name);
    setCustom(next);
    saveRaw(next);
  };

  const renameCategory = (oldName, newName) => {
    const n = String(newName || '').trim();
    if (!n) return false;
    const next = custom.map((c) => (c === oldName ? n : c));
    setCustom(next);
    saveRaw(next);
    return true;
  };

  return { base: BASE, custom, all, addCategory, removeCategory, renameCategory };
}

function mergeUnique(a, b) {
  const out = [];
  const seen = new Set();
  for (const x of [...a, ...b]) {
    const k = String(x).trim();
    if (!k) continue;
    const lc = k.toLowerCase();
    if (seen.has(lc)) continue;
    seen.add(lc);
    out.push(k);
  }
  // Always keep "Other" last if present
  const idx = out.findIndex((x) => x.toLowerCase() === 'other');
  if (idx >= 0) {
    const [other] = out.splice(idx, 1);
    out.push(other);
  }
  return out;
}
