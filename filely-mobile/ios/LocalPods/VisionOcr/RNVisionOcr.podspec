Pod::Spec.new do |s|
  s.name         = 'RNVisionOcr'
  s.version      = '1.0.0'
  s.summary      = 'Native iOS OCR using Apple Vision framework VNRecognizeTextRequest'
  s.description  = 'On-device text extraction from receipts and documents — no AI model needed'
  s.homepage     = 'https://filely.app'
  s.license      = { :type => 'Proprietary', :text => 'Copyright 2026 Filely' }
  s.author       = { 'Filely' => 'dev@filely.app' }
  s.platform     = :ios, '15.0'
  s.source       = { :path => '.' }
  s.source_files = '*.swift', '*.m'
  s.frameworks   = 'Vision', 'UIKit', 'CoreImage'
  s.swift_version = '5.0'
  s.dependency 'React-Core'
end
