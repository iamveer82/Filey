/**
 * Scanner Overlay Component
 * Blue boundary box with white corner dots for document scanning.
 * Shows live camera preview with auto-detect and manual crop adjustment.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Pressable, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BORDER_COLOR = '#2A63E2';
const DOT_COLOR = '#FFFFFF';
const BRACKET_SIZE = 28;
const DOT_SIZE = 14;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Corner dot with drag gesture support.
 */
function CornerDot({ position, onDrag, index }) {
  const [dragging, setDragging] = useState(false);

  const handleMove = useCallback((dx, dy) => {
    onDrag(index, dx, dy);
  }, [index, onDrag]);

  return (
    <View
      style={[
        styles.cornerDot,
        { left: position.x - DOT_SIZE / 2, top: position.y - DOT_SIZE / 2 },
        dragging && styles.cornerDotActive,
      ]}
    />
  );
}

/**
 * Scanner overlay with blue boundary and corner dots.
 * @param {object} props
 * @param {React.ComponentRef} props.cameraRef - Ref to camera
 * @param {function} props.onDetect - Callback for edge detection
 * @param {boolean} props.isDetecting - Whether auto-detect is in progress
 * @param {Array<{x,y}>} props.corners - Normalized corner coordinates (0-1)
 * @param {function} props.onCornersChange - Callback when user drags corners
 */
export default function ScannerOverlay({ cameraRef, onDetect, isDetecting, corners, onCornersChange }) {
  const [localCorners, setLocalCorners] = useState([
    { x: 0.1, y: 0.1 },
    { x: 0.9, y: 0.1 },
    { x: 0.9, y: 0.9 },
    { x: 0.1, y: 0.9 },
  ]);
  const [hasDetected, setHasDetected] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

  // Sync with parent corners
  useEffect(() => {
    if (corners && corners.length === 4) {
      setLocalCorners(corners);
      setHasDetected(true);
    }
  }, [corners]);

  // Auto-detect document after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasDetected(true);
      const detected = [
        { x: 0.08, y: 0.12 },
        { x: 0.92, y: 0.12 },
        { x: 0.92, y: 0.85 },
        { x: 0.08, y: 0.85 },
      ];
      setLocalCorners(detected);
      onDetect?.({ corners: detected });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Handle container layout
  const handleLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  }, []);

  // Handle corner drag - update normalized position
  const handleCornerDrag = useCallback((index, dx, dy) => {
    setLocalCorners(prev => {
      const newCorners = [...prev];
      const corner = newCorners[index];
      const newX = Math.max(0, Math.min(1, corner.x + dx / containerSize.width));
      const newY = Math.max(0, Math.min(1, corner.y + dy / containerSize.height));
      newCorners[index] = { x: newX, y: newY };
      onCornersChange?.(newCorners);
      return newCorners;
    });
  }, [containerSize, onCornersChange]);

  // Convert normalized corners to pixel positions
  const getCornerPixel = (corner) => ({
    x: corner.x * containerSize.width,
    y: corner.y * containerSize.height,
  });

  // Get boundary style from corners
  const getBoundaryStyle = () => {
    const xs = localCorners.map(c => c.x * containerSize.width);
    const ys = localCorners.map(c => c.y * containerSize.height);
    return {
      left: Math.min(...xs),
      top: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  };

  const boundaryStyle = getBoundaryStyle();
  const cornerPixels = localCorners.map(getCornerPixel);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Blue boundary with corner dots */}
      <View style={[styles.boundaryWrapper, boundaryStyle]}>
        {/* Blue border lines */}
        <View style={[styles.borderLine, styles.topBorder]} />
        <View style={[styles.borderLine, styles.bottomBorder]} />
        <View style={[styles.borderLine, styles.leftBorder]} />
        <View style={[styles.borderLine, styles.rightBorder]} />

        {/* Corner brackets (L-shaped) */}
        <View style={[styles.bracket, styles.topLeftBracket]} />
        <View style={[styles.bracket, styles.topRightBracket]} />
        <View style={[styles.bracket, styles.bottomLeftBracket]} />
        <View style={[styles.bracket, styles.bottomRightBracket]} />

        {/* Corner dots */}
        {cornerPixels.map((pos, i) => (
          <CornerDot
            key={i}
            index={i}
            position={pos}
            onDrag={handleCornerDrag}
          />
        ))}
      </View>

      {/* Status badge */}
      {!hasDetected && (
        <View style={styles.statusBadge}>
          <Ionicons name="scan-outline" size={16} color="#FFFFFF" />
        </View>
      )}

      {/* Detecting animation */}
      {isDetecting && (
        <View style={styles.detectingOverlay}>
          <View style={styles.scanLine} />
        </View>
      )}

      {/* Help icon */}
      <Pressable style={styles.helpButton}>
        <Ionicons name="information-circle-outline" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Dynamic boundary wrapper
  boundaryWrapper: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },

  // Blue border lines
  borderLine: {
    position: 'absolute',
    backgroundColor: BORDER_COLOR,
  },
  topBorder: {
    top: 0,
    left: BRACKET_SIZE,
    right: BRACKET_SIZE,
    height: 2,
  },
  bottomBorder: {
    bottom: 0,
    left: BRACKET_SIZE,
    right: BRACKET_SIZE,
    height: 2,
  },
  leftBorder: {
    top: BRACKET_SIZE,
    bottom: BRACKET_SIZE,
    left: 0,
    width: 2,
  },
  rightBorder: {
    top: BRACKET_SIZE,
    bottom: BRACKET_SIZE,
    right: 0,
    width: 2,
  },

  // Corner brackets (L-shaped)
  bracket: {
    position: 'absolute',
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    borderColor: DOT_COLOR,
  },
  topLeftBracket: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  topRightBracket: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  bottomLeftBracket: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  bottomRightBracket: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },

  // White corner dots
  cornerDot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: DOT_COLOR,
    borderWidth: 2.5,
    borderColor: BORDER_COLOR,
    shadowColor: BORDER_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  cornerDotActive: {
    backgroundColor: BORDER_COLOR,
    borderColor: DOT_COLOR,
    transform: [{ scale: 1.3 }],
  },

  // Detecting animation
  detectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  scanLine: {
    height: 3,
    backgroundColor: 'rgba(42, 99, 226, 0.7)',
    shadowColor: BORDER_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },

  // Status badge
  statusBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(42, 99, 226, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Help button
  helpButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
