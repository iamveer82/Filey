/**
 * Per-member monthly spend caps by category.
 * Policy stored in AsyncStorage (org-level defaults).
 * warnIfExceeded() checks before staple + returns warning message if over.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { CATEGORIES } from './categories';

const POLICY_KEY = (orgId) => `@filey/policy_${orgId || 'default'}`;

export const DEFAULT_POLICY = {
  fuel:     2000,
  food:     1500,
  groceries: 0,
  office:   1000,
  travel:   3000,
  hotel:    3000,
  software:  800,
  marketing: 0,
  telecom:   500,
  utilities: 600,
};

export async function getPolicy(orgId) {
  try {
    const raw = await AsyncStorage.getItem(POLICY_KEY(orgId));
    if (raw) return { ...DEFAULT_POLICY, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_POLICY };
}

export async function setPolicy(orgId, patch) {
  const cur = await getPolicy(orgId);
  const next = { ...cur, ...patch };
  await AsyncStorage.setItem(POLICY_KEY(orgId), JSON.stringify(next));
  return next;
}

function monthKey(dateStr) {
  return (dateStr || new Date().toISOString()).slice(0, 7);
}

/** Sum member's spend by category for a given month. */
export async function getMemberMonthSpend(orgId, userId, month) {
  try {
    const res = await apiClient.getOrgTransactions(orgId, { submittedBy: userId });
    const rows = Array.isArray(res) ? res : res?.transactions || [];
    const m = month || monthKey();
    const byCat = {};
    for (const r of rows) {
      if (monthKey(r.date) !== m) continue;
      const cat = r.category || 'other';
      byCat[cat] = (byCat[cat] || 0) + (parseFloat(r.amount) || 0);
    }
    return byCat;
  } catch { return {}; }
}

/**
 * Check if adding tx pushes member over policy for the month.
 * Returns { warn: bool, overBy, cap, spent, category }.
 */
export async function checkCap({ orgId, userId, tx }) {
  const policy = await getPolicy(orgId);
  const cap = policy[tx.category];
  if (!cap || cap <= 0) return { warn: false };
  const spent = await getMemberMonthSpend(orgId, userId, monthKey(tx.date));
  const current = spent[tx.category] || 0;
  const next = current + (parseFloat(tx.amount) || 0);
  if (next > cap) {
    return {
      warn: true,
      overBy: next - cap,
      cap,
      spent: current,
      afterThis: next,
      category: tx.category,
      label: CATEGORIES.find(c => c.id === tx.category)?.label || tx.category,
    };
  }
  return { warn: false };
}
