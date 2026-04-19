import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@filey/bills_v1';
const subs = new Set();
export function subscribeBills(cb) { subs.add(cb); return () => subs.delete(cb); }
function notify() { for (const cb of subs) { try { cb(); } catch {} } }

export async function listBills() {
  try { const raw = await AsyncStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

export async function addBill({ name, amount, dueDate, reminder = true, brand = null }) {
  if (!name || !amount || !dueDate) throw new Error('name + amount + dueDate required');
  const entry = {
    id: `bl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    name, amount: +amount, dueDate, reminder: !!reminder,
    brand: brand || name.toLowerCase(),
    createdAt: Date.now(),
  };
  const cur = await listBills();
  const next = [entry, ...cur];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  notify();
  return entry;
}

export async function removeBill(id) {
  const cur = await listBills();
  await AsyncStorage.setItem(KEY, JSON.stringify(cur.filter(b => b.id !== id)));
  notify();
}

export async function toggleReminder(id) {
  const cur = await listBills();
  const next = cur.map(b => b.id === id ? { ...b, reminder: !b.reminder } : b);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  notify();
}
