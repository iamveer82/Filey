/**
 * PdfGenerator — native iOS PDF generation using UIGraphicsPDFRenderer.
 * Generates multi-page A4 PDFs from images — no server needed.
 */
import { NativeModules } from 'react-native';

const { PdfGenerator: Native } = NativeModules;

/**
 * Generate a PDF from image URIs.
 * @param {string[]} imageUris - Array of file:// image URIs
 * @param {string} filename - Output filename
 * @returns {Promise<{ uri: string, pageCount: number, success: boolean }>}
 */
export async function generatePdf(imageUris, filename = `Scan-${Date.now()}.pdf`) {
  return Native.generatePdf(imageUris, filename);
}

/**
 * Generate PDF with auto-generated filename.
 * @param {string[]} imageUris
 * @returns {Promise<{ uri: string, pageCount: number, success: boolean }>}
 */
export async function generatePdfFromImages(imageUris) {
  return Native.generatePdfFromImages(imageUris);
}
