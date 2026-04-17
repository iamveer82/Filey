/**
 * UAE FTA partial VAT reclaim rules.
 * VAT standard rate = 5%. Not every business expense is 100% reclaimable.
 *
 * Rules (FTA Input Tax guidance):
 *  - Entertainment of non-employees: 0% (blocked)
 *  - Staff meals / parties: 0% unless mandatory + free-to-employees
 *  - Motor vehicles (personal use): 0%
 *  - Fuel (business vehicle): 100%
 *  - Hotel / travel (business): 100%
 *  - Office supplies, software, utilities, telecom (business portion): 100%
 *
 * Apportionment: if mixed-use, user can set ratio (e.g. telecom 80% business).
 */

export const RECLAIM_PERCENT = {
  fuel:       100,
  food:         0,   // food/dining = entertainment default
  groceries:    0,
  office:     100,
  utilities:  100,
  telecom:     80,   // mixed personal/business default
  travel:     100,
  hotel:      100,
  software:   100,
  marketing:   50,   // mixed — part may be entertainment
  legal:      100,
  medical:      0,
  bank:         0,
  other:        0,
};

/** Category-level labels explaining the %. Used in UI + PDF notes. */
export const RECLAIM_REASON = {
  fuel:      'Business vehicle fuel — 100% reclaimable',
  food:      'Dining / entertainment — 0% (FTA blocks entertainment VAT)',
  groceries: 'Personal groceries — 0% (not business expense)',
  office:    'Office supplies — 100%',
  utilities: 'Utilities (business premises) — 100%',
  telecom:   'Telecom — 80% default (adjust for personal use)',
  travel:    'Business travel — 100%',
  hotel:     'Business accommodation — 100%',
  software:  'Software subscriptions — 100%',
  marketing: 'Marketing — 50% default (0% if entertainment)',
  legal:     'Legal / professional — 100%',
  medical:   'Medical — 0% (employee benefit, not reclaimable)',
  bank:      'Bank fees — 0% (VAT exempt supply)',
  other:     'Uncategorized — 0% until classified',
};

/** Compute reclaimable VAT for a single tx, honoring per-tx override. */
export function reclaimableVat(tx) {
  const vat = parseFloat(tx.vat) || 0;
  if (vat === 0) return 0;
  const override = tx.reclaimPct;
  const pct = (typeof override === 'number' && override >= 0 && override <= 100)
    ? override
    : (RECLAIM_PERCENT[tx.category] ?? 0);
  return +(vat * (pct / 100)).toFixed(2);
}

/** Sum reclaimable across a list. Returns { eligibleVat, blockedVat, total, byCategory }. */
export function splitReclaim(transactions = []) {
  let eligible = 0, blocked = 0, total = 0;
  const byCat = {};
  for (const t of transactions) {
    const v = parseFloat(t.vat) || 0;
    total += v;
    const r = reclaimableVat(t);
    eligible += r;
    blocked += Math.max(0, v - r);
    const cat = t.category || 'other';
    byCat[cat] = byCat[cat] || { vat: 0, reclaim: 0, blocked: 0, count: 0 };
    byCat[cat].vat += v;
    byCat[cat].reclaim += r;
    byCat[cat].blocked += Math.max(0, v - r);
    byCat[cat].count += 1;
  }
  return {
    totalVat: +total.toFixed(2),
    eligibleVat: +eligible.toFixed(2),
    blockedVat: +blocked.toFixed(2),
    byCategory: byCat,
  };
}
