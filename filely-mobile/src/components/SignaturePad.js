/**
 * SignaturePad — PencilKit-backed signature canvas (replaces the SVG version).
 *
 * Uses the native BrushCanvas (PKCanvasView) so Apple Pencil pressure / tilt
 * are honoured. Output is a transparent PNG file URI suitable for direct
 * passing to PdfTools.embedSignature.
 *
 *   onDone({ pngUri, width, height })
 *   onCancel()
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import BrushCanvas from './BrushCanvas';

const { width: SCREEN_W } = Dimensions.get('window');
const PAD_W = SCREEN_W - 32;
const PAD_H = 300;

const COLORS = ['#0B1435', '#2A63E2', '#1F2937', '#7C3AED'];
const WIDTHS = [
  { id: 'fine', value: 3, label: 'Fine' },
  { id: 'med',  value: 5, label: 'Med' },
  { id: 'bold', value: 8, label: 'Bold' },
];

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
  const canvasRef = useRef(null);
  const [color, setColor] = useState('#0B1435');
  const [width, setWidth] = useState(5);
  const [isEmpty, setIsEmpty] = useState(true);
  const [busy, setBusy] = useState(false);

  const clear = useCallback(() => {
    canvasRef.current?.clear();
    setIsEmpty(true);
  }, []);

  const onTouchStart = useCallback(() => {
    if (isEmpty) setIsEmpty(false);
  }, [isEmpty]);

  const save = useCallback(async () => {
    if (!canvasRef.current) return;
    setBusy(true);
    try {
      const exp = await canvasRef.current.exportPng({ scale: 3, composite: false });
      // Heuristic: tiny PNG = empty drawing
      if (exp.byteCount && exp.byteCount < 4096) {
        setBusy(false);
        return;
      }
      onDone?.(exp);
    } finally {
      setBusy(false);
    }
  }, [onDone]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Digital Signature</Text>
        <Pressable onPress={clear} hitSlop={10} style={styles.clearBtn}>
          <Ionicons name="refresh" size={14} color="#2A63E2" />
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.padWrap}>
        <View
          style={[styles.pad, { width: PAD_W, height: PAD_H }]}
          onTouchStart={onTouchStart}
        >
          <BrushCanvas
            ref={canvasRef}
            style={StyleSheet.absoluteFill}
            tool="pen"
            strokeColor={color}
            strokeWidth={width}
            showToolPicker={false}
          />
          {isEmpty && (
            <View style={styles.placeholder} pointerEvents="none">
              <Ionicons name="pencil-outline" size={28} color="rgba(255,255,255,0.25)" />
              <Text style={styles.placeholderText}>Sign with finger or Apple Pencil</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tools */}
      <View style={styles.toolBar}>
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && styles.colorDotActive,
              ]}
            />
          ))}
        </View>
        <View style={styles.widthRow}>
          {WIDTHS.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => setWidth(w.value)}
              style={[styles.widthChip, width === w.value && styles.widthChipActive]}
            >
              <View
                style={[
                  styles.widthDot,
                  { width: w.value + 2, height: w.value + 2, backgroundColor: color },
                ]}
              />
              <Text
                style={[
                  styles.widthChipText,
                  width === w.value && styles.widthChipTextActive,
                ]}
              >
                {w.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.bottomBar}>
        <SpringBtn onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </SpringBtn>
        <SpringBtn
          onPress={save}
          disabled={isEmpty || busy}
          style={[styles.saveBtn, (isEmpty || busy) && { opacity: 0.45 }]}
        >
          <Text style={styles.saveText}>{busy ? 'Saving…' : 'Continue'}</Text>
        </SpringBtn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0F1E' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearText: { fontSize: 14, fontWeight: '700', color: '#2A63E2' },

  padWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pad: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderText: { color: 'rgba(255,255,255,0.32)', fontSize: 13, fontWeight: '500' },

  toolBar: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 6,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  colorDotActive: {
    borderWidth: 2.5,
    borderColor: '#2A63E2',
    transform: [{ scale: 1.1 }],
  },
  widthRow: { flexDirection: 'row', gap: 8 },
  widthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  widthChipActive: { backgroundColor: '#2A63E2' },
  widthDot: { borderRadius: 999 },
  widthChipText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  widthChipTextActive: { color: '#FFFFFF' },

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
  cancelText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#2A63E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
