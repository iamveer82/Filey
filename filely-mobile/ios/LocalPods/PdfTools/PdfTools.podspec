Pod::Spec.new do |s|
  s.name         = 'PdfTools'
  s.version      = '1.0.0'
  s.summary      = 'Native iOS PDF operations: merge, split, protect, compress using PDFKit'
  s.description  = 'Handles PDF manipulation entirely on-device using Apple PDFKit — no server needed'
  s.homepage     = 'https://filely.app'
  s.license      = { :type => 'Proprietary', :text => 'Copyright 2026 Filely' }
  s.author       = { 'Filely' => 'dev@filely.app' }
  s.platform     = :ios, '15.0'
  s.source       = { :path => '.' }
  s.source_files = '*.swift', '*.m'
  s.frameworks   = 'PDFKit', 'UIKit', 'CryptoKit'
  s.swift_version = '5.0'
  s.dependency 'React-Core'
end
