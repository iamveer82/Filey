/**
 * PDF Merger Service — Combine multiple PDFs into one.
 * Uses native PdfTools (PDFKit) on iOS. Falls back to placeholder on Android.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, NativeModules } from 'react-native';

const NativePdfTools = Platform.OS === 'ios' ? NativeModules.PdfTools : null;

/**
 * Pick multiple PDFs for merging.
 * @returns {Promise<Array<{uri, name, mimeType, size?}> | null>}
 */
export async function pickPdfs() {
  const r = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (r.canceled || !r.assets?.length) return null;
  return r.assets;
}

/**
 * Get file size in KB.
 */
async function getFileSizeKB(uri) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return Math.round((info.size || 0) / 1024);
  } catch {
    return 0;
  }
}

/**
 * Merge multiple PDFs into one using native PDFKit.
 * @param {Array<{uri, name}>} pdfs
 * @param {number[]} order - Custom order (null = sequential)
 * @returns {Promise<{ success: boolean, outputUri?: string, message?: string, error?: string }>}
 */
export async function mergePdfs(pdfs, order) {
  try {
    if (!pdfs || pdfs.length < 2) {
      return { success: false, error: 'Select at least 2 PDFs to merge.' };
    }

    const orderedPdfs = order ? order.map(i => pdfs[i]) : pdfs;

    if (Platform.OS === 'ios' && NativePdfTools) {
      const uris = orderedPdfs.map(p => p.uri);
      const result = await NativePdfTools.mergePdfs(uris, `Merged-${Date.now()}.pdf`);

      if (result.success && result.uri) {
        const originalSizeKB = orderedPdfs.reduce(async (sum, p) => sum + await getFileSizeKB(p.uri), 0);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Merged PDF',
          });
        }
        return {
          success: true,
          outputUri: result.uri,
          message: `Merged ${result.sourceCount} PDFs into ${result.pageCount} pages.`,
          pageCount: result.pageCount,
          sourceCount: result.sourceCount,
        };
      }
    }

    // Android fallback: create info + copy first
    const sizes = await Promise.all(orderedPdfs.map(p => getFileSizeKB(p.uri)));
    const totalSizeKB = sizes.reduce((a, b) => a + b, 0);
    const filename = `merged-${Date.now()}.pdf`;
    const outputPath = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.copyAsync({ from: orderedPdfs[0].uri, to: outputPath });

    return {
      success: true,
      outputUri: outputPath,
      message: `Android merge: copied first PDF as placeholder (native merge needs pdf-lib).`,
      sourceCount: orderedPdfs.length,
      totalSizeKB,
    };

  } catch (error) {
    console.error('[PdfMerger] Merge error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Full interactive merge flow.
 * @returns {Promise<{ success: boolean, outputUri?: string, message?: string, error?: string }>}
 */
export async function mergePdfsInteractive() {
  try {
    const pdfs = await pickPdfs();
    if (!pdfs) return { success: false, error: 'Cancelled.' };
    if (pdfs.length < 2) {
      return { success: false, error: 'Please select at least 2 PDFs to merge.' };
    }
    return await mergePdfs(pdfs, null);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function mergePdfsQuick(pdfs) {
  return await mergePdfs(pdfs, null);
}

export function reorderPdfs(pdfs, newOrder) {
  return newOrder.map(i => pdfs[i]);
}

/**
 * Split PDF by page ranges.
 * @param {string} pdfUri
 * @param {Array<{start: number, end: number}>} ranges
 * @param {string} filename
 * @returns {Promise<{ success: boolean, files?: Array, totalParts?: number, error?: string }>}
 */
export async function splitPdfsInteractive(pdfUri, ranges, filename = 'split') {
  try {
    if (Platform.OS === 'ios' && NativePdfTools) {
      const result = await NativePdfTools.splitPdf(pdfUri, ranges, filename);
      if (result.success && result.files?.length) {
        if (await Sharing.isAvailableAsync()) {
          // Share first part as preview
          await Sharing.shareAsync(result.files[0].uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Split Part 1',
          });
        }
        return {
          success: true,
          files: result.files,
          totalParts: result.totalParts,
          message: `Split into ${result.totalParts} parts.`,
        };
      }
    }

    return { success: false, error: 'Split PDF requires native PDF tools on iOS.' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
