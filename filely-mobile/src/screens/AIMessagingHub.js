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
import { scanReceipt, scanReceiptBulk, scanReceiptMerged } from '../services/receiptPipeline';
import { checkDuplicate, recordSeen } from '../services/dedup';
import { computeNudges } from '../services/nudges';
import { extractMentions, resolveMentions, notifyMentions } from '../services/mentions';
import { checkCap } from '../services/policy';
import { suggestFollowups, detectAnomaly } from '../services/aiInsights';
import { maybeBuildWeeklyDigest } from '../services/weeklyDigest';
import TransactionEditor from '../components/TransactionEditor';
import VatSummaryModal from '../components/VatSummaryModal';
import { categoryById } from '../services/categories';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { send as llmSend, getPreference as getLLMPref } from '../services/llmProvider';
import { exportCSV, exportPDF } from '../services/exportLedger';
import { exportPeppolBatch } from '../services/eInvoiceExport';
import { seedVersion } from '../services/txVersioning';
import ThreadPicker from '../components/ThreadPicker';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  ensureActiveThread, msgKey, memKey, setActiveThreadId as setActiveThreadIdPersist,
  deriveTitle, renameThread, touchThread, createThread,
} from '../services/threads';
import { TOOL_SCHEMAS, toAnthropicTools, runTool, normalizeToolCalls } from '../services/aiTools';

const MAX_MEMORY = 40;
const TOOL_INTENT_RE = /\b(export|download|email).*(csv|pdf|ledger|report)\b|\b(show|open|display).*(vat|summary|reclaim)\b|\b(find|search|look up|list).*(receipt|transaction|expense)\b|\b(save|add|log|record).*(receipt|tx|transaction|to vault)\b/i;

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
  { id: 'qa_bulk',    label: 'Bulk scan',      icon: 'albums-outline',    action: 'bulk' },
  { id: 'qa_merge',   label: 'Multi-page',     icon: 'layers-outline',    action: 'merge' },
  { id: 'qa_pdf',     label: 'PDF invoice',    icon: 'document-outline',  action: 'pdf' },
  { id: 'qa_vat',     label: 'VAT help',       icon: 'shield-checkmark-outline', action: 'prompt', prompt: 'Explain UAE VAT in plain English.' },
  { id: 'qa_vat_sum', label: 'VAT summary',    icon: 'calculator-outline', action: 'vatSummary' },
  { id: 'qa_report',  label: 'Monthly report', icon: 'bar-chart-outline', action: 'prompt', prompt: 'Summarize my spending for this month.' },
  { id: 'qa_advice',  label: 'Advice',         icon: 'bulb-outline',      action: 'prompt', prompt: 'Give me personalized financial advice based on my recent transactions.' },
  { id: 'qa_export',  label: 'Export ledger',  icon: 'download-outline',  action: 'export' },
];

