/**
 * Filey motion system.
 *
 * Use these tokens with framer-motion (`transition={EASE_OUT_FAST}`) instead
 * of redefining the `[0.22, 1, 0.36, 1]` array on every page. They mirror
 * the CSS custom properties in globals.css so JS + CSS animations stay in
 * lockstep.
 *
 * Respect prefers-reduced-motion: framer-motion already honors it via
 * the `useReducedMotion` hook; the helpers here also short-circuit motion
 * variants when the user opts out.
 */

export const EASE_OUT    = [0.22, 1, 0.36, 1];      // standard
export const EASE_SPRING = [0.34, 1.56, 0.64, 1];   // playful overshoot
export const EASE_IN     = [0.45, 0, 0.55, 1];      // exits

export const DURATION = Object.freeze({
  fast:  0.15,
  base:  0.25,
  slow:  0.40,
  page:  0.50,
});

// Reusable framer-motion transition presets
export const T_FAST   = { duration: DURATION.fast, ease: EASE_OUT };
export const T_BASE   = { duration: DURATION.base, ease: EASE_OUT };
export const T_SLOW   = { duration: DURATION.slow, ease: EASE_OUT };
export const T_SPRING = { duration: DURATION.base, ease: EASE_SPRING };

// Common entrance variants
export const FADE_IN = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: T_BASE,
};

export const FADE_UP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: T_BASE,
};

export const FADE_UP_LG = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: T_SLOW,
};

export const SCALE_IN = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  transition: T_SPRING,
};

/**
 * Stagger a sibling list. Pass each child the `index` so it picks up the
 * delay below. Example:
 *   {items.map((it, i) => (
 *     <motion.div key={it.id} {...FADE_UP} transition={stagger(i)}>...
 *   ))}
 */
export function stagger(index, base = DURATION.base, step = 0.05) {
  return { duration: base, delay: index * step, ease: EASE_OUT };
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}
