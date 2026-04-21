import Foundation
import Vision
import CoreImage
import UIKit
import React

@objc(VisionEdgeDetection)
class VisionEdgeDetection: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

  // MARK: - Detect Edges with Preprocessing

  @objc
  func detectEdges(_ imageUri: String,
                  options: [String: Any]?,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard let url = URL(string: imageUri) ?? URL(fileURLWithPath: imageUri) as URL?,
          let data = try? Data(contentsOf: url),
          let image = UIImage(data: data) else {
      reject("EDGE_ERROR", "Could not load image from \(imageUri)", nil)
      return
    }

    guard let cgImage = image.cgImage else {
      reject("EDGE_ERROR", "Could not get CGImage from UIImage", nil)
      return
    }

    // Parse options
    let preprocess = options?["preprocess"] as? Bool ?? true
    let contrastBoost = options?["contrastBoost"] as? Bool ?? true
    let denoise = options?["denoise"] as? Bool ?? false
    let aspectRatioMin = options?["minAspectRatio"] as? CGFloat ?? 0.2
    let aspectRatioMax = options?["maxAspectRatio"] as? CGFloat ?? 1.5
    let minConfidence = options?["minConfidence"] as? CGFloat ?? 0.5

    // Preprocess image for better detection
    var processedCGImage = cgImage
    if preprocess {
      if let processed = preprocessImage(cgImage, contrastBoost: contrastBoost, denoise: denoise) {
        processedCGImage = processed
      }
    }

    let request = VNDetectRectanglesRequest { request, error in
      if let error = error {
        reject("EDGE_ERROR", "Vision request failed: \(error.localizedDescription)", error)
        return
      }

      guard let results = request.results as? [VNRectangleObservation] else {
        resolve([
          "corners": [
            ["x": 0.05, "y": 0.05],
            ["x": 0.95, "y": 0.05],
            ["x": 0.95, "y": 0.95],
            ["x": 0.05, "y": 0.95]
          ],
          "confidence": 0.0,
          "detected": false,
          "error": "No rectangles detected"
        ])
        return
      }

      // Sort by confidence and area
      let sorted = results.sorted { (r1, r2) in
        let area1 = r1.boundingBox.width * r1.boundingBox.height
        let area2 = r2.boundingBox.width * r2.boundingBox.height
        return r1.confidence * area1 > r2.confidence * area2
      }

      guard let best = sorted.first, best.confidence >= minConfidence else {
        // Return fallback with gentle warning
        resolve([
          "corners": [
            ["x": 0.05, "y": 0.05],
            ["x": 0.95, "y": 0.05],
            ["x": 0.95, "y": 0.95],
            ["x": 0.05, "y": 0.95]
          ],
          "confidence": sorted.first?.confidence ?? 0.0,
          "detected": false,
          "note": "Low confidence detection, using fallback"
        ])
        return
      }

      // Convert normalized Vision coordinates to UI coordinates
      // Vision: origin bottom-left, Y up
      // UI: origin top-left, Y down
      let corners = [
        ["x": best.topLeft.x,     "y": 1 - best.topLeft.y],
        ["x": best.topRight.x,    "y": 1 - best.topRight.y],
        ["x": best.bottomRight.x, "y": 1 - best.bottomRight.y],
        ["x": best.bottomLeft.x,  "y": 1 - best.bottomLeft.y]
      ]

      resolve([
        "corners": corners,
        "confidence": best.confidence,
        "detected": true,
        "boundingBox": [
          "x": best.boundingBox.origin.x,
          "y": 1 - best.boundingBox.origin.y - best.boundingBox.height,
          "width": best.boundingBox.width,
          "height": best.boundingBox.height
        ]
      ])
    }

    // Tuned parameters for document scanning
    request.minimumAspectRatio = aspectRatioMin
    request.maximumAspectRatio = aspectRatioMax
    request.minimumSize = 0.15
    request.maximumObservations = 5
    request.minimumConfidence = Float(minConfidence)

    let handler = VNImageRequestHandler(cgImage: processedCGImage, options: [:])

    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try handler.perform([request])
      } catch {
        reject("EDGE_ERROR", "Failed to perform Vision request: \(error.localizedDescription)", error)
      }
    }
  }

  // MARK: - Image Preprocessing

  private func preprocessImage(_ cgImage: CGImage, contrastBoost: Bool, denoise: Bool) -> CGImage? {
    let ciImage = CIImage(cgImage: cgImage)
    var filteredImage = ciImage

    // Denoise first (before other operations)
    if denoise, let denoiseFilter = CIFilter(name: "CINoiseReduction") {
      denoiseFilter.setValue(ciImage, forKey: kCIInputImageKey)
      denoiseFilter.setValue(0.02, forKey: "inputNoiseLevel")
      denoiseFilter.setValue(0.40, forKey: "inputSharpness")
      if let output = denoiseFilter.outputImage {
        filteredImage = output
      }
    }

    // Enhance contrast for better edge detection
    if contrastBoost {
      // Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) equivalent
      if let colorControls = CIFilter(name: "CIColorControls") {
        colorControls.setValue(filteredImage, forKey: kCIInputImageKey)
        colorControls.setValue(1.2, forKey: kCIInputContrastKey) // Boost contrast
        colorControls.setValue(0.0, forKey: kCIInputBrightnessKey)
        colorControls.setValue(1.0, forKey: kCIInputSaturationKey)
        if let output = colorControls.outputImage {
          filteredImage = output
        }
      }

      // Additional tone curve for better document edge separation
      if let toneCurve = CIFilter(name: "CIToneCurve") {
        toneCurve.setValue(filteredImage, forKey: kCIInputImageKey)
        toneCurve.setValue(CIVector(x: 0.0, y: 0.05), forKey: "inputPoint0") // Lift shadows
        toneCurve.setValue(CIVector(x: 0.25, y: 0.15), forKey: "inputPoint1")
        toneCurve.setValue(CIVector(x: 0.5, y: 0.5), forKey: "inputPoint2")
        toneCurve.setValue(CIVector(x: 0.75, y: 0.85), forKey: "inputPoint3")
        toneCurve.setValue(CIVector(x: 1.0, y: 0.95), forKey: "inputPoint4") // Lower highlights
        if let output = toneCurve.outputImage {
          filteredImage = output
        }
      }
    }

    // Edge enhancement for document boundaries
    if let sharpen = CIFilter(name: "CISharpenLuminance") {
      sharpen.setValue(filteredImage, forKey: kCIInputImageKey)
      sharpen.setValue(0.8, forKey: kCIInputSharpnessKey)
      sharpen.setValue(0.5, forKey: kCIInputRadiusKey)
      if let output = sharpen.outputImage {
        filteredImage = output
      }
    }

    let context = CIContext(options: nil)
    return context.createCGImage(filteredImage, from: filteredImage.extent)
  }

  // MARK: - Perspective Correction

  @objc
  func applyPerspectiveCorrection(_ imageUri: String,
                                  corners: [[String: Double]],
                                  options: [String: Any]?,
                                  resolver resolve: @escaping RCTPromiseResolveBlock,
                                  rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard let url = URL(string: imageUri) ?? URL(fileURLWithPath: imageUri) as URL?,
          let data = try? Data(contentsOf: url),
          let inputImage = UIImage(data: data)?.cgImage else {
      reject("CORRECT_ERROR", "Could not load image", nil)
      return
    }

    guard corners.count == 4 else {
      reject("CORRECT_ERROR", "Expected 4 corner points", nil)
      return
    }

    // Validate corners
    for corner in corners {
      guard corner["x"] != nil, corner["y"] != nil else {
        reject("CORRECT_ERROR", "Invalid corner coordinates", nil)
        return
      }
    }

    let ciImage = CIImage(cgImage: inputImage)

    // Map normalized coords to pixel coords
    let imgWidth = CGFloat(inputImage.width)
    let imgHeight = CGFloat(inputImage.height)

    let topLeft     = CGPoint(x: corners[0]["x"]! * imgWidth, y: (1 - corners[0]["y"]!) * imgHeight)
    let topRight    = CGPoint(x: corners[1]["x"]! * imgWidth, y: (1 - corners[1]["y"]!) * imgHeight)
    let bottomRight = CGPoint(x: corners[2]["x"]! * imgWidth, y: (1 - corners[2]["y"]!) * imgHeight)
    let bottomLeft  = CGPoint(x: corners[3]["x"]! * imgWidth, y: (1 - corners[3]["y"]!) * imgHeight)

    // Build perspective correction filter
    guard let filter = CIFilter(name: "CIPerspectiveCorrection") else {
      reject("CORRECT_ERROR", "CIPerspectiveCorrection filter not available", nil)
      return
    }

    filter.setValue(ciImage, forKey: kCIInputImageKey)
    filter.setValue(CIVector(cgPoint: topLeft),     forKey: "inputTopLeft")
    filter.setValue(CIVector(cgPoint: topRight),    forKey: "inputTopRight")
    filter.setValue(CIVector(cgPoint: bottomRight), forKey: "inputBottomRight")
    filter.setValue(CIVector(cgPoint: bottomLeft),  forKey: "inputBottomLeft")

    guard let outputCIImage = filter.outputImage else {
      reject("CORRECT_ERROR", "Perspective filter produced no output", nil)
      return
    }

    // Post-process options
    let enhance = options?["enhance"] as? Bool ?? true
    let grayscale = options?["grayscale"] as? Bool ?? false

    var finalImage = outputCIImage

    if enhance {
      // Apply auto-enhance
      if let autoEnhance = CIFilter(name: "CIColorControls") {
        autoEnhance.setValue(finalImage, forKey: kCIInputImageKey)
        autoEnhance.setValue(1.1, forKey: kCIInputContrastKey)
        autoEnhance.setValue(0.05, forKey: kCIInputBrightnessKey)
        if let output = autoEnhance.outputImage {
          finalImage = output
        }
      }
    }

    if grayscale {
      if let grayFilter = CIFilter(name: "CIPhotoEffectMono") {
        grayFilter.setValue(finalImage, forKey: kCIInputImageKey)
        if let output = grayFilter.outputImage {
          finalImage = output
        }
      }
    }

    let context = CIContext()
    guard let outputCG = context.createCGImage(finalImage, from: finalImage.extent) else {
      reject("CORRECT_ERROR", "Could not create output CGImage", nil)
      return
    }

    let outputImage = UIImage(cgImage: outputCG)
    guard let pngData = outputImage.pngData() else {
      reject("CORRECT_ERROR", "Could not encode output as PNG", nil)
      return
    }

    let cacheDir = FileManager.default.temporaryDirectory
    let outputUri = cacheDir.appendingPathComponent("scan_corrected_\(UUID().uuidString).png")

    do {
      try pngData.write(to: outputUri)
      resolve([
        "uri": outputUri.absoluteString,
        "width": finalImage.extent.width,
        "height": finalImage.extent.height,
        "success": true
      ])
    } catch {
      reject("CORRECT_ERROR", "Could not write corrected image: \(error.localizedDescription)", error)
    }
  }

  // MARK: - Simple Crop (No Perspective)

  @objc
  func cropDocument(_ imageUri: String,
                    corners: [[String: Double]],
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard let url = URL(string: imageUri) ?? URL(fileURLWithPath: imageUri) as URL?,
          let data = try? Data(contentsOf: url),
          let inputImage = UIImage(data: data)?.cgImage else {
      reject("CROP_ERROR", "Could not load image", nil)
      return
    }

    guard corners.count == 4 else {
      reject("CROP_ERROR", "Expected 4 corner points", nil)
      return
    }

    let imgWidth = CGFloat(inputImage.width)
    let imgHeight = CGFloat(inputImage.height)

    let minX = corners.map { $0["x"]! }.min()! * imgWidth
    let maxX = corners.map { $0["x"]! }.max()! * imgWidth
    let minY = corners.map { $0["y"]! }.min()! * imgHeight
    let maxY = corners.map { $0["y"]! }.max()! * imgHeight

    let cropRect = CGRect(x: minX, y: minY, width: maxX - minX, height: maxY - minY)

    guard let croppedCG = inputImage.cropping(to: cropRect) else {
      reject("CROP_ERROR", "Cropping failed", nil)
      return
    }

    let outputImage = UIImage(cgImage: croppedCG)
    guard let pngData = outputImage.pngData() else {
      reject("CROP_ERROR", "Could not encode cropped image", nil)
      return
    }

    let cacheDir = FileManager.default.temporaryDirectory
    let outputUri = cacheDir.appendingPathComponent("scan_cropped_\(UUID().uuidString).png")

    do {
      try pngData.write(to: outputUri)
      resolve([
        "uri": outputUri.absoluteString,
        "width": cropRect.width,
        "height": cropRect.height,
        "success": true
      ])
    } catch {
      reject("CROP_ERROR", "Could not write cropped image: \(error.localizedDescription)", nil)
    }
  }

  // MARK: - Batch Processing

  @objc
  func processBatch(_ imageUris: [String],
                   options: [String: Any]?,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {

    var results: [[String: Any]] = []
    let group = DispatchGroup()

    for uri in imageUris {
      group.enter()
      detectEdges(uri, options: options, resolver: { result in
        results.append([
          "uri": uri,
          "result": result
        ])
        group.leave()
      }, rejecter: { code, message, error in
        results.append([
          "uri": uri,
          "error": message ?? "Unknown error"
        ])
        group.leave()
      })
    }

    group.notify(queue: .main) {
      resolve([
        "results": results,
        "totalProcessed": results.count,
        "success": true
      ])
    }
  }
}
