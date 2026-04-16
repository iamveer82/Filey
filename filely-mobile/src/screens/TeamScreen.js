import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function TeamScreen({ darkMode }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const { orgId, userId, profile } = useAuth();
  const isWeb = Platform.OS === 'web';
  const [team,        setTeam]        = useState(null);
  const [activity,    setActivity]    = useState([]);
  const [teamChat,    setTeamChat]    = useState([]);
  const [chatInput,   setChatInput]   = useState('');
  const [sending,     setSending]     = useState(false);
  const [showInvite,  setShowInvite]  = useState(false);
  const [invName,     setInvName]     = useState('');
  const [invEmail,    setInvEmail]    = useState('');
  const [invRole,     setInvRole]     = useState('member');
  const chatRef = useRef();

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { chatRef.current?.scrollToEnd({ animated: true }); }, [teamChat]);

  const fetchAll = async () => {
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        const [teamRes, activityRes, chatRes] = await Promise.all([
          db.getTeam(orgId).catch(() => null),
          db.getTeamActivity(orgId).catch(() => null),
          db.getTeamChat(orgId).catch(() => null),
        ]);
        if (teamRes?.data)     setTeam(teamRes.data);
        if (activityRes?.data) setActivity(activityRes.data);
        if (chatRes?.data)     setTeamChat(chatRes.data);
      } else {
        const t  = await api.getTeam();         setTeam(t.team);
        const a  = await api.getTeamActivity(); setActivity(a.activity || []);
        const ch = await api.getTeamChat();     setTeamChat(ch.messages || []);
      }
    } catch (e) {
      try {
        const t  = await api.getTeam();         setTeam(t.team);
        const a  = await api.getTeamActivity(); setActivity(a.activity || []);
        const ch = await api.getTeamChat();     setTeamChat(ch.messages || []);
      } catch (e2) {}
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || sending) return;
    setSending(true);
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        await db.sendTeamChat({
          org_id:    orgId,
          user_id:   userId,
          user_name: profile?.name || 'Admin',
          message:   chatInput,
        });
        setChatInput('');
        const { data } = await db.getTeamChat(orgId);
        setTeamChat(data || []);
      } else {
        await api.sendTeamChat(chatInput, team?.admin?.name || 'Admin');
        setChatInput('');
        const ch = await api.getTeamChat(); setTeamChat(ch.messages || []);
      }
    } catch (e) {
      try {
        await api.sendTeamChat(chatInput, team?.admin?.name || 'Admin');
        setChatInput('');
        const ch = await api.getTeamChat(); setTeamChat(ch.messages || []);
      } catch (e2) {}
    } finally {
      setSending(false);
    }
  };

  const invite = async () => {
    if (!invName || !invEmail) return;
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        await db.inviteMember(orgId, { name: invName, email: invEmail, role: invRole });
      } else {
        await api.inviteMember({ name: invName, email: invEmail, role: invRole });
      }
      setShowInvite(false); setInvName(''); setInvEmail('');
      fetchAll();
    } catch (e) {}
  };

  const members = [{ name: team?.admin?.name || 'Admin', isAdmin: true }, ...(team?.members || [])];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Member Avatars */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingVertical: 16 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
          accessibilityLabel="Team members"
        >
          {members.map((m, i) => (
            <View key={i} style={styles.memberItem}>
              <View style={[
                styles.avatar,
                m.isAdmin
                  ? { borderColor: '#44e571', borderWidth: 2, backgroundColor: 'rgba(68,229,113,0.10)' }
                  : { borderColor: c.border,  borderWidth: 1, backgroundColor: c.surfaceLow },
              ]}>
                <Text style={[styles.avatarText, { color: m.isAdmin ? '#44e571' : c.text }]}>
                  {m.name?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={[styles.memberName, { color: m.isAdmin ? c.text : c.textSecondary }]}>
                {m.isAdmin ? 'You' : m.name}
              </Text>
            </View>
          ))}
          <TouchableOpacity
            style={styles.memberItem}
            onPress={() => setShowInvite(true)}
            accessibilityRole="button"
            accessibilityLabel="Invite team member"
          >
            <View style={[styles.avatar, { borderStyle: 'dashed', borderWidth: 2, borderColor: c.border }]}>
              <Ionicons name="add" size={20} color={c.textMuted} />
            </View>
            <Text style={[styles.memberName, { color: c.textSecondary }]}>Invite</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Activity Stream */}
        <View style={styles.sectionDivider}>
          <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          <Text style={[styles.dividerText, { color: c.textMuted }]}>ACTIVITY STREAM</Text>
          <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
        </View>

        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {activity.length === 0 && (
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>No activity yet</Text>
          )}
          {activity.slice(0, 5).map((a, i) => (
            <View
              key={i}
              style={[
                styles.activityCard,
                i === 0
                  ? { ...(darkMode ? CardPresets.cardDark : CardPresets.cardLight), borderColor: '#44e571', borderWidth: 1 }
                  : { backgroundColor: c.surfaceLow, borderColor: c.border, borderWidth: 1 },
              ]}
            >
              <View style={[
                styles.activityIcon,
                { backgroundColor: i === 0 ? 'rgba(68,229,113,0.12)' : c.surfaceLow, borderWidth: 1, borderColor: c.border },
              ]}>
                <Ionicons
                  name={a.type === 'transaction' ? 'receipt-outline' : a.type === 'edit' ? 'create-outline' : 'person-add-outline'}
                  size={18}
                  color={i === 0 ? '#44e571' : c.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.activityText, { color: c.text }]} numberOfLines={2}>
                  {a.description?.substring(0, 60)}
                </Text>
                <Text style={[styles.activityMeta, { color: c.textMuted }]}>{a.category || a.type}</Text>
              </View>
              <Text style={[styles.activityTime, { color: c.textMuted }]}>
                {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
        </View>

        {/* Team Chat */}
        <View style={[styles.sectionDivider, { marginTop: 24 }]}>
          <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          <Text style={[styles.dividerText, { color: c.textMuted }]}>SECURE CHANNEL</Text>
          <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
        </View>

        <View style={[styles.chatContainer, { backgroundColor: c.surfaceLow, borderColor: c.border, borderWidth: 1 }]}>
          <ScrollView ref={chatRef} style={{ maxHeight: 250 }} contentContainerStyle={{ padding: 12, gap: 12 }}>
            {teamChat.length === 0 && (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>Start a team conversation!</Text>
            )}
            {teamChat.map((m, i) => {
              const isMe = m.userId === userId || m.user_id === userId;
              return (
                <View key={i} style={[styles.chatMsg, isMe && { alignSelf: 'flex-end', flexDirection: 'row-reverse' }]}>
                  <View style={[
                    styles.chatAvatar,
                    { backgroundColor: isMe ? 'rgba(68,229,113,0.15)' : c.surfaceLow, borderWidth: 1, borderColor: c.border },
                  ]}>
                    <Text style={[styles.chatAvatarText, { color: isMe ? '#44e571' : c.text }]}>
                      {m.userName?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.chatSender, { color: c.textMuted }]}>{m.userName}</Text>
                    <View style={[
                      styles.chatBubble,
                      isMe
                        ? { backgroundColor: 'rgba(68,229,113,0.12)', borderColor: 'rgba(68,229,113,0.2)', borderWidth: 1 }
                        : (darkMode ? CardPresets.cardDark : CardPresets.cardLight),
                    ]}>
                      <Text style={[styles.chatText, { color: c.text }]}>{m.message}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Chat Input */}
      <View style={[styles.chatInputBar, { borderTopColor: c.border, backgroundColor: c.bg }]}>
        <TextInput
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="Type a message..."
          placeholderTextColor={c.textMuted}
          style={[styles.chatTextInput, { color: c.text, backgroundColor: c.surfaceLow, borderColor: c.border }]}
          onSubmitEditing={sendChat}
          returnKeyType="send"
          accessibilityLabel="Team chat message"
        />
        <TouchableOpacity
          onPress={sendChat}
          disabled={sending || !chatInput.trim()}
          style={[
            styles.chatSendBtn,
            { backgroundColor: (sending || !chatInput.trim()) ? c.border : '#44e571' },
            !(sending || !chatInput.trim()) && Shadow.limeSm,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Send team message"
          accessibilityState={{ disabled: sending || !chatInput.trim() }}
        >
          <Ionicons name="send" size={18} color={(sending || !chatInput.trim()) ? c.textMuted : '#003516'} />
        </TouchableOpacity>
      </View>

      {/* Invite Modal */}
      <Modal visible={showInvite} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, darkMode ? CardPresets.cardDark : CardPresets.cardLight]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Invite Team Member</Text>
            <TextInput
              value={invName}
              onChangeText={setInvName}
              placeholder="Full name"
              placeholderTextColor={c.textMuted}
              style={[styles.modalInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]}
              autoCapitalize="words"
              accessibilityLabel="Invite name"
            />
            <TextInput
              value={invEmail}
              onChangeText={setInvEmail}
              placeholder="Email address"
              placeholderTextColor={c.textMuted}
              style={[styles.modalInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Invite email"
            />
            <TouchableOpacity
              onPress={invite}
              style={[styles.inviteBtn, Shadow.limeSm]}
              accessibilityRole="button"
              accessibilityLabel="Send invite"
            >
              <Text style={styles.inviteBtnText}>Send Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowInvite(false)}
              style={{ minHeight: 44, justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="Cancel invite"
            >
              <Text style={[styles.cancelText, { color: c.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  memberItem:    { alignItems: 'center', gap: Spacing.sm },
  avatar:        { width: 56, height: 56, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { ...Typography.bodyBold, fontSize: 20 },
  memberName:    { ...Typography.micro, fontWeight: '600' },
  sectionDivider:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, marginVertical: Spacing.lg, gap: Spacing.md },
  dividerLine:   { flex: 1, height: 1 },
  dividerText:   { ...Typography.label },
  emptyText:     { textAlign: 'center', padding: Spacing.xxxl, ...Typography.caption },
  activityCard:  { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, gap: Spacing.md },
  activityIcon:  { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  activityText:  { ...Typography.bodyBold },
  activityMeta:  { ...Typography.micro, marginTop: 2 },
  activityTime:  { ...Typography.micro, letterSpacing: 1 },
  chatContainer: { marginHorizontal: Spacing.lg, borderRadius: Radius.lg, minHeight: 120 },
  chatMsg:       { flexDirection: 'row', gap: Spacing.sm, maxWidth: '85%' },
  chatAvatar:    { width: 32, height: 32, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText:{ ...Typography.micro, fontWeight: '700' },
  chatSender:    { ...Typography.micro, marginBottom: Spacing.xs, letterSpacing: 0.5 },
  chatBubble:    { padding: Spacing.md, borderRadius: Radius.md },
  chatText:      { ...Typography.caption },
  chatInputBar:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.lg, marginBottom: 90, borderRadius: Radius.lg, borderTopWidth: 0, padding: Spacing.xs, gap: Spacing.sm },
  chatTextInput: { flex: 1, ...Typography.bodySmall, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: Radius.lg, borderWidth: 1 },
  chatSendBtn:   { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  modalContent:  { width: '100%', borderRadius: Radius.xl, padding: Spacing.xxl, gap: Spacing.lg },
  modalTitle:    { ...Typography.sectionTitle },
  modalInput:    { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, ...Typography.body },
  inviteBtn:     { backgroundColor: '#44e571', borderRadius: Radius.pill, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,83,31,0.3)' },
  inviteBtnText: { color: '#003516', ...Typography.btnPrimary },
  cancelText:    { textAlign: 'center', ...Typography.body, paddingVertical: Spacing.sm },
});
