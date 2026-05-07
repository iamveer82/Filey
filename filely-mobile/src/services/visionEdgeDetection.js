/**
 * VisionEdgeDetection — native iOS edge detection using Apple Vision framework.
 * Uses VNDetectRectanglesRequest to find document corners + CIPerspectiveCorrection.
 */
import { NativeModules } from 'react-native';

const { VisionEdgeDetection: Native } = NativeModules;

/**
 * Detect document edges in an image.
 * @param {string} imageUri - file:// or http:// URI
 * @returns {Promise<{ corners: [{x,y}], confidence: number, detected: boolean }>}
 */
export async function detectEdges(imageUri) {
  const result = await Native.detectEdges(imageUri);
  return {
    corners: result.corners,    // [{x, y}] normalized 0-1
    confidence: result.confidence,
    detected: result.detected,
  };
}

/**
 * Apply perspective correction to straighten a document photo.
 * @param {string} imageUri
 * @param {Array<{x:number,y:number}>} corners - normalized 0-1
 * @returns {Promise<{ uri: string }>}
 */
export async function applyPerspectiveCorrection(imageUri, corners) {
  // Convert [{x,y}] to [[x:double, y:double]] for native
  const nativeCorners = corners.map(c => ({ x: c.x, y: c.y }));
  const result = await Native.applyPerspectiveCorrection(imageUri, nativeCorners);
  return { uri: result.uri };
}

/**
 * Crop document using detected corner bounds.
 * @param {string} imageUri
 * @param {Array<{x:number,y:number}>} corners - normalized 0-1
 * @returns {Promise<{ uri: string }>}
 */
export async function cropDocument(imageUri, corners) {
  const nativeCorners = corners.map(c => ({ x: c.x, y: c.y }));
  const result = await Native.cropDocument(imageUri, nativeCorners);
  return { uri: result.uri };
}
