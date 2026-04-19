/**
 * Offline-first local ledger for home-screen transactions.
 * Stores plain money movements (paid/received) separate from receipt vault.
 *
 * Storage: @filey/ledger_v1 = [{id, ts, direction, amount, counterparty, note, category, date}]
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const KEY = '@filey/ledger_v1';
export const LEDGER_EVENT = 'filey/ledger_changed';

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

export async function addTx({ direction, amount, counterparty, note, category, date }) {
  if (!direction || !amount) throw new Error('direction + amount required');
  const entry = {
    id: `lx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(),
    direction,
    amount: Math.abs(+amount),
    counterparty: counterparty || 'Unknown',
    note: note || null,
    category: category || null,
    date: date || new Date().toISOString().slice(0, 10),
  };
  const cur = await listTx();
  const next = [entry, ...cur].slice(0, 500);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  DeviceEventEmitter.emit(LEDGER_EVENT, { action: 'add', entry });
  return entry;
}

export async function removeTx(id) {
  const cur = await listTx();
  await AsyncStorage.setItem(KEY, JSON.stringify(cur.filter(t => t.id !== id)));
  DeviceEventEmitter.emit(LEDGER_EVENT, { action: 'remove', id });
}

export async function clearAll() {
  await AsyncStorage.removeItem(KEY);
  DeviceEventEmitter.emit(LEDGER_EVENT, { action: 'clear' });
}
