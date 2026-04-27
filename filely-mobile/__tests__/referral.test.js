const AsyncStorage = require('./__mocks__/asyncStorage');
const { getMyCode, redeemCode, getPremiumStatus, shareText } = require('../src/services/referral');

beforeEach(() => AsyncStorage.__reset());

describe('getMyCode', () => {
  test('issues FX- code on first call', async () => {
    const c = await getMyCode('abcdef');
    expect(c).toMatch(/^FX-[A-Z0-9]+$/);
  });

  test('stable across calls', async () => {
    const a = await getMyCode('u1');
    const b = await getMyCode('u1');
    expect(a).toBe(b);
  });
});

describe('shareText', () => {
  test('includes code and link', () => {
    const msg = shareText('FX-ABC123');
    expect(msg).toContain('FX-ABC123');
    expect(msg).toContain('https://filey.app/r/FX-ABC123');
  });
});

describe('redeemCode', () => {
  test('rejects invalid format', async () => {
    expect((await redeemCode('')).ok).toBe(false);
    expect((await redeemCode('ABC')).ok).toBe(false);
    expect((await redeemCode('FX-')).ok).toBe(false);
  });

  test('accepts valid code + grants premium', async () => {
    const r = await redeemCode('FX-FRIEND1');
    expect(r.ok).toBe(true);
    const s = await getPremiumStatus();
    expect(s.active).toBe(true);
    expect(s.until.getFullYear()).toBe(new Date().getFullYear() + 1);
  });

  test('blocks own-code redemption', async () => {
    const mine = await getMyCode('u9');
    const r = await redeemCode(mine);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/own/);
  });

  test('blocks double-redeem', async () => {
    await redeemCode('FX-TWICE1');
    const r = await redeemCode('FX-TWICE1');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/already/);
  });
});

describe('getPremiumStatus', () => {
  test('inactive by default', async () => {
    const s = await getPremiumStatus();
    expect(s.active).toBe(false);
    expect(s.until).toBeNull();
  });
});
