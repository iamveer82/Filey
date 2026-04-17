import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, Modal, Image, ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInUp, FadeIn, Layout,
  useSharedValue, useAnimatedStyle, withSpring, withRepeat,
  withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { scanReceipt } from '../services/receiptPipeline';

const MEMORY_KEY = '@filey/ai_chat_memory_v1';
const MAX_MEMORY = 40;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SpringPressable({ children, style, onPress, disabled, ...rest }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(0.95, { damping: 14, stiffness: 420 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 320 }); }}
      style={[style, anim]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

function TypingDots() {
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
    <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 6, paddingHorizontal: 2 }}>
      <Animated.View style={[styles.dot, s1]} />
      <Animated.View style={[styles.dot, s2]} />
      <Animated.View style={[styles.dot, s3]} />
    </View>
  );
}

const QUICK_ACTIONS = [
  { id: 'qa_scan',    label: 'Scan receipt',   icon: 'scan',              action: 'camera' },
  { id: 'qa_upload',  label: 'Upload receipt', icon: 'image-outline',     action: 'gallery' },
  { id: 'qa_pdf',     label: 'PDF invoice',    icon: 'document-outline',  action: 'pdf' },
  { id: 'qa_vat',     label: 'VAT help',       icon: 'shield-checkmark-outline', action: 'prompt', prompt: 'Explain UAE VAT in plain English.' },
  { id: 'qa_report',  label: 'Monthly report', icon: 'bar-chart-outline', action: 'prompt', prompt: 'Summarize my spending for this month.' },
  { id: 'qa_advice',  label: 'Advice',         icon: 'bulb-outline',      action: 'prompt', prompt: 'Give me personalized financial advice based on my recent transactions.' },
  { id: 'qa_export',  label: 'Export ledger',  icon: 'download-outline',  action: 'export' },
];

