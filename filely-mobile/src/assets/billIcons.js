/**
 * Curated bill icon catalog. Icons are SVG XML strings (CC0, svgrepo-style).
 * Each entry: { id, label, xml, bg, tint }.
 * Grid picker in AddBill modal uses this catalog; saved bills store `iconId`.
 * Extend by dropping a new object here; no other code changes needed.
 */

const svg = (inner, { fill = 'currentColor', stroke, strokeWidth = 2 } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}"${
    stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"` : ''
  }>${inner}</svg>`;

export const BILL_ICONS = [
  { id: 'netflix',    label: 'Netflix',     bg: '#FFE5E5', tint: '#E50914',
    xml: svg('<path d="M5 2h4l4 11V2h4v20l-4-1-4-11v12H5z"/>') },
  { id: 'spotify',    label: 'Spotify',     bg: '#E6F9EE', tint: '#1DB954',
    xml: svg('<circle cx="12" cy="12" r="10" fill="#1DB954"/><path d="M7 10c3-1 7-1 10 1M7.5 13c2.5-.8 5.5-.8 8 .8M8 16c2-.6 4-.6 6 .6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none"/>') },
  { id: 'apple',      label: 'Apple',       bg: '#F2F2F2', tint: '#0B1435',
    xml: svg('<path d="M16 2c0 1.7-1.3 3-3 3 0-1.7 1.3-3 3-3zM20 17c-.8 1.8-1.2 2.6-2.3 4.2-1.5 2.2-3.6 2.3-5 2.3-1.4 0-1.8-.9-3.7-.9-1.9 0-2.4.9-3.7.9-1.4 0-3.4-1.2-4.9-3.4C-.8 16.5 0 10 3 7.8c1.1-.8 2.4-1.3 3.8-1.3 1.3 0 2.5.9 3.7.9 1.1 0 2-.9 3.6-.9 1.2 0 2.5.5 3.4 1.4-3 1.6-2.5 5.9 2.5 9z"/>') },
  { id: 'google',     label: 'Google',      bg: '#FFF4E5', tint: '#EA4335',
    xml: svg('<path fill="#EA4335" d="M12 11v3h5a5 5 0 1 1-1.5-5l2.2-2.2A8 8 0 1 0 20 12v-1z"/>') },
  { id: 'microsoft',  label: 'Microsoft',   bg: '#EAF3FB', tint: '#0078D4',
    xml: svg('<rect x="2" y="2" width="9" height="9" fill="#F25022"/><rect x="13" y="2" width="9" height="9" fill="#7FBA00"/><rect x="2" y="13" width="9" height="9" fill="#00A4EF"/><rect x="13" y="13" width="9" height="9" fill="#FFB900"/>') },
  { id: 'figma',      label: 'Figma',       bg: '#F4F0FF', tint: '#A259FF',
    xml: svg('<path fill="#F24E1E" d="M8 2h4v6H8a3 3 0 0 1 0-6z"/><path fill="#A259FF" d="M12 2h4a3 3 0 0 1 0 6h-4z"/><circle cx="15" cy="11" r="3" fill="#1ABCFE"/><path fill="#0ACF83" d="M8 14h4v4a3 3 0 0 1-3 3 3 3 0 0 1-1-7z"/><path fill="#FF7262" d="M8 8h4v6H8a3 3 0 0 1 0-6z"/>') },
  { id: 'github',     label: 'GitHub',      bg: '#ECECEC', tint: '#0B1435',
    xml: svg('<path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-2c-2.8.6-3.4-1.2-3.4-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.6.3-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9 9 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.8-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/>') },
  { id: 'youtube',    label: 'YouTube',     bg: '#FFE5E5', tint: '#FF0000',
    xml: svg('<path fill="#FF0000" d="M23 7a3 3 0 0 0-2-2c-2-.5-9-.5-9-.5s-7 0-9 .5A3 3 0 0 0 1 7a31 31 0 0 0 0 10 3 3 0 0 0 2 2c2 .5 9 .5 9 .5s7 0 9-.5a3 3 0 0 0 2-2 31 31 0 0 0 0-10z"/><path fill="#fff" d="M10 15V9l5 3z"/>') },
  { id: 'amazon',     label: 'Amazon',      bg: '#FFF4E5', tint: '#FF9900',
    xml: svg('<path d="M14 10c-2 0-4 .5-4 3 0 1.5 1 2 2 2s2-.5 2-2c0-2-1-1-1-3h1zm6 8c-3 2-8 3-13 1-3-1-5-3-6-5h1c2 2 5 3 8 3 2 0 4-.5 6-1 2-1 3-1 4 2z"/>') },
  { id: 'slack',      label: 'Slack',       bg: '#FBE8F2', tint: '#E01E5A',
    xml: svg('<rect x="5" y="10" width="6" height="2" rx="1" fill="#36C5F0"/><rect x="10" y="5" width="2" height="6" rx="1" fill="#2EB67D"/><rect x="13" y="12" width="6" height="2" rx="1" fill="#ECB22E"/><rect x="12" y="13" width="2" height="6" rx="1" fill="#E01E5A"/>') },
  { id: 'zoom',       label: 'Zoom',        bg: '#E5F0FF', tint: '#2D8CFF',
    xml: svg('<rect x="2" y="7" width="13" height="10" rx="2" fill="#2D8CFF"/><path d="M22 9l-5 3 5 3z" fill="#2D8CFF"/>') },
  { id: 'adobe',      label: 'Adobe',       bg: '#FFE5E5', tint: '#FA0F00',
    xml: svg('<path fill="#FA0F00" d="M3 3h7l11 18H3z"/><path fill="#fff" d="M13 21l-1-3h-3l2-6z"/>') },
  { id: 'dropbox',    label: 'Dropbox',     bg: '#E5F2FF', tint: '#0061FF',
    xml: svg('<path fill="#0061FF" d="M6 3l6 4-6 4-6-4zm12 0l6 4-6 4-6-4zM6 11l6 4-6 4-6-4zm12 0l6 4-6 4-6-4zM6 18l6 4 6-4-6-4z"/>') },
  { id: 'notion',     label: 'Notion',      bg: '#F2F2F2', tint: '#0B1435',
    xml: svg('<rect x="3" y="3" width="18" height="18" rx="2" fill="#fff" stroke="#0B1435"/><path d="M8 8l8 10V8" stroke="#0B1435" stroke-width="1.5" fill="none"/>') },

  { id: 'electric',   label: 'Electricity', bg: '#FFF7DB', tint: '#EAB308',
    xml: svg('<path fill="#EAB308" d="M13 2L4 14h7l-1 8 10-12h-7z"/>') },
  { id: 'water',      label: 'Water',       bg: '#E0F2FE', tint: '#0EA5E9',
    xml: svg('<path fill="#0EA5E9" d="M12 2c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z"/>') },
  { id: 'wifi',       label: 'Internet',    bg: '#E8EFFF', tint: '#2A63E2',
    xml: svg('<path fill="none" stroke="#2A63E2" stroke-width="2" stroke-linecap="round" d="M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M8 17a5 5 0 0 1 8 0"/><circle cx="12" cy="20" r="1.5" fill="#2A63E2"/>') },
  { id: 'phone',      label: 'Phone',       bg: '#DCFCE7', tint: '#16A34A',
    xml: svg('<rect x="6" y="2" width="12" height="20" rx="3" fill="none" stroke="#16A34A" stroke-width="2"/><circle cx="12" cy="18" r="1" fill="#16A34A"/>') },
  { id: 'home',       label: 'Rent',        bg: '#FEF3C7', tint: '#D97706',
    xml: svg('<path fill="#D97706" d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/>') },
  { id: 'cart',       label: 'Groceries',   bg: '#FCE7F3', tint: '#DB2777',
    xml: svg('<path fill="none" stroke="#DB2777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2 4h3l3 12h11l2-8H6"/><circle cx="9" cy="20" r="1.5" fill="#DB2777"/><circle cx="18" cy="20" r="1.5" fill="#DB2777"/>') },
  { id: 'food',       label: 'Food',        bg: '#FEE2E2', tint: '#DC2626',
    xml: svg('<path fill="#DC2626" d="M3 11h18v2a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7zM6 8c0-1 .5-2 1.5-2.5.5-1 1.5-1.5 2.5-1.5s2 .5 2.5 1.5c1 .5 1.5 1.5 1.5 2.5z"/>') },
  { id: 'gym',        label: 'Gym',         bg: '#EDE9FE', tint: '#7C3AED',
    xml: svg('<rect x="2" y="10" width="2" height="4" fill="#7C3AED"/><rect x="4" y="8" width="3" height="8" fill="#7C3AED"/><rect x="7" y="11" width="10" height="2" fill="#7C3AED"/><rect x="17" y="8" width="3" height="8" fill="#7C3AED"/><rect x="20" y="10" width="2" height="4" fill="#7C3AED"/>') },
  { id: 'car',        label: 'Car',         bg: '#E0E7FF', tint: '#4338CA',
    xml: svg('<path fill="#4338CA" d="M5 11l2-5a2 2 0 0 1 2-1h6a2 2 0 0 1 2 1l2 5v7a1 1 0 0 1-1 1h-2v-2H8v2H6a1 1 0 0 1-1-1z"/><circle cx="8" cy="15" r="1.5" fill="#fff"/><circle cx="16" cy="15" r="1.5" fill="#fff"/>') },
  { id: 'insurance',  label: 'Insurance',   bg: '#DBEAFE', tint: '#1D4ED8',
    xml: svg('<path fill="#1D4ED8" d="M12 2l9 3v7c0 5-4 9-9 10-5-1-9-5-9-10V5z"/><path stroke="#fff" stroke-width="2" stroke-linecap="round" d="M8 12l3 3 5-6" fill="none"/>') },
  { id: 'creditcard', label: 'Credit Card', bg: '#E8EFFF', tint: '#2A63E2',
    xml: svg('<rect x="2" y="5" width="20" height="14" rx="2" fill="#2A63E2"/><rect x="2" y="9" width="20" height="2" fill="#1A4BB8"/><rect x="5" y="14" width="5" height="2" rx="1" fill="#fff"/>') },
  { id: 'health',     label: 'Health',      bg: '#FFE4E6', tint: '#E11D48',
    xml: svg('<path fill="#E11D48" d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/>') },
  { id: 'education',  label: 'Education',   bg: '#FEF3C7', tint: '#B45309',
    xml: svg('<path fill="#B45309" d="M12 3L2 8l10 5 8-4v6h2V8z"/><path fill="#B45309" d="M6 12v4c0 2 3 3 6 3s6-1 6-3v-4l-6 3z"/>') },
  { id: 'gift',       label: 'Gift',        bg: '#FCE7F3', tint: '#DB2777',
    xml: svg('<rect x="3" y="10" width="18" height="12" rx="1" fill="#DB2777"/><rect x="3" y="7" width="18" height="4" fill="#BE185D"/><rect x="11" y="7" width="2" height="15" fill="#FBCFE8"/><path fill="#DB2777" d="M12 7c-2-4 2-6 3-3s-3 3-3 3zm0 0c2-4-2-6-3-3s3 3 3 3z"/>') },
  { id: 'plane',      label: 'Travel',      bg: '#CFFAFE', tint: '#0891B2',
    xml: svg('<path fill="#0891B2" d="M2 16l20-8-4-3-5 2-4-4-2 1 2 5-5 2-3-2-1 2 3 3z"/>') },
  { id: 'pet',        label: 'Pet',         bg: '#FEF3C7', tint: '#CA8A04',
    xml: svg('<circle cx="7" cy="10" r="2" fill="#CA8A04"/><circle cx="17" cy="10" r="2" fill="#CA8A04"/><circle cx="5" cy="15" r="2" fill="#CA8A04"/><circle cx="19" cy="15" r="2" fill="#CA8A04"/><path fill="#CA8A04" d="M12 13c-3 0-5 3-5 5s2 3 5 3 5-1 5-3-2-5-5-5z"/>') },
  { id: 'misc',       label: 'Other',       bg: '#E8EFFF', tint: '#2A63E2',
    xml: svg('<circle cx="12" cy="12" r="9" fill="none" stroke="#2A63E2" stroke-width="2"/><path stroke="#2A63E2" stroke-width="2" stroke-linecap="round" fill="none" d="M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3"/><circle cx="12" cy="17" r="1" fill="#2A63E2"/>') },
];

export function findIcon(id) {
  return BILL_ICONS.find(i => i.id === id) || BILL_ICONS[BILL_ICONS.length - 1];
}

/** Fuzzy match bill name → icon id (for legacy bills without iconId). */
export function guessIconId(name = '') {
  const n = name.toLowerCase();
  for (const i of BILL_ICONS) if (n.includes(i.id) || n.includes(i.label.toLowerCase())) return i.id;
  if (/rent|mortgage|lease/.test(n)) return 'home';
  if (/power|electric/.test(n))     return 'electric';
  if (/water|plumb/.test(n))        return 'water';
  if (/wifi|internet|broadband/.test(n)) return 'wifi';
  if (/phone|mobile|sim/.test(n))   return 'phone';
  if (/grocer|market/.test(n))      return 'cart';
  if (/food|restaurant|dining/.test(n)) return 'food';
  if (/car|fuel|petrol/.test(n))    return 'car';
  if (/insur/.test(n))              return 'insurance';
  if (/health|med|hospital|pharm/.test(n)) return 'health';
  if (/school|tuition|course/.test(n)) return 'education';
  if (/trip|flight|travel/.test(n)) return 'plane';
  if (/pet|vet/.test(n))            return 'pet';
  if (/gym|fitness/.test(n))        return 'gym';
  return 'misc';
}
