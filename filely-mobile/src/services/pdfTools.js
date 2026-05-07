/**
 * PdfTools — Native iOS PDF operations via PDFKit.
 * 67+ tools across 6 categories. All on-device, zero cloud.
 *
 *   Organize & Manage — merge, split, extract, delete, rotate, reorder,
 *     reverse, crop, n-up, divide, combine, alternate merge
 *   Edit & Annotate — watermark, sign, stamp, page numbers, header/footer,
 *     bookmarks, forms, annotations, background, invert, blank removal
 *   Convert — PDF↔images, extract text/images/tables, grayscale,
 *     text→PDF, markdown, JSON
 *   Secure — encrypt, decrypt, permissions, sanitize, flatten, redact
 *   Optimize & Repair — compress, fix size, repair, rasterize,
 *     linearize, font→outline, remove restrictions
 */
import { NativeModules, Platform } from 'react-native';

const Native = Platform.OS === 'ios' ? NativeModules.PdfTools : null;

const guard = (fn) => (...args) => {
  if (!Native) return Promise.reject(new Error('PdfTools only available on iOS native builds'));
  return fn(...args);
};

// ─── Organize & Manage ──────────────────────────────────────────────

export const mergePdfs = guard((pdfUris, filename = `Merged-${Date.now()}.pdf`) =>
  Native.mergePdfs(pdfUris, filename));

export const splitPdf = guard((pdfUri, ranges, filename = 'split') =>
  Native.splitPdf(pdfUri, ranges, filename));

export const extractPages = guard((pdfUri, pages) =>
  Native.extractPages(pdfUri, pages));

export const deletePages = guard((pdfUri, pages) =>
  Native.deletePages(pdfUri, pages));

export const rotatePdf = guard((pdfUri, degrees, pages = null) =>
  Native.rotatePdf(pdfUri, degrees, pages));

export const reversePages = guard((pdfUri) =>
  Native.reversePages(pdfUri));

export const reorderPages = guard((pdfUri, order) =>
  Native.reorderPages(pdfUri, order));

export const addBlankPage = guard((pdfUri, position, count = 1) =>
  Native.addBlankPage(pdfUri, position, count));

export const cropPdf = guard((pdfUri, cropBox) =>
  Native.cropPdf(pdfUri, cropBox));

export const nUpPdf = guard((pdfUri, rows, cols) =>
  Native.nUpPdf(pdfUri, rows, cols));

export const alternateMerge = guard((pdfUris) =>
  Native.alternateMerge(pdfUris));

export const dividePages = guard((pdfUri, rows, cols) =>
  Native.dividePages(pdfUri, rows, cols));

export const combineSinglePage = guard((pdfUri) =>
  Native.combineSinglePage(pdfUri));

export const getPageCount = guard((pdfUri) =>
  Native.getPageCount(pdfUri));

export const getPageDimensions = guard((pdfUri) =>
  Native.getPageDimensions(pdfUri));

export const viewMetadata = guard((pdfUri) =>
  Native.viewMetadata(pdfUri));

export const editMetadata = guard((pdfUri, metadata) =>
  Native.editMetadata(pdfUri, metadata));

export const removeMetadata = guard((pdfUri) =>
  Native.removeMetadata(pdfUri));

export const pdfToZip = guard((pdfUri) =>
  Native.pdfToZip(pdfUri));

export const comparePdfs = guard((pdfUri1, pdfUri2) =>
  Native.comparePdfs(pdfUri1, pdfUri2));

export const pdfBooklet = guard((pdfUri) =>
  Native.pdfBooklet(pdfUri));

export const posterizePdf = guard((pdfUri, rows, cols) =>
  Native.posterizePdf(pdfUri, rows, cols));

export const gridCombine = guard((imageUris, rows, cols) =>
  Native.gridCombine(imageUris, rows, cols));

// ─── Edit & Annotate ────────────────────────────────────────────────

export const embedSignature = guard((pdfUri, signatureUri, pageNumber, x, y, width, height) =>
  Native.embedSignature(pdfUri, signatureUri, pageNumber, x, y, width, height));

export const addWatermark = guard((pdfUri, text = null, imageUri = null, options = {}) =>
  Native.addWatermark(pdfUri, text, imageUri, options));

export const removeWatermark = guard((pdfUri, pages = null) =>
  Native.removeWatermark(pdfUri, pages));

export const addPageNumbers = guard((pdfUri, options = {}) =>
  Native.addPageNumbers(pdfUri, options));

export const addHeaderFooter = guard((pdfUri, header = null, footer = null, options = {}) =>
  Native.addHeaderFooter(pdfUri, header, footer, options));

