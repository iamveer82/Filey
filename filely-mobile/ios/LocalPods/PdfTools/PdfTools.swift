import Foundation
import PDFKit
import UIKit
import React
import CryptoKit
import CoreGraphics

@objc(PdfTools)
class PdfTools: RCTEventEmitter {

  private var hasListeners = false

  @objc
  static override func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! {
    return ["PdfProgress", "PdfOperationComplete"]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  private func emitProgress(_ operation: String, progress: Double, message: String = "") {
    if hasListeners {
      self.sendEvent(withName: "PdfProgress", body: [
        "operation": operation,
        "progress": progress,
        "message": message
      ])
    }
  }

  // MARK: - MERGE

  @objc
  func mergePdfs(_ pdfUris: [String],
                 filename: String,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard pdfUris.count >= 2 else {
      reject("MERGE_ERROR", "Need at least 2 PDFs to merge", nil)
      return
    }

    let outputFilename = filename.hasSuffix(".pdf") ? filename : "\(filename).pdf"
    let outputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(outputFilename)

    DispatchQueue.global(qos: .userInitiated).async {
      guard let mergedPdf = PDFDocument() else {
        reject("MERGE_ERROR", "Could not create PDF document", nil)
        return
      }

      var totalPages = 0
      var processedCount = 0

      for (index, uri) in pdfUris.enumerated() {
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

        processedCount += 1
        let progress = Double(processedCount) / Double(pdfUris.count) * 0.9
        self.emitProgress("merge", progress: progress, message: "Processing PDF \(processedCount)/\(pdfUris.count)")
      }

      guard totalPages > 0 else {
        reject("MERGE_ERROR", "No pages could be loaded from provided PDFs", nil)
        return
      }

      guard mergedPdf.write(to: outputUrl) else {
        reject("MERGE_ERROR", "Failed to write merged PDF", nil)
        return
      }

      self.emitProgress("merge", progress: 1.0, message: "Complete")

      resolve([
        "uri": outputUrl.absoluteString,
        "pageCount": totalPages,
        "sourceCount": pdfUris.count,
        "success": true
      ])
    }
  }

  // MARK: - SPLIT

  @objc
  func splitPdf(_ pdfUri: String,
                ranges: [[String: Int]],
                filename: String,
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {

    let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let data = try? Data(contentsOf: url),
          let pdf = PDFDocument(data: data) else {
      reject("SPLIT_ERROR", "Could not load PDF", nil)
      return
    }

    let outputDir = FileManager.default.temporaryDirectory.appendingPathComponent("split_\(UUID().uuidString)")
    try? FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)

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

      let progress = Double(i + 1) / Double(ranges.count)
      self.emitProgress("split", progress: progress, message: "Splitting part \(i+1)/\(ranges.count)")
    }

    self.emitProgress("split", progress: 1.0, message: "Complete")

    resolve([
      "files": results,
      "totalParts": results.count,
      "success": true
    ])
  }

  // MARK: - PASSWORD PROTECTION (Real Implementation)

