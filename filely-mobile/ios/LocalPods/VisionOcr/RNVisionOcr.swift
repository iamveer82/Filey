import Foundation
import Vision
import UIKit
import React

@objc(RNVisionOcr)
class RNVisionOcr: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { false }

  @objc
  func recognizeText(_ imageUri: String,
                     options: NSDictionary,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {

    // Parse language hints
    let langHints = options["languages"] as? [String] ?? ["en-US"]

    guard let url = URL(string: imageUri) ?? URL(fileURLWithPath: imageUri) as URL?,
          let data = try? Data(contentsOf: url),
          let image = UIImage(data: data),
          let cgImage = image.cgImage else {
      reject("ERR", "Could not load image from \(imageUri)", nil)
      return
    }

    // Build recognition level
    let recognitionLevel: VNRequestTextRecognitionLevel = .accurate

    // Custom words list if provided
    var customWords: [String]? = nil
    if let words = options["customWords"] as? [String], !words.isEmpty {
      customWords = words
    }

    // UsesLanguages subset for ar-SA if needed
    let request = VNRecognizeTextRequest { request, error in
      if let error = error {
        reject("ERR", "Text recognition failed: \(error.localizedDescription)", error)
        return
      }

      guard let observations = request.results as? [VNRecognizedTextObservation] else {
        resolve([
          "text": "",
          "confidence": 0.0,
          "regions": []
        ])
        return
      }

      var allText = ""
      var allConfidence: Float = 0
      var regions: [[String: Any]] = []

      for observation in observations {
        guard let topCandidate = observation.topCandidates(1).first else { continue }

        let bounds = observation.boundingBox
        let region: [String: Any] = [
          "text": topCandidate.string,
          "confidence": topCandidate.confidence,
          "bounds": [
            "x": bounds.origin.x,
            "y": bounds.origin.y,
            "width": bounds.size.width,
            "height": bounds.size.height
          ]
        ]
        regions.append(region)
        allText += topCandidate.string + "\n"
        allConfidence += topCandidate.confidence
      }

      let avgConfidence = observations.isEmpty ? 0 : allConfidence / Float(observations.count)

      resolve([
        "text": allText.trimmingCharacters(in: .whitespacesAndNewlines),
        "confidence": avgConfidence,
        "regions": regions
      ])
    }

    request.recognitionLevel = recognitionLevel
    request.usesLanguageCorrection = true

    if #available(iOS 16.0, *) {
      request.automaticallyFallbackToTesseract = false
    }

    // Set supported languages — Vision supports 50+ languages
    var supportedLanguages: [String] = []
    if #available(iOS 16.0, *) {
      supportedLanguages = (try? request.supportedRecognitionLanguages()) ?? []
    }

    // Filter langHints to only those Vision actually supports
    let usableLangs = langHints.filter { supportedLanguages.contains($0) }
    if !usableLangs.isEmpty {
      request.recognitionLanguages = usableLangs
    } else {
      // Fallback: try en-US regardless
      request.recognitionLanguages = ["en-US"]
    }

    if let words = customWords {
      request.customWords = words
    }

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [
      VNImageOption: Any.self
    ])

    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try handler.perform([request])
      } catch {
        reject("ERR", "Vision request failed: \(error.localizedDescription)", error)
      }
    }
  }

  @objc
  func getSupportedLanguages(_ resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate

    var languages: [String] = []
    if #available(iOS 16.0, *) {
      languages = (try? request.supportedRecognitionLanguages()) ?? []
    } else {
      // Pre-iOS 16: limited language set
      languages = ["en-US", "ar-SA", "fr-FR", "de-DE", "es-ES", "it-IT", "pt-BR", "zh-Hans", "zh-Hant", "ja-JP", "ko-KR"]
    }

    resolve(languages)
  }
}
