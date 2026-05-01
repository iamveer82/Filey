import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, Layout } from 'react-native-reanimated';
import { Colors } from '../../theme/colors';

const cl = Colors.light;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SegmentedControl({ options, value, onChange }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = options.findIndex((o) => o.value === value);
  const segmentWidth = containerWidth / options.length;

  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withSpring(activeIndex * segmentWidth, { damping: 14, stiffness: 420 });
  }, [activeIndex, segmentWidth, translateX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      {/* Sliding active pill */}
      {containerWidth > 0 && (
        <Animated.View
          layout={Layout.springify().damping(14).stiffness(420)}
          style={[styles.pill, { width: segmentWidth - 4 }, pillStyle]}
        />
      )}
      {options.map((opt, i) => {
        const active = i === activeIndex;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
            style={styles.segment}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: cl.surfaceLow || '#F1F5F9',
    borderRadius: 10,
    padding: 2,
    gap: 2,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 8,
    backgroundColor: cl.primary,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: cl.textMuted || '#64748B',
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
