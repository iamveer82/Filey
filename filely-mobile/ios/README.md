# Filely iOS Native Modules

This directory contains native iOS modules for the Filey React Native app.

## Modules

### 1. VisionOcr (`RNVisionOcr`)

Apple Vision framework integration for receipt text recognition.

**Features:**
- Uses `VNRecognizeTextRequest` for high-accuracy OCR
- Supports English (US/GB) text recognition
- Returns text, confidence scores, and bounding boxes
- Handles both `file://` URIs and base64 data URIs

**Requirements:**
- iOS 10.3+ (Vision framework)
- Camera permission in `app.json` (already configured)

**Usage from JavaScript:**
```javascript
import { recognizeText } from './src/services/visionOcr';

const result = await recognizeText(imageUri);
console.log(result.text);        // Full OCR text
console.log(result.confidence);  // Average confidence 0-1
console.log(result.regions);     // Individual text regions with bounds
```

### 2. GemmaInference (`RNGemmaInference`)

LiteRT (TensorFlow Lite) integration for on-device NLP inference.

**Features:**
- Runs Gemma 4 model locally (no API calls needed)
- Parses receipt OCR text into structured JSON
- Falls back to regex-based parser when model unavailable
- Supports offline operation

**Requirements:**
- TensorFlowLiteC framework (optional, for full inference)
- Gemma 4 model file at `DocumentDirectory/ai/gemma-4-E2B-it.litertlm`

**Usage from JavaScript:**
```javascript
import { parseReceipt, isModelReady } from './src/services/gemmaInference';

const ready = await isModelReady();
if (ready) {
  const transaction = await parseReceipt(ocrText);
  // Returns: { merchant, date, amount, vat, trn, category, paymentMethod }
}
```

## Building

### Option 1: Development Build (Recommended)

```bash
cd filely-mobile
npx expo prebuild --platform ios
cd ios
pod install
npx expo run:ios
```

### Option 2: Manual Framework Integration

For full Gemma inference, download TensorFlow Lite:

1. Download `TensorFlowLiteC.xcframework` from https://github.com/tensorflow/tensorflow/releases
2. Add to Xcode project under `ios/Filely/`
3. Uncomment the Podfile lines for TensorFlowLiteC

## File Structure

```
ios/
├── VisionOcr/
│   ├── RNVisionOcr.h       # Module header
│   └── RNVisionOcr.m       # Implementation (Apple Vision)
├── GemmaInference/
│   ├── RNGemmaInference.h  # Module header
│   └── RNGemmaInference.m  # Implementation (LiteRT + fallback parser)
├── Podfile                 # CocoaPods configuration
└── README.md               # This file
```

## Testing

### Test OCR Module
```javascript
import { recognizeText } from './src/services/visionOcr';

// Test with a sample receipt image
const result = await recognizeText('file:///path/to/receipt.jpg');
console.log('OCR Result:', result);
```

### Test Gemma Inference
```javascript
import { parseReceipt } from './src/services/gemmaInference';

const ocrText = `ENOC Service Station
15/03/2024
Total: 150.50 AED
VAT (5%): 7.53 AED
TRN: 123456789012345`;

const transaction = await parseReceipt(ocrText);
console.log('Parsed:', transaction);
// Expected: { merchant: 'ENOC', amount: 150.50, vat: 7.53, trn: '123456789012345', ... }
```

## Troubleshooting

### "Native module not found"
- Ensure you've run `npx expo prebuild --platform ios`
- Check that `pod install` completed successfully
- Verify modules are linked in Xcode

### OCR returns empty text
- Check camera/photo library permissions
- Ensure image quality is sufficient (not too blurry/dark)
- Vision framework requires iOS 10.3+

### Model not ready
- Check `AIInitializationScreen` completed download
- Verify model exists at `DocumentDirectory/ai/gemma-4-E2B-it.litertlm`
- Model file should be ~2.5GB

## Architecture Notes

- Both modules use async dispatch to avoid blocking the JS thread
- Gemma module gracefully falls back to local regex parser when unavailable
- All native code is wrapped in `@try/@catch` for safety
- Platform checks in JavaScript prevent web crashes
