import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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
      // Ensure each loaded message has a stable id
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
      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { borderBottomColor: c.border }]}>
        {[['cowork', 'Co-work'], ['assistant', 'AI Assistant']].map(([val, label]) => (
          <TouchableOpacity
            key={val}
            onPress={() => setCurrentTab(val)}
            style={[
              styles.tab,
              currentTab === val
                ? { backgroundColor: '#44e571', borderColor: 'rgba(0,83,31,0.3)' }
                : { backgroundColor: c.surfaceLow, borderColor: c.border },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: currentTab === val }}
            accessibilityLabel={label}
          >
            <Text style={[styles.tabText, { color: currentTab === val ? '#003516' : c.text }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Messages List */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={{ paddingBottom: 20 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name={currentTab === 'cowork' ? 'people-outline' : 'sparkles-outline'}
              size={64}
              color={currentTab === 'cowork' ? '#44e571' : '#4F8EFF'}
            />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              {currentTab === 'cowork'
                ? 'Start team collaboration'
                : 'Ask me anything about your UAE finances'}
            </Text>
          </View>
        )}

        {messages.map((msg, i) => (
          <Animated.View
            key={msg.id}
            entering={FadeInDown.delay(Math.min(i * 50, 400)).duration(350).springify()}
            style={[
              styles.messageBubble,
              msg.role === 'user'   ? styles.userBubble   :
              msg.role === 'system' ? styles.systemBubble :
              styles.aiBubble,
              {
                backgroundColor:
                  msg.role === 'user'   ? '#44e571'        :
                  msg.role === 'system' ? c.surfaceLow     :
                  darkMode             ? c.card            : '#FFFFFF',
                borderColor: msg.role === 'user' ? 'rgba(0,83,31,0.3)' : c.border,
              },
            ]}
          >
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
                  <Text style={[styles.billAmount, { color: '#FF4B6E' }]}>{msg.extractedTransaction.amount} AED</Text>
                  <Text style={[styles.billVat, { color: '#44e571' }]}>VAT: {msg.extractedTransaction.vat} AED</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleStapleTransaction(msg.extractedTransaction)}
                  style={[styles.stapleBtn, Shadow.limeSm]}
                  accessibilityRole="button"
                  accessibilityLabel={`Staple ${msg.extractedTransaction.merchant} to vault`}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#003516" />
                  <Text style={styles.stapleBtnText}>Staple to Vault</Text>
                </TouchableOpacity>
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

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#4F8EFF" size="small" />
          </View>
        )}
      </ScrollView>

      {/* Quick Prompts */}
      {currentTab === 'assistant' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.promptsContainer}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
          accessibilityLabel="Quick prompts"
        >
          {quickPrompts.map((prompt) => (
            <TouchableOpacity
              key={prompt}
              onPress={() => setInput(prompt)}
              style={[styles.promptChip, { backgroundColor: c.surfaceLow, borderColor: c.border }]}
              accessibilityRole="button"
              accessibilityLabel={prompt}
            >
              <Text style={[styles.promptText, { color: c.text }]}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input Area */}
      <View style={[styles.inputContainer, { backgroundColor: c.bg, borderTopColor: c.border }]}>
        <TextInput
          style={[styles.input, { color: c.text, backgroundColor: c.surfaceLow, borderColor: c.border }]}
          placeholder={currentTab === 'cowork' ? 'Message team...' : 'Ask AI about UAE finances...'}
          placeholderTextColor={c.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          returnKeyType="send"
          accessibilityLabel="Message input"
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={loading || sending || !input.trim()}
          style={[
            styles.sendBtn,
            { backgroundColor: (loading || sending || !input.trim()) ? c.border : '#44e571' },
            !(loading || sending || !input.trim()) && Shadow.limeSm,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: loading || sending || !input.trim() }}
        >
          <Ionicons name="send" size={20} color={(loading || sending || !input.trim()) ? c.textMuted : '#003516'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  tabContainer:     { flexDirection: 'row', padding: Spacing.md, gap: Spacing.md, borderBottomWidth: BorderWidth.hairline },
  tab:              { flex: 1, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center' },
  tabText:          { ...Typography.btnSmall, fontWeight: '800' },
  messagesContainer:{ flex: 1, padding: Spacing.lg },
  emptyState:       { alignItems: 'center', paddingVertical: 60, gap: 16 },
  emptyText:        { ...Typography.body, textAlign: 'center', maxWidth: 260, lineHeight: 24 },
  messageBubble:    { maxWidth: '85%', padding: Spacing.lg, borderRadius: Radius.lg, marginBottom: Spacing.md, borderWidth: 1 },
  userBubble:       { alignSelf: 'flex-end', borderBottomRightRadius: 4, ...Shadow.limeSm },
  aiBubble:         { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  systemBubble:     { alignSelf: 'center', maxWidth: '90%' },
  messageText:      { ...Typography.bodySmall, lineHeight: 20 },
  messageTime:      { ...Typography.micro, marginTop: 4, textAlign: 'right' },
  loadingContainer: { padding: Spacing.md, alignItems: 'flex-start', paddingLeft: Spacing.lg },
  billWidget:       { gap: 12 },
  billIconWrap:     { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  billHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  billTitle:        { ...Typography.bodyBold },
  billData:         { paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, gap: 4 },
  billMerchant:     { ...Typography.bodyBold },
  billAmount:       { ...Typography.valueS },
  billVat:          { ...Typography.caption },
  stapleBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radius.pill, backgroundColor: '#44e571', borderWidth: 1, borderColor: 'rgba(0,83,31,0.3)' },
  stapleBtnText:    { ...Typography.btnSmall, color: '#003516' },
  promptsContainer: { maxHeight: 50, paddingVertical: Spacing.sm },
  promptChip:       { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1 },
  promptText:       { ...Typography.btnSmall },
  inputContainer:   { flexDirection: 'row', padding: Spacing.md, borderTopWidth: 1, alignItems: 'flex-end', gap: Spacing.sm, marginBottom: 90 },
  input:            { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, maxHeight: 100, ...Typography.bodySmall },
  sendBtn:          { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
});
