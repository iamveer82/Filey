/**
 * Offline-first local ledger for home-screen transactions.
 * Stores plain money movements (paid/received) separate from receipt vault.
 *
 * Storage: @filey/ledger_v1 = [{id, ts, direction, amount, counterparty, note, category, date}]
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const KEY = '@filey/ledger_v1';
const OPENING_KEY = '@filey/ledger_opening_v1';
export const LEDGER_EVENT = 'filey/ledger_changed';

const subscribers = new Set();
export function subscribeLedger(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}
function notify(payload) {
  console.log('[localLedger] notify — subscribers:', subscribers.size, 'event:', LEDGER_EVENT);
  for (const cb of subscribers) { try { cb(payload); } catch {} }
  try { DeviceEventEmitter.emit(LEDGER_EVENT, payload); } catch {}
}

export async function listTx(filter = {}) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    let list = raw ? JSON.parse(raw) : [];
    const { dateFrom, dateTo, minAmount, maxAmount, direction, limit } = filter;
    if (dateFrom) list = list.filter(t => (t.date || '') >= dateFrom);
    if (dateTo)   list = list.filter(t => (t.date || '') <= dateTo);
    if (minAmount != null) list = list.filter(t => Math.abs(+t.amount) >= minAmount);
    if (maxAmount != null) list = list.filter(t => Math.abs(+t.amount) <= maxAmount);
    if (direction) list = list.filter(t => t.direction === direction);
    list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return limit ? list.slice(0, limit) : list;
  } catch { return []; }
}

function parseAmount(v) {
  if (typeof v === 'number') return Math.abs(v) || 0;
  if (typeof v === 'string') return Math.abs(parseFloat(v.replace(/,/g, ''))) || 0;
  return 0;
}

export async function addTx({ direction, amount, counterparty, note, category, date }) {
  const parsedAmt = parseAmount(amount);
  console.log('[localLedger] addTx called:', { direction, amount, parsedAmt, counterparty });
  if (!direction || !parsedAmt) throw new Error('direction + amount required');
  const entry = {
    id: `lx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(),
    direction,
    amount: parsedAmt,
    counterparty: counterparty || 'Unknown',
    note: note || null,
    category: category || null,
    date: date || new Date().toISOString().slice(0, 10),
  };
  const cur = await listTx();
  const next = [entry, ...cur].slice(0, 500);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  console.log('[localLedger] AsyncStorage set, ledger length:', next.length);
  notify({ action: 'add', entry });
  console.log('[localLedger] notify fired for entry id:', entry.id);
  return entry;
}

export async function removeTx(id) {
  const cur = await listTx();
  await AsyncStorage.setItem(KEY, JSON.stringify(cur.filter(t => t.id !== id)));
  notify({ action: 'remove', id });
}

/**
 * Patch a single ledger entry by id. Only writeable fields are accepted.
 * Returns the updated entry or null if the id wasn't found.
 */
const PATCHABLE = ['counterparty', 'note', 'category', 'date', 'amount', 'direction'];
export async function updateTx(id, patch = {}) {
  if (!id) return null;
  const cur = await listTx();
  const idx = cur.findIndex(t => t.id === id);
  if (idx < 0) return null;
  const entry = { ...cur[idx] };
  for (const k of PATCHABLE) {
    if (patch[k] !== undefined && patch[k] !== null && patch[k] !== '') {
      entry[k] = k === 'amount' ? (parseFloat(String(patch[k]).replace(/,/g, '')) || entry.amount) : patch[k];
    }
  }
  cur[idx] = entry;
  await AsyncStorage.setItem(KEY, JSON.stringify(cur));
  notify({ action: 'update', entry });
  return entry;
}

/**
 * Patch the most-recent ledger entry. Useful for "change the name to X"
 * style follow-ups in chat where the user implicitly refers to the last log.
 */
export async function updateLastTx(patch = {}) {
  const cur = await listTx();
  if (!cur.length) return null;
  return updateTx(cur[0].id, patch);
}

export async function clearAll() {
  await AsyncStorage.removeItem(KEY);
  notify({ action: 'clear' });
}

/* ---------- Opening balance ---------- */

export async function getOpeningBalance() {
  try {
    const raw = await AsyncStorage.getItem(OPENING_KEY);
    if (!raw) return 0;
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

export async function setOpeningBalance(amount) {
  const n = parseFloat(amount);
  if (!Number.isFinite(n)) throw new Error('opening balance must be a number');
  await AsyncStorage.setItem(OPENING_KEY, String(n));
  notify({ action: 'opening', amount: n });
  return n;
}
