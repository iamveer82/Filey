/**
 * Out-of-office / approval delegation.
 * A manager on leave can set a deputy who approves in their place during
 * a date range. Queue resolver honours active deputies.
 *
 * Storage: @filey/deputy_<managerId> = {deputyId, deputyName, start, end, note}
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (managerId) => `@filey/deputy_${managerId}`;

export async function setDeputy(managerId, { deputyId, deputyName, start, end, note }) {
  if (!managerId || !deputyId) throw new Error('managerId + deputyId required');
  const entry = { deputyId, deputyName, start, end, note: note || null, setAt: Date.now() };
  await AsyncStorage.setItem(key(managerId), JSON.stringify(entry));
  return entry;
}

export async function clearDeputy(managerId) {
  await AsyncStorage.removeItem(key(managerId));
}

export async function getDeputy(managerId) {
  try {
    const raw = await AsyncStorage.getItem(key(managerId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Is the deputy active right now? */
export function isActive(entry, now = Date.now()) {
  if (!entry) return false;
  const s = entry.start ? new Date(entry.start).getTime() : 0;
  const e = entry.end ? new Date(entry.end).getTime() + 86400000 : Infinity;
  return now >= s && now <= e;
}

/**
 * Resolve the effective approver for a manager.
 * If manager has an active deputy, returns the deputy. Else returns manager.
 */
export async function resolveApprover(manager) {
  if (!manager?.id) return manager;
  const d = await getDeputy(manager.id);
  if (isActive(d)) {
    return { id: d.deputyId, name: d.deputyName, delegatedFrom: manager.id };
  }
  return manager;
}
