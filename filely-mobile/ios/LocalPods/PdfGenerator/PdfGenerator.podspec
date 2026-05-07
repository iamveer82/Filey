Pod::Spec.new do |s|
  s.name         = 'PdfGenerator'
  s.version      = '1.0.0'
  s.summary      = 'Native iOS PDF generation using UIGraphicsPDFRenderer'
  s.description  = 'Generates multi-page A4 PDFs from images using native iOS PDFRenderer'
  s.homepage     = 'https://filely.app'
  s.license      = { :type => 'Proprietary', :text => 'Copyright 2026 Filely' }
  s.author       = { 'Filely' => 'dev@filely.app' }
  s.platform     = :ios, '15.0'
  s.source       = { :path => '.' }
  s.source_files = '*.swift'
  s.frameworks   = 'UIKit', 'PDFKit'
  s.swift_version = '5.0'
  s.dependency 'React-Core'
end
