/**
 * Referral system — each user gets a code. When a new user signs up with
 * that code, both parties get 1 year premium.
 *
 * Storage:
 *   @filey/my_referral_code   = "FX-ABC123"
 *   @filey/referral_redeemed  = [{code, at, grantedUntil}]
 *   @filey/referral_credits   = { premiumUntil: ISO }
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CODE_KEY = '@filey/my_referral_code';
const REDEEMED_KEY = '@filey/referral_redeemed';
const CREDITS_KEY = '@filey/referral_credits';

function makeCode(userId = '') {
  const seed = (userId || 'U').slice(0, 2).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FX-${seed}${rand}`;
}

/** Get (or lazily create) current user's referral code. */
export async function getMyCode(userId) {
  try {
    const cached = await AsyncStorage.getItem(CODE_KEY);
    if (cached) return cached;
  } catch {}
  const code = makeCode(userId);
  try { await AsyncStorage.setItem(CODE_KEY, code); } catch {}
  return code;
}

export function shareText(code) {
  return `Join Filey — UAE VAT receipts, auto-categorized. Use my code ${code} and we both get a year of premium.\nhttps://filey.app/r/${code}`;
}

/** Grant a year of premium. Stacks: extends existing expiry. */
export async function grantYearOfPremium() {
  let until = new Date();
  try {
    const raw = await AsyncStorage.getItem(CREDITS_KEY);
    const cur = raw ? JSON.parse(raw) : null;
    if (cur?.premiumUntil && new Date(cur.premiumUntil) > until) {
      until = new Date(cur.premiumUntil);
    }
  } catch {}
  until.setFullYear(until.getFullYear() + 1);
  const entry = { premiumUntil: until.toISOString() };
  await AsyncStorage.setItem(CREDITS_KEY, JSON.stringify(entry));
  return entry;
}

export async function getPremiumStatus() {
  try {
    const raw = await AsyncStorage.getItem(CREDITS_KEY);
    const cur = raw ? JSON.parse(raw) : null;
    const until = cur?.premiumUntil ? new Date(cur.premiumUntil) : null;
    return { active: !!(until && until > new Date()), until };
  } catch { return { active: false, until: null }; }
}

/**
 * Redeem a code entered by new user. Stores locally; caller should also
 * notify backend to credit the inviter. Prevents double-redeem.
 */
export async function redeemCode(code) {
  if (!code || !/^FX-[A-Z0-9]{4,10}$/.test(code)) {
    return { ok: false, reason: 'invalid code format' };
  }
  const myCode = await AsyncStorage.getItem(CODE_KEY);
  if (myCode === code) return { ok: false, reason: 'cannot redeem own code' };

  let list = [];
  try {
    const raw = await AsyncStorage.getItem(REDEEMED_KEY);
    list = raw ? JSON.parse(raw) : [];
  } catch {}
  if (list.find(r => r.code === code)) return { ok: false, reason: 'already redeemed' };

  const granted = await grantYearOfPremium();
  list.push({ code, at: Date.now(), grantedUntil: granted.premiumUntil });
  await AsyncStorage.setItem(REDEEMED_KEY, JSON.stringify(list));
  return { ok: true, grantedUntil: granted.premiumUntil };
}
