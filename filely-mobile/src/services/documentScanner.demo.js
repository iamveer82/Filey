/**
 * Mock Document Scanner Service for Expo Go Demo
 * Simulates document edge detection, cropping, and enhancement
 */

import * as FileSystem from 'expo-file-system';
import DemoConfig from '../lib/demoMode';

// Simulate document edge detection
export const detectDocumentEdges = async (imageUri) => {
  await simulateDelay(DemoConfig.mockDetectionDelay);

  // Return mock corners (A4 document proportions)
  return {
    success: true,
    corners: [
      { x: 0.12, y: 0.18 },
      { x: 0.88, y: 0.18 },
      { x: 0.88, y: 0.78 },
      { x: 0.12, y: 0.78 },
    ],
  };
};

// Simulate auto-crop (returns same image in demo)
export const autoCropDocument = async (imageUri, corners, width, height) => {
  await simulateDelay(300);

  return {
    success: true,
    croppedUri: imageUri,
    dimensions: { width, height },
  };
};

// Simulate perspective correction
export const applyPerspectiveCorrection = async (imageUri, corners) => {
  await simulateDelay(200);

  return imageUri;
};

// Simulate image enhancement
export const enhanceDocumentImage = async (imageUri, options = {}) => {
  await simulateDelay(DemoConfig.mockProcessingDelay);

  return imageUri;
};

// Simulate PDF generation
export const generatePdfFromImages = async (imageUris) => {
  await simulateDelay(1000);

  const mockPdfPath = `${FileSystem.cacheDirectory}mock-scan-${Date.now()}.pdf`;

  return {
    success: true,
    outputUri: mockPdfPath,
    pageCount: imageUris.length,
  };
};

// Simulate gallery picker
export const pickFromGallery = async () => {
  // In real app, this would open image picker
  // In demo, we return a mock "picked" image reference
  return {
    success: false, // Gallery not available in demo
    message: 'Gallery demo not available - use camera',
  };
};

// Helper function for delays
const simulateDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default {
  detectDocumentEdges,
  autoCropDocument,
  applyPerspectiveCorrection,
  enhanceDocumentImage,
  generatePdfFromImages,
  pickFromGallery,
};