export const addStamp = guard((pdfUri, imageUri, pageNumber, x, y, width, height, opacity = 1.0) =>
  Native.addStamp(pdfUri, imageUri, pageNumber, x, y, width, height, opacity));

export const removeAnnotations = guard((pdfUri) =>
  Native.removeAnnotations(pdfUri));

export const setBackgroundColor = guard((pdfUri, colorHex) =>
  Native.setBackgroundColor(pdfUri, colorHex));

export const invertColors = guard((pdfUri) =>
  Native.invertColors(pdfUri));

export const removeBlankPages = guard((pdfUri) =>
  Native.removeBlankPages(pdfUri));

export const fillFormField = guard((pdfUri, pageNumber, fieldName, value) =>
  Native.fillFormField(pdfUri, pageNumber, fieldName, value));

export const createFormField = guard((pdfUri, pageNumber, fieldName, fieldType, x, y, width, height) =>
  Native.createFormField(pdfUri, pageNumber, fieldName, fieldType, x, y, width, height));

export const removeFormFields = guard((pdfUri) =>
  Native.removeFormFields(pdfUri));

export const addBookmarks = guard((pdfUri, bookmarks) =>
  Native.addBookmarks(pdfUri, bookmarks));

// ─── Convert ───────────────────────────────────────────────────────

export const pdfToImages = guard((pdfUri, format = 'jpg', dpi = 150, pages = null) =>
  Native.pdfToImages(pdfUri, format, dpi, pages));

export const extractImages = guard((pdfUri) =>
  Native.extractImages(pdfUri));

export const extractText = guard((pdfUri, pages = null) =>
  Native.extractText(pdfUri, pages));

export const pdfToGrayscale = guard((pdfUri) =>
  Native.pdfToGrayscale(pdfUri));

export const pdfToJson = guard((pdfUri) =>
  Native.pdfToJson(pdfUri));

export const pdfToMarkdown = guard((pdfUri) =>
  Native.pdfToMarkdown(pdfUri));

export const extractTables = guard((pdfUri) =>
  Native.extractTables(pdfUri));

export const textToPdf = guard((text, options = {}) =>
  Native.textToPdf(text, options));

// ─── Secure ────────────────────────────────────────────────────────

export const protectPdf = guard((pdfUri, password, filename = 'protected', permissions = null) =>
  Native.protectPdf(pdfUri, password, password, filename, permissions || {}));

export const encryptPdf = protectPdf; // alias

export const decryptPdf = guard((pdfUri, password) =>
  Native.decryptPdf(pdfUri, password));

export const sanitizePdf = guard((pdfUri) =>
  Native.sanitizePdf(pdfUri));

export const flattenPdf = guard((pdfUri) =>
  Native.flattenPdf(pdfUri));

export const changePermissions = guard((pdfUri, permissions) =>
  Native.changePermissions(pdfUri, permissions));

export const findAndRedact = guard((pdfUri, searchText, replaceText = null) =>
  Native.findAndRedact(pdfUri, searchText, replaceText));

// ─── Optimize & Repair ─────────────────────────────────────────────

export const compressPdf = guard((pdfUri, quality = 'medium') =>
  Native.compressPdf(pdfUri, quality, 0));

export const fixPageSize = guard((pdfUri, width, height) =>
  Native.fixPageSize(pdfUri, width, height));

export const removeRestrictions = guard((pdfUri) =>
  Native.removeRestrictions(pdfUri));

export const repairPdf = guard((pdfUri) =>
  Native.repairPdf(pdfUri));

export const rasterizePdf = guard((pdfUri, dpi = 150) =>
  Native.rasterizePdf(pdfUri, dpi));

export const linearizePdf = guard((pdfUri) =>
  Native.linearizePdf(pdfUri));

export const fontToOutline = guard((pdfUri) =>
  Native.fontToOutline(pdfUri));

// ─── Attachments ───────────────────────────────────────────────────

export const addAttachment = guard((pdfUri, attachmentUri, name) =>
  Native.addAttachment(pdfUri, attachmentUri, name));

export const extractAttachments = guard((pdfUri) =>
  Native.extractAttachments(pdfUri));

// ─── Extended converters (Office, image formats, OCR, etc.) ────────

export const imagesToPdf = guard((imageUris, options = {}) =>
  Native.imagesToPdf(imageUris, options));

export const officeDocToPdf = guard((docUri, format) =>
  Native.officeDocToPdf(docUri, format));

export const htmlToPdf = guard((html, baseUrl = null) =>
  Native.htmlToPdf(html, baseUrl));

export const svgToPdf = guard((svgUri) =>
  Native.svgToPdf(svgUri));

export const pdfToImageFormatEx = guard((pdfUri, format = 'jpg', dpi = 150, pages = null) =>
  Native.pdfToImageFormatEx(pdfUri, format, dpi, pages));

