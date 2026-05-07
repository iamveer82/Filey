import Foundation
import UIKit
import PencilKit
import React

// MARK: - BrushCanvasView
//
// Wraps PKCanvasView so React Native can configure tool / color / width and
// composite the user's ink over a PDF page background. PNG export is performed
// from BrushCanvasManager via uiManager.view(forReactTag:).

@available(iOS 13.0, *)
class BrushCanvasView: UIView {

  let canvas = PKCanvasView()
  let backgroundImageView = UIImageView()
  private var toolPickerForWindow: PKToolPicker?

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundImageView.contentMode = .scaleAspectFit
    backgroundImageView.frame = bounds
    backgroundImageView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(backgroundImageView)

    canvas.frame = bounds
    canvas.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    canvas.backgroundColor = .clear
    canvas.isOpaque = false
    canvas.drawingPolicy = .anyInput          // finger + Apple Pencil
    canvas.alwaysBounceVertical = false
    canvas.alwaysBounceHorizontal = false
    canvas.tool = PKInkingTool(.pen, color: .black, width: 4)
    addSubview(canvas)
  }

  required init?(coder: NSCoder) { fatalError("not used") }

  // MARK: - Props

  @objc var tool: NSString = "pen" {
    didSet { applyTool() }
  }

  @objc var strokeColor: NSString = "#000000" {
    didSet { applyTool() }
  }

  @objc var strokeWidth: NSNumber = 4 {
    didSet { applyTool() }
  }

  @objc var backgroundUri: NSString? = nil {
    didSet { loadBackground() }
  }

  @objc var showToolPicker: Bool = false {
    didSet { updateToolPickerVisibility() }
  }

  @objc var onExport: RCTDirectEventBlock?

  // MARK: - Tool config

  private func applyTool() {
    let color = UIColor(hex: strokeColor as String) ?? .black
    let width = CGFloat(truncating: strokeWidth)
    let toolName = tool as String
    switch toolName {
    case "eraser":
      canvas.tool = PKEraserTool(.bitmap)
    case "marker":
      canvas.tool = PKInkingTool(.marker, color: color, width: max(8, width))
    case "pencil":
      canvas.tool = PKInkingTool(.pencil, color: color, width: max(2, width))
    case "lasso":
      canvas.tool = PKLassoTool()
    default: // pen
      canvas.tool = PKInkingTool(.pen, color: color, width: max(2, width))
    }
  }

  // MARK: - Background image

  private func loadBackground() {
    guard let uriStr = backgroundUri as String? else {
      backgroundImageView.image = nil; return
    }
    guard let url = URL(string: uriStr) ?? URL(string: "file://\(uriStr)") else { return }
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      let data: Data?
      if url.isFileURL {
        data = try? Data(contentsOf: url)
      } else {
        data = try? Data(contentsOf: url)
      }
      guard let d = data, let img = UIImage(data: d) else { return }
      DispatchQueue.main.async { self?.backgroundImageView.image = img }
    }
  }

  // MARK: - Tool picker

  private func updateToolPickerVisibility() {
    guard let window = self.window else { return }
    if showToolPicker {
      let picker = PKToolPicker.shared(for: window) ?? PKToolPicker()
      picker.setVisible(true, forFirstResponder: canvas)
      picker.addObserver(canvas)
      canvas.becomeFirstResponder()
      toolPickerForWindow = picker
    } else if let picker = toolPickerForWindow {
      picker.setVisible(false, forFirstResponder: canvas)
      picker.removeObserver(canvas)
    }
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if showToolPicker { updateToolPickerVisibility() }
  }

  // MARK: - Imperative ops

  func clearDrawing() {
    canvas.drawing = PKDrawing()
  }

  func undo() {
    undoManager?.undo()
  }

  func redo() {
    undoManager?.redo()
  }

  /// Renders the current ink (transparent background) into a PNG at given scale.
  /// scale 1.0 = canvas pixel resolution; pass higher to upsample.
  func exportInkPng(scale: CGFloat) -> UIImage {
    let drawing = canvas.drawing
    let bounds = canvas.bounds
    return drawing.image(from: bounds, scale: max(scale, 1.0))
  }

  /// Renders the canvas + background composite (used for signature export).
  func exportCompositePng(scale: CGFloat) -> UIImage {
    let bounds = canvas.bounds
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = max(scale, 1.0)
    let renderer = UIGraphicsImageRenderer(bounds: bounds, format: format)
    return renderer.image { ctx in
      // White background (signature pages are typically white)
      UIColor.white.setFill()
      ctx.fill(bounds)
      if let bg = backgroundImageView.image {
        bg.draw(in: bounds)
      }
      let inkImg = canvas.drawing.image(from: bounds, scale: format.scale)
      inkImg.draw(in: bounds)
    }
  }
}

// MARK: - BrushCanvasManager (RCTViewManager)

@available(iOS 13.0, *)
@objc(BrushCanvasManager)
class BrushCanvasManager: RCTViewManager {

  override func view() -> UIView! { return BrushCanvasView() }
  override static func requiresMainQueueSetup() -> Bool { true }

  @objc func exportPng(_ reactTag: NSNumber,
                       scale: NSNumber,
                       composite: NSNumber,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let view = self.bridge?.uiManager.view(forReactTag: reactTag) as? BrushCanvasView else {
        reject("VIEW_NOT_FOUND", "BrushCanvas with tag \(reactTag) not found", nil); return
      }
      let s = CGFloat(truncating: scale)
      let useComposite = composite.boolValue
      let img = useComposite ? view.exportCompositePng(scale: s) : view.exportInkPng(scale: s)
      guard let data = img.pngData() else {
        reject("EXPORT_ERROR", "Failed to encode PNG", nil); return
      }
      let outUrl = FileManager.default.temporaryDirectory
        .appendingPathComponent("brush_\(UUID().uuidString).png")
      do {
        try data.write(to: outUrl)
        resolve([
          "uri": outUrl.absoluteString,
          "width": Double(img.size.width),
          "height": Double(img.size.height),
          "scale": Double(s),
          "byteCount": data.count,
          "success": true
        ])
      } catch {
        reject("EXPORT_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc func clear(_ reactTag: NSNumber) {
    DispatchQueue.main.async {
      if let view = self.bridge?.uiManager.view(forReactTag: reactTag) as? BrushCanvasView {
        view.clearDrawing()
      }
    }
  }

  @objc func undo(_ reactTag: NSNumber) {
    DispatchQueue.main.async {
      if let view = self.bridge?.uiManager.view(forReactTag: reactTag) as? BrushCanvasView {
        view.undo()
      }
    }
  }

  @objc func redo(_ reactTag: NSNumber) {
    DispatchQueue.main.async {
      if let view = self.bridge?.uiManager.view(forReactTag: reactTag) as? BrushCanvasView {
        view.redo()
      }
    }
  }
}
