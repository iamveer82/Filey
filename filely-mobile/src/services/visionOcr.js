/**
 * Vision OCR Service — Extracts text from receipt images using Apple Vision framework.
 *
 * On iOS: Uses the native Vision framework (VNRecognizeTextRequest) via a Turbo Module.
 * On web: Falls back to a simple placeholder that returns no text (web dev only).
 *
 * The native module must be registered in ios/ as RNVisionOcr.
 * Until the native module is built, this falls back gracefully.
 */
import { Platform, NativeModules } from 'react-native';

// Lazy-load native module to prevent top-level JSI crash when module isn't linked
let _visionModule = null;
function getVisionModule() {
  if (_visionModule === undefined) return null;
  if (_visionModule === null) {
    try {
      _visionModule = NativeModules.RNVisionOcr || undefined;
    } catch (e) {
      console.warn('[VisionOcr] Failed to load native module:', e.message);
      _visionModule = undefined;
    }
    if (_visionModule === undefined) _visionModule = undefined; // mark as attempted
  }
  return _visionModule || null;
}

/**
 * Extract text from a receipt image.
 * @param {string} imageUri — Local file URI (e.g., file:///path/to/image.jpg) or base64 data URI
 * @returns {Promise<{ text: string, confidence: number, regions: Array<{text: string, confidence: number, bounds: object}> }>}
 */
const DEFAULT_LANGS = ['ar-SA', 'en-US'];

export async function recognizeText(imageUri, opts = {}) {
  // Web platform fallback — no OCR on web
  if (Platform.OS === 'web') {
    console.warn('[VisionOcr] Text recognition is not available on web platform.');
    return { text: '', confidence: 0, regions: [] };
  }

  const languages = opts.languages || DEFAULT_LANGS;

  // Try native Vision module first
  const RNVisionOcr = getVisionModule();
  if (RNVisionOcr && typeof RNVisionOcr.recognizeText === 'function') {
    try {
      // Pass languages hint if module supports multi-lang signature; ignored otherwise
      const result = RNVisionOcr.recognizeText.length >= 2
        ? await RNVisionOcr.recognizeText(imageUri, { languages })
        : await RNVisionOcr.recognizeText(imageUri);
      return {
        text: result.text || '',
        confidence: result.confidence || 0,
        regions: result.regions || [],
      };
    } catch (err) {
      console.error('[VisionOcr] Native recognition failed:', err);
    }
  }

  // Fallback: No native module available yet
  // This will be replaced with the actual Turbo Module once built
  console.warn('[VisionOcr] Native module not available. OCR text extraction is not functional.');
  return { text: '', confidence: 0, regions: [] };
}

/**
 * Quick check if OCR is available on the current platform.
 * @returns {boolean}
 */
export function isOcrAvailable() {
  if (Platform.OS === 'web') return false;
  const RNVisionOcr = getVisionModule();
  return !!(RNVisionOcr && typeof RNVisionOcr.recognizeText === 'function');
}