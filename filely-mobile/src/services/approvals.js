/**
 * Approval workflow — local-first queue with audit trail.
 * Tx status: 'pending' | 'approved' | 'rejected'
 * Audit entries: [{actorId, actorName, action, reason, ts}]
 *
 * Storage: @filey/approvals_audit_<orgId> — appended-only log.
 * Server sync via apiClient.updateTransaction when available.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import { resolveApprover, getDeputy, isActive } from './delegation';

const auditKey = (orgId) => `@filey/approvals_audit_${orgId || 'default'}`;

export async function listAudit(orgId) {
  try {
    const raw = await AsyncStorage.getItem(auditKey(orgId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function appendAudit(orgId, entry) {
  const log = await listAudit(orgId);
  log.push(entry);
  await AsyncStorage.setItem(auditKey(orgId), JSON.stringify(log.slice(-500)));
}

/** List pending tx for org. Fallback to local cache if server lacks status. */
export async function listPending(orgId) {
  try {
    const res = await apiClient.getOrgTransactions(orgId, { status: 'pending' });
    const rows = Array.isArray(res) ? res : res?.transactions || [];
    return rows.filter(r => (r.status || 'pending') === 'pending');
  } catch { return []; }
}

export async function approve(tx, actor) {
  const entry = {
    txId: tx.id || tx._id,
    actorId: actor.userId,
    actorName: actor.submitterName || 'manager',
    action: 'approve',
    reason: '',
    onBehalfOf: actor.onBehalfOf || null,
    ts: Date.now(),
  };
  try {
    await apiClient.put?.(`transactions/${entry.txId}`, { status: 'approved', approvedBy: entry.actorId, approvedAt: new Date().toISOString() });
  } catch {}
  await appendAudit(actor.orgId, entry);
  return entry;
}

export async function reject(tx, actor, reason) {
  const entry = {
    txId: tx.id || tx._id,
    actorId: actor.userId,
    actorName: actor.submitterName || 'manager',
    action: 'reject',
    reason: reason || '',
    onBehalfOf: actor.onBehalfOf || null,
    ts: Date.now(),
  };
  try {
    await apiClient.put?.(`transactions/${entry.txId}`, { status: 'rejected', rejectedBy: entry.actorId, rejectReason: reason, rejectedAt: new Date().toISOString() });
  } catch {}
  await appendAudit(actor.orgId, entry);
  return entry;
}

export async function bulkApprove(txList, actor) {
  const entries = [];
  for (const tx of txList) entries.push(await approve(tx, actor));
  return entries;
}

/**
 * Approve on behalf of a manager — checks active deputy delegation.
 * If actor IS the active deputy for manager, stamps `onBehalfOf: managerId`.
 * Returns null if actor is not authorised.
 */
export async function approveAsDeputy(tx, actor, managerId) {
  const deputy = await getDeputy(managerId);
  if (!isActive(deputy) || deputy.deputyId !== actor.userId) return null;
  return approve(tx, { ...actor, onBehalfOf: managerId });
}

export async function rejectAsDeputy(tx, actor, managerId, reason) {
  const deputy = await getDeputy(managerId);
  if (!isActive(deputy) || deputy.deputyId !== actor.userId) return null;
  return reject(tx, { ...actor, onBehalfOf: managerId }, reason);
}

export { resolveApprover };
