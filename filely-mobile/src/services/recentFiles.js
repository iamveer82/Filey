import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@filey/recent_files_v1';
const subs = new Set();
export function subscribeFiles(cb) { subs.add(cb); return () => subs.delete(cb); }
function notify() { for (const cb of subs) { try { cb(); } catch {} } }

export async function listFiles() {
  try { const raw = await AsyncStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

export async function addFile({ name, kind = 'pdf', uri = null }) {
  if (!name) throw new Error('name required');
  const entry = {
    id: `fi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    name, kind, uri,
    ts: Date.now(),
  };
  const cur = await listFiles();
  const next = [entry, ...cur].slice(0, 50);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  notify();
  return entry;
}

export async function removeFile(id) {
  const cur = await listFiles();
  await AsyncStorage.setItem(KEY, JSON.stringify(cur.filter(f => f.id !== id)));
  notify();
}

export function formatWhen(ts) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}
