import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Animated, Easing,
  Platform, Keyboard, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

const BG = '#FFFFFF';
const BG_ELEVATED = '#F8FAFC';
const BORDER = 'rgba(11,20,53,0.08)';
const BORDER_SUBTLE = 'rgba(11,20,53,0.06)';
const TEXT_PRIMARY = '#0B1435';
const TEXT_SECONDARY = 'rgba(11,20,53,0.65)';
const TEXT_MUTED = '#94A3B8';
const PRIMARY = '#2A63E2';

function AnimatedIcon({ name, size, color, active, activeColor }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(rotation, { toValue: active ? 1 : 0, useNativeDriver: true, friction: 8, tension: 260 }),
      Animated.spring(scale, { toValue: active ? 1.1 : 1, useNativeDriver: true, friction: 8, tension: 300 }),
    ]).start();
  }, [active]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }, { scale }] }}>
      <Ionicons name={name} size={size} color={active ? activeColor : color} />
    </Animated.View>
  );
}

function ToggleChip({ icon, label, active, activeColor, onPress }) {
  const widthAnim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: active ? 1 : 0,
      duration: 200,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [active]);

  return (
    <Pressable
      onPress={onPress}
      style={[
        chipStyles.chip,
        active && { borderColor: activeColor, backgroundColor: activeColor + '18' },
      ]}
    >
      <AnimatedIcon
        name={icon}
        size={16}
        color={TEXT_MUTED}
        active={active}
        activeColor={activeColor}
      />
      <Animated.Text
        style={[
          chipStyles.label,
          {
            width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 'auto'] }),
            opacity: widthAnim,
            color: active ? activeColor : TEXT_MUTED,
          },
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    height: 32,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    overflow: 'hidden',
  },
});

const Divider = () => (
  <View style={dividerStyles.container}>
    <View style={dividerStyles.line} />
  </View>
);

const dividerStyles = StyleSheet.create({
  container: {
    height: 24,
    width: 2,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 1.5,
    height: 16,
    backgroundColor: BORDER,
    borderRadius: 1,
  },
});

export default function ChatInputBox({
  value,
  onChangeText,
  onSend,
  onAttach,
  loading,
  placeholder,
  bottomOffset = 0,
}) {
  const insets = useSafeAreaInsets();
  const [showSearch, setShowSearch] = useState(false);
  const [showThink, setShowThink] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const hasContent = value.trim().length > 0;

  useEffect(() => {
    if (isRecording) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleToggle = (type) => {
    if (type === 'search') { setShowSearch(p => !p); setShowThink(false); setShowCanvas(false); }
    else if (type === 'think') { setShowThink(p => !p); setShowSearch(false); setShowCanvas(false); }
    else { setShowCanvas(p => !p); setShowSearch(false); setThink(false); }
  };

  const getPlaceholder = () => {
    if (showSearch) return 'Search the web...';
    if (showThink) return 'Think deeply...';
    if (showCanvas) return 'Create on canvas...';
    return placeholder || 'Type your message...';
  };

  const handleSendPress = () => {
    if (isRecording) {
      setIsRecording(false);
      onSend?.(`[Voice message - ${recordingTime}s]`, []);
    } else if (hasContent) {
      let prefix = '';
      if (showSearch) prefix = '[Search: ';
      else if (showThink) prefix = '[Think: ';
      else if (showCanvas) prefix = '[Canvas: ';
      const msg = prefix ? `${prefix}${value}]` : value;
      onSend?.(msg, []);
      onChangeText?.('');
      setShowSearch(false);
      setShowThink(false);
      setShowCanvas(false);
    } else {
      setIsRecording(true);
    }
  };

  const sendIcon = loading ? 'stop' : isRecording ? 'stop-circle' : hasContent ? 'arrow-up' : 'mic';
  const sendColor = loading || isRecording ? '#EF4444' : hasContent ? '#FFFFFF' : '#9CA3AF';
  const sendBg = hasContent && !loading && !isRecording ? PRIMARY : BG_ELEVATED;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 4) + bottomOffset }]}>
      <View style={styles.box}>
        {/* Text Input */}
        <View style={styles.inputWrap}>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={getPlaceholder()}
            placeholderTextColor="#6B7280"
            style={styles.input}
            multiline
            maxLength={4000}
            editable={!isRecording && !loading}
            onSubmitEditing={handleSendPress}
          />
        </View>

        {/* Voice Recorder */}
        {isRecording && (
          <View style={styles.recorder}>
            <View style={styles.recorderHeader}>
              <View style={styles.recordingDot} />
              <Text style={styles.recorderTime}>{formatTime(recordingTime)}</Text>
            </View>
            <View style={styles.visualizer}>
              {Array.from({ length: 24 }).map((_, i) => (
                <Animated.View
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
        )}

        {/* Actions Row */}
        <View style={styles.actions}>
          <View style={styles.leftActions}>
            {/* Attach */}
            <Pressable onPress={onAttach} style={styles.iconBtn} disabled={isRecording}>
              <Ionicons name="attach" size={20} color={isRecording ? '#4B5563' : '#9CA3AF'} />
            </Pressable>

            <Divider />

            {/* Toggles */}
            <ToggleChip
              icon="globe"
              label="Search"
              active={showSearch}
              activeColor="#1EAEDB"
              onPress={() => handleToggle('search')}
            />
            <ToggleChip
              icon="brain"
              label="Think"
              active={showThink}
              activeColor="#8B5CF6"
              onPress={() => handleToggle('think')}
            />
            <ToggleChip
              icon="code-slash"
              label="Canvas"
              active={showCanvas}
              activeColor="#F97316"
              onPress={() => handleToggle('canvas')}
            />
          </View>

          {/* Send Button */}
          <Pressable
            onPress={handleSendPress}
            disabled={loading && !hasContent}
            style={[styles.sendBtn, { backgroundColor: sendBg }]}
          >
            <Ionicons
              name={sendIcon}
              size={20}
              color={sendColor}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  box: {
    backgroundColor: BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    shadowColor: '#0B1435',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  inputWrap: {
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    color: TEXT_PRIMARY,
    fontSize: 15.5,
    lineHeight: 22,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 120,
  },
  recorder: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  recorderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
    color: TEXT_SECONDARY,
  },
  visualizer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 32,
    width: '100%',
  },
  bar: {
    width: 3,
    backgroundColor: TEXT_SECONDARY,
    borderRadius: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_SUBTLE,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
