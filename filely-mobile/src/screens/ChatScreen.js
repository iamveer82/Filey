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
  Image,
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

function formatTime(date) {
  const d = new Date(date);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// ─── Animated Components ─────────────────────────────────────

function SpringPressable({ onPress, disabled, style, children, scaleDown = 0.94 }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(scaleDown, { damping: 15, stiffness: 300 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 10, stiffness: 200 }))}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View style={[style, animStyle]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

function TypingDots({ color = '#3B6BFF' }) {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const pulse = (dot, d) => {
      dot.value = withDelay(
        d,
        withRepeat(
          withSequence(withTiming(1, 350), withTiming(0.3, 350)),
          -1, false
        )
      );
    };
    pulse(dot1, 0);
    pulse(dot2, 150);
    pulse(dot3, 300);
  }, []);

  const Dot = ({ sv }) => {
    const s = useAnimatedStyle(() => ({ opacity: sv.value, transform: [{ scale: interpolate(sv.value, [0.3, 1], [0.8, 1.2]) }] }));
    return <Animated.View style={[s.dot, { backgroundColor: color }, s]} />;
  };

  return (
    <View style={s.typingRow}>
      <Dot sv={dot1} /><Dot sv={dot2} /><Dot sv={dot3} />
    </View>
  );
}

// ─── Transaction Card (Claude-style clean) ───────────────────

function TransactionCard({ txn, onVerify, onEdit }) {
  return (
    <Animated.View entering={FadeInUp.duration(400).damping(14)} style={s.txnCard}>
      <View style={s.txnCardHeader}>
        <View style={s.txnCardBar} />
        <View style={{ flex: 1 }}>
          <Text style={s.txnCardOverline}>TRANSACTION DETECTED</Text>
        </View>
      </View>

      <View style={s.txnGrid}>
        <View style={s.txnCell}>
          <Text style={s.txnLabel}>MERCHANT</Text>
          <Text style={s.txnValue} numberOfLines={1}>{txn.merchant || '—'}</Text>
        </View>
        <View style={s.txnCell}>
          <Text style={s.txnLabel}>DATE</Text>
          <Text style={s.txnValue}>{txn.date || '—'}</Text>
        </View>
        <View style={[s.txnCell, { width: '100%' }]}>
          <Text style={s.txnLabel}>AMOUNT</Text>
          <View style={s.txnAmountRow}>
            <Text style={s.txnAmountVal}>{txn.amount} AED</Text>
            {txn.vat > 0 && (
              <View style={s.vatPill}>
                <Text style={s.vatPillText}>VAT {txn.vat} AED</Text>
              </View>
            )}
          </View>
        </View>
        {txn.trn ? (
          <View style={[s.txnCell, { width: '100%' }]}>
            <Text style={s.txnLabel}>TRN</Text>
            <Text style={s.txnValue}>{txn.trn}</Text>
          </View>
        ) : null}
      </View>

      <View style={s.txnActions}>
        <SpringPressable onPress={() => onVerify(txn)} style={s.verifyBtn}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={s.verifyBtnText}>Save Transaction</Text>
        </SpringPressable>
        <SpringPressable onPress={onEdit} style={s.editBtn}>
          <Ionicons name="create-outline" size={16} color="#3B6BFF" />
          <Text style={s.editBtnText}>Edit</Text>
        </SpringPressable>
      </View>
    </Animated.View>
  );
}

// ─── Main ChatScreen ─────────────────────────────────────────

