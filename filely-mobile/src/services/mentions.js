/**
 * @mentions in chat. Parses @name tokens, resolves to org members, queues
 * notifications. Uses in-app notification log + expo-notifications if granted.
 *
 * Member list source: apiClient.getOrgMembers(orgId) fallback to local cache.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const MEMBERS_CACHE = '@filey/org_members_cache_v1';
const NOTIF_LOG = '@filey/mention_notifs_v1';

export function extractMentions(text) {
  if (!text) return [];
  const re = /(^|\s)@([a-zA-Z0-9_.\-]{2,32})/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[2]);
  return [...new Set(out)];
}

function normalizeName(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function getOrgMembers(orgId) {
  try {
    const fn = apiClient.getOrgMembers;
    if (fn) {
      const res = await fn.call(apiClient, orgId);
      const rows = Array.isArray(res) ? res : res?.members || [];
      if (rows.length) {
        await AsyncStorage.setItem(MEMBERS_CACHE, JSON.stringify({ orgId, rows, ts: Date.now() }));
        return rows;
      }
    }
  } catch {}
  try {
    const raw = await AsyncStorage.getItem(MEMBERS_CACHE);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached?.orgId === orgId) return cached.rows || [];
    }
  } catch {}
  return [];
}

/** Resolve @handles → member objects. */
export async function resolveMentions(handles, orgId) {
  if (!handles?.length) return [];
  const members = await getOrgMembers(orgId);
  const idx = new Map();
  for (const m of members) {
    idx.set(normalizeName(m.name), m);
    if (m.email) idx.set(normalizeName(m.email.split('@')[0]), m);
  }
  const resolved = [];
  for (const h of handles) {
    const hit = idx.get(normalizeName(h));
    if (hit) resolved.push(hit);
  }
  return resolved;
}

/** Queue an in-app notification entry for each mentioned member. */
export async function notifyMentions(members, { fromName, text, threadId }) {
  if (!members?.length) return;
  try {
    const raw = await AsyncStorage.getItem(NOTIF_LOG);
    const log = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    for (const m of members) {
      log.push({
        toId: m.id || m._id,
        toName: m.name,
        fromName,
        text: text.slice(0, 200),
        threadId,
        ts: now,
        read: false,
      });
    }
    await AsyncStorage.setItem(NOTIF_LOG, JSON.stringify(log.slice(-200)));
  } catch {}

  // Best-effort: local Expo notification for the current user if they mentioned themselves
  try {
    const Notifications = require('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${fromName || 'Someone'} mentioned you`,
        body: text.slice(0, 140),
      },
      trigger: null,
    });
  } catch {}
}

export async function readMentionLog() {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_LOG);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function markMentionsRead() {
  try {
    const log = await readMentionLog();
    const next = log.map(x => ({ ...x, read: true }));
    await AsyncStorage.setItem(NOTIF_LOG, JSON.stringify(next));
  } catch {}
}
