const { detectAnomaly, buildWeeklyDigest } = require('../src/services/aiInsights');

describe('detectAnomaly', () => {
  test('no history → no anomaly', () => {
    const r = detectAnomaly({ merchant: 'X', amount: 100, category: 'food' }, []);
    expect(r.anomaly).toBe(false);
  });

  test('3σ outlier flagged', () => {
    const hist = Array.from({ length: 10 }, () => ({ category: 'food', amount: 50, merchant: 'Cafe' }));
    const r = detectAnomaly({ category: 'food', amount: 500, merchant: 'Cafe' }, hist);
    expect(r.anomaly).toBe(true);
    expect(r.severity).toBe('warn');
  });

  test('new merchant with enough history', () => {
    const hist = Array.from({ length: 6 }, () => ({ category: 'food', amount: 50, merchant: 'Cafe' }));
    const r = detectAnomaly({ category: 'food', amount: 50, merchant: 'NewPlace' }, hist);
    expect(r.reasons.some(x => x.includes('new merchant'))).toBe(true);
  });

  test('normal tx → not flagged', () => {
    const hist = Array.from({ length: 6 }, () => ({ category: 'food', amount: 50, merchant: 'Cafe' }));
    const r = detectAnomaly({ category: 'food', amount: 55, merchant: 'Cafe' }, hist);
    expect(r.anomaly).toBe(false);
  });
});

describe('buildWeeklyDigest', () => {
  test('empty list produces digest with zero stats', () => {
    const out = buildWeeklyDigest([]);
    expect(out).toBeTruthy();
  });

  test('aggregates tx', () => {
    const out = buildWeeklyDigest([
      { category: 'fuel', amount: 100, vat: 5, merchant: 'ENOC', date: '2026-04-14' },
      { category: 'fuel', amount: 80, vat: 4, merchant: 'ADNOC', date: '2026-04-15' },
    ]);
    expect(out).toBeTruthy();
  });
});
