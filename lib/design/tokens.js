/**
 * Filey design tokens — JS export.
 *
 * The single source of truth lives in app/globals.css as CSS variables.
 * This module mirrors the values for cases where Tailwind utility classes
 * are not enough (e.g. inline SVG fills, dynamic gradients, framer-motion
 * style props). When the CSS vars change, update here too.
 *
 * Prefer Tailwind classes (`bg-brand`, `text-fg-muted`) wherever possible;
 * import these tokens only as a fallback.
 */

export const COLOR = Object.freeze({
  // surface
  bg:           'hsl(220 14% 97%)',
  bgElevated:   'hsl(0 0% 100%)',
  bgMuted:      'hsl(210 40% 96%)',
  bgSubtle:     'hsl(210 40% 98%)',
  // text
  fg:           'hsl(222 47% 11%)',
  fgMuted:      'hsl(215 25% 35%)',
  fgSubtle:     'hsl(215 16% 47%)',
  fgDisabled:   'hsl(215 20% 65%)',
  fgInverse:    'hsl(0 0% 100%)',
  // borders
  border:       'hsl(214 32% 91%)',
  borderStrong: 'hsl(215 20% 80%)',
  // brand
  brand:        'hsl(218 76% 53%)',   // #2A63E2
  brandFg:      'hsl(0 0% 100%)',
  brandSoft:    'hsl(219 100% 96%)',  // #EBF1FF
  brandStrong:  'hsl(220 70% 40%)',   // #1E4BB0
  // status
  success:      'hsl(152 65% 38%)',
  successFg:    'hsl(0 0% 100%)',
  successSoft:  'hsl(143 64% 95%)',
  warning:      'hsl(38 92% 50%)',
  warningFg:    'hsl(38 92% 15%)',
  warningSoft:  'hsl(45 100% 96%)',
  danger:       'hsl(0 78% 56%)',
  dangerFg:     'hsl(0 0% 100%)',
  dangerSoft:   'hsl(0 100% 97%)',
  info:         'hsl(204 94% 50%)',
  infoFg:       'hsl(0 0% 100%)',
  infoSoft:     'hsl(204 100% 97%)',
});

// Legacy aliases — keep until Phase 4 migration is complete
export const BRAND       = '#2A63E2';
export const BRAND_DARK  = '#1E4BB0';
export const BRAND_SOFT  = '#EBF1FF';
export const BRAND_LIGHT = '#F5F8FF';
export const INK         = '#0F172A';
export const SLATE       = '#64748B';

export const RADIUS = Object.freeze({
  sm: '0.5rem',   // 8
  md: '0.75rem',  // 12
  lg: '1rem',     // 16
  xl: '1.25rem',  // 20
  full: '9999px',
});

export const SHADOW = Object.freeze({
  sm: '0 1px 2px 0 rgba(15,23,42,0.04)',
  md: '0 4px 12px -2px rgba(15,23,42,0.06), 0 2px 4px -2px rgba(15,23,42,0.04)',
  lg: '0 12px 24px -8px rgba(15,23,42,0.10), 0 4px 8px -4px rgba(15,23,42,0.05)',
  xl: '0 24px 48px -12px rgba(15,23,42,0.15)',
});

export const SPACING_SCALE = Object.freeze([0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96]);

export const TYPE_SCALE = Object.freeze({
  caption: 12,
  body:    14,
  bodyLg:  16,
  h4:      18,
  h3:      20,
  h2:      30,
  h1:      36,
  display: 48,
});

export const Z = Object.freeze({
  base:    0,
  raised:  10,
  sticky:  20,
  overlay: 30,
  modal:   50,
  popover: 60,
  toast:   70,
});

export const FONT = Object.freeze({
  sans:    "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  display: "'Plus Jakarta Sans', system-ui, sans-serif",
  mono:    "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
});
