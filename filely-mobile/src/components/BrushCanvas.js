/**
 * BrushCanvas — React Native wrapper around the native PencilKit-backed
 * BrushCanvasView. Exposes a forwardRef API for export / undo / redo / clear.
 *
 * Props:
 *   tool          — 'pen' | 'marker' | 'pencil' | 'eraser' | 'lasso'
 *   strokeColor   — hex string ('#0B1435')
 *   strokeWidth   — number (points)
 *   backgroundUri — optional file:// URI for backdrop image (PDF page render)
 *   showToolPicker— boolean, shows native PKToolPicker palette
 *   style         — RN style (sized container required)
 *
 * Imperative ops via ref:
 *   exportPng({ scale, composite }) → Promise<{ uri, width, height }>
 *   undo(), redo(), clear()
 */
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  requireNativeComponent,
  NativeModules,
  UIManager,
  findNodeHandle,
  Platform,
  View,
  Text,
  StyleSheet,
} from 'react-native';

const NATIVE_NAME = 'BrushCanvasManager';
const NativeBrushCanvas =
  Platform.OS === 'ios' && UIManager.getViewManagerConfig?.(NATIVE_NAME)
    ? requireNativeComponent(NATIVE_NAME)
    : null;
const Manager = NativeModules.BrushCanvasManager;

const BrushCanvas = forwardRef(function BrushCanvas(
  {
    tool = 'pen',
    strokeColor = '#0B1435',
    strokeWidth = 4,
    backgroundUri,
    showToolPicker = false,
    style,
    onExport,
  },
  ref,
) {
  const innerRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      exportPng: async ({ scale = 2, composite = false } = {}) => {
        const tag = findNodeHandle(innerRef.current);
        if (tag == null) throw new Error('BrushCanvas not mounted');
        if (!Manager?.exportPng) throw new Error('Native BrushCanvasManager unavailable');
        return Manager.exportPng(tag, scale, composite ? 1 : 0);
      },
      clear: () => {
        const tag = findNodeHandle(innerRef.current);
        if (tag != null && Manager?.clear) Manager.clear(tag);
      },
      undo: () => {
        const tag = findNodeHandle(innerRef.current);
        if (tag != null && Manager?.undo) Manager.undo(tag);
      },
      redo: () => {
        const tag = findNodeHandle(innerRef.current);
        if (tag != null && Manager?.redo) Manager.redo(tag);
      },
    }),
    [],
  );

  if (!NativeBrushCanvas) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>BrushCanvas requires iOS native build</Text>
      </View>
    );
  }

  return (
    <NativeBrushCanvas
      ref={innerRef}
      style={style}
      tool={tool}
      strokeColor={strokeColor}
      strokeWidth={strokeWidth}
      backgroundUri={backgroundUri}
      showToolPicker={showToolPicker}
      onExport={onExport}
    />
  );
});

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#1a1f33',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  fallbackText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
});

export default BrushCanvas;
