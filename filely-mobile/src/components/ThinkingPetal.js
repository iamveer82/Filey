import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const PETAL_COUNT = 5;
const PETAL_SIZE = 28;
const ORBIT_RADIUS = 18;

function Petal({ index, total, rotation }) {
  const angle = (index / total) * Math.PI * 2;
  const baseX = Math.cos(angle) * ORBIT_RADIUS;
  const baseY = Math.sin(angle) * ORBIT_RADIUS;

  const animStyle = useAnimatedStyle(() => {
    const rot = rotation.value;
    const currentAngle = angle + rot;
    const x = Math.cos(currentAngle) * ORBIT_RADIUS;
    const y = Math.sin(currentAngle) * ORBIT_RADIUS;
    // Petal size pulses slightly based on position in rotation
    const dist = Math.sqrt(x * x + y * y);
    const scale = interpolate(dist, [0, ORBIT_RADIUS], [0.5, 1.0]);

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale },
      ],
      opacity: interpolate(
        Math.abs(Math.sin(currentAngle + Math.PI / 2)),
        [0, 1],
        [0.3, 0.9]
      ),
    };
  });

  return (
    <Animated.View
      style={[
        styles.petal,
        {
          backgroundColor: index % 2 === 0 ? '#3B6BFF' : '#8B9CFF',
          borderRadius: PETAL_SIZE / 2,
        },
        animStyle,
      ]}
    />
  );
}

export default function ThinkingPetal({ color = '#3B6BFF' }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(Math.PI * 2, {
        duration: 2200,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.orbit}>
        {Array.from({ length: PETAL_COUNT }).map((_, i) => (
          <Petal key={i} index={i} total={PETAL_COUNT} rotation={rotation} />
        ))}
        {/* Center dot */}
        <View style={[styles.centerDot, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbit: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petal: {
    position: 'absolute',
    width: PETAL_SIZE,
    height: PETAL_SIZE,
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
    zIndex: 10,
  },
});
