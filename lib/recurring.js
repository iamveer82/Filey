/**
 * Recurring-expense detector.
 * Pure client-side: groups expense transactions by merchant fingerprint,
 * keeps clusters with 3+ occurrences at a stable cadence, and emits
 * suggestions ready for the Bills page.
 *
 * No network calls. No PII leaves the device.
 */

const DAY = 1000 * 60 * 60 * 24;

// Normalise merchant/name into a cluster key.
// Strips bill-period noise like "Apr bill", "INV-2401", dates, numbers.
function fingerprint(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .replace(/\b(inv|invoice|bill|ref|order|txn)[-\s#:]?\w*/g, '')
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b/g, '')
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\w*\b/g, '')
    .replace(/\b20\d{2}\b/g, '')
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1)
    .slice(0, 3)                 // first 2-3 meaningful tokens
    .join(' ');
}

// Median of a number array.
function median(arr) {
  const a = [...arr].sort((x, y) => x - y);
  const n = a.length;
  return n % 2 ? a[(n - 1) >> 1] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

// Classify cadence by median gap (days).
function classifyCadence(gapDays) {
  if (gapDays >= 6  && gapDays <= 8)  return { cadence: 'weekly',    period: 7  };
  if (gapDays >= 13 && gapDays <= 16) return { cadence: 'biweekly',  period: 14 };
  if (gapDays >= 26 && gapDays <= 34) return { cadence: 'monthly',   period: 30 };
  if (gapDays >= 58 && gapDays <= 64) return { cadence: 'bimonthly', period: 60 };
  if (gapDays >= 85 && gapDays <= 95) return { cadence: 'quarterly', period: 90 };
  return null;
}

// Map merchant name → sensible Bills icon id.
function guessIconId(name) {
  const n = (name || '').toLowerCase();
  if (/dewa|sewa|electric|power|addc/.test(n))          return 'electric';
  if (/etisalat|\bdu\b|wifi|inter|fiber|broadband/.test(n)) return 'wifi';
  if (/water/.test(n))                                   return 'water';
  if (/netflix|prime|shahid|disney|osn|tv/.test(n))      return 'netflix';
  if (/spotify|anghami|apple music|music/.test(n))       return 'spotify';
  if (/phone|mobile|postpaid|vodafone/.test(n))          return 'phone';
  if (/card|credit|visa|master/.test(n))                 return 'creditcard';
  if (/rent|lease|ejari/.test(n))                        return 'home';
  if (/salik|rta|car|parking|fuel|adnoc|enoc/.test(n))   return 'car';
  return 'misc';
}

/**
 * @param {Array} tx  Transaction list (any shape w/ {name|merchant, amount, type, ts}).
 * @param {Object} opts { minOccurrences?: 3, tolerance?: 0.35 }
 * @returns {Array<{
 *   id, name, avgAmount, lastSeen, nextDue, cadence, period, occurrences, iconId,
 *   stability   // 0..1 — how consistent the cadence is
 * }>}
 */
export function detectRecurring(tx, opts = {}) {
  const minOcc    = opts.minOccurrences ?? 3;
  const tolerance = opts.tolerance      ?? 0.35; // max % deviation for "stable"

  if (!Array.isArray(tx) || tx.length < minOcc) return [];

  // Only expenses.
  const rows = tx.filter(t => t && t.type === 'expense' && t.ts && t.amount);

  // Group by fingerprint.
  const groups = new Map();
  for (const t of rows) {
    const key = fingerprint(t.name || t.merchant);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const out = [];
  for (const [key, items] of groups) {
    if (items.length < minOcc) continue;

    const sorted = [...items].sort((a, b) => a.ts - b.ts);
    const gaps = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((sorted[i].ts - sorted[i - 1].ts) / DAY);
    }
    if (!gaps.length) continue;

    const medGap = median(gaps);
    const c = classifyCadence(medGap);
    if (!c) continue;

    // Stability = fraction of gaps within tolerance of median.
    const within = gaps.filter(g => Math.abs(g - medGap) / medGap <= tolerance).length;
    const stability = within / gaps.length;
    if (stability < 0.6) continue;

    const last = sorted[sorted.length - 1];
    const avgAmount = sorted.reduce((s, x) => s + +x.amount, 0) / sorted.length;
    const nextDue = new Date(last.ts + c.period * DAY);

    out.push({
      id: `rec_${key.replace(/\s+/g, '_')}`,
      name: (last.name || last.merchant || key).trim(),
      avgAmount: Math.round(avgAmount * 100) / 100,
      lastSeen: last.ts,
      nextDue: nextDue.toISOString().slice(0, 10),
      cadence: c.cadence,
      period: c.period,
      occurrences: sorted.length,
      iconId: guessIconId(last.name || last.merchant),
      stability: Math.round(stability * 100) / 100,
    });
  }

  // Highest confidence first, then soonest next-due.
  return out.sort((a, b) => b.stability - a.stability || a.nextDue.localeCompare(b.nextDue));
}

/**
 * True if a recurring cluster already matches an existing bill
 * (by fuzzy name match). Keeps suggestions from stacking.
 */
export function matchesExistingBill(rec, bills) {
  if (!Array.isArray(bills) || !bills.length) return false;
  const recKey = fingerprint(rec.name);
  return bills.some(b => fingerprint(b.name) === recKey);
}

/**
 * Convert a recurring suggestion into a Bills row.
 */
export function toBill(rec) {
  return {
    name: rec.name,
    amount: rec.avgAmount,
    dueDate: rec.nextDue,
    reminder: true,
    iconId: rec.iconId,
    brand: rec.name.toLowerCase(),
    autoDetected: true,
  };
}
