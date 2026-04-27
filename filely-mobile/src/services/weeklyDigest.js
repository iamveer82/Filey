/**
 * Weekly digest scheduler. Fires once per week on app open.
 * Storage: @filey/weekly_digest_last = timestamp.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { buildWeeklyDigest } from './aiInsights';

const KEY = '@filey/weekly_digest_last';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function maybeBuildWeeklyDigest({ orgId } = {}) {
  try {
    const last = await AsyncStorage.getItem(KEY);
    if (last && Date.now() - parseInt(last, 10) < WEEK_MS) return null;
  } catch {}
  try {
    const res = await (orgId ? apiClient.getOrgTransactions(orgId, {}) : apiClient.getTransactions({}));
    const rows = Array.isArray(res) ? res : res?.transactions || [];
    const digest = buildWeeklyDigest(rows);
    await AsyncStorage.setItem(KEY, String(Date.now()));
    return digest;
  } catch { return null; }
}

export async function resetWeeklyDigest() {
  await AsyncStorage.removeItem(KEY);
}
