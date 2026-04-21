import Foundation
import UIKit
import React
import PDFKit

@objc(PdfGenerator)
class PdfGenerator: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

  @objc
  func generatePdf(_ imageUris: [String],
                   filename: String,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard !imageUris.isEmpty else {
      reject("ERR", "No images provided", nil)
      return
    }

    let outputFilename = filename.hasSuffix(".pdf") ? filename : "\(filename).pdf"
    let outputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(outputFilename)

    DispatchQueue.global(qos: .userInitiated).async {
      var images: [UIImage] = []

      for uri in imageUris {
        let url = URL(string: uri) ?? URL(fileURLWithPath: uri)
        guard let data = try? Data(contentsOf: url),
              let img = UIImage(data: data) else {
          print("[PdfGenerator] Could not load image: \(uri)")
          continue
        }
        images.append(img)
      }

      guard !images.isEmpty else {
        reject("ERR", "Could not load any valid images", nil)
        return
      }

      // A4 at 72dpi: 595 x 842 points
      let pageWidth: CGFloat = 595
      let pageHeight: CGFloat = 842
      let pageRect = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)

      let renderer = UIGraphicsPDFRenderer(bounds: pageRect)

      do {
        try renderer.writePDF(to: outputUrl) { context in
          for image in images {
            context.beginPage()

            // Fit image into page while maintaining aspect ratio
            let imgSize = image.size
            let scaleX = pageWidth / imgSize.width
            let scaleY = pageHeight / imgSize.height
            let scale = min(scaleX, scaleY)

            let scaledWidth = imgSize.width * scale
            let scaledHeight = imgSize.height * scale
            let offsetX = (pageWidth - scaledWidth) / 2
            let offsetY = (pageHeight - scaledHeight) / 2

            let drawRect = CGRect(x: offsetX, y: offsetY, width: scaledWidth, height: scaledHeight)
            image.draw(in: drawRect)
          }
        }

        resolve([
          "uri": outputUrl.absoluteString,
          "pageCount": images.count,
          "success": true
        ])
      } catch {
        reject("ERR", "PDF generation failed: \(error.localizedDescription)", error)
      }
    }
  }

  @objc
  func generatePdfFromImages(_ imageUris: [String],
                             resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
    generatePdf(imageUris, filename: "Scan-\(Int(Date().timeIntervalSince1970)).pdf", resolver: resolve, rejecter: reject)
  }
}
