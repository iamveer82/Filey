/**
 * Gemma Inference Service — Runs on-device Gemma 4 LiteRT model for receipt parsing.
 *
 * On iOS: Loads the .litertlm model from DocumentDirectory and runs inference via
 * a native Turbo Module (RNGemmaInference).
 * On web: Falls back to returning structured placeholder data.
 *
 * The native module must be registered in ios/ as RNGemmaInference.
 * Until the native module is built, this falls back gracefully.
 */
import { Platform, NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Lazy-load native module to prevent top-level JSI crash when module isn't linked
let _gemmaModule = null;
function getGemmaModule() {
  if (_gemmaModule === undefined) return null;
  if (_gemmaModule === null) {
    try {
      _gemmaModule = NativeModules.RNGemmaInference || undefined;
    } catch (e) {
      console.warn('[GemmaInference] Failed to load native module:', e.message);
      _gemmaModule = undefined;
    }
    if (_gemmaModule === undefined) _gemmaModule = undefined; // mark as attempted
  }
  return _gemmaModule || null;
}

const MODEL_DIR = `${FileSystem.documentDirectory}ai/`;
const MODEL_FILENAME = 'gemma-4-E2B-it.litertlm';
const MODEL_PATH = `${MODEL_DIR}${MODEL_FILENAME}`;

/**
 * Check if the Gemma model is downloaded and ready.
 * @returns {Promise<boolean>}
 */
export async function isModelReady() {
  if (Platform.OS === 'web') return false;
  try {
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    return info.exists && info.size > 1000000;
  } catch {
    return false;
  }
}

/**
 * Parse raw OCR text into structured receipt data using Gemma 4.
 *
 * The model receives a prompt like:
 *   "Extract the following from this UAE receipt: merchant name, date, total amount,
 *    VAT amount, TRN (15-digit Tax Registration Number). Receipt text: ..."
 *
 * @param {string} ocrText — Raw text from Vision OCR
 * @returns {Promise<{ merchant: string, date: string, amount: number, vat: number, trn: string, currency: string, category: string, paymentMethod: string }>}
 */
export async function parseReceipt(ocrText) {
  // Web fallback
  if (Platform.OS === 'web') {
    return parseReceiptLocally(ocrText);
  }

  // Try native Gemma inference
  const RNGemmaInference = getGemmaModule();
  if (RNGemmaInference && typeof RNGemmaInference.parseReceipt === 'function') {
    try {
      const modelReady = await isModelReady();
      if (!modelReady) {
        console.warn('[GemmaInference] Model not downloaded. Using local parser.');
        return parseReceiptLocally(ocrText);
      }

      const result = await RNGemmaInference.parseReceipt(ocrText);
      return {
        merchant: result.merchant || 'Unknown Merchant',
        date: result.date || new Date().toISOString().split('T')[0],
        amount: parseFloat(result.amount) || 0,
        vat: parseFloat(result.vat) || 0,
        trn: result.trn || '',
        currency: result.currency || 'AED',
        category: result.category || 'General',
        paymentMethod: result.paymentMethod || 'Cash',
      };
    } catch (err) {
      console.error('[GemmaInference] Native inference failed:', err);
      return parseReceiptLocally(ocrText);
    }
  }

  // Fallback: local regex-based parser
  return parseReceiptLocally(ocrText);
}

/**
 * Local regex-based receipt parser (offline fallback when Gemma isn't available).
 * Extracts common UAE receipt fields using pattern matching.
 */
function parseReceiptLocally(text) {
  if (!text) {
    return {
      merchant: 'Unknown Merchant',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      vat: 0,
      trn: '',
      currency: 'AED',
      category: 'General',
      paymentMethod: 'Cash',
    };
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Extract merchant — usually the first non-empty line or the biggest text
  const merchant = lines[0] || 'Unknown Merchant';

  // Extract date — look for common date patterns (DD/MM/YYYY, DD-MM-YYYY, etc.)
  const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
  const dateMatch = text.match(dateRegex);
  let date = new Date().toISOString().split('T')[0];
  if (dateMatch) {
    try {
      const parts = dateMatch[1].split(/[\/\-\.]/);
      if (parts.length === 3) {
        // Assume DD/MM/YYYY format for UAE receipts
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        date = `${year}-${month}-${day}`;
      }
    } catch {}
  }

  // Extract total amount — look for "Total", "TOTAL", "Net", "Amount Due" etc.
  let amount = 0;
  const totalRegex = /(?:total|net|amount\s*due|grand\s*total|balance\s*due)[:\s]*(\d+[,\.]?\d*)/i;
  const totalMatch = text.match(totalRegex);
  if (totalMatch) {
    amount = parseFloat(totalMatch[1].replace(',', ''));
  } else {
    // Fallback: find the largest number in the text
    const numberRegex = /(\d{1,3}(?:[,\.]?\d{3})*(?:\.\d{2}))/g;
    let maxNum = 0;
    let match;
    while ((match = numberRegex.exec(text)) !== null) {
      const num = parseFloat(match[1].replace(',', ''));
      if (num > maxNum && num < 1000000) maxNum = num;
    }
    amount = maxNum;
  }

  // Extract VAT — look for "VAT", "5%", "Tax"
  let vat = 0;
  const vatRegex = /(?:vat|tax|gst)[:\s]*(\d+[,\.]?\d*)/i;
  const vatMatch = text.match(vatRegex);
  if (vatMatch) {
    vat = parseFloat(vatMatch[1].replace(',', ''));
  } else if (amount > 0) {
    // UAE VAT is 5%
    vat = Math.round(amount * 0.05 * 100) / 100;
    const vatPercentRegex = /5\s*%/;
    if (!vatPercentRegex.test(text)) {
      // Only apply 5% if there's a hint of VAT in the text
      vat = 0;
    }
  }

  // Extract TRN (15-digit UAE Tax Registration Number)
  let trn = '';
  const trnRegex = /(?:trn|tax\s*registration|tax\s*no)[:\s]*(\d{15})/i;
  const trnMatch = text.match(trnRegex);
  if (trnMatch) {
    trn = trnMatch[1];
  } else {
    // Look for any 15-digit number
    const longNumRegex = /(\d{15})/;
    const longNumMatch = text.match(longNumRegex);
    if (longNumMatch) trn = longNumMatch[1];
  }

  // Infer category from merchant name or text
  const category = inferCategory(merchant + ' ' + text);

  // Infer payment method
  const paymentMethod = inferPaymentMethod(text);

  return {
    merchant,
    date,
    amount: Math.round(amount * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    trn,
    currency: 'AED',
    category,
    paymentMethod,
  };
}

const CATEGORY_KEYWORDS = {
  'Food': ['restaurant', 'cafe', 'coffee', 'bakery', 'kitchen', 'pizza', 'burger', 'shawarma', 'grill', 'catering', 'restaurant', 'eat', 'food', 'diner', 'bakery', 'supermarket', 'grocery', 'carrefour', 'lulu', 'spinneys', 'waitrose', 'choithrams', 'almaya', 'kfc', 'mcdonalds', 'subway', 'starbucks', 'costa'],
  'Transport': ['petrol', 'gas', 'fuel', 'enoc', 'adnoc', 'epco', 'diesel', 'uber', 'careem', 'taxi', 'rta', 'metro', 'parking', 'salik', 'toll'],
  'Shopping': ['mall', 'shop', 'store', 'outlet', 'boutique', 'amazon', 'noon', 'market', 'hypermarket'],
  'Office': ['office', 'stationery', 'printing', 'supply', 'furniture', 'it', 'tech', 'computer', 'laptop'],
  'Utilities': ['electricity', 'water', 'dewa', 'telecom', 'etisalat', 'du', 'internet', 'wifi', 'bill'],
  'Entertainment': ['cinema', 'theater', 'gym', 'fitness', 'sport', 'club', 'movie', 'concert', 'ticket'],
  'Health': ['pharmacy', 'hospital', 'clinic', 'medical', 'doctor', 'dental', 'health', 'medicine', 'boots', 'aster'],
  'Travel': ['hotel', 'flight', 'airline', 'emirates', 'flydubai', 'airbnb', 'booking', 'travel', 'visa', 'airport'],
  'Banking': ['bank', 'fee', 'transfer', 'interest', 'loan', 'mortgage', 'insurance'],
};

function inferCategory(text) {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'General';
}

const PAYMENT_KEYWORDS = {
  'Credit Card': ['visa', 'mastercard', 'credit card', 'card ending', 'card no', 'xxxx'],
  'Debit Card': ['debit card', 'debit'],
  'Online': ['online', 'upi', 'apple pay', 'google pay', 'samsung pay', 'contactless'],
};

function inferPaymentMethod(text) {
  const lower = text.toLowerCase();
  for (const [method, keywords] of Object.entries(PAYMENT_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return method;
  }
  return 'Cash';
}