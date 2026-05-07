/**
 * Best-effort cloud sync helper.
 * Local AsyncStorage stays the source of truth (offline-first). Cloud writes
 * are fire-and-forget — never throw into callers, never block UI.
 */
import { supabase } from '../lib/supabase';

let _sessionCache = null;
let _sessionChecked = 0;

async function hasSession() {
  const now = Date.now();
  if (now - _sessionChecked < 30000 && _sessionCache !== null) return _sessionCache;
  try {
    const { data } = await supabase.auth.getSession();
    _sessionCache = !!data?.session;
  } catch {
    _sessionCache = false;
  }
  _sessionChecked = now;
  return _sessionCache;
}

export async function sync(fn) {
  try {
    if (!(await hasSession())) return null;
    return await fn();
  } catch (e) {
    if (__DEV__) console.warn('[cloudSync]', e?.message);
    return null;
  }
}

export function invalidateSessionCache() {
  _sessionCache = null;
  _sessionChecked = 0;
}