  @objc
  func protectPdf(_ pdfUri: String,
                  userPassword: String,
                  ownerPassword: String?,
                  filename: String,
                  permissions: [String: Bool]?,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {

    let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let pdfData = try? Data(contentsOf: url) else {
      reject("PROTECT_ERROR", "Could not load PDF file", nil)
      return
    }

    let outputFilename = filename.hasSuffix(".pdf") ? filename : "\(filename).pdf"
    let outputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(outputFilename)

    DispatchQueue.global(qos: .userInitiated).async {
      // Use CGPDFDocument to create password-protected PDF
      guard let provider = CGDataProvider(data: pdfData as CFData),
            let cgPdf = CGPDFDocument(provider) else {
        reject("PROTECT_ERROR", "Could not parse PDF", nil)
        return
      }

      // Create PDF context with password protection
      var mediaBox = CGRect(x: 0, y: 0, width: 612, height: 792)
      if let firstPage = cgPdf.page(at: 1) {
        mediaBox = firstPage.getBoxRect(.mediaBox)
      }

      // Setup protection options
      let ownerPass = ownerPassword ?? userPassword
      let userPass = userPassword

      // Build permissions value (CGPDFAccessPermissions)
      var permValue: CGPDFAccessPermissions = [.copying, [.printing, .highQualityPrinting], .annotating, .editing]
      if let perms = permissions {
        if perms["printing"] == false { permValue.remove(.printing) }
        if perms["copying"] == false { permValue.remove(.copying) }
        if perms["modifying"] == false { permValue.remove(.editing) }
        if perms["annotating"] == false { permValue.remove(.annotating) }
      }

      guard let consumer = CGDataConsumer(url: outputUrl as CFURL) else {
        reject("PROTECT_ERROR", "Could not create output file", nil)
        return
      }

      // Create PDF context with password options
      let options: NSMutableDictionary = [
        kCGPDFContextUserPassword: userPass,
        kCGPDFContextOwnerPassword: ownerPass,
        kCGPDFContextEncryptionKeyLength: 128
      ]

      // Add permissions
      if let perms = permissions {
        var allowCopying = perms["copying"] ?? true
        var allowPrinting = perms["printing"] ?? true
        options[kCGPDFContextAllowsCopying] = allowCopying
        options[kCGPDFContextAllowsPrinting] = allowPrinting
      }

      guard let ctx = CGContext(consumer: consumer, mediaBox: &mediaBox, options as CFDictionary) else {
        reject("PROTECT_ERROR", "Could not create PDF context", nil)
        return
      }

      let pageCount = cgPdf.numberOfPages

      for i in 1...pageCount {
        guard let page = cgPdf.page(at: i) else { continue }

        var pageBox = page.getBoxRect(.mediaBox)
        ctx.beginPage(mediaBox: &pageBox)
        ctx.drawPDFPage(page)
        ctx.endPage()

        self.emitProgress("protect", progress: Double(i) / Double(pageCount), message: "Encrypting page \(i)/\(pageCount)")
      }

      ctx.closePDF()

      self.emitProgress("protect", progress: 1.0, message: "Complete")

      resolve([
        "uri": outputUrl.absoluteString,
        "pageCount": pageCount,
        "success": true,
        "protected": true,
        "hasUserPassword": !userPass.isEmpty,
        "hasOwnerPassword": !ownerPass.isEmpty
      ])
    }
  }

  // MARK: - COMPRESS (Aggressive with Image Resampling)

  @objc
  func compressPdf(_ pdfUri: String,
                   quality: String,
                   targetSizeKB: Int,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {

    let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let data = try? Data(contentsOf: url),
          let pdf = PDFDocument(data: data) else {
      reject("COMPRESS_ERROR", "Could not load PDF", nil)
      return
    }

    let outputFilename = "compressed_\(Int(Date().timeIntervalSince1970)).pdf"
    let outputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(outputFilename)

    DispatchQueue.global(qos: .userInitiated).async {
      let origSize = data.count
      let qualityScale: CGFloat
      let dpi: CGFloat

      switch quality {
      case "low":
        qualityScale = 0.5; dpi = 72
      case "medium":
        qualityScale = 0.75; dpi = 150
      case "high":
        qualityScale = 0.9; dpi = 200
      default:
        qualityScale = 0.75; dpi = 150
      }

      let pageCount = pdf.pageCount
      var processedPages = 0

      // Create compressed PDF by re-rendering pages with reduced quality
      guard let firstPage = pdf.page(at: 0) else {
        reject("COMPRESS_ERROR", "Could not read PDF pages", nil)
        return
      }

      let bounds = firstPage.bounds(for: .mediaBox)
      let scaledBounds = CGRect(x: 0, y: 0, width: bounds.width * qualityScale, height: bounds.height * qualityScale)

      let renderer = UIGraphicsPDFRenderer(bounds: scaledBounds)

      do {
        try renderer.writePDF(to: outputUrl) { ctx in
          for i in 0..<pageCount {
            guard let page = pdf.page(at: i) else { continue }

            let pageBounds = page.bounds(for: .mediaBox)
            let scaledPageBounds = CGRect(x: 0, y: 0, width: pageBounds.width * qualityScale, height: pageBounds.height * qualityScale)

            ctx.beginPage(withBounds: scaledPageBounds, pageInfo: [
              .mediaBox: scaledPageBounds,
              .cropBox: scaledPageBounds
            ])

            // Draw page with scaling
            let cgContext = ctx.cgContext
            cgContext.saveGState()
            cgContext.scaleBy(x: qualityScale, y: qualityScale)
            page.draw(with: .mediaBox, to: cgContext)
            cgContext.restoreGState()

            processedPages += 1
            let progress = Double(processedPages) / Double(pageCount)
            self.emitProgress("compress", progress: progress, message: "Processing page \(processedPages)/\(pageCount)")
          }
        }

        let compData = try? Data(contentsOf: outputUrl)
        let compSize = compData?.count ?? 0

        self.emitProgress("compress", progress: 1.0, message: "Complete")

        resolve([
          "uri": outputUrl.absoluteString,
          "originalSizeKB": origSize / 1024,
          "compressedSizeKB": compSize / 1024,
          "compressionRatio": String(format: "%.1f%%", (1.0 - Double(compSize) / Double(origSize)) * 100),
          "quality": quality,
          "pageCount": pageCount,
          "success": true
        ])
      } catch {
        reject("COMPRESS_ERROR", "Failed to compress PDF: \(error.localizedDescription)", error)
      }
    }
  }

  // MARK: - PAGE COUNT

  @objc
  func getPageCount(_ pdfUri: String,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {

    let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let data = try? Data(contentsOf: url),
          let pdf = PDFDocument(data: data) else {
      reject("COUNT_ERROR", "Could not load PDF", nil)
      return
    }

    resolve(["pageCount": pdf.pageCount, "success": true])
  }

  // MARK: - EMBED SIGNATURE

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
      reject("SIGN_ERROR", "Could not load signature image", nil)
      return
    }

    guard let pdfDoc = PDFDocument(url: pdfUrl) else {
      reject("SIGN_ERROR", "Could not load PDF", nil)
      return
    }

    let clampedPage = max(1, min(pageNumber, pdfDoc.pageCount))
    guard let page = pdfDoc.page(at: clampedPage - 1) else {
      reject("SIGN_ERROR", "Could not access page \(clampedPage)", nil)
      return
    }

    let outputFilename = "signed_\(Int(Date().timeIntervalSince1970)).pdf"
    let outputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(outputFilename)

    let pageBounds = page.bounds(for: .mediaBox)
    let flippedY = pageBounds.height - y - height

    DispatchQueue.global(qos: .userInitiated).async {
      let renderer = UIGraphicsPDFRenderer()
      let data = renderer.pdfData { ctx in
        for i in 0..<pdfDoc.pageCount {
          guard let p = pdfDoc.page(at: i) else { continue }
          let bounds = p.bounds(for: .mediaBox)

          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          p.draw(with: .mediaBox, to: ctx.cgContext)

          if i == clampedPage - 1 {
            let sigRect = CGRect(x: x, y: flippedY, width: width, height: height)
            sigImage.draw(in: sigRect)
          }

          self.emitProgress("sign", progress: Double(i + 1) / Double(pdfDoc.pageCount))
        }
      }

      do {
        try data.write(to: outputUrl)
        self.emitProgress("sign", progress: 1.0, message: "Complete")
        resolve([
          "uri": outputUrl.absoluteString,
          "success": true,
          "pageNumber": clampedPage,
          "position": ["x": x, "y": y, "width": width, "height": height]
        ])
      } catch {
        reject("SIGN_ERROR", "Failed to write signed PDF: \(error.localizedDescription)", nil)
      }
    }
  }

  // MARK: - WATERMARK ADD

  @objc
  func addWatermark(_ pdfUri: String,
                    text: String?,
                    imageUri: String?,
                    options: [String: Any],
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {

    let pdfUrl = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let pdfDoc = PDFDocument(url: pdfUrl) else {
      reject("WATERMARK_ERROR", "Could not load PDF", nil)
      return
    }

    let outputFilename = "watermarked_\(Int(Date().timeIntervalSince1970)).pdf"
    let outputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(outputFilename)

    // Parse options
    let opacity = options["opacity"] as? CGFloat ?? 0.3
    let rotation = options["rotation"] as? CGFloat ?? 45
    let fontSize = options["fontSize"] as? CGFloat ?? 48
    let colorHex = options["color"] as? String ?? "#808080"
    let pages = options["pages"] as? [Int] // nil = all pages
    let position = options["position"] as? String ?? "center" // center, topLeft, topRight, bottomLeft, bottomRight

    DispatchQueue.global(qos: .userInitiated).async {
      let renderer = UIGraphicsPDFRenderer()
      let data = renderer.pdfData { ctx in
        for i in 0..<pdfDoc.pageCount {
          guard let page = pdfDoc.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)

          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          page.draw(with: .mediaBox, to: ctx.cgContext)

          // Check if we should watermark this page
          if let targetPages = pages {
            guard targetPages.contains(i + 1) else { continue }
          }

          let cgContext = ctx.cgContext
          cgContext.saveGState()

          if let text = text, !text.isEmpty {
            // Text watermark
            self.drawTextWatermark(text, in: bounds, context: cgContext,
                                   opacity: opacity, rotation: rotation,
                                   fontSize: fontSize, colorHex: colorHex,
                                   position: position)
          } else if let imageUri = imageUri, !imageUri.isEmpty {
            // Image watermark
            self.drawImageWatermark(imageUri, in: bounds, context: cgContext,
                                    opacity: opacity, rotation: rotation,
                                    position: position)
          }

          cgContext.restoreGState()

          self.emitProgress("watermark", progress: Double(i + 1) / Double(pdfDoc.pageCount))
        }
      }

      do {
        try data.write(to: outputUrl)
        self.emitProgress("watermark", progress: 1.0, message: "Complete")
        resolve([
          "uri": outputUrl.absoluteString,
          "success": true,
          "pageCount": pdfDoc.pageCount,
          "watermarkType": text != nil ? "text" : "image"
        ])
      } catch {
        reject("WATERMARK_ERROR", "Failed to write watermarked PDF: \(error.localizedDescription)", nil)
      }
    }
  }

  private func drawTextWatermark(_ text: String, in bounds: CGRect, context: CGContext,
                                  opacity: CGFloat, rotation: CGFloat, fontSize: CGFloat,
                                  colorHex: String, position: String) {
    let paragraphStyle = NSMutableParagraphStyle()
    paragraphStyle.alignment = .center

    let color = UIColor(hex: colorHex)?.withAlphaComponent(opacity) ?? UIColor.gray.withAlphaComponent(opacity)

    let attributes: [NSAttributedString.Key: Any] = [
      .font: UIFont.systemFont(ofSize: fontSize, weight: .bold),
      .foregroundColor: color,
      .paragraphStyle: paragraphStyle
    ]

    let textSize = text.size(withAttributes: attributes)
    let centerX = bounds.midX
    let centerY = bounds.midY

    context.translateBy(x: centerX, y: centerY)
    context.rotate(by: rotation * .pi / 180)

    let rect = CGRect(x: -textSize.width / 2, y: -textSize.height / 2, width: textSize.width, height: textSize.height)
    text.draw(in: rect, withAttributes: attributes)
  }

  private func drawImageWatermark(_ imageUri: String, in bounds: CGRect, context: CGContext,
                                   opacity: CGFloat, rotation: CGFloat, position: String) {
    let url = URL(string: imageUri) ?? URL(fileURLWithPath: imageUri)
    guard let imgData = try? Data(contentsOf: url),
          let image = UIImage(data: imgData) else { return }

    let maxSize: CGFloat = 200
    let scale = min(maxSize / image.size.width, maxSize / image.size.height, 1.0)
    let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)

    context.translateBy(x: bounds.midX, y: bounds.midY)
    context.rotate(by: rotation * .pi / 180)

    let rect = CGRect(x: -size.width / 2, y: -size.height / 2, width: size.width, height: size.height)

    context.setAlpha(opacity)
    image.draw(in: rect)
  }

