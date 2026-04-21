/**
 * PDF Watermark Service — Add or remove watermarks from PDFs.
 * Uses native PdfTools on iOS.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { Platform, NativeModules } from 'react-native';

const NativePdfTools = Platform.OS === 'ios' ? NativeModules.PdfTools : null;

export async function pickPdf() {
  const r = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  return r.assets[0];
}

export async function pickImage() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return { success: false, error: 'Photo library permission required.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  return result.assets[0];
}

/**
 * Add text watermark to PDF.
 */
export async function addTextWatermark(pdfUri, text, options = {}) {
  try {
    if (Platform.OS === 'ios' && NativePdfTools) {
      const result = await NativePdfTools.addWatermark(
        pdfUri,
        text,
        null, // no image
        {
          opacity: options.opacity ?? 0.3,
          rotation: options.rotation ?? 45,
          fontSize: options.fontSize ?? 48,
          color: options.color ?? '#808080',
          pages: options.pages, // null = all pages
          position: options.position ?? 'center'
        }
      );

      if (result.success && result.uri) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Watermarked PDF',
          });
        }
        return {
          success: true,
          outputUri: result.uri,
          message: `Added text watermark to ${result.pageCount} pages.`,
        };
      }
    }

    return { success: false, error: 'Text watermark requires native PDF tools on iOS.' };
  } catch (error) {
    console.error('[Watermark] Add text error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add image watermark to PDF.
 */
export async function addImageWatermark(pdfUri, imageUri, options = {}) {
  try {
    if (Platform.OS === 'ios' && NativePdfTools) {
      const result = await NativePdfTools.addWatermark(
        pdfUri,
        null, // no text
        imageUri,
        {
          opacity: options.opacity ?? 0.3,
          rotation: options.rotation ?? 45,
          pages: options.pages,
          position: options.position ?? 'center'
        }
      );

      if (result.success && result.uri) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Watermarked PDF',
          });
        }
        return {
          success: true,
          outputUri: result.uri,
          message: `Added image watermark to ${result.pageCount} pages.`,
        };
      }
    }

    return { success: false, error: 'Image watermark requires native PDF tools on iOS.' };
  } catch (error) {
    console.error('[Watermark] Add image error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove watermark from PDF (re-renders pages).
 */
export async function removeWatermarkFromPdf(pdfUri, options = {}) {
  try {
    if (Platform.OS === 'ios' && NativePdfTools) {
      const result = await NativePdfTools.removeWatermark(
        pdfUri,
        options.pages // null = all pages
      );
      if (result.success && result.uri) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Cleaned PDF',
          });
        }
        return {
          success: true,
          outputUri: result.uri,
          message: `Re-rendered ${result.pagesProcessed} pages to remove watermark overlay.`,
        };
      }
    }

    return { success: false, error: 'Watermark removal requires native PDF tools on iOS.' };
  } catch (error) {
    console.error('[Watermark] Remove error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Full watermark add flow.
 */
export async function addWatermarkInteractive(type = 'text') {
  try {
    const pdf = await pickPdf();
    if (!pdf) return { success: false, error: 'Cancelled.' };

    if (type === 'image') {
      const image = await pickImage();
      if (!image) return { success: false, error: 'No image selected.' };
      return await addImageWatermark(pdf.uri, image.uri, { opacity: 0.2, rotation: 0 });
    } else {
      // Text watermark - would need UI for text input
      // For now, return a prompt for the caller to handle
      return { success: false, needsInput: true, type: 'text', pdfUri: pdf.uri };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Full watermark remove flow.
 */
export async function removeWatermarkInteractive(options = {}) {
  try {
    const pdf = await pickPdf();
    if (!pdf) return { success: false, error: 'Cancelled.' };
    return await removeWatermarkFromPdf(pdf.uri, options);
  } catch (error) {
    return { success: false, error: error.message };
  }
}
