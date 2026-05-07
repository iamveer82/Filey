/**
 * UAE TRN (Tax Registration Number) validator.
 *
 * Structure: 15 digits, starts with "100" (tax registrants) or "200" (government).
 * Checksum: weighted digit sum mod-10 (Luhn-style variant used by FTA).
 *
 * FTA public lookup stub — real endpoint is https://tax.gov.ae/en/services/trn/trn-verification.aspx
 * which requires captcha/JS. We cache known-valid TRNs locally after user confirms.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@filey/trn_cache_v1';

const VALID_PREFIXES = ['100', '200', '300', '400', '500'];

export function isTrnFormatValid(trn) {
  if (!trn) return false;
  const clean = String(trn).replace(/[\s-]+/g, '');
  if (!/^\d{15}$/.test(clean)) return false;
  if (!VALID_PREFIXES.includes(clean.slice(0, 3))) return false;
  return true;
}

/** Luhn-style checksum across 14 digits, last digit = check. */
export function isTrnChecksumValid(trn) {
  if (!isTrnFormatValid(trn)) return false;
  const clean = String(trn).replace(/[\s-]+/g, '');
  const digits = clean.split('').map(Number);
  const check = digits[14];
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = digits[i];
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10 === check;
}

export function validateTrn(trn) {
  if (!trn) return { valid: false, reason: 'empty' };
  const clean = String(trn).replace(/[\s-]+/g, '');
  if (!/^\d{15}$/.test(clean)) {
    return { valid: false, reason: `must be 15 digits (got ${clean.length})` };
  }
  if (!VALID_PREFIXES.includes(clean.slice(0, 3))) {
    return { valid: false, reason: `prefix ${clean.slice(0, 3)} not recognized` };
  }
  if (!isTrnChecksumValid(clean)) {
    return { valid: false, reason: 'checksum failed — likely typo' };
  }
  return { valid: true, clean };
}

/** Lookup stub — returns cached verification or 'unknown'. */
export async function lookupTrn(trn) {
  const fmt = validateTrn(trn);
  if (!fmt.valid) return { known: false, reason: fmt.reason };
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    if (map[fmt.clean]) return { known: true, ...map[fmt.clean] };
  } catch {}
  return { known: false, reason: 'not in local cache — verify on FTA portal' };
}

export async function cacheTrn(trn, meta = {}) {
  const fmt = validateTrn(trn);
  if (!fmt.valid) return;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[fmt.clean] = { ...meta, ts: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {}
}
