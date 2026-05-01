import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInUp, FadeIn, Layout,
  useSharedValue, useAnimatedStyle, withSpring, withRepeat,
  withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SpringPressable({ children, style, onPress, disabled, ...rest }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
      style={[style, anim]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

function TypingDots({ color }) {
  const d1 = useSharedValue(0.3), d2 = useSharedValue(0.3), d3 = useSharedValue(0.3);
  useEffect(() => {
    const loop = (v, delay) => {
      v.value = withDelay(delay, withRepeat(withSequence(
        withTiming(1, { duration: 380 }), withTiming(0.3, { duration: 380 })
      ), -1, false));
    };
    loop(d1, 0); loop(d2, 130); loop(d3, 260);
  }, []);
  const s1 = useAnimatedStyle(() => ({ opacity: d1.value, transform: [{ scale: d1.value }] }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value, transform: [{ scale: d2.value }] }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value, transform: [{ scale: d3.value }] }));
  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, s1]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, s2]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, s3]} />
    </View>
  );
}

export default function AIMessagingHub({ darkMode, activeTab = 'assistant' }) {
  const c = Colors.light;
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(activeTab);
  const scrollRef = useRef();

  const name = profile?.name || user?.email?.split('@')[0] || 'there';

  useEffect(() => { loadMessages(); }, [tab]);

  const loadMessages = async () => {
    try {
      const sessionId = tab === 'cowork' ? 'team-session' : 'ai-session';
      const d = await api.getChatMessages(sessionId);
      setMessages((d.messages || []).map(m => ({ ...m, id: m.id || genId(), ts: m.ts || Date.now() })));
    } catch {}
  };

  const send = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);
    setMessages(p => [...p, { id: genId(), role: 'user', content: text, ts: Date.now() }]);
    try {
      const sessionId = tab === 'cowork' ? 'team-session' : 'ai-session';
      const res = await api.sendMessage(text, sessionId);
      setMessages(p => [...p, {
        id: genId(), role: 'assistant',
        content: res.message, extractedTransaction: res.extractedTransaction, ts: Date.now(),
      }]);
    } catch {
      setMessages(p => [...p, { id: genId(), role: 'assistant', content: 'Connection error. Try again.', ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, tab]);

  const staple = useCallback(async (tx) => {
    try {
      await api.createTransaction(tx);
      setMessages(p => [...p, {
        id: genId(), role: 'system',
        content: `Stapled: ${tx.merchant} · ${tx.amount} AED`, ts: Date.now(),
      }]);
    } catch { Alert.alert('Error', 'Failed to save'); }
  }, []);

  const quickPrompts = [
    { icon: 'document-text', text: 'Draft VAT summary' },
    { icon: 'calculator', text: 'Explain corporate tax' },
    { icon: 'pricetag', text: 'Categorize expense' },
    { icon: 'download', text: 'Export monthly report' },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <StatusBar style="light" />
      <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.heroInner}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroGreet}>Hi {name}</Text>
              <Text style={styles.heroSub}>Your AI finance copilot</Text>
            </View>
            <View style={styles.avatarBadge}>
              <Ionicons name={tab === 'cowork' ? 'people' : 'sparkles'} size={20} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.pillRow}>
            {[['assistant', 'AI Assistant', 'sparkles'], ['cowork', 'Co-work', 'people']].map(([v, l, ic]) => (
              <SpringPressable
                key={v}
                onPress={() => setTab(v)}
                style={[styles.pill, tab === v ? styles.pillActive : styles.pillIdle]}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === v }}
              >
                <Ionicons name={ic} size={14} color={tab === v ? '#3B6BFF' : '#FFFFFF'} />
                <Text style={[styles.pillText, { color: tab === v ? '#3B6BFF' : '#FFFFFF' }]}>{l}</Text>
              </SpringPressable>
            ))}
          </View>
        </Animated.View>
      </View>

      <View style={[styles.sheet, { backgroundColor: c.bg }]}>
        <View style={styles.handle} />
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <Animated.View entering={FadeIn.delay(150).duration(500)} style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: c.primaryLight }]}>
                <Ionicons name={tab === 'cowork' ? 'people' : 'sparkles'} size={36} color={c.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: c.text }]}>
                {tab === 'cowork' ? 'Start a team chat' : 'Ask Filey AI anything'}
              </Text>
              <Text style={[styles.emptySub, { color: c.textMuted }]}>
                {tab === 'cowork' ? 'Share receipts, assign tasks, resolve VAT queries.' : 'UAE VAT, expense sorting, reports — in seconds.'}
              </Text>
              {tab === 'assistant' && (
                <View style={styles.suggestWrap}>
                  {quickPrompts.map((p, i) => (
                    <Animated.View key={p.text} entering={FadeInUp.delay(200 + i * 80).duration(400)}>
                      <SpringPressable
                        onPress={() => send(p.text)}
                        style={[styles.suggest, { backgroundColor: c.card, borderColor: c.borderSubtle }]}
                      >
                        <View style={[styles.suggestIcon, { backgroundColor: c.primaryLight }]}>
                          <Ionicons name={p.icon} size={14} color={c.primary} />
                        </View>
                        <Text style={[styles.suggestText, { color: c.text }]}>{p.text}</Text>
                        <Ionicons name="arrow-forward" size={14} color={c.textMuted} />
                      </SpringPressable>
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            const isSys = m.role === 'system';
            return (
              <Animated.View
                key={m.id}
                entering={FadeInUp.delay(Math.min(i * 40, 240)).duration(350)}
                layout={Layout.springify()}
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : (isSys ? styles.bubbleSys : styles.bubbleAi),
                  {
                    backgroundColor: isUser ? c.primary : (isSys ? c.primaryLight : c.card),
                    borderColor: isUser ? 'transparent' : c.borderSubtle,
                  },
                ]}
              >
                {m.role === 'assistant' && (
                  <View style={styles.aiLabelRow}>
                    <View style={[styles.aiDot, { backgroundColor: c.primaryLight }]}>
                      <Ionicons name="sparkles" size={10} color={c.primary} />
                    </View>
                    <Text style={[styles.aiLabel, { color: c.primary }]}>Filey AI</Text>
                  </View>
                )}
                <Text style={{ color: isUser ? '#FFFFFF' : (isSys ? c.primary : c.text), fontSize: 14.5, lineHeight: 21 }}>
                  {m.content}
                </Text>
                {m.extractedTransaction && (
                  <View style={[styles.txCard, { borderColor: c.borderSubtle, backgroundColor: darkMode ? c.cardElevated : '#F8FAFF' }]}>
                    <View style={styles.txRow}>
                      <View style={[styles.txIcon, { backgroundColor: c.primaryLight }]}>
                        <Ionicons name="receipt" size={14} color={c.primary} />
                      </View>
                      <Text style={[styles.txMerchant, { color: c.text }]} numberOfLines={1}>{m.extractedTransaction.merchant}</Text>
                      <Text style={[styles.txAmount, { color: c.primary }]}>
                        {m.extractedTransaction.amount} AED
                      </Text>
                    </View>
                    <SpringPressable
                      onPress={() => staple(m.extractedTransaction)}
                      style={[styles.stapleBtn, { backgroundColor: c.primary }]}
                    >
                      <Ionicons name="attach" size={14} color="#FFFFFF" />
                      <Text style={styles.stapleText}>Staple to vault</Text>
                    </SpringPressable>
                  </View>
                )}
              </Animated.View>
            );
          })}

          {loading && (
            <Animated.View entering={FadeIn.duration(200)} style={[styles.bubble, styles.bubbleAi, { backgroundColor: c.card, borderColor: c.borderSubtle }]}>
              <TypingDots color={c.primary} />
            </Animated.View>
          )}
        </ScrollView>

        <View style={[styles.inputBar, { backgroundColor: c.card, borderColor: c.borderSubtle, marginBottom: insets.bottom + 90 }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={tab === 'cowork' ? 'Message the team…' : 'Ask Filey AI…'}
            placeholderTextColor={c.textMuted}
            style={[styles.input, { color: c.text }]}
            multiline
            maxLength={2000}
          />
          <SpringPressable
            onPress={() => send()}
            disabled={!input.trim() || loading}
            style={[styles.sendBtn, { backgroundColor: input.trim() && !loading ? c.primary : c.borderSubtle }]}
            accessibilityLabel="Send"
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </SpringPressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#3B6BFF',
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroInner: { gap: 18 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroGreet: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  avatarBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1,
  },
  pillActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  pillIdle: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.22)' },
  pillText: { fontSize: 13, fontWeight: '700' },
  sheet: {
    flex: 1, marginTop: -24,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 8,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(11,23,53,0.15)',
    alignSelf: 'center', marginTop: 6, marginBottom: 4,
  },
  empty: { alignItems: 'center', paddingTop: 28, paddingHorizontal: 12 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  emptySub: { fontSize: 13.5, textAlign: 'center', marginTop: 6, lineHeight: 19, maxWidth: 280 },
  suggestWrap: { marginTop: 22, gap: 10, width: '100%' },
  suggest: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 16, borderWidth: 1,
  },
  suggestIcon: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  suggestText: { flex: 1, fontSize: 14, fontWeight: '600' },
  bubble: {
    maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, marginBottom: 10, borderWidth: 1,
  },
  bubbleUser: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  bubbleAi: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  bubbleSys: { alignSelf: 'center', maxWidth: '90%' },
  aiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  aiDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  aiLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  txCard: { marginTop: 10, padding: 12, borderRadius: 14, borderWidth: 1, gap: 10 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txMerchant: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  txAmount: { fontSize: 13.5, fontWeight: '800' },
  stapleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 12,
  },
  stapleText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },
  inputBar: {
    position: 'absolute', left: 16, right: 16, bottom: 0,
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 28, borderWidth: 1,
    shadowColor: '#0B1735', shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  input: { flex: 1, maxHeight: 120, minHeight: 36, paddingHorizontal: 6, paddingVertical: 8, fontSize: 14.5 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
});
