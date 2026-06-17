/**
 * PDF Tool Executor — every tool ID dispatches to a native iOS implementation.
 * No web/WASM fallbacks. All ops run on-device via PDFKit / CoreGraphics /
 * Vision / WebKit / ImageIO / NSAttributedString.
 */
import { Platform, NativeModules } from 'react-native';
import * as PdfTools from './pdfTools';

const VisionOcr = Platform.OS === 'ios' ? NativeModules.RNVisionOcr : null;

/**
 * Tool input contract — every tool ID maps to:
 *   { input: 'pdf' | 'pdfs' | 'image' | 'images' | 'svg' | 'office' | 'html' | 'text' | 'none',
 *     output: 'pdf' | 'image' | 'images' | 'text' | 'json' | 'csv' | 'svg' | 'docx' | 'rtf' | 'meta',
 *     params?: { ... } } — surfaced to RunToolScreen for picker config + param sheet
 */
export const TOOL_SCHEMA = {
  // Organize & Manage
  'merge-pdf':           { input: 'pdfs',   output: 'pdf',   minFiles: 2 },
  'split-pdf':           { input: 'pdf',    output: 'pdf',   params: ['ranges'] },
  'extract-pages':       { input: 'pdf',    output: 'pdf',   params: ['pages'] },
  'organize-pdf':        { input: 'pdf',    output: 'pdf',   params: ['order'] },
  'delete-pages':        { input: 'pdf',    output: 'pdf',   params: ['pages'] },
  'rotate-pdf':          { input: 'pdf',    output: 'pdf',   params: ['degrees'] },
  'rotate-custom':       { input: 'pdf',    output: 'pdf',   params: ['degrees', 'pages'] },
  'reverse-pages':       { input: 'pdf',    output: 'pdf' },
  'add-blank-page':      { input: 'pdf',    output: 'pdf',   params: ['position', 'count'] },
  'divide-pages':        { input: 'pdf',    output: 'pdf',   params: ['rows', 'cols'] },
  'n-up-pdf':            { input: 'pdf',    output: 'pdf',   params: ['rows', 'cols'] },
  'combine-single-page': { input: 'pdf',    output: 'pdf' },
  'alternate-merge':     { input: 'pdfs',   output: 'pdf',   minFiles: 2 },
  'ocr-pdf':             { input: 'pdf',    output: 'pdf',   params: ['languages'] },
  'add-attachments':     { input: 'pdf',    output: 'pdf',   params: ['attachmentUri', 'name'] },
  'extract-attachments': { input: 'pdf',    output: 'meta' },
  'edit-attachments':    { input: 'pdf',    output: 'pdf',   params: ['attachmentUri', 'name'] },
  'view-metadata':       { input: 'pdf',    output: 'meta' },
  'edit-metadata':       { input: 'pdf',    output: 'pdf',   params: ['metadata'] },
  'pdf-to-zip':          { input: 'pdf',    output: 'meta' },
  'compare-pdfs':        { input: 'pdfs',   output: 'meta',  minFiles: 2, maxFiles: 2 },
  'posterize-pdf':       { input: 'pdf',    output: 'pdf',   params: ['rows', 'cols'] },
  'pdf-booklet':         { input: 'pdf',    output: 'pdf' },
  'grid-combine':        { input: 'images', output: 'pdf',   params: ['rows', 'cols'] },
  'pdf-multi-tool':      { input: 'pdf',    output: 'meta' },

  // Edit & Annotate
  'edit-pdf':            { input: 'pdf',    output: 'meta' },
  'sign-pdf':            { input: 'pdf',    output: 'pdf',   params: ['signatureUri', 'pageNumber', 'position'] },
  'crop-pdf':            { input: 'pdf',    output: 'pdf',   params: ['cropBox'] },
  'bookmark':            { input: 'pdf',    output: 'pdf',   params: ['bookmarks'] },
  'table-of-contents':   { input: 'pdf',    output: 'pdf',   params: ['bookmarks'] },
  'page-numbers':        { input: 'pdf',    output: 'pdf',   params: ['position', 'fontSize'] },
  'add-watermark':       { input: 'pdf',    output: 'pdf',   params: ['text', 'imageUri', 'opacity'] },
  'header-footer':       { input: 'pdf',    output: 'pdf',   params: ['header', 'footer'] },
  'invert-colors':       { input: 'pdf',    output: 'pdf' },
  'background-color':    { input: 'pdf',    output: 'pdf',   params: ['colorHex'] },
  'text-color':          { input: 'pdf',    output: 'pdf',   params: ['colorHex'] },
  'add-stamps':          { input: 'pdf',    output: 'pdf',   params: ['imageUri', 'pageNumber', 'position', 'opacity'] },
  'remove-annotations':  { input: 'pdf',    output: 'pdf' },
  'form-filler':         { input: 'pdf',    output: 'pdf',   params: ['pageNumber', 'fieldName', 'value'] },
  'form-creator':        { input: 'pdf',    output: 'pdf',   params: ['pageNumber', 'fieldName', 'fieldType', 'position'] },
  'remove-blank-pages':  { input: 'pdf',    output: 'pdf' },
  'pdf-reader':          { input: 'pdf',    output: 'meta' },

  // Convert TO PDF (image inputs use UIImage — supports JPG/PNG/HEIC/WebP/BMP/TIFF/GIF natively)
  'image-to-pdf':        { input: 'images', output: 'pdf' },
  'jpg-to-pdf':          { input: 'images', output: 'pdf',   accept: ['image/jpeg'] },
  'png-to-pdf':          { input: 'images', output: 'pdf',   accept: ['image/png'] },
  'webp-to-pdf':         { input: 'images', output: 'pdf',   accept: ['image/webp'] },
  'bmp-to-pdf':          { input: 'images', output: 'pdf',   accept: ['image/bmp'] },
  'heic-to-pdf':         { input: 'images', output: 'pdf',   accept: ['image/heic', 'image/heif'] },
  'tiff-to-pdf':         { input: 'images', output: 'pdf',   accept: ['image/tiff'] },
  'svg-to-pdf':          { input: 'svg',    output: 'pdf',   accept: ['image/svg+xml'] },
  'txt-to-pdf':          { input: 'text',   output: 'pdf' },
  'json-to-pdf':         { input: 'text',   output: 'pdf' },
  'markdown-to-pdf':     { input: 'text',   output: 'pdf' },
  'word-to-pdf':         { input: 'office', output: 'pdf',   accept: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'] },
  'rtf-to-pdf':          { input: 'office', output: 'pdf',   accept: ['text/rtf', 'application/rtf'] },
  'html-to-pdf':         { input: 'html',   output: 'pdf',   accept: ['text/html'] },
  'email-to-pdf':        { input: 'text',   output: 'pdf' },
  // OOXML formats — parsed natively via ZIPFoundation
  'excel-to-pdf':        { input: 'office', output: 'pdf', accept: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]},
  'pptx-to-pdf':         { input: 'office', output: 'pdf', accept: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint'
  ]},
  'epub-to-pdf':         { input: 'office', output: 'pdf', accept: ['application/epub+zip'] },
  'fb2-to-pdf':          { input: 'office', output: 'pdf', accept: ['application/x-fictionbook+xml', 'text/xml'] },
  'cbz-to-pdf':          { input: 'office', output: 'pdf', accept: ['application/vnd.comicbook+zip', 'application/zip'] },
  'psd-to-pdf':          { input: 'office', output: 'pdf', accept: ['image/vnd.adobe.photoshop'] },
  // Niche binary formats with no Apple-native parser; surfaced as unsupported in UI
  'xps-to-pdf':          { input: 'office', output: 'pdf', unsupported: true,
                           reason: 'XPS has no iOS parser — convert via Microsoft Print to PDF first.' },
  'mobi-to-pdf':         { input: 'office', output: 'pdf', unsupported: true,
                           reason: 'MOBI requires libmobi — not bundled. Convert to EPUB on desktop first.' },
  'djvu-to-pdf':         { input: 'office', output: 'pdf', unsupported: true,
                           reason: 'DJVU has no Apple-native parser. Convert on desktop first.' },

  // Convert FROM PDF
  'pdf-to-jpg':          { input: 'pdf', output: 'images', params: ['dpi'] },
  'pdf-to-png':          { input: 'pdf', output: 'images', params: ['dpi'] },
  'pdf-to-webp':         { input: 'pdf', output: 'images', params: ['dpi'] },
  'pdf-to-bmp':          { input: 'pdf', output: 'images', params: ['dpi'] },
  'pdf-to-tiff':         { input: 'pdf', output: 'images', params: ['dpi'] },
  'pdf-to-svg':          { input: 'pdf', output: 'svg',    params: ['page'] },
  'pdf-to-greyscale':    { input: 'pdf', output: 'pdf' },
  'pdf-to-json':         { input: 'pdf', output: 'json' },
  'pdf-to-docx':         { input: 'pdf', output: 'docx' },
  'pdf-to-pptx':         { input: 'pdf', output: 'docx' }, // approximation via DOCX
  'pdf-to-excel':        { input: 'pdf', output: 'csv' },
  'pdf-to-markdown':     { input: 'pdf', output: 'text' },
  'extract-images':      { input: 'pdf', output: 'images' },
  'extract-tables':      { input: 'pdf', output: 'meta' },
  'rasterize-pdf':       { input: 'pdf', output: 'pdf', params: ['dpi'] },

  // Optimize & Repair
  'compress-pdf':        { input: 'pdf', output: 'pdf', params: ['quality'] },
  'fix-page-size':       { input: 'pdf', output: 'pdf', params: ['width', 'height'] },
  'linearize-pdf':       { input: 'pdf', output: 'pdf' },
  'page-dimensions':     { input: 'pdf', output: 'meta' },
  'remove-restrictions': { input: 'pdf', output: 'pdf' },
  'repair-pdf':          { input: 'pdf', output: 'pdf' },
  'deskew-pdf':          { input: 'pdf', output: 'pdf' },
  'pdf-to-pdfa':         { input: 'pdf', output: 'pdf' },
  'font-to-outline':     { input: 'pdf', output: 'pdf' },
  'ocg-manager':         { input: 'pdf', output: 'meta' },

  // Secure PDF
  'encrypt-pdf':         { input: 'pdf', output: 'pdf', params: ['password', 'permissions'] },
  'decrypt-pdf':         { input: 'pdf', output: 'pdf', params: ['password'] },
  'sanitize-pdf':        { input: 'pdf', output: 'pdf' },
  'find-and-redact':     { input: 'pdf', output: 'pdf', params: ['searchText'] },
  'flatten-pdf':         { input: 'pdf', output: 'pdf' },
  'remove-metadata':     { input: 'pdf', output: 'pdf' },
  'change-permissions':  { input: 'pdf', output: 'pdf', params: ['permissions'] },
  'digital-sign-pdf':    { input: 'pdf', output: 'pdf', params: ['signatureUri', 'pageNumber'] },
  'validate-signature':  { input: 'pdf', output: 'meta' },
};

