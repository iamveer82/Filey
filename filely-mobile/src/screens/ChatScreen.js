import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { scanReceipt, parseExpenseText } from '../services/receiptPipeline';

function generateId() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

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

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [messages]);

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
    } catch(e) {
      try { const d = await api.getChatSessions(); setSessions(d.sessions || []); } catch(e2) {}
    }
  };

  const loadSession = async (sid) => {
    setSessionId(sid);
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        const { data } = await db.getChatMessages(sid);
        setMessages((data || []).map(m => ({
          id: m.id, role: m.role, content: m.content,
          extractedTransaction: m.extractedTransaction, hasImage: m.hasImage,
        })));
      } else {
        const d = await api.getChatMessages(sid);
        setMessages((d.messages || []).map(m => ({
          id: m.id, role: m.role, content: m.content,
          extractedTransaction: m.extractedTransaction, hasImage: m.hasImage,
        })));
      }
    } catch(e) {
      try {
        const d = await api.getChatMessages(sid);
        setMessages((d.messages || []).map(m => ({
          id: m.id, role: m.role, content: m.content,
          extractedTransaction: m.extractedTransaction, hasImage: m.hasImage,
        })));
      } catch(e2) {}
    }
  };

  const startNewChat = () => { setSessionId(generateId()); setMessages([]); setPendingTxn(null); };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput(''); setLoading(true);
    setMessages(prev => [...prev, { id: generateId(), role: 'user', content: msg }]);

    try {
      // On native, try local expense parsing first
      if (!isWeb) {
        const parsed = await parseExpenseText(msg);
        if (parsed && parsed.amount > 0) {
          setMessages(prev => [...prev, {
            id: generateId(), role: 'assistant',
            content: `I found an expense: **${parsed.merchant}** — ${parsed.amount} AED${parsed.vat ? ` (VAT: ${parsed.vat} AED)` : ''}. Verify to save it.`,
            extractedTransaction: parsed,
          }]);
          setPendingTxn(parsed);
          setLoading(false);
          fetchSessions();
          return;
        }
      }
      // Fall back to API for conversational responses
      const d = await api.sendMessage(msg, sessionId);
      if (d.error) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Error: ${d.error}` }]);
      } else {
        setMessages(prev => [...prev, {
          id: generateId(), role: 'assistant', content: d.message,
          extractedTransaction: d.extractedTransaction,
        }]);
        if (d.extractedTransaction) setPendingTxn(d.extractedTransaction);
        if (d.sessionId) setSessionId(d.sessionId);
      }
    } catch(e) {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Connection error.' }]);
    }
    setLoading(false);
    fetchSessions();
  };

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
        setMessages(prev => [...prev, { id: generateId(), role: 'user', content: 'Receipt uploaded', hasImage: true }]);
        setMessages(prev => [...prev, {
          id: generateId(), role: 'assistant',
          content: `I found: **${result.transaction.merchant}** — ${result.transaction.amount} AED${result.transaction.vat ? ` (VAT: ${result.transaction.vat} AED)` : ''}. Verify to save it.`,
          extractedTransaction: result.transaction,
        }]);
        setPendingTxn(result.transaction);
        setLoading(false);
      } else if (result.needsBackend && result.imageBase64) {
        // Native OCR not available, fall back to API
        setLoading(true);
        setMessages(prev => [...prev, { id: generateId(), role: 'user', content: 'Receipt uploaded', hasImage: true }]);
        try {
          const d = await api.scanReceipt(result.imageBase64, result.imageMimeType || 'image/jpeg', sessionId);
          if (d.error) {
            setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Scan error: ${d.error}` }]);
          } else {
            setMessages(prev => [...prev, {
              id: generateId(), role: 'assistant', content: d.message,
              extractedTransaction: d.extractedTransaction,
            }]);
            if (d.extractedTransaction) setPendingTxn(d.extractedTransaction);
          }
        } catch(e) {
          setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Connection error.' }]);
        }
        setLoading(false);
      } else {
        Alert.alert('Scan Failed', result.error || 'Could not scan receipt. Try a clearer photo.');
      }
    } catch(e) {
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
        setMessages(prev => [...prev, { id: generateId(), role: 'user', content: 'Receipt photo taken', hasImage: true }]);
        setMessages(prev => [...prev, {
          id: generateId(), role: 'assistant',
          content: `I found: **${result.transaction.merchant}** — ${result.transaction.amount} AED${result.transaction.vat ? ` (VAT: ${result.transaction.vat} AED)` : ''}. Verify to save it.`,
          extractedTransaction: result.transaction,
        }]);
        setPendingTxn(result.transaction);
        setLoading(false);
      } else if (result.needsBackend && result.imageBase64) {
        setLoading(true);
        setMessages(prev => [...prev, { id: generateId(), role: 'user', content: 'Receipt photo taken', hasImage: true }]);
        try {
          const d = await api.scanReceipt(result.imageBase64, 'image/jpeg', sessionId);
          if (d.error) {
            setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Scan error: ${d.error}` }]);
          } else {
            setMessages(prev => [...prev, {
              id: generateId(), role: 'assistant', content: d.message,
              extractedTransaction: d.extractedTransaction,
            }]);
            if (d.extractedTransaction) setPendingTxn(d.extractedTransaction);
          }
        } catch(e) {
          setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Connection error.' }]);
        }
        setLoading(false);
      } else {
        Alert.alert('Scan Failed', result.error || 'Could not scan receipt. Try a clearer photo.');
      }
    } catch(e) {
      Alert.alert('Error', 'Something went wrong scanning the receipt.');
    }
  };

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
      setMessages(prev => [...prev, {
        id: generateId(), role: 'assistant',
        content: `Transaction verified! ${txn.merchant} - ${txn.amount} AED ✅`,
      }]);
    } catch(e) {
      // Fall back to API if Supabase fails
      try {
        await api.createTransaction(txn);
        setPendingTxn(null);
        setMessages(prev => [...prev, {
          id: generateId(), role: 'assistant',
          content: `Transaction verified! ${txn.merchant} - ${txn.amount} AED ✅`,
        }]);
      } catch(e2) {}
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {/* Session History */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionsBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        <TouchableOpacity onPress={startNewChat} style={[styles.sessionChip, { backgroundColor: c.limeLight, borderColor: c.lime, borderWidth: 1 }]}>
          <Ionicons name="add" size={18} color={c.lime} />
        </TouchableOpacity>
        {sessions.slice(0, 8).map((s, i) => (
          <TouchableOpacity key={i} onPress={() => loadSession(s.sessionId)} style={[styles.sessionChip, { backgroundColor: c.surfaceLow, borderColor: c.border, borderWidth: 1 }]}>
            <Ionicons name="document-text-outline" size={16} color={c.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Messages */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        {messages.length === 0 && (
          <View style={styles.emptyChat}>
            <Ionicons name="sparkles" size={48} color={c.accent} />
            <Text style={[styles.emptyChatTitle, { color: c.text }]}>Filely AI</Text>
            <Text style={[styles.emptyChatSub, { color: c.textSecondary }]}>
              Scan receipts, log expenses, or ask about your UAE finances.
            </Text>
            <View style={styles.suggestions}>
              {['Scan a receipt', 'Paid 120 AED at ENOC', 'Last food bill'].map(s => (
                <TouchableOpacity key={s} onPress={() => setInput(s)} style={[styles.suggestionChip, { backgroundColor: c.surfaceLow, borderColor: c.border, borderWidth: 1 }]}>
                  <Text style={[styles.suggestionText, { color: c.textSecondary }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map(msg => (
          <View key={msg.id} style={{ marginBottom: 16 }}>
            {msg.role === 'user' ? (
              <View style={[styles.userBubble, darkMode ? CardPresets.cardDark : { ...CardPresets.cardLight }]}>
                {msg.hasImage && (
                  <View style={styles.imageTag}>
                    <Ionicons name="image" size={12} color={c.lime} />
                    <Text style={[styles.imageTagText, { color: c.lime }]}>Receipt attached</Text>
                  </View>
                )}
                <Text style={[styles.messageText, { color: c.text }]}>{msg.content}</Text>
              </View>
            ) : (
              <View style={styles.aiBubbleRow}>
                <View style={[styles.aiIcon, { backgroundColor: 'rgba(79,142,255,0.12)', borderRadius: 16 }]}>
                  <Ionicons name="sparkles" size={18} color="#4F8EFF" />
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={[styles.aiBubble, { backgroundColor: c.surfaceLow, borderColor: c.border, borderWidth: 1 }]}>
                    <Text style={[styles.messageText, { color: c.textSecondary }]}>{msg.content}</Text>
                  </View>
                  {msg.extractedTransaction && (
                    <View style={[styles.txnCard, darkMode ? CardPresets.cardDark : { ...CardPresets.cardLight }]}>
                      <View style={styles.txnCardHeader}>
                        <View style={styles.txnCardLine} />
                        <Text style={[styles.txnCardTitle, { color: c.text }]}>AI Confirmation</Text>
                      </View>
                      <View style={styles.txnCardGrid}>
                        <View style={styles.txnCardCell}>
                          <Text style={[styles.txnLabel, { color: c.textMuted }]}>MERCHANT</Text>
                          <Text style={[styles.txnValue, { color: c.text }]}>{msg.extractedTransaction.merchant || 'Unknown'}</Text>
                        </View>
                        <View style={styles.txnCardCell}>
                          <Text style={[styles.txnLabel, { color: c.textMuted }]}>DATE</Text>
                          <Text style={[styles.txnValue, { color: c.text }]}>{msg.extractedTransaction.date}</Text>
                        </View>
                        <View style={styles.txnCardCell}>
                          <Text style={[styles.txnLabel, { color: c.textMuted }]}>AMOUNT</Text>
                          <Text style={[styles.txnValueLarge, { color: c.text }]}>{msg.extractedTransaction.amount} AED</Text>
                        </View>
                        <View style={styles.txnCardCell}>
                          <Text style={[styles.txnLabel, { color: c.textMuted }]}>VAT (5%)</Text>
                          <Text style={[styles.txnValue, { color: c.limeDark }]}>{msg.extractedTransaction.vat} AED</Text>
                        </View>
                      </View>
                      {pendingTxn?.id === msg.extractedTransaction?.id && (
                        <View style={styles.txnActions}>
                          <TouchableOpacity onPress={() => verifyTransaction(msg.extractedTransaction)} style={styles.verifyBtn}>
                            <Text style={styles.verifyBtnText}>Verify</Text>
                            <Ionicons name="arrow-forward" size={16} color="#00531f" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setPendingTxn(null)} style={[styles.editBtn, { borderColor: c.border }]}>
                            <Text style={[styles.editBtnText, { color: c.text }]}>Edit</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        ))}

        {loading && (
          <View style={styles.aiBubbleRow}>
            <View style={[styles.aiIcon, { backgroundColor: 'rgba(79,142,255,0.12)', borderRadius: 16 }]}><Ionicons name="sparkles" size={18} color="#4F8EFF" /></View>
            <View style={[styles.aiBubble, { backgroundColor: c.surfaceLow }]}>
              <View style={styles.loadingDots}>
                <View style={[styles.dot, { backgroundColor: c.lime }]} />
                <View style={[styles.dot, { backgroundColor: c.lime, opacity: 0.6 }]} />
                <View style={[styles.dot, { backgroundColor: c.lime, opacity: 0.3 }]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={[styles.inputBar, darkMode ? CardPresets.cardDark : { ...CardPresets.cardLight }]}>
        <TouchableOpacity onPress={takePhoto} style={styles.cameraBtn}>
          <Ionicons name="camera" size={22} color="#00531f" />
        </TouchableOpacity>
        <TouchableOpacity onPress={pickImage} style={styles.galleryBtn}>
          <Ionicons name="image-outline" size={20} color={c.textMuted} />
        </TouchableOpacity>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type an expense or message..."
          placeholderTextColor={c.textMuted}
          style={[styles.textInput, { color: c.text }]}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={sendMessage} disabled={!input.trim() || loading}>
          <Ionicons name="send" size={22} color={input.trim() ? c.lime : c.textMuted} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sessionsBar: { paddingVertical: Spacing.sm, maxHeight: 60 },
  sessionChip: { width: 44, height: 44, borderRadius: Radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyChat: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyChatTitle: Typography.cardTitle,
  emptyChatSub: { ...Typography.bodySmall, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  suggestionChip: { paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: Radius.pill },
  suggestionText: Typography.caption,
  userBubble: { alignSelf: 'flex-end', maxWidth: '85%', padding: 14, borderRadius: Radius.lg, borderBottomRightRadius: 4, borderWidth: 1 },
  aiBubbleRow: { flexDirection: 'row', gap: Spacing.sm, maxWidth: '90%' },
  aiIcon: { width: 32, height: 32, marginTop: 4 },
  aiBubble: { padding: 14, borderRadius: Radius.lg, borderBottomLeftRadius: 4, borderWidth: 1, flex: 1 },
  messageText: Typography.bodySmall,
  imageTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.xs },
  imageTagText: Typography.micro,
  txnCard: { borderRadius: Radius.lg, padding: 18, borderWidth: 1 },
  txnCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  txnCardLine: { width: 3, height: 24, backgroundColor: '#44e571', borderRadius: 2 },
  txnCardTitle: Typography.cardTitle,
  txnCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg },
  txnCardCell: { width: '45%', marginBottom: Spacing.sm },
  txnLabel: { ...Typography.labelWide, marginBottom: Spacing.xs },
  txnValue: Typography.bodyBold,
  txnValueLarge: Typography.valueS,
  txnActions: { flexDirection: 'row', gap: 10, marginTop: Spacing.lg },
  verifyBtn: { flex: 1, backgroundColor: '#44e571', borderRadius: Radius.pill, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(0,83,31,0.3)', ...Shadow.limeSm },
  verifyBtnText: { color: '#00531f', ...Typography.btnPrimary },
  editBtn: { flex: 1, borderRadius: Radius.md, paddingVertical: 14, borderWidth: 1, alignItems: 'center' },
  editBtnText: Typography.btnPrimary,
  loadingDots: { flexDirection: 'row', gap: 6, padding: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginHorizontal: Spacing.lg, marginBottom: 90, borderRadius: Radius.pill, borderWidth: 1, gap: Spacing.sm },
  cameraBtn: { width: 44, height: 44, borderRadius: Radius.pill, backgroundColor: '#44e571', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,83,31,0.3)', ...Shadow.limeSm },
  galleryBtn: { padding: 4 },
  textInput: { flex: 1, ...Typography.bodySmall, paddingVertical: Spacing.sm },
});