export const pdfToDocx = guard((pdfUri) =>
  Native.pdfToDocx(pdfUri));

export const pdfToRtf = guard((pdfUri) =>
  Native.pdfToRtf(pdfUri));

export const pdfToCsv = guard((pdfUri) =>
  Native.pdfToCsv(pdfUri));

export const pdfToSvg = guard((pdfUri, page = 1) =>
  Native.pdfToSvg(pdfUri, page));

export const ocrPdf = guard((pdfUri, languages = ['en-US']) =>
  Native.ocrPdf(pdfUri, languages));

export const deskewPdf = guard((pdfUri) =>
  Native.deskewPdf(pdfUri));

export const pdfToPdfA = guard((pdfUri) =>
  Native.pdfToPdfA(pdfUri));

export const getOcgList = guard((pdfUri) =>
  Native.getOcgList(pdfUri));

export const validateSignature = guard((pdfUri) =>
  Native.validateSignature(pdfUri));

export const changeTextColor = guard((pdfUri, colorHex) =>
  Native.changeTextColor(pdfUri, colorHex));

export const extractEmbeddedImages = guard((pdfUri) =>
  Native.extractEmbeddedImages(pdfUri));

// ─── Archive-backed converters (ZIP-based formats) ─────────────────

export const cbzToPdf = guard((cbzUri) =>
  Native.cbzToPdf(cbzUri));

export const epubToPdf = guard((epubUri) =>
  Native.epubToPdf(epubUri));

export const xlsxToPdf = guard((xlsxUri) =>
  Native.xlsxToPdf(xlsxUri));

export const pptxToPdf = guard((pptxUri) =>
  Native.pptxToPdf(pptxUri));

export const fb2ToPdf = guard((fb2Uri) =>
  Native.fb2ToPdf(fb2Uri));

export const quickLookToPdf = guard((fileUri) =>
  Native.quickLookToPdf(fileUri));

// ─── PencilKit ink overlay ─────────────────────────────────────────

export const applyInkToPage = guard((pdfUri, pageNumber, inkPngUri, opacity = 1.0) =>
  Native.applyInkToPage(pdfUri, pageNumber, inkPngUri, opacity));

export const applyInkToPagesBatch = guard((pdfUri, pages) =>
  Native.applyInkToPagesBatch(pdfUri, pages));

export const renderPageToImage = guard((pdfUri, page, dpi = 200) =>
  Native.renderPageToImage(pdfUri, page, dpi));

export const signaturePngToPdf = guard((pngUri) =>
  Native.signaturePngToPdf(pngUri));

// ─── Progress Events ───────────────────────────────────────────────

export function onProgress(callback) {
  if (!Native) return { remove: () => {} };
  // Native EventEmitter-based subscription pattern
  const emitter = Native;
  // PdfTools extends RCTEventEmitter — use NativeEventEmitter if needed
  return { remove: () => {} };
}

// ─── Re-export for convenience ─────────────────────────────────────

export default {
  mergePdfs, splitPdf, extractPages, deletePages, rotatePdf,
  reversePages, reorderPages, addBlankPage, cropPdf, nUpPdf,
  alternateMerge, dividePages, combineSinglePage, getPageCount,
  getPageDimensions, viewMetadata, editMetadata, removeMetadata,
  pdfToZip, comparePdfs, pdfBooklet, posterizePdf, gridCombine,
  embedSignature, addWatermark, removeWatermark, addPageNumbers,
  addHeaderFooter, addStamp, removeAnnotations, setBackgroundColor,
  invertColors, removeBlankPages, fillFormField, createFormField,
  removeFormFields, addBookmarks,
  pdfToImages, extractImages, extractText, pdfToGrayscale,
  pdfToJson, pdfToMarkdown, extractTables, textToPdf,
  protectPdf, encryptPdf, decryptPdf, sanitizePdf, flattenPdf,
  changePermissions, findAndRedact,
  compressPdf, fixPageSize, removeRestrictions, repairPdf,
  rasterizePdf, linearizePdf, fontToOutline,
  addAttachment, extractAttachments,
  imagesToPdf, officeDocToPdf, htmlToPdf, svgToPdf,
  pdfToImageFormatEx, pdfToDocx, pdfToRtf, pdfToCsv, pdfToSvg,
  ocrPdf, deskewPdf, pdfToPdfA, getOcgList, validateSignature,
  changeTextColor, extractEmbeddedImages,
  cbzToPdf, epubToPdf, xlsxToPdf, pptxToPdf, fb2ToPdf, quickLookToPdf,
  applyInkToPage, applyInkToPagesBatch, renderPageToImage, signaturePngToPdf,
};
