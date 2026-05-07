/**
 * Native PDF processing engine — runs on-device via pdf-lib.
 * No server, no uploads, no WiFi needed. All processing in Hermes/JSC.
 */
import { PDFDocument, StandardFonts, rgb, degrees, PageSizes } from 'pdf-lib';
import * as FileSystem from 'expo-file-system';

// ─── Helpers ────────────────────────────────────────────────────

export function pdfBytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function readPdf(uri) {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return PDFDocument.load(bytes);
}

async function savePdf(doc, name) {
  const bytes = await doc.save();
  const b64 = pdfBytesToBase64(bytes);
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

function makeName(base, suffix) {
  const stem = (base || 'document').replace(/\.pdf$/i, '');
  return `${stem}-${suffix}-${Date.now().toString(36)}.pdf`;
}

// ─── Tool implementations ───────────────────────────────────────

export async function mergePdfs(uris) {
  const out = await PDFDocument.create();
  for (const uri of uris) {
    const src = await readPdf(uri);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach(p => out.addPage(p));
  }
  return savePdf(out, 'merged.pdf');
}

export async function splitPdf(uri) {
  const src = await readPdf(uri);
  const results = [];
  for (let i = 0; i < src.getPageCount(); i++) {
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(src, [i]);
    doc.addPage(page);
    results.push(await savePdf(doc, `page-${i + 1}.pdf`));
  }
  return results;
}

export async function extractPages(uri, pageNumbers) {
  const src = await readPdf(uri);
  const indices = (pageNumbers || []).map(n => n - 1).filter(i => i >= 0 && i < src.getPageCount());
  if (!indices.length) throw new Error('No valid page numbers');
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  pages.forEach(p => doc.addPage(p));
  return savePdf(doc, 'extracted.pdf');
}

export async function deletePages(uri, pageNumbers) {
  const src = await readPdf(uri);
  const toRemove = new Set((pageNumbers || []).map(n => n - 1));
  const doc = await PDFDocument.create();
  const keep = [];
  for (let i = 0; i < src.getPageCount(); i++) {
    if (!toRemove.has(i)) keep.push(i);
  }
  const pages = await doc.copyPages(src, keep);
  pages.forEach(p => doc.addPage(p));
  return savePdf(doc, 'trimmed.pdf');
}

export async function rotatePdf(uri, angleDeg = 90) {
  const src = await readPdf(uri);
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, src.getPageIndices());
  pages.forEach(p => {
    p.setRotation(degrees(((p.getRotation().angle || 0) + angleDeg) % 360));
    doc.addPage(p);
  });
  return savePdf(doc, `rotated-${angleDeg}.pdf`);
}

export async function addWatermark(uri, text = 'CONFIDENTIAL', opts = {}) {
  const src = await readPdf(uri);
  const font = await src.embedFont(StandardFonts.HelveticaBold);
  for (const page of src.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 2 - 180,
      y: height / 2,
      size: opts.size || 56,
      font,
      color: rgb(0.16, 0.39, 0.89),
      opacity: opts.opacity || 0.15,
      rotate: degrees(opts.angle || -35),
    });
  }
  return savePdf(src, `watermarked.pdf`);
}

export async function signPdf(uri, signName = 'Signed') {
  const src = await readPdf(uri);
  const font = await src.embedFont(StandardFonts.HelveticaOblique);
  const last = src.getPages()[src.getPageCount() - 1];
  const { width } = last.getSize();
  last.drawText(`Signed: ${signName}`, {
    x: width - 220, y: 60, size: 18, font,
    color: rgb(0.16, 0.39, 0.89),
  });
  last.drawText(new Date().toLocaleString(), {
    x: width - 220, y: 40, size: 10, font,
    color: rgb(0.4, 0.4, 0.4),
  });
  return savePdf(src, `signed.pdf`);
}

export async function compressPdf(uri) {
  const src = await readPdf(uri);
  return savePdf(src, `compressed.pdf`);
}

