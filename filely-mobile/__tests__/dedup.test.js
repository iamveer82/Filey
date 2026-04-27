const { fingerprints } = require('../src/services/dedup');

describe('fingerprints', () => {
  test('returns 3 fingerprints for ±1 day', () => {
    const fps = fingerprints({ merchant: 'ENOC', amount: 100, date: '2026-04-15' });
    expect(fps).toHaveLength(3);
    expect(new Set(fps).size).toBe(3);
  });

  test('same merchant + amount + date → same fingerprint', () => {
    const a = fingerprints({ merchant: 'ENOC', amount: 100, date: '2026-04-15' });
    const b = fingerprints({ merchant: 'enoc', amount: 100.00, date: '2026-04-15' });
    expect(a[1]).toBe(b[1]);
  });

  test('different amount → different fingerprint', () => {
    const a = fingerprints({ merchant: 'ENOC', amount: 100, date: '2026-04-15' });
    const b = fingerprints({ merchant: 'ENOC', amount: 101, date: '2026-04-15' });
    expect(a[1]).not.toBe(b[1]);
  });

  test('date ±1 overlaps', () => {
    const today = fingerprints({ merchant: 'X', amount: 10, date: '2026-04-15' });
    const yesterday = fingerprints({ merchant: 'X', amount: 10, date: '2026-04-14' });
    const sharedCount = today.filter(fp => yesterday.includes(fp)).length;
    expect(sharedCount).toBeGreaterThan(0);
  });
});
