/**
 * Filely Design Tokens — Deep Navy + Cobalt Blue Fintech System
 * Sharp high-contrast shadows, elevated cards, modern rounded feel.
 */
import { Colors } from './colors';

const { dark: C } = Colors;

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
  lg:   16,
  xl:   20,
  xxl:  24,
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

// ─── Shadows — Cobalt Blue Accent Glow ────────────────────
export const Shadow = {
  // Subtle card lift on dark bg
  softSm: {
    shadowColor: '#0F53DC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  softMd: {
    shadowColor: '#0F53DC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  softLg: {
    shadowColor: '#0F53DC',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 12,
  },
  // Blue glow for CTAs
  limeSm: {
    shadowColor: '#0F53DC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  limeMd: {
    shadowColor: '#0F53DC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 8,
  },
  // Dark subtle (light mode cards)
  darkSm: {
    shadowColor: '#000E28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  // Legacy aliases
  hardSm: {
    shadowColor: '#0F53DC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  hardMd: {
    shadowColor: '#0F53DC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  hardLg: {
    shadowColor: '#0F53DC',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.20,
    shadowRadius: 32,
    elevation: 12,
  },
};

// ─── Card Presets — Navy + White Contrast ─────────────────
export const CardPresets = {
  // Dark navy card (metric widgets, search bar)
  cardDark: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: Radius.xl,
    ...Shadow.softSm,
  },
  // Light mode card
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(11, 19, 36, 0.08)',
    borderWidth: 1,
    borderRadius: Radius.xl,
    ...Shadow.darkSm,
  },
  // Elevated dark card (featured metrics)
  cardElevatedDark: {
    backgroundColor: C.cardElevated,
    borderColor: 'rgba(15, 83, 220, 0.15)',
    borderWidth: 1,
    borderRadius: Radius.xl,
    ...Shadow.softMd,
  },
  // Blue tinted card
  cardAccentDark: {
    backgroundColor: C.primaryBg,
    borderColor: 'rgba(15, 83, 220, 0.20)',
    borderWidth: 1,
    borderRadius: Radius.xl,
  },
  // Success/positive card
  cardLimeDark: {
    backgroundColor: C.positiveLight,
    borderColor: 'rgba(22, 163, 74, 0.20)',
    borderWidth: 1,
    borderRadius: Radius.xl,
  },
  // Inverted card — dark mode
  cardInvertedDark: {
    backgroundColor: C.cardElevated,
    borderColor: 'rgba(15, 83, 220, 0.20)',
    borderWidth: 1,
    borderRadius: Radius.xl,
    ...Shadow.softSm,
  },
  // Inverted card — light mode
  cardInvertedLight: {
    backgroundColor: '#000E28',
    borderColor: 'rgba(0, 14, 40, 0.12)',
    borderWidth: 1,
    borderRadius: Radius.xl,
    ...Shadow.darkSm,
  },
  // Primary CTA button — cobalt blue pill
  btnPrimary: {
    backgroundColor: C.primary,
    borderColor: 'rgba(10, 61, 166, 0.3)',
    borderWidth: 1,
    borderRadius: Radius.pill,
    ...Shadow.limeSm,
  },
};
