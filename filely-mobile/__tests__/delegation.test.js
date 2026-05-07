const { isActive } = require('../src/services/delegation');

describe('isActive', () => {
  const DAY = 86400000;

  test('null entry → false', () => {
    expect(isActive(null)).toBe(false);
    expect(isActive(undefined)).toBe(false);
  });

  test('no bounds → always active', () => {
    expect(isActive({}, Date.now())).toBe(true);
  });

  test('within range', () => {
    const now = Date.parse('2026-04-15');
    expect(isActive({ start: '2026-04-10', end: '2026-04-20' }, now)).toBe(true);
  });

  test('before start', () => {
    const now = Date.parse('2026-04-05');
    expect(isActive({ start: '2026-04-10', end: '2026-04-20' }, now)).toBe(false);
  });

  test('after end (end-of-day inclusive)', () => {
    const endMidnight = Date.parse('2026-04-20');
    expect(isActive({ start: '2026-04-10', end: '2026-04-20' }, endMidnight + DAY - 1)).toBe(true);
    expect(isActive({ start: '2026-04-10', end: '2026-04-20' }, endMidnight + DAY + 1)).toBe(false);
  });

  test('open-ended (end only)', () => {
    const now = Date.parse('1990-01-01');
    expect(isActive({ end: '2026-12-31' }, now)).toBe(true);
  });
});
