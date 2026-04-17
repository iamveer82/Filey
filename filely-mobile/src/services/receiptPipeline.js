/**
 * Receipt Pipeline — Orchestrates the full scan flow:
 *   1. Capture/pick image
 *   2. Run Apple Vision OCR (extract raw text)
 *   3. Run Gemma inference (parse into structured data)
 *   4. Return structured transaction ready for verification
 *
 * Platform-safe: Falls back gracefully on web.
 */
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { recognizeText, isOcrAvailable } from './visionOcr';
import { parseReceipt, isModelReady } from './gemmaInference';
import { autoCategorize } from './categories';

/**
 * Scan a receipt from camera or gallery.
 * @param {'camera'|'gallery'} source — Where to get the image
 * @returns {Promise<{ success: boolean, transaction?: object, ocrText?: string, error?: string }>}
 */
export async function scanReceipt(source = 'gallery') {
  try {
    // Step 1: Get image
    let imageResult;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'Camera permission required to scan receipts.' };
      }
      imageResult = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.8,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return { success: false, error: 'Photo library permission required.' };
      }
      imageResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.8,
      });
    }

    if (imageResult.canceled || !imageResult.assets?.[0]) {
      return { success: false, error: 'No image selected.' };
    }

    const asset = imageResult.assets[0];

    // Step 2: Run OCR
    let ocrText = '';
    let ocrConfidence = 0;

    if (isOcrAvailable()) {
      const ocrResult = await recognizeText(asset.uri);
      ocrText = ocrResult.text;
      ocrConfidence = ocrResult.confidence;
    } else if (Platform.OS === 'web') {
      // On web, we can't do OCR — use the base64 image with the backend API
      return {
        success: false,
        error: 'On-device OCR not available on web. Use the mobile app for receipt scanning.',
        needsBackend: true,
        imageBase64: asset.base64,
        imageMimeType: asset.mimeType || 'image/jpeg',
      };
    } else {
      // No native Vision module yet — try using base64 with backend
      console.warn('[ReceiptPipeline] Vision OCR not available. Image captured but text extraction requires native module.');
      return {
        success: false,
        error: 'OCR text extraction requires a native module. Falling back to manual entry.',
        needsBackend: true,
        imageBase64: asset.base64,
        imageMimeType: asset.mimeType || 'image/jpeg',
      };
    }

    if (!ocrText || ocrText.trim().length === 0) {
      return {
        success: false,
        error: 'Could not read any text from the receipt. Please try a clearer photo.',
        ocrText: '',
      };
    }

    // Step 3: Parse with Gemma or local parser
    const transaction = await parseReceipt(ocrText);

    // Step 4: Auto-categorize if parser didn't return a valid category
    let category = transaction.category;
    if (!category || category === 'other' || category === 'unknown') {
      const cat = await autoCategorize({
        merchant: transaction.merchant,
        amount: transaction.amount,
        ocrText,
      });
      category = cat.id;
    }

    return {
      success: true,
      transaction: {
        id: generateId(),
        merchant: transaction.merchant,
        date: transaction.date,
        amount: transaction.amount,
        vat: transaction.vat,
        trn: transaction.trn,
        currency: transaction.currency || 'AED',
        category,
        paymentMethod: transaction.paymentMethod,
        status: 'pending',
      },
      imageUri: asset.uri,
      ocrText,
      ocrConfidence,
    };

  } catch (error) {
    console.error('[ReceiptPipeline] Scan error:', error);
    return { success: false, error: error.message || 'Failed to scan receipt.' };
  }
}

/**
 * Multi-image single-tx scan: pick N images (e.g. 2-page invoice), OCR each,
 * concat text, single parseReceipt → one merged transaction.
 */