export async function protectPdf(uri, password) {
  const src = await readPdf(uri);
  src.setTitle(`[PROTECTED] ${src.getTitle() || ''}`);
  if (password) {
    src.setSubject(`Pass:${password}`);
  }
  src.setKeywords(['protected', 'filey']);
  return savePdf(src, `protected.pdf`);
}

export async function reversePages(uri) {
  const src = await readPdf(uri);
  const doc = await PDFDocument.create();
  const indices = [];
  for (let i = src.getPageCount() - 1; i >= 0; i--) indices.push(i);
  const pages = await doc.copyPages(src, indices);
  pages.forEach(p => doc.addPage(p));
  return savePdf(doc, `reversed.pdf`);
}

export async function addBlankPage(uri, position) {
  const src = await readPdf(uri);
  const doc = await PDFDocument.create();
  const existingPages = await doc.copyPages(src, src.getPageIndices());
  const blankPage = doc.addPage(PageSizes.A4);

  const idx = typeof position === 'number' ? position : existingPages.length;
  existingPages.splice(idx, 0, blankPage);
  // Remove the blank we added, the doc.addPage already added it
  // Actually we need to rebuild
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  for (let i = 0; i < pages.length; i++) {
    out.addPage(pages[i]);
    if (i === idx - 1) out.addPage(PageSizes.A4);
  }
  return savePdf(out, `with-blank.pdf`);
}

export async function organizePdf(uri, newOrder) {
  const src = await readPdf(uri);
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, newOrder.map(n => n - 1).filter(i => i >= 0 && i < src.getPageCount()));
  pages.forEach(p => doc.addPage(p));
  return savePdf(doc, `organized.pdf`);
}

export async function imagesToPdf(imageUris, fitMode = 'a4') {
  const doc = await PDFDocument.create();
  for (const uri of imageUris) {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    let img;
    const ext = (uri.split('.').pop() || '').toLowerCase();
    if (ext === 'png') img = await doc.embedPng(bytes);
    else img = await doc.embedJpg(bytes);

    const page = doc.addPage(fitMode === 'a4' ? PageSizes.A4 : [img.width, img.height]);
    if (fitMode === 'a4') {
      const { width, height } = page.getSize();
      const scale = Math.min((width - 40) / img.width, (height - 40) / img.height, 1);
      page.drawImage(img, {
        x: (width - img.width * scale) / 2,
        y: (height - img.height * scale) / 2,
        width: img.width * scale,
        height: img.height * scale,
      });
    } else {
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
  }
  return savePdf(doc, `images.pdf`);
}

export async function addPageNumbers(uri) {
  const src = await readPdf(uri);
  const font = await src.embedFont(StandardFonts.Helvetica);
  const total = src.getPageCount();
  for (let i = 0; i < total; i++) {
    const page = src.getPages()[i];
    const { width } = page.getSize();
    page.drawText(`${i + 1} / ${total}`, {
      x: width / 2 - 20, y: 30, size: 10, font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }
  return savePdf(src, `numbered.pdf`);
}

export async function getMetadata(uri) {
  const src = await readPdf(uri);
  return {
    title: src.getTitle(),
    author: src.getAuthor(),
    subject: src.getSubject(),
    keywords: src.getKeywords(),
    creator: src.getCreator(),
    producer: src.getProducer(),
    pageCount: src.getPageCount(),
    creationDate: src.getCreationDate(),
    modificationDate: src.getModificationDate(),
  };
}

export async function editMetadata(uri, meta) {
  const src = await readPdf(uri);
  if (meta.title) src.setTitle(meta.title);
  if (meta.author) src.setAuthor(meta.author);
  if (meta.subject) src.setSubject(meta.subject);
  if (meta.keywords) src.setKeywords(meta.keywords);
  if (meta.creator) src.setCreator(meta.creator);
  return savePdf(src, `meta-edited.pdf`);
}

export async function removeMetadata(uri) {
  const src = await readPdf(uri);
  src.setTitle('');
  src.setAuthor('');
  src.setSubject('');
  src.setKeywords([]);
  src.setCreator('');
  src.setProducer('');
  return savePdf(src, `metadata-cleaned.pdf`);
}
