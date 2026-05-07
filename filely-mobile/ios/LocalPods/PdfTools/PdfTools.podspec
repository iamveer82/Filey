Pod::Spec.new do |s|
  s.name         = 'PdfTools'
  s.version      = '2.0.0'
  s.summary      = 'Native iOS PDF operations: 67+ tools — merge, split, encrypt, compress, forms, bookmarks, OCR, convert, optimize, repair using PDFKit + CoreImage'
  s.description  = 'Comprehensive PDF manipulation entirely on-device using Apple PDFKit, CoreGraphics, CoreImage — no server needed'
  s.homepage     = 'https://filey.app'
  s.license      = { :type => 'Proprietary', :text => 'Copyright 2026 Filey' }
  s.author       = { 'Filey' => 'dev@filey.app' }
  s.platform     = :ios, '15.0'
  s.source       = { :path => '.' }
  s.source_files = '*.swift', '*.m'
  s.frameworks   = 'PDFKit', 'UIKit', 'CryptoKit', 'CoreGraphics', 'CoreImage', 'ImageIO', 'AVFoundation', 'Vision', 'WebKit', 'CoreText', 'QuickLookThumbnailing', 'PencilKit'
  s.swift_version = '5.0'
  s.dependency 'React-Core'
  s.dependency 'ZIPFoundation', '~> 0.9.19'
end
