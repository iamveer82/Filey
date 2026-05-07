Pod::Spec.new do |s|
  s.name         = 'VisionEdgeDetection'
  s.version      = '1.0.0'
  s.summary      = 'Native iOS document edge detection using Vision framework'
  s.description  = 'Uses VNDetectRectanglesRequest to find document corners for perspective correction'
  s.homepage     = 'https://filely.app'
  s.license      = { :type => 'Proprietary', :text => 'Copyright 2026 Filely' }
  s.author       = { 'Filely' => 'dev@filely.app' }
  s.platform     = :ios, '15.0'
  s.source       = { :path => '.' }
  s.source_files = '*.swift', '*.m'
  s.frameworks   = 'Vision', 'CoreImage', 'UIKit', 'Accelerate'
  s.swift_version = '5.0'
  s.dependency 'React-Core'
end
