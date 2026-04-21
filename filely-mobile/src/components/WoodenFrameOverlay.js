import React from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Wood grain colors - warm brown palette from design system
const WOOD_COLORS = {
  light: '#D4A574',
  medium: '#B8956A',
  dark: '#8B6914',
  shadow: '#5C4033',
  grain1: '#C49A6C',
  grain2: '#A67C52',
  grain3: '#8B6239',
};

export default function WoodenFrameOverlay({ children }) {
  return (
    <View style={styles.container}>
      {/* Top wood frame */}
      <View style={[styles.frameHorizontal, styles.frameTop]}>
        <View style={styles.woodGrainHorizontal} />
        <View style={styles.frameInnerShadow} />
      </View>

      {/* Bottom wood frame */}
      <View style={[styles.frameHorizontal, styles.frameBottom]}>
        <View style={styles.woodGrainHorizontal} />
        <View style={styles.frameInnerShadowTop} />
      </View>

      {/* Left wood frame */}
      <View style={[styles.frameVertical, styles.frameLeft]}>
        <View style={styles.woodGrainVertical} />
        <View style={styles.frameInnerShadowRight} />
      </View>

      {/* Right wood frame */}
      <View style={[styles.frameVertical, styles.frameRight]}>
        <View style={styles.woodGrainVertical} />
        <View style={styles.frameInnerShadowLeft} />
      </View}

      {/* Corner decorations - carved wood look */}
      <View style={[styles.corner, styles.cornerTL]}>
        <View style={styles.cornerCarving} />
      </View>
      <View style={[styles.corner, styles.cornerTR]}>
        <View style={styles.cornerCarving} />
      </View>
      <View style={[styles.corner, styles.cornerBL]}>
        <View style={styles.cornerCarving} />
      </View>
      <View style={[styles.corner, styles.cornerBR]}>
        <View style={styles.cornerCarving} />
      </View}

      {/* Camera preview area */}
      <View style={styles.cameraArea}>
        {children}
      </View}
    </View>
  );
}

const FRAME_THICKNESS = 40;
const CORNER_SIZE = 60;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  // Horizontal frames (top/bottom)
  frameHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: FRAME_THICKNESS,
    overflow: 'hidden',
  },
  frameTop: {
    top: 0,
    backgroundColor: WOOD_COLORS.medium,
    borderBottomWidth: 2,
    borderBottomColor: WOOD_COLORS.shadow,
  },
  frameBottom: {
    bottom: 0,
    backgroundColor: WOOD_COLORS.medium,
    borderTopWidth: 2,
    borderTopColor: WOOD_COLORS.shadow,
  },

  // Vertical frames (left/right)
  frameVertical: {
    position: 'absolute',
    top: FRAME_THICKNESS,
    bottom: FRAME_THICKNESS,
    width: FRAME_THICKNESS,
    overflow: 'hidden',
  },
  frameLeft: {
    left: 0,
    backgroundColor: WOOD_COLORS.medium,
    borderRightWidth: 2,
    borderRightColor: WOOD_COLORS.shadow,
  },
  frameRight: {
    right: 0,
    backgroundColor: WOOD_COLORS.medium,
    borderLeftWidth: 2,
    borderLeftColor: WOOD_COLORS.shadow,
  },

  // Wood grain effect - horizontal
  woodGrainHorizontal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WOOD_COLORS.medium,
    opacity: 0.9,
  },
  // Wood grain effect - vertical
  woodGrainVertical: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WOOD_COLORS.medium,
    opacity: 0.9,
  },

  // Inner shadows for depth
  frameInnerShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: WOOD_COLORS.shadow,
    opacity: 0.4,
  },
  frameInnerShadowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: WOOD_COLORS.shadow,
    opacity: 0.4,
  },
  frameInnerShadowRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: WOOD_COLORS.shadow,
    opacity: 0.4,
  },
  frameInnerShadowLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: WOOD_COLORS.shadow,
    opacity: 0.4,
  },

  // Corner decorations
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    zIndex: 10,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: WOOD_COLORS.dark,
    backgroundColor: WOOD_COLORS.medium,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: WOOD_COLORS.dark,
    backgroundColor: WOOD_COLORS.medium,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: WOOD_COLORS.dark,
    backgroundColor: WOOD_COLORS.medium,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: WOOD_COLORS.dark,
    backgroundColor: WOOD_COLORS.medium,
  },
  cornerCarving: {
    flex: 1,
    margin: 8,
    borderRadius: 4,
    backgroundColor: WOOD_COLORS.dark,
    opacity: 0.3,
    shadowColor: WOOD_COLORS.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },

  // Camera area
  cameraArea: {
    position: 'absolute',
    top: FRAME_THICKNESS,
    left: FRAME_THICKNESS,
    right: FRAME_THICKNESS,
    bottom: FRAME_THICKNESS,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: WOOD_COLORS.dark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
});
