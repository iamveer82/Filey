/**
 * Complete PDFCraft tool catalog — 100 tools across 6 categories.
 *
 * Every tool dispatches through ../services/pdfToolExec → ../services/pdfTools
 * → native iOS PdfTools module (PDFKit / CoreGraphics / Vision / WebKit /
 * ImageIO / NSAttributedString / CoreText). All execution is on-device;
 * no uploads, no server, no WASM.
 *
 * For each tool, the input/output schema (file types, params) lives in
 * pdfToolExec.TOOL_SCHEMA — used by RunToolScreen to render the picker
 * + parameter sheet. This file holds only the user-facing label, icon,
 * and category for the tool grid.
 */

export const CATEGORIES = [
  { id: 'organize-manage',  label: 'Organize & Manage',  icon: 'folder-outline',       color: '#2A63E2' },
  { id: 'edit-annotate',    label: 'Edit & Annotate',    icon: 'create-outline',        color: '#8B5CF6' },
  { id: 'convert-to-pdf',   label: 'Convert to PDF',     icon: 'arrow-down-outline',    color: '#10B981' },
  { id: 'convert-from-pdf', label: 'Convert from PDF',   icon: 'arrow-up-outline',      color: '#F59E0B' },
  { id: 'optimize-repair',  label: 'Optimize & Repair',  icon: 'construct-outline',     color: '#EF4444' },
  { id: 'secure-pdf',       label: 'Secure PDF',         icon: 'shield-checkmark-outline', color: '#6366F1' },
];

