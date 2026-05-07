/**
 * Smart search — embedding-based semantic search over the vault.
 * "that Dubai dinner last March" → ranks tx by cosine similarity.
 *
 * Falls back to keyword BM25-lite when no embedding provider configured.
 *
 * Storage: @filey/embed_<txId> = [f32 array of 256 dims]
 * Cache key scoped per-provider so model swaps invalidate.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { send as llmSend, getPreference } from './llmProvider';

const EMBED_KEY = (txId, model) => `@filey/embed_${model}_${txId}`;

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function txText(t) {
  return [
    t.merchant, t.category, t.notes,
    t.date ? `date ${t.date}` : '',
    t.amount ? `${t.amount} AED` : '',
  ].filter(Boolean).join(' · ');
}

/**
 * Embed via LLM provider. Most providers expose embeddings under a
 * separate endpoint; we use a lightweight `embed` method on llmProvider.
 * Returns null if not available.
 */
async function embed(text) {
  try {
    const pref = await getPreference();
    if (!pref?.embed) return null;
    const vec = await pref.embed(text);
    return Array.isArray(vec) ? vec : null;
  } catch { return null; }
}

/** Lazily compute + cache embedding for a tx. */
async function getTxEmbedding(tx, model = 'default') {
  const id = tx.id || tx._id;
  if (!id) return null;
  const k = EMBED_KEY(id, model);
  try {
    const raw = await AsyncStorage.getItem(k);
    if (raw) return JSON.parse(raw);
  } catch {}
  const vec = await embed(txText(tx));
  if (vec) {
    try { await AsyncStorage.setItem(k, JSON.stringify(vec)); } catch {}
  }
  return vec;
}

/** BM25-lite keyword fallback — cheap, runs offline. */
function keywordScore(query, tx) {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = txText(tx).toLowerCase();
  let hits = 0;
  for (const term of q) if (hay.includes(term)) hits += 1;
  // Month-name boost
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  for (const m of q) {
    const mi = months.findIndex(x => m.startsWith(x));
    if (mi >= 0 && tx.date) {
      const mo = new Date(tx.date).getMonth();
      if (mo === mi) hits += 1.5;
    }
  }
  return hits / Math.max(q.length, 1);
}

/**
 * Search vault. Returns top-N tx sorted by relevance.
 * Tries embeddings first, falls back to keyword scoring.
 */
export async function searchVault(query, transactions, { limit = 10, model = 'default' } = {}) {
  if (!query || !transactions?.length) return [];

  const qVec = await embed(query);
  if (qVec) {
    const scored = [];
    for (const tx of transactions) {
      const v = await getTxEmbedding(tx, model);
      if (v) scored.push({ tx, score: cosine(qVec, v), source: 'embed' });
      else scored.push({ tx, score: keywordScore(query, tx) * 0.5, source: 'fallback' });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, limit).filter(r => r.score > 0);
  }

  return transactions
    .map(tx => ({ tx, score: keywordScore(query, tx), source: 'keyword' }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Invalidate an embedding after a tx edit. */
export async function invalidateEmbedding(txId, model = 'default') {
  try { await AsyncStorage.removeItem(EMBED_KEY(txId, model)); } catch {}
}