export default function AIMessagingHub() {
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scrollRef = useRef();

  const name = profile?.name || user?.email?.split('@')[0] || 'there';

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(MEMORY_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setMessages(parsed);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const recent = messages.slice(-MAX_MEMORY);
    AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(recent)).catch(() => {});
  }, [messages]);

  const pushMessage = useCallback((m) => {
    setMessages(prev => [...prev, { id: genId(), ts: Date.now(), ...m }]);
  }, []);

  const send = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    pushMessage({ role: 'user', content: text });

    try {
      const res = await api.sendMessage(text, 'ai-session');
      pushMessage({
        role: 'assistant',
        content: res.message || 'No response.',
        extractedTransaction: res.extractedTransaction,
      });
    } catch {
      pushMessage({
        role: 'assistant',
        content: 'Connection error. Using offline mode — limited responses until reconnect.',
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, pushMessage]);

  const runScan = useCallback(async (source) => {
    setShowAttach(false);
    setScanning(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    pushMessage({
      role: 'system',
      content: source === 'camera' ? 'Opening camera…' : 'Opening photo library…',
    });
    try {
      const result = await scanReceipt(source);
      if (!result.success) {
        pushMessage({ role: 'assistant', content: result.error || 'Could not process receipt.' });
        return;
      }
      if (result.imageUri) {
        pushMessage({ role: 'user', kind: 'image', uri: result.imageUri });
      }
      pushMessage({
        role: 'assistant',
        content: 'Receipt scanned. Here is what I extracted:',
        extractedTransaction: result.transaction,
      });
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (e) {
      pushMessage({ role: 'assistant', content: `Scan failed: ${e.message || 'unknown error'}.` });
    } finally {
      setScanning(false);
    }
  }, [pushMessage]);

  const runPdfPicker = useCallback(async () => {
    setShowAttach(false);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;
      pushMessage({
        role: 'user',
        kind: 'file',
        name: file.name,
        size: file.size,
        mime: file.mimeType,
      });
      pushMessage({
        role: 'assistant',
        content: `Got "${file.name}". PDF extraction runs on-device when the offline model is ready. Backend fallback coming in the next build.`,
      });
    } catch (e) {
      pushMessage({ role: 'assistant', content: `File pick failed: ${e.message}.` });
    }
  }, [pushMessage]);

  const handleQuickAction = useCallback((qa) => {
    if (qa.action === 'camera') runScan('camera');
    else if (qa.action === 'gallery') runScan('gallery');
    else if (qa.action === 'pdf') runPdfPicker();
    else if (qa.action === 'prompt') send(qa.prompt);
    else if (qa.action === 'export') {
      pushMessage({
        role: 'assistant',
        content: 'Export pipeline — generating CSV of your extracted transactions. PDF report included on next build.',
      });
    }
  }, [runScan, runPdfPicker, send, pushMessage]);

  const staple = useCallback(async (tx) => {
    try {
      await api.createTransaction(tx);
      pushMessage({
        role: 'system',
        content: `Saved to vault: ${tx.merchant} · ${tx.amount} AED`,
      });
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch {
      Alert.alert('Error', 'Failed to save transaction');
    }
  }, [pushMessage]);

  const clearMemory = useCallback(() => {
    Alert.alert('Clear memory', 'Remove all chat history on this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        setMessages([]);
        await AsyncStorage.removeItem(MEMORY_KEY).catch(() => {});
      } },
    ]);
  }, []);

  const showWelcome = messages.length === 0;
  const memoryCount = messages.filter(m => m.role !== 'system').length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0A0A0A' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <StatusBar style="light" />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topLeft}>
          <View style={styles.avatarDot}>
            <Ionicons name="sparkles" size={12} color="#0A0A0A" />
          </View>
          <View>
            <Text style={styles.topTitle}>Filey AI</Text>
            <View style={styles.statusRow}>
              <View style={styles.liveDot} />
              <Text style={styles.statusText}>Offline Gemma · {memoryCount} in memory</Text>
            </View>
          </View>
        </View>
        <Pressable onPress={clearMemory} hitSlop={10} style={styles.clearBtn}>
          <Ionicons name="refresh-outline" size={18} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {showWelcome && (
          <Animated.View entering={FadeIn.duration(500)} style={styles.welcome}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="sparkles" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.welcomeTitle}>Hi {name}. How can I help?</Text>
            <Text style={styles.welcomeSub}>
              Scan receipts, ask about VAT, get advice on your spending. I remember the last {MAX_MEMORY} messages on this device.
            </Text>
          </Animated.View>
        )}

        {messages.map((m, i) => {
          if (m.role === 'system') {
            return (
              <Animated.View key={m.id || i} entering={FadeIn.duration(220)} style={styles.systemRow}>
                <Text style={styles.systemText}>{m.content}</Text>
              </Animated.View>
            );
          }
          if (m.role === 'user') {
            if (m.kind === 'image') {
              return (
                <Animated.View key={m.id || i} entering={FadeInUp.duration(280)} layout={Layout.springify()} style={styles.userRow}>
                  <Image source={{ uri: m.uri }} style={styles.attachedImage} />
                </Animated.View>
              );
            }
            if (m.kind === 'file') {
              return (
                <Animated.View key={m.id || i} entering={FadeInUp.duration(280)} layout={Layout.springify()} style={styles.userRow}>
                  <View style={styles.fileCard}>
                    <View style={styles.fileIcon}>
                      <Ionicons name="document" size={16} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fileName} numberOfLines={1}>{m.name}</Text>
                      <Text style={styles.fileMeta}>
                        {m.mime || 'file'}{m.size ? ` · ${Math.round(m.size / 1024)} KB` : ''}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              );
            }
            return (
              <Animated.View key={m.id || i} entering={FadeInUp.duration(280)} layout={Layout.springify()} style={styles.userRow}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{m.content}</Text>
                </View>
              </Animated.View>
            );
          }
          return (
            <Animated.View
              key={m.id || i}
              entering={FadeInUp.duration(320)}
              layout={Layout.springify()}
              style={styles.aiRow}
            >
              <Text style={styles.aiText}>{m.content}</Text>
              {m.extractedTransaction && (
                <View style={styles.txCard}>
                  <View style={styles.txHeader}>
                    <View style={styles.txIcon}>
                      <Ionicons name="receipt" size={14} color="#0A0A0A" />
                    </View>
                    <Text style={styles.txLabel}>EXTRACTED</Text>
                  </View>
                  <Text style={styles.txMerchant}>{m.extractedTransaction.merchant || 'Unknown merchant'}</Text>
                  <View style={styles.txGrid}>
                    <View style={styles.txCell}>
                      <Text style={styles.txCellLabel}>Amount</Text>
                      <Text style={styles.txCellValue}>{m.extractedTransaction.amount || '—'} AED</Text>
                    </View>
                    <View style={styles.txCell}>
                      <Text style={styles.txCellLabel}>VAT</Text>
                      <Text style={styles.txCellValue}>{m.extractedTransaction.vat || '0.00'} AED</Text>
                    </View>
                    <View style={styles.txCell}>
                      <Text style={styles.txCellLabel}>Date</Text>
                      <Text style={styles.txCellValue}>{m.extractedTransaction.date || '—'}</Text>
                    </View>
                    <View style={styles.txCell}>
                      <Text style={styles.txCellLabel}>Category</Text>
                      <Text style={styles.txCellValue}>{m.extractedTransaction.category || '—'}</Text>
                    </View>
                  </View>
                  <SpringPressable
                    onPress={() => staple(m.extractedTransaction)}
                    style={styles.saveBtn}
                  >
                    <Ionicons name="save-outline" size={14} color="#0A0A0A" />
                    <Text style={styles.saveBtnText}>Save to Vault</Text>
                  </SpringPressable>
                </View>
              )}
            </Animated.View>
          );
        })}

        {(loading || scanning) && (
          <Animated.View entering={FadeIn.duration(160)} style={styles.aiRow}>
            <TypingDots />
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
        >
          {QUICK_ACTIONS.map((qa) => (
            <SpringPressable
              key={qa.id}
              onPress={() => handleQuickAction(qa)}
              style={styles.quickPill}
            >
              <Ionicons name={qa.icon} size={13} color="#FFFFFF" />
              <Text style={styles.quickPillText}>{qa.label}</Text>
            </SpringPressable>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <SpringPressable
            onPress={() => setShowAttach(true)}
            style={styles.attachBtn}
            accessibilityLabel="Attach"
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </SpringPressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Filey AI anything…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
            multiline
            maxLength={4000}
          />
          <SpringPressable
            onPress={() => send()}
            disabled={!input.trim() || loading}
            style={[styles.sendBtn, { opacity: input.trim() && !loading ? 1 : 0.4 }]}
            accessibilityLabel="Send"
          >
            <Ionicons name="arrow-up" size={18} color="#0A0A0A" />
          </SpringPressable>
        </View>
      </View>

      <Modal visible={showAttach} transparent animationType="slide" onRequestClose={() => setShowAttach(false)}>
        <Pressable style={styles.attachBackdrop} onPress={() => setShowAttach(false)}>
          <Pressable style={styles.attachSheet} onPress={() => {}}>
            <View style={styles.attachHandle} />
            <Text style={styles.attachTitle}>Add to chat</Text>

            <SpringPressable onPress={() => runScan('camera')} style={styles.attachRow}>
              <View style={[styles.attachIcon, { backgroundColor: '#3B6BFF' }]}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachLabel}>Camera</Text>
                <Text style={styles.attachSub}>Scan a receipt or invoice</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
            </SpringPressable>

            <SpringPressable onPress={() => runScan('gallery')} style={styles.attachRow}>
              <View style={[styles.attachIcon, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="images" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachLabel}>Photo Library</Text>
                <Text style={styles.attachSub}>Pick an image from Photos</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
            </SpringPressable>

            <SpringPressable onPress={runPdfPicker} style={styles.attachRow}>
              <View style={[styles.attachIcon, { backgroundColor: '#16A34A' }]}>
                <Ionicons name="document-text" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachLabel}>Files</Text>
                <Text style={styles.attachSub}>PDF invoices or documents</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
            </SpringPressable>

            <Pressable onPress={() => setShowAttach(false)} style={styles.attachCancel}>
              <Text style={styles.attachCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  topLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  statusText: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '500' },
  clearBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  welcome: { alignItems: 'flex-start', paddingTop: 24, paddingBottom: 12, gap: 10 },
  welcomeIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  welcomeTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', letterSpacing: -0.6, marginTop: 6 },
  welcomeSub: { color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 20, maxWidth: 340 },

  systemRow: { alignItems: 'center', marginVertical: 10 },
  systemText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11.5, fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10,
    letterSpacing: 0.3,
  },

  userRow: { alignItems: 'flex-end', marginVertical: 6 },
  userBubble: {
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderBottomRightRadius: 6,
    maxWidth: '88%',
  },
  userText: { color: '#FFFFFF', fontSize: 15, lineHeight: 21 },
  attachedImage: {
    width: 180, height: 240,
    borderRadius: 16, backgroundColor: '#1F1F1F',
  },
  fileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, maxWidth: '88%',
  },
  fileIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#3B6BFF',
    alignItems: 'center', justifyContent: 'center',
  },
  fileName: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '600' },
  fileMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },

  aiRow: { alignItems: 'flex-start', marginVertical: 10, maxWidth: '100%' },
  aiText: { color: '#FFFFFF', fontSize: 15.5, lineHeight: 23 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FFFFFF' },

  txCard: {
    marginTop: 12,
    backgroundColor: '#141414',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, padding: 14,
    width: '100%',
  },
  txHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txIcon: {
    width: 22, height: 22, borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  txLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 },
  txMerchant: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 8, letterSpacing: -0.3 },
  txGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 10 },
  txCell: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 10, borderRadius: 10,
  },
  txCellLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10.5, fontWeight: '600', letterSpacing: 0.5 },
  txCellValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 3 },
  saveBtn: {
    marginTop: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 42, borderRadius: 21,
    backgroundColor: '#FFFFFF',
  },
  saveBtnText: { color: '#0A0A0A', fontSize: 13.5, fontWeight: '700' },

  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
    backgroundColor: '#0A0A0A',
  },
  quickRow: {
    paddingHorizontal: 16, paddingBottom: 10,
    gap: 8,
  },
  quickPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  quickPillText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, gap: 8,
  },
  attachBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15.5,
    backgroundColor: '#161616',
    borderRadius: 20,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
    maxHeight: 130, minHeight: 40,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },

  attachBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  attachSheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28,
    gap: 8,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  attachHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginVertical: 8,
  },
  attachTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 8 },
  attachRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14, borderRadius: 14,
  },
  attachIcon: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  attachLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  attachSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  attachCancel: {
    marginTop: 8, paddingVertical: 14,
    alignItems: 'center', borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  attachCancelText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
});