export const ALL_TOOLS = [
  // ── Organize & Manage (25) ──────────────────────────────────────
  { id: 'merge-pdf',            label: 'Merge PDF',            category: 'organize-manage',  icon: 'albums-outline' },
  { id: 'split-pdf',            label: 'Split PDF',            category: 'organize-manage',  icon: 'cut-outline' },
  { id: 'extract-pages',        label: 'Extract Pages',        category: 'organize-manage',  icon: 'copy-outline' },
  { id: 'organize-pdf',         label: 'Organize PDF',         category: 'organize-manage',  icon: 'file-tray-full-outline' },
  { id: 'delete-pages',         label: 'Delete Pages',         category: 'organize-manage',  icon: 'trash-outline' },
  { id: 'rotate-pdf',           label: 'Rotate PDF',           category: 'organize-manage',  icon: 'refresh-outline' },
  { id: 'rotate-custom',        label: 'Rotate Custom Degrees',category: 'organize-manage',  icon: 'refresh-circle-outline' },
  { id: 'reverse-pages',        label: 'Reverse Pages',        category: 'organize-manage',  icon: 'swap-vertical-outline' },
  { id: 'add-blank-page',       label: 'Add Blank Page',       category: 'organize-manage',  icon: 'add-circle-outline' },
  { id: 'divide-pages',         label: 'Divide Pages',         category: 'organize-manage',  icon: 'grid-outline' },
  { id: 'n-up-pdf',             label: 'N-Up PDF',             category: 'organize-manage',  icon: 'apps-outline' },
  { id: 'combine-single-page',  label: 'Combine to Single Page',category: 'organize-manage',  icon: 'contract-outline' },
  { id: 'alternate-merge',      label: 'Alternate Merge',      category: 'organize-manage',  icon: 'git-merge-outline' },
  { id: 'ocr-pdf',              label: 'OCR PDF',              category: 'organize-manage',  icon: 'scan-outline' },
  { id: 'add-attachments',      label: 'Add Attachments',      category: 'organize-manage',  icon: 'attach-outline' },
  { id: 'extract-attachments',  label: 'Extract Attachments',  category: 'organize-manage',  icon: 'download-outline' },
  { id: 'edit-attachments',     label: 'Edit Attachments',     category: 'organize-manage',  icon: 'pencil-outline' },
  { id: 'view-metadata',        label: 'View Metadata',        category: 'organize-manage',  icon: 'information-circle-outline' },
  { id: 'edit-metadata',        label: 'Edit Metadata',        category: 'organize-manage',  icon: 'code-working-outline' },
  { id: 'pdf-to-zip',           label: 'PDFs to ZIP',          category: 'organize-manage',  icon: 'archive-outline' },
  { id: 'compare-pdfs',         label: 'Compare PDFs',         category: 'organize-manage',  icon: 'git-compare-outline' },
  { id: 'posterize-pdf',        label: 'Posterize PDF',        category: 'organize-manage',  icon: 'easel-outline' },
  { id: 'pdf-booklet',          label: 'PDF Booklet',          category: 'organize-manage',  icon: 'book-outline' },
  { id: 'grid-combine',         label: 'Grid Combine',         category: 'organize-manage',  icon: 'tablet-landscape-outline' },
  { id: 'pdf-multi-tool',       label: 'PDF Multi Tool',       category: 'organize-manage',  icon: 'hammer-outline' },

  // ── Edit & Annotate (17) ────────────────────────────────────────
  { id: 'edit-pdf',             label: 'Edit PDF',             category: 'edit-annotate',  icon: 'color-wand-outline' },
  { id: 'sign-pdf',             label: 'Sign PDF',             category: 'edit-annotate',  icon: 'pen-outline' },
  { id: 'crop-pdf',             label: 'Crop PDF',             category: 'edit-annotate',  icon: 'crop-outline' },
  { id: 'bookmark',             label: 'Edit Bookmarks',       category: 'edit-annotate',  icon: 'bookmark-outline' },
  { id: 'table-of-contents',    label: 'Table of Contents',    category: 'edit-annotate',  icon: 'list-outline' },
  { id: 'page-numbers',         label: 'Page Numbers',         category: 'edit-annotate',  icon: 'list-circle-outline' },
  { id: 'add-watermark',        label: 'Add Watermark',        category: 'edit-annotate',  icon: 'water-outline' },
  { id: 'header-footer',        label: 'Header & Footer',      category: 'edit-annotate',  icon: 'text-outline' },
  { id: 'invert-colors',        label: 'Invert Colors',        category: 'edit-annotate',  icon: 'contrast-outline' },
  { id: 'background-color',     label: 'Background Color',     category: 'edit-annotate',  icon: 'color-palette-outline' },
  { id: 'text-color',           label: 'Change Text Color',    category: 'edit-annotate',  icon: 'color-fill-outline' },
  { id: 'add-stamps',           label: 'Add Stamps',           category: 'edit-annotate',  icon: 'pricetag-outline' },
  { id: 'remove-annotations',   label: 'Remove Annotations',   category: 'edit-annotate',  icon: 'backspace-outline' },
  { id: 'form-filler',          label: 'Form Filler',          category: 'edit-annotate',  icon: 'checkbox-outline' },
  { id: 'form-creator',         label: 'Form Creator',         category: 'edit-annotate',  icon: 'document-attach-outline' },
  { id: 'remove-blank-pages',   label: 'Remove Blank Pages',   category: 'edit-annotate',  icon: 'document-outline' },
  { id: 'pdf-reader',           label: 'PDF Reader',           category: 'edit-annotate',  icon: 'book-outline' },

  // ── Convert to PDF (23) ─────────────────────────────────────────
  { id: 'image-to-pdf',         label: 'Image to PDF',         category: 'convert-to-pdf', icon: 'image-outline' },
  { id: 'jpg-to-pdf',           label: 'JPG to PDF',           category: 'convert-to-pdf', icon: 'image-outline' },
  { id: 'png-to-pdf',           label: 'PNG to PDF',           category: 'convert-to-pdf', icon: 'image-outline' },
  { id: 'webp-to-pdf',          label: 'WebP to PDF',          category: 'convert-to-pdf', icon: 'image-outline' },
  { id: 'svg-to-pdf',           label: 'SVG to PDF',           category: 'convert-to-pdf', icon: 'brush-outline' },
  { id: 'bmp-to-pdf',           label: 'BMP to PDF',           category: 'convert-to-pdf', icon: 'image-outline' },
  { id: 'heic-to-pdf',          label: 'HEIC to PDF',          category: 'convert-to-pdf', icon: 'phone-portrait-outline' },
  { id: 'tiff-to-pdf',          label: 'TIFF to PDF',          category: 'convert-to-pdf', icon: 'layers-outline' },
  { id: 'txt-to-pdf',           label: 'Text to PDF',          category: 'convert-to-pdf', icon: 'document-text-outline' },
  { id: 'json-to-pdf',          label: 'JSON to PDF',          category: 'convert-to-pdf', icon: 'code-slash-outline' },
  { id: 'psd-to-pdf',           label: 'PSD to PDF',           category: 'convert-to-pdf', icon: 'color-filter-outline' },
  { id: 'word-to-pdf',          label: 'Word to PDF',          category: 'convert-to-pdf', icon: 'document-outline' },
  { id: 'excel-to-pdf',         label: 'Excel to PDF',         category: 'convert-to-pdf', icon: 'grid-outline' },
  { id: 'pptx-to-pdf',          label: 'PowerPoint to PDF',    category: 'convert-to-pdf', icon: 'easel-outline' },
  { id: 'xps-to-pdf',           label: 'XPS to PDF',           category: 'convert-to-pdf', icon: 'document-outline' },
  { id: 'rtf-to-pdf',           label: 'RTF to PDF',           category: 'convert-to-pdf', icon: 'document-outline' },
  { id: 'epub-to-pdf',          label: 'EPUB to PDF',          category: 'convert-to-pdf', icon: 'book-outline' },
  { id: 'mobi-to-pdf',          label: 'MOBI to PDF',          category: 'convert-to-pdf', icon: 'book-outline' },
  { id: 'djvu-to-pdf',          label: 'DJVU to PDF',          category: 'convert-to-pdf', icon: 'document-outline' },
  { id: 'fb2-to-pdf',           label: 'FB2 to PDF',           category: 'convert-to-pdf', icon: 'book-outline' },
  { id: 'markdown-to-pdf',      label: 'Markdown to PDF',      category: 'convert-to-pdf', icon: 'logo-markdown' },
  { id: 'email-to-pdf',         label: 'Email to PDF',         category: 'convert-to-pdf', icon: 'mail-outline' },
  { id: 'cbz-to-pdf',           label: 'CBZ to PDF',           category: 'convert-to-pdf', icon: 'book-outline' },
  { id: 'html-to-pdf',          label: 'HTML to PDF',          category: 'convert-to-pdf', icon: 'logo-html5' },

  // ── Convert from PDF (15) ───────────────────────────────────────
  { id: 'pdf-to-jpg',           label: 'PDF to JPG',           category: 'convert-from-pdf', icon: 'image-outline' },
  { id: 'pdf-to-png',           label: 'PDF to PNG',           category: 'convert-from-pdf', icon: 'image-outline' },
  { id: 'pdf-to-webp',          label: 'PDF to WebP',          category: 'convert-from-pdf', icon: 'image-outline' },
  { id: 'pdf-to-bmp',           label: 'PDF to BMP',           category: 'convert-from-pdf', icon: 'image-outline' },
  { id: 'pdf-to-tiff',          label: 'PDF to TIFF',          category: 'convert-from-pdf', icon: 'layers-outline' },
  { id: 'pdf-to-svg',           label: 'PDF to SVG',           category: 'convert-from-pdf', icon: 'brush-outline' },
  { id: 'pdf-to-greyscale',     label: 'PDF to Greyscale',     category: 'convert-from-pdf', icon: 'contrast-outline' },
  { id: 'pdf-to-json',          label: 'PDF to JSON',          category: 'convert-from-pdf', icon: 'code-slash-outline' },
  { id: 'pdf-to-docx',          label: 'PDF to Word',          category: 'convert-from-pdf', icon: 'document-outline' },
  { id: 'pdf-to-pptx',          label: 'PDF to PowerPoint',    category: 'convert-from-pdf', icon: 'easel-outline' },
  { id: 'pdf-to-excel',         label: 'PDF to Excel',         category: 'convert-from-pdf', icon: 'grid-outline' },
  { id: 'pdf-to-markdown',      label: 'PDF to Markdown',      category: 'convert-from-pdf', icon: 'logo-markdown' },
  { id: 'extract-images',       label: 'Extract Images',       category: 'convert-from-pdf', icon: 'download-outline' },
  { id: 'extract-tables',       label: 'Extract Tables',       category: 'convert-from-pdf', icon: 'grid-outline' },
  { id: 'rasterize-pdf',        label: 'Rasterize PDF',        category: 'convert-from-pdf', icon: 'apps-outline' },

  // ── Optimize & Repair (10) ──────────────────────────────────────
  { id: 'compress-pdf',         label: 'Compress PDF',         category: 'optimize-repair',  icon: 'contract-outline' },
  { id: 'fix-page-size',        label: 'Fix Page Size',        category: 'optimize-repair',  icon: 'resize-outline' },
  { id: 'linearize-pdf',        label: 'Linearize PDF',        category: 'optimize-repair',  icon: 'speedometer-outline' },
  { id: 'page-dimensions',      label: 'Page Dimensions',      category: 'optimize-repair',  icon: 'resize-outline' },
  { id: 'remove-restrictions',  label: 'Remove Restrictions',  category: 'optimize-repair',  icon: 'unlink-outline' },
  { id: 'repair-pdf',           label: 'Repair PDF',           category: 'optimize-repair',  icon: 'construct-outline' },
  { id: 'deskew-pdf',           label: 'Deskew PDF',           category: 'optimize-repair',  icon: 'scan-outline' },
  { id: 'pdf-to-pdfa',          label: 'PDF to PDF/A',         category: 'optimize-repair',  icon: 'archive-outline' },
  { id: 'font-to-outline',      label: 'Font to Outline',      category: 'optimize-repair',  icon: 'text-outline' },
  { id: 'ocg-manager',          label: 'Layer Manager (OCG)',  category: 'optimize-repair',  icon: 'layers-outline' },

  // ── Secure PDF (9) ──────────────────────────────────────────────
  { id: 'encrypt-pdf',          label: 'Encrypt PDF',          category: 'secure-pdf',  icon: 'lock-closed-outline' },
  { id: 'decrypt-pdf',          label: 'Decrypt PDF',          category: 'secure-pdf',  icon: 'lock-open-outline' },
  { id: 'sanitize-pdf',         label: 'Sanitize PDF',         category: 'secure-pdf',  icon: 'shield-outline' },
  { id: 'find-and-redact',      label: 'Find and Redact',      category: 'secure-pdf',  icon: 'search-outline' },
  { id: 'flatten-pdf',          label: 'Flatten PDF',          category: 'secure-pdf',  icon: 'layers-outline' },
  { id: 'remove-metadata',      label: 'Remove Metadata',      category: 'secure-pdf',  icon: 'document-outline' },
  { id: 'change-permissions',   label: 'Change Permissions',   category: 'secure-pdf',  icon: 'shield-checkmark-outline' },
  { id: 'digital-sign-pdf',     label: 'Digital Signature',    category: 'secure-pdf',  icon: 'key-outline' },
  { id: 'validate-signature',   label: 'Validate Signature',   category: 'secure-pdf',  icon: 'checkbox-outline' },
];

export function getToolById(id) {
  return ALL_TOOLS.find(t => t.id === id);
}

export function getToolsByCategory(categoryId) {
  return ALL_TOOLS.filter(t => t.category === categoryId);
}

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id);
}
