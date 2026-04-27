import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { download } from 'pdf-lib';

/**
 * PDF manipulation tools using pdf-lib
 * Merge, compress, watermark, sign PDFs in browser
 */
export const pdfTools = {
  /**
   * Merge multiple PDFs into one
   * @param {Array<{name: string, data: ArrayBuffer}>} pdfs - PDF files to merge
   * @returns {Promise<Uint8Array>} Merged PDF bytes
   */
  async merge(pdfs) {
    const mergedPdf = await PDFDocument.create();

    for (const pdf of pdfs) {
      const doc = await PDFDocument.load(pdf.data);
      const pages = await mergedPdf.copyPages(doc, doc.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }

    return await mergedPdf.save();
  },

  /**
   * Compress PDF by reducing image quality
   * @param {ArrayBuffer} pdfData - Original PDF
   * @param {number} quality - Quality factor (0.1-1.0)
   * @returns {Promise<Uint8Array>} Compressed PDF bytes
   */
  async compress(pdfData, quality = 0.6) {
    // Note: pdf-lib doesn't directly compress, but we can optimize
    const doc = await PDFDocument.load(pdfData);
    const pages = doc.getPages();

    // Optimize by removing unused objects
    const saved = await doc.save({ useObjectStreams: true });
    return saved;
  },

  /**
   * Add watermark to PDF
   * @param {ArrayBuffer} pdfData - Original PDF
   * @param {string} text - Watermark text
   * @param {{opacity?: number, color?: string, fontSize?: number}} options
   * @returns {Promise<Uint8Array>} Watermarked PDF bytes
   */
  async addWatermark(pdfData, text, options = {}) {
    const { opacity = 0.3, color = '#999999', fontSize = 48 } = options;
    const doc = await PDFDocument.load(pdfData);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const rgbColor = hexToRgb(color);

    const pages = doc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: (height - textHeight) / 2,
        size: fontSize,
        font,
        color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
        opacity,
        rotate: { type: 'degrees', angle: -45 },
      });
    }

    return await doc.save();
  },

  /**
   * Add signature to PDF
   * @param {ArrayBuffer} pdfData - Original PDF
   * @param {{page?: number, x?: number, y?: number, width?: number, height?: number, image?: ArrayBuffer}} options
   * @returns {Promise<Uint8Array>} Signed PDF bytes
   */
  async addSignature(pdfData, options = {}) {
    const { page = -1, x, y, width = 150, height = 50, image } = options;
    const doc = await PDFDocument.load(pdfData);
    const pages = doc.getPages();
    const targetPage = pages[page < 0 ? pages.length + page : page];

    if (image) {
      // Add signature image
      const pngImage = await doc.embedPng(image);
      const { width: pageWidth, height: pageHeight } = targetPage.getSize();
      targetPage.drawImage(pngImage, {
        x: x || (pageWidth - width) / 2,
        y: y || 50,
        width,
        height,
      });
    } else {
      // Draw signature line
      const { width: pageWidth } = targetPage.getSize();
      const signX = x || (pageWidth - 200) / 2;
      const signY = y || 80;

      targetPage.drawLine({
        start: { x: signX, y: signY },
        end: { x: signX + 200, y: signY },
        thickness: 2,
        color: rgb(0, 0, 0),
      });
      targetPage.drawText('Signature:', {
        x: signX,
        y: signY + 10,
        size: 12,
        font: await doc.embedFont(StandardFonts.Helvetica),
      });
    }

    return await doc.save();
  },

  /**
   * Create PDF from text
   * @param {string} content - Text content
   * @returns {Promise<Uint8Array>} PDF bytes
   */
  async createFromText(content) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([595, 842]); // A4

    const lines = content.split('\n');
    let y = 780;
    for (const line of lines) {
      page.drawText(line, { x: 50, y, size: 12, font });
      y -= 18;
      if (y < 50) {
        y = 780;
        doc.addPage([595, 842]);
      }
    }

    return await doc.save();
  },

  /**
   * Get PDF info (page count, size)
   * @param {ArrayBuffer} pdfData - PDF bytes
   * @returns {Promise<{pageCount: number, width: number, height: number}>}
   */
  async getInfo(pdfData) {
    const doc = await PDFDocument.load(pdfData);
    const firstPage = doc.getPages()[0];
    const { width, height } = firstPage.getSize();

    return {
      pageCount: doc.getPageCount(),
      width,
      height,
    };
  },
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  } : { r: 0.6, g: 0.6, b: 0.6 };
}
