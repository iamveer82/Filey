const { reclaimableVat, splitReclaim, RECLAIM_PERCENT } = require('../src/services/vatRules');

describe('reclaimableVat', () => {
  test('fuel is 100% reclaimable', () => {
    expect(reclaimableVat({ category: 'fuel', vat: 10 })).toBe(10);
  });

  test('food (entertainment) is 0%', () => {
    expect(reclaimableVat({ category: 'food', vat: 5 })).toBe(0);
  });

  test('telecom default 80%', () => {
    expect(reclaimableVat({ category: 'telecom', vat: 10 })).toBe(8);
  });

  test('per-tx override wins over category default', () => {
    expect(reclaimableVat({ category: 'food', vat: 10, reclaimPct: 50 })).toBe(5);
    expect(reclaimableVat({ category: 'fuel', vat: 10, reclaimPct: 0 })).toBe(0);
  });

  test('ignores out-of-range override', () => {
    expect(reclaimableVat({ category: 'fuel', vat: 10, reclaimPct: 150 })).toBe(10);
    expect(reclaimableVat({ category: 'fuel', vat: 10, reclaimPct: -1 })).toBe(10);
  });

  test('zero vat returns zero', () => {
    expect(reclaimableVat({ category: 'fuel', vat: 0 })).toBe(0);
  });
});

describe('splitReclaim', () => {
  test('totals add up', () => {
    const r = splitReclaim([
      { category: 'fuel', vat: 10 },
      { category: 'food', vat: 5 },
      { category: 'telecom', vat: 10 },
    ]);
    expect(r.totalVat).toBe(25);
    expect(r.eligibleVat).toBe(18);
    expect(r.blockedVat).toBe(7);
  });

  test('empty list', () => {
    const r = splitReclaim([]);
    expect(r.totalVat).toBe(0);
    expect(r.eligibleVat).toBe(0);
  });

  test('groups by category', () => {
    const r = splitReclaim([
      { category: 'fuel', vat: 10 },
      { category: 'fuel', vat: 5 },
    ]);
    expect(r.byCategory.fuel.count).toBe(2);
    expect(r.byCategory.fuel.vat).toBe(15);
    expect(r.byCategory.fuel.reclaim).toBe(15);
  });
});

describe('RECLAIM_PERCENT coverage', () => {
  test('all canonical categories present', () => {
    ['fuel', 'food', 'groceries', 'office', 'utilities', 'telecom', 'travel',
     'hotel', 'software', 'marketing', 'legal', 'medical', 'bank', 'other']
      .forEach(c => expect(typeof RECLAIM_PERCENT[c]).toBe('number'));
  });
});
