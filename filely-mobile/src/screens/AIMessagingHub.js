import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInUp, FadeIn, FadeOut, ZoomIn, SlideInRight,
  useSharedValue, useAnimatedStyle, withSpring, withRepeat,
  withSequence, withTiming, withDelay, interpolate, Easing,
  Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ─── Spring Pressable ──────────────────────────────────── */
function SpringPressable({ children, onPress, style, disabled, accessibilityLabel, accessibilityRole, accessibilityState }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.93, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
      activeOpacity={0.9}
      disabled={disabled}
      style={[style, animStyle]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole || 'button'}
      accessibilityState={accessibilityState}
    >
      {children}
    </AnimatedTouchable>
  );
}

/* ─── Typing Indicator (3 pulsing dots) ─────────────────── */
function TypingIndicator({ color }) {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    dot1.value = withRepeat(withSequence(
      withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })
    ), -1, false);
    dot2.value = withDelay(150, withRepeat(withSequence(
      withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })
    ), -1, false));
    dot3.value = withDelay(300, withRepeat(withSequence(
      withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })
    ), -1, false));
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value, transform: [{ scale: dot1.value }] }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value, transform: [{ scale: dot2.value }] }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value, transform: [{ scale: dot3.value }] }));

  return (
    <View style={styles.typingRow}>
      <Animated.View style={[styles.typingDot, { backgroundColor: color }, s1]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: color }, s2]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: color }, s3]} />
    </View>
  );
}

