const { toRtf, toCsv } = require('../src/services/pdfConverter');

describe('toRtf', () => {
  test('wraps with rtf header', () => {
    const r = toRtf('hello');
    expect(r).toMatch(/^\{\\rtf1/);
    expect(r).toContain('hello');
    expect(r.endsWith('}')).toBe(true);
  });

  test('escapes braces + backslash', () => {
    const r = toRtf('a{b}c\\d');
    expect(r).toContain('a\\{b\\}c\\\\d');
  });

  test('newlines become \\par', () => {
    const r = toRtf('line1\nline2');
    expect(r).toContain('line1\\par');
  });

  test('unicode escaped with \\u', () => {
    const r = toRtf('café');
    expect(r).toMatch(/\\u\d+\?/);
  });
});

describe('toCsv', () => {
  test('emits header + rows', () => {
    const csv = toCsv({ headers: ['A', 'B'], rows: [['1', '2'], ['3', '4']] });
    expect(csv).toBe('A,B\r\n1,2\r\n3,4');
  });

  test('quotes values with comma/newline/quote', () => {
    const csv = toCsv({ headers: ['x'], rows: [['a,b'], ['c"d'], ['e\nf']] });
    expect(csv).toContain('"a,b"');
    expect(csv).toContain('"c""d"');
    expect(csv).toContain('"e\nf"');
  });

  test('empty headers OK', () => {
    const csv = toCsv({ headers: [], rows: [['x']] });
    expect(csv).toBe('x');
  });
});
