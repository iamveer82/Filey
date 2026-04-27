/**
 * Client-side image compressor. Shrinks large photos before OCR/upload
 * so a 4MB phone camera photo becomes ~300KB without losing readability.
 *
 * Thresholds:
 *   - <1MB: passthrough
 *   - 1-3MB: resize longest edge to 1600px, jpeg q=0.8
 *   - >3MB:  resize longest edge to 1200px, jpeg q=0.7
 */
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const ONE_MB = 1024 * 1024;

async function byteSize(uri) {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    return info?.size || 0;
  } catch { return 0; }
}

export async function compressIfLarge(uri) {
  if (!uri) return { uri, compressed: false };
  const size = await byteSize(uri);
  if (size < ONE_MB) return { uri, compressed: false, originalSize: size, finalSize: size };

  const maxEdge = size > 3 * ONE_MB ? 1200 : 1600;
  const quality = size > 3 * ONE_MB ? 0.7 : 0.8;
  try {
    const out = await manipulateAsync(
      uri,
      [{ resize: { width: maxEdge } }],
      { compress: quality, format: SaveFormat.JPEG }
    );
    const finalSize = await byteSize(out.uri);
    return { uri: out.uri, compressed: true, originalSize: size, finalSize };
  } catch {
    return { uri, compressed: false, originalSize: size, finalSize: size };
  }
}
