/**
 * Receipt versioning — audit-defense trail.
 * Snapshot original OCR text + image URI + parsed fields on first save.
 * Append a version entry on every subsequent edit.
 *
 * Storage: @filey/tx_versions_<txId> = [{ts, actorId, actorName, before, after, reason}]
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sync } from './cloudSync';
import { db } from '../lib/supabase';

const key = (txId) => `@filey/tx_versions_${txId}`;

function diffFields(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out = {};
  for (const k of keys) {
    if (a[k] !== b[k]) out[k] = { from: a[k], to: b[k] };
  }
  return out;
}

/** Seed the original snapshot after first OCR parse. */
export async function seedVersion(txId, { ocrText, imageUri, parsed, actorId, actorName }) {
  const entry = {
    ts: Date.now(),
    actorId, actorName,
    action: 'create',
    ocrText, imageUri,
    snapshot: parsed,
  };
  await AsyncStorage.setItem(key(txId), JSON.stringify([entry]));
  sync(() => db.appendTxVersion({
    tx_id: txId, actor_id: actorId || null, actor_name: actorName || null,
    action: 'create', ocr_text: ocrText || null, image_uri: imageUri || null,
    snapshot: parsed || {}, ts: new Date(entry.ts).toISOString(),
  }));
}

/** Append an edit version. Stores diff + new snapshot. */
export async function appendVersion(txId, { before, after, actorId, actorName, reason }) {
  let list = [];
  try {
    const raw = await AsyncStorage.getItem(key(txId));
    list = raw ? JSON.parse(raw) : [];
  } catch {}
  const diff = diffFields(before, after);
  list.push({
    ts: Date.now(),
    actorId, actorName,
    action: 'edit',
    reason: reason || null,
    diff,
    snapshot: after,
  });
  await AsyncStorage.setItem(key(txId), JSON.stringify(list.slice(-50)));
  sync(() => db.appendTxVersion({
    tx_id: txId, actor_id: actorId || null, actor_name: actorName || null,
    action: 'edit', reason: reason || null, diff, snapshot: after || {},
    ts: new Date().toISOString(),
  }));
}

export async function getVersions(txId) {
  try {
    const raw = await AsyncStorage.getItem(key(txId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function getOriginalOcr(txId) {
  const versions = await getVersions(txId);
  return versions[0]?.ocrText || null;
}
