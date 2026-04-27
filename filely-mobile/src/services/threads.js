/**
 * Conversation threads — named chats with separate memory.
 * Storage: AsyncStorage key @filey/threads_v1 = [{id, title, createdAt, updatedAt}]
 * Messages: @filey/thread_msgs_<id>
 * Memory:   @filey/thread_mem_<id>
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const INDEX_KEY = '@filey/threads_v1';
const MSG_PREFIX = '@filey/thread_msgs_';
const MEM_PREFIX = '@filey/thread_mem_';
const ACTIVE_KEY = '@filey/thread_active';

export function msgKey(id)  { return `${MSG_PREFIX}${id}`; }
export function memKey(id)  { return `${MEM_PREFIX}${id}`; }

export async function listThreads() {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch { return []; }
}

async function saveIndex(arr) {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(arr));
}

export async function getActiveThreadId() {
  try { return await AsyncStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

export async function setActiveThreadId(id) {
  if (id) await AsyncStorage.setItem(ACTIVE_KEY, id);
  else await AsyncStorage.removeItem(ACTIVE_KEY);
}

export async function createThread(title) {
  const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();
  const row = { id, title: title || 'New chat', createdAt: now, updatedAt: now };
  const all = await listThreads();
  all.unshift(row);
  await saveIndex(all);
  await setActiveThreadId(id);
  return row;
}

export async function renameThread(id, title) {
  const all = await listThreads();
  const next = all.map(t => t.id === id ? { ...t, title, updatedAt: Date.now() } : t);
  await saveIndex(next);
}

export async function deleteThread(id) {
  const all = await listThreads();
  await saveIndex(all.filter(t => t.id !== id));
  await AsyncStorage.multiRemove([msgKey(id), memKey(id)]);
  const active = await getActiveThreadId();
  if (active === id) await setActiveThreadId(null);
}

export async function touchThread(id) {
  const all = await listThreads();
  const next = all.map(t => t.id === id ? { ...t, updatedAt: Date.now() } : t);
  await saveIndex(next);
}

/** Ensure at least one thread exists; return active one. */
export async function ensureActiveThread() {
  let active = await getActiveThreadId();
  const all = await listThreads();
  if (active && all.find(t => t.id === active)) {
    return all.find(t => t.id === active);
  }
  if (all.length) {
    await setActiveThreadId(all[0].id);
    return all[0];
  }
  return await createThread('New chat');
}

/** Derive a title from first user message. */
export function deriveTitle(text) {
  if (!text) return 'New chat';
  const t = String(text).trim().replace(/\s+/g, ' ');
  return t.length <= 36 ? t : t.slice(0, 34) + '…';
}
