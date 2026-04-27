import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');
const PAD_W = SCREEN_W - 32;
const PAD_H = 300;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SpringBtn({ children, onPress, style, disabled }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(0.95, { damping: 14, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}

export default function SignaturePad({ onDone, onCancel }) {
  const [paths, setPaths] = useState([]);
  const currentPath = useRef('');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = `M${locationX},${locationY}`;
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current += ` L${locationX},${locationY}`;
        setPaths((prev) => {
          const next = [...prev];
          if (next.length === 0) {
            next.push({ d: currentPath.current });
          } else {
            next[next.length - 1] = { d: currentPath.current };
          }
          return next;
        });
      },
      onPanResponderRelease: () => {
        currentPath.current = '';
        setPaths((prev) => [...prev, { d: '' }]);
      },
    })
  ).current;

  const clear = useCallback(() => {
    setPaths([]);
    currentPath.current = '';
  }, []);

  const hasPaths = paths.length > 1 || (paths[0]?.d?.length > 10);

  const save = () => {
    if (!hasPaths) return;
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${PAD_W}" height="${PAD_H}" viewBox="0 0 ${PAD_W} ${PAD_H}"><rect width="100%" height="100%" fill="transparent"/>${paths.filter(p => p.d).map(p => `<path d="${p.d}" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
    onDone?.({ svg: svgStr, paths });
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Digital Signature</Text>
        <Pressable onPress={clear} hitSlop={10} style={styles.clearBtn}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>

      {/* Signature area */}
      <View style={styles.padWrap}>
        <View style={[styles.pad, { width: PAD_W, height: PAD_H }]} {...panResponder.panHandlers}>
          <Svg width={PAD_W} height={PAD_H} style={StyleSheet.absoluteFill}>
            {paths.filter(p => p.d).map((p, i) => (
              <Path
                key={i}
                d={p.d}
                stroke="#FFFFFF"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
          {!hasPaths && (
            <View style={styles.placeholder} pointerEvents="none">
              <Text style={styles.placeholderText}>Draw your signature</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        <SpringBtn onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </SpringBtn>
        <SpringBtn
          onPress={save}
          disabled={!hasPaths}
          style={[styles.saveBtn, !hasPaths && { opacity: 0.45 }]}
        >
          <Text style={styles.saveText}>Continue</Text>
        </SpringBtn>
      </View>
    </View>
  );
}

import { StatusBar } from 'expo-status-bar';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0F1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2A63E2',
  },
  padWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pad: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 15,
    fontWeight: '500',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#2A63E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
