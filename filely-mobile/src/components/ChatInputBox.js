import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Animated, Easing,
  Platform, Keyboard, Dimensions, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

function SpringPressable({ children, onPress, disabled, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, friction: 8, tension: 300 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 300 }).start()}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}

export default function ChatInputBox({
  value,
  onChangeText,
  onSend,
  onAttach,
  onCamera,
  onPhotos,
  onFileUpload,
  loading,
  placeholder,
  bottomOffset = 0,
}) {
  const insets = useSafeAreaInsets();
  const [showMenu, setShowMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);

  const hasContent = value.trim().length > 0;

  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (loading) return;
    if (isRecording) {
      setIsRecording(false);
      onSend?.(`[Voice message - ${recordingTime}s]`, []);
    } else if (hasContent) {
      onSend?.(value, []);
      onChangeText?.('');
    }
  };

  const handleMic = () => {
    if (isRecording) {
      setIsRecording(false);
      onSend?.(`[Voice message - ${recordingTime}s]`, []);
    } else {
      setIsRecording(true);
    }
  };

  return (
    <>
      <View style={[styles.container, { paddingBottom: bottomOffset }]}>
        <View style={styles.box}>
          {/* Left: plus */}
          <SpringPressable onPress={() => setShowMenu(true)} style={styles.iconBtn}>
            <Ionicons name="add" size={24} color="#0B1435" />
          </SpringPressable>

          {/* Center: text input or recorder */}
          {isRecording ? (
            <View style={styles.recorder}>
              <View style={styles.recorderHeader}>
                <View style={styles.recordingDot} />
                <Text style={styles.recorderTime}>{formatTime(recordingTime)}</Text>
              </View>
              <View style={styles.visualizer}>
                {Array.from({ length: 24 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(20, Math.random() * 100)}%`,
                        opacity: 0.4 + Math.random() * 0.4,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.inputWrap}>
              <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder || 'Chat with Claude'}
                placeholderTextColor="rgba(11,20,53,0.35)"
                style={styles.input}
                multiline
                maxLength={4000}
                editable={!loading}
                onSubmitEditing={handleSend}
              />
            </View>
          )}

          {/* Right: mic when empty, send arrow when has text */}
          {!hasContent && !isRecording ? (
            <SpringPressable onPress={handleMic} style={styles.iconBtn}>
              <Ionicons name="mic" size={22} color="#0B1435" />
            </SpringPressable>
          ) : (
            <SpringPressable
              onPress={handleSend}
              disabled={loading}
              style={[
                styles.sendBtn,
                !loading
                  ? { backgroundColor: '#2A63E2' }
                  : { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: 'rgba(11,20,53,0.12)' },
              ]}
            >
              <Ionicons
                name={loading ? 'stop' : 'arrow-up'}
                size={18}
                color={!loading ? '#FFFFFF' : '#94A3B8'}
              />
            </SpringPressable>
          )}
        </View>
      </View>

      {/* Drop-up menu */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setShowMenu(false)}>
          <View style={styles.menuSheet}>
            <View style={styles.menuHandle} />
            <Text style={styles.menuTitle}>Add to chat</Text>

            <Pressable
              onPress={() => { setShowMenu(false); onCamera?.(); }}
              style={styles.menuRow}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#2A63E2' }]}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Camera</Text>
                <Text style={styles.menuSub}>Scan a receipt or invoice</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(11,20,53,0.25)" />
            </Pressable>

            <Pressable
              onPress={() => { setShowMenu(false); onPhotos?.(); }}
              style={styles.menuRow}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="images" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Photos</Text>
                <Text style={styles.menuSub}>Pick from your library</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(11,20,53,0.25)" />
            </Pressable>

            <Pressable
              onPress={() => { setShowMenu(false); onFileUpload?.(); }}
              style={styles.menuRow}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#16A34A' }]}>
                <Ionicons name="document-text" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>File upload</Text>
                <Text style={styles.menuSub}>PDF invoices or documents</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(11,20,53,0.25)" />
            </Pressable>

            <Pressable onPress={() => setShowMenu(false)} style={styles.menuCancel}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F4F5F7',
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  inputWrap: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  input: {
    color: '#0B1435',
    fontSize: 15.5,
    lineHeight: 22,
    paddingTop: 4,
    paddingBottom: 4,
    maxHeight: 120,
    paddingHorizontal: 6,
  },
  recorder: {
    flex: 1,
    paddingVertical: 4,
    alignItems: 'center',
  },
  recorderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  recorderTime: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    color: '#0B1435',
  },
  visualizer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 28,
    width: '100%',
  },
  bar: {
    width: 3,
    backgroundColor: 'rgba(11,20,53,0.35)',
    borderRadius: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Drop-up menu */
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    gap: 8,
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(11,20,53,0.15)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0B1435',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(11,20,53,0.06)',
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    color: '#0B1435',
    fontSize: 15,
    fontWeight: '700',
  },
  menuSub: {
    color: 'rgba(11,20,53,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  menuCancel: {
    marginTop: 4,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(11,20,53,0.08)',
  },
  menuCancelText: {
    color: '#0B1435',
    fontSize: 15,
    fontWeight: '600',
  },
});
