import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, TextInput, Pressable, StyleSheet,
  Modal, Platform, KeyboardAvoidingView, Alert,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInUp, FadeIn, SlideInRight, Layout,
  useSharedValue, useAnimatedStyle, withSpring, withRepeat,
  withTiming, withSequence,
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

function Avatar({ name, size = 36, isAdmin, stackOffset }) {
  const letter = (name || '?')[0]?.toUpperCase();
  return (
    <View style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2 },
      stackOffset ? { marginLeft: -12 } : null,
      isAdmin ? styles.avatarAdmin : styles.avatarMember,
    ]}>
      <Text style={{ color: isAdmin ? '#2A63E2' : '#FFFFFF', fontWeight: '800', fontSize: size * 0.4 }}>
        {letter}
      </Text>
    </View>
  );
}

export default function TeamScreen({ darkMode }) {
  const c = Colors.light;
  const insets = useSafeAreaInsets();
  const { orgId, userId, profile } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [team, setTeam] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [teamChat, setTeamChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState('member');
  const [tab, setTab] = useState('transactions');
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(null);
  const chatRef = useRef();

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { chatRef.current?.scrollToEnd({ animated: true }); }, [teamChat]);

  const fetchAll = async () => {
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        const [t, tx, ch] = await Promise.all([
          db.getTeam(orgId).catch(() => null),
          db.getTransactions?.(orgId).catch(() => null) || api.getTransactions({ orgId }),
          db.getTeamChat(orgId).catch(() => null),
        ]);
        if (t?.data) setTeam(t.data);
        const txList = Array.isArray(tx) ? tx : tx?.data || tx?.transactions || [];
        setTransactions(txList);
        if (ch?.data) setTeamChat(ch.data);
      } else {
        const [t, tx, ch] = await Promise.all([
          api.getTeam().catch(() => ({ team: null })),
          api.getTransactions({ orgId }).catch(() => ({ transactions: [] })),
          api.getTeamChat().catch(() => ({ messages: [] })),
        ]);
        if (t?.team) setTeam(t.team);
        setTransactions(Array.isArray(tx) ? tx : tx?.transactions || []);
        setTeamChat(ch?.messages || []);
      }
    } catch {
      try {
        const [t, tx, ch] = await Promise.all([
          api.getTeam().catch(() => ({ team: null })),
          api.getTransactions({ orgId }).catch(() => ({ transactions: [] })),
          api.getTeamChat().catch(() => ({ messages: [] })),
        ]);
        if (t?.team) setTeam(t.team);
        setTransactions(Array.isArray(tx) ? tx : tx?.transactions || []);
        setTeamChat(ch?.messages || []);
      } catch {}
    }
  };

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || sending) return;
    setSending(true);
    const text = chatInput;
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        await db.sendTeamChat({
          org_id: orgId, user_id: userId,
          user_name: profile?.name || 'Admin', message: text,
        });
        setChatInput('');
        const { data } = await db.getTeamChat(orgId);
        setTeamChat(data || []);
      } else {
        await api.sendTeamChat(text, team?.admin?.name || profile?.name || 'Admin');
        setChatInput('');
        const ch = await api.getTeamChat();
        setTeamChat(ch.messages || []);
      }
    } catch {
      try {
        await api.sendTeamChat(text, profile?.name || 'Admin');
        setChatInput('');
        const ch = await api.getTeamChat();
        setTeamChat(ch.messages || []);
      } catch {}
    } finally { setSending(false); }
  }, [chatInput, sending, isWeb, orgId, userId, profile, team]);

  const invite = async () => {
    if (!invName || !invEmail) return;
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        await db.inviteMember(orgId, { name: invName, email: invEmail, role: invRole });
      } else {
        await api.inviteMember({ name: invName, email: invEmail, role: invRole });
      }
      setShowInvite(false);
      setInvName(''); setInvEmail('');
      Alert.alert('Invite sent', `${invName} will receive an email shortly.`);
      fetchAll();
    } catch {
      Alert.alert('Error', 'Failed to send invite');
    }
  };

  const members = [
    { name: team?.admin?.name || profile?.name || 'Admin', isAdmin: true },
    ...(team?.members || []),
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar style="dark" />
      <View style={[styles.hero, { paddingTop: insets.top + 10 }]}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.heroInner}>
          {/* Company Logo */}
          <View style={styles.companySection}>
            <Pressable style={styles.logoWrap} onPress={() => Alert.alert('Upload Logo', 'Company logo upload coming soon.')}>
              <View style={styles.logoCircle}>
                {companyLogo ? (
                  <Image source={{ uri: companyLogo }} style={styles.logoImg} />
                ) : (
                  <Ionicons name="camera" size={28} color="rgba(255,255,255,0.6)" />
                )}
              </View>
              <View style={styles.logoEdit}>
                <Ionicons name="pencil" size={10} color="#FFFFFF" />
              </View>
            </Pressable>

            <Text style={styles.companyName}>{profile?.company || team?.company || 'My Company'}</Text>
            <Text style={styles.companySub}>{members.length} {members.length === 1 ? 'member' : 'members'}</Text>
          </View>

          {/* Avatar Group */}
          <View style={styles.avatarGroupRow}>
            <View style={styles.avatarGroup}>
              {(showAllMembers ? members : members.slice(0, 5)).map((m, i) => (
                <Animated.View
                  key={`${m.name}-${i}`}
                  entering={FadeInUp.delay(80 + i * 50).duration(350)}
                  style={[
                    styles.groupAvatarWrap,
                    i > 0 && { marginLeft: -14 },
                    { zIndex: members.length - i },
                  ]}
                >
                  <View style={[styles.groupAvatar, m.isAdmin && styles.groupAvatarAdmin]}>
                    <Text style={styles.groupAvatarText}>{(m.name || '?')[0].toUpperCase()}</Text>
                  </View>
                </Animated.View>
              ))}

              {!showAllMembers && members.length > 5 && (
                <View style={[styles.groupAvatarWrap, { marginLeft: -14, zIndex: 0 }]}>
                  <View style={[styles.groupAvatar, styles.groupAvatarMore]}>
                    <Text style={[styles.groupAvatarText, { color: '#0F172A' }]}>+{members.length - 5}</Text>
                  </View>
                </View>
              )}
            </View>

            {members.length > 5 && (
              <Pressable
                onPress={() => setShowAllMembers(p => !p)}
                style={styles.expandBtn}
              >
                <Ionicons
                  name={showAllMembers ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#FFFFFF"
                />
              </Pressable>
            )}
          </View>

          <View style={styles.pillRow}>
            {[['transactions', 'Transactions'], ['chat', 'Chat']].map(([v, l]) => (
              <SpringPressable
                key={v}
                onPress={() => setTab(v)}
                style={[styles.pill, tab === v ? styles.pillActive : styles.pillIdle]}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === v }}
              >
                <Text style={[styles.pillText, { color: tab === v ? '#FFFFFF' : '#0F172A' }]}>{l}</Text>
              </SpringPressable>
            ))}
          </View>
        </Animated.View>
      </View>

      <View style={[styles.sheet, { backgroundColor: c.bg }]}>
        <View style={styles.handle} />

        {tab === 'transactions' ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
            showsVerticalScrollIndicator={false}
          >
            {transactions.length === 0 && (
              <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name="receipt" size={32} color={c.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: c.text }]}>No transactions yet</Text>
                <Text style={[styles.emptySub, { color: c.textMuted }]}>
                  Transactions from your team will appear here.
                </Text>
              </Animated.View>
            )}

            {transactions.map((tx, i) => (
              <Animated.View
                key={tx.id || i}
                entering={FadeInUp.delay(Math.min(i * 40, 240)).duration(350)}
                layout={Layout.springify()}
                style={[styles.txCard, { backgroundColor: c.card, borderColor: c.border }]}
              >
                <View style={styles.txHead}>
                  <View style={[styles.txIcon, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name="receipt" size={16} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.txMerchant, { color: c.text }]} numberOfLines={1}>
                      {tx.merchant || tx.counterparty || 'Transaction'}
                    </Text>
                    <Text style={[styles.txMeta, { color: c.textMuted }]}>
                      {tx.date || tx.created_at || '—'} · {tx.submittedByName || 'Team'}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: tx.direction === 'in' ? '#16A34A' : c.text }]}>
                    {tx.direction === 'in' ? '+' : '-'}AED {tx.amount?.toLocaleString?.() || tx.amount || '0'}
                  </Text>
                </View>
                {tx.category && (
                  <View style={styles.txTag}>
                    <Text style={[styles.txTagText, { color: c.primary }]} numberOfLines={1}>
                      {tx.category}
                    </Text>
                  </View>
                )}
              </Animated.View>
            ))}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={chatRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })}
            >
              {teamChat.length === 0 && (
                <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
                  <View style={[styles.emptyIcon, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name="chatbubbles" size={30} color={c.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: c.text }]}>Start the conversation</Text>
                  <Text style={[styles.emptySub, { color: c.textMuted }]}>
                    Messages are synced across your team in real-time.
                  </Text>
                </Animated.View>
              )}
              {teamChat.map((m, i) => {
                const mine = m.user_id === userId || m.user_name === profile?.name;
                return (
                  <Animated.View
                    key={m.id || i}
                    entering={FadeInUp.delay(Math.min(i * 30, 200)).duration(300)}
                    layout={Layout.springify()}
                    style={[styles.chatRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}
                  >
                    {!mine && <Avatar name={m.user_name || m.user || '?'} size={28} />}
                    <View
                      style={[
                        styles.chatBubble,
                        {
                          backgroundColor: mine ? c.primary : c.card,
                          borderColor: mine ? 'transparent' : c.borderSubtle,
                          borderBottomRightRadius: mine ? 6 : 18,
                          borderBottomLeftRadius: mine ? 18 : 6,
                        },
                      ]}
                    >
                      {!mine && (
                        <Text style={[styles.chatName, { color: c.primary }]}>{m.user_name || m.user || 'User'}</Text>
                      )}
                      <Text style={{ color: mine ? '#FFFFFF' : c.text, fontSize: 14, lineHeight: 20 }}>
                        {m.message || m.content}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })}
            </ScrollView>

            <View style={[styles.inputBar, {
              backgroundColor: c.card, borderColor: c.borderSubtle,
              marginBottom: Platform.OS === 'ios' ? 102 : 92, marginHorizontal: 16,
            }]}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Message the team…"
                placeholderTextColor={c.textMuted}
                style={[styles.input, { color: c.text }]}
                multiline
                maxLength={1500}
              />
              <SpringPressable
                onPress={sendChat}
                disabled={!chatInput.trim() || sending}
                style={[styles.sendBtn, { backgroundColor: chatInput.trim() && !sending ? c.primary : c.borderSubtle }]}
                accessibilityLabel="Send"
              >
                <Ionicons name="arrow-up" size={18} color={chatInput.trim() && !sending ? '#FFFFFF' : c.textMuted} />
              </SpringPressable>
            </View>
          </View>
        )}
      </View>

      <Modal visible={showInvite} animationType="slide" transparent onRequestClose={() => setShowInvite(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowInvite(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: c.bg }]} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { color: c.text }]}>Invite member</Text>
            <Text style={[styles.modalSub, { color: c.textMuted }]}>They'll receive an email link.</Text>

            <TextInput
              value={invName}
              onChangeText={setInvName}
              placeholder="Full name"
              placeholderTextColor={c.textMuted}
              style={[styles.field, { backgroundColor: c.card, borderColor: c.borderSubtle, color: c.text }]}
            />
            <TextInput
              value={invEmail}
              onChangeText={setInvEmail}
              placeholder="Email"
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.field, { backgroundColor: c.card, borderColor: c.borderSubtle, color: c.text }]}
            />

            <View style={styles.roleRow}>
              {['member', 'admin'].map(r => (
                <SpringPressable
                  key={r}
                  onPress={() => setInvRole(r)}
                  style={[
                    styles.rolePill,
                    { backgroundColor: invRole === r ? c.primary : c.card, borderColor: invRole === r ? c.primary : c.borderSubtle },
                  ]}
                >
                  <Text style={{ color: invRole === r ? '#FFFFFF' : c.text, fontWeight: '700', fontSize: 13, textTransform: 'capitalize' }}>
                    {r}
                  </Text>
                </SpringPressable>
              ))}
            </View>

            <SpringPressable
              onPress={invite}
              style={[styles.sendInviteBtn, { backgroundColor: c.primary }]}
            >
              <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
              <Text style={styles.sendInviteText}>Send invite</Text>
            </SpringPressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#2A63E2',
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroInner: { gap: 18 },
  avatar: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#2A63E2',
  },
  avatarAdmin: { backgroundColor: '#FFFFFF' },
  avatarMember: { backgroundColor: 'rgba(255,255,255,0.2)' },
  companySection: { alignItems: 'center', gap: 10, marginBottom: 8 },
  logoWrap: { position: 'relative' },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  logoImg: { width: 72, height: 72, borderRadius: 36 },
  logoEdit: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#2A63E2',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  companyName: {
    color: '#FFFFFF', fontSize: 22, fontWeight: '800',
    letterSpacing: -0.4, marginTop: 4,
  },
  companySub: {
    color: 'rgba(255,255,255,0.75)', fontSize: 13,
  },
  avatarGroupRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 12,
    marginVertical: 12,
  },
  avatarGroup: { flexDirection: 'row', alignItems: 'center' },
  groupAvatarWrap: {},
  groupAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  groupAvatarAdmin: { backgroundColor: '#FFFFFF' },
  groupAvatarMore: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  groupAvatarText: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '800',
  },
  expandBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#2A63E2',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2A63E2', shadowOpacity: 0.4,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  pillActive: { backgroundColor: '#2A63E2', borderColor: '#2A63E2' },
  pillIdle: { backgroundColor: 'rgba(11,23,53,0.06)', borderColor: 'rgba(11,23,53,0.12)' },
  pillText: { fontSize: 13, fontWeight: '700' },
  sheet: {
    flex: 1, marginTop: -24,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 8,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(11,23,53,0.15)',
    alignSelf: 'center', marginTop: 6, marginBottom: 10,
  },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySub: { fontSize: 13.5, textAlign: 'center', marginTop: 6 },
  txCard: {
    padding: 14, borderRadius: 16, borderWidth: 1,
    marginBottom: 10,
  },
  txHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  txMerchant: { fontSize: 15, fontWeight: '700', flex: 1 },
  txMeta: { fontSize: 11.5, fontWeight: '500', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  txTag: {
    alignSelf: 'flex-start',
    marginTop: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, backgroundColor: 'rgba(42,99,226,0.08)',
  },
  txTagText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineCol: { alignItems: 'center', width: 14 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 14 },
  timelineLine: { width: 2, flex: 1, marginTop: 4 },
  eventCard: {
    flex: 1, padding: 12, borderRadius: 16, borderWidth: 1,
    marginBottom: 10,
  },
  eventHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  eventUser: { flex: 1, fontSize: 13, fontWeight: '700' },
  eventTime: { fontSize: 11, fontWeight: '600' },
  eventText: { fontSize: 13, lineHeight: 18 },
  chatRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 },
  chatBubble: {
    maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderWidth: 1,
  },
  chatName: { fontSize: 11, fontWeight: '700', marginBottom: 3, letterSpacing: 0.3 },
  inputBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    padding: 24, paddingBottom: 40,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  modalTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginTop: 10 },
  modalSub: { fontSize: 13.5, marginTop: 4, marginBottom: 20 },
  field: {
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14.5,
    marginBottom: 12,
  },
  roleRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 20 },
  rolePill: {
    flex: 1, alignItems: 'center',
    paddingVertical: 12, borderRadius: 14, borderWidth: 1,
  },
  sendInviteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 26,
  },
  sendInviteText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
