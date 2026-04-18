/**
 * Crash reporting + lightweight telemetry.
 *
 * Wrap Sentry in try/catch so missing native module in dev doesn't crash.
 * Enable by setting EXPO_PUBLIC_SENTRY_DSN in app env.
 */

let Sentry = null;
try {
  Sentry = require('@sentry/react-native');
} catch {}

let initialised = false;

export function initTelemetry() {
  if (initialised || !Sentry) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  try {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.2,
      enableAutoSessionTracking: true,
      debug: __DEV__,
    });
    initialised = true;
  } catch (e) {
    if (__DEV__) console.warn('[telemetry] init failed', e?.message);
  }
}

export function captureError(err, context = {}) {
  if (!Sentry) {
    if (__DEV__) console.error('[telemetry]', err, context);
    return;
  }
  try {
    Sentry.captureException(err, { extra: context });
  } catch {}
}

export function setUser(user) {
  if (!Sentry || !user) return;
  try {
    Sentry.setUser({ id: user.id, username: user.name, email: user.email });
  } catch {}
}

export function addBreadcrumb(message, data = {}) {
  if (!Sentry) return;
  try {
    Sentry.addBreadcrumb({ message, data, level: 'info' });
  } catch {}
}