export function getToolSchema(toolId) {
  return TOOL_SCHEMA[toolId] || null;
}

export function isToolUnsupported(toolId) {
  return Boolean(TOOL_SCHEMA[toolId]?.unsupported);
}

export function getUnsupportedReason(toolId) {
  return TOOL_SCHEMA[toolId]?.reason || 'Not supported on iOS.';
}

export const UNSUPPORTED_TOOL_IDS = Object.entries(TOOL_SCHEMA)
  .filter(([, s]) => s.unsupported)
  .map(([id]) => id);

export async function executeTool(toolId, params = {}) {
  const fn = TOOL_DISPATCH[toolId];
  if (!fn) return { success: false, error: `Unknown tool: ${toolId}` };
  try {
    return await fn(params);
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

export function getToolFn(toolId) {
  return TOOL_DISPATCH[toolId] || null;
}

export function isNativeAvailable() {
  return Platform.OS === 'ios';
}

// ── Helpers ─────────────────────────────────────────────────────────────

const fitImagesToPdf = (p, opts = {}) => {
  const uris = p.imageUris || (p.imageUri ? [p.imageUri] : []);
  return PdfTools.imagesToPdf(uris, { pageMode: 'fit', ...opts });
};

const officeViaAttr = (p, format) => PdfTools.officeDocToPdf(p.fileUri || p.docUri, format);

const TOOL_DISPATCH = {
  // ── Organize & Manage ────────────────────────────────────────────
  'merge-pdf':           (p) => PdfTools.mergePdfs(p.pdfUris, p.filename),
  'split-pdf':           (p) => PdfTools.splitPdf(p.pdfUri, p.ranges || [{ start: 1, end: 1 }], p.filename || 'split'),
  'extract-pages':       (p) => PdfTools.extractPages(p.pdfUri, p.pages || [1]),
  'organize-pdf':        (p) => PdfTools.reorderPages(p.pdfUri, p.order || [1]),
  'delete-pages':        (p) => PdfTools.deletePages(p.pdfUri, p.pages || []),
  'rotate-pdf':          (p) => PdfTools.rotatePdf(p.pdfUri, p.degrees || 90, null),
  'rotate-custom':       (p) => PdfTools.rotatePdf(p.pdfUri, p.degrees || 90, p.pages || null),
  'reverse-pages':       (p) => PdfTools.reversePages(p.pdfUri),
  'add-blank-page':      (p) => PdfTools.addBlankPage(p.pdfUri, p.position ?? 1, p.count || 1),
  'divide-pages':        (p) => PdfTools.dividePages(p.pdfUri, p.rows || 2, p.cols || 2),
  'n-up-pdf':            (p) => PdfTools.nUpPdf(p.pdfUri, p.rows || 2, p.cols || 1),
  'combine-single-page': (p) => PdfTools.combineSinglePage(p.pdfUri),
  'alternate-merge':     (p) => PdfTools.alternateMerge(p.pdfUris),
  'view-metadata':       (p) => PdfTools.viewMetadata(p.pdfUri),
  'edit-metadata':       (p) => PdfTools.editMetadata(p.pdfUri, p.metadata || {}),
  'pdf-to-zip':          (p) => PdfTools.pdfToZip(p.pdfUri),
  'compare-pdfs':        (p) => {
    const [a, b] = p.pdfUris || [p.pdfUri1, p.pdfUri2];
    return PdfTools.comparePdfs(a, b);
  },
  'posterize-pdf':       (p) => PdfTools.posterizePdf(p.pdfUri, p.rows || 2, p.cols || 2),
  'pdf-booklet':         (p) => PdfTools.pdfBooklet(p.pdfUri),
  'grid-combine':        (p) => PdfTools.gridCombine(p.imageUris || [], p.rows || 2, p.cols || 2),
  'pdf-multi-tool':      (p) => PdfTools.viewMetadata(p.pdfUri),
  'add-attachments':     (p) => PdfTools.addAttachment(p.pdfUri, p.attachmentUri, p.name || 'attachment'),
  'edit-attachments':    (p) => PdfTools.addAttachment(p.pdfUri, p.attachmentUri, p.name || 'attachment'),
  'extract-attachments': (p) => PdfTools.extractAttachments(p.pdfUri),

  // ── OCR (uses Vision native) ─────────────────────────────────────
  'ocr-pdf':             (p) => PdfTools.ocrPdf(p.pdfUri, p.languages || ['en-US']),

  // ── Edit & Annotate ──────────────────────────────────────────────
  'edit-pdf':            (p) => PdfTools.viewMetadata(p.pdfUri),
  'pdf-reader':          (p) => PdfTools.viewMetadata(p.pdfUri),
  'sign-pdf':            (p) => PdfTools.embedSignature(
                            p.pdfUri, p.signatureUri, p.pageNumber || 1,
                            p.x || 50, p.y || 50, p.width || 150, p.height || 60),
  'crop-pdf':            (p) => PdfTools.cropPdf(p.pdfUri,
                            p.cropBox || { x: 0, y: 0, width: 612, height: 792 }),
  'add-watermark':       (p) => PdfTools.addWatermark(p.pdfUri, p.text || null,
                            p.imageUri || null, p.options || { opacity: 0.3, rotation: 45 }),
  'page-numbers':        (p) => PdfTools.addPageNumbers(p.pdfUri,
                            p.options || { position: 'bottom-center', fontSize: 12 }),
  'header-footer':       (p) => PdfTools.addHeaderFooter(p.pdfUri,
                            p.header || null, p.footer || null, p.options || {}),
  'invert-colors':       (p) => PdfTools.invertColors(p.pdfUri),
  'background-color':    (p) => PdfTools.setBackgroundColor(p.pdfUri, p.colorHex || '#FFFFFF'),
  'text-color':          (p) => PdfTools.changeTextColor(p.pdfUri, p.colorHex || '#000000'),
  'add-stamps':          (p) => PdfTools.addStamp(p.pdfUri, p.imageUri,
                            p.pageNumber || 1, p.x || 50, p.y || 50,
                            p.width || 100, p.height || 100, p.opacity ?? 0.8),
  'remove-annotations':  (p) => PdfTools.removeAnnotations(p.pdfUri),
  'form-filler':         (p) => PdfTools.fillFormField(p.pdfUri, p.pageNumber || 1,
                            p.fieldName || '', p.value || ''),
  'form-creator':        (p) => PdfTools.createFormField(p.pdfUri, p.pageNumber || 1,
                            p.fieldName || 'field1', p.fieldType || 'text',
                            p.x || 50, p.y || 50, p.width || 200, p.height || 30),
  'remove-blank-pages':  (p) => PdfTools.removeBlankPages(p.pdfUri),
  'bookmark':            (p) => PdfTools.addBookmarks(p.pdfUri, p.bookmarks || []),
  'table-of-contents':   (p) => PdfTools.addBookmarks(p.pdfUri, p.bookmarks || []),

  // ── Convert TO PDF ───────────────────────────────────────────────
  // All raster image formats route through native UIImage (handles JPG/PNG/HEIC/WebP/BMP/TIFF/GIF)
  'image-to-pdf':        (p) => fitImagesToPdf(p),
  'jpg-to-pdf':          (p) => fitImagesToPdf(p),
  'png-to-pdf':          (p) => fitImagesToPdf(p),
  'webp-to-pdf':         (p) => fitImagesToPdf(p),
  'bmp-to-pdf':          (p) => fitImagesToPdf(p),
  'heic-to-pdf':         (p) => fitImagesToPdf(p),
  'tiff-to-pdf':         (p) => fitImagesToPdf(p),
  'svg-to-pdf':          (p) => PdfTools.svgToPdf(p.fileUri || p.svgUri),
  'txt-to-pdf':          (p) => PdfTools.textToPdf(p.text || '', p.options || {}),
  'json-to-pdf':         (p) => PdfTools.textToPdf(
                            typeof p.jsonData === 'string'
                              ? p.jsonData
                              : JSON.stringify(p.jsonData || {}, null, 2),
                            p.options || { fontSize: 11 }),
  'markdown-to-pdf':     (p) => PdfTools.textToPdf(p.text || '', p.options || { fontSize: 13 }),
  'email-to-pdf':        (p) => PdfTools.textToPdf(p.text || '', p.options || {}),
  'word-to-pdf':         (p) => officeViaAttr(p, 'docx'),
  'rtf-to-pdf':          (p) => officeViaAttr(p, 'rtf'),
  'html-to-pdf':         (p) => p.html
                            ? PdfTools.htmlToPdf(p.html, p.baseUrl || null)
                            : officeViaAttr(p, 'html'),
  // OOXML SpreadsheetML / PresentationML — parsed natively via ZIPFoundation
  'excel-to-pdf':        (p) => PdfTools.xlsxToPdf(p.fileUri || p.docUri),
  'pptx-to-pdf':         (p) => PdfTools.pptxToPdf(p.fileUri || p.docUri),
  // Archive-backed e-book / comic formats
  'epub-to-pdf':         (p) => PdfTools.epubToPdf(p.fileUri || p.docUri),
  'fb2-to-pdf':          (p) => PdfTools.fb2ToPdf(p.fileUri || p.docUri),
  'cbz-to-pdf':          (p) => PdfTools.cbzToPdf(p.fileUri || p.docUri),
  // PSD: route via QuickLook (Apple renders PSD)
  'psd-to-pdf':          (p) => p.fileUri || p.imageUri
                            ? PdfTools.quickLookToPdf(p.fileUri || p.imageUri)
                            : fitImagesToPdf(p),
  // Niche binary formats with no Apple-native parser available on iOS
  'mobi-to-pdf':         () => Promise.resolve({
                            success: false,
                            error: 'MOBI requires libmobi which is not bundled. Convert to EPUB first via a desktop tool.',
                          }),
  'djvu-to-pdf':         () => Promise.resolve({
                            success: false,
                            error: 'DJVU has no Apple-native parser. Convert to PDF on desktop first.',
                          }),
  'xps-to-pdf':          () => Promise.resolve({
                            success: false,
                            error: 'XPS is a Windows format with no iOS parser. Convert via Microsoft Print to PDF on desktop.',
                          }),

  // ── Convert FROM PDF ─────────────────────────────────────────────
  'pdf-to-jpg':          (p) => PdfTools.pdfToImageFormatEx(p.pdfUri, 'jpg', p.dpi || 150, p.pages),
  'pdf-to-png':          (p) => PdfTools.pdfToImageFormatEx(p.pdfUri, 'png', p.dpi || 150, p.pages),
  'pdf-to-webp':         (p) => PdfTools.pdfToImageFormatEx(p.pdfUri, 'webp', p.dpi || 150, p.pages),
  'pdf-to-bmp':          (p) => PdfTools.pdfToImageFormatEx(p.pdfUri, 'bmp', p.dpi || 150, p.pages),
  'pdf-to-tiff':         (p) => PdfTools.pdfToImageFormatEx(p.pdfUri, 'tiff', p.dpi || 150, p.pages),
  'pdf-to-svg':          (p) => PdfTools.pdfToSvg(p.pdfUri, p.page || 1),
  'pdf-to-greyscale':    (p) => PdfTools.pdfToGrayscale(p.pdfUri),
  'pdf-to-json':         (p) => PdfTools.pdfToJson(p.pdfUri),
  'pdf-to-docx':         (p) => PdfTools.pdfToDocx(p.pdfUri),
  'pdf-to-pptx':         (p) => PdfTools.pdfToDocx(p.pdfUri), // fallback to DOCX
  'pdf-to-excel':        (p) => PdfTools.pdfToCsv(p.pdfUri),
  'pdf-to-markdown':     (p) => PdfTools.pdfToMarkdown(p.pdfUri),
  'extract-images':      (p) => PdfTools.extractImages(p.pdfUri),
  'extract-tables':      (p) => PdfTools.extractTables(p.pdfUri),
  'rasterize-pdf':       (p) => PdfTools.rasterizePdf(p.pdfUri, p.dpi || 150),

  // ── Optimize & Repair ────────────────────────────────────────────
  'compress-pdf':        (p) => PdfTools.compressPdf(p.pdfUri, p.quality || 'medium'),
  'fix-page-size':       (p) => PdfTools.fixPageSize(p.pdfUri, p.width || 612, p.height || 792),
  'linearize-pdf':       (p) => PdfTools.linearizePdf(p.pdfUri),
  'page-dimensions':     (p) => PdfTools.getPageDimensions(p.pdfUri),
  'remove-restrictions': (p) => PdfTools.removeRestrictions(p.pdfUri),
  'repair-pdf':          (p) => PdfTools.repairPdf(p.pdfUri),
  'deskew-pdf':          (p) => PdfTools.deskewPdf(p.pdfUri),
  'pdf-to-pdfa':         (p) => PdfTools.pdfToPdfA(p.pdfUri),
  'font-to-outline':     (p) => PdfTools.fontToOutline(p.pdfUri),
  'ocg-manager':         (p) => PdfTools.getOcgList(p.pdfUri),

  // ── Secure PDF ───────────────────────────────────────────────────
  'encrypt-pdf':         (p) => PdfTools.protectPdf(p.pdfUri, p.password || '',
                            p.filename || 'encrypted', p.permissions || null),
  'decrypt-pdf':         (p) => PdfTools.decryptPdf(p.pdfUri, p.password || ''),
  'sanitize-pdf':        (p) => PdfTools.sanitizePdf(p.pdfUri),
  'find-and-redact':     (p) => PdfTools.findAndRedact(p.pdfUri, p.searchText || '', null),
  'flatten-pdf':         (p) => PdfTools.flattenPdf(p.pdfUri),
  'remove-metadata':     (p) => PdfTools.removeMetadata(p.pdfUri),
  'change-permissions':  (p) => PdfTools.changePermissions(p.pdfUri, p.permissions || {}),
  'digital-sign-pdf':    (p) => PdfTools.embedSignature(
                            p.pdfUri, p.signatureUri, p.pageNumber || 1,
                            p.x || 50, p.y || 50, p.width || 150, p.height || 60),
  'validate-signature':  (p) => PdfTools.validateSignature(p.pdfUri),
};

// Stand-alone OCR helper (image input, not PDF)
export async function ocrImage(imageUri, languages = ['en-US']) {
  if (!VisionOcr) throw new Error('VisionOcr only available on iOS');
  return VisionOcr.recognizeText(imageUri, { languages });
}

export default {
  executeTool, getToolFn, getToolSchema, isNativeAvailable,
  isToolUnsupported, getUnsupportedReason, UNSUPPORTED_TOOL_IDS,
  ocrImage,
};
