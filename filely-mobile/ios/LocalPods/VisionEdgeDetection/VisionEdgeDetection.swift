import Foundation
import Vision
import CoreImage
import UIKit
import React

@objc(VisionEdgeDetection)
class VisionEdgeDetection: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

  @objc
  func detectEdges(_ imageUri: String,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard let url = URL(string: imageUri) ?? URL(fileURLWithPath: imageUri) as URL?,
          let data = try? Data(contentsOf: url),
          let image = UIImage(data: data) else {
      reject("ERR", "Could not load image from \(imageUri)", nil)
      return
    }

    guard let cgImage = image.cgImage else {
      reject("ERR", "Could not get CGImage from UIImage", nil)
      return
    }

    let request = VNDetectRectanglesRequest { request, error in
      if let error = error {
        reject("ERR", "Vision request failed: \(error.localizedDescription)", error)
        return
      }

      guard let results = request.results as? [VNRectangleObservation],
            let best = results.first else {
        // Fallback: return image bounds
        resolve([
          "corners": [
            ["x": 0.05, "y": 0.05],
            ["x": 0.95, "y": 0.05],
            ["x": 0.95, "y": 0.95],
            ["x": 0.05, "y": 0.95]
          ],
          "confidence": 0.0,
          "detected": false
        ])
        return
      }

      let corners = [
        ["x": best.topLeft.x,     "y": 1 - best.topLeft.y],
        ["x": best.topRight.x,    "y": 1 - best.topRight.y],
        ["x": best.bottomRight.x, "y": 1 - best.bottomRight.y],
        ["x": best.bottomLeft.x,  "y": 1 - best.bottomLeft.y]
      ]

      resolve([
        "corners": corners,
        "confidence": best.confidence,
        "detected": results.count > 0
      ])
    }

    request.minimumAspectRatio = 0.3
    request.maximumAspectRatio = 1.0
    request.minimumSize = 0.2
    request.maximumObservations = 1
    request.minimumConfidence = 0.5

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try handler.perform([request])
      } catch {
        reject("ERR", "Failed to perform Vision request: \(error.localizedDescription)", error)
      }
    }
  }

  @objc
  func applyPerspectiveCorrection(_ imageUri: String,
                                  corners: [[String: Double]],
                                  resolver resolve: @escaping RCTPromiseResolveBlock,
                                  rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard let url = URL(string: imageUri) ?? URL(fileURLWithPath: imageUri) as URL?,
          let data = try? Data(contentsOf: url),
          let inputImage = UIImage(data: data)?.cgImage else {
      reject("ERR", "Could not load image", nil)
      return
    }

    guard corners.count == 4 else {
      reject("ERR", "Expected 4 corner points", nil)
      return
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
      reject("ERR", "CIPerspectiveCorrection filter not available", nil)
      return
    }

    filter.setValue(ciImage, forKey: kCIInputImageKey)
    filter.setValue(CIVector(cgPoint: topLeft),     forKey: "inputTopLeft")
    filter.setValue(CIVector(cgPoint: topRight),    forKey: "inputTopRight")
    filter.setValue(CIVector(cgPoint: bottomRight), forKey: "inputBottomRight")
    filter.setValue(CIVector(cgPoint: bottomLeft),  forKey: "inputBottomLeft")

    guard let outputCIImage = filter.outputImage else {
      reject("ERR", "Perspective filter produced no output", nil)
      return
    }

    let context = CIContext()
    guard let outputCG = context.createCGImage(outputCIImage, from: outputCIImage.extent) else {
      reject("ERR", "Could not create output CGImage", nil)
      return
    }

    let outputImage = UIImage(cgImage: outputCG)
    guard let pngData = outputImage.pngData() else {
      reject("ERR", "Could not encode output as PNG", nil)
      return
    }

    let cacheDir = FileManager.default.temporaryDirectory
    let outputUri = cacheDir.appendingPathComponent("scan_corrected_\(UUID().uuidString).png")

    do {
      try pngData.write(to: outputUri)
      resolve(["uri": outputUri.absoluteString])
    } catch {
      reject("ERR", "Could not write corrected image: \(error.localizedDescription)", error)
    }
  }

  @objc
  func cropDocument(_ imageUri: String,
                    corners: [[String: Double]],
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {

    guard let url = URL(string: imageUri) ?? URL(fileURLWithPath: imageUri) as URL?,
          let data = try? Data(contentsOf: url),
          let inputImage = UIImage(data: data)?.cgImage else {
      reject("ERR", "Could not load image", nil)
      return
    }

    guard corners.count == 4 else {
      reject("ERR", "Expected 4 corner points", nil)
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
      reject("ERR", "Cropping failed", nil)
      return
    }

    let outputImage = UIImage(cgImage: croppedCG)
    guard let pngData = outputImage.pngData() else {
      reject("ERR", "Could not encode cropped image", nil)
      return
    }

    let cacheDir = FileManager.default.temporaryDirectory
    let outputUri = cacheDir.appendingPathComponent("scan_cropped_\(UUID().uuidString).png")

    do {
      try pngData.write(to: outputUri)
      resolve(["uri": outputUri.absoluteString])
    } catch {
      reject("ERR", "Could not write cropped image: \(error.localizedDescription)", error)
    }
  }
}
