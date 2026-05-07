/**
 * Hijri (Islamic) ↔ Gregorian date helpers for UAE receipts.
 * Some merchants print هـ dates. We detect + convert to ISO for storage.
 *
 * Uses the tabular (Umm al-Qura approx.) algorithm — accurate to ±1 day.
 * Good enough for receipt matching; not for religious calendar use.
 */

const HIJRI_MARKERS = ['هـ', 'هجري', 'AH', 'A.H.'];

/** Heuristic: does the text contain Hijri markers? */
export function looksHijri(text = '') {
  return HIJRI_MARKERS.some(m => text.includes(m));
}

/** Convert Hijri (year, month 1-12, day 1-30) → JS Date (Gregorian). */
export function hijriToGregorian(hy, hm, hd) {
  const jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm
    - Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
  return jdnToDate(jd);
}

function jdnToDate(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Try to extract a Hijri date from receipt text and return ISO (YYYY-MM-DD).
 * Looks for patterns like "1445/10/15 هـ" or "15-10-1445 AH".
 * Returns null if no Hijri date found.
 */
export function parseHijriDate(text = '') {
  if (!looksHijri(text)) return null;
  const re = /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})|(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/;
  const m = text.match(re);
  if (!m) return null;
  let y, mo, d;
  if (m[1]) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else      { d = +m[4]; mo = +m[5]; y = +m[6]; }
  if (y < 1300 || y > 1600 || mo < 1 || mo > 12 || d < 1 || d > 30) return null;
  try {
    const g = hijriToGregorian(y, mo, d);
    return g.toISOString().slice(0, 10);
  } catch { return null; }
}
