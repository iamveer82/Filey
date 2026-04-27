/**
 * PdfTools — Native iOS PDF operations via PDFKit.
 * merge, split, protect, compress, watermark-remove — all on-device.
 */
import { NativeModules } from 'react-native';

const { PdfTools: Native } = NativeModules;

/**
 * Merge multiple PDFs into one.
 * @param {string[]} pdfUris
 * @param {string} filename
 * @returns {Promise<{ uri, pageCount, sourceCount, success }>}
 */
export async function mergePdfs(pdfUris, filename = `Merged-${Date.now()}.pdf`) {
  return Native.mergePdfs(pdfUris, filename);
}

/**
 * Split PDF into parts by page range.
 * @param {string} pdfUri
 * @param {Array<{start: number, end: number}>} ranges
 * @param {string} filename
 * @returns {Promise<{ files: [{uri, range, pageCount}], totalParts, success }>}
 */
export async function splitPdf(pdfUri, ranges, filename = 'split') {
  return Native.splitPdf(pdfUri, ranges, filename);
}

/**
 * Apply password protection to PDF.
 * @param {string} pdfUri
 * @param {string} password
 * @param {string} filename
 * @param {{printing?:boolean,copying?:boolean,modifying?:boolean,annotating?:boolean}} permissions
 * @returns {Promise<{ uri, protectionInfo, success }>}
 */
export async function protectPdf(pdfUri, password, filename = 'protected', permissions = null) {
  if (permissions) {
    return Native.protectPdf(pdfUri, password, password, filename, permissions);
  }
  return Native.protectPdf(pdfUri, password, filename);
}

/**
 * Compress PDF (lossy/lossless options).
 * @param {string} pdfUri
 * @param {'low'|'medium'|'high'} quality
 * @returns {Promise<{ uri, originalSizeKB, compressedSizeKB, success }>}
 */
export async function compressPdf(pdfUri, quality = 'medium') {
  return Native.compressPdf(pdfUri, quality);
}

/**
 * Get PDF page count without loading full document.
 * @param {string} pdfUri
 * @returns {Promise<{ pageCount, success }>}
 */
export async function getPageCount(pdfUri) {
  return Native.getPageCount(pdfUri);
}

/**
 * Remove watermark from PDF pages.
 * @param {string} pdfUri
 * @returns {Promise<{ uri, pageCount, success }>}
 */
export async function removeWatermark(pdfUri) {
  return Native.removeWatermark(pdfUri);
}
