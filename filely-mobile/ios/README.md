# Filely iOS Native Modules

All native iOS modules live under `LocalPods/` and are managed by CocoaPods via the Podfile.
Each module has its own `.podspec` — installed with `cd ios && pod install`.

## Modules

### 1. VisionOcr (`RNVisionOcr`)
`LocalPods/VisionOcr/`

Apple Vision framework integration for receipt text recognition.

**Features:**
- Uses `VNRecognizeTextRequest` for high-accuracy OCR
- Supports 50+ languages (dynamically queried via `supportedRecognitionLanguages()` on iOS 16+)
- Returns text, confidence scores, and bounding boxes
- Custom words list support for domain-specific recognition

**Requirements:** iOS 15.0+ (podspec minimum), Vision framework (built-in)

```javascript
import { recognizeText } from './src/services/visionOcr';
const result = await recognizeText(imageUri, { languages: ['en-US', 'ar-SA'] });
```

### 2. VisionEdgeDetection
`LocalPods/VisionEdgeDetection/`

Document edge detection using `VNDetectRectanglesRequest` with perspective correction.

**Features:**
- Rectangle detection with configurable aspect ratio and confidence
- Perspective correction via `CIPerspectiveCorrection`
- Image preprocessing (denoise, contrast boost, edge enhancement)
- Batch processing support

```javascript
import { detectDocumentEdges, applyPerspectiveCorrection } from './src/services/documentScanner';
```

### 3. PdfGenerator
`LocalPods/PdfGenerator/`

Multi-page PDF generation from images using `UIGraphicsPDFRenderer`.

**Features:**
- A4 / Letter / original size support
- Auto-orientation detection
- Image enhancement (auto-enhance, contrast, grayscale)
- Auto-crop via CIDetector rectangle detection

```javascript
import { generatePdf } from './src/services/pdfGenerator';
const result = await generatePdf(imageUris, 'output.pdf', { pageSize: 'a4' });
```

### 4. PdfTools
`LocalPods/PdfTools/`

67+ PDF operations on-device via PDFKit, CoreGraphics, CoreImage, Vision, WebKit.

**Categories:** Organize & Manage, Edit & Annotate, Convert, Secure, Optimize & Repair.

Dependencies: ZIPFoundation (for CBZ/EPUB/XLSX/PPTX/FB2 extraction).

```javascript
import * as PdfTools from './src/services/pdfTools';
const result = await PdfTools.mergePdfs([uri1, uri2], 'merged.pdf');
```

### 5. BrushCanvas
`LocalPods/PdfTools/BrushCanvas.swift`

PencilKit-backed drawing canvas for PDF annotation and signatures.

```javascript
import BrushCanvas from './src/components/BrushCanvas';
// Use via ref: canvasRef.current.exportPng({ scale: 2, composite: true })
```

## Gemma Inference (On-Device AI)

The Gemma 4 model (`gemma-4-E2B-it.litertlm`) provides on-device NLP for receipt parsing.
JS-side fallback (`gemmaInference.js`) uses regex when native module is unavailable.

**Requirements for full inference:**
1. TensorFlowLiteC framework — uncomment in Podfile
2. Model file at `DocumentDirectory/ai/gemma-4-E2B-it.litertlm`

## File Structure

```
ios/
├── LocalPods/
│   ├── VisionOcr/           # OCR via Apple Vision (Swift)
│   ├── VisionEdgeDetection/  # Document edge detection (Swift)
│   ├── PdfGenerator/         # Image→PDF generation (Swift)
│   └── PdfTools/             # 67+ PDF ops + BrushCanvas (Swift)
├── Podfile                   # CocoaPods configuration
└── README.md
```

## Building

```bash
cd filely-mobile
npx expo prebuild --platform ios
cd ios
pod install
npx expo run:ios
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Native module not found" | Run `npx expo prebuild --platform ios` then `cd ios && pod install` |
| OCR returns empty text | Check camera permissions, ensure iOS 15.0+ |
| Gemma model not ready | Model file (~2.5GB) must be at `DocumentDirectory/ai/gemma-4-E2B-it.litertlm` |
| Build errors | Ensure `IPHONEOS_DEPLOYMENT_TARGET = 15.0` (set in Podfile post_install) |

## Architecture Notes

- All modules dispatch to background queues — never block JS thread
- Platform checks in JavaScript (`Platform.OS === 'ios'`) prevent web/Android crashes
- Native modules gracefully degrade — PdfTools returns structured errors on unsupported formats
- Progress events emitted via RCTEventEmitter for long-running operations (merge, split, compress)
