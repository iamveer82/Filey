/**
 * Receipt deduplication — detect duplicate submissions across team.
 * Fingerprint: hash(normalizedMerchant + amount + date±1day).
 * Check against local cache + org vault before save.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const CACHE_KEY = '@filey/dedup_cache_v1';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function normalizeMerchant(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s*(llc|l\.l\.c|fzc|fze|fz-llc|ltd|limited|pvt|pvt\.|inc|co\.)\.?/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 32);
}

/** Stable djb2 hash string → base36. */
function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * Fingerprint a transaction. Rounds amount to 2dp.
 * Returns array of 3 fingerprints covering date ± 1 day for fuzzy match.
 */
export function fingerprints(tx) {
  const m = normalizeMerchant(tx.merchant);
  const amt = Math.round((parseFloat(tx.amount) || 0) * 100);
  const base = new Date(tx.date || Date.now());
  const out = [];
  for (const offset of [-1, 0, 1]) {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);
    const ds = d.toISOString().slice(0, 10);
    out.push(djb2(`${m}|${amt}|${ds}`));
  }
  return out;
}

async function readCache() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const fresh = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v?.ts && now - v.ts < CACHE_TTL) fresh[k] = v;
    }
    return fresh;
  } catch { return {}; }
}

async function writeCache(map) {
  try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(map)); } catch {}
}

/**
 * Check if tx is a duplicate. Returns { duplicate, match? }.
 * match = { submittedByName, date, amount, merchant, source: 'local'|'server' }
 */
export async function checkDuplicate(tx, { orgId } = {}) {
  const fps = fingerprints(tx);
  const cache = await readCache();
  for (const fp of fps) {
    if (cache[fp]) return { duplicate: true, match: { ...cache[fp], source: 'local' } };
  }

  if (orgId) {
    try {
      const res = await apiClient.getOrgTransactions(orgId, {});
      const rows = Array.isArray(res) ? res : res?.transactions || [];
      for (const r of rows) {
        const rfps = fingerprints(r);
        if (rfps.some(f => fps.includes(f))) {
          return {
            duplicate: true,
            match: {
              submittedByName: r.submittedByName || 'someone',
              date: r.date, amount: r.amount, merchant: r.merchant,
              source: 'server',
            },
          };
        }
      }
    } catch {}
  }
  return { duplicate: false };
}

/** Record tx in local cache after successful save. */
export async function recordSeen(tx, meta = {}) {
  const fps = fingerprints(tx);
  const cache = await readCache();
  const entry = {
    ts: Date.now(),
    submittedByName: meta.submittedByName || 'you',
    date: tx.date, amount: tx.amount, merchant: tx.merchant,
  };
  for (const fp of fps) cache[fp] = entry;
  await writeCache(cache);
}
