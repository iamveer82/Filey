import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Wood texture colors - dark wood plank background
const WOOD_COLORS = {
  dark1: '#2C1810',    // Darkest wood
  dark2: '#3D2418',    // Medium dark
  dark3: '#4A2E1E',    // Lighter wood
  grain1: '#1A0F0A',   // Darkest grain
  grain2: '#2A1810',   // Medium grain
  accent: '#5C3D2E',   // Highlight
};

/**
 * WoodBackground - Dark wood plank texture background for scanner
 * Creates a realistic desk/table surface look
 */
export default function WoodBackground({ children }) {
  return (
    <View style={styles.container}>
      {/* Wood plank background */}
      <View style={styles.woodBackground}>
        {/* Vertical wood planks */}
        <View style={[styles.plank, { backgroundColor: WOOD_COLORS.dark1 }]} />
        <View style={[styles.plank, { backgroundColor: WOOD_COLORS.dark2 }]} />
        <View style={[styles.plank, { backgroundColor: WOOD_COLORS.dark3 }]} />
        <View style={[styles.plank, { backgroundColor: WOOD_COLORS.dark1 }]} />
        <View style={[styles.plank, { backgroundColor: WOOD_COLORS.dark2 }]} />

        {/* Wood grain overlay lines */}
        <View style={styles.grainOverlay}>
          {[...Array(20)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.grainLine,
                {
                  left: `${i * 5}%`,
                  opacity: 0.1 + (i % 3) * 0.05,
                },
              ]}
            />
          ))}
        </View>

        {/* Horizontal grain texture */}
        <View style={styles.horizontalGrain}>
          {[...Array(40)].map((_, i) => (
            <View
              key={`h-${i}`}
              style={[
                styles.horizontalLine,
                {
                  top: `${i * 2.5}%`,
                  opacity: 0.05 + (i % 5) * 0.02,
                },
              ]}
            />
          ))}
        </View>

        {/* Wood knots/details */}
        <View style={[styles.knot, { top: '15%', left: '20%' }]} />
        <View style={[styles.knot, { top: '65%', left: '75%' }]} />
        <View style={[styles.knot, { top: '40%', left: '60%', transform: [{ scale: 0.7 }] }]} />
      </View>

      {/* Content (Camera Preview) */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const PLANK_COUNT = 5;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WOOD_COLORS.dark1,
  },
  woodBackground: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  plank: {
    flex: 1,
    borderRightWidth: 2,
    borderRightColor: 'rgba(0,0,0,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  },
  grainOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  grainLine: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: '#000',
  },
  horizontalGrain: {
    ...StyleSheet.absoluteFillObject,
  },
  horizontalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#000',
  },
  knot: {
    position: 'absolute',
    width: 40,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
