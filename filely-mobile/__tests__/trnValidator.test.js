const { isTrnFormatValid, validateTrn } = require('../src/services/trnValidator');

describe('isTrnFormatValid', () => {
  test('rejects too short', () => {
    expect(isTrnFormatValid('100123456789')).toBe(false);
  });
  test('rejects non-numeric', () => {
    expect(isTrnFormatValid('10012345678901A')).toBe(false);
  });
  test('rejects bad prefix', () => {
    expect(isTrnFormatValid('999123456789012')).toBe(false);
  });
  test('accepts valid length + prefix', () => {
    expect(isTrnFormatValid('100123456789012')).toBe(true);
  });
  test('strips spaces', () => {
    expect(isTrnFormatValid('100 123 456 789 012')).toBe(true);
  });
});

describe('validateTrn', () => {
  test('empty → invalid reason', () => {
    const r = validateTrn('');
    expect(r.valid).toBe(false);
  });
  test('passes clean back', () => {
    const r = validateTrn('100-123-456-789-012');
    expect(r.clean).toBe('100123456789012');
  });
});
