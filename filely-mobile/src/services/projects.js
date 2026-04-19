/**
 * Project / client tagging for bill-back reports.
 * Tag each tx with `projectId`. Projects stored per-org.
 *
 * Storage: @filey/projects_<orgId> = [{id, name, client, color, archived}]
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sync } from './cloudSync';
import { db } from '../lib/supabase';

const key = (orgId) => `@filey/projects_${orgId || 'default'}`;

const DEFAULT_COLORS = ['#3B6BFF', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#F43F5E', '#84CC16'];

export async function listProjects(orgId) {
  try {
    const raw = await AsyncStorage.getItem(key(orgId));
    const list = raw ? JSON.parse(raw) : [];
    return list.filter(p => !p.archived);
  } catch { return []; }
}

export async function addProject(orgId, { name, client }) {
  if (!name) throw new Error('name required');
  const list = (await listProjects(orgId)) || [];
  const color = DEFAULT_COLORS[list.length % DEFAULT_COLORS.length];
  const id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const entry = { id, name, client: client || null, color, archived: false, createdAt: Date.now() };
  list.push(entry);
  await AsyncStorage.setItem(key(orgId), JSON.stringify(list));
  sync(() => db.upsertProject({
    id: entry.id, org_id: orgId, name: entry.name,
    client: entry.client, color: entry.color, archived: false,
  }));
  return entry;
}

export async function archiveProject(orgId, projectId) {
  const raw = await AsyncStorage.getItem(key(orgId));
  const list = raw ? JSON.parse(raw) : [];
  const next = list.map(p => p.id === projectId ? { ...p, archived: true } : p);
  await AsyncStorage.setItem(key(orgId), JSON.stringify(next));
  sync(() => db.archiveProject(projectId));
}

export async function projectById(orgId, projectId) {
  if (!projectId) return null;
  const list = await listProjects(orgId);
  return list.find(p => p.id === projectId) || null;
}

/**
 * Group tx by project → bill-back report.
 * Returns [{project, txs, totalAmt, totalVat, reclaim}] sorted by spend desc.
 */
export function groupByProject(transactions, projects = []) {
  const { reclaimableVat } = require('./vatRules');
  const projMap = Object.fromEntries(projects.map(p => [p.id, p]));
  const buckets = {};
  for (const t of transactions) {
    const pid = t.projectId || 'unassigned';
    if (!buckets[pid]) {
      buckets[pid] = {
        project: projMap[pid] || (pid === 'unassigned' ? { id: 'unassigned', name: 'Unassigned', color: '#64748B' } : { id: pid, name: pid, color: '#64748B' }),
        txs: [], totalAmt: 0, totalVat: 0, reclaim: 0,
      };
    }
    const b = buckets[pid];
    b.txs.push(t);
    b.totalAmt += parseFloat(t.amount) || 0;
    b.totalVat += parseFloat(t.vat) || 0;
    b.reclaim += reclaimableVat(t);
  }
  return Object.values(buckets)
    .map(b => ({ ...b, totalAmt: +b.totalAmt.toFixed(2), totalVat: +b.totalVat.toFixed(2), reclaim: +b.reclaim.toFixed(2) }))
    .sort((a, b) => b.totalAmt - a.totalAmt);
}