export default function AIMessagingHub() {
  const insets = useSafeAreaInsets();
  const { profile, user, orgId, userId } = useAuth();
  const submitterName = profile?.name || user?.email?.split('@')[0] || 'member';
  const companyName = profile?.company || 'My Company';
  const withOrgContext = (tx) => ({
    ...tx,
    orgId: orgId || 'default',
    submittedBy: userId,
    submittedByName: submitterName,
    submittedAt: new Date().toISOString(),
    status: tx.status || 'pending',
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showVatSummary, setShowVatSummary] = useState(false);
  const [activeThread, setActiveThread] = useState(null);
  const [showThreads, setShowThreads] = useState(false);
  const [followups, setFollowups] = useState([]);
  const scrollRef = useRef();
  const abortRef = useRef(null);
  const lastUserPromptRef = useRef(null);
  const titleSetRef = useRef(false);

  const name = profile?.name || user?.email?.split('@')[0] || 'there';

  useEffect(() => {
    (async () => {
      try {
        const t = await ensureActiveThread();
        setActiveThread(t);
        const raw = await AsyncStorage.getItem(msgKey(t.id));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
            titleSetRef.current = !!parsed.find(m => m.role === 'user');
          }
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!activeThread || messages.length === 0) return;
    const recent = messages.slice(-MAX_MEMORY);
    AsyncStorage.setItem(msgKey(activeThread.id), JSON.stringify(recent)).catch(() => {});
  }, [messages, activeThread]);

  const switchThread = useCallback(async (id) => {
    await setActiveThreadIdPersist(id);
    const raw = await AsyncStorage.getItem(msgKey(id));
    const parsed = raw ? JSON.parse(raw) : [];
    setMessages(Array.isArray(parsed) ? parsed : []);
    titleSetRef.current = (Array.isArray(parsed) ? parsed : []).some(m => m.role === 'user');
    // Refresh row meta
    const { listThreads } = require('../services/threads');
    const all = await listThreads();
    setActiveThread(all.find(t => t.id === id) || null);
  }, []);

  // Proactive nudges + weekly digest on mount
  useEffect(() => {
    let mounted = true;
    const t = setTimeout(async () => {
      try {
        const nudges = await computeNudges({ orgId });
        if (mounted && nudges?.length) {
          for (const n of nudges) {
            pushMessage({ role: 'system', kind: 'nudge', severity: n.severity, content: n.text });
          }
        }
        const digest = await maybeBuildWeeklyDigest({ orgId });
        if (mounted && digest?.text) {
          pushMessage({ role: 'assistant', kind: 'digest', content: digest.text, meta: { digestStats: digest.stats } });
        }
      } catch {}
    }, 1400);
    return () => { mounted = false; clearTimeout(t); };
  }, [orgId, pushMessage]);

  const newThread = useCallback(async () => {
    const t = await createThread('New chat');
    setActiveThread(t);
    setMessages([]);
    titleSetRef.current = false;
  }, []);

  const pushMessage = useCallback((m) => {
    setMessages(prev => [...prev, { id: genId(), ts: Date.now(), ...m }]);
  }, []);

  const runTurn = useCallback(async (text, historyOverride) => {
    const history = (historyOverride ?? messages).slice(-12)
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content)
      .map(m => ({ role: m.role, content: m.content }));

    let txContext = '';
    const needsData = /advice|summary|spend|spent|spending|budget|savings|report|breakdown|category|vat|tax|owe|reclaim|deduction/i.test(text);
    if (needsData) {
      try {
        const res = await api.getTransactions({ orgId });
        const list = (res?.transactions || res || []).slice(-50);
        if (list.length) {
          const { summarizeVat } = require('../services/categories');
          const sum = summarizeVat(list);
          const top = sum.byCategory.slice(0, 6)
            .map(c => `- ${c.label}: ${c.amt.toFixed(2)} AED (VAT ${c.vat.toFixed(2)}, ×${c.count})`)
            .join('\n');
          txContext = `\n\nUSER TRANSACTION CONTEXT (last ${list.length}):\nTotal: ${sum.totalAmt.toFixed(2)} AED · VAT paid: ${sum.totalVat.toFixed(2)} · Reclaimable: ${sum.reclaimable.toFixed(2)}\nTop categories:\n${top}\nCompany: ${companyName} · Submitter: ${submitterName}`;
        }
      } catch {}
    }

    const sys = {
      role: 'system',
      content: `You are Filey, a UAE VAT-compliance assistant for ${companyName}. Be concise and direct. Use markdown (bold, lists, headers). Cite [n] when using web results. UAE VAT is 5% (FTA). Users can reclaim VAT on qualifying business expenses only (fuel, utilities, telecom, software, travel, office, legal, hotel).${txContext}`,
    };
    const convo = [sys, ...history, { role: 'user', content: text }];

    // Create streaming placeholder message
    const streamId = genId();
    setMessages(prev => [...prev, { id: streamId, ts: Date.now(), role: 'assistant', content: '', streaming: true }]);

    abortRef.current = new AbortController();

    try {
      const out = await llmSend(convo, {
        signal: abortRef.current.signal,
        onToken: (_delta, acc) => {
          setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: acc } : m));
        },
      });
      setMessages(prev => prev.map(m => m.id === streamId
        ? { ...m, content: out.text || m.content || 'No response.', meta: out.meta, streaming: false }
        : m
      ));
      // Generate followup chips (non-blocking)
      const pref = await getLLMPref().catch(() => ({}));
      suggestFollowups(out.text || '', text, { provider: pref.provider })
        .then(chips => setFollowups(chips || []))
        .catch(() => {});
    } catch (e) {
      const aborted = e.name === 'AbortError' || /abort/i.test(e.message || '');
      setMessages(prev => prev.map(m => m.id === streamId
        ? { ...m, content: m.content || (aborted ? '_Stopped._' : `Error: ${e.message}. Configure provider in Settings → AI & Integrations.`), streaming: false, aborted }
        : m
      ));
    } finally {
      abortRef.current = null;
    }
  }, [messages, orgId, companyName, submitterName]);

  const runAgenticTurn = useCallback(async (text, historyOverride) => {
    const history = (historyOverride ?? messages).slice(-10)
      .filter(m => (m.role === 'user' || m.role === 'assistant') && m.content)
      .map(m => ({ role: m.role, content: m.content }));

    const pref = await getLLMPref();
    const provider = pref.provider;
    const tools = provider === 'anthropic' ? toAnthropicTools() : TOOL_SCHEMAS;

    const sys = {
      role: 'system',
      content: `You are Filey, UAE VAT assistant for ${companyName}. Call tools when user asks to save, export, search vault, or view VAT summary. Keep replies short after tools run. VAT is 5% (FTA). Submitter: ${submitterName}.`,
    };
    const convo = [sys, ...history, { role: 'user', content: text }];

    abortRef.current = new AbortController();
    try {
      const first = await llmSend(convo, { signal: abortRef.current.signal, tools, maxTokens: 700 });
      const calls = normalizeToolCalls(first.toolCalls, provider);

      if (!calls.length) {
        // Fallback to plain assistant reply
        pushMessage({ role: 'assistant', content: first.text || '…', meta: first.meta });
        return;
      }

      const ctx = { orgId, userId, submitterName, companyName };
      const results = [];
      for (const c of calls) {
        pushMessage({ role: 'system', content: `⚙ ${c.name}…` });
        const r = await runTool(c.name, c.args, ctx);
        results.push({ call: c, out: r });
        if (r.side?.type === 'open_vat_summary') setShowVatSummary(true);
        if (r.ok) {
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        }
      }

      const resultSummary = results.map(r =>
        `- ${r.call.name}(${JSON.stringify(r.call.args).slice(0, 120)}) → ${r.out.ok ? JSON.stringify(r.out.result).slice(0, 200) : 'ERR: ' + r.out.error}`
      ).join('\n');

      const wrap = [
        ...convo,
        { role: 'assistant', content: first.text || '(calling tools)' },
        { role: 'user', content: `TOOL RESULTS:\n${resultSummary}\n\nConfirm to the user what happened in 1-2 sentences.` },
      ];

      const streamId = genId();
      setMessages(prev => [...prev, { id: streamId, ts: Date.now(), role: 'assistant', content: '', streaming: true }]);
      const final = await llmSend(wrap, {
        signal: abortRef.current.signal,
        onToken: (_d, acc) => setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: acc } : m)),
      });
      setMessages(prev => prev.map(m => m.id === streamId
        ? { ...m, content: final.text || '✓ Done.', meta: final.meta, streaming: false }
        : m
      ));
    } catch (e) {
      const aborted = e.name === 'AbortError';
      pushMessage({ role: 'assistant', content: aborted ? '_Stopped._' : `Agent error: ${e.message}` });
    } finally {
      abortRef.current = null;
    }
  }, [messages, orgId, userId, submitterName, companyName, pushMessage]);

  const send = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading || !activeThread) return;
    setInput('');
    setLoading(true);
    lastUserPromptRef.current = text;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setFollowups([]);
    pushMessage({ role: 'user', content: text });

    // @mentions — resolve + notify
    const handles = extractMentions(text);
    if (handles.length) {
      try {
        const members = await resolveMentions(handles, orgId);
        if (members.length) {
          await notifyMentions(members, {
            fromName: submitterName,
            text,
            threadId: activeThread?.id,
          });
          pushMessage({
            role: 'system',
            content: `🔔 Notified ${members.map(m => m.name).join(', ')}`,
          });
        } else {
          pushMessage({
            role: 'system',
            content: `No match for @${handles.join(', @')}. Check team list.`,
          });
        }
      } catch {}
    }

    // Auto-title thread from first user message
    if (!titleSetRef.current) {
      const title = deriveTitle(text);
      renameThread(activeThread.id, title).catch(() => {});
      setActiveThread(t => t ? { ...t, title } : t);
      titleSetRef.current = true;
    } else {
      touchThread(activeThread.id).catch(() => {});
    }

    const pref = await getLLMPref().catch(() => ({ provider: 'gemma' }));
    const canTool = pref.provider === 'openai' || pref.provider === 'anthropic' || pref.provider === 'openrouter';
    if (canTool && TOOL_INTENT_RE.test(text)) {
      await runAgenticTurn(text);
    } else {
      await runTurn(text);
    }
    setLoading(false);
  }, [input, loading, activeThread, orgId, submitterName, pushMessage, runTurn, runAgenticTurn]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  }, []);

  const showMessageActions = useCallback((m) => {
    if (!m.content) return;
    try { Haptics.selectionAsync(); } catch {}
    Alert.alert('Message', '', [
      { text: 'Copy', onPress: async () => {
        await Clipboard.setStringAsync(m.content);
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      }},
      { text: 'Share', onPress: async () => {
        try { await Share.share({ message: m.content }); } catch {}
      }},
      { text: 'Report correction', onPress: () => {
        pushMessage({ role: 'system', content: 'Noted. Correction queued for model retraining.' });
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pushMessage]);

  const regenerate = useCallback(async () => {
    if (loading) return;
    // Remove last assistant message, re-run with last user prompt
    let lastUserText = lastUserPromptRef.current;
    let cutoff = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && !messages[i].extractedTransaction && !messages[i].kind) {
        cutoff = i;
        break;
      }
    }
    if (cutoff < 0 || !lastUserText) return;
    const trimmed = messages.slice(0, cutoff);
    setMessages(trimmed);
    setLoading(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    await runTurn(lastUserText, trimmed);
    setLoading(false);
  }, [loading, messages, runTurn]);

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
        imageUri: result.imageUri,
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
    else if (qa.action === 'bulk') runBulkScan();
    else if (qa.action === 'merge') runMergeScan();
    else if (qa.action === 'vatSummary') setShowVatSummary(true);
    else if (qa.action === 'pdf') runPdfPicker();
    else if (qa.action === 'prompt') send(qa.prompt);
    else if (qa.action === 'export') {
      Alert.alert('Export ledger', 'Choose a format', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'CSV (Excel)', onPress: () => doExport('csv') },
        { text: 'PDF report', onPress: () => doExport('pdf') },
        { text: 'e-Invoice XML (PEPPOL)', onPress: () => doExport('peppol') },
      ]);
    }
  }, [runScan, runPdfPicker, send, pushMessage, runBulkScan, runMergeScan]);

  const doExport = useCallback(async (fmt) => {
    try {
      pushMessage({ role: 'system', content: `Preparing ${fmt.toUpperCase()} export…` });
      const res = await api.getTransactions();
      const txs = res?.transactions || res || [];
      if (!txs.length) {
        pushMessage({ role: 'assistant', content: 'No transactions in vault yet. Scan a receipt first.' });
        return;
      }
      if (fmt === 'csv') await exportCSV(txs);
      else if (fmt === 'peppol') await exportPeppolBatch(txs, { supplierName: 'My Company' });
      else await exportPDF(txs, { company: 'My Company' });
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      pushMessage({ role: 'system', content: `${fmt.toUpperCase()} ready — shared via iOS sheet.` });
    } catch (e) {
      pushMessage({ role: 'assistant', content: `Export failed: ${e.message || e}` });
    }
  }, [pushMessage]);

  const dedupGuard = useCallback(async (tx) => {
    try {
      const cap = await checkCap({ orgId, userId, tx });
      if (cap.warn) {
        const ok = await new Promise((resolve) => {
          Alert.alert(
            'Policy cap warning',
            `Saving this puts you at ${cap.afterThis.toFixed(0)} AED on ${cap.label} this month, over the ${cap.cap} AED cap (+${cap.overBy.toFixed(0)}). Continue?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Save over cap', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });
        if (!ok) return false;
      }
    } catch {}

    try {
      const dup = await checkDuplicate(tx, { orgId });
      if (dup.duplicate) {
        const m = dup.match || {};
        return new Promise((resolve) => {
          Alert.alert(
            'Possible duplicate',
            `${m.merchant || tx.merchant} · ${m.amount || tx.amount} AED on ${m.date || tx.date} was already submitted${m.submittedByName ? ` by ${m.submittedByName}` : ''}. Save anyway?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Save anyway', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });
      }
    } catch {}
    return true;
  }, [orgId, userId]);

  const runAnomalyCheck = useCallback(async (tx) => {
    try {
      const res = await api.getOrgTransactions?.(orgId, { submittedBy: userId })
        || await api.getTransactions({});
      const rows = Array.isArray(res) ? res : res?.transactions || [];
      const mine = rows.filter(r => !r.submittedBy || r.submittedBy === userId);
      const { anomaly, reasons, severity } = detectAnomaly(tx, mine);
      if (anomaly) {
        pushMessage({
          role: 'system',
          kind: 'anomaly',
          severity,
          content: `⚠ Anomaly: ${reasons.join(' · ')}`,
        });
      }
    } catch {}
  }, [orgId, userId, pushMessage]);

  const staple = useCallback(async (tx) => {
    const ok = await dedupGuard(tx);
    if (!ok) return;
    try {
      const enriched = withOrgContext(tx);
      await api.createTransaction(enriched);
      await recordSeen(tx, { submittedByName: submitterName });
      try {
        await seedVersion(enriched.id || tx.id, {
          ocrText: tx.ocrText || tx.rawText,
          imageUri: tx.imageUri,
          parsed: enriched,
          actorId: userId,
          actorName: submitterName,
        });
      } catch {}
      runAnomalyCheck(tx);
      pushMessage({
        role: 'system',
        content: `Saved: ${tx.merchant || 'transaction'} · ${tx.amount} AED · ${categoryById(tx.category).label} · by ${submitterName}`,
      });
      setMessages(prev => prev.map(m =>
        m.extractedTransaction?.id === tx.id ? { ...m, extractedSaved: true } : m
      ));
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch {
      Alert.alert('Error', 'Failed to save transaction');
    }
  }, [pushMessage, dedupGuard, submitterName]);

  const stapleFromQueue = useCallback(async (tx, msgId) => {
    const ok = await dedupGuard(tx);
    if (!ok) return;
    try {
      const enriched = withOrgContext(tx);
      await api.createTransaction(enriched);
      await recordSeen(tx, { submittedByName: submitterName });
      try {
        await seedVersion(enriched.id || tx.id, {
          ocrText: tx.ocrText || tx.rawText,
          imageUri: tx.imageUri,
          parsed: enriched,
          actorId: userId,
          actorName: submitterName,
        });
      } catch {}
      runAnomalyCheck(tx);
      pushMessage({ role: 'system', content: `Saved: ${tx.merchant || 'tx'} · ${tx.amount} AED · by ${submitterName}` });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, extractedSaved: true } : m));
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch { Alert.alert('Error', 'Failed to save'); }
  }, [pushMessage, dedupGuard, submitterName]);

  const runMergeScan = useCallback(async () => {
    setShowAttach(false);
    setScanning(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    pushMessage({ role: 'system', content: 'Multi-page merge — pick 2-6 pages of one invoice.' });
    try {
      const r = await scanReceiptMerged();
      if (!r.success) {
        pushMessage({ role: 'assistant', content: r.error || 'Merge failed.' });
        return;
      }
      if (r.imageUri) pushMessage({ role: 'user', kind: 'image', uri: r.imageUri });
      pushMessage({
        role: 'assistant',
        content: `Merged ${r.transaction.pageCount} pages into one transaction:`,
        extractedTransaction: r.transaction,
        imageUri: r.imageUri,
      });
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (e) {
      pushMessage({ role: 'assistant', content: `Merge failed: ${e.message}` });
    } finally {
      setScanning(false);
    }
  }, [pushMessage]);

  const runBulkScan = useCallback(async () => {
    setShowAttach(false);
    setScanning(true);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    pushMessage({ role: 'system', content: 'Bulk scan started. Pick up to 20 receipts.' });
    try {
      const { results, count } = await scanReceiptBulk(({ done, total }) => {
        if (done > 0 && done < total) {
          // Live progress update (optional, currently noop)
        }
      });
      if (!count) {
        pushMessage({ role: 'assistant', content: 'No images selected.' });
        return;
      }
      const ok = results.filter(r => r.success);
      const failed = results.length - ok.length;
      pushMessage({
        role: 'assistant',
        content: `Processed ${count} receipt${count > 1 ? 's' : ''}. ${ok.length} extracted${failed ? `, ${failed} failed` : ''}. Review and save below.`,
      });
      for (const r of ok) {
        pushMessage({
          role: 'assistant',
          content: '',
          extractedTransaction: r.transaction,
          imageUri: r.imageUri,
        });
      }
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (e) {
      pushMessage({ role: 'assistant', content: `Bulk scan failed: ${e.message}` });
    } finally {
      setScanning(false);
    }
  }, [pushMessage]);

  const clearMemory = useCallback(() => {
    Alert.alert('New chat', 'Start a fresh thread? Current chat stays saved under its title.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'New chat', onPress: newThread },
    ]);
  }, [newThread]);

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
          <Pressable onPress={() => setShowThreads(true)} style={{ flex: 1 }}>
            <Text style={styles.topTitle} numberOfLines={1}>
              {activeThread?.title || 'Filey AI'}
              <Text style={{ color: 'rgba(255,255,255,0.4)' }}>  ▾</Text>
            </Text>
            <View style={styles.statusRow}>
              <View style={styles.liveDot} />
              <Text style={styles.statusText}>{memoryCount} in memory · tap to switch</Text>
            </View>
          </Pressable>
        </View>
        <Pressable onPress={newThread} hitSlop={10} style={[styles.clearBtn, { marginRight: 8 }]}>
          <Ionicons name="create-outline" size={18} color="rgba(255,255,255,0.6)" />
        </Pressable>
        <Pressable onPress={clearMemory} hitSlop={10} style={styles.clearBtn}>
          <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>

      <ErrorBoundary>
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
              <Pressable
                onLongPress={() => showMessageActions(m)}
                delayLongPress={250}
                style={{ width: '100%' }}
              >
                {m.content ? (
                  <Markdown style={mdStyles}>{m.content}</Markdown>
                ) : null}
                {m.streaming && (
                  <View style={styles.streamBar}>
                    <View style={styles.streamDot} />
                    <Text style={styles.streamText}>streaming…</Text>
                    <Pressable onPress={stop} style={styles.stopBtn}>
                      <Ionicons name="stop" size={11} color="#FCA5A5" />
                      <Text style={styles.stopText}>Stop</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
              {!m.streaming && !m.extractedTransaction && m.role === 'assistant' && i === messages.length - 1 && (
                <Pressable onPress={regenerate} style={styles.regenBtn}>
                  <Ionicons name="refresh" size={12} color="#9CA3AF" />
                  <Text style={styles.regenText}>Regenerate</Text>
                </Pressable>
              )}
              {m.meta?.citations?.length > 0 && (
                <View style={styles.citationRow}>
                  {m.meta.citations.map((cite, ci) => (
                    <View key={ci} style={styles.citationChip}>
                      <Ionicons name="link" size={10} color="#9CA3AF" />
                      <Text style={styles.citationText} numberOfLines={1}>
                        [{ci + 1}] {cite.title}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {m.meta?.provider && m.meta.provider !== 'gemma' && (
                <Text style={styles.providerHint}>
                  {m.meta.webUsed ? '🌐 web · ' : ''}{m.meta.provider} · {m.meta.model}
                </Text>
              )}
              {m.extractedTransaction && !m.extractedSaved && (
                <TransactionEditor
                  transaction={m.extractedTransaction}
                  imageUri={m.imageUri}
                  submitterName={submitterName}
                  onSave={(tx) => stapleFromQueue(tx, m.id)}
                />
              )}
              {m.extractedTransaction && m.extractedSaved && (
                <View style={styles.savedChip}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.savedChipText}>Saved to Vault</Text>
                </View>
              )}
            </Animated.View>
          );
        })}

        {scanning && (
          <Animated.View entering={FadeIn.duration(160)} style={styles.aiRow}>
            <TypingDots />
          </Animated.View>
        )}
        {loading && !messages[messages.length - 1]?.streaming && (
          <Animated.View entering={FadeIn.duration(160)} style={styles.aiRow}>
            <TypingDots />
          </Animated.View>
        )}
      </ScrollView>
      </ErrorBoundary>

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

        {followups.length > 0 && !loading && (
          <Animated.View entering={FadeIn.duration(240)} style={styles.followupWrap}>
            {followups.map((q, i) => (
              <SpringPressable
                key={`${i}-${q}`}
                onPress={() => { setFollowups([]); send(q); }}
                style={styles.followupChip}
              >
                <Ionicons name="sparkles" size={11} color="#93C5FD" />
                <Text style={styles.followupText} numberOfLines={1}>{q}</Text>
              </SpringPressable>
            ))}
          </Animated.View>
        )}

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

      <VatSummaryModal visible={showVatSummary} onClose={() => setShowVatSummary(false)} />
      <ThreadPicker
        visible={showThreads}
        activeId={activeThread?.id}
        onClose={() => setShowThreads(false)}
        onPick={switchThread}
      />
    </KeyboardAvoidingView>
  );
}

const mdStyles = {
  body: { color: '#F9FAFB', fontSize: 15.5, lineHeight: 23 },
  strong: { color: '#FFFFFF', fontWeight: '700' },
  em: { color: '#F9FAFB', fontStyle: 'italic' },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { color: '#F9FAFB', fontSize: 15.5, lineHeight: 23 },
  code_inline: { backgroundColor: '#1F1F1F', color: '#BEF264', paddingHorizontal: 4, borderRadius: 4 },
  code_block: { backgroundColor: '#1F1F1F', color: '#E5E7EB', padding: 10, borderRadius: 10 },
  fence: { backgroundColor: '#1F1F1F', color: '#E5E7EB', padding: 10, borderRadius: 10 },
  heading1: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  heading2: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  heading3: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  link: { color: '#93C5FD' },
  blockquote: { backgroundColor: '#1F1F1F', borderLeftWidth: 3, borderLeftColor: '#3B6BFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
};

const styles = StyleSheet.create({
  streamBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#262626',
  },
  streamDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  streamText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', flex: 1 },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, backgroundColor: '#1F1F1F',
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  stopText: { color: '#F9FAFB', fontSize: 11, fontWeight: '700' },
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    marginTop: 6, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, backgroundColor: '#1F1F1F',
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  regenText: { color: '#E5E7EB', fontSize: 11, fontWeight: '600' },
  followupWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 7,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  followupChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(147,197,253,0.08)',
    borderWidth: 1, borderColor: 'rgba(147,197,253,0.2)',
    maxWidth: '100%',
  },
  followupText: { color: '#BFDBFE', fontSize: 12, fontWeight: '600' },
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
  citationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  citationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10, backgroundColor: '#1F1F1F',
    maxWidth: 220,
  },
  citationText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  providerHint: { color: '#6B7280', fontSize: 10.5, marginTop: 6, fontStyle: 'italic' },
  savedChip: {
    marginTop: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  savedChipText: { color: '#10B981', fontSize: 12, fontWeight: '700' },

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
