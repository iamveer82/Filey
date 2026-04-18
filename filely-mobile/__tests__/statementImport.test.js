const { reconcile } = require('../src/services/statementImport');

describe('reconcile', () => {
  const txs = [
    { id: 't1', date: '2026-03-10', amount: 120.00 },
    { id: 't2', date: '2026-03-15', amount: 250.50 },
    { id: 't3', date: '2026-03-20', amount: 45.00 },
  ];

  test('exact match', () => {
    const rows = [{ date: '2026-03-10', amount: 120.00, merchant: 'X' }];
    const r = reconcile(rows, txs);
    expect(r.matched.length).toBe(1);
    expect(r.matched[0].tx.id).toBe('t1');
    expect(r.missing.length).toBe(0);
  });

  test('amount drift within 0.02 AED', () => {
    const rows = [{ date: '2026-03-15', amount: 250.51, merchant: 'Y' }];
    expect(reconcile(rows, txs).matched.length).toBe(1);
  });

  test('amount drift beyond 0.02 AED is missing', () => {
    const rows = [{ date: '2026-03-15', amount: 251.00, merchant: 'Y' }];
    const r = reconcile(rows, txs);
    expect(r.matched.length).toBe(0);
    expect(r.missing.length).toBe(1);
  });

  test('date drift within 2 days matches', () => {
    const rows = [{ date: '2026-03-12', amount: 120.00 }];
    expect(reconcile(rows, txs).matched.length).toBe(1);
  });

  test('date drift beyond 2 days is missing', () => {
    const rows = [{ date: '2026-03-15', amount: 120.00 }];
    const r = reconcile(rows, txs);
    expect(r.missing.length).toBe(1);
  });

  test('tx only matches one row', () => {
    const rows = [
      { date: '2026-03-10', amount: 120.00 },
      { date: '2026-03-10', amount: 120.00 },
    ];
    const r = reconcile(rows, txs);
    expect(r.matched.length).toBe(1);
    expect(r.missing.length).toBe(1);
  });

  test('missing when no tx', () => {
    const r = reconcile([{ date: '2026-03-10', amount: 99 }], []);
    expect(r.matched.length).toBe(0);
    expect(r.missing.length).toBe(1);
  });
});
