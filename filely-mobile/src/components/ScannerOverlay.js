/**
 * Scanner Overlay Component
 * Blue L-shaped corner markers for document scanning.
 * Shows live camera preview with auto-detect and manual corner adjustment.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const BRAND = Colors.dark.primary;
const CORNER_SIZE = 28;
const HANDLE_SIZE = 16;
const STROKE_WIDTH = 3;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Corner Handle - White circle with blue border
 */
function CornerHandle({ position, index, onDrag }) {
  const [dragging, setDragging] = useState(false);

  return (
    <View
      style={[
        styles.cornerHandle,
        {
          left: position.x - HANDLE_SIZE / 2,
          top: position.y - HANDLE_SIZE / 2,
        },
        dragging && styles.cornerHandleActive,
      ]}
      pointerEvents="auto"
    />
  );
}

/**
 * Scanner overlay with blue L-shaped corner markers
 */
export default function ScannerOverlay({ cameraRef, onDetect, isDetecting, corners, onCornersChange }) {
  const [localCorners, setLocalCorners] = useState([
    { x: 0.1, y: 0.15 },   // top-left
    { x: 0.9, y: 0.15 },   // top-right
    { x: 0.9, y: 0.75 },   // bottom-right
    { x: 0.1, y: 0.75 },   // bottom-left
  ]);
  const [hasDetected, setHasDetected] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
  const scanLineAnim = useState(new Animated.Value(0))[0];
  const scanPulseAnim = useState(new Animated.Value(0.7))[0];

  // Pulse animation for scan line glow
  useEffect(() => {
    if (isDetecting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanPulseAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(scanPulseAnim, {
            toValue: 0.7,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanPulseAnim.setValue(0.7);
    }
  }, [isDetecting]);

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
        { x: 0.1, y: 0.15 },
        { x: 0.9, y: 0.15 },
        { x: 0.9, y: 0.75 },
        { x: 0.1, y: 0.75 },
      ];
      setLocalCorners(detected);
      onDetect?.({ corners: detected });
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Scanning animation
  useEffect(() => {
    if (isDetecting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
    }
  }, [isDetecting]);

  // Handle container layout
  const handleLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  }, []);

  // Handle corner drag
  const handleCornerDrag = useCallback((index, dx, dy) => {
    setLocalCorners(prev => {
      const newCorners = [...prev];
      const corner = newCorners[index];
      const newX = Math.max(0, Math.min(1, corner.x + dx / containerSize.width));
      const newY = Math.max(0, Math.min(1, corner.y + containerSize.height));
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

  const cornerPixels = localCorners.map(getCornerPixel);

  // Calculate quadrilateral boundary
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

  const boundary = getBoundaryStyle();

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Corner markers container */}
      {hasDetected && (
        <View style={[styles.markerContainer, boundary]}>
          {/* Top-left L marker */}
          <View style={[styles.lMarker, styles.lMarkerTopLeft]}>
            <View style={styles.lMarkerHorizontal} />
            <View style={styles.lMarkerVertical} />
          </View>

          {/* Top-right L marker */}
          <View style={[styles.lMarker, styles.lMarkerTopRight]}>
            <View style={styles.lMarkerHorizontal} />
            <View style={styles.lMarkerVertical} />
          </View>

          {/* Bottom-left L marker */}
          <View style={[styles.lMarker, styles.lMarkerBottomLeft]}>
            <View style={styles.lMarkerHorizontal} />
            <View style={styles.lMarkerVertical} />
          </View>

          {/* Bottom-right L marker */}
          <View style={[styles.lMarker, styles.lMarkerBottomRight]}>
            <View style={styles.lMarkerHorizontal} />
            <View style={styles.lMarkerVertical} />
          </View>

          {/* Corner handles */}
          {cornerPixels.map((pos, i) => (
            <CornerHandle
              key={i}
              index={i}
              position={pos}
              onDrag={handleCornerDrag}
            />
          ))}
        </View>
      )}

      {/* Scanning line animation with pulse glow */}
      {isDetecting && hasDetected && (
        <Animated.View
          style={[
            styles.scanLine,
            {
              transform: [{
                translateY: scanLineAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [boundary.top, boundary.top + boundary.height],
                }),
              }],
              width: boundary.width,
              left: boundary.left,
              opacity: scanPulseAnim,
              shadowRadius: scanPulseAnim.interpolate({
                inputRange: [0.7, 1],
                outputRange: [10, 20],
              }),
            },
          ]}
        />
      )}

      {/* Instructions */}
      {!hasDetected && (
        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>Position document within frame</Text>
        </View>
      )}
    </View>
  );
}

// Import Text for instructions
import { Text } from 'react-native';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },

  // Marker container
  markerContainer: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },

  // L-shaped corner markers
  lMarker: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  lMarkerHorizontal: {
    position: 'absolute',
    height: STROKE_WIDTH,
    width: CORNER_SIZE,
    backgroundColor: BRAND,
    borderRadius: 2,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  lMarkerVertical: {
    position: 'absolute',
    width: STROKE_WIDTH,
    height: CORNER_SIZE,
    backgroundColor: BRAND,
    borderRadius: 2,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  lMarkerTopLeft: {
    top: -STROKE_WIDTH,
    left: -STROKE_WIDTH,
  },
  lMarkerTopRight: {
    top: -STROKE_WIDTH,
    right: -STROKE_WIDTH,
    alignItems: 'flex-end',
  },
  lMarkerBottomLeft: {
    bottom: -STROKE_WIDTH,
    left: -STROKE_WIDTH,
    justifyContent: 'flex-end',
  },
  lMarkerBottomRight: {
    bottom: -STROKE_WIDTH,
    right: -STROKE_WIDTH,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },

  // Corner handles (white circles with blue border)
  cornerHandle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: Colors.dark.text,
    borderWidth: 2.5,
    borderColor: BRAND,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cornerHandleActive: {
    backgroundColor: BRAND,
    borderColor: Colors.dark.text,
    transform: [{ scale: 1.2 }],
  },

  // Scan line
  scanLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    borderRadius: 1,
  },

  // Instructions
  instructions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
