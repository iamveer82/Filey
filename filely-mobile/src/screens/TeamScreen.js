import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import api from '../api/client';

export default function TeamScreen({ darkMode }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const [team, setTeam] = useState(null);
  const [activity, setActivity] = useState([]);
  const [teamChat, setTeamChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState('member');
  const chatRef = useRef();

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { chatRef.current?.scrollToEnd({ animated: true }); }, [teamChat]);

  const fetchAll = async () => {
    try { const t = await api.getTeam(); setTeam(t.team); } catch(e) {}
    try { const a = await api.getTeamActivity(); setActivity(a.activity || []); } catch(e) {}
    try { const c = await api.getTeamChat(); setTeamChat(c.messages || []); } catch(e) {}
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    try {
      await api.sendTeamChat(chatInput, team?.admin?.name || 'Admin');
      setChatInput('');
      const c = await api.getTeamChat(); setTeamChat(c.messages || []);
    } catch(e) {}
  };

  const invite = async () => {
    if (!invName || !invEmail) return;
    try {
      await api.inviteMember({ name: invName, email: invEmail, role: invRole });
      setShowInvite(false); setInvName(''); setInvEmail('');
      fetchAll();
    } catch(e) {}
  };

  const members = [{ name: team?.admin?.name || 'Admin', isAdmin: true }, ...(team?.members || [])];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Member Avatars */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}>
          {members.map((m, i) => (
            <View key={i} style={styles.memberItem}>
              <View style={[styles.avatar, m.isAdmin ? { borderColor: c.lime, borderWidth: 2 } : { borderColor: c.border, borderWidth: 1 }]}>
                <Text style={[styles.avatarText, { color: m.isAdmin ? c.limeDark : c.text }]}>{m.name?.[0] || '?'}</Text>
              </View>
              <Text style={[styles.memberName, { color: m.isAdmin ? c.text : c.textSecondary }]}>{m.isAdmin ? 'You' : m.name}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.memberItem} onPress={() => setShowInvite(true)}>
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
          {activity.length === 0 && <Text style={[styles.emptyText, { color: c.textSecondary }]}>No activity yet</Text>}
          {activity.slice(0, 5).map((a, i) => (
            <View key={i} style={[styles.activityCard, {
              backgroundColor: i === 0 ? c.card : c.surfaceLow,
              borderColor: i === 0 ? c.lime : c.border,
            }]}>
              <View style={[styles.activityIcon, { backgroundColor: i === 0 ? c.limeLight : c.surfaceLow }]}>
                <Ionicons name={a.type === 'transaction' ? 'receipt-outline' : a.type === 'edit' ? 'create-outline' : 'person-add-outline'} size={18} color={i === 0 ? c.limeDark : c.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.activityText, { color: c.text }]} numberOfLines={2}>{a.description?.substring(0, 50)}</Text>
                <Text style={[styles.activityMeta, { color: c.textMuted }]}>{a.category || a.type}</Text>
              </View>
              <Text style={[styles.activityTime, { color: c.textMuted }]}>{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          ))}
        </View>

        {/* Team Chat */}
        <View style={[styles.sectionDivider, { marginTop: 24 }]}>
          <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          <Text style={[styles.dividerText, { color: c.textMuted }]}>SECURE CHANNEL</Text>
          <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
        </View>

        <View style={[styles.chatContainer, { backgroundColor: c.surfaceLow }]}>
          <ScrollView ref={chatRef} style={{ maxHeight: 250 }} contentContainerStyle={{ padding: 12, gap: 12 }}>
            {teamChat.length === 0 && <Text style={[styles.emptyText, { color: c.textSecondary }]}>Start a team conversation!</Text>}
            {teamChat.map((m, i) => {
              const isMe = m.userId === 'admin';
              return (
                <View key={i} style={[styles.chatMsg, isMe && { alignSelf: 'flex-end', flexDirection: 'row-reverse' }]}>
                  <View style={[styles.chatAvatar, { backgroundColor: isMe ? c.lime : c.dark }]}>
                    <Text style={[styles.chatAvatarText, { color: isMe ? '#00531f' : darkMode ? '#000' : '#fff' }]}>{m.userName?.[0]}</Text>
                  </View>
                  <View>
                    <Text style={[styles.chatSender, { color: c.textMuted }]}>{m.userName}</Text>
                    <View style={[styles.chatBubble, { backgroundColor: isMe ? c.dark : c.card, borderColor: isMe ? 'transparent' : c.border }]}>
                      <Text style={[styles.chatText, { color: isMe ? (darkMode ? '#000' : '#fff') : c.text }]}>{m.message}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Chat Input */}
      <View style={[styles.chatInputBar, { backgroundColor: c.card, borderColor: c.border }]}>
        <TextInput
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="Type a message..."
          placeholderTextColor={c.textMuted}
          style={[styles.chatTextInput, { color: c.text }]}
          onSubmitEditing={sendChat}
        />
        <TouchableOpacity onPress={sendChat} style={styles.chatSendBtn}>
          <Ionicons name="send" size={18} color="#00531f" />
        </TouchableOpacity>
      </View>

      {/* Invite Modal */}
      <Modal visible={showInvite} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.card }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Invite Team Member</Text>
            <TextInput value={invName} onChangeText={setInvName} placeholder="Name" placeholderTextColor={c.textMuted} style={[styles.modalInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]} />
            <TextInput value={invEmail} onChangeText={setInvEmail} placeholder="Email" placeholderTextColor={c.textMuted} style={[styles.modalInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]} keyboardType="email-address" />
            <TouchableOpacity onPress={invite} style={styles.inviteBtn}>
              <Text style={styles.inviteBtnText}>Send Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowInvite(false)}>
              <Text style={[styles.cancelText, { color: c.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  memberItem: { alignItems: 'center', gap: 6 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(68,229,113,0.1)' },
  avatarText: { fontWeight: '700', fontSize: 18 },
  memberName: { fontSize: 10, fontWeight: '600' },
  sectionDivider: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginVertical: 16, gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 10, fontWeight: '800', letterSpacing: 3 },
  emptyText: { textAlign: 'center', padding: 24, fontSize: 13 },
  activityCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  activityIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityText: { fontWeight: '700', fontSize: 13 },
  activityMeta: { fontSize: 11, marginTop: 2 },
  activityTime: { fontSize: 9, letterSpacing: 1 },
  chatContainer: { marginHorizontal: 16, borderRadius: 16, minHeight: 120 },
  chatMsg: { flexDirection: 'row', gap: 8, maxWidth: '85%' },
  chatAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { fontSize: 10, fontWeight: '700' },
  chatSender: { fontSize: 9, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  chatBubble: { padding: 10, borderRadius: 14, borderWidth: 1 },
  chatText: { fontSize: 13, lineHeight: 18 },
  chatInputBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 90, borderRadius: 16, borderWidth: 1, padding: 6, gap: 8 },
  chatTextInput: { flex: 1, fontSize: 14, fontWeight: '500', paddingHorizontal: 12, paddingVertical: 10 },
  chatSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#44e571', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', borderRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  modalInput: { borderRadius: 14, padding: 14, borderWidth: 1, fontSize: 14 },
  inviteBtn: { backgroundColor: '#44e571', borderRadius: 24, paddingVertical: 16, alignItems: 'center' },
  inviteBtnText: { color: '#00531f', fontWeight: '800', fontSize: 16 },
  cancelText: { textAlign: 'center', fontWeight: '600', paddingVertical: 8 },
});
