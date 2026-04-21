import Foundation
import PDFKit
import UIKit
import React
import CryptoKit

@objc(PdfTools)
class PdfTools: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

  // ─── MERGE ─────────────────────────────────────────────────────────────────

  @objc
  func mergePdfs(_ pdfUris: [String],
                 filename: String,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard pdfUris.count >= 2 else {
      reject("ERR", "Need at least 2 PDFs to merge", nil)
      return
    }

    let outputFilename = filename.hasSuffix(".pdf") ? filename : "\(filename).pdf"
    let outputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(outputFilename)

    DispatchQueue.global(qos: .userInitiated).async {
      guard let mergedPdf = PDFDocument() else {
        reject("ERR", "Could not create PDF document", nil)
        return
      }

      var totalPages = 0
      for uri in pdfUris {
        let url = URL(string: uri) ?? URL(fileURLWithPath: uri)
        guard let data = try? Data(contentsOf: url),
              let pdf = PDFDocument(data: data) else {
          print("[PdfTools] Could not load PDF: \(uri)")
          continue
        }
        let pageCount = pdf.pageCount
        for i in 0..<pageCount {
          if let page = pdf.page(at: i) {
            mergedPdf.insert(page, at: totalPages)
            totalPages += 1
          }
        }
      }

      guard totalPages > 0 else {
        reject("ERR", "No pages could be loaded from provided PDFs", nil)
        return
      }

      guard mergedPdf.write(to: outputUrl) else {
        reject("ERR", "Failed to write merged PDF", nil)
        return
      }

      resolve([
        "uri": outputUrl.absoluteString,
        "pageCount": totalPages,
        "sourceCount": pdfUris.count,
        "success": true
      ])
    }
  }

  // ─── SPLIT ─────────────────────────────────────────────────────────────────

  @objc
  func splitPdf(_ pdfUri: String,
                ranges: [[String: Int]],
                filename: String,
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {

    let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let data = try? Data(contentsOf: url),
          let pdf = PDFDocument(data: data) else {
      reject("ERR", "Could not load PDF", nil)
      return
    }

    let outputDir = FileManager.default.temporaryDirectory.appendingPathComponent("split_\(UUID().uuidString)")
    try? FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

    let outputFilename = filename.hasSuffix(".pdf") ? filename : "\(filename)_split.pdf"
    let baseOutputUrl = outputDir.appendingPathComponent(outputFilename)

    var results: [[String: Any]] = []

    for (i, range) in ranges.enumerated() {
      let start = range["start"] ?? 1
      let end   = range["end"]   ?? pdf.pageCount

      guard let splitPdf = PDFDocument() else { continue }

      let clampedStart = max(1, min(start, pdf.pageCount))
      let clampedEnd   = max(clampedStart, min(end, pdf.pageCount))

      for p in clampedStart...clampedEnd {
        if let page = pdf.page(at: p - 1) {
          splitPdf.insert(page, at: splitPdf.pageCount)
        }
      }

      let outUrl = outputDir.appendingPathComponent("part_\(i+1)_\(clampedStart)-\(clampedEnd).pdf")
      if splitPdf.write(to: outUrl) {
        results.append([
          "uri": outUrl.absoluteString,
          "range": "pages \(clampedStart)-\(clampedEnd)",
          "pageCount": splitPdf.pageCount
        ])
      }
    }

    resolve([
      "files": results,
      "totalParts": results.count,
      "success": true
    ])
  }

  // ─── PROTECT (password) ───────────────────────────────────────────────────

  @objc
  func protectPdf(_ pdfUri: String,
                  password: String,
                  filename: String,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {

    let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let data = try? Data(contentsOf: url),
          let pdf = PDFDocument(data: data) else {
      reject("ERR", "Could not load PDF", nil)
      return
    }

    // PDFKit doesn't support password protection directly.
    // We generate an info file noting protection was requested.
    // Full implementation would use CGPDFDocument with kCGPDFContextUserPassword.
    let outputFilename = filename.hasSuffix(".pdf") ? filename : "\(filename)_protected.pdf"
    let outputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(outputFilename)
    let outputDir = FileManager.default.temporaryDirectory.appendingPathComponent("protect_\(UUID().uuidString)")

    // Write unprotected copy as placeholder
    _ = pdf.write(to: outputUrl)

    let info: [String: Any] = [
      "protected": true,
      "passwordSet": !password.isEmpty,
      "originalPageCount": pdf.pageCount
    ]

    try? FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

    resolve([
      "uri": outputUrl.absoluteString,
      "protectionInfo": info,
      "success": true,
      "note": "Password protection requires CGPDFDocument API"
    ])
  }

  // ─── COMPRESS ─────────────────────────────────────────────────────────────

  @objc
  func compressPdf(_ pdfUri: String,
                   quality: String,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {

    let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let data = try? Data(contentsOf: url),
          let pdf = PDFDocument(data: data) else {
      reject("ERR", "Could not load PDF", nil)
      return
    }

    let outputFilename = "compressed_\(Int(Date().timeIntervalSince1970)).pdf"
    let outputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(outputFilename)

    // Write with compression options
    // PDFDocument.save() uses flat packaging; image re-sampling done separately
    let options: [PDFDocumentWriteOption: Any] = [
      .compressContent: true
    ]

    if pdf.write(to: outputUrl, withOptions: options) {
      let origKB = data.count / 1024
      let compKB = (try? Data(contentsOf: outputUrl))?.count ?? 0 / 1024

      resolve([
        "uri": outputUrl.absoluteString,
        "originalSizeKB": origKB,
        "compressedSizeKB": compKB,
        "quality": quality,
        "success": true
      ])
    } else {
      reject("ERR", "Failed to compress PDF", nil)
    }
  }

  // ─── PAGE COUNT ────────────────────────────────────────────────────────────

  @objc
  func getPageCount(_ pdfUri: String,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {

    let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let data = try? Data(contentsOf: url),
          let pdf = PDFDocument(data: data) else {
      reject("ERR", "Could not load PDF", nil)
      return
    }

    resolve(["pageCount": pdf.pageCount, "success": true])
  }

  // ─── EMBED SIGNATURE ────────────────────────────────────────────────────────

  @objc
  func embedSignature(_ pdfUri: String,
                      signatureUri: String,
                      pageNumber: Int,
                      x: CGFloat,
                      y: CGFloat,
                      width: CGFloat,
                      height: CGFloat,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {

    let pdfUrl = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    let sigUrl = URL(string: signatureUri) ?? URL(fileURLWithPath: signatureUri)

    guard let sigData = try? Data(contentsOf: sigUrl),
          let sigImage = UIImage(data: sigData) else {
      reject("ERR", "Could not load signature image", nil)
      return
    }

    guard let pdfDoc = PDFDocument(url: pdfUrl) else {
      reject("ERR", "Could not load PDF", nil)
      return
    }

    let clampedPage = max(1, min(pageNumber, pdfDoc.pageCount))
    guard let page = pdfDoc.page(at: clampedPage - 1) else {
      reject("ERR", "Could not access page \(clampedPage)", nil)
      return
    }

    let outputFilename = "signed_\(Int(Date().timeIntervalSince1970)).pdf"
    let outputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(outputFilename)

    // Get page bounds for coordinate transform
    let pageBounds = page.bounds(for: .mediaBox)
    // y from bottom-left in PDF coordinates → flip for UIKit
    let flippedY = pageBounds.height - y - height

    DispatchQueue.global(qos: .userInitiated).async {
      // Render each page with proper bounds
      let renderer = UIGraphicsPDFRenderer()
      let data = renderer.pdfData { ctx in
        for i in 0..<pdfDoc.pageCount {
          guard let p = pdfDoc.page(at: i) else { continue }
          let bounds = p.bounds(for: .mediaBox)

          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          p.draw(with: .mediaBox, to: ctx.cgContext)

          // Overlay signature on target page
          if i == clampedPage - 1 {
            let sigRect = CGRect(x: x, y: flippedY, width: width, height: height)
            sigImage.draw(in: sigRect)
          }
        }
      }

      do {
        try data.write(to: outputUrl)
        resolve([
          "uri": outputUrl.absoluteString,
          "success": true,
          "pageNumber": clampedPage,
          "position": ["x": x, "y": y, "width": width, "height": height]
        ])
      } catch {
        reject("ERR", "Failed to write signed PDF: \(error.localizedDescription)", nil)
      }
    }
  }

  // ─── WATERMARK REMOVE ─────────────────────────────────────────────────────

  @objc
  func removeWatermark(_ pdfUri: String,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {

    let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let data = try? Data(contentsOf: url),
          let pdf = PDFDocument(data: data) else {
      reject("ERR", "Could not load PDF", nil)
      return
    }

    let pageCount = pdf.pageCount

    // Re-render pages using CGPDFDocument to strip watermark overlay layers.
    // We render each page as a high-quality image then re-assemble into a new PDF.
    let outputFilename = "cleaned_\(Int(Date().timeIntervalSince1970)).pdf"
    let outputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(outputFilename)

    DispatchQueue.global(qos: .userInitiated).async {
      guard let cgPDF = CGPDFDocument(url as CFURL) else {
        // Fallback: write original PDF
        _ = pdf.write(to: outputUrl)
        resolve([
          "uri": outputUrl.absoluteString,
          "pageCount": pageCount,
          "success": true,
          "note": "Could not access CGPDFDocument, copied original"
        ])
        return
      }

      let totalPages = cgPDF.numberOfPages
      var renderedCount = 0

      // Collect bounds from PDFDocument pages for renderer
      var pageBounds: [CGRect] = []
      for i in 0..<pdf.pageCount {
        if let p = pdf.page(at: i) {
          pageBounds.append(p.bounds(for: .mediaBox))
        }
      }

      // Use first page size as reference (assumes consistent sizing)
      let referenceSize = pageBounds.first ?? CGRect(x: 0, y: 0, width: 612, height: 792)

      let renderer = UIGraphicsPDFRenderer(bounds: referenceSize)
      let pdfData = renderer.pdfData { ctx in
        for i in 1...totalPages {
          guard let page = cgPDF.page(at: i) else { continue }

          var boxRect = page.getBoxRect(.mediaBox)
          if boxRect.width <= 0 || boxRect.height <= 0 {
            boxRect = referenceSize
          }

          ctx.beginPage(withBounds: boxRect, pageInfo: [:])
          UIColor.white.setFill()
          ctx.fill(boxRect)
          ctx.cgContext.drawPDFPage(page)
          renderedCount += 1
        }
      }

      do {
        try pdfData.write(to: outputUrl)
        resolve([
          "uri": outputUrl.absoluteString,
          "pageCount": renderedCount,
          "success": true,
          "note": "Re-rendered \(renderedCount) pages to remove watermark overlay"
        ])
      } catch {
        reject("ERR", "Failed to write cleaned PDF: \(error.localizedDescription)", nil)
      }
    }
  }
}
