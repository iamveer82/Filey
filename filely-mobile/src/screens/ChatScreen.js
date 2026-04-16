import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Easing,
  FadeInUp,
  FadeIn,
  SlideInRight,
  SlideInLeft,
  Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { scanReceipt, parseExpenseText } from '../services/receiptPipeline';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Helpers ─────────────────────────────────────────────────

function generateId() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

// ─── SpringPressable ─────────────────────────────────────────

function SpringPressable({ onPress, disabled, style, children, scaleDown = 0.93 }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(scaleDown, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View style={[style, animStyle]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

// ─── Animated Sparkle Icon (empty state) ─────────────────────

function RotatingSparkle({ color }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name="sparkles" size={56} color={color} />
    </Animated.View>
  );
}

// ─── Typing Indicator (3 pulsing dots) ──────────────────────

function TypingDots({ color }) {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    dot1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    dot2.value = withDelay(
      150,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
    dot3.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value, transform: [{ scale: interpolate(dot1.value, [0.3, 1], [0.8, 1.15]) }] }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value, transform: [{ scale: interpolate(dot2.value, [0.3, 1], [0.8, 1.15]) }] }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value, transform: [{ scale: interpolate(dot3.value, [0.3, 1], [0.8, 1.15]) }] }));

  return (
    <View style={styles.typingRow}>
      <Animated.View style={[styles.typingDot, { backgroundColor: color }, s1]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: color }, s2]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: color }, s3]} />
    </View>
  );
}

// ─── Message Bubble Wrapper (entrance animation) ────────────

function AnimatedBubble({ children, index, isUser }) {
  const entering = isUser
    ? FadeInUp.delay(index * 30).duration(350).springify().damping(14).stiffness(120)
    : FadeInUp.delay(index * 30).duration(400).springify().damping(16).stiffness(100);

  return (
    <Animated.View entering={entering} layout={Layout.springify().damping(14)}>
      {children}
    </Animated.View>
  );
}

// ─── Session Chip ────────────────────────────────────────────

function SessionChip({ onPress, isNew, icon, iconColor, bgColor, borderColor }) {
  return (
    <SpringPressable onPress={onPress} style={[styles.sessionChip, { backgroundColor: bgColor, borderColor }]} scaleDown={0.88}>
      <Ionicons name={icon} size={isNew ? 20 : 16} color={iconColor} />
    </SpringPressable>
  );
}

// ─── Transaction Card ────────────────────────────────────────

