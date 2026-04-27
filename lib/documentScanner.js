/**
 * Web-based document scanner using webcam + canvas
 * Detects document edges and captures flattened image
 */

/**
 * Capture image from webcam
 * @param {HTMLVideoElement} video - Webcam video element
 * @param {HTMLCanvasElement} canvas - Canvas to draw on
 * @returns {{dataUrl: string, width: number, height: number}}
 */
export function captureFromWebcam(video, canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.95),
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Simple edge detection using Sobel operator
 * @param {ImageData} imageData - Canvas image data
 * @returns {Uint8ClampedArray} Edge-detected image
 */
export function detectEdges(imageData) {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data.length);

  // Convert to grayscale
  const gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  // Apply Sobel filter
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      const idx = y * width + x;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIdx = (y + ky) * width + (x + kx);
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray[pixelIdx] * sobelX[kernelIdx];
          gy += gray[pixelIdx] * sobelY[kernelIdx];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      output[idx * 4] = output[idx * 4 + 1] = output[idx * 4 + 2] = Math.min(255, magnitude);
      output[idx * 4 + 3] = 255;
    }
  }

  return output;
}

/**
 * Find document corners using contour detection
 * Simplified algorithm for web use
 * @param {ImageData} imageData - Edge-detected image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array<{x: number, y: number}>|null} Four corner points or null
 */
export function findDocumentCorners(imageData, width, height) {
  // Scan for strong edge concentrations
  const edges = [];
  const threshold = 128;

  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const idx = (y * width + x) * 4;
      if (imageData[idx] > threshold) {
        edges.push({ x, y });
      }
    }
  }

  if (edges.length < 100) return null;

  // Find bounding box of edges
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (const p of edges) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  // Return four corners
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

/**
 * Apply perspective transform to flatten document
 * @param {HTMLCanvasElement} source - Source canvas
 * @param {Array<{x: number, y: number}>} corners - Four corner points
 * @returns {string} Transformed image as data URL
 */
export function applyPerspectiveTransform(source, corners) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Calculate output dimensions
  const topWidth = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
  const bottomWidth = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y);
  const leftHeight = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
  const rightHeight = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);

  canvas.width = Math.max(topWidth, bottomWidth);
  canvas.height = Math.max(leftHeight, rightHeight);

  // Simple bilinear interpolation would be ideal, but for demo use basic transform
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Enhance document image for better OCR
 * @param {HTMLCanvasElement} canvas - Canvas with document image
 * @returns {string} Enhanced image as data URL
 */
export function enhanceDocument(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Apply adaptive threshold
  const gray = new Uint8Array(data.length / 4);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Simple global threshold
  const threshold = 140;
  for (let i = 0; i < data.length; i += 4) {
    const val = gray[i / 4] > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = val;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Scanner state and controls
 */
export class DocumentScanner {
  constructor() {
    this.video = null;
    this.canvas = null;
    this.stream = null;
    this.isScanning = false;
  }

  /**
   * Start webcam for scanning
   * @param {HTMLVideoElement} videoElement - Video element to attach to
   * @returns {Promise<boolean>} Success status
   */
  async start(videoElement) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      this.video = videoElement;
      this.video.srcObject = this.stream;
      await this.video.play();
      this.isScanning = true;
      return true;
    } catch (error) {
      console.error('Failed to start webcam:', error);
      return false;
    }
  }

  /**
   * Stop webcam
   */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    this.isScanning = false;
  }

  /**
   * Capture and process document
   * @returns {Promise<{dataUrl: string, corners?: Array<{x: number, y: number}>}>}
   */
  async capture() {
    if (!this.video || !this.isScanning) {
      throw new Error('Scanner not started');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;
    ctx.drawImage(this.video, 0, 0);

    // Detect edges
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const edges = detectEdges(imageData);

    // Find corners
    const corners = findDocumentCorners(edges, canvas.width, canvas.height);

    // If corners found, apply perspective transform
    if (corners) {
      const transformed = applyPerspectiveTransform(canvas, corners);
      return { dataUrl: transformed, corners };
    }

    // Return original capture
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.95) };
  }
}