/* ─── Rotating Sparkle for Empty State ──────────────────── */
function RotatingSparkle({ color, size = 64 }) {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 8000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withSequence(
      withTiming(1.12, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: pulse.value },
    ],
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name="sparkles" size={size} color={color} />
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════════════
   AIMessagingHub
   ═══════════════════════════════════════════════════════════ */
export default function AIMessagingHub({ darkMode, activeTab = 'cowork' }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const { profile, orgId, userId } = useAuth();
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [sending, setSending]       = useState(false);
  const scrollRef = useRef();

  useEffect(() => { loadMessages(); }, [currentTab]);

  const loadMessages = async () => {
    try {
      const sessionId = currentTab === 'cowork' ? 'team-session' : 'ai-session';
      const data = await api.getChatMessages(sessionId);
      setMessages((data.messages || []).map(m => ({ ...m, id: m.id || generateId(), ts: m.ts || Date.now() })));
    } catch (e) {
      // Silent — empty state shown
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    setLoading(true);

    const userMsgId = generateId();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: text, ts: Date.now() }]);

    try {
      const sessionId = currentTab === 'cowork' ? 'team-session' : 'ai-session';
      const response = await api.sendMessage(text, sessionId);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: response.message,
        extractedTransaction: response.extractedTransaction,
        ts: Date.now(),
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: 'Connection error. Please try again.',
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
      setSending(false);
    }
  };

  const handleStapleTransaction = async (transaction) => {
    try {
      await api.createTransaction(transaction);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'system',
        content: `Transaction stapled to vault: ${transaction.merchant} — ${transaction.amount} AED`,
        ts: Date.now(),
      }]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save transaction');
    }
  };

  const quickPrompts = [
    'Draft VAT summary',
    'Explain corporate tax',
    'Categorize this expense',
    'Export monthly report',
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* ── Tab Switcher ──────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.duration(400).springify()}
        style={[styles.tabContainer, { borderBottomColor: c.border }]}
      >
        {[['cowork', 'Co-work', 'people'], ['assistant', 'AI Assistant', 'sparkles']].map(([val, label, icon]) => (
          <SpringPressable
            key={val}
            onPress={() => setCurrentTab(val)}
            style={[
              styles.tab,
              currentTab === val
                ? { backgroundColor: '#44e571', borderColor: 'rgba(0,83,31,0.3)', ...Shadow.limeSm }
                : { backgroundColor: c.surfaceLow, borderColor: c.border },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: currentTab === val }}
            accessibilityLabel={label}
          >
            <Ionicons name={icon} size={16} color={currentTab === val ? '#003516' : c.textMuted} />
            <Text style={[styles.tabText, { color: currentTab === val ? '#003516' : c.text }]}>{label}</Text>
          </SpringPressable>
        ))}
      </Animated.View>

      {/* ── Messages List ─────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: Spacing.lg }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <Animated.View entering={FadeIn.delay(200).duration(600)} style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: currentTab === 'cowork' ? c.limeBg : c.accentBg }]}>
              {currentTab === 'cowork'
                ? <Ionicons name="people" size={48} color={c.lime} />
                : <RotatingSparkle color={c.accent} size={48} />
              }
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>
              {currentTab === 'cowork' ? 'Team Chat' : 'Filely AI'}
            </Text>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              {currentTab === 'cowork'
                ? 'Start collaborating with your team'
                : 'Ask me anything about UAE finances, VAT, or expenses'}
            </Text>

            {/* Suggestion chips */}
            {currentTab === 'assistant' && (
              <View style={styles.suggestions}>
                {quickPrompts.map((prompt, idx) => (
                  <Animated.View key={prompt} entering={FadeInUp.delay(400 + idx * 100).duration(400).springify()}>
                    <SpringPressable
                      onPress={() => setInput(prompt)}
                      style={[styles.suggestionChip, { backgroundColor: c.surfaceLow, borderColor: c.border }]}
                      accessibilityLabel={prompt}
                    >
                      <Ionicons name="flash-outline" size={14} color={c.accent} />
                      <Text style={[styles.suggestionText, { color: c.textSecondary }]}>{prompt}</Text>
                    </SpringPressable>
                  </Animated.View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {messages.map((msg, i) => (
          <Animated.View
            key={msg.id}
            entering={FadeInUp.delay(Math.min(i * 50, 300)).duration(400).springify()}
            layout={Layout.springify()}
            style={[
              styles.messageBubble,
              msg.role === 'user'   ? styles.userBubble :
              msg.role === 'system' ? styles.systemBubble :
              styles.aiBubble,
              {
                backgroundColor:
                  msg.role === 'user'   ? '#44e571' :
                  msg.role === 'system' ? c.surfaceLow :
                  darkMode              ? c.card : '#FFFFFF',
                borderColor:
                  msg.role === 'user' ? 'rgba(0,83,31,0.3)' : c.border,
              },
            ]}
          >
            {/* AI avatar for assistant messages */}
            {msg.role === 'assistant' && (
              <View style={styles.aiAvatarRow}>
                <View style={[styles.aiAvatar, { backgroundColor: c.accentBg }]}>
                  <Ionicons name="sparkles" size={14} color={c.accent} />
                </View>
                <Text style={[styles.aiLabel, { color: c.accent }]}>Filely AI</Text>
              </View>
            )}

            {msg.extractedTransaction ? (
              <View style={styles.billWidget}>
                <View style={styles.billHeader}>
                  <View style={[styles.billIconWrap, { backgroundColor: 'rgba(79,142,255,0.12)' }]}>
                    <Ionicons name="receipt-outline" size={18} color="#4F8EFF" />
                  </View>
                  <Text style={[styles.billTitle, { color: c.text }]}>Smart Bill Detected</Text>
                </View>
                <View style={[styles.billData, { borderColor: c.border }]}>
                  <Text style={[styles.billMerchant, { color: c.text }]}>{msg.extractedTransaction.merchant}</Text>
                  <View style={styles.billAmountRow}>
                    <Text style={[styles.billAmount, { color: '#FF4B6E' }]}>{msg.extractedTransaction.amount} AED</Text>
                    <Text style={[styles.billVat, { color: '#44e571' }]}>VAT: {msg.extractedTransaction.vat} AED</Text>
                  </View>
                </View>
                <SpringPressable
                  onPress={() => handleStapleTransaction(msg.extractedTransaction)}
                  style={[styles.stapleBtn, Shadow.limeSm]}
                  accessibilityLabel={`Staple ${msg.extractedTransaction.merchant} to vault`}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#003516" />
                  <Text style={styles.stapleBtnText}>Staple to Vault</Text>
                </SpringPressable>
              </View>
            ) : (
              <Text style={[
                styles.messageText,
                { color: msg.role === 'user' ? '#003516' : msg.role === 'system' ? c.textSecondary : c.text },
              ]}>
                {msg.content}
              </Text>
            )}

            <Text style={[styles.messageTime, { color: msg.role === 'user' ? 'rgba(0,53,22,0.5)' : c.textMuted }]}>
              {new Date(msg.ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Animated.View>
        ))}

        {/* Typing indicator */}
        {loading && (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.typingBubble, { backgroundColor: darkMode ? c.card : '#FFFFFF', borderColor: c.border }]}>
            <View style={[styles.aiAvatar, { backgroundColor: c.accentBg }]}>
              <Ionicons name="sparkles" size={14} color={c.accent} />
            </View>
            <TypingIndicator color={c.accent} />
          </Animated.View>
        )}
      </ScrollView>

      {/* ── Quick Prompts (assistant mode only) ───────── */}
      {currentTab === 'assistant' && messages.length > 0 && (
        <Animated.View entering={SlideInRight.duration(300)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.promptsContainer}
            contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
          >
            {quickPrompts.map((prompt) => (
              <SpringPressable
                key={prompt}
                onPress={() => setInput(prompt)}
                style={[styles.promptChip, { backgroundColor: c.surfaceLow, borderColor: c.border }]}
                accessibilityLabel={prompt}
              >
                <Text style={[styles.promptText, { color: c.textSecondary }]}>{prompt}</Text>
              </SpringPressable>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* ── Input Area ────────────────────────────────── */}
      <Animated.View
        entering={FadeInUp.duration(400).springify()}
        style={[styles.inputContainer, { backgroundColor: darkMode ? 'rgba(11,15,30,0.95)' : 'rgba(255,255,255,0.95)', borderTopColor: c.border }]}
      >
        <View style={[styles.inputInner, { backgroundColor: c.surfaceLow, borderColor: c.border }]}>
          <TextInput
            style={[styles.input, { color: c.text }]}
            placeholder={currentTab === 'cowork' ? 'Message team...' : 'Ask about UAE finances...'}
            placeholderTextColor={c.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            accessibilityLabel="Message input"
          />
          <SpringPressable
            onPress={sendMessage}
            disabled={loading || sending || !input.trim()}
            style={[
              styles.sendBtn,
              { backgroundColor: (loading || sending || !input.trim()) ? c.border : '#44e571' },
              !(loading || sending || !input.trim()) && Shadow.limeSm,
            ]}
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: loading || sending || !input.trim() }}
          >
            <Ionicons name="send" size={18} color={(loading || sending || !input.trim()) ? c.textMuted : '#003516'} />
          </SpringPressable>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Tab switcher
  tabContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: BorderWidth.hairline,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  tabText: { ...Typography.btnSmall, fontWeight: '800' },

  // Messages
  messagesContainer: { flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: { ...Typography.cardTitle, fontSize: 20 },
  emptyText: { ...Typography.body, textAlign: 'center', maxWidth: 280, lineHeight: 24 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.lg, paddingHorizontal: Spacing.lg },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  suggestionText: { ...Typography.caption },

  // Message bubbles
  messageBubble: {
    maxWidth: '85%',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4, ...Shadow.limeSm },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  systemBubble: { alignSelf: 'center', maxWidth: '90%' },

  // AI avatar inline
  aiAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aiLabel: { ...Typography.micro, fontWeight: '700' },

  messageText: { ...Typography.bodySmall, lineHeight: 22 },
  messageTime: { ...Typography.micro, marginTop: 6, textAlign: 'right' },

  // Typing
  typingBubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  typingRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 4 },
  typingDot: { width: 8, height: 8, borderRadius: 4 },

  // Bill widget
  billWidget: { gap: 12 },
  billIconWrap: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  billHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  billTitle: { ...Typography.bodyBold },
  billData: { paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, gap: 4 },
  billMerchant: { ...Typography.bodyBold },
  billAmountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  billAmount: { ...Typography.valueS },
  billVat: { ...Typography.caption, fontWeight: '700' },
  stapleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    backgroundColor: '#44e571',
    borderWidth: 1,
    borderColor: 'rgba(0,83,31,0.3)',
  },
  stapleBtnText: { ...Typography.btnSmall, color: '#003516', fontWeight: '800' },

  // Quick prompts
  promptsContainer: { maxHeight: 50, paddingVertical: Spacing.sm },
  promptChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1 },
  promptText: { ...Typography.caption },

  // Input
  inputContainer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    marginBottom: 90,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  input: { flex: 1, ...Typography.bodySmall, paddingVertical: Spacing.sm, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
});
