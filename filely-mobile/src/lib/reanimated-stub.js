/**
 * react-native-reanimated stub — WEB ONLY.
 *
 * react-native-reanimated v4 requires JSI worklets which are unavailable in
 * the web renderer.  metro.config.js redirects the import to this file ONLY
 * when platform === 'web'.  iOS/Android builds use the real native module.
 *
 * Screens render correctly without entrance animations.
 */

import { View, Text, ScrollView, Image, FlatList } from 'react-native';

// ─── Animated namespace ───────────────────────────────────────────────────────
// Map every commonly-used Animated.* component to its plain RN equivalent.
// createAnimatedComponent is called by react-native-gesture-handler at module
// load time — returning the component as-is prevents the crash.
const Animated = {
  View,
  Text,
  ScrollView,
  Image,
  FlatList,
  createAnimatedComponent: (component) => component,
};
export default Animated;

// ─── Animation builders ───────────────────────────────────────────────────────
// All builder methods chain; terminal methods (springify / easing) return
// undefined so the `entering` / `exiting` props on View are silently ignored.
const noop = {
  delay:     () => noop,
  duration:  () => noop,
  springify: () => undefined,
  easing:    () => noop,
  stiffness: () => noop,
  damping:   () => noop,
  mass:      () => noop,
  overshootClamping: () => noop,
  restDisplacementThreshold: () => noop,
  restSpeedThreshold: () => noop,
};

export const FadeIn       = noop;
export const FadeOut      = noop;
export const FadeInDown   = noop;
export const FadeInUp     = noop;
export const FadeInLeft   = noop;
export const FadeInRight  = noop;
export const FadeOutDown  = noop;
export const FadeOutUp    = noop;
export const SlideInDown  = noop;
export const SlideInUp    = noop;
export const SlideOutDown = noop;
export const SlideOutUp   = noop;
export const ZoomIn       = noop;
export const ZoomOut      = noop;
export const BounceIn     = noop;
export const BounceOut    = noop;

// ─── Layout animation ─────────────────────────────────────────────────────────
export const Layout = { springify: () => undefined };

// ─── Hooks ────────────────────────────────────────────────────────────────────
export const useSharedValue           = (init) => ({ value: init });
export const useAnimatedStyle         = (_fn) => ({});
export const useDerivedValue          = (fn) => ({ value: fn() });
export const useAnimatedProps         = (_fn) => ({});
export const useAnimatedRef           = () => ({ current: null });
export const useAnimatedScrollHandler = () => ({});
export const useAnimatedReaction      = () => {};
export const useFrameCallback         = () => {};
export const useWorkletCallback       = (fn) => fn;

// ─── Animation runners ────────────────────────────────────────────────────────
export const withTiming    = (value, _config) => value;
export const withSpring    = (value, _config) => value;
export const withDecay     = (value, _config) => value;
export const withSequence  = (..._fns) => undefined;
export const withRepeat    = (fn) => fn;
export const withDelay     = (_ms, fn) => fn;
export const cancelAnimation = () => {};

// ─── Thread bridges ───────────────────────────────────────────────────────────
export const runOnJS  = (fn) => fn;
export const runOnUI  = (fn) => fn;

// ─── Utilities ────────────────────────────────────────────────────────────────
export const interpolate    = (value) => value;
export const Extrapolation  = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
export const Easing         = {
  linear:  (t) => t,
  ease:    (t) => t,
  quad:    (t) => t,
  cubic:   (t) => t,
  sin:     (t) => t,
  circle:  (t) => t,
  exp:     (t) => t,
  elastic: () => (t) => t,
  back:    () => (t) => t,
  bounce:  (t) => t,
  bezier:  () => (t) => t,
  in:      (_f) => (t) => t,
  out:     (_f) => (t) => t,
  inOut:   (_f) => (t) => t,
};
export const measure          = () => null;
export const scrollTo         = () => {};
export const setNativeProps   = () => {};
export const getReanimatedVersion = () => '0.0.0-stub';