export default function ChatScreen({ darkMode }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const { profile, orgId, userId } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(generateId());
  const [pendingTxn, setPendingTxn] = useState(null);
  const scrollRef = useRef();
  const isWeb = Platform.OS === 'web';

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(t);
  }, [messages, loading]);

  const fetchSessions = async () => {
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        const { data } = await db.getChatSessions(orgId);
      } else {
        await api.getChatSessions();
      }
    } catch {}
  };

  const startNewChat = () => {
    setSessionId(generateId());
    setMessages([]);
    setPendingTxn(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { id: generateId(), role: 'user', content: msg }]);

    try {
      if (!isWeb) {
        const parsed = await parseExpenseText(msg);
        if (parsed && parsed.amount > 0) {
          setMessages(prev => [...prev, {
            id: generateId(), role: 'assistant',
            content: `I found an expense: **${parsed.merchant}** — ${parsed.amount} AED${parsed.vat ? ` (VAT: ${parsed.vat} AED)` : ''}`,
            extractedTransaction: parsed,
          }]);
          setPendingTxn(parsed);
          setLoading(false);
          return;
        }
      }
      const d = await api.sendMessage(msg, sessionId);
      setMessages(prev => [...prev, {
        id: generateId(), role: 'assistant',
        content: d.error ? `Error: ${d.error}` : d.message,
        extractedTransaction: d.extractedTransaction,
      }]);
      if (d.extractedTransaction) setPendingTxn(d.extractedTransaction);
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Connection error.' }]);
    }
    setLoading(false);
  };

  const pickImage = async () => {
    if (isWeb) { Alert.alert('Not available', 'Receipt scanning requires the mobile app.'); return; }
    try {
      const result = await scanReceipt('gallery');
      handleScanResult(result);
    } catch { Alert.alert('Error', 'Something went wrong.'); }
  };

  const takePhoto = async () => {
    if (isWeb) { Alert.alert('Not available', 'Camera scanning requires the mobile app.'); return; }
    try {
      const result = await scanReceipt('camera');
      handleScanResult(result);
    } catch { Alert.alert('Error', 'Something went wrong.'); }
  };

  const handleScanResult = async (result) => {
    if (result.success && result.transaction) {
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: 'user', content: 'Receipt scanned', hasImage: true },
        { id: generateId(), role: 'assistant',
          content: `I found: **${result.transaction.merchant}** — ${result.transaction.amount} AED${result.transaction.vat ? ` (VAT: ${result.transaction.vat} AED)` : ''}`,
          extractedTransaction: result.transaction,
        },
      ]);
      setPendingTxn(result.transaction);
    } else if (result.needsBackend && result.imageBase64) {
      setMessages(prev => [...prev, { id: generateId(), role: 'user', content: 'Receipt scanned', hasImage: true }]);
      try {
        const d = await api.scanReceipt(result.imageBase64, result.imageMimeType || 'image/jpeg', sessionId);
        setMessages(prev => [...prev, {
          id: generateId(), role: 'assistant',
          content: d.error ? `Scan error: ${d.error}` : d.message,
          extractedTransaction: d.extractedTransaction,
        }]);
        if (d.extractedTransaction) setPendingTxn(d.extractedTransaction);
      } catch {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Connection error.' }]);
      }
    } else {
      Alert.alert('Scan Failed', result.error || 'Could not read this receipt.');
    }
  };

  const verifyTransaction = async (txn) => {
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        await db.createTransaction({
          org_id: orgId, user_id: userId,
          merchant: txn.merchant, date: txn.date, amount: txn.amount,
          vat: txn.vat, trn: txn.trn || '', currency: txn.currency || 'AED',
          category: txn.category || 'General', status: 'verified',
        });
      } else {
        await api.createTransaction(txn);
      }
      setPendingTxn(null);
      setMessages(prev => [...prev, {
        id: generateId(), role: 'assistant',
        content: `Saved! ${txn.merchant} — ${txn.amount} AED ✅`,
      }]);
    } catch {
      try {
        await api.createTransaction(txn);
        setPendingTxn(null);
      } catch (e2) {
        Alert.alert('Error', 'Could not save transaction.');
      }
    }
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[s.header, { backgroundColor: c.bg, borderBottomColor: c.border }]}>
        <View style={s.headerLeft}>
          <View style={[s.filiAvatar]}>
            <Text style={{ fontSize: 16 }}>🦊</Text>
          </View>
          <View>
            <Text style={[s.headerTitle, { color: c.text }]}>Fili</Text>
            <Text style={[s.headerSub, { color: c.textMuted }]}>AI Finance Assistant</Text>
          </View>
        </View>
        <TouchableOpacity onPress={startNewChat} style={[s.newChatBtn, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="add" size={22} color="#3B6BFF" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={[s.emptyState, { backgroundColor: c.bg }]}>
          <View style={[s.emptyIconRing, { borderColor: c.border }]}>
            <Text style={{ fontSize: 48 }}>🦊</Text>
          </View>
          <Text style={[s.emptyTitle, { color: c.text }]}>Hey there!</Text>
          <Text style={[s.emptySub, { color: c.textSecondary }]}>
            I'm Fili, your personal finance assistant. Send me a receipt or ask me anything about your spending.
          </Text>
          <View style={s.chipRow}>
            {['How much did I spend this month?', 'Show me my VAT summary', 'What\'s my biggest expense?'].map((txt, i) => (
              <SpringPressable
                key={i}
                onPress={() => { setInput(txt); }}
                style={[s.chip, { backgroundColor: c.card, borderColor: c.border }]}
              >
                <Text style={[s.chipText, { color: c.textSecondary }]}>{txt}</Text>
              </SpringPressable>
            ))}
          </View>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={s.msgList}
          contentContainerStyle={s.msgListContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <Animated.View
                key={msg.id || i}
                entering={FadeInUp.delay(i * 20).duration(350).damping(14)}
                layout={Layout.springify()}
                style={s.msgWrapper}
              >
                {/* User Message */}
                {isUser ? (
                  <View style={s.userMsgOuter}>
                    <View style={[s.userBubble, { backgroundColor: '#3B6BFF' }]}>
                      {msg.hasImage ? (
                        <View style={s.imageTag}>
                          <Ionicons name="camera" size={14} color="rgba(255,255,255,0.8)" />
                          <Text style={s.imageTagText}>📸 Photo</Text>
                        </View>
                      ) : null}
                      <Text style={s.userMsgText}>{msg.content}</Text>
                    </View>
                    <Text style={[s.timestamp, { color: c.textMuted }]}>
                      {formatTime(new Date())}
                    </Text>
                  </View>
                ) : (
                  /* AI Message */
                  <View style={s.aiMsgRow}>
                    <View style={[s.aiAvatar]}>
                      <Text style={{ fontSize: 13 }}>🦊</Text>
                    </View>
                    <View style={s.aiMsgCol}>
                      <View style={[s.aiBubble, { backgroundColor: c.card, borderColor: c.border }]}>
                        <Text style={[s.aiMsgText, { color: c.text }]}>{msg.content}</Text>
                      </View>
                      {msg.extractedTransaction && !pendingTxn?.merchant ? null : null}
                      <Text style={[s.timestamp, { color: c.textMuted }]}>
                        {formatTime(new Date())}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Transaction Card */}
                {msg.extractedTransaction && msg.extractedTransaction === pendingTxn ? (
                  <TransactionCard
                    txn={pendingTxn}
                    onVerify={verifyTransaction}
                    onEdit={() => Alert.alert('Edit', 'Tap to edit transaction details (coming soon).')}
                  />
                ) : null}
              </Animated.View>
            );
          })}
          {loading && (
            <View style={s.aiMsgRow}>
              <View style={[s.aiAvatar]}>
                <Text style={{ fontSize: 13 }}>🦊</Text>
              </View>
              <View style={[s.aiBubble, { backgroundColor: c.card, borderColor: c.border }]}>
                <TypingDots color="#3B6BFF" />
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Input Bar (Claude-style) */}
      <View style={[s.inputOuter, { backgroundColor: c.bg, borderTopColor: c.border }]}>
        <View style={[s.inputBar, { backgroundColor: c.card, borderColor: c.border }]}>
          <TouchableOpacity onPress={takePhoto} style={[s.inputBtn, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="camera" size={22} color="#3B6BFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={s.inputBtn}>
            <Ionicons name="image-outline" size={22} color={c.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={[s.textInput, { color: c.text }]}
            placeholder="Ask Fili or scan a receipt..."
            placeholderTextColor={c.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit
          />
          {input.trim() ? (
            <SpringPressable onPress={sendMessage} style={[s.sendBtn, { backgroundColor: '#3B6BFF' }]}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </SpringPressable>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 12, paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filiAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  headerSub: { fontSize: 13, marginTop: 1 },
  newChatBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', borderWidth: 0.5,
  },

  // Empty State
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIconRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28, maxWidth: 300 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 0.5,
  },
  chipText: { fontSize: 13 },

  // Message List
  msgList: { flex: 1 },
  msgListContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  msgWrapper: { marginBottom: 12 },

  // User Message
  userMsgOuter: { alignItems: 'flex-end' },
  userBubble: {
    maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 20, borderBottomRightRadius: 6,
  },
  userMsgText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  imageTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  imageTagText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },

  // AI Message
  aiMsgRow: { flexDirection: 'row', gap: 8, maxWidth: '90%', alignItems: 'flex-start' },
  aiAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  aiMsgCol: { flex: 1 },
  aiBubble: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 20, borderBottomLeftRadius: 6, borderWidth: 0.5,
  },
  aiMsgText: { fontSize: 15, lineHeight: 21 },

  // Timestamp
  timestamp: { fontSize: 11, marginTop: 4, marginLeft: 4 },

  // Typing
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 20 },
  dot: { width: 7, height: 7, borderRadius: 4 },

  // Transaction Card
  txnCard: {
    marginTop: 8, marginLeft: 38, marginBottom: 8,
    borderRadius: 16, padding: 16,
    backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: 'rgba(59,107,255,0.15)',
  },
  txnCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  txnCardBar: { width: 3, height: 32, backgroundColor: '#3B6BFF', borderRadius: 2 },
  txnCardOverline: { fontSize: 11, fontWeight: '700', color: '#3B6BFF', letterSpacing: 1 },
  txnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  txnCell: { width: '46%', marginBottom: 8 },
  txnLabel: { fontSize: 10, fontWeight: '700', color: '#8B9CC7', letterSpacing: 1, marginBottom: 4 },
  txnValue: { fontSize: 14, fontWeight: '600', color: '#0B1735' },
  txnAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  txnAmountVal: { fontSize: 18, fontWeight: '700', color: '#0B1735' },
  vatPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  vatPillText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
  txnActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  verifyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#3B6BFF', borderRadius: 24, paddingVertical: 14,
  },
  verifyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderRadius: 24, paddingVertical: 14, paddingHorizontal: 20,
    backgroundColor: '#EEF2FF',
  },
  editBtnText: { color: '#3B6BFF', fontSize: 14, fontWeight: '600' },

  // Input Bar
  inputOuter: {
    paddingHorizontal: 12, paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12, borderTopWidth: 0.5,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 24, borderWidth: 0.5, gap: 4,
  },
  inputBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  textInput: {
    flex: 1, fontSize: 15, paddingHorizontal: 4,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
});
