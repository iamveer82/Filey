/**
 * Filely Color System — Dark Navy Fintech Theme
 * Inspired by premium banking/fintech UI: deep navy backgrounds,
 * blue glass cards, lime green as brand/success, red for expenses.
 */
export const Colors = {
  dark: {
    // Backgrounds
    bg:           '#0B0F1E',              // Deep navy base
    bgSecondary:  '#0D1323',              // Slightly lighter navy
    card:         '#141B2D',              // Card surface
    cardElevated: '#1C2540',              // Elevated card (modals, overlays)
    surfaceLow:   '#0F1628',              // Input/chip backgrounds

    // Text
    text:          '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.60)',
    textMuted:     'rgba(255,255,255,0.35)',

    // Borders
    border:        'rgba(255,255,255,0.08)',
    borderSubtle:  'rgba(255,255,255,0.04)',
    borderAccent:  'rgba(79,142,255,0.3)',

    // Brand lime green — CTA buttons, confirm actions, scan
    lime:      '#44e571',
    limeDark:  '#006e2c',
    limeLight: 'rgba(68,229,113,0.12)',
    limeBg:    'rgba(68,229,113,0.18)',

    // Blue accent — secondary accent, analytics, active states
    accent:      '#4F8EFF',
    accentDark:  '#2563EB',
    accentLight: 'rgba(79,142,255,0.15)',
    accentBg:    'rgba(79,142,255,0.08)',

    // Semantic
    positive:      '#44e571',
    positiveLight: 'rgba(68,229,113,0.12)',
    negative:      '#FF4B6E',
    negativeLight: 'rgba(255,75,110,0.12)',
    warning:       '#F59E0B',
    warningLight:  'rgba(245,158,11,0.12)',

    // Legacy compat
    dark:   '#FFFFFF',
    navBg:  'rgba(11,15,30,0.97)',
    error:  '#FF4B6E',
  },

  light: {
    // Backgrounds
    bg:           '#F4F7FF',
    bgSecondary:  '#FFFFFF',
    card:         '#FFFFFF',
    cardElevated: '#F0F4FF',
    surfaceLow:   '#EEF2FF',

    // Text
    text:          '#0D1526',
    textSecondary: 'rgba(13,21,38,0.60)',
    textMuted:     'rgba(13,21,38,0.35)',

    // Borders
    border:        'rgba(13,21,38,0.10)',
    borderSubtle:  'rgba(13,21,38,0.05)',
    borderAccent:  'rgba(59,130,246,0.3)',

    // Brand lime green
    lime:      '#44e571',
    limeDark:  '#006e2c',
    limeLight: 'rgba(68,229,113,0.12)',
    limeBg:    'rgba(68,229,113,0.18)',

    // Blue accent
    accent:      '#3B82F6',
    accentDark:  '#1D4ED8',
    accentLight: 'rgba(59,130,246,0.12)',
    accentBg:    'rgba(59,130,246,0.06)',

    // Semantic
    positive:      '#16A34A',
    positiveLight: 'rgba(22,163,74,0.10)',
    negative:      '#DC2626',
    negativeLight: 'rgba(220,38,38,0.10)',
    warning:       '#D97706',
    warningLight:  'rgba(217,119,6,0.10)',

    // Legacy compat
    dark:   '#0D1526',
    navBg:  'rgba(244,247,255,0.97)',
    error:  '#DC2626',
  },
};
