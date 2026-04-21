/**
 * Vision OCR Service — Native iOS OCR using Apple Vision framework.
 *
 * iOS: VNRecognizeTextRequest via RNVisionOcr native module.
 * Android: Falls back to ML Kit or Google ML (future).
 * Web: Returns empty results (dev only).
 *
 * When an AI model is connected (Gemma via GemmaInference module), it can request
 * image data upload for enhanced analysis. Otherwise the native OCR handles everything.
 */
import { Platform, NativeModules } from 'react-native';

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
  }
  return _visionModule || null;
}

/**
 * Extract text from an image using native Vision framework.
 * @param {string} imageUri - file:// or http:// URI
 * @param {object} opts - { languages?: string[], customWords?: string[] }
 * @returns {Promise<{ text: string, confidence: number, regions: Array }>}
 */
const DEFAULT_LANGS = ['en-US', 'ar-SA'];

export async function recognizeText(imageUri, opts = {}) {
  if (Platform.OS === 'web') {
    return { text: '', confidence: 0, regions: [] };
  }

  const languages = opts.languages || DEFAULT_LANGS;
  const RNVisionOcr = getVisionModule();

  if (RNVisionOcr && typeof RNVisionOcr.recognizeText === 'function') {
    try {
      const result = await RNVisionOcr.recognizeText(imageUri, { languages });
      return {
        text: result.text || '',
        confidence: result.confidence || 0,
        regions: result.regions || [],
      };
    } catch (err) {
      console.error('[VisionOcr] Native recognition failed:', err);
    }
  }

  return { text: '', confidence: 0, regions: [] };
}

/**
 * Get list of languages supported by Vision OCR on this device.
 * @returns {Promise<string[]>}
 */
export async function getSupportedLanguages() {
  if (Platform.OS === 'ios') {
    const RNVisionOcr = getVisionModule();
    if (RNVisionOcr && typeof RNVisionOcr.getSupportedLanguages === 'function') {
      return RNVisionOcr.getSupportedLanguages();
    }
  }
  return ['en-US'];
}

/**
 * Check if OCR is available on current platform.
 * @returns {boolean}
 */
export function isOcrAvailable() {
  if (Platform.OS === 'web') return false;
  const RNVisionOcr = getVisionModule();
  return !!(RNVisionOcr && typeof RNVisionOcr.recognizeText === 'function');
}
