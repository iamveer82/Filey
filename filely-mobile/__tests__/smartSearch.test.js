const { searchVault } = require('../src/services/smartSearch');

const TX = [
  { id: '1', merchant: 'Nobu Dubai', category: 'food', date: '2026-03-12', amount: 520, notes: 'client dinner' },
  { id: '2', merchant: 'ENOC Petrol', category: 'fuel', date: '2026-03-05', amount: 180 },
  { id: '3', merchant: 'Etisalat', category: 'telecom', date: '2026-02-01', amount: 299 },
  { id: '4', merchant: 'Starbucks', category: 'food', date: '2026-03-20', amount: 45 },
];

describe('searchVault (keyword fallback)', () => {
  test('empty query returns empty', async () => {
    expect(await searchVault('', TX)).toEqual([]);
  });

  test('empty tx list returns empty', async () => {
    expect(await searchVault('dinner', [])).toEqual([]);
  });

  test('matches merchant', async () => {
    const r = await searchVault('Nobu', TX);
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].tx.id).toBe('1');
  });

  test('month-name boost', async () => {
    const r = await searchVault('March Nobu', TX);
    expect(r[0].tx.id).toBe('1');
    expect(r[0].source).toBe('keyword');
  });

  test('no matches returns empty', async () => {
    expect(await searchVault('zzzzzz', TX)).toEqual([]);
  });

  test('respects limit', async () => {
    const r = await searchVault('March', TX, { limit: 1 });
    expect(r.length).toBeLessThanOrEqual(1);
  });
});