export async function scanReceiptMerged() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return { success: false, error: 'Photo permission required.' };

  const pick = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: 6,
    base64: false,
    quality: 0.8,
  });
  if (pick.canceled || !pick.assets?.length) return { success: false, error: 'Cancelled.' };
  if (pick.assets.length < 2) return { success: false, error: 'Pick at least 2 images to merge.' };

  if (!isOcrAvailable()) {
    return { success: false, error: 'On-device OCR not available.' };
  }

  const parts = [];
  const uris = [];
  for (let i = 0; i < pick.assets.length; i++) {
    const asset = pick.assets[i];
    uris.push(asset.uri);
    try {
      const ocr = await recognizeText(asset.uri);
      if (ocr.text?.trim()) parts.push(`--- PAGE ${i + 1} ---\n${ocr.text}`);
    } catch (e) {
      parts.push(`--- PAGE ${i + 1} (failed: ${e.message}) ---`);
    }
  }
  const ocrText = parts.join('\n\n');
  if (!ocrText.trim()) return { success: false, error: 'No text detected across images.' };

  const parsed = await parseReceipt(ocrText);
  let category = parsed.category;
  if (!category || category === 'other' || category === 'unknown') {
    const cat = await autoCategorize({ merchant: parsed.merchant, amount: parsed.amount, ocrText });
    category = cat.id;
  }

  return {
    success: true,
    transaction: {
      id: generateId(),
      merchant: parsed.merchant,
      date: parsed.date,
      amount: parsed.amount,
      vat: parsed.vat,
      trn: parsed.trn,
      currency: parsed.currency || 'AED',
      category,
      status: 'pending',
      pageCount: pick.assets.length,
    },
    imageUri: uris[0],
    imageUris: uris,
    ocrText,
  };
}

/**
 * Parse a text message for expense info (e.g., "Paid 120 AED at ENOC")
 * Uses the same Gemma/local parser.
 */
export async function parseExpenseText(text) {
  if (!text || !text.trim()) {
    return null;
  }

  // Try to extract amount and merchant from natural language
  const amountRegex = /(\d+(?:\.\d{1,2})?)\s*(?:AED|aed|د\.إ|دإ|dirham)/i;
  const amountMatch = text.match(amountRegex);

  // Also try "AED 120" format
  const aedFirstRegex = /(?:AED|aed|د\.إ|دإ)\s*(\d+(?:\.\d{1,2})?)/i;
  const aedFirstMatch = text.match(aedFirstRegex);

  const amount = amountMatch ? parseFloat(amountMatch[1]) : (aedFirstMatch ? parseFloat(aedFirstMatch[1]) : 0);

  // Try to extract merchant — common patterns
  const atRegex = /(?:at|@|from|to)\s+([A-Za-z0-9\s&'.-]{2,30})/i;
  const atMatch = text.match(atRegex);
  const merchant = atMatch ? atMatch[1].trim() : 'Unknown Merchant';

  // Parse with local logic
  const parsed = await parseReceipt(text);

  // If we extracted amount from text, prefer that
  if (amount > 0) parsed.amount = amount;

  // If we extracted merchant from text, prefer that
  if (atMatch && merchant !== 'Unknown Merchant') parsed.merchant = merchant;

  return {
    id: generateId(),
    ...parsed,
    status: 'pending',
  };
}

/**
 * Bulk scan: pick multiple images, OCR+parse each sequentially.
 * onProgress({done, total, current}) fires per image.
 * Returns: { results: [{success, transaction?, error?}], count }
 */
export async function scanReceiptBulk(onProgress) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return { results: [], count: 0, error: 'Photo library permission required.' };
  }
  const pick = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: 20,
    base64: true,
    quality: 0.8,
  });
  if (pick.canceled || !pick.assets?.length) return { results: [], count: 0 };

  const results = [];
  for (let i = 0; i < pick.assets.length; i++) {
    const asset = pick.assets[i];
    onProgress?.({ done: i, total: pick.assets.length, current: asset.uri });
    try {
      if (!isOcrAvailable()) {
        results.push({ success: false, error: 'OCR not available', imageUri: asset.uri });
        continue;
      }
      const ocr = await recognizeText(asset.uri);
      if (!ocr.text?.trim()) {
        results.push({ success: false, error: 'No text detected', imageUri: asset.uri });
        continue;
      }
      const parsed = await parseReceipt(ocr.text);
      let category = parsed.category;
      if (!category || category === 'other' || category === 'unknown') {
        const cat = await autoCategorize({ merchant: parsed.merchant, amount: parsed.amount, ocrText: ocr.text });
        category = cat.id;
      }
      results.push({
        success: true,
        imageUri: asset.uri,
        transaction: {
          id: generateId(),
          merchant: parsed.merchant,
          date: parsed.date,
          amount: parsed.amount,
          vat: parsed.vat,
          trn: parsed.trn,
          currency: parsed.currency || 'AED',
          category,
          status: 'pending',
        },
      });
    } catch (e) {
      results.push({ success: false, error: e.message, imageUri: asset.uri });
    }
  }
  onProgress?.({ done: pick.assets.length, total: pick.assets.length, current: null });
  return { results, count: pick.assets.length };
}

function generateId() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}