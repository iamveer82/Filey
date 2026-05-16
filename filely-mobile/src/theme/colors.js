/**
 * Filely Color System — Deep Navy + Cobalt Blue Fintech Theme
 * Extracted from reference design. Deep navy base (#000E28), bright cobalt (#0F53DC),
 * white content cards for high-contrast readability.
 */
export const Colors = {
  dark: {
    // Surfaces
    bg:           '#000E28',
    bgSecondary:  '#001029',
    card:         '#0F1B3D',
    cardElevated: '#16244A',
    surfaceLow:   '#0F1B3D',

    // Text
    text:          '#FFFFFF',
    textSecondary: '#8B95AD',
    textMuted:     '#5C6780',

    // Borders
    border:        'rgba(255, 255, 255, 0.08)',
    borderSubtle:  'rgba(255, 255, 255, 0.05)',
    borderAccent:  'rgba(15, 83, 220, 0.35)',

    // Brand — Cobalt Blue
    primary:       '#0F53DC',
    primaryDark:   '#0A3DA6',
    primaryLight:  'rgba(15, 83, 220, 0.18)',
    primaryBg:     'rgba(15, 83, 220, 0.10)',

    // Legacy aliases (backward compat)
    lime:          '#0F53DC',
    limeDark:      '#0A3DA6',
    limeLight:     'rgba(15, 83, 220, 0.18)',
    limeBg:        'rgba(15, 83, 220, 0.10)',
    accent:        '#0F53DC',
    accentDark:    '#0A3DA6',
    accentLight:   'rgba(15, 83, 220, 0.18)',
    accentBg:      'rgba(15, 83, 220, 0.10)',

    // Semantic
    positive:      '#16A34A',
    positiveLight: 'rgba(22, 163, 74, 0.14)',
    negative:      '#EF4444',
    negativeLight: 'rgba(239, 68, 68, 0.14)',
    warning:       '#F59E0B',
    warningLight:  'rgba(245, 158, 11, 0.14)',
    dark:          '#FFFFFF',
    navBg:         'rgba(0, 14, 40, 0.97)',
    error:         '#EF4444',
  },
  light: {
    // Surfaces
    bg:           '#F3F6FC',
    bgSecondary:  '#FFFFFF',
    card:         '#FFFFFF',
    cardElevated: '#F8FAFF',
    surfaceLow:   '#EEF2FB',

    // Text
    text:          '#0B1324',
    textSecondary: 'rgba(11, 19, 36, 0.70)',
    textMuted:     'rgba(11, 19, 36, 0.45)',

    // Borders
    border:        'rgba(11, 19, 36, 0.08)',
    borderSubtle:  'rgba(11, 19, 36, 0.04)',
    borderAccent:  'rgba(15, 83, 220, 0.30)',

    // Brand — Cobalt Blue (same as dark)
    primary:       '#0F53DC',
    primaryDark:   '#0A3DA6',
    primaryLight:  'rgba(15, 83, 220, 0.12)',
    primaryBg:     'rgba(15, 83, 220, 0.08)',

    // Legacy aliases
    lime:          '#0F53DC',
    limeDark:      '#0A3DA6',
    limeLight:     'rgba(15, 83, 220, 0.12)',
    limeBg:        'rgba(15, 83, 220, 0.08)',
    accent:        '#0F53DC',
    accentDark:    '#0A3DA6',
    accentLight:   'rgba(15, 83, 220, 0.12)',
    accentBg:      'rgba(15, 83, 220, 0.08)',

    // Semantic
    positive:      '#16A34A',
    positiveLight: 'rgba(22, 163, 74, 0.10)',
    negative:      '#DC2626',
    negativeLight: 'rgba(220, 38, 38, 0.10)',
    warning:       '#D97706',
    warningLight:  'rgba(217, 119, 6, 0.10)',
    dark:          '#0B1324',
    navBg:         'rgba(243, 246, 252, 0.97)',
    error:         '#DC2626',
  },
};
