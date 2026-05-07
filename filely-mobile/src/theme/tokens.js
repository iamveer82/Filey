/**
 * Filely Design Tokens — Dark Navy Fintech System
 * Soft blue glow shadows, glass cards, rounded modern feel.
 */

// ─── Typography ───────────────────────────────────────────
export const Typography = {
  hero:       { fontSize: 34, fontWeight: '800', letterSpacing: -1.5, lineHeight: 40 },
  heroAccent: { fontSize: 34, fontWeight: '800', fontStyle: 'italic', letterSpacing: -1.5, lineHeight: 40 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, lineHeight: 26 },
  cardTitle:    { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, lineHeight: 22 },

  valueXL: { fontSize: 36, fontWeight: '800', letterSpacing: -1.5, lineHeight: 42 },
  valueL:  { fontSize: 28, fontWeight: '800', letterSpacing: -0.8, lineHeight: 34 },
  valueM:  { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, lineHeight: 30 },
  valueS:  { fontSize: 20, fontWeight: '700', lineHeight: 26 },

  body:      { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  bodyBold:  { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  caption:   { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  captionBold: { fontSize: 13, fontWeight: '700', lineHeight: 18 },

  label:     { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, lineHeight: 14 },
  labelWide: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, lineHeight: 14 },
  micro:     { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, lineHeight: 14 },
  overline:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, lineHeight: 16 },
  greeting:  { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, lineHeight: 16 },

  btnPrimary: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2, lineHeight: 20 },
  btnSmall:   { fontSize: 13, fontWeight: '700', letterSpacing: 0.1, lineHeight: 18 },
  btnLabel:   { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, lineHeight: 14 },
};

// ─── Spacing ──────────────────────────────────────────────
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
};

// ─── Border Radius ────────────────────────────────────────
export const Radius = {
  sm:   8,
  md:   12,
  lg:   20,
  xl:   24,
  xxl:  28,
  pill: 100,
  full: 9999,
};

// ─── Border Width ─────────────────────────────────────────
export const BorderWidth = {
  hairline: 0.5,
  thin:     1,
  medium:   1.5,
  thick:    2,
  heavy:    3,
};

// ─── Shadows — Soft Blue Glow (fintech style) ─────────────
export const Shadow = {
  // Subtle card lift
  softSm: {
    shadowColor: '#2A63E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  softMd: {
    shadowColor: '#2A63E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  softLg: {
    shadowColor: '#2A63E2',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.20,
    shadowRadius: 40,
    elevation: 12,
  },
  // Lime glow for CTAs
  limeSm: {
    shadowColor: '#2A63E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 4,
  },
  limeMd: {
    shadowColor: '#2A63E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  // Dark subtle (light mode)
  darkSm: {
    shadowColor: '#0D1526',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  // Legacy aliases (used in existing screens)
  hardSm: {
    shadowColor: '#2A63E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  hardMd: {
    shadowColor: '#2A63E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 20,
    elevation: 8,
  },
  hardLg: {
    shadowColor: '#2A63E2',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 12,
  },
};

// ─── Card Presets (Glass / Fintech Style) ─────────────────
export const CardPresets = {
  // Dark glass card (primary — most screens)
  cardDark: {
    backgroundColor: '#141B2D',
    borderColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderRadius: Radius.xl,
    ...Shadow.softSm,
  },
  // Light mode card
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(13,21,38,0.08)',
    borderWidth: 1,
    borderRadius: Radius.xl,
    ...Shadow.darkSm,
  },
  // Elevated dark card (modals, featured)
  cardElevatedDark: {
    backgroundColor: '#1C2540',
    borderColor: 'rgba(79,142,255,0.15)',
    borderWidth: 1,
    borderRadius: Radius.xl,
    ...Shadow.softMd,
  },
  // Blue tinted card
  cardAccentDark: {
    backgroundColor: 'rgba(79,142,255,0.10)',
    borderColor: 'rgba(79,142,255,0.20)',
    borderWidth: 1,
    borderRadius: Radius.xl,
  },
  // Lime/success card
  cardLimeDark: {
    backgroundColor: 'rgba(68,229,113,0.10)',
    borderColor: 'rgba(68,229,113,0.20)',
    borderWidth: 1,
    borderRadius: Radius.xl,
  },
  // Inverted (accent bg) — dark mode
  cardInvertedDark: {
    backgroundColor: '#1C2540',
    borderColor: 'rgba(79,142,255,0.20)',
    borderWidth: 1,
    borderRadius: Radius.xl,
    ...Shadow.softSm,
  },
  // Inverted — light mode
  cardInvertedLight: {
    backgroundColor: '#0D1526',
    borderColor: 'rgba(13,21,38,0.12)',
    borderWidth: 1,
    borderRadius: Radius.xl,
    ...Shadow.darkSm,
  },
  // Button primary (lime green CTA)
  btnPrimary: {
    backgroundColor: '#2A63E2',
    borderColor: 'rgba(0,83,31,0.3)',
    borderWidth: 1,
    borderRadius: Radius.pill,
    ...Shadow.limeSm,
  },
};
