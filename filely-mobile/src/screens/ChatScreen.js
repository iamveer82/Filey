import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../theme/colors';
import api from '../api/client';

function generateId() {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

export default function ChatScreen({ darkMode }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(generateId());
  const [sessions, setSessions] = useState([]);
  const [pendingTxn, setPendingTxn] = useState(null);
  const [editingTxn, setEditingTxn] = useState(null);
  const [editMerchant, setEditMerchant] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const scrollRef = useRef();

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [messages]);

  const fetchSessions = async () => {
    try { const d = await api.getChatSessions(); setSessions(d.sessions || []); } catch(e) {}
  };

  const loadSession = async (sid) => {
    setSessionId(sid);
    try {
      const d = await api.getChatMessages(sid);
      setMessages((d.messages || []).map(m => ({
        id: m.id, role: m.role, content: m.content,
        extractedTransaction: m.extractedTransaction, hasImage: m.hasImage,
      })));
    } catch(e) {}
  };

  const startNewChat = () => { setSessionId(generateId()); setMessages([]); setPendingTxn(null); };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput(''); setLoading(true);
    setMessages(prev => [...prev, { id: generateId(), role: 'user', content: msg }]);

    try {
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      setLoading(true);
      setMessages(prev => [...prev, { id: generateId(), role: 'user', content: 'Receipt uploaded', hasImage: true }]);
      try {
        const asset = result.assets[0];
        const d = await api.scanReceipt(asset.base64, asset.mimeType || 'image/jpeg', sessionId);
        if (d.error) {
          setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Scan error: ${d.error}` }]);
        } else {
          setMessages(prev => [...prev, {
            id: generateId(), role: 'assistant', content: d.message,
            extractedTransaction: d.extractedTransaction,
          }]);
          if (d.extractedTransaction) setPendingTxn(d.extractedTransaction);
        }
      } catch(e) {}
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required to scan receipts.'); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });
    if (!result.canceled && result.assets[0]) {
      setLoading(true);
      setMessages(prev => [...prev, { id: generateId(), role: 'user', content: 'Receipt photo taken', hasImage: true }]);
      try {
        const asset = result.assets[0];
        const d = await api.scanReceipt(asset.base64, 'image/jpeg', sessionId);
        if (d.error) {
          setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Scan error: ${d.error}` }]);
        } else {
          setMessages(prev => [...prev, {
            id: generateId(), role: 'assistant', content: d.message,
            extractedTransaction: d.extractedTransaction,
          }]);
          if (d.extractedTransaction) setPendingTxn(d.extractedTransaction);
        }
      } catch(e) {}
      setLoading(false);
    }
  };

  const openEditTxn = (txn) => {
    setEditMerchant(txn.merchant || '');
    setEditAmount(String(txn.amount || ''));
    setEditCategory(txn.category || 'General');
    setEditingTxn(txn);
  };

  const confirmEditTxn = () => {
    if (!editMerchant.trim() || !editAmount.trim()) { Alert.alert('Missing fields', 'Please fill in merchant and amount.'); return; }
    const updated = { ...editingTxn, merchant: editMerchant, amount: parseFloat(editAmount) || editingTxn.amount, category: editCategory, vat: ((parseFloat(editAmount) || editingTxn.amount) * 0.05).toFixed(2) };
    setPendingTxn(updated);
    setEditingTxn(null);
  };

  const verifyTransaction = async (txn) => {
    try {
      await api.createTransaction(txn);
      setPendingTxn(null);
      setMessages(prev => [...prev, {
        id: generateId(), role: 'assistant',
        content: `Transaction verified! ${txn.merchant} - ${txn.amount} AED ✅`,
      }]);
    } catch(e) {}
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {/* Session History */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionsBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        <TouchableOpacity onPress={startNewChat} style={[styles.sessionChip, { backgroundColor: c.limeLight, borderColor: c.lime }]}>
          <Ionicons name="add" size={18} color={c.lime} />
        </TouchableOpacity>
        {sessions.slice(0, 8).map((s, i) => (
          <TouchableOpacity key={i} onPress={() => loadSession(s.sessionId)} style={[styles.sessionChip, { backgroundColor: c.surfaceLow, borderColor: c.border }]}>
            <Ionicons name="document-text-outline" size={16} color={c.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Messages */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        {messages.length === 0 && (
          <View style={styles.emptyChat}>
            <Ionicons name="sparkles" size={48} color={c.lime} />
            <Text style={[styles.emptyChatTitle, { color: c.text }]}>Filely AI</Text>
            <Text style={[styles.emptyChatSub, { color: c.textSecondary }]}>
              Scan receipts, log expenses, or ask about your UAE finances.
            </Text>
            <View style={styles.suggestions}>
              {['Scan a receipt', 'Paid 120 AED at ENOC', 'Last food bill'].map(s => (
                <TouchableOpacity key={s} onPress={() => setInput(s)} style={[styles.suggestionChip, { backgroundColor: c.surfaceLow }]}>
                  <Text style={[styles.suggestionText, { color: c.textSecondary }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map(msg => (
          <View key={msg.id} style={{ marginBottom: 16 }}>
            {msg.role === 'user' ? (
              <View style={[styles.userBubble, { backgroundColor: c.card, borderColor: c.border }]}>
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
                <View style={styles.aiIcon}>
                  <Ionicons name="sparkles" size={18} color="#006e2c" />
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={[styles.aiBubble, { backgroundColor: c.surfaceLow, borderColor: c.border }]}>
                    <Text style={[styles.messageText, { color: c.textSecondary }]}>{msg.content}</Text>
                  </View>
                  {msg.extractedTransaction && (
                    <View style={[styles.txnCard, { backgroundColor: c.card, borderColor: c.border }]}>
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
                          <TouchableOpacity onPress={() => openEditTxn(msg.extractedTransaction)} style={[styles.editBtn, { borderColor: c.border }]}>
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
            <View style={styles.aiIcon}><Ionicons name="sparkles" size={18} color="#006e2c" /></View>
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

      {/* Edit Transaction Modal */}
      <Modal visible={!!editingTxn} transparent animationType="slide" onRequestClose={() => setEditingTxn(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>
            <Text style={{ color: c.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 }}>Edit Transaction</Text>
            <View>
              <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 }}>MERCHANT</Text>
              <TextInput value={editMerchant} onChangeText={setEditMerchant} style={{ backgroundColor: c.surfaceLow, color: c.text, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: c.border }} />
            </View>
            <View>
              <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 }}>AMOUNT (AED)</Text>
              <TextInput value={editAmount} onChangeText={setEditAmount} keyboardType="decimal-pad" style={{ backgroundColor: c.surfaceLow, color: c.text, borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: c.border }} />
            </View>
            <View>
              <Text style={{ color: c.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 }}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {['Food','Transport','Shopping','Office','Utilities','Entertainment','Health','Travel','Banking','General'].map(cat => (
                  <TouchableOpacity key={cat} onPress={() => setEditCategory(cat)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: editCategory === cat ? '#44e571' : c.surfaceLow, borderWidth: 1, borderColor: editCategory === cat ? '#44e571' : c.border }}>
                    <Text style={{ color: editCategory === cat ? '#00531f' : c.textSecondary, fontWeight: '700', fontSize: 12 }}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <TouchableOpacity onPress={confirmEditTxn} style={{ flex: 1, backgroundColor: '#44e571', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ color: '#00531f', fontWeight: '800', fontSize: 15 }}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingTxn(null)} style={{ flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: c.border }}>
                <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Input Bar */}
      <View style={[styles.inputBar, { backgroundColor: c.card, borderColor: c.border }]}>
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
  sessionsBar: { paddingVertical: 8, maxHeight: 60 },
  sessionChip: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyChat: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyChatTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  emptyChatSub: { fontSize: 14, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 16 },
  suggestionChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  suggestionText: { fontSize: 13, fontWeight: '500' },
  userBubble: { alignSelf: 'flex-end', maxWidth: '85%', padding: 14, borderRadius: 18, borderBottomRightRadius: 4, borderWidth: 1 },
  aiBubbleRow: { flexDirection: 'row', gap: 8, maxWidth: '90%' },
  aiIcon: { width: 32, height: 32, marginTop: 4 },
  aiBubble: { padding: 14, borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1, flex: 1 },
  messageText: { fontSize: 14, lineHeight: 20 },
  imageTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  imageTagText: { fontSize: 11, fontWeight: '700' },
  txnCard: { borderRadius: 16, padding: 18, borderWidth: 1 },
  txnCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  txnCardLine: { width: 3, height: 24, backgroundColor: '#44e571', borderRadius: 2 },
  txnCardTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  txnCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  txnCardCell: { width: '45%', marginBottom: 8 },
  txnLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  txnValue: { fontSize: 15, fontWeight: '700' },
  txnValueLarge: { fontSize: 22, fontWeight: '900' },
  txnActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  verifyBtn: { flex: 1, backgroundColor: '#44e571', borderRadius: 24, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  verifyBtnText: { color: '#00531f', fontWeight: '800', fontSize: 15 },
  editBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, borderWidth: 1, alignItems: 'center' },
  editBtnText: { fontWeight: '800', fontSize: 15 },
  loadingDots: { flexDirection: 'row', gap: 6, padding: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 16, marginBottom: 90, borderRadius: 28, borderWidth: 1, gap: 8 },
  cameraBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#44e571', alignItems: 'center', justifyContent: 'center' },
  galleryBtn: { padding: 4 },
  textInput: { flex: 1, fontSize: 14, fontWeight: '500', paddingVertical: 8 },
});
