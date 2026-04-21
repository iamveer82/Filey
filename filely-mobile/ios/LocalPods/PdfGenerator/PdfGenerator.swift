import Foundation
import UIKit
import React
import PDFKit
import CoreImage

@objc(PdfGenerator)
class PdfGenerator: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

  // MARK: - Generate PDF from Images

  @objc
  func generatePdf(_ imageUris: [String],
                   filename: String,
                   options: [String: Any]?,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard !imageUris.isEmpty else {
      reject("GENERATE_ERROR", "No images provided", nil)
      return
    }

    let outputFilename = filename.hasSuffix(".pdf") ? filename : "\(filename).pdf"
    let outputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(outputFilename)

    // Parse options
    let pageSize = options?["pageSize"] as? String ?? "a4" // a4, letter, original
    let orientation = options?["orientation"] as? String ?? "auto" // auto, portrait, landscape
    let quality = options?["quality"] as? String ?? "high" // low, medium, high
    let autoCrop = options?["autoCrop"] as? Bool ?? false
    let enhanceContrast = options?["enhanceContrast"] as? Bool ?? true
    let grayscale = options?["grayscale"] as? Bool ?? false

    DispatchQueue.global(qos: .userInitiated).async {
      var images: [UIImage] = []

      for (index, uri) in imageUris.enumerated() {
        let url = URL(string: uri) ?? URL(fileURLWithPath: uri)
        guard let data = try? Data(contentsOf: url),
              var img = UIImage(data: data) else {
          print("[PdfGenerator] Could not load image: \(uri)")
          continue
        }

        // Apply preprocessing
        if enhanceContrast {
          img = self.enhanceImage(img, grayscale: grayscale)
        }

        if autoCrop, let cropped = self.autoCropDocument(img) {
          img = cropped
        }

        images.append(img)

        // Report progress
        let progress = Double(index + 1) / Double(imageUris.count) * 0.3
      }

      guard !images.isEmpty else {
        reject("GENERATE_ERROR", "Could not load any valid images", nil)
        return
      }

      // Determine page size
      let pageRect: CGRect
      switch pageSize {
      case "letter":
        pageRect = CGRect(x: 0, y: 0, width: 612, height: 792)
      case "original":
        // Use first image size
        let firstImg = images[0]
        pageRect = CGRect(x: 0, y: 0, width: firstImg.size.width, height: firstImg.size.height)
      default: // a4
        pageRect = CGRect(x: 0, y: 0, width: 595, height: 842)
      }

      let finalPageRect = self.applyOrientation(pageRect, orientation: orientation, images: images)

      let renderer = UIGraphicsPDFRenderer(bounds: finalPageRect)

      do {
        try renderer.writePDF(to: outputUrl) { context in
          for (index, image) in images.enumerated() {
            context.beginPage()

            let imgSize = image.size
            let pageSize = finalPageRect.size

            // Calculate scaling to fit image in page
            var scale: CGFloat
            let drawRect: CGRect

            if pageSize == imgSize {
              // Original size mode
              drawRect = finalPageRect
            } else {
              // Fit to page with aspect ratio preservation
              let scaleX = pageSize.width / imgSize.width
              let scaleY = pageSize.height / imgSize.height

              if orientation == "auto" {
                scale = min(scaleX, scaleY)
              } else {
                scale = min(scaleX, scaleY)
              }

              let scaledWidth = imgSize.width * scale
              let scaledHeight = imgSize.height * scale
              let offsetX = (pageSize.width - scaledWidth) / 2
              let offsetY = (pageSize.height - scaledHeight) / 2

              drawRect = CGRect(x: offsetX, y: offsetY, width: scaledWidth, height: scaledHeight)
            }

            // Apply quality settings
            let cgImage = image.cgImage
            let drawContext = context.cgContext

            drawContext.saveGState()

            // Flip coordinates for Core Graphics
            drawContext.translateBy(x: 0, y: pageSize.height)
            drawContext.scaleBy(x: 1, y: -1)

            // Adjust draw rect for flipped coordinates
            let flippedRect = CGRect(x: drawRect.minX,
                                     y: pageSize.height - drawRect.maxY,
                                     width: drawRect.width,
                                     height: drawRect.height)

            if let cgImage = cgImage {
              drawContext.draw(cgImage, in: flippedRect)
            } else {
              image.draw(in: drawRect)
            }

            drawContext.restoreGState()

            // Report progress
            let progress = 0.3 + (Double(index + 1) / Double(images.count) * 0.7)
          }
        }

        let fileSize = (try? Data(contentsOf: outputUrl))?.count ?? 0

        resolve([
          "uri": outputUrl.absoluteString,
          "pageCount": images.count,
          "fileSizeKB": fileSize / 1024,
          "success": true
        ])
      } catch {
        reject("GENERATE_ERROR", "PDF generation failed: \(error.localizedDescription)", error)
      }
    }
  }

  @objc
  func generatePdfFromImages(_ imageUris: [String],
                             resolver resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
    generatePdf(imageUris,
                filename: "Scan-\(Int(Date().timeIntervalSince1970)).pdf",
                options: nil,
                resolver: resolve,
                rejecter: reject)
  }

  // MARK: - Image Enhancement

  private func enhanceImage(_ image: UIImage, grayscale: Bool) -> UIImage {
    guard let cgImage = image.cgImage else { return image }
    let ciImage = CIImage(cgImage: cgImage)

    var filters: [CIFilter] = []

    // Auto-enhance filter
    if let autoEnhance = CIFilter(name: "CIAutoEnhance") {
      autoEnhance.setValue(ciImage, forKey: kCIInputImageKey)
      filters.append(autoEnhance)
    }

    // Contrast adjustment
    if let contrast = CIFilter(name: "CIToneCurve") {
      contrast.setValue(ciImage, forKey: kCIInputImageKey)
      contrast.setValue(CIVector(x: 0.0, y: 0.0), forKey: "inputPoint0")
      contrast.setValue(CIVector(x: 0.25, y: 0.2), forKey: "inputPoint1")
      contrast.setValue(CIVector(x: 0.5, y: 0.5), forKey: "inputPoint2")
      contrast.setValue(CIVector(x: 0.75, y: 0.8), forKey: "inputPoint3")
      contrast.setValue(CIVector(x: 1.0, y: 1.0), forKey: "inputPoint4")
      filters.append(contrast)
    }

    // Grayscale
    if grayscale, let gray = CIFilter(name: "CIPhotoEffectMono") {
      gray.setValue(ciImage, forKey: kCIInputImageKey)
      filters.append(gray)
    }

    // Apply filters chain
    var currentImage = ciImage
    for filter in filters {
      filter.setValue(currentImage, forKey: kCIInputImageKey)
      if let output = filter.outputImage {
        currentImage = output
      }
    }

    let context = CIContext(options: nil)
    guard let outputCGImage = context.createCGImage(currentImage, from: currentImage.extent) else {
      return image
    }

    return UIImage(cgImage: outputCGImage, scale: image.scale, orientation: image.imageOrientation)
  }

  // MARK: - Auto Crop

  private func autoCropDocument(_ image: UIImage) -> UIImage? {
    guard let cgImage = image.cgImage else { return nil }

    // Use CIDetector to find document rectangle
    let ciImage = CIImage(cgImage: cgImage)
    let detector = CIDetector(ofType: CIDetectorTypeRectangle,
                              context: nil,
                              options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])

    let features = detector?.features(in: ciImage) ?? []

    guard let rectFeature = features.first as? CIRectangleFeature else {
      return nil
    }

    // Calculate crop rect
    let topLeft = rectFeature.topLeft
    let topRight = rectFeature.topRight
    let bottomLeft = rectFeature.bottomLeft
    let bottomRight = rectFeature.bottomRight

    // Use perspective correction
    let perspectiveFilter = CIFilter(name: "CIPerspectiveCorrection")
    perspectiveFilter?.setValue(ciImage, forKey: kCIInputImageKey)
    perspectiveFilter?.setValue(CIVector(cgPoint: topLeft), forKey: "inputTopLeft")
    perspectiveFilter?.setValue(CIVector(cgPoint: topRight), forKey: "inputTopRight")
    perspectiveFilter?.setValue(CIVector(cgPoint: bottomRight), forKey: "inputBottomRight")
    perspectiveFilter?.setValue(CIVector(cgPoint: bottomLeft), forKey: "inputBottomLeft")

    guard let outputImage = perspectiveFilter?.outputImage else { return nil }

    let context = CIContext(options: nil)
    guard let outputCGImage = context.createCGImage(outputImage, from: outputImage.extent) else {
      return nil
    }

    return UIImage(cgImage: outputCGImage)
  }

  // MARK: - Orientation Helper

  private func applyOrientation(_ rect: CGRect, orientation: String, images: [UIImage]) -> CGRect {
    switch orientation {
    case "portrait":
      return rect.width > rect.height ? CGRect(x: 0, y: 0, width: rect.height, height: rect.width) : rect
    case "landscape":
      return rect.height > rect.width ? CGRect(x: 0, y: 0, width: rect.height, height: rect.width) : rect
    case "auto":
      // Auto-detect based on majority of images
      let landscapeCount = images.filter { $0.size.width > $0.size.height }.count
      if landscapeCount > images.count / 2 {
        return rect.height > rect.width ? CGRect(x: 0, y: 0, width: rect.height, height: rect.width) : rect
      }
      return rect
    default:
      return rect
    }
  }
}