function TransactionCard({ txn, pendingTxn, onVerify, onEdit, c, darkMode }) {
  return (
    <Animated.View
      entering={FadeInUp.duration(400).springify().damping(14)}
      style={[
        styles.txnCard,
        {
          backgroundColor: darkMode ? 'rgba(79,142,255,0.06)' : '#F8FAFF',
          borderColor: darkMode ? 'rgba(79,142,255,0.18)' : 'rgba(59,130,246,0.15)',
        },
      ]}
    >
      {/* Header accent bar */}
      <View style={styles.txnCardHeader}>
        <View style={styles.txnCardAccentBar} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.txnCardOverline, { color: c.accent }]}>AI CONFIRMATION</Text>
          <Text style={[styles.txnCardTitle, { color: c.text }]}>Transaction Detected</Text>
        </View>
        <View style={[styles.txnCardBadge, { backgroundColor: c.accentLight }]}>
          <Ionicons name="shield-checkmark" size={14} color={c.accent} />
        </View>
      </View>

      {/* Detail grid */}
      <View style={styles.txnCardGrid}>
        <View style={styles.txnCardCell}>
          <Text style={[styles.txnLabel, { color: c.textMuted }]}>MERCHANT</Text>
          <Text style={[styles.txnValue, { color: c.text }]} numberOfLines={1}>
            {txn.merchant || 'Unknown'}
          </Text>
        </View>
        <View style={styles.txnCardCell}>
          <Text style={[styles.txnLabel, { color: c.textMuted }]}>DATE</Text>
          <Text style={[styles.txnValue, { color: c.text }]}>{txn.date}</Text>
        </View>
        <View style={[styles.txnCardCell, { width: '100%' }]}>
          <Text style={[styles.txnLabel, { color: c.textMuted }]}>AMOUNT</Text>
          <View style={styles.txnAmountRow}>
            <Text style={[styles.txnAmountLarge, { color: c.text }]}>{txn.amount}</Text>
            <Text style={[styles.txnCurrency, { color: c.textSecondary }]}>AED</Text>
            {txn.vat ? (
              <View style={[styles.vatPill, { backgroundColor: c.limeLight }]}>
                <Text style={[styles.vatText, { color: c.limeDark }]}>VAT {txn.vat} AED</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Action buttons */}
      {pendingTxn && (
        <View style={styles.txnActions}>
          <SpringPressable
            onPress={() => onVerify(txn)}
            style={styles.verifyBtn}
            scaleDown={0.95}
          >
            <Ionicons name="checkmark-circle" size={18} color="#00531f" />
            <Text style={styles.verifyBtnText}>Verify & Save</Text>
          </SpringPressable>
          <SpringPressable
            onPress={onEdit}
            style={[styles.editBtn, { borderColor: c.border }]}
            scaleDown={0.95}
          >
            <Ionicons name="create-outline" size={16} color={c.textSecondary} />
            <Text style={[styles.editBtnText, { color: c.text }]}>Edit</Text>
          </SpringPressable>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Main ChatScreen Component ───────────────────────────────

export default function ChatScreen({ darkMode }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const { profile, orgId, userId } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(generateId());
  const [sessions, setSessions] = useState([]);
  const [pendingTxn, setPendingTxn] = useState(null);
  const scrollRef = useRef();
  const isWeb = Platform.OS === 'web';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  // ── Session Management ──────────────────────────────────────

  const fetchSessions = async () => {
    try {
      // Try Supabase first (native), fall back to API (web/legacy)
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        const { data } = await db.getChatSessions(orgId);
        setSessions((data || []).map(s => ({ ...s, sessionId: s.id })));
      } else {
        const d = await api.getChatSessions();
        setSessions(d.sessions || []);
      }
    } catch (e) {
      try {
        const d = await api.getChatSessions();
        setSessions(d.sessions || []);
      } catch (e2) {}
    }
  };

  const loadSession = async (sid) => {
    setSessionId(sid);
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        const { data } = await db.getChatMessages(sid);
        setMessages(
          (data || []).map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            extractedTransaction: m.extractedTransaction,
            hasImage: m.hasImage,
          })),
        );
      } else {
        const d = await api.getChatMessages(sid);
        setMessages(
          (d.messages || []).map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            extractedTransaction: m.extractedTransaction,
            hasImage: m.hasImage,
          })),
        );
      }
    } catch (e) {
      try {
        const d = await api.getChatMessages(sid);
        setMessages(
          (d.messages || []).map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            extractedTransaction: m.extractedTransaction,
            hasImage: m.hasImage,
          })),
        );
      } catch (e2) {}
    }
  };

  const startNewChat = () => {
    setSessionId(generateId());
    setMessages([]);
    setPendingTxn(null);
  };

  // ── Send Message ────────────────────────────────────────────

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { id: generateId(), role: 'user', content: msg }]);

    try {
      // On native, try local expense parsing first
      if (!isWeb) {
        const parsed = await parseExpenseText(msg);
        if (parsed && parsed.amount > 0) {
          setMessages(prev => [
            ...prev,
            {
              id: generateId(),
              role: 'assistant',
              content: `I found an expense: **${parsed.merchant}** — ${parsed.amount} AED${parsed.vat ? ` (VAT: ${parsed.vat} AED)` : ''}. Verify to save it.`,
              extractedTransaction: parsed,
            },
          ]);
          setPendingTxn(parsed);
          setLoading(false);
          fetchSessions();
          return;
        }
      }
      // Fall back to API for conversational responses
      const d = await api.sendMessage(msg, sessionId);
      if (d.error) {
        setMessages(prev => [
          ...prev,
          { id: generateId(), role: 'assistant', content: `Error: ${d.error}` },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: d.message,
            extractedTransaction: d.extractedTransaction,
          },
        ]);
        if (d.extractedTransaction) setPendingTxn(d.extractedTransaction);
        if (d.sessionId) setSessionId(d.sessionId);
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: 'assistant', content: 'Connection error.' },
      ]);
    }
    setLoading(false);
    fetchSessions();
  };

  // ── Image Picking / Camera ──────────────────────────────────

  const pickImage = async () => {
    if (isWeb) {
      Alert.alert('Not available', 'Receipt scanning requires the mobile app. Please download Filely on iOS.');
      return;
    }
    try {
      // Use local pipeline on native
      const result = await scanReceipt('gallery');
      if (result.success && result.transaction) {
        setLoading(true);
        setMessages(prev => [
          ...prev,
          { id: generateId(), role: 'user', content: 'Receipt uploaded', hasImage: true },
        ]);
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: `I found: **${result.transaction.merchant}** — ${result.transaction.amount} AED${result.transaction.vat ? ` (VAT: ${result.transaction.vat} AED)` : ''}. Verify to save it.`,
            extractedTransaction: result.transaction,
          },
        ]);
        setPendingTxn(result.transaction);
        setLoading(false);
      } else if (result.needsBackend && result.imageBase64) {
        // Native OCR not available, fall back to API
        setLoading(true);
        setMessages(prev => [
          ...prev,
          { id: generateId(), role: 'user', content: 'Receipt uploaded', hasImage: true },
        ]);
        try {
          const d = await api.scanReceipt(
            result.imageBase64,
            result.imageMimeType || 'image/jpeg',
            sessionId,
          );
          if (d.error) {
            setMessages(prev => [
              ...prev,
              { id: generateId(), role: 'assistant', content: `Scan error: ${d.error}` },
            ]);
          } else {
            setMessages(prev => [
              ...prev,
              {
                id: generateId(),
                role: 'assistant',
                content: d.message,
                extractedTransaction: d.extractedTransaction,
              },
            ]);
            if (d.extractedTransaction) setPendingTxn(d.extractedTransaction);
          }
        } catch (e) {
          setMessages(prev => [
            ...prev,
            { id: generateId(), role: 'assistant', content: 'Connection error.' },
          ]);
        }
        setLoading(false);
      } else {
        Alert.alert('Scan Failed', result.error || 'Could not scan receipt. Try a clearer photo.');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong scanning the receipt.');
    }
  };

  const takePhoto = async () => {
    if (isWeb) {
      Alert.alert('Not available', 'Camera scanning requires the mobile app. Please download Filely on iOS.');
      return;
    }
    try {
      const result = await scanReceipt('camera');
      if (result.success && result.transaction) {
        setLoading(true);
        setMessages(prev => [
          ...prev,
          { id: generateId(), role: 'user', content: 'Receipt photo taken', hasImage: true },
        ]);
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: `I found: **${result.transaction.merchant}** — ${result.transaction.amount} AED${result.transaction.vat ? ` (VAT: ${result.transaction.vat} AED)` : ''}. Verify to save it.`,
            extractedTransaction: result.transaction,
          },
        ]);
        setPendingTxn(result.transaction);
        setLoading(false);
      } else if (result.needsBackend && result.imageBase64) {
        setLoading(true);
        setMessages(prev => [
          ...prev,
          { id: generateId(), role: 'user', content: 'Receipt photo taken', hasImage: true },
        ]);
        try {
          const d = await api.scanReceipt(result.imageBase64, 'image/jpeg', sessionId);
          if (d.error) {
            setMessages(prev => [
              ...prev,
              { id: generateId(), role: 'assistant', content: `Scan error: ${d.error}` },
            ]);
          } else {
            setMessages(prev => [
              ...prev,
              {
                id: generateId(),
                role: 'assistant',
                content: d.message,
                extractedTransaction: d.extractedTransaction,
              },
            ]);
            if (d.extractedTransaction) setPendingTxn(d.extractedTransaction);
          }
        } catch (e) {
          setMessages(prev => [
            ...prev,
            { id: generateId(), role: 'assistant', content: 'Connection error.' },
          ]);
        }
        setLoading(false);
      } else {
        Alert.alert('Scan Failed', result.error || 'Could not scan receipt. Try a clearer photo.');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong scanning the receipt.');
    }
  };

  // ── Verify Transaction ──────────────────────────────────────

  const verifyTransaction = async (txn) => {
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        await db.createTransaction({
          org_id: orgId,
          user_id: userId,
          merchant: txn.merchant,
          date: txn.date,
          amount: txn.amount,
          vat: txn.vat,
          trn: txn.trn || '',
          currency: txn.currency || 'AED',
          category: txn.category || 'General',
          status: 'verified',
        });
      } else {
        await api.createTransaction(txn);
      }
      setPendingTxn(null);
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: `Transaction verified! ${txn.merchant} - ${txn.amount} AED ✅`,
        },
      ]);
    } catch (e) {
      // Fall back to API if Supabase fails
      try {
        await api.createTransaction(txn);
        setPendingTxn(null);
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: `Transaction verified! ${txn.merchant} - ${txn.amount} AED ✅`,
          },
        ]);
      } catch (e2) {}
    }
  };

  // ── Derived values ──────────────────────────────────────────

  const canSend = input.trim().length > 0 && !loading;

  // ── Render ──────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* ── Session Bar ──────────────────────────────────────── */}
      <View style={[styles.sessionsBarOuter, { borderBottomColor: c.borderSubtle }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sessionsBarContent}
        >
          <SessionChip
            onPress={startNewChat}
            isNew
            icon="add"
            iconColor={darkMode ? '#00531f' : '#00531f'}
            bgColor={c.lime}
            borderColor="rgba(0,83,31,0.25)"
          />
          {sessions.slice(0, 8).map((s, i) => (
            <SessionChip
              key={s.sessionId || i}
              onPress={() => loadSession(s.sessionId)}
              icon="chatbubble-ellipses-outline"
              iconColor={c.textMuted}
              bgColor={c.surfaceLow}
              borderColor={c.border}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Message List ─────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Empty State */}
        {messages.length === 0 && (
          <Animated.View entering={FadeIn.duration(600)} style={styles.emptyState}>
            <View style={[styles.emptyIconRing, { borderColor: c.accentLight }]}>
              <RotatingSparkle color={c.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>Filely AI</Text>
            <Text style={[styles.emptySub, { color: c.textSecondary }]}>
              Scan receipts, log expenses, or ask about your UAE finances.
            </Text>
            <View style={styles.chipRow}>
              {['Scan a receipt', 'Paid 120 AED at ENOC', 'Last food bill'].map((s, i) => (
                <SpringPressable
                  key={s}
                  onPress={() => setInput(s)}
                  style={[
                    styles.suggestionChip,
                    {
                      backgroundColor: darkMode ? c.surfaceLow : c.cardElevated,
                      borderColor: c.border,
                    },
                  ]}
                  scaleDown={0.92}
                >
                  <Ionicons
                    name={i === 0 ? 'scan-outline' : i === 1 ? 'receipt-outline' : 'restaurant-outline'}
                    size={14}
                    color={c.accent}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.suggestionText, { color: c.textSecondary }]}>{s}</Text>
                </SpringPressable>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => (
          <AnimatedBubble key={msg.id} index={idx} isUser={msg.role === 'user'}>
            <View style={styles.bubbleOuter}>
              {msg.role === 'user' ? (
                /* ── User Bubble ───────────────────────────────── */
                <View
                  style={[
                    styles.userBubble,
                    {
                      backgroundColor: darkMode ? 'rgba(68,229,113,0.10)' : 'rgba(68,229,113,0.12)',
                      borderColor: darkMode ? 'rgba(68,229,113,0.18)' : 'rgba(68,229,113,0.20)',
                    },
                  ]}
                >
                  {msg.hasImage && (
                    <View style={styles.imageTag}>
                      <View style={[styles.imageTagDot, { backgroundColor: c.lime }]} />
                      <Ionicons name="image" size={12} color={c.lime} />
                      <Text style={[styles.imageTagText, { color: c.lime }]}>Receipt attached</Text>
                    </View>
                  )}
                  <Text style={[styles.messageText, { color: c.text }]}>{msg.content}</Text>
                  <View style={styles.userTimestamp}>
                    <Ionicons name="checkmark-done" size={12} color={c.lime} />
                  </View>
                </View>
              ) : (
                /* ── AI Bubble ─────────────────────────────────── */
                <View style={styles.aiBubbleRow}>
                  {/* AI Avatar */}
                  <View
                    style={[
                      styles.aiAvatar,
                      {
                        backgroundColor: darkMode
                          ? 'rgba(79,142,255,0.12)'
                          : 'rgba(59,130,246,0.10)',
                      },
                    ]}
                  >
                    <Ionicons name="sparkles" size={16} color={darkMode ? '#4F8EFF' : '#3B82F6'} />
                  </View>

                  <View style={styles.aiBubbleCol}>
                    {/* Message body */}
                    <View
                      style={[
                        styles.aiBubble,
                        {
                          backgroundColor: darkMode
                            ? 'rgba(79,142,255,0.06)'
                            : 'rgba(59,130,246,0.06)',
                          borderColor: darkMode
                            ? 'rgba(79,142,255,0.12)'
                            : 'rgba(59,130,246,0.10)',
                        },
                      ]}
                    >
                      <Text style={[styles.messageText, { color: c.textSecondary }]}>
                        {msg.content}
                      </Text>
                    </View>

                    {/* Transaction card if present */}
                    {msg.extractedTransaction && (
                      <TransactionCard
                        txn={msg.extractedTransaction}
                        pendingTxn={
                          pendingTxn?.id === msg.extractedTransaction?.id
                            ? pendingTxn
                            : // also show if pendingTxn matches by merchant+amount (no id match)
                              pendingTxn &&
                              pendingTxn.merchant === msg.extractedTransaction.merchant &&
                              pendingTxn.amount === msg.extractedTransaction.amount
                            ? pendingTxn
                            : null
                        }
                        onVerify={verifyTransaction}
                        onEdit={() => setPendingTxn(null)}
                        c={c}
                        darkMode={darkMode}
                      />
                    )}
                  </View>
                </View>
              )}
            </View>
          </AnimatedBubble>
        ))}

        {/* ── Typing Indicator ─────────────────────────────── */}
        {loading && (
          <Animated.View entering={FadeInUp.duration(300).springify()}>
            <View style={styles.aiBubbleRow}>
              <View
                style={[
                  styles.aiAvatar,
                  {
                    backgroundColor: darkMode
                      ? 'rgba(79,142,255,0.12)'
                      : 'rgba(59,130,246,0.10)',
                  },
                ]}
              >
                <Ionicons name="sparkles" size={16} color={darkMode ? '#4F8EFF' : '#3B82F6'} />
              </View>
              <View
                style={[
                  styles.aiBubble,
                  styles.typingBubble,
                  {
                    backgroundColor: darkMode
                      ? 'rgba(79,142,255,0.06)'
                      : 'rgba(59,130,246,0.06)',
                    borderColor: darkMode
                      ? 'rgba(79,142,255,0.12)'
                      : 'rgba(59,130,246,0.10)',
                  },
                ]}
              >
                <TypingDots color={c.lime} />
              </View>
            </View>
          </Animated.View>
        )}

        {/* Bottom spacer */}
        <View style={{ height: 8 }} />
      </ScrollView>

      {/* ── Input Bar (frosted glass pill) ───────────────────── */}
      <View
        style={[
          styles.inputBarOuter,
          {
            backgroundColor: darkMode ? 'rgba(11,15,30,0.92)' : 'rgba(244,247,255,0.92)',
          },
        ]}
      >
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: darkMode ? c.card : c.bgSecondary,
              borderColor: c.border,
              ...(darkMode ? Shadow.softSm : Shadow.darkSm),
            },
          ]}
        >
          {/* Camera button */}
          <SpringPressable onPress={takePhoto} style={styles.cameraBtn} scaleDown={0.85}>
            <Ionicons name="camera" size={20} color="#00531f" />
          </SpringPressable>

          {/* Gallery button */}
          <SpringPressable onPress={pickImage} style={styles.galleryBtn} scaleDown={0.85}>
            <Ionicons name="images-outline" size={19} color={c.textMuted} />
          </SpringPressable>

          {/* Text input */}
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type an expense or message..."
            placeholderTextColor={c.textMuted}
            style={[styles.textInput, { color: c.text }]}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline={false}
          />

          {/* Send button */}
          <SpringPressable
            onPress={sendMessage}
            disabled={!canSend}
            style={[
              styles.sendBtn,
              {
                backgroundColor: canSend ? c.lime : 'transparent',
                borderColor: canSend ? 'rgba(0,83,31,0.25)' : 'transparent',
              },
            ]}
            scaleDown={0.85}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={canSend ? '#00531f' : c.textMuted}
            />
          </SpringPressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Session Bar ─────────────────────────────────────────────
  sessionsBarOuter: {
    borderBottomWidth: BorderWidth.hairline,
    paddingVertical: Spacing.sm,
  },
  sessionsBarContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  sessionChip: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: BorderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Message List ────────────────────────────────────────────
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },

  // ── Empty State ─────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: 72,
    paddingBottom: Spacing.xxxl,
  },
  emptyIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.sectionTitle,
    marginBottom: Spacing.xs,
  },
  emptySub: {
    ...Typography.bodySmall,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 21,
    marginBottom: Spacing.xxl,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 11,
    borderRadius: Radius.pill,
    borderWidth: BorderWidth.thin,
  },
  suggestionText: {
    ...Typography.caption,
  },

  // ── Bubbles ─────────────────────────────────────────────────
  bubbleOuter: {
    marginBottom: Spacing.md,
  },

  // User bubble
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderBottomRightRadius: 6,
    borderWidth: BorderWidth.thin,
  },
  userTimestamp: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },

  // AI bubble
  aiBubbleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    maxWidth: '90%',
    alignItems: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  aiBubbleCol: {
    flex: 1,
    gap: Spacing.sm,
  },
  aiBubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: 6,
    borderWidth: BorderWidth.thin,
  },

  // Message text
  messageText: {
    ...Typography.bodySmall,
    lineHeight: 21,
  },

  // Image tag
  imageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: Spacing.xs,
  },
  imageTagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  imageTagText: {
    ...Typography.micro,
  },

  // ── Transaction Card ────────────────────────────────────────
  txnCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: BorderWidth.thin,
    overflow: 'hidden',
  },
  txnCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  txnCardAccentBar: {
    width: 3,
    height: 36,
    backgroundColor: '#44e571',
    borderRadius: 2,
  },
  txnCardOverline: {
    ...Typography.label,
    marginBottom: 2,
  },
  txnCardTitle: {
    ...Typography.cardTitle,
  },
  txnCardBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  txnCardCell: {
    width: '46%',
    marginBottom: Spacing.xs,
  },
  txnLabel: {
    ...Typography.labelWide,
    marginBottom: Spacing.xs,
  },
  txnValue: {
    ...Typography.bodyBold,
  },
  txnAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap',
  },
  txnAmountLarge: {
    ...Typography.valueS,
  },
  txnCurrency: {
    ...Typography.caption,
    marginTop: 2,
  },
  vatPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    marginLeft: 4,
  },
  vatText: {
    ...Typography.micro,
    fontWeight: '700',
  },

  // Action buttons
  txnActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  verifyBtn: {
    flex: 1,
    backgroundColor: '#44e571',
    borderRadius: Radius.pill,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: BorderWidth.thin,
    borderColor: 'rgba(0,83,31,0.3)',
    ...Shadow.limeSm,
    minHeight: 48,
  },
  verifyBtnText: {
    color: '#00531f',
    ...Typography.btnPrimary,
  },
  editBtn: {
    flex: 0.6,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    borderWidth: BorderWidth.thin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 48,
  },
  editBtnText: {
    ...Typography.btnSmall,
  },

  // ── Typing Indicator ────────────────────────────────────────
  typingBubble: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 20,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── Input Bar ───────────────────────────────────────────────
  inputBarOuter: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 90 : 90,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: BorderWidth.thin,
    gap: Spacing.xs,
  },
  cameraBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: '#44e571',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BorderWidth.thin,
    borderColor: 'rgba(0,83,31,0.25)',
    ...Shadow.limeSm,
  },
  galleryBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    ...Typography.bodySmall,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BorderWidth.thin,
  },
});
