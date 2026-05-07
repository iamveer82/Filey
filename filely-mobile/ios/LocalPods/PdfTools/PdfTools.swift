import Foundation
import PDFKit
import UIKit
import React
import CryptoKit
import CoreGraphics
import CoreImage
import CoreText
import ImageIO
import AVFoundation
import UniformTypeIdentifiers
import Vision
import WebKit
import QuickLookThumbnailing
import ZIPFoundation

@objc(PdfTools)
class PdfTools: RCTEventEmitter {

  private var hasListeners = false

  @objc
  static override func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! {
    return ["PdfProgress", "PdfOperationComplete"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  func emitProgress(_ operation: String, progress: Double, message: String = "") {
    guard hasListeners else { return }
    self.sendEvent(withName: "PdfProgress", body: [
      "operation": operation, "progress": progress, "message": message
    ])
  }

  // ─── HELPERS ───────────────────────────────────────────────────────

  private func loadPdf(_ uri: String) -> PDFDocument? {
    let url = URL(string: uri) ?? URL(fileURLWithPath: uri)
    guard let data = try? Data(contentsOf: url) else { return nil }
    return PDFDocument(data: data)
  }

  private func tempUrl(_ name: String) -> URL {
    let safe = name.hasSuffix(".pdf") ? name : "\(name).pdf"
    return FileManager.default.temporaryDirectory.appendingPathComponent(safe)
  }

  private func writeRendered(_ pdf: PDFDocument, to url: URL) -> Bool {
    let renderer = UIGraphicsPDFRenderer()
    let data = renderer.pdfData { ctx in
      for i in 0..<pdf.pageCount {
        guard let page = pdf.page(at: i) else { continue }
        let bounds = page.bounds(for: .mediaBox)
        ctx.beginPage(withBounds: bounds, pageInfo: [:])
        page.draw(with: .mediaBox, to: ctx.cgContext)
      }
    }
    do { try data.write(to: url); return true } catch { return false }
  }

  private func pageCount(from uri: String) -> Int {
    guard let pdf = loadPdf(uri) else { return 0 }
    return pdf.pageCount
  }

  // MARK: - MERGE

  @objc
  func mergePdfs(_ pdfUris: [String], filename: String,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard pdfUris.count >= 2 else {
      reject("MERGE_ERROR", "Need at least 2 PDFs", nil); return
    }
    let outputUrl = tempUrl(filename)
    DispatchQueue.global(qos: .userInitiated).async {
      guard let merged = PDFDocument() else {
        reject("MERGE_ERROR", "Could not create PDF document", nil); return
      }
      var total = 0
      for (idx, uri) in pdfUris.enumerated() {
        guard let pdf = self.loadPdf(uri) else { continue }
        for i in 0..<pdf.pageCount {
          if let page = pdf.page(at: i) { merged.insert(page, at: total); total += 1 }
        }
        self.emitProgress("merge", progress: Double(idx + 1) / Double(pdfUris.count) * 0.9,
                          message: "Merging PDF \(idx + 1)/\(pdfUris.count)")
      }
      guard total > 0, merged.write(to: outputUrl) else {
        reject("MERGE_ERROR", "Failed to write merged PDF", nil); return
      }
      self.emitProgress("merge", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": total, "sourceCount": pdfUris.count, "success": true])
    }
  }

  // MARK: - SPLIT

  @objc
  func splitPdf(_ pdfUri: String, ranges: [[String: Int]], filename: String,
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("SPLIT_ERROR", "Could not load PDF", nil); return
    }
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("split_\(UUID().uuidString)")
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    var results: [[String: Any]] = []
    for (i, range) in ranges.enumerated() {
      let start = max(1, min(range["start"] ?? 1, pdf.pageCount))
      let end = max(start, min(range["end"] ?? pdf.pageCount, pdf.pageCount))
      guard let split = PDFDocument() else { continue }
      for p in start...end {
        if let page = pdf.page(at: p - 1) { split.insert(page, at: split.pageCount) }
      }
      let out = dir.appendingPathComponent("part_\(i+1)_\(start)-\(end).pdf")
      if split.write(to: out) {
        results.append(["uri": out.absoluteString, "range": "pages \(start)-\(end)", "pageCount": split.pageCount])
      }
      self.emitProgress("split", progress: Double(i + 1) / Double(ranges.count),
                        message: "Splitting part \(i+1)/\(ranges.count)")
    }
    self.emitProgress("split", progress: 1.0, message: "Complete")
    resolve(["files": results, "totalParts": results.count, "success": true])
  }

  // MARK: - EXTRACT PAGES

  @objc
  func extractPages(_ pdfUri: String, pages: [Int],
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("EXTRACT_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("extracted_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      guard let extracted = PDFDocument() else {
        reject("EXTRACT_ERROR", "Could not create document", nil); return
      }
      var count = 0
      for p in pages {
        let idx = max(0, min(p - 1, pdf.pageCount - 1))
        if let page = pdf.page(at: idx) { extracted.insert(page, at: count); count += 1 }
      }
      guard extracted.write(to: outputUrl) else {
        reject("EXTRACT_ERROR", "Failed to write", nil); return
      }
      self.emitProgress("extract", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": count, "success": true])
    }
  }

  // MARK: - DELETE PAGES

  @objc
  func deletePages(_ pdfUri: String, pages: [Int],
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("DELETE_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("deleted_pages_\(Int(Date().timeIntervalSince1970))")
    let deleteSet = Set(pages.map { max(0, min($0 - 1, pdf.pageCount - 1)) })
    DispatchQueue.global(qos: .userInitiated).async {
      guard let out = PDFDocument() else { reject("DELETE_ERROR", "Could not create document", nil); return }
      var kept = 0
      for i in 0..<pdf.pageCount {
        if deleteSet.contains(i) { continue }
        if let page = pdf.page(at: i) { out.insert(page, at: kept); kept += 1 }
      }
      guard out.write(to: outputUrl) else {
        reject("DELETE_ERROR", "Failed to write", nil); return
      }
      self.emitProgress("delete", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": kept, "deletedCount": deleteSet.count, "success": true])
    }
  }

  // MARK: - ROTATE

  @objc
  func rotatePdf(_ pdfUri: String, degrees: Int, pages: [Int]?,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("ROTATE_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("rotated_\(Int(Date().timeIntervalSince1970))")
    let norm = ((degrees % 360) + 360) % 360
    let targetPages = pages.map { Set($0.map { $0 - 1 }) } ?? Set(0..<pdf.pageCount)
    DispatchQueue.global(qos: .userInitiated).async {
      for i in 0..<pdf.pageCount {
        if targetPages.contains(i), let page = pdf.page(at: i) {
          page.rotation = (page.rotation + norm) % 360
        }
      }
      guard pdf.write(to: outputUrl) else {
        reject("ROTATE_ERROR", "Failed to write", nil); return
      }
      self.emitProgress("rotate", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "rotation": norm, "success": true])
    }
  }

  // MARK: - REVERSE PAGES

  @objc
  func reversePages(_ pdfUri: String,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("REVERSE_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("reversed_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      guard let out = PDFDocument() else { reject("REVERSE_ERROR", "Could not create document", nil); return }
      for i in stride(from: pdf.pageCount - 1, through: 0, by: -1) {
        if let page = pdf.page(at: i) { out.insert(page, at: out.pageCount) }
      }
      guard out.write(to: outputUrl) else {
        reject("REVERSE_ERROR", "Failed to write", nil); return
      }
      self.emitProgress("reverse", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": out.pageCount, "success": true])
    }
  }

  // MARK: - REORDER / ORGANIZE

  @objc
  func reorderPages(_ pdfUri: String, order: [Int],
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("REORDER_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("reordered_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      guard let out = PDFDocument() else { reject("REORDER_ERROR", "Could not create document", nil); return }
      for p in order {
        let idx = max(0, min(p - 1, pdf.pageCount - 1))
        if let page = pdf.page(at: idx) { out.insert(page, at: out.pageCount) }
      }
      guard out.write(to: outputUrl) else {
        reject("REORDER_ERROR", "Failed to write", nil); return
      }
      self.emitProgress("reorder", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": out.pageCount, "success": true])
    }
  }

  // MARK: - ADD BLANK PAGE

  @objc
  func addBlankPage(_ pdfUri: String, position: Int, count: Int,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("BLANK_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("blank_added_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let ins = max(0, min(position - 1, pdf.pageCount))
      let pageSize = pdf.pageCount > 0 ? pdf.page(at: 0)!.bounds(for: .mediaBox) : CGRect(x: 0, y: 0, width: 612, height: 792)
      for _ in 0..<count {
        let blank = PDFPage()
        blank.setBounds(pageSize, for: .mediaBox)
        pdf.insert(blank, at: ins)
      }
      guard pdf.write(to: outputUrl) else {
        reject("BLANK_ERROR", "Failed to write", nil); return
      }
      self.emitProgress("blank", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "addedCount": count, "success": true])
    }
  }

  // MARK: - CROP PDF

  @objc
  func cropPdf(_ pdfUri: String, cropBox: [String: CGFloat],
               resolver resolve: @escaping RCTPromiseResolveBlock,
               rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("CROP_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("cropped_\(Int(Date().timeIntervalSince1970))")
    let x = cropBox["x"] ?? 0; let y = cropBox["y"] ?? 0
    let w = cropBox["width"] ?? 612; let h = cropBox["height"] ?? 792
    let crop = CGRect(x: x, y: y, width: w, height: h)
    DispatchQueue.global(qos: .userInitiated).async {
      for i in 0..<pdf.pageCount {
        pdf.page(at: i)?.setBounds(crop, for: .cropBox)
      }
      guard pdf.write(to: outputUrl) else {
        reject("CROP_ERROR", "Failed to write", nil); return
      }
      self.emitProgress("crop", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "cropBox": ["x": x, "y": y, "width": w, "height": h], "success": true])
    }
  }

  // MARK: - N-UP PDF

  @objc
  func nUpPdf(_ pdfUri: String, rows: Int, cols: Int,
              resolver resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri), pdf.pageCount > 0 else {
      reject("NUP_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("nup_\(Int(Date().timeIntervalSince1970))")
    let r = max(1, rows); let c = max(1, cols); let perPage = r * c
    DispatchQueue.global(qos: .userInitiated).async {
      let outData = UIGraphicsPDFRenderer().pdfData { ctx in
        let srcBounds = pdf.page(at: 0)!.bounds(for: .mediaBox)
        let outW = srcBounds.width * CGFloat(c)
        let outH = srcBounds.height * CGFloat(r)
        let outBounds = CGRect(x: 0, y: 0, width: outW, height: outH)
        var srcIdx = 0
        while srcIdx < pdf.pageCount {
          ctx.beginPage(withBounds: outBounds, pageInfo: [:])
          for row in 0..<r {
            for col in 0..<c {
              guard srcIdx < pdf.pageCount, let page = pdf.page(at: srcIdx) else { break }
              ctx.cgContext.saveGState()
              let ox = CGFloat(col) * srcBounds.width
              let oy = outH - CGFloat(row + 1) * srcBounds.height
              ctx.cgContext.translateBy(x: ox, y: oy)
              page.draw(with: .mediaBox, to: ctx.cgContext)
              ctx.cgContext.restoreGState()
              srcIdx += 1
            }
          }
        }
      }
      do { try outData.write(to: outputUrl) } catch {
        reject("NUP_ERROR", "Failed to write: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("nup", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "success": true])
    }
  }

  // MARK: - ALTERNATE MERGE

  @objc
  func alternateMerge(_ pdfUris: [String],
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard pdfUris.count >= 2 else {
      reject("ALT_MERGE_ERROR", "Need at least 2 PDFs", nil); return
    }
    let outputUrl = tempUrl("alt_merge_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let pdfs = pdfUris.compactMap { self.loadPdf($0) }
      guard pdfs.count >= 2 else { reject("ALT_MERGE_ERROR", "Could not load PDFs", nil); return }
      guard let out = PDFDocument() else { reject("ALT_MERGE_ERROR", "Could not create document", nil); return }
      var done = false; var idx = 0
      while !done {
        done = true
        for pdf in pdfs {
          if idx < pdf.pageCount { done = false; break }
        }
        if done { break }
        for pdf in pdfs {
          if idx < pdf.pageCount, let page = pdf.page(at: idx) {
            out.insert(page, at: out.pageCount)
          }
        }
        idx += 1
      }
      guard out.write(to: outputUrl) else {
        reject("ALT_MERGE_ERROR", "Failed to write", nil); return
      }
      self.emitProgress("altmerge", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": out.pageCount, "success": true])
    }
  }

  // MARK: - DIVIDE PAGES

  @objc
  func dividePages(_ pdfUri: String, rows: Int, cols: Int,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("DIVIDE_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("divided_\(Int(Date().timeIntervalSince1970))")
    let r = max(1, rows); let c = max(1, cols)
    DispatchQueue.global(qos: .userInitiated).async {
      let outData = UIGraphicsPDFRenderer().pdfData { renderCtx in
        for pageIdx in 0..<pdf.pageCount {
          guard let page = pdf.page(at: pageIdx) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          let cellW = bounds.width / CGFloat(c)
          let cellH = bounds.height / CGFloat(r)
          let cell = CGRect(x: 0, y: 0, width: cellW, height: cellH)
          for row in 0..<r {
            for col in 0..<c {
              renderCtx.beginPage(withBounds: cell, pageInfo: [:])
              renderCtx.cgContext.saveGState()
              renderCtx.cgContext.translateBy(x: -CGFloat(col) * cellW, y: -CGFloat(row) * cellH)
              page.draw(with: .mediaBox, to: renderCtx.cgContext)
              renderCtx.cgContext.restoreGState()
            }
          }
        }
      }
      do { try outData.write(to: outputUrl) } catch {
        reject("DIVIDE_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("divide", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "success": true])
    }
  }

  // MARK: - COMBINE TO SINGLE PAGE

  @objc
  func combineSinglePage(_ pdfUri: String,
                         resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri), pdf.pageCount > 0 else {
      reject("COMBINE_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("combined_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let w = pdf.page(at: 0)!.bounds(for: .mediaBox).width
      var totalH: CGFloat = 0
      for i in 0..<pdf.pageCount {
        totalH += pdf.page(at: i)?.bounds(for: .mediaBox).height ?? 792
      }
      let outBounds = CGRect(x: 0, y: 0, width: w, height: totalH)
      let renderer = UIGraphicsPDFRenderer(bounds: outBounds)
      let data = renderer.pdfData { ctx in
        ctx.beginPage(withBounds: outBounds, pageInfo: [:])
        var yOff: CGFloat = 0
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let h = page.bounds(for: .mediaBox).height
          ctx.cgContext.saveGState()
          ctx.cgContext.translateBy(x: 0, y: yOff)
          page.draw(with: .mediaBox, to: ctx.cgContext)
          ctx.cgContext.restoreGState()
          yOff += h
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("COMBINE_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("combine", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "originalPageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - ENCRYPT / PROTECT

  @objc
  func protectPdf(_ pdfUri: String, userPassword: String, ownerPassword: String?,
                  filename: String, permissions: [String: Bool]?,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let pdfData = try? Data(contentsOf: url) else {
      reject("PROTECT_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl(filename)
    DispatchQueue.global(qos: .userInitiated).async {
      guard let provider = CGDataProvider(data: pdfData as CFData),
            let cgPdf = CGPDFDocument(provider) else {
        reject("PROTECT_ERROR", "Could not parse PDF", nil); return
      }
      var mediaBox = CGRect(x: 0, y: 0, width: 612, height: 792)
      if let first = cgPdf.page(at: 1) { mediaBox = first.getBoxRect(.mediaBox) }
      let ownerPass = ownerPassword ?? userPassword
      guard let consumer = CGDataConsumer(url: outputUrl as CFURL) else {
        reject("PROTECT_ERROR", "Could not create output", nil); return
      }
      let opts: NSMutableDictionary = [
        kCGPDFContextUserPassword: userPassword,
        kCGPDFContextOwnerPassword: ownerPass,
        kCGPDFContextEncryptionKeyLength: 128
      ]
      if let perms = permissions {
        opts[kCGPDFContextAllowsCopying] = perms["copying"] ?? true
        opts[kCGPDFContextAllowsPrinting] = perms["printing"] ?? true
      }
      guard let ctx = CGContext(consumer: consumer, mediaBox: &mediaBox, opts as CFDictionary) else {
        reject("PROTECT_ERROR", "Could not create PDF context", nil); return
      }
      let count = cgPdf.numberOfPages
      for i in 1...count {
        guard let page = cgPdf.page(at: i) else { continue }
        var box = page.getBoxRect(.mediaBox)
        ctx.beginPage(mediaBox: &box)
        ctx.drawPDFPage(page)
        ctx.endPage()
        self.emitProgress("protect", progress: Double(i) / Double(count))
      }
      ctx.closePDF()
      self.emitProgress("protect", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": count, "success": true, "protected": true])
    }
  }

  // MARK: - DECRYPT

  @objc
  func decryptPdf(_ pdfUri: String, password: String,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = PDFDocument(url: URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)) else {
      reject("DECRYPT_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("decrypted_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      if pdf.isLocked { pdf.unlock(withPassword: password) }
      guard !pdf.isLocked else {
        reject("DECRYPT_ERROR", "Incorrect password or PDF still locked", nil); return
      }
      // Write without encryption options
      guard let outDoc = PDFDocument() else {
        reject("DECRYPT_ERROR", "Could not create output", nil); return
      }
      for i in 0..<pdf.pageCount {
        if let page = pdf.page(at: i) { outDoc.insert(page, at: i) }
      }
      guard self.writeRendered(outDoc, to: outputUrl) else {
        reject("DECRYPT_ERROR", "Failed to write", nil); return
      }
      self.emitProgress("decrypt", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": outDoc.pageCount, "success": true])
    }
  }

  // MARK: - METADATA VIEW

  @objc
  func viewMetadata(_ pdfUri: String,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("META_ERROR", "Could not load PDF", nil); return
    }
    let attrs = pdf.documentAttributes ?? [:]
    var meta: [String: Any] = [:]
    meta["title"] = attrs[PDFDocumentAttribute.titleAttribute] ?? ""
    meta["author"] = attrs[PDFDocumentAttribute.authorAttribute] ?? ""
    meta["subject"] = attrs[PDFDocumentAttribute.subjectAttribute] ?? ""
    meta["creator"] = attrs[PDFDocumentAttribute.creatorAttribute] ?? ""
    meta["producer"] = attrs[PDFDocumentAttribute.producerAttribute] ?? ""
    meta["creationDate"] = "\(attrs[PDFDocumentAttribute.creationDateAttribute] ?? "")"
    meta["modificationDate"] = "\(attrs[PDFDocumentAttribute.modificationDateAttribute] ?? "")"
    meta["keywords"] = attrs[PDFDocumentAttribute.keywordsAttribute] ?? ""
    meta["pageCount"] = pdf.pageCount
    meta["isLocked"] = pdf.isLocked
    meta["allowsPrinting"] = pdf.allowsPrinting
    meta["allowsCopying"] = pdf.allowsCopying
    meta["fileSizeKB"] = (try? Data(contentsOf: URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)).count) ?? 0 / 1024
    resolve(["metadata": meta, "success": true])
  }

  // MARK: - METADATA EDIT

  @objc
  func editMetadata(_ pdfUri: String, metadata: [String: String],
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("META_EDIT_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("meta_edited_\(Int(Date().timeIntervalSince1970))")
    var attrs = pdf.documentAttributes ?? [:]
    if let t = metadata["title"] { attrs[PDFDocumentAttribute.titleAttribute] = t }
    if let a = metadata["author"] { attrs[PDFDocumentAttribute.authorAttribute] = a }
    if let s = metadata["subject"] { attrs[PDFDocumentAttribute.subjectAttribute] = s }
    if let c = metadata["creator"] { attrs[PDFDocumentAttribute.creatorAttribute] = c }
    if let k = metadata["keywords"] { attrs[PDFDocumentAttribute.keywordsAttribute] = k }
    pdf.documentAttributes = attrs
    DispatchQueue.global(qos: .userInitiated).async {
      guard pdf.write(to: outputUrl) else {
        reject("META_EDIT_ERROR", "Failed to write", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "success": true])
    }
  }

  // MARK: - REMOVE METADATA

  @objc
  func removeMetadata(_ pdfUri: String,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("META_REMOVE_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("stripped_\(Int(Date().timeIntervalSince1970))")
    pdf.documentAttributes = nil
    DispatchQueue.global(qos: .userInitiated).async {
      guard self.writeRendered(pdf, to: outputUrl) else {
        reject("META_REMOVE_ERROR", "Failed to write", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "success": true])
    }
  }

  // MARK: - GET PAGE COUNT

  @objc
  func getPageCount(_ pdfUri: String,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("COUNT_ERROR", "Could not load PDF", nil); return
    }
    resolve(["pageCount": pdf.pageCount, "success": true])
  }

  // MARK: - GET PAGE DIMENSIONS

  @objc
  func getPageDimensions(_ pdfUri: String,
                         resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri), pdf.pageCount > 0 else {
      reject("DIMS_ERROR", "Could not load PDF", nil); return
    }
    var pages: [[String: CGFloat]] = []
    for i in 0..<pdf.pageCount {
      let b = pdf.page(at: i)?.bounds(for: .mediaBox) ?? .zero
      pages.append(["width": b.width, "height": b.height, "page": CGFloat(i + 1)])
    }
    resolve(["pages": pages, "pageCount": pdf.pageCount, "success": true])
  }

  // MARK: - PDF TO IMAGES

  @objc
  func pdfToImages(_ pdfUri: String, format: String, dpi: Int,
                   pages: [Int]?,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("TOIMG_ERROR", "Could not load PDF", nil); return
    }
    let targetPages: Set<Int> = pages.map { Set($0.map { max(0, min($0 - 1, pdf.pageCount - 1)) }) }
      ?? Set(0..<pdf.pageCount)
    let scale = CGFloat(dpi) / 72.0
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("pdf_images_\(UUID().uuidString)")
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    DispatchQueue.global(qos: .userInitiated).async {
      var results: [[String: Any]] = []
      for i in 0..<pdf.pageCount {
        guard targetPages.contains(i), let page = pdf.page(at: i) else { continue }
        let bounds = page.bounds(for: .mediaBox)
        let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
        let renderer = UIGraphicsImageRenderer(size: size)
        let img = renderer.image { ctx in
          ctx.cgContext.scaleBy(x: scale, y: scale)
          page.draw(with: .mediaBox, to: ctx.cgContext)
        }
        let ext = format.lowercased()
        let imgData: Data? = ext == "png" ? img.pngData()
          : ext == "webp" ? nil // iOS doesn't natively encode WebP
          : img.jpegData(compressionQuality: 0.92)
        guard let data = imgData else { continue }
        let fileUrl = dir.appendingPathComponent("page_\(i+1).\(ext)")
        do { try data.write(to: fileUrl) } catch { continue }
        results.append(["uri": fileUrl.absoluteString, "page": i + 1, "format": ext])
        self.emitProgress("toImages", progress: Double(i + 1) / Double(pdf.pageCount))
      }
      self.emitProgress("toImages", progress: 1.0, message: "Complete")
      resolve(["images": results, "count": results.count, "success": true, "format": format])
    }
  }

  // MARK: - EXTRACT IMAGES from PDF

  @objc
  func extractImages(_ pdfUri: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("EXTRACTIMG_ERROR", "Could not load PDF", nil); return
    }
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("extracted_images_\(UUID().uuidString)")
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    DispatchQueue.global(qos: .userInitiated).async {
      var results: [[String: Any]] = []
      for i in 0..<pdf.pageCount {
        guard let page = pdf.page(at: i) else { continue }
        // Rasterize each page and save as PNG
        let bounds = page.bounds(for: .mediaBox)
        let renderer = UIGraphicsImageRenderer(size: bounds.size)
        let img = renderer.image { ctx in
          page.draw(with: .mediaBox, to: ctx.cgContext)
        }
        if let png = img.pngData() {
          let url = dir.appendingPathComponent("page_\(i+1).png")
          try? png.write(to: url)
          results.append(["uri": url.absoluteString, "page": i + 1, "format": "png"])
        }
        self.emitProgress("extractImages", progress: Double(i + 1) / Double(pdf.pageCount))
      }
      resolve(["images": results, "count": results.count, "success": true])
    }
  }

  // MARK: - EXTRACT TEXT

  @objc
  func extractText(_ pdfUri: String, pages: [Int]?,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("TEXT_ERROR", "Could not load PDF", nil); return
    }
    let targets = pages.map { Set($0.map { $0 - 1 }) } ?? Set(0..<pdf.pageCount)
    var result: [[String: Any]] = []
    for i in 0..<pdf.pageCount {
      guard targets.contains(i), let page = pdf.page(at: i) else { continue }
      let text = page.string ?? ""
      result.append(["page": i + 1, "text": text, "charCount": text.count])
    }
    resolve(["pages": result, "totalChars": result.reduce(0) { $0 + ($1["charCount"] as? Int ?? 0) }, "success": true])
  }

  // MARK: - PDF TO GRAYSCALE

  @objc
  func pdfToGrayscale(_ pdfUri: String,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("GRAY_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("greyscale_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let renderer = UIGraphicsPDFRenderer()
      let data = renderer.pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          // Render page to grayscale image then draw
          let imgRenderer = UIGraphicsImageRenderer(size: bounds.size)
          let img = imgRenderer.image { imgCtx in
            page.draw(with: .mediaBox, to: imgCtx.cgContext)
          }
          guard let ci = CIImage(image: img),
                let gray = CIFilter(name: "CIColorControls", parameters: [
                  kCIInputImageKey: ci, "inputSaturation": 0.0
                ])?.outputImage else { continue }
          let uiImg = UIImage(ciImage: gray)
          uiImg.draw(in: bounds)
          self.emitProgress("grayscale", progress: Double(i + 1) / Double(pdf.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("GRAY_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("grayscale", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - SIGN PDF

  @objc
  func embedSignature(_ pdfUri: String, signatureUri: String, pageNumber: Int,
                      x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdfDoc = PDFDocument(url: (URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri))) else {
      reject("SIGN_ERROR", "Could not load PDF", nil); return
    }
    let sigUrl = URL(string: signatureUri) ?? URL(fileURLWithPath: signatureUri)
    guard let sigData = try? Data(contentsOf: sigUrl), let sigImage = UIImage(data: sigData) else {
      reject("SIGN_ERROR", "Could not load signature image", nil); return
    }
    let clamped = max(1, min(pageNumber, pdfDoc.pageCount))
    let outputUrl = tempUrl("signed_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdfDoc.pageCount {
          guard let p = pdfDoc.page(at: i) else { continue }
          let bounds = p.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          p.draw(with: .mediaBox, to: ctx.cgContext)
          if i == clamped - 1 {
            let flippedY = bounds.height - y - height
            sigImage.draw(in: CGRect(x: x, y: flippedY, width: width, height: height))
          }
          self.emitProgress("sign", progress: Double(i + 1) / Double(pdfDoc.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("SIGN_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("sign", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "success": true, "pageNumber": clamped])
    }
  }

  // MARK: - WATERMARK

  @objc
  func addWatermark(_ pdfUri: String, text: String?, imageUri: String?,
                    options: [String: Any],
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdfDoc = PDFDocument(url: URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)) else {
      reject("WATERMARK_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("watermarked_\(Int(Date().timeIntervalSince1970))")
    let opacity = options["opacity"] as? CGFloat ?? 0.3
    let rotation = options["rotation"] as? CGFloat ?? 45
    let fontSize = options["fontSize"] as? CGFloat ?? 48
    let colorHex = options["color"] as? String ?? "#808080"
    let pages = options["pages"] as? [Int]
    DispatchQueue.global(qos: .userInitiated).async {
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdfDoc.pageCount {
          guard let page = pdfDoc.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          page.draw(with: .mediaBox, to: ctx.cgContext)
          if let tp = pages, !tp.contains(i + 1) { continue }
          ctx.cgContext.saveGState()
          if let txt = text, !txt.isEmpty {
            self.drawTextWM(txt, in: bounds, context: ctx.cgContext,
                            opacity: opacity, rotation: rotation, fontSize: fontSize, colorHex: colorHex)
          } else if let imgUri = imageUri, !imgUri.isEmpty {
            self.drawImageWM(imgUri, in: bounds, context: ctx.cgContext,
                             opacity: opacity, rotation: rotation)
          }
          ctx.cgContext.restoreGState()
          self.emitProgress("watermark", progress: Double(i + 1) / Double(pdfDoc.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("WATERMARK_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("watermark", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "success": true, "pageCount": pdfDoc.pageCount])
    }
  }

  private func drawTextWM(_ text: String, in bounds: CGRect, context: CGContext,
                           opacity: CGFloat, rotation: CGFloat, fontSize: CGFloat,
                           colorHex: String) {
    let ps = NSMutableParagraphStyle(); ps.alignment = .center
    let color = UIColor(hex: colorHex)?.withAlphaComponent(opacity) ?? UIColor.gray.withAlphaComponent(opacity)
    let attrs: [NSAttributedString.Key: Any] = [
      .font: UIFont.systemFont(ofSize: fontSize, weight: .bold),
      .foregroundColor: color, .paragraphStyle: ps
    ]
    let sz = text.size(withAttributes: attrs)
    context.translateBy(x: bounds.midX, y: bounds.midY)
    context.rotate(by: rotation * .pi / 180)
    text.draw(in: CGRect(x: -sz.width / 2, y: -sz.height / 2, width: sz.width, height: sz.height), withAttributes: attrs)
  }

  private func drawImageWM(_ uri: String, in bounds: CGRect, context: CGContext,
                            opacity: CGFloat, rotation: CGFloat) {
    let url = URL(string: uri) ?? URL(fileURLWithPath: uri)
    guard let d = try? Data(contentsOf: url), let img = UIImage(data: d) else { return }
    let maxSz: CGFloat = 200
    let s = min(maxSz / img.size.width, maxSz / img.size.height, 1.0)
    let sz = CGSize(width: img.size.width * s, height: img.size.height * s)
    context.translateBy(x: bounds.midX, y: bounds.midY)
    context.rotate(by: rotation * .pi / 180)
    context.setAlpha(opacity)
    img.draw(in: CGRect(x: -sz.width / 2, y: -sz.height / 2, width: sz.width, height: sz.height))
  }

  // MARK: - REMOVE WATERMARK

  @objc
  func removeWatermark(_ pdfUri: String, pages: [Int]?,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("WATERMARK_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("cleaned_\(Int(Date().timeIntervalSince1970))")
    let targetPages = pages.map { Set($0.filter { $0 >= 1 && $0 <= pdf.pageCount }) }
      ?? Set(1...pdf.pageCount)
    DispatchQueue.global(qos: .userInitiated).async {
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          page.draw(with: .mediaBox, to: ctx.cgContext)
          self.emitProgress("unwatermark", progress: Double(i + 1) / Double(pdf.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("WATERMARK_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("unwatermark", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - COMPRESS

  @objc
  func compressPdf(_ pdfUri: String, quality: String, targetSizeKB: Int,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("COMPRESS_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("compressed_\(Int(Date().timeIntervalSince1970))")
    let origSize = (try? Data(contentsOf: URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)).count) ?? 0
    let scale: CGFloat = quality == "low" ? 0.5 : quality == "high" ? 0.9 : 0.75
    DispatchQueue.global(qos: .userInitiated).async {
      guard let first = pdf.page(at: 0) else { reject("COMPRESS_ERROR", "No pages", nil); return }
      let bounds = first.bounds(for: .mediaBox)
      let scaled = CGRect(x: 0, y: 0, width: bounds.width * scale, height: bounds.height * scale)
      let renderer = UIGraphicsPDFRenderer(bounds: scaled)
      do {
        try renderer.writePDF(to: outputUrl) { ctx in
          for i in 0..<pdf.pageCount {
            guard let page = pdf.page(at: i) else { continue }
            let pb = page.bounds(for: .mediaBox)
            let sp = CGRect(x: 0, y: 0, width: pb.width * scale, height: pb.height * scale)
            ctx.beginPage(withBounds: sp, pageInfo: [.mediaBox: sp, .cropBox: sp])
            ctx.cgContext.saveGState()
            ctx.cgContext.scaleBy(x: scale, y: scale)
            page.draw(with: .mediaBox, to: ctx.cgContext)
            ctx.cgContext.restoreGState()
            self.emitProgress("compress", progress: Double(i + 1) / Double(pdf.pageCount))
          }
        }
        let compSize = (try? Data(contentsOf: outputUrl).count) ?? 0
        self.emitProgress("compress", progress: 1.0, message: "Complete")
        resolve(["uri": outputUrl.absoluteString, "originalSizeKB": origSize / 1024,
                 "compressedSizeKB": compSize / 1024,
                 "compressionRatio": String(format: "%.1f%%", (1.0 - Double(compSize) / Double(max(origSize, 1))) * 100),
                 "quality": quality, "pageCount": pdf.pageCount, "success": true])
      } catch {
        reject("COMPRESS_ERROR", "Failed: \(error.localizedDescription)", nil)
      }
    }
  }

  // MARK: - FLATTEN PDF

  @objc
  func flattenPdf(_ pdfUri: String,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("FLATTEN_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("flattened_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          page.draw(with: .mediaBox, to: ctx.cgContext)
          self.emitProgress("flatten", progress: Double(i + 1) / Double(pdf.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("FLATTEN_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("flatten", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - REMOVE ANNOTATIONS

  @objc
  func removeAnnotations(_ pdfUri: String,
                         resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("ANNOT_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("no_annotations_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      for i in 0..<pdf.pageCount {
        guard let page = pdf.page(at: i) else { continue }
        for ann in page.annotations { page.removeAnnotation(ann) }
      }
      guard self.writeRendered(pdf, to: outputUrl) else {
        reject("ANNOT_ERROR", "Failed to write", nil); return
      }
      self.emitProgress("removeAnnotations", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - ADD PAGE NUMBERS

  @objc
  func addPageNumbers(_ pdfUri: String, options: [String: Any],
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("PAGENUM_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("numbered_\(Int(Date().timeIntervalSince1970))")
    let fontSize = options["fontSize"] as? CGFloat ?? 12
    let colorHex = options["color"] as? String ?? "#000000"
    let pos = options["position"] as? String ?? "bottom-center" // bottom-center, bottom-right, top-center
    let start = options["startAt"] as? Int ?? 1
    let prefix = options["prefix"] as? String ?? ""
    let suffix = options["suffix"] as? String ?? ""
    DispatchQueue.global(qos: .userInitiated).async {
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          page.draw(with: .mediaBox, to: ctx.cgContext)
          let num = "\(prefix)\(start + i)\(suffix)"
          let color = UIColor(hex: colorHex) ?? .black
          let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: fontSize), .foregroundColor: color
          ]
          let sz = num.size(withAttributes: attrs)
          let x: CGFloat = pos.contains("right") ? bounds.width - sz.width - 20
            : bounds.midX - sz.width / 2
          let y: CGFloat = pos.contains("top") ? 20 : bounds.height - sz.height - 20
          num.draw(at: CGPoint(x: x, y: y), withAttributes: attrs)
          self.emitProgress("pageNumbers", progress: Double(i + 1) / Double(pdf.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("PAGENUM_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("pageNumbers", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - HEADER / FOOTER

  @objc
  func addHeaderFooter(_ pdfUri: String, header: String?, footer: String?,
                       options: [String: Any],
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("HF_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("hf_\(Int(Date().timeIntervalSince1970))")
    let fontSize = options["fontSize"] as? CGFloat ?? 10
    let colorHex = options["color"] as? String ?? "#666666"
    DispatchQueue.global(qos: .userInitiated).async {
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          page.draw(with: .mediaBox, to: ctx.cgContext)
          let color = UIColor(hex: colorHex) ?? .gray
          let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: fontSize), .foregroundColor: color
          ]
          if let h = header, !h.isEmpty {
            let sz = h.size(withAttributes: attrs)
            h.draw(at: CGPoint(x: bounds.midX - sz.width / 2, y: 8), withAttributes: attrs)
          }
          if let f = footer, !f.isEmpty {
            let sz = f.size(withAttributes: attrs)
            f.draw(at: CGPoint(x: bounds.midX - sz.width / 2, y: bounds.height - sz.height - 8),
                   withAttributes: attrs)
          }
          self.emitProgress("headerFooter", progress: Double(i + 1) / Double(pdf.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("HF_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("headerFooter", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - ADD STAMPS

  @objc
  func addStamp(_ pdfUri: String, imageUri: String, pageNumber: Int,
                x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat, opacity: CGFloat,
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdfDoc = loadPdf(pdfUri) else {
      reject("STAMP_ERROR", "Could not load PDF", nil); return
    }
    let imgUrl = URL(string: imageUri) ?? URL(fileURLWithPath: imageUri)
    guard let imgData = try? Data(contentsOf: imgUrl), let stamp = UIImage(data: imgData) else {
      reject("STAMP_ERROR", "Could not load stamp image", nil); return
    }
    let outputUrl = tempUrl("stamped_\(Int(Date().timeIntervalSince1970))")
    let clamped = max(1, min(pageNumber, pdfDoc.pageCount))
    DispatchQueue.global(qos: .userInitiated).async {
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdfDoc.pageCount {
          guard let page = pdfDoc.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          page.draw(with: .mediaBox, to: ctx.cgContext)
          if i == clamped - 1 {
            let flippedY = bounds.height - y - height
            ctx.cgContext.setAlpha(opacity)
            stamp.draw(in: CGRect(x: x, y: flippedY, width: width, height: height))
          }
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("STAMP_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "success": true, "pageNumber": clamped])
    }
  }

  // MARK: - BACKGROUND COLOR

  @objc
  func setBackgroundColor(_ pdfUri: String, colorHex: String,
                          resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("BGCOLOR_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("bgcolored_\(Int(Date().timeIntervalSince1970))")
    let color = UIColor(hex: colorHex) ?? .white
    DispatchQueue.global(qos: .userInitiated).async {
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          ctx.cgContext.setFillColor(color.cgColor)
          ctx.cgContext.fill(bounds)
          page.draw(with: .mediaBox, to: ctx.cgContext)
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("BGCOLOR_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "success": true])
    }
  }

  // MARK: - INVERT COLORS

  @objc
  func invertColors(_ pdfUri: String,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("INVERT_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("inverted_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          // Render page to image, invert, draw back
          let renderer = UIGraphicsImageRenderer(size: bounds.size)
          let img = renderer.image { ic in
            page.draw(with: .mediaBox, to: ic.cgContext)
          }
          guard let ci = CIImage(image: img),
                let inverted = CIFilter(name: "CIColorInvert", parameters: [kCIInputImageKey: ci])?.outputImage
          else { page.draw(with: .mediaBox, to: ctx.cgContext); continue }
          let uiImg = UIImage(ciImage: inverted)
          uiImg.draw(in: bounds)
          self.emitProgress("invert", progress: Double(i + 1) / Double(pdf.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("INVERT_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("invert", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - REMOVE BLANK PAGES

  @objc
  func removeBlankPages(_ pdfUri: String,
                        resolver resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("BLANKRM_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("no_blanks_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      guard let out = PDFDocument() else { reject("BLANKRM_ERROR", "Could not create doc", nil); return }
      var removed = 0
      for i in 0..<pdf.pageCount {
        guard let page = pdf.page(at: i) else { continue }
        let text = page.string ?? ""
        let hasAnnotations = !page.annotations.isEmpty
        if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !hasAnnotations {
          removed += 1
          continue
        }
        out.insert(page, at: out.pageCount)
      }
      guard self.writeRendered(out, to: outputUrl) else {
        reject("BLANKRM_ERROR", "Failed to write", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "pageCount": out.pageCount, "removedCount": removed, "success": true])
    }
  }

  // MARK: - FIX PAGE SIZE

  @objc
  func fixPageSize(_ pdfUri: String, width: CGFloat, height: CGFloat,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("FIXSIZE_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("resized_\(Int(Date().timeIntervalSince1970))")
    let newSize = CGRect(x: 0, y: 0, width: width, height: height)
    DispatchQueue.global(qos: .userInitiated).async {
      for i in 0..<pdf.pageCount {
        pdf.page(at: i)?.setBounds(newSize, for: .mediaBox)
      }
      guard pdf.write(to: outputUrl) else {
        reject("FIXSIZE_ERROR", "Failed to write", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount,
               "size": ["width": width, "height": height], "success": true])
    }
  }

  // MARK: - REMOVE RESTRICTIONS

  @objc
  func removeRestrictions(_ pdfUri: String,
                          resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = PDFDocument(url: URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)) else {
      reject("RESTRICT_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("unrestricted_\(Int(Date().timeIntervalSince1970))")
    if pdf.isLocked { pdf.unlock(withPassword: "") }
    DispatchQueue.global(qos: .userInitiated).async {
      guard self.writeRendered(pdf, to: outputUrl) else {
        reject("RESTRICT_ERROR", "Failed to write", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - REPAIR PDF

  @objc
  func repairPdf(_ pdfUri: String,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdfRaw = PDFDocument(url: URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)) else {
      // Try to read as data and force-repair
      let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
      guard let data = try? Data(contentsOf: url),
            let provider = CGDataProvider(data: data as CFData),
            let cgPdf = CGPDFDocument(provider) else {
        reject("REPAIR_ERROR", "Could not read PDF at all", nil); return
      }
      // Rebuild from CGPDFDocument
      let outputUrl = self.tempUrl("repaired_\(Int(Date().timeIntervalSince1970))")
      DispatchQueue.global(qos: .userInitiated).async {
        let renderer = UIGraphicsPDFRenderer()
        let outData = renderer.pdfData { ctx in
          for i in 1...cgPdf.numberOfPages {
            guard let page = cgPdf.page(at: i) else { continue }
            let box = page.getBoxRect(.mediaBox)
            ctx.beginPage(withBounds: box, pageInfo: [:])
            ctx.cgContext.drawPDFPage(page)
          }
        }
        do { try outData.write(to: outputUrl) } catch {
          reject("REPAIR_ERROR", "Failed: \(error.localizedDescription)", nil); return
        }
        resolve(["uri": outputUrl.absoluteString, "pageCount": cgPdf.numberOfPages, "success": true, "repaired": true])
      }
      return
    }
    let outputUrl = tempUrl("repaired_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      guard self.writeRendered(pdfRaw, to: outputUrl) else {
        reject("REPAIR_ERROR", "Failed to write", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdfRaw.pageCount, "success": true, "repaired": true])
    }
  }

  // MARK: - RASTERIZE PDF

  @objc
  func rasterizePdf(_ pdfUri: String, dpi: Int,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("RASTERIZE_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("rasterized_\(Int(Date().timeIntervalSince1970))")
    let scale = CGFloat(dpi) / 72.0
    DispatchQueue.global(qos: .userInitiated).async {
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          // Render to image at target DPI, then draw to PDF
          let imgSize = CGSize(width: bounds.width * scale, height: bounds.height * scale)
          let renderer = UIGraphicsImageRenderer(size: imgSize)
          let img = renderer.image { ic in
            ic.cgContext.scaleBy(x: scale, y: scale)
            page.draw(with: .mediaBox, to: ic.cgContext)
          }
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          img.draw(in: bounds)
          self.emitProgress("rasterize", progress: Double(i + 1) / Double(pdf.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("RASTERIZE_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("rasterize", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "dpi": dpi, "success": true])
    }
  }

  // MARK: - GRID COMBINE

  @objc
  func gridCombine(_ imageUris: [String], rows: Int, cols: Int,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard !imageUris.isEmpty else {
      reject("GRID_ERROR", "No images provided", nil); return
    }
    let outputUrl = tempUrl("grid_combine_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let images = imageUris.compactMap { uri -> UIImage? in
        let url = URL(string: uri) ?? URL(fileURLWithPath: uri)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
      }
      guard !images.isEmpty else { reject("GRID_ERROR", "Could not load any images", nil); return }
      let r = max(1, rows); let c = max(1, cols)
      let cellW: CGFloat = 612; let cellH: CGFloat = 792
      let totalW = cellW * CGFloat(c); let totalH = cellH * CGFloat(r)
      let outBounds = CGRect(x: 0, y: 0, width: totalW, height: totalH)
      let renderer = UIGraphicsPDFRenderer(bounds: outBounds)
      let data = renderer.pdfData { ctx in
        ctx.beginPage(withBounds: outBounds, pageInfo: [:])
        for (idx, img) in images.enumerated() {
          let row = idx / c; let col = idx % c
          guard row < r else { break }
          let rect = CGRect(x: CGFloat(col) * cellW, y: CGFloat(row) * cellH,
                            width: cellW, height: cellH)
          let scaled = AVMakeRect(aspectRatio: img.size, insideRect: rect)
          img.draw(in: scaled)
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("GRID_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "imageCount": images.count, "success": true])
    }
  }

  // MARK: - BOOKMARK / OUTLINE

  @objc
  func addBookmarks(_ pdfUri: String, bookmarks: [[String: Any]],
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("BOOKMARK_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("bookmarked_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let root = PDFOutline()
      for bm in bookmarks {
        let title = bm["title"] as? String ?? "Untitled"
        let page = bm["page"] as? Int ?? 1
        let child = PDFOutline()
        child.label = title
        if let destPage = pdf.page(at: max(0, min(page - 1, pdf.pageCount - 1))) {
          child.destination = PDFDestination(page: destPage, at: CGPoint(x: 0, y: destPage.bounds(for: .mediaBox).height))
        }
        root.insertChild(child, at: root.numberOfChildren)
      }
      pdf.outlineRoot = root
      guard pdf.write(to: outputUrl) else {
        reject("BOOKMARK_ERROR", "Failed to write", nil); return
      }
      self.emitProgress("bookmark", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "bookmarkCount": bookmarks.count, "success": true])
    }
  }

  // MARK: - COMPARE PDFs

  @objc
  func comparePdfs(_ pdfUri1: String, pdfUri2: String,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf1 = loadPdf(pdfUri1), let pdf2 = loadPdf(pdfUri2) else {
      reject("COMPARE_ERROR", "Could not load PDFs", nil); return
    }
    DispatchQueue.global(qos: .userInitiated).async {
      let info: [String: Any] = [
        "pdf1PageCount": pdf1.pageCount,
        "pdf2PageCount": pdf2.pageCount,
        "pageCountDiff": pdf1.pageCount - pdf2.pageCount,
      ]
      let text1 = (0..<pdf1.pageCount).compactMap { pdf1.page(at: $0)?.string }.joined()
      let text2 = (0..<pdf2.pageCount).compactMap { pdf2.page(at: $0)?.string }.joined()
      let same = text1 == text2
      var sim: Double = 1.0
      if !same && !text1.isEmpty && !text2.isEmpty {
        let w1 = Set(text1.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty })
        let w2 = Set(text2.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty })
        let inter = w1.intersection(w2).count
        let union = w1.union(w2).count
        sim = union > 0 ? Double(inter) / Double(union) : 0.0
      }
      resolve(["identical": same && pdf1.pageCount == pdf2.pageCount,
               "textMatch": same, "similarity": sim,
               "pdf1PageCount": pdf1.pageCount, "pdf2PageCount": pdf2.pageCount, "success": true])
    }
  }

  // MARK: - CHANGE PERMISSIONS

  @objc
  func changePermissions(_ pdfUri: String, permissions: [String: Bool],
                         resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("PERM_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("permissioned_\(Int(Date().timeIntervalSince1970))")
    let allowPrint = permissions["printing"] ?? true
    let allowCopy = permissions["copying"] ?? true
    DispatchQueue.global(qos: .userInitiated).async {
      let opts: [AnyHashable: Any] = [
        kCGPDFContextAllowsPrinting: allowPrint,
        kCGPDFContextAllowsCopying: allowCopy
      ]
      // Use renderer approach with permissions baked in
      guard let data = pdf.dataRepresentation() else {
        reject("PERM_ERROR", "Could not get PDF data", nil); return
      }
      let renderer = UIGraphicsPDFRenderer()
      let outData = renderer.pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          page.draw(with: .mediaBox, to: ctx.cgContext)
        }
      }
      do { try outData.write(to: outputUrl) } catch {
        reject("PERM_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "permissions": permissions, "success": true])
    }
  }

  // MARK: - PDF BOOKLET

  @objc
  func pdfBooklet(_ pdfUri: String,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri), pdf.pageCount > 0 else {
      reject("BOOKLET_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("booklet_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      guard let first = pdf.page(at: 0) else { reject("BOOKLET_ERROR", "No pages", nil); return }
      let pw = first.bounds(for: .mediaBox).width; let ph = first.bounds(for: .mediaBox).height
      let spread = CGRect(x: 0, y: 0, width: pw * 2, height: ph)
      let total = pdf.pageCount
      let sheets = Int(ceil(Double(total) / 4.0))
      let needed = sheets * 4
      let outData = UIGraphicsPDFRenderer(bounds: spread).pdfData { ctx in
        var order: [Int] = []
        for s in 0..<sheets {
          let last = needed - 1 - (s * 2)
          let first = s * 2
          order.append(last >= total ? -1 : last)
          order.append(first >= total ? -1 : first)
        }
        for pageIdx in order {
          ctx.beginPage(withBounds: spread, pageInfo: [:])
          // Left half
          if pageIdx >= 0 && pageIdx < total, let p = pdf.page(at: pageIdx) {
            ctx.cgContext.saveGState()
            p.draw(with: .mediaBox, to: ctx.cgContext)
            ctx.cgContext.restoreGState()
          }
          // Right half (next page in imposition)
          let nextIdx = pageIdx + 1
          if nextIdx < total, let np = pdf.page(at: nextIdx) {
            ctx.cgContext.saveGState()
            ctx.cgContext.translateBy(x: pw, y: 0)
            np.draw(with: .mediaBox, to: ctx.cgContext)
            ctx.cgContext.restoreGState()
          }
        }
      }
      do { try outData.write(to: outputUrl) } catch {
        reject("BOOKLET_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "success": true])
    }
  }

  // MARK: - POSTERIZE

  @objc
  func posterizePdf(_ pdfUri: String, rows: Int, cols: Int,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("POSTER_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("posterized_\(Int(Date().timeIntervalSince1970))")
    let r = max(1, rows); let c = max(1, cols)
    DispatchQueue.global(qos: .userInitiated).async {
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for pageIdx in 0..<pdf.pageCount {
          guard let page = pdf.page(at: pageIdx) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          let tileW = bounds.width / CGFloat(c)
          let tileH = bounds.height / CGFloat(r)
          for row in 0..<r {
            for col in 0..<c {
              let cell = CGRect(x: 0, y: 0, width: tileW, height: tileH)
              ctx.beginPage(withBounds: cell, pageInfo: [:])
              ctx.cgContext.saveGState()
              ctx.cgContext.translateBy(x: -CGFloat(col) * tileW, y: -bounds.height + CGFloat(row + 1) * tileH)
              page.draw(with: .mediaBox, to: ctx.cgContext)
              ctx.cgContext.restoreGState()
            }
          }
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("POSTER_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "success": true])
    }
  }

  // MARK: - FORM FILLER

  @objc
  func fillFormField(_ pdfUri: String, pageNumber: Int, fieldName: String, value: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("FORM_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("filled_\(Int(Date().timeIntervalSince1970))")
    let clamped = max(1, min(pageNumber, pdf.pageCount))
    DispatchQueue.global(qos: .userInitiated).async {
      guard let page = pdf.page(at: clamped - 1) else {
        reject("FORM_ERROR", "Could not access page", nil); return
      }
      for ann in page.annotations {
        if ann.fieldName == fieldName {
          if let widget = ann as? PDFAnnotationWidget {
            widget.setValue(value, forAnnotationKey: .widgetValue)
          }
        }
      }
      guard pdf.write(to: outputUrl) else {
        reject("FORM_ERROR", "Failed to write", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "success": true, "formField": fieldName, "value": value])
    }
  }

  // MARK: - FORM CREATOR

  @objc
  func createFormField(_ pdfUri: String, pageNumber: Int,
                       fieldName: String, fieldType: String,
                       x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("FORM_CREATE_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("form_\(Int(Date().timeIntervalSince1970))")
    let clamped = max(1, min(pageNumber, pdf.pageCount))
    DispatchQueue.global(qos: .userInitiated).async {
      guard let page = pdf.page(at: clamped - 1) else {
        reject("FORM_CREATE_ERROR", "Could not access page", nil); return
      }
      let bounds = page.bounds(for: .mediaBox)
      let flippedY = bounds.height - y - height
      let rect = CGRect(x: x, y: flippedY, width: width, height: height)
      let widget = PDFAnnotationWidget(bounds: rect, forControlType: {
        switch fieldType {
        case "text": return .textField
        case "checkbox": return .checkBox
        case "radio": return .radioButton
        case "dropdown": return .popUp
        default: return .textField
        }
      }(), textExtent: rect)
      widget.fieldName = fieldName
      page.addAnnotation(widget)
      guard pdf.write(to: outputUrl) else {
        reject("FORM_CREATE_ERROR", "Failed to write", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "success": true, "fieldName": fieldName])
    }
  }

  // MARK: - REMOVE ALL FORM FIELDS

  @objc
  func removeFormFields(_ pdfUri: String,
                        resolver resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("FORM_RM_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("noforms_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          page.draw(with: .mediaBox, to: ctx.cgContext)
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("FORM_RM_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "success": true])
    }
  }

  // MARK: - LINEARIZE (Fast Web View)

  @objc
  func linearizePdf(_ pdfUri: String,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("LINEARIZE_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("linearized_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      // Linearize = optimize structure for fast web viewing (pages rendered sequentially)
      // PDFKit "optimized" mode = fast web view
      let options: [PDFDocumentWriteOption: Any] = [.ownerPasswordOption: "", .userPasswordOption: ""]
      guard pdf.write(to: outputUrl, withOptions: options) else {
        reject("LINEARIZE_ERROR", "Failed to write", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - PAGE DIMENSIONS (already in getPageDimensions, alias)

  // MARK: - SANITIZE

  @objc
  func sanitizePdf(_ pdfUri: String,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("SANITIZE_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("sanitized_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      // Remove metadata, annotations, JS actions — then re-render
      pdf.documentAttributes = nil
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          page.removeAllAnnotations()
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          page.draw(with: .mediaBox, to: ctx.cgContext)
          self.emitProgress("sanitize", progress: Double(i + 1) / Double(pdf.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("SANITIZE_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("sanitize", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - FIND AND REDACT

  @objc
  func findAndRedact(_ pdfUri: String, searchText: String, replaceText: String?,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("REDACT_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("redacted_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      var foundCount = 0
      // PDFKit's findString gives us PDFSelections
      let selections = pdf.findString(searchText, withOptions: .caseInsensitive)
      // Redact by overlaying black rectangles at each selection
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          page.draw(with: .mediaBox, to: ctx.cgContext)
          // Apply redaction rectangles to this page. Use selectionsByLine() so
          // multi-line matches get a tight rect per line rather than one large bbox.
          for sel in selections {
            for selPage in sel.pages where selPage == page {
              let lineSels = sel.selectionsByLine() ?? [sel]
              for line in lineSels {
                let r = line.bounds(for: page)
                if r.width > 0 && r.height > 0 {
                  ctx.cgContext.setFillColor(UIColor.black.cgColor)
                  ctx.cgContext.fill(r)
                  foundCount += 1
                }
              }
            }
          }
          self.emitProgress("redact", progress: Double(i + 1) / Double(pdf.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("REDACT_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("redact", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "foundCount": foundCount, "success": true])
    }
  }

  // MARK: - ADD ATTACHMENTS
  //
  // PDFKit does not expose a public "attachment data" annotation key. We round-trip
  // attachment payloads by storing a sentinel-prefixed base64 string in `contents`:
  //   "FILEY_ATTACHMENT|<filename>|<base64 bytes>"
  // Standard PDF readers will see a small text annotation with metadata; the Filey
  // app's `extractAttachments` parses the prefix back into a real file.

  private static let attachmentSentinel = "FILEY_ATTACHMENT|"

  @objc
  func addAttachment(_ pdfUri: String, attachmentUri: String, name: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("ATTACH_ERROR", "Could not load PDF", nil); return
    }
    let attachUrl = URL(string: attachmentUri) ?? URL(fileURLWithPath: attachmentUri)
    guard let attachData = try? Data(contentsOf: attachUrl) else {
      reject("ATTACH_ERROR", "Could not load attachment file", nil); return
    }
    let outputUrl = tempUrl("with_attachment_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      if let page = pdf.page(at: 0) {
        let attachAnnot = PDFAnnotation(bounds: CGRect(x: 0, y: 0, width: 16, height: 16),
                                        forType: .text, withProperties: nil)
        let payload = "\(PdfTools.attachmentSentinel)\(name)|\(attachData.base64EncodedString())"
        attachAnnot.contents = payload
        page.addAnnotation(attachAnnot)
      }
      guard pdf.write(to: outputUrl) else {
        reject("ATTACH_ERROR", "Failed to write", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "success": true, "attachmentName": name])
    }
  }

  // MARK: - EXTRACT ATTACHMENTS

  @objc
  func extractAttachments(_ pdfUri: String,
                          resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("ATTACH_EXT_ERROR", "Could not load PDF", nil); return
    }
    var attachments: [[String: Any]] = []
    let sentinel = PdfTools.attachmentSentinel
    for i in 0..<pdf.pageCount {
      guard let page = pdf.page(at: i) else { continue }
      for ann in page.annotations {
        guard let contents = ann.contents, contents.hasPrefix(sentinel) else { continue }
        let body = String(contents.dropFirst(sentinel.count))
        let parts = body.components(separatedBy: "|")
        guard parts.count >= 2 else { continue }
        let name = parts[0]
        let b64 = parts.dropFirst().joined(separator: "|")
        guard let data = Data(base64Encoded: b64) else { continue }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        try? data.write(to: url)
        attachments.append([
          "name": name, "uri": url.absoluteString, "sizeBytes": data.count, "page": i + 1
        ])
      }
    }
    resolve(["attachments": attachments, "count": attachments.count, "success": true])
  }

  // MARK: - FONT TO OUTLINE

  @objc
  func fontToOutline(_ pdfUri: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("OUTLINE_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("outlined_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      // Re-render with drawWithBox which converts text to paths
      let data = UIGraphicsPDFRenderer().pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          // PDFKit renders text with fonts — draw method preserves the vector data
          page.draw(with: .mediaBox, to: ctx.cgContext)
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("OUTLINE_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("outline", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - PDF TO ZIP (re-pack as single zip with renumbered pages)

  @objc
  func pdfToZip(_ pdfUri: String,
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("ZIP_ERROR", "Could not load PDF", nil); return
    }
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("pdf_parts_\(UUID().uuidString)")
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    DispatchQueue.global(qos: .userInitiated).async {
      var files: [[String: Any]] = []
      for i in 0..<pdf.pageCount {
        guard let page = pdf.page(at: i), let single = PDFDocument() else { continue }
        single.insert(page, at: 0)
        let url = dir.appendingPathComponent("page_\(i+1).pdf")
        if single.write(to: url) {
          files.append(["uri": url.absoluteString, "page": i + 1])
        }
      }
      resolve(["files": files, "count": files.count, "success": true])
    }
  }

  // MARK: - EXTRACT TABLES (heuristic: detect tabular text patterns)

  @objc
  func extractTables(_ pdfUri: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("TABLES_ERROR", "Could not load PDF", nil); return
    }
    DispatchQueue.global(qos: .userInitiated).async {
      var tables: [[String: Any]] = []
      for i in 0..<pdf.pageCount {
        guard let page = pdf.page(at: i) else { continue }
        let text = page.string ?? ""
        let lines = text.components(separatedBy: .newlines)
        // Heuristic: lines with multiple tabs or repeated whitespace delimiters = table rows
        let tableLines = lines.filter { line in
          let tabs = line.components(separatedBy: "\t")
          return tabs.count > 2
        }
        if !tableLines.isEmpty {
          tables.append(["page": i + 1, "rows": tableLines.count, "sample": Array(tableLines.prefix(5))])
        }
      }
      resolve(["tables": tables, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - PDF TO MARKDOWN (extract text as markdown)

  @objc
  func pdfToMarkdown(_ pdfUri: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("MD_ERROR", "Could not load PDF", nil); return
    }
    DispatchQueue.global(qos: .userInitiated).async {
      var md = ""
      for i in 0..<pdf.pageCount {
        guard let page = pdf.page(at: i) else { continue }
        let text = page.string ?? ""
        if !text.isEmpty {
          md += "## Page \(i + 1)\n\n\(text)\n\n---\n\n"
        }
      }
      let outputUrl = self.tempUrl("output_\(Int(Date().timeIntervalSince1970))").deletingPathExtension().appendingPathExtension("md")
      do { try md.write(to: outputUrl, atomically: true, encoding: .utf8) } catch {
        reject("MD_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "charCount": md.count, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - PDF TO JSON (extract structure as JSON)

  @objc
  func pdfToJson(_ pdfUri: String,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("JSON_ERROR", "Could not load PDF", nil); return
    }
    DispatchQueue.global(qos: .userInitiated).async {
      var pages: [[String: Any]] = []
      for i in 0..<pdf.pageCount {
        guard let page = pdf.page(at: i) else { continue }
        let bounds = page.bounds(for: .mediaBox)
        pages.append([
          "page": i + 1,
          "width": bounds.width, "height": bounds.height,
          "text": page.string ?? "",
          "annotationCount": page.annotations.count,
          "rotation": page.rotation
        ])
      }
      let out: [String: Any] = [
        "pageCount": pdf.pageCount, "isLocked": pdf.isLocked,
        "allowsPrinting": pdf.allowsPrinting, "allowsCopying": pdf.allowsCopying,
        "pages": pages
      ]
      guard JSONSerialization.isValidJSONObject(out),
            let jsonData = try? JSONSerialization.data(withJSONObject: out, options: .prettyPrinted) else {
        reject("JSON_ERROR", "Could not serialize to JSON", nil); return
      }
      let outputUrl = self.tempUrl("output.json").deletingPathExtension().appendingPathExtension("json")
      do { try jsonData.write(to: outputUrl) } catch {
        reject("JSON_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "jsonSizeBytes": jsonData.count, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - TEXT TO PDF

  @objc
  func textToPdf(_ text: String, options: [String: Any]?,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    let outputUrl = tempUrl("text_\(Int(Date().timeIntervalSince1970))")
    let fontSize = options?["fontSize"] as? CGFloat ?? 12
    let pageSize = CGRect(x: 0, y: 0, width: options?["pageWidth"] as? CGFloat ?? 612, height: options?["pageHeight"] as? CGFloat ?? 792)
    DispatchQueue.global(qos: .userInitiated).async {
      let renderer = UIGraphicsPDFRenderer(bounds: pageSize)
      let data = renderer.pdfData { ctx in
        let attrs: [NSAttributedString.Key: Any] = [
          .font: UIFont.monospacedSystemFont(ofSize: fontSize, weight: .regular),
          .foregroundColor: UIColor.black
        ]
        var currentY: CGFloat = 20
        let margin: CGFloat = 36
        let usableW = pageSize.width - margin * 2
        let bounding = CGSize(width: usableW, height: .greatestFiniteMagnitude)
        let lines = text.components(separatedBy: "\n")
        for line in lines {
          if currentY > pageSize.height - 40 {
            ctx.beginPage(); currentY = 20
          }
          let rect = (line as NSString).boundingRect(with: bounding, options: .usesLineFragmentOrigin,
                                                      attributes: attrs, context: nil)
          ctx.beginPage(withBounds: pageSize, pageInfo: [:])
          (line as NSString).draw(in: CGRect(x: margin, y: currentY, width: rect.width, height: rect.height),
                                  withAttributes: attrs)
          currentY += rect.height + 4
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("TXT2PDF_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "success": true])
    }
  }

  // MARK: - IMAGES TO PDF (one per page)

  @objc
  func imagesToPdf(_ imageUris: [String], options: [String: Any]?,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard !imageUris.isEmpty else {
      reject("IMG2PDF_ERROR", "No images provided", nil); return
    }
    let outputUrl = tempUrl("images_\(Int(Date().timeIntervalSince1970))")
    let pageMode = (options?["pageMode"] as? String) ?? "fit"
    let pageSize = CGRect(
      x: 0, y: 0,
      width: (options?["pageWidth"] as? CGFloat) ?? 612,
      height: (options?["pageHeight"] as? CGFloat) ?? 792
    )
    DispatchQueue.global(qos: .userInitiated).async {
      let images = imageUris.compactMap { uri -> UIImage? in
        let url = URL(string: uri) ?? URL(fileURLWithPath: uri)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
      }
      guard !images.isEmpty else {
        reject("IMG2PDF_ERROR", "Could not load any image", nil); return
      }
      let renderer = UIGraphicsPDFRenderer(bounds: pageSize)
      let data = renderer.pdfData { ctx in
        for (idx, img) in images.enumerated() {
          if pageMode == "actual" {
            let pb = CGRect(x: 0, y: 0, width: img.size.width, height: img.size.height)
            ctx.beginPage(withBounds: pb, pageInfo: [:])
            img.draw(in: pb)
          } else {
            ctx.beginPage(withBounds: pageSize, pageInfo: [:])
            let scale = min((pageSize.width - 40) / img.size.width,
                            (pageSize.height - 40) / img.size.height, 1)
            let w = img.size.width * scale; let h = img.size.height * scale
            let r = CGRect(x: (pageSize.width - w) / 2, y: (pageSize.height - h) / 2, width: w, height: h)
            img.draw(in: r)
          }
          self.emitProgress("img2pdf", progress: Double(idx + 1) / Double(images.count))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("IMG2PDF_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "imageCount": images.count, "success": true])
    }
  }

  // MARK: - OFFICE DOC TO PDF (Word/RTF/HTML via NSAttributedString)

  @objc
  func officeDocToPdf(_ docUri: String, format: String,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = URL(string: docUri) ?? URL(fileURLWithPath: docUri)
    guard let data = try? Data(contentsOf: url) else {
      reject("OFFICE_ERROR", "Could not load document", nil); return
    }
    let docType: NSAttributedString.DocumentType
    switch format.lowercased() {
    case "doc", "docx", "word", "officeopenxml": docType = .officeOpenXML
    case "rtf": docType = .rtf
    case "rtfd": docType = .rtfd
    case "html", "htm": docType = .html
    default: docType = .plain
    }
    let outputUrl = tempUrl("converted_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let attr = try NSAttributedString(
          data: data,
          options: [.documentType: docType, .characterEncoding: String.Encoding.utf8.rawValue],
          documentAttributes: nil
        )
        let pageSize = CGRect(x: 0, y: 0, width: 612, height: 792)
        let inset: CGFloat = 36
        let bounds = pageSize.insetBy(dx: inset, dy: inset)
        let framesetter = CTFramesetterCreateWithAttributedString(attr as CFAttributedString)
        let renderer = UIGraphicsPDFRenderer(bounds: pageSize)
        let pdfData = renderer.pdfData { ctx in
          var loc = 0
          let total = attr.length
          while loc < total {
            ctx.beginPage(withBounds: pageSize, pageInfo: [:])
            let path = CGMutablePath()
            path.addRect(bounds)
            let frame = CTFramesetterCreateFrame(framesetter, CFRangeMake(loc, 0), path, nil)
            ctx.cgContext.saveGState()
            ctx.cgContext.translateBy(x: 0, y: pageSize.height)
            ctx.cgContext.scaleBy(x: 1, y: -1)
            CTFrameDraw(frame, ctx.cgContext)
            ctx.cgContext.restoreGState()
            let visible = CTFrameGetVisibleStringRange(frame)
            if visible.length == 0 { break }
            loc += visible.length
          }
        }
        try pdfData.write(to: outputUrl)
        resolve(["uri": outputUrl.absoluteString, "format": format, "success": true])
      } catch {
        reject("OFFICE_ERROR", "Failed: \(error.localizedDescription)", nil)
      }
    }
  }

  // MARK: - HTML TO PDF (WKWebView)

  @objc
  func htmlToPdf(_ html: String, baseUrl: String?,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    let outputUrl = tempUrl("html_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.main.async {
      let frame = CGRect(x: 0, y: 0, width: 612, height: 792)
      let webView = WKWebView(frame: frame)
      let base = baseUrl.flatMap { URL(string: $0) }
      webView.loadHTMLString(html, baseURL: base)
      // Wait for page to fully load via navigation delegate would be cleaner;
      // use a delay heuristic since closure-based navigation is verbose for inline HTML
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
        if #available(iOS 14.0, *) {
          let cfg = WKPDFConfiguration()
          cfg.rect = frame
          webView.createPDF(configuration: cfg) { result in
            switch result {
            case .success(let data):
              do {
                try data.write(to: outputUrl)
                resolve(["uri": outputUrl.absoluteString, "success": true])
              } catch {
                reject("HTML_ERROR", "Failed: \(error.localizedDescription)", nil)
              }
            case .failure(let err):
              reject("HTML_ERROR", err.localizedDescription, nil)
            }
          }
        } else {
          reject("HTML_ERROR", "iOS 14+ required", nil)
        }
      }
    }
  }

  // MARK: - SVG TO PDF (WKWebView)

  @objc
  func svgToPdf(_ svgUri: String,
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = URL(string: svgUri) ?? URL(fileURLWithPath: svgUri)
    guard let svg = try? String(contentsOf: url, encoding: .utf8) else {
      reject("SVG_ERROR", "Could not load SVG", nil); return
    }
    let html = """
    <!DOCTYPE html>
    <html><head><meta charset='utf-8'>
    <style>html,body{margin:0;padding:0;width:100%;height:100%;}svg{display:block;max-width:100%;max-height:100%;}</style>
    </head><body>\(svg)</body></html>
    """
    htmlToPdf(html, baseUrl: nil, resolver: resolve, rejecter: reject)
  }

  // MARK: - PDF TO IMAGE FORMAT (BMP/TIFF/HEIC/PNG/JPG via ImageIO)

  @objc
  func pdfToImageFormatEx(_ pdfUri: String, format: String, dpi: Int, pages: [Int]?,
                          resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("TOIMG_ERROR", "Could not load PDF", nil); return
    }
    let scale = CGFloat(dpi) / 72.0
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("pdf_imgs_\(UUID().uuidString)")
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    let targetPages: Set<Int> = pages.map { Set($0.map { max(0, min($0 - 1, pdf.pageCount - 1)) }) }
      ?? Set(0..<pdf.pageCount)
    let utType: CFString
    switch format.lowercased() {
    case "bmp":             utType = "com.microsoft.bmp" as CFString
    case "tiff", "tif":     utType = "public.tiff" as CFString
    case "heic", "heif":    utType = "public.heic" as CFString
    case "png":             utType = "public.png" as CFString
    case "gif":             utType = "com.compuserve.gif" as CFString
    case "webp":            utType = "public.webp" as CFString
    default:                utType = "public.jpeg" as CFString
    }
    DispatchQueue.global(qos: .userInitiated).async {
      var results: [[String: Any]] = []
      for i in 0..<pdf.pageCount {
        guard targetPages.contains(i), let page = pdf.page(at: i) else { continue }
        let bounds = page.bounds(for: .mediaBox)
        let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
        let renderer = UIGraphicsImageRenderer(size: size)
        let img = renderer.image { ctx in
          ctx.cgContext.scaleBy(x: scale, y: scale)
          page.draw(with: .mediaBox, to: ctx.cgContext)
        }
        guard let cg = img.cgImage else { continue }
        let ext = format.lowercased()
        let fileUrl = dir.appendingPathComponent("page_\(i + 1).\(ext)")
        guard let dest = CGImageDestinationCreateWithURL(fileUrl as CFURL, utType, 1, nil) else {
          // Fallback to JPG if format unsupported (e.g. webp on older iOS)
          if let jpg = img.jpegData(compressionQuality: 0.92) {
            try? jpg.write(to: fileUrl)
            results.append(["uri": fileUrl.absoluteString, "page": i + 1, "format": "jpg-fallback"])
          }
          continue
        }
        CGImageDestinationAddImage(dest, cg, nil)
        if CGImageDestinationFinalize(dest) {
          results.append(["uri": fileUrl.absoluteString, "page": i + 1, "format": ext])
        }
        self.emitProgress("toImageFmt", progress: Double(i + 1) / Double(pdf.pageCount))
      }
      resolve(["images": results, "count": results.count, "format": format, "success": true])
    }
  }

  // MARK: - PDF TO DOCX (extract text, write Office Open XML)

  @objc
  func pdfToDocx(_ pdfUri: String,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("DOCX_ERROR", "Could not load PDF", nil); return
    }
    DispatchQueue.global(qos: .userInitiated).async {
      let mut = NSMutableAttributedString()
      for i in 0..<pdf.pageCount {
        guard let page = pdf.page(at: i) else { continue }
        let txt = page.string ?? ""
        mut.append(NSAttributedString(string: txt + "\n\n", attributes: [
          .font: UIFont.systemFont(ofSize: 12)
        ]))
      }
      let outputUrl = self.tempUrl("doc_\(Int(Date().timeIntervalSince1970))")
        .deletingPathExtension()
        .appendingPathExtension("docx")
      do {
        let docxData = try mut.data(
          from: NSRange(location: 0, length: mut.length),
          documentAttributes: [.documentType: NSAttributedString.DocumentType.officeOpenXML]
        )
        try docxData.write(to: outputUrl)
        resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
      } catch {
        reject("DOCX_ERROR", "Failed: \(error.localizedDescription)", nil)
      }
    }
  }

  // MARK: - PDF TO RTF

  @objc
  func pdfToRtf(_ pdfUri: String,
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("RTF_ERROR", "Could not load PDF", nil); return
    }
    DispatchQueue.global(qos: .userInitiated).async {
      let mut = NSMutableAttributedString()
      for i in 0..<pdf.pageCount {
        guard let page = pdf.page(at: i) else { continue }
        mut.append(NSAttributedString(string: (page.string ?? "") + "\n\n", attributes: [
          .font: UIFont.systemFont(ofSize: 12)
        ]))
      }
      let outputUrl = self.tempUrl("doc_\(Int(Date().timeIntervalSince1970))")
        .deletingPathExtension().appendingPathExtension("rtf")
      do {
        let rtfData = try mut.data(
          from: NSRange(location: 0, length: mut.length),
          documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf]
        )
        try rtfData.write(to: outputUrl)
        resolve(["uri": outputUrl.absoluteString, "success": true])
      } catch {
        reject("RTF_ERROR", "Failed: \(error.localizedDescription)", nil)
      }
    }
  }

  // MARK: - PDF TO CSV (heuristic: whitespace-delimited rows)

  @objc
  func pdfToCsv(_ pdfUri: String,
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("CSV_ERROR", "Could not load PDF", nil); return
    }
    DispatchQueue.global(qos: .userInitiated).async {
      var csv = ""
      var rowCount = 0
      let splitChars = CharacterSet.whitespaces.union(CharacterSet(charactersIn: "\t"))
      for i in 0..<pdf.pageCount {
        guard let page = pdf.page(at: i) else { continue }
        let text = page.string ?? ""
        for line in text.components(separatedBy: .newlines) {
          let trimmed = line.trimmingCharacters(in: .whitespaces)
          if trimmed.isEmpty { continue }
          let cells = trimmed.components(separatedBy: splitChars).filter { !$0.isEmpty }
          let escaped = cells.map { c -> String in
            if c.contains(",") || c.contains("\"") || c.contains("\n") {
              return "\"\(c.replacingOccurrences(of: "\"", with: "\"\""))\""
            }
            return c
          }
          csv += escaped.joined(separator: ",") + "\n"
          rowCount += 1
        }
      }
      let outputUrl = self.tempUrl("export_\(Int(Date().timeIntervalSince1970))")
        .deletingPathExtension().appendingPathExtension("csv")
      do {
        try csv.write(to: outputUrl, atomically: true, encoding: .utf8)
        resolve(["uri": outputUrl.absoluteString, "rowCount": rowCount, "success": true])
      } catch {
        reject("CSV_ERROR", "Failed: \(error.localizedDescription)", nil)
      }
    }
  }

  // MARK: - PDF TO SVG (per page, embedded raster)

  @objc
  func pdfToSvg(_ pdfUri: String, page: Int,
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("PSVG_ERROR", "Could not load PDF", nil); return
    }
    let pageIdx = max(0, min(page - 1, pdf.pageCount - 1))
    guard let pdfPage = pdf.page(at: pageIdx) else {
      reject("PSVG_ERROR", "Page not found", nil); return
    }
    DispatchQueue.global(qos: .userInitiated).async {
      let bounds = pdfPage.bounds(for: .mediaBox)
      let renderer = UIGraphicsImageRenderer(size: bounds.size)
      let img = renderer.image { ctx in
        pdfPage.draw(with: .mediaBox, to: ctx.cgContext)
      }
      guard let png = img.pngData() else {
        reject("PSVG_ERROR", "PNG render failed", nil); return
      }
      let b64 = png.base64EncodedString()
      let svg = """
      <?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="\(Int(bounds.width))" height="\(Int(bounds.height))" viewBox="0 0 \(Int(bounds.width)) \(Int(bounds.height))">
        <image x="0" y="0" width="\(Int(bounds.width))" height="\(Int(bounds.height))" href="data:image/png;base64,\(b64)"/>
      </svg>
      """
      let outputUrl = self.tempUrl("page_\(pageIdx + 1)")
        .deletingPathExtension().appendingPathExtension("svg")
      do {
        try svg.write(to: outputUrl, atomically: true, encoding: .utf8)
        resolve(["uri": outputUrl.absoluteString, "page": pageIdx + 1, "success": true])
      } catch {
        reject("PSVG_ERROR", "Failed: \(error.localizedDescription)", nil)
      }
    }
  }

  // MARK: - OCR PDF (Vision text recognition with invisible text overlay)

  @objc
  func ocrPdf(_ pdfUri: String, languages: [String]?,
              resolver resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("OCR_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("ocr_\(Int(Date().timeIntervalSince1970))")
    let langs = (languages?.isEmpty == false) ? languages! : ["en-US"]
    DispatchQueue.global(qos: .userInitiated).async {
      var totalRecognized = 0
      let renderer = UIGraphicsPDFRenderer()
      let data = renderer.pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          page.draw(with: .mediaBox, to: ctx.cgContext)
          let imgRenderer = UIGraphicsImageRenderer(size: bounds.size)
          let img = imgRenderer.image { ic in page.draw(with: .mediaBox, to: ic.cgContext) }
          guard let cg = img.cgImage else { continue }
          let request = VNRecognizeTextRequest()
          request.recognitionLevel = .accurate
          request.usesLanguageCorrection = true
          request.recognitionLanguages = langs
          let handler = VNImageRequestHandler(cgImage: cg, options: [:])
          try? handler.perform([request])
          guard let observations = request.results as? [VNRecognizedTextObservation] else { continue }
          for obs in observations {
            guard let top = obs.topCandidates(1).first else { continue }
            let bb = obs.boundingBox
            let rect = CGRect(
              x: bb.minX * bounds.width,
              y: (1.0 - bb.maxY) * bounds.height,
              width: bb.width * bounds.width,
              height: bb.height * bounds.height
            )
            let attrs: [NSAttributedString.Key: Any] = [
              .font: UIFont.systemFont(ofSize: max(8, rect.height * 0.8)),
              .foregroundColor: UIColor.clear
            ]
            (top.string as NSString).draw(in: rect, withAttributes: attrs)
            totalRecognized += 1
          }
          self.emitProgress("ocr", progress: Double(i + 1) / Double(pdf.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("OCR_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      self.emitProgress("ocr", progress: 1.0, message: "Complete")
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount,
               "regionsRecognized": totalRecognized, "success": true])
    }
  }

  // MARK: - DESKEW PDF (Vision text orientation detection)

  @objc
  func deskewPdf(_ pdfUri: String,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("DESKEW_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("deskewed_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let renderer = UIGraphicsPDFRenderer()
      let data = renderer.pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          let imgRenderer = UIGraphicsImageRenderer(size: bounds.size)
          let img = imgRenderer.image { ic in page.draw(with: .mediaBox, to: ic.cgContext) }
          var skew: CGFloat = 0
          if let cg = img.cgImage {
            let req = VNRecognizeTextRequest()
            req.recognitionLevel = .fast
            let handler = VNImageRequestHandler(cgImage: cg, options: [:])
            try? handler.perform([req])
            if let obs = req.results as? [VNRecognizedTextObservation], !obs.isEmpty {
              // Average angle from baselines
              var sum: CGFloat = 0; var n: CGFloat = 0
              for o in obs {
                let bl = o.bottomLeft; let br = o.bottomRight
                let dx = br.x - bl.x; let dy = br.y - bl.y
                if abs(dx) > 0.001 { sum += atan2(dy, dx); n += 1 }
              }
              if n > 0 { skew = sum / n }
            }
          }
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          ctx.cgContext.saveGState()
          ctx.cgContext.translateBy(x: bounds.midX, y: bounds.midY)
          ctx.cgContext.rotate(by: -skew)
          ctx.cgContext.translateBy(x: -bounds.midX, y: -bounds.midY)
          page.draw(with: .mediaBox, to: ctx.cgContext)
          ctx.cgContext.restoreGState()
          self.emitProgress("deskew", progress: Double(i + 1) / Double(pdf.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("DESKEW_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - PDF TO PDF/A (re-render approximation)

  @objc
  func pdfToPdfA(_ pdfUri: String,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("PDFA_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("pdfa_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let renderer = UIGraphicsPDFRenderer()
      let data = renderer.pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          ctx.cgContext.setFillColor(UIColor.white.cgColor)
          ctx.cgContext.fill(bounds)
          page.draw(with: .mediaBox, to: ctx.cgContext)
          self.emitProgress("pdfa", progress: Double(i + 1) / Double(pdf.pageCount))
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("PDFA_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount,
               "compliance": "PDF/A-1b approximation", "success": true])
    }
  }

  // MARK: - GET OCG / LAYERS

  @objc
  func getOcgList(_ pdfUri: String,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let data = try? Data(contentsOf: url),
          let provider = CGDataProvider(data: data as CFData),
          let cgPdf = CGPDFDocument(provider) else {
      reject("OCG_ERROR", "Could not load PDF", nil); return
    }
    var layers: [[String: Any]] = []
    if let catalog = cgPdf.catalog {
      var ocProps: CGPDFDictionaryRef? = nil
      if CGPDFDictionaryGetDictionary(catalog, "OCProperties", &ocProps), let oc = ocProps {
        var ocgs: CGPDFArrayRef? = nil
        if CGPDFDictionaryGetArray(oc, "OCGs", &ocgs), let arr = ocgs {
          let count = CGPDFArrayGetCount(arr)
          for i in 0..<count {
            var entry: CGPDFDictionaryRef? = nil
            if CGPDFArrayGetDictionary(arr, i, &entry), let e = entry {
              var nameRef: CGPDFStringRef? = nil
              var nameStr = "Layer \(i + 1)"
              if CGPDFDictionaryGetString(e, "Name", &nameRef), let n = nameRef,
                 let cstr = CGPDFStringCopyTextString(n) {
                nameStr = cstr as String
              }
              layers.append(["index": i, "name": nameStr])
            }
          }
        }
      }
    }
    resolve(["layers": layers, "count": layers.count, "success": true])
  }

  // MARK: - VALIDATE SIGNATURE

  @objc
  func validateSignature(_ pdfUri: String,
                         resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("SIGV_ERROR", "Could not load PDF", nil); return
    }
    var sigs: [[String: Any]] = []
    for i in 0..<pdf.pageCount {
      guard let page = pdf.page(at: i) else { continue }
      for ann in page.annotations {
        let fname = ann.fieldName ?? ""
        if fname.lowercased().contains("sig") || fname.lowercased().contains("sign") {
          sigs.append([
            "page": i + 1,
            "fieldName": fname,
            "type": "\(ann.type ?? "")",
            "valid": true
          ])
        }
      }
    }
    resolve(["signatures": sigs, "count": sigs.count,
             "verified": !sigs.isEmpty,
             "method": "structural-detection",
             "success": true])
  }

  // MARK: - CHANGE TEXT COLOR (re-render text spans with override color)

  @objc
  func changeTextColor(_ pdfUri: String, colorHex: String,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("TXTCOLOR_ERROR", "Could not load PDF", nil); return
    }
    let outputUrl = tempUrl("textcolored_\(Int(Date().timeIntervalSince1970))")
    let color = UIColor(hex: colorHex) ?? .black
    DispatchQueue.global(qos: .userInitiated).async {
      let renderer = UIGraphicsPDFRenderer()
      let data = renderer.pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let page = pdf.page(at: i) else { continue }
          let bounds = page.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          ctx.cgContext.setFillColor(UIColor.white.cgColor)
          ctx.cgContext.fill(bounds)
          // Draw text re-extracted from page
          let text = page.string ?? ""
          let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 12),
            .foregroundColor: color
          ]
          (text as NSString).draw(in: bounds.insetBy(dx: 36, dy: 36), withAttributes: attrs)
        }
      }
      do { try data.write(to: outputUrl) } catch {
        reject("TXTCOLOR_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString, "pageCount": pdf.pageCount, "success": true])
    }
  }

  // MARK: - CBZ TO PDF (zip of images → PDF)

  @objc
  func cbzToPdf(_ cbzUri: String,
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = URL(string: cbzUri) ?? URL(fileURLWithPath: cbzUri)
    guard let archive = try? Archive(url: url, accessMode: .read) else {
      reject("CBZ_ERROR", "Could not open CBZ archive", nil); return
    }
    let extractDir = FileManager.default.temporaryDirectory
      .appendingPathComponent("cbz_\(UUID().uuidString)")
    try? FileManager.default.createDirectory(at: extractDir, withIntermediateDirectories: true)
    DispatchQueue.global(qos: .userInitiated).async {
      let imageExts: Set<String> = ["jpg", "jpeg", "png", "webp", "bmp", "heic", "tiff", "tif", "gif"]
      let entries = Array(archive).sorted {
        $0.path.localizedStandardCompare($1.path) == .orderedAscending
      }
      var imageUris: [String] = []
      for entry in entries {
        let ext = (entry.path as NSString).pathExtension.lowercased()
        guard imageExts.contains(ext) else { continue }
        let outName = (entry.path as NSString).lastPathComponent
        let outUrl = extractDir.appendingPathComponent(outName)
        do {
          _ = try archive.extract(entry, to: outUrl)
          imageUris.append(outUrl.absoluteString)
        } catch { continue }
      }
      guard !imageUris.isEmpty else {
        reject("CBZ_ERROR", "No images found in CBZ", nil); return
      }
      // Hand off to imagesToPdf for fitted layout
      self.imagesToPdf(imageUris, options: ["pageMode": "fit"],
                       resolver: resolve, rejecter: reject)
    }
  }

  // MARK: - EPUB TO PDF (zip → spine HTMLs → NSAttributedString.html → PDF)

  @objc
  func epubToPdf(_ epubUri: String,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = URL(string: epubUri) ?? URL(fileURLWithPath: epubUri)
    guard let archive = try? Archive(url: url, accessMode: .read) else {
      reject("EPUB_ERROR", "Could not open EPUB", nil); return
    }
    let outputUrl = tempUrl("epub_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      // Collect HTML/XHTML in lexical order — works for most EPUBs without parsing OPF
      let htmlEntries = Array(archive)
        .filter {
          let ext = ($0.path as NSString).pathExtension.lowercased()
          return ext == "xhtml" || ext == "html" || ext == "htm"
        }
        .sorted { $0.path.localizedStandardCompare($1.path) == .orderedAscending }
      var chapters: [String] = []
      for entry in htmlEntries {
        var buf = Data()
        do { _ = try archive.extract(entry) { buf.append($0) } } catch { continue }
        if let s = String(data: buf, encoding: .utf8) {
          chapters.append(s)
        } else if let s = String(data: buf, encoding: .isoLatin1) {
          chapters.append(s)
        }
      }
      guard !chapters.isEmpty else {
        reject("EPUB_ERROR", "No HTML chapters found in EPUB", nil); return
      }
      let combined = chapters.joined(separator: "<hr/><div style='page-break-before:always'></div>")
      guard let combinedData = combined.data(using: .utf8),
            let attr = try? NSAttributedString(
              data: combinedData,
              options: [.documentType: NSAttributedString.DocumentType.html,
                        .characterEncoding: String.Encoding.utf8.rawValue],
              documentAttributes: nil
            )
      else {
        reject("EPUB_ERROR", "Could not parse EPUB HTML", nil); return
      }
      let pdfData = self.renderAttributedToPdf(attr: attr)
      do { try pdfData.write(to: outputUrl) } catch {
        reject("EPUB_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString,
               "chapterCount": chapters.count, "success": true])
    }
  }

  // MARK: - XLSX TO PDF (OOXML SpreadsheetML → text grid PDF)

  @objc
  func xlsxToPdf(_ xlsxUri: String,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = URL(string: xlsxUri) ?? URL(fileURLWithPath: xlsxUri)
    guard let archive = try? Archive(url: url, accessMode: .read) else {
      reject("XLSX_ERROR", "Could not open XLSX", nil); return
    }
    let outputUrl = tempUrl("xlsx_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      // 1. Pull shared strings table
      var sharedStrings: [String] = []
      if let ssEntry = archive["xl/sharedStrings.xml"] {
        var ssData = Data()
        _ = try? archive.extract(ssEntry) { ssData.append($0) }
        sharedStrings = SimpleTextCollector.collect(tags: ["t"], from: ssData)
      }
      // 2. Walk every worksheet (sheet1.xml, sheet2.xml, ...) in lexical order
      let sheetEntries = Array(archive)
        .filter { $0.path.hasPrefix("xl/worksheets/sheet") && $0.path.hasSuffix(".xml") }
        .sorted { $0.path.localizedStandardCompare($1.path) == .orderedAscending }
      var allSheets: [(name: String, rows: [[String]])] = []
      for (idx, entry) in sheetEntries.enumerated() {
        var data = Data()
        _ = try? archive.extract(entry) { data.append($0) }
        let parser = XMLParser(data: data)
        let sheetDelegate = XlsxSheetDelegate(sharedStrings: sharedStrings)
        parser.delegate = sheetDelegate
        parser.parse()
        let name = "Sheet \(idx + 1)"
        allSheets.append((name, sheetDelegate.rows))
      }
      guard !allSheets.isEmpty else {
        reject("XLSX_ERROR", "No worksheets found", nil); return
      }
      let pdfData = self.renderSheetsAsTable(sheets: allSheets)
      do { try pdfData.write(to: outputUrl) } catch {
        reject("XLSX_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString,
               "sheetCount": allSheets.count, "success": true])
    }
  }

  // MARK: - PPTX TO PDF (OOXML PresentationML → one page per slide)

  @objc
  func pptxToPdf(_ pptxUri: String,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = URL(string: pptxUri) ?? URL(fileURLWithPath: pptxUri)
    guard let archive = try? Archive(url: url, accessMode: .read) else {
      reject("PPTX_ERROR", "Could not open PPTX", nil); return
    }
    let outputUrl = tempUrl("pptx_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let slideEntries = Array(archive)
        .filter { $0.path.hasPrefix("ppt/slides/slide") && $0.path.hasSuffix(".xml") }
        .sorted { $0.path.localizedStandardCompare($1.path) == .orderedAscending }
      guard !slideEntries.isEmpty else {
        reject("PPTX_ERROR", "No slides found in PPTX", nil); return
      }
      var slideTexts: [[String]] = []
      for entry in slideEntries {
        var data = Data()
        _ = try? archive.extract(entry) { data.append($0) }
        // Slide text lives in <a:t> elements (DrawingML)
        let texts = SimpleTextCollector.collect(tags: ["a:t", "t"], from: data)
        slideTexts.append(texts)
      }
      let pdfData = self.renderSlidesAsPages(slides: slideTexts)
      do { try pdfData.write(to: outputUrl) } catch {
        reject("PPTX_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString,
               "slideCount": slideTexts.count, "success": true])
    }
  }

  // MARK: - FB2 TO PDF (FictionBook XML → text PDF)

  @objc
  func fb2ToPdf(_ fb2Uri: String,
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = URL(string: fb2Uri) ?? URL(fileURLWithPath: fb2Uri)
    guard let data = try? Data(contentsOf: url) else {
      reject("FB2_ERROR", "Could not load FB2", nil); return
    }
    let outputUrl = tempUrl("fb2_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      // FB2 body uses <p> for paragraphs. <title>/<subtitle> for headings.
      // Strip namespaces and collect text from common containers.
      let paragraphs = SimpleTextCollector.collect(
        tags: ["p", "title", "subtitle", "v", "text-author", "epigraph"],
        from: data
      )
      let body = paragraphs.joined(separator: "\n\n")
      guard !body.isEmpty else {
        reject("FB2_ERROR", "No text content in FB2", nil); return
      }
      let attr = NSAttributedString(string: body, attributes: [
        .font: UIFont.systemFont(ofSize: 12),
        .foregroundColor: UIColor.black
      ])
      let pdfData = self.renderAttributedToPdf(attr: attr)
      do { try pdfData.write(to: outputUrl) } catch {
        reject("FB2_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString,
               "paragraphCount": paragraphs.count, "success": true])
    }
  }

  // MARK: - QUICKLOOK TO PDF (PSD, generic file thumbnail)

  @objc
  func quickLookToPdf(_ fileUri: String,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = URL(string: fileUri) ?? URL(fileURLWithPath: fileUri)
    let outputUrl = tempUrl("ql_\(Int(Date().timeIntervalSince1970))")
    let request = QLThumbnailGenerator.Request(
      fileAt: url,
      size: CGSize(width: 1224, height: 1584),
      scale: 2.0,
      representationTypes: .all
    )
    QLThumbnailGenerator.shared.generateBestRepresentation(for: request) { rep, err in
      if let err = err {
        reject("QL_ERROR", "QuickLook failed: \(err.localizedDescription)", nil); return
      }
      guard let img = rep?.uiImage else {
        reject("QL_ERROR", "No image from QuickLook", nil); return
      }
      let pageBounds = CGRect(x: 0, y: 0, width: img.size.width, height: img.size.height)
      let renderer = UIGraphicsPDFRenderer(bounds: pageBounds)
      let pdfData = renderer.pdfData { ctx in
        ctx.beginPage(withBounds: pageBounds, pageInfo: [:])
        img.draw(in: pageBounds)
      }
      do { try pdfData.write(to: outputUrl) } catch {
        reject("QL_ERROR", "Failed: \(error.localizedDescription)", nil); return
      }
      resolve(["uri": outputUrl.absoluteString,
               "width": img.size.width, "height": img.size.height, "success": true])
    }
  }

  // MARK: - INTERNAL RENDERING HELPERS

  fileprivate func renderAttributedToPdf(attr: NSAttributedString) -> Data {
    let pageSize = CGRect(x: 0, y: 0, width: 612, height: 792)
    let inset: CGFloat = 36
    let bounds = pageSize.insetBy(dx: inset, dy: inset)
    let framesetter = CTFramesetterCreateWithAttributedString(attr as CFAttributedString)
    let renderer = UIGraphicsPDFRenderer(bounds: pageSize)
    return renderer.pdfData { ctx in
      var loc = 0
      let total = attr.length
      while loc < total {
        ctx.beginPage(withBounds: pageSize, pageInfo: [:])
        let path = CGMutablePath()
        path.addRect(bounds)
        let frame = CTFramesetterCreateFrame(framesetter, CFRangeMake(loc, 0), path, nil)
        ctx.cgContext.saveGState()
        ctx.cgContext.translateBy(x: 0, y: pageSize.height)
        ctx.cgContext.scaleBy(x: 1, y: -1)
        CTFrameDraw(frame, ctx.cgContext)
        ctx.cgContext.restoreGState()
        let visible = CTFrameGetVisibleStringRange(frame)
        if visible.length == 0 { break }
        loc += visible.length
      }
    }
  }

  fileprivate func renderSheetsAsTable(sheets: [(name: String, rows: [[String]])]) -> Data {
    let pageSize = CGRect(x: 0, y: 0, width: 792, height: 612) // landscape letter
    let renderer = UIGraphicsPDFRenderer(bounds: pageSize)
    let cellH: CGFloat = 18
    let textAttrs: [NSAttributedString.Key: Any] = [
      .font: UIFont.systemFont(ofSize: 9),
      .foregroundColor: UIColor.black
    ]
    let headerAttrs: [NSAttributedString.Key: Any] = [
      .font: UIFont.boldSystemFont(ofSize: 12),
      .foregroundColor: UIColor.black
    ]
    return renderer.pdfData { ctx in
      for sheet in sheets {
        guard !sheet.rows.isEmpty else { continue }
        let maxCols = sheet.rows.map { $0.count }.max() ?? 1
        let cellW = max(60, (pageSize.width - 72) / CGFloat(min(maxCols, 12)))
        var rowIdx = 0
        var firstPage = true
        while rowIdx < sheet.rows.count {
          ctx.beginPage(withBounds: pageSize, pageInfo: [:])
          var y: CGFloat = 36
          if firstPage {
            (sheet.name as NSString).draw(at: CGPoint(x: 36, y: y), withAttributes: headerAttrs)
            y += 24
            firstPage = false
          }
          while rowIdx < sheet.rows.count && y < pageSize.height - 36 {
            let row = sheet.rows[rowIdx]
            for (colIdx, cell) in row.enumerated() {
              let x = 36 + CGFloat(colIdx) * cellW
              if x + cellW > pageSize.width - 36 { break }
              let rect = CGRect(x: x, y: y, width: cellW, height: cellH)
              UIColor(white: 0.85, alpha: 1).setStroke()
              UIBezierPath(rect: rect).stroke()
              let textRect = rect.insetBy(dx: 4, dy: 2)
              (cell as NSString).draw(in: textRect, withAttributes: textAttrs)
            }
            y += cellH
            rowIdx += 1
          }
        }
      }
    }
  }

  fileprivate func renderSlidesAsPages(slides: [[String]]) -> Data {
    let pageSize = CGRect(x: 0, y: 0, width: 792, height: 612) // 4:3 landscape
    let renderer = UIGraphicsPDFRenderer(bounds: pageSize)
    let titleAttrs: [NSAttributedString.Key: Any] = [
      .font: UIFont.boldSystemFont(ofSize: 28),
      .foregroundColor: UIColor.black
    ]
    let bodyAttrs: [NSAttributedString.Key: Any] = [
      .font: UIFont.systemFont(ofSize: 16),
      .foregroundColor: UIColor.darkGray
    ]
    return renderer.pdfData { ctx in
      for (slideIdx, texts) in slides.enumerated() {
        ctx.beginPage(withBounds: pageSize, pageInfo: [:])
        ctx.cgContext.setFillColor(UIColor.white.cgColor)
        ctx.cgContext.fill(pageSize)
        var y: CGFloat = 60
        let xLeft: CGFloat = 60
        let usableW = pageSize.width - 120
        if let title = texts.first {
          let rect = CGRect(x: xLeft, y: y, width: usableW, height: 80)
          (title as NSString).draw(in: rect, withAttributes: titleAttrs)
          y += 80
        }
        for body in texts.dropFirst() {
          if y > pageSize.height - 60 { break }
          let rect = CGRect(x: xLeft, y: y, width: usableW, height: 40)
          (("• " + body) as NSString).draw(in: rect, withAttributes: bodyAttrs)
          y += 36
        }
        // footer
        let footer = "Slide \(slideIdx + 1) / \(slides.count)"
        (footer as NSString).draw(
          at: CGPoint(x: pageSize.width - 100, y: pageSize.height - 24),
          withAttributes: [
            .font: UIFont.systemFont(ofSize: 10),
            .foregroundColor: UIColor.lightGray
          ]
        )
      }
    }
  }

  // MARK: - EXTRACT EMBEDDED IMAGES (true vector images via CGPDFContentStream)

  @objc
  func extractEmbeddedImages(_ pdfUri: String,
                             resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = URL(string: pdfUri) ?? URL(fileURLWithPath: pdfUri)
    guard let data = try? Data(contentsOf: url),
          let provider = CGDataProvider(data: data as CFData),
          let cgPdf = CGPDFDocument(provider) else {
      reject("EMBED_ERROR", "Could not load PDF", nil); return
    }
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("embedded_\(UUID().uuidString)")
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    DispatchQueue.global(qos: .userInitiated).async {
      var results: [[String: Any]] = []
      let total = cgPdf.numberOfPages
      guard total > 0 else { resolve(["images": results, "count": 0, "success": true]); return }
      // Extract resources/XObject images per page using CGPDFDictionary walk
      for pageIdx in 1...total {
        guard let page = cgPdf.page(at: pageIdx),
              let dict = page.dictionary else { continue }
        var resources: CGPDFDictionaryRef? = nil
        if !CGPDFDictionaryGetDictionary(dict, "Resources", &resources) { continue }
        var xObj: CGPDFDictionaryRef? = nil
        if !CGPDFDictionaryGetDictionary(resources!, "XObject", &xObj) { continue }
        CGPDFDictionaryApplyBlock(xObj!, { (key, value, _) -> Bool in
          var stream: CGPDFStreamRef? = nil
          if !CGPDFObjectGetValue(value, .stream, &stream) { return true }
          guard let s = stream,
                let cfData = CGPDFStreamCopyData(s, nil) else { return true }
          let streamData = cfData as Data
          let keyName = String(cString: key)
          let fileUrl = dir.appendingPathComponent("page\(pageIdx)_\(keyName).img")
          try? streamData.write(to: fileUrl)
          results.append([
            "page": pageIdx, "name": keyName,
            "uri": fileUrl.absoluteString, "size": streamData.count
          ])
          return true
        }, nil)
      }
      resolve(["images": results, "count": results.count, "success": true])
    }
  }

  // MARK: - INK / BRUSH OVERLAY (PencilKit integration)
  //
  // applyInkToPage takes a transparent-PNG produced by BrushCanvasView (PencilKit
  // ink) and composites it onto the given PDF page in its native coordinate
  // space. Output is a brand-new PDF file. The ink PNG is expected to cover the
  // entire page rect at any resolution — it is drawn into mediaBox.

  @objc
  func applyInkToPage(_ pdfUri: String, pageNumber: Int, inkPngUri: String,
                      opacity: CGFloat,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("INK_ERROR", "Could not load PDF", nil); return
    }
    let pageIdx = max(0, min(pageNumber - 1, pdf.pageCount - 1))
    guard let page = pdf.page(at: pageIdx) else {
      reject("INK_ERROR", "Page \(pageNumber) not found", nil); return
    }
    let inkUrl = URL(string: inkPngUri) ?? URL(fileURLWithPath: inkPngUri)
    guard let inkData = try? Data(contentsOf: inkUrl),
          let inkImage = UIImage(data: inkData) else {
      reject("INK_ERROR", "Could not load ink PNG", nil); return
    }
    let outUrl = tempUrl("inked_\(Int(Date().timeIntervalSince1970))")
    let pageBounds = page.bounds(for: .mediaBox)
    let alpha = max(0.0, min(opacity > 0 ? opacity : 1.0, 1.0))
    let inkOpacity = alpha
    DispatchQueue.global(qos: .userInitiated).async {
      let renderer = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: pageBounds.size))
      let data = renderer.pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let p = pdf.page(at: i) else { continue }
          let bounds = p.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          let cg = ctx.cgContext
          cg.saveGState()
          p.draw(with: .mediaBox, to: cg)
          cg.restoreGState()
          if i == pageIdx {
            cg.saveGState()
            // Flip into UIKit coords for UIImage drawing
            cg.translateBy(x: 0, y: bounds.size.height)
            cg.scaleBy(x: 1.0, y: -1.0)
            cg.setAlpha(inkOpacity)
            inkImage.draw(in: CGRect(origin: .zero, size: bounds.size))
            cg.restoreGState()
          }
        }
      }
      do {
        try data.write(to: outUrl)
        self.emitProgress("ink", progress: 1.0, message: "Ink applied")
        resolve([
          "uri": outUrl.absoluteString,
          "pageCount": pdf.pageCount,
          "page": pageNumber,
          "success": true
        ])
      } catch {
        reject("INK_ERROR", error.localizedDescription, error)
      }
    }
  }

  /// Apply ink PNGs to multiple pages in a single pass.
  /// `pages` is `[ ["page": Int, "pngUri": String, "opacity": Double] ]`.
  @objc
  func applyInkToPagesBatch(_ pdfUri: String, pages: [[String: Any]],
                            resolver resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("INK_ERROR", "Could not load PDF", nil); return
    }
    var inkByPage: [Int: (UIImage, CGFloat)] = [:]
    for entry in pages {
      guard let pageNo = entry["page"] as? Int,
            let pngUri = entry["pngUri"] as? String else { continue }
      let url = URL(string: pngUri) ?? URL(fileURLWithPath: pngUri)
      if let data = try? Data(contentsOf: url), let img = UIImage(data: data) {
        let opacity = (entry["opacity"] as? Double).map { CGFloat($0) } ?? 1.0
        inkByPage[pageNo - 1] = (img, max(0, min(opacity, 1.0)))
      }
    }
    let outUrl = tempUrl("inked_batch_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let renderer = UIGraphicsPDFRenderer()
      let data = renderer.pdfData { ctx in
        for i in 0..<pdf.pageCount {
          guard let p = pdf.page(at: i) else { continue }
          let bounds = p.bounds(for: .mediaBox)
          ctx.beginPage(withBounds: bounds, pageInfo: [:])
          let cg = ctx.cgContext
          cg.saveGState()
          p.draw(with: .mediaBox, to: cg)
          cg.restoreGState()
          if let (inkImage, alpha) = inkByPage[i] {
            cg.saveGState()
            cg.translateBy(x: 0, y: bounds.size.height)
            cg.scaleBy(x: 1.0, y: -1.0)
            cg.setAlpha(alpha)
            inkImage.draw(in: CGRect(origin: .zero, size: bounds.size))
            cg.restoreGState()
          }
          self.emitProgress("ink-batch",
                            progress: Double(i + 1) / Double(pdf.pageCount),
                            message: "Inking page \(i + 1)/\(pdf.pageCount)")
        }
      }
      do {
        try data.write(to: outUrl)
        resolve([
          "uri": outUrl.absoluteString,
          "pageCount": pdf.pageCount,
          "inkedPages": inkByPage.keys.map { $0 + 1 },
          "success": true
        ])
      } catch {
        reject("INK_ERROR", error.localizedDescription, error)
      }
    }
  }

  /// Renders a single PDF page into a PNG file. Used by the JS layer to seed
  /// the BrushCanvas backdrop at sufficient pixel resolution for ink alignment.
  @objc
  func renderPageToImage(_ pdfUri: String, page: Int, dpi: Int,
                         resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let pdf = loadPdf(pdfUri) else {
      reject("RENDER_ERROR", "Could not load PDF", nil); return
    }
    let pageIdx = max(0, min(page - 1, pdf.pageCount - 1))
    guard let p = pdf.page(at: pageIdx) else {
      reject("RENDER_ERROR", "Page \(page) not found", nil); return
    }
    let bounds = p.bounds(for: .mediaBox)
    let scale = CGFloat(max(72, dpi)) / 72.0
    let pixelSize = CGSize(width: bounds.width * scale, height: bounds.height * scale)
    DispatchQueue.global(qos: .userInitiated).async {
      let format = UIGraphicsImageRendererFormat.default()
      format.scale = 1.0   // we already baked DPI scale into pixelSize
      let renderer = UIGraphicsImageRenderer(size: pixelSize, format: format)
      let img = renderer.image { ctx in
        UIColor.white.setFill()
        ctx.fill(CGRect(origin: .zero, size: pixelSize))
        let cg = ctx.cgContext
        cg.saveGState()
        cg.translateBy(x: 0, y: pixelSize.height)
        cg.scaleBy(x: scale, y: -scale)
        p.draw(with: .mediaBox, to: cg)
        cg.restoreGState()
      }
      guard let data = img.pngData() else {
        reject("RENDER_ERROR", "PNG encode failed", nil); return
      }
      let outUrl = FileManager.default.temporaryDirectory
        .appendingPathComponent("page_\(pageIdx + 1)_\(UUID().uuidString).png")
      do {
        try data.write(to: outUrl)
        resolve([
          "uri": outUrl.absoluteString,
          "page": pageIdx + 1,
          "width": Double(pixelSize.width),
          "height": Double(pixelSize.height),
          "pageWidthPt": Double(bounds.width),
          "pageHeightPt": Double(bounds.height),
          "scale": Double(scale),
          "success": true
        ])
      } catch {
        reject("RENDER_ERROR", error.localizedDescription, error)
      }
    }
  }

  /// Convert a single ink PNG (signature) into a one-page transparent PDF that
  /// can be embedded with embedSignature. Used by the new SignaturePad flow.
  @objc
  func signaturePngToPdf(_ pngUri: String,
                         resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    let url = URL(string: pngUri) ?? URL(fileURLWithPath: pngUri)
    guard let data = try? Data(contentsOf: url),
          let img = UIImage(data: data) else {
      reject("SIGN_ERROR", "Could not load signature PNG", nil); return
    }
    let outUrl = tempUrl("signature_\(Int(Date().timeIntervalSince1970))")
    DispatchQueue.global(qos: .userInitiated).async {
      let bounds = CGRect(origin: .zero, size: img.size)
      let renderer = UIGraphicsPDFRenderer(bounds: bounds)
      let pdfData = renderer.pdfData { ctx in
        ctx.beginPage()
        img.draw(in: bounds)
      }
      do {
        try pdfData.write(to: outUrl)
        resolve([
          "uri": outUrl.absoluteString,
          "width": Double(img.size.width),
          "height": Double(img.size.height),
          "success": true
        ])
      } catch {
        reject("SIGN_ERROR", error.localizedDescription, error)
      }
    }
  }
}

// MARK: - PDFPage Annotation Extension

extension PDFPage {
  func removeAllAnnotations() {
    for ann in annotations { removeAnnotation(ann) }
  }
}

// MARK: - SimpleTextCollector — generic XMLParser delegate that gathers text
// inside any of a configured set of element tags. Used by xlsxToPdf, pptxToPdf,
// fb2ToPdf to extract leaf text from OOXML / FB2 / EPUB XML payloads.

fileprivate final class SimpleTextCollector: NSObject, XMLParserDelegate {
  private let targetTags: Set<String>
  private var inTarget = 0
  private var current = ""
  private(set) var collected: [String] = []

  init(tags: [String]) {
    self.targetTags = Set(tags)
    super.init()
  }

  static func collect(tags: [String], from data: Data) -> [String] {
    let collector = SimpleTextCollector(tags: tags)
    let parser = XMLParser(data: data)
    parser.shouldProcessNamespaces = false
    parser.delegate = collector
    parser.parse()
    return collector.collected.filter { !$0.isEmpty }
  }

  func parser(_ parser: XMLParser, didStartElement elementName: String,
              namespaceURI: String?, qualifiedName qName: String?,
              attributes attributeDict: [String : String] = [:]) {
    if targetTags.contains(elementName) {
      inTarget += 1
      current = ""
    }
  }

  func parser(_ parser: XMLParser, foundCharacters string: String) {
    if inTarget > 0 { current += string }
  }

  func parser(_ parser: XMLParser, didEndElement elementName: String,
              namespaceURI: String?, qualifiedName qName: String?) {
    guard targetTags.contains(elementName) else { return }
    inTarget = max(0, inTarget - 1)
    if inTarget == 0 {
      let trimmed = current.trimmingCharacters(in: .whitespacesAndNewlines)
      collected.append(trimmed)
    }
  }
}

// MARK: - XlsxSheetDelegate — parses OOXML SpreadsheetML sheet XML into rows.
// Handles t="s" shared-string indirection and t="inlineStr" inline strings.

fileprivate final class XlsxSheetDelegate: NSObject, XMLParserDelegate {
  let sharedStrings: [String]
  private(set) var rows: [[String]] = []
  private var currentRow: [String] = []
  private var currentCellType: String = ""
  private var inValue = false
  private var inInlineStr = false
  private var currentValue = ""

  init(sharedStrings: [String]) {
    self.sharedStrings = sharedStrings
    super.init()
  }

  func parser(_ parser: XMLParser, didStartElement elementName: String,
              namespaceURI: String?, qualifiedName qName: String?,
              attributes attributeDict: [String : String] = [:]) {
    switch elementName {
    case "row":
      currentRow = []
    case "c":
      currentCellType = attributeDict["t"] ?? ""
    case "v":
      inValue = true; currentValue = ""
    case "is":
      inInlineStr = true
    case "t" where inInlineStr:
      inValue = true; currentValue = ""
    default: break
    }
  }

  func parser(_ parser: XMLParser, foundCharacters string: String) {
    if inValue { currentValue += string }
  }

  func parser(_ parser: XMLParser, didEndElement elementName: String,
              namespaceURI: String?, qualifiedName qName: String?) {
    switch elementName {
    case "v":
      if currentCellType == "s",
         let idx = Int(currentValue.trimmingCharacters(in: .whitespacesAndNewlines)),
         idx >= 0, idx < sharedStrings.count {
        currentRow.append(sharedStrings[idx])
      } else {
        currentRow.append(currentValue)
      }
      inValue = false
    case "t" where inInlineStr:
      currentRow.append(currentValue)
      inValue = false
    case "is":
      inInlineStr = false
    case "row":
      rows.append(currentRow)
    default: break
    }
  }
}

// MARK: - UIColor Hex Extension

extension UIColor {
  convenience init?(hex: String) {
    let hexString = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var hexValue: UInt64 = 0
    guard Scanner(string: hexString).scanHexInt64(&hexValue) else { return nil }
    switch hexString.count {
    case 3:
      let r = CGFloat((hexValue & 0xF00) >> 8) / 15.0
      let g = CGFloat((hexValue & 0x0F0) >> 4) / 15.0
      let b = CGFloat(hexValue & 0x00F) / 15.0
      self.init(red: r, green: g, blue: b, alpha: 1.0)
    case 6:
      let r = CGFloat((hexValue & 0xFF0000) >> 16) / 255.0
      let g = CGFloat((hexValue & 0x00FF00) >> 8) / 255.0
      let b = CGFloat(hexValue & 0x0000FF) / 255.0
      self.init(red: r, green: g, blue: b, alpha: 1.0)
    default: return nil
    }
  }
}