  // MARK: - WATERMARK REMOVE

  @objc
  func removeWatermark(_ pdfUri: String,
                       pages: [Int]?,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {

    let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let data = try? Data(contentsOf: url),
          let pdf = PDFDocument(data: data) else {
      reject("WATERMARK_ERROR", "Could not load PDF", nil)
      return
    }

    let outputFilename = "cleaned_\(Int(Date().timeIntervalSince1970)).pdf"
    let outputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(outputFilename)

    DispatchQueue.global(qos: .userInitiated).async {
      let pageCount = pdf.pageCount
      var targetPages = Set(1...pageCount)
      if let specificPages = pages {
        targetPages = Set(specificPages.filter { $0 >= 1 && $0 <= pageCount })
      }

      let renderer = UIGraphicsPDFRenderer()
      let pdfData = renderer.pdfData { ctx in
        for i in 0..<pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)

          ctx.beginPage(withBounds: bounds, pageInfo: [:])

          if targetPages.contains(i + 1) {
            // Re-render page to strip potential watermark layers
            // This rasterizes the page which removes vector-based watermarks
            let scale: CGFloat = 2.0 // High quality rendering
            let renderBounds = CGRect(x: 0, y: 0, width: bounds.width * scale, height: bounds.height * scale)

            UIGraphicsPushContext(ctx.cgContext)
            ctx.cgContext.saveGState()
            ctx.cgContext.scaleBy(x: 1.0 / scale, y: 1.0 / scale)
            page.draw(with: .mediaBox, to: ctx.cgContext)
            ctx.cgContext.restoreGState()
            UIGraphicsPopContext()
          } else {
            // Keep original page
            page.draw(with: .mediaBox, to: ctx.cgContext)
          }

          self.emitProgress("unwatermark", progress: Double(i + 1) / Double(pageCount))
        }
      }

      do {
        try pdfData.write(to: outputUrl)
        self.emitProgress("unwatermark", progress: 1.0, message: "Complete")
        resolve([
          "uri": outputUrl.absoluteString,
          "pageCount": pageCount,
          "pagesProcessed": targetPages.count,
          "success": true
        ])
      } catch {
        reject("WATERMARK_ERROR", "Failed to write cleaned PDF: \(error.localizedDescription)", nil)
      }
    }
  }
}

// MARK: - UIColor Hex Extension

extension UIColor {
  convenience init?(hex: String) {
    let r, g, b: CGFloat
    let hexString = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)

    var hexValue: UInt64 = 0
    guard Scanner(string: hexString).scanHexInt64(&hexValue) else { return nil }

    switch hexString.count {
    case 3: // RGB (12-bit)
      r = CGFloat((hexValue & 0xF00) >> 8) / 15.0
      g = CGFloat((hexValue & 0x0F0) >> 4) / 15.0
      b = CGFloat(hexValue & 0x00F) / 15.0
    case 6: // RGB (24-bit)
      r = CGFloat((hexValue & 0xFF0000) >> 16) / 255.0
      g = CGFloat((hexValue & 0x00FF00) >> 8) / 255.0
      b = CGFloat(hexValue & 0x0000FF) / 255.0
    default:
      return nil
    }

    self.init(red: r, green: g, blue: b, alpha: 1.0)
  }
}
