/**
 * Public read-only ledger share — generate a scoped token that grants
 * an accountant (no Filey account) read access to a filtered tx view.
 *
 * Token carries: {orgId, from, to, scopes, exp, sig}
 * Signed with an HMAC derived from a per-device secret (expo-secure-store).
 * Backend verifies the sig and serves a read-only HTML ledger.
 *
 * URL shape: https://filey.app/share/<base64-token>
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const SECRET_KEY = 'filey.share.secret';
const SHARE_BASE = 'https://filey.app/share/';

function b64url(str) {
  return (typeof Buffer !== 'undefined' ? Buffer.from(str).toString('base64') : globalThis.btoa(str))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getSecret() {
  try {
    let s = await SecureStore.getItemAsync(SECRET_KEY);
    if (!s) {
      s = (await Crypto.getRandomBytesAsync(32))
        .reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '');
      await SecureStore.setItemAsync(SECRET_KEY, s);
    }
    return s;
  } catch {
    return 'fallback-dev-secret';
  }
}

async function hmac(message, secret) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${secret}:${message}`
  );
}

/**
 * Create a signed share link.
 * @param {object} opts
 * @param {string} opts.orgId
 * @param {string} opts.from ISO date
 * @param {string} opts.to   ISO date
 * @param {number} opts.ttlDays default 30
 * @param {string[]} opts.scopes default ['tx:read','vat:read']
 */
export async function createShareLink({ orgId, from, to, ttlDays = 30, scopes = ['tx:read', 'vat:read'] }) {
  if (!orgId) throw new Error('orgId required');
  const exp = Date.now() + ttlDays * 86400000;
  const payload = { orgId, from: from || null, to: to || null, scopes, exp };
  const json = JSON.stringify(payload);
  const secret = await getSecret();
  const sig = await hmac(json, secret);
  const token = b64url(`${json}.${sig}`);
  return {
    url: `${SHARE_BASE}${token}`,
    token,
    expiresAt: new Date(exp).toISOString(),
    scopes,
  };
}

export async function verifyLink(token) {
  try {
    const raw = typeof Buffer !== 'undefined'
      ? Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
      : globalThis.atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const dot = raw.lastIndexOf('.');
    if (dot < 0) return { ok: false, reason: 'malformed' };
    const json = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    const payload = JSON.parse(json);
    if (payload.exp < Date.now()) return { ok: false, reason: 'expired' };
    const secret = await getSecret();
    const expected = await hmac(json, secret);
    if (expected !== sig) return { ok: false, reason: 'bad signature' };
    return { ok: true, payload };
  } catch { return { ok: false, reason: 'parse error' }; }
}
