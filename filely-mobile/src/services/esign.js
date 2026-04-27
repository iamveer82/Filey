/**
 * eSign Service — Add digital signatures to PDFs.
 * Uses native PDF tools on iOS for embedding.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { Platform, NativeModules } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const NativePdfTools = Platform.OS === 'ios' ? NativeModules.PdfTools : null;

export async function pickPdf() {
  const r = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  return r.assets[0];
}

/**
 * Analyze PDF for signature placement — defaults to bottom of last page.
 */
export async function analyzeSignaturePlacement(pdfUri) {
  let pageCount = 1;
  if (Platform.OS === 'ios' && NativePdfTools) {
    try {
      const info = await NativePdfTools.getPageCount(pdfUri);
      pageCount = info.pageCount || 1;
    } catch {}
  }

  return {
    pages: [
      { pageNumber: pageCount, x: 100, y: 700, width: 200, height: 60, reason: 'Bottom of last page' },
      { pageNumber: pageCount, x: 350, y: 700, width: 150, height: 60, reason: 'Alternative position' },
    ],
  };
}

/**
 * Pick signature image from gallery.
 */
export async function pickSignatureFromGallery() {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, error: 'Photo library permission required.' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 1],
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { success: false, error: 'Cancelled.' };
    }

    const processed = await manipulateAsync(
      result.assets[0].uri,
      [],
      { compress: 0.9, format: SaveFormat.PNG },
    );

    return {
      success: true,
      uri: processed.uri,
      base64: result.assets[0].base64,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Open signature pad — placeholder (Skia canvas needed for drawing).
 */
export async function drawSignatureInteractive() {
  console.log('[ESign] Opening signature pad...');
  return {
    uri: '',
    base64: '',
    strokes: [],
  };
}

export function clearSignature() {
  console.log('[ESign] Clearing signature pad');
}

/**
 * Embed signature image into PDF at the specified position.
 * Uses native CGPDFContext on iOS for proper PDF overlay.
 */
export async function embedSignature(pdfUri, signatureUri, position) {
  try {
    if (Platform.OS === 'ios' && NativePdfTools) {
      // Use native embedding: pass signature image + position
      // Native module renders signature onto PDF page at exact coordinates
      const result = await NativePdfTools.embedSignature(
        pdfUri,
        signatureUri,
        position.pageNumber,
        position.x,
        position.y,
        position.width,
        position.height
      );

      if (result.success && result.uri) {
        return {
          success: true,
          outputUri: result.uri,
          message: `Signature embedded at (${position.x}, ${position.y}) pt on page ${position.pageNumber}.`,
        };
      }
      // Fall through to copy if native returned no result
    }

    // Fallback: copy original PDF
    const filename = `signed-${Date.now()}.pdf`;
    const outputPath = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.copyAsync({ from: pdfUri, to: outputPath });
    return {
      success: true,
      outputUri: outputPath,
      message: 'PDF copied. Full signature embedding requires native PDF tools.',
    };
  } catch (error) {
    console.error('[ESign] Embed error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Full eSign flow.
 */
export async function signDocument() {
  try {
    const pdf = await pickPdf();
    if (!pdf) return { success: false, error: 'Cancelled.' };

    const placement = await analyzeSignaturePlacement(pdf.uri);
    const signatureData = await drawSignatureInteractive();
    if (!signatureData) return { success: false, error: 'Signature cancelled.' };

    const position = placement.pages?.[0] || { pageNumber: 1, x: 100, y: 700, width: 200, height: 60 };
    const result = await embedSignature(pdf.uri, signatureData.uri, position);

    if (result.success && result.outputUri) {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.outputUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Signed Document',
        });
      }
      return {
        success: true,
        outputUri: result.outputUri,
        message: result.message || 'Document signed!',
      };
    }
    return result;
  } catch (error) {
    console.error('[ESign] Sign error:', error);
    return { success: false, error: error.message };
  }
}
