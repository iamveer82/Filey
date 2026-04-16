import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Spring Pressable ────────────────────────────────────────
// Reusable component: scales down on press with spring physics
function SpringPressable({ onPress, style, children, disabled, accessibilityRole, accessibilityLabel, accessibilityState }) {
  const pressed = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, []);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animStyle, style]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
    >
      {children}
    </AnimatedPressable>
  );
}

// ─── Admin Glow Ring ─────────────────────────────────────────
// Animated pulsing lime glow ring around the admin avatar
function AdminGlowRing({ size }) {
  const glowOpacity = useSharedValue(0.25);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    width: size + 10,
    height: size + 10,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: `rgba(68,229,113,${glowOpacity.value})`,
  }));

  return <Animated.View style={glowStyle} />;
}

// ─── Member Avatar ───────────────────────────────────────────
function MemberAvatar({ member, index, colors }) {
  return (
    <Animated.View
      entering={FadeIn.delay(index * 100).duration(400).springify().damping(14).stiffness(120)}
      style={styles.memberItem}
    >
      <View style={styles.avatarWrapper}>
        {member.isAdmin && <AdminGlowRing size={56} />}
        <View
          style={[
            styles.avatar,
            member.isAdmin
              ? { borderColor: '#44e571', borderWidth: 2, backgroundColor: 'rgba(68,229,113,0.10)' }
              : { borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surfaceLow },
          ]}
        >
          <Text style={[styles.avatarText, { color: member.isAdmin ? '#44e571' : colors.text }]}>
            {member.name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
      </View>
      <Text style={[styles.memberName, { color: member.isAdmin ? colors.text : colors.textSecondary }]}>
        {member.isAdmin ? 'You' : member.name}
      </Text>
      {member.isAdmin && (
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Invite Avatar Button ────────────────────────────────────
function InviteAvatar({ onPress, colors }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.88, { damping: 14, stiffness: 280 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 180 });
  }, []);

  return (
    <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.memberItem}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animStyle}
        accessibilityRole="button"
        accessibilityLabel="Invite team member"
      >
        <View style={[styles.avatar, styles.inviteAvatar, { borderColor: colors.textMuted }]}>
          <Ionicons name="add" size={22} color={colors.textMuted} />
        </View>
      </AnimatedPressable>
      <Text style={[styles.memberName, { color: colors.textSecondary }]}>Invite</Text>
    </Animated.View>
  );
}

// ─── Activity Card ───────────────────────────────────────────
function ActivityCard({ item, index, isLatest, colors, darkMode }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400).springify().damping(16)}>
      <SpringPressable
        style={[
          styles.activityCard,
          isLatest
            ? {
                ...(darkMode ? CardPresets.cardDark : CardPresets.cardLight),
                borderColor: '#44e571',
                borderWidth: 1.5,
              }
            : {
                backgroundColor: colors.surfaceLow,
                borderColor: colors.border,
                borderWidth: 1,
              },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Activity: ${item.description?.substring(0, 40)}`}
      >
        {isLatest && <View style={styles.latestIndicator} />}
        <View
          style={[
            styles.activityIcon,
            {
              backgroundColor: isLatest ? 'rgba(68,229,113,0.12)' : colors.surfaceLow,
              borderWidth: 1,
              borderColor: isLatest ? 'rgba(68,229,113,0.25)' : colors.border,
            },
          ]}
        >
          <Ionicons
            name={
              item.type === 'transaction'
                ? 'receipt-outline'
                : item.type === 'edit'
                ? 'create-outline'
                : 'person-add-outline'
            }
            size={18}
            color={isLatest ? '#44e571' : colors.textSecondary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.activityText, { color: colors.text }]} numberOfLines={2}>
            {item.description?.substring(0, 60)}
          </Text>
          <Text style={[styles.activityMeta, { color: colors.textMuted }]}>
            {item.category || item.type}
          </Text>
        </View>
        <Text style={[styles.activityTime, { color: isLatest ? '#44e571' : colors.textMuted }]}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </SpringPressable>
    </Animated.View>
  );
}

// ─── Chat Bubble ─────────────────────────────────────────────
function ChatBubble({ message, index, isMe, colors, darkMode }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60).duration(350).springify().damping(18)}
      style={[styles.chatMsg, isMe && { alignSelf: 'flex-end', flexDirection: 'row-reverse' }]}
    >
      <View
        style={[
          styles.chatAvatar,
          {
            backgroundColor: isMe ? 'rgba(68,229,113,0.15)' : colors.surfaceLow,
            borderWidth: 1,
            borderColor: isMe ? 'rgba(68,229,113,0.3)' : colors.border,
          },
        ]}
      >
        <Text style={[styles.chatAvatarText, { color: isMe ? '#44e571' : colors.text }]}>
          {message.userName?.[0]?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={{ maxWidth: '75%' }}>
        <Text
          style={[
            styles.chatSender,
            { color: colors.textMuted, textAlign: isMe ? 'right' : 'left' },
          ]}
        >
          {message.userName}
        </Text>
        <View
          style={[
            styles.chatBubble,
            isMe
              ? {
                  backgroundColor: 'rgba(68,229,113,0.10)',
                  borderColor: 'rgba(68,229,113,0.22)',
                  borderWidth: 1,
                  borderTopRightRadius: 4,
                }
              : {
                  ...(darkMode ? CardPresets.cardDark : CardPresets.cardLight),
                  borderTopLeftRadius: 4,
                },
          ]}
        >
          <Text style={[styles.chatText, { color: colors.text }]}>{message.message}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Section Divider ─────────────────────────────────────────
function SectionDivider({ label, colors, style }) {
  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={[styles.sectionDivider, style]}
    >
      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.dividerText, { color: colors.textMuted }]}>{label}</Text>
      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
    </Animated.View>
  );
}

// ─── Invite Modal ────────────────────────────────────────────
function InviteModal({ visible, onClose, onInvite, colors, darkMode, invName, setInvName, invEmail, setInvEmail, invRole, setInvRole }) {
  const overlayOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.85);
  const modalOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
      modalScale.value = withSpring(1, { damping: 16, stiffness: 200, mass: 0.8 });
      modalOpacity.value = withTiming(1, { duration: 200 });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      modalScale.value = withTiming(0.85, { duration: 200 });
      modalOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalOpacity.value,
  }));

  const roles = ['member', 'editor', 'admin'];

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.modalOverlay, overlayStyle]}>
        <Animated.View
          style={[
            styles.modalContent,
            darkMode ? CardPresets.cardElevatedDark : CardPresets.cardLight,
            modalStyle,
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.modalIconCircle, { backgroundColor: 'rgba(68,229,113,0.12)' }]}>
                <Ionicons name="person-add" size={20} color="#44e571" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Invite Member</Text>
            </View>
            <SpringPressable
              onPress={onClose}
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceLow }]}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </SpringPressable>
          </View>

          {/* Inputs */}
          <View style={styles.modalInputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>FULL NAME</Text>
            <TextInput
              value={invName}
              onChangeText={setInvName}
              placeholder="John Doe"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceLow,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              autoCapitalize="words"
              accessibilityLabel="Invite name"
            />
          </View>

          <View style={styles.modalInputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>EMAIL ADDRESS</Text>
            <TextInput
              value={invEmail}
              onChangeText={setInvEmail}
              placeholder="john@company.ae"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceLow,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Invite email"
            />
          </View>

          {/* Role Selector */}
          <View style={styles.modalInputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>ROLE</Text>
            <View style={styles.roleRow}>
              {roles.map((r) => (
                <SpringPressable
                  key={r}
                  onPress={() => setInvRole(r)}
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor:
                        invRole === r ? 'rgba(68,229,113,0.15)' : colors.surfaceLow,
                      borderColor:
                        invRole === r ? 'rgba(68,229,113,0.4)' : colors.border,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select role ${r}`}
                  accessibilityState={{ selected: invRole === r }}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      { color: invRole === r ? '#44e571' : colors.textSecondary },
                    ]}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </SpringPressable>
              ))}
            </View>
          </View>

          {/* Actions */}
          <SpringPressable
            onPress={onInvite}
            style={[styles.inviteBtn, Shadow.limeSm]}
            accessibilityRole="button"
            accessibilityLabel="Send invite"
          >
            <Ionicons name="paper-plane-outline" size={16} color="#003516" style={{ marginRight: 8 }} />
            <Text style={styles.inviteBtnText}>Send Invite</Text>
          </SpringPressable>

          <SpringPressable
            onPress={onClose}
            style={styles.cancelBtn}
            accessibilityRole="button"
            accessibilityLabel="Cancel invite"
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </SpringPressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Send Button ─────────────────────────────────────────────
function SendButton({ onPress, disabled, colors }) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.85, { damping: 12, stiffness: 300 });
    rotation.value = withSpring(-15, { damping: 12, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    rotation.value = withSpring(0, { damping: 10, stiffness: 200 });
  }, []);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      disabled={disabled}
      style={[
        animStyle,
        styles.chatSendBtn,
        {
          backgroundColor: disabled ? colors.border : '#44e571',
        },
        !disabled && Shadow.limeSm,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Send team message"
      accessibilityState={{ disabled }}
    >
      <Ionicons name="send" size={18} color={disabled ? colors.textMuted : '#003516'} />
    </AnimatedPressable>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── MAIN TEAM SCREEN ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export default function TeamScreen({ darkMode }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const { orgId, userId, profile } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [team, setTeam] = useState(null);
  const [activity, setActivity] = useState([]);
  const [teamChat, setTeamChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState('member');
  const chatRef = useRef();

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    chatRef.current?.scrollToEnd({ animated: true });
  }, [teamChat]);

  // ─── Data Fetching (unchanged business logic) ──────────────
  const fetchAll = async () => {
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        const [teamRes, activityRes, chatRes] = await Promise.all([
          db.getTeam(orgId).catch(() => null),
          db.getTeamActivity(orgId).catch(() => null),
          db.getTeamChat(orgId).catch(() => null),
        ]);
        if (teamRes?.data) setTeam(teamRes.data);
        if (activityRes?.data) setActivity(activityRes.data);
        if (chatRes?.data) setTeamChat(chatRes.data);
      } else {
        const t = await api.getTeam();
        setTeam(t.team);
        const a = await api.getTeamActivity();
        setActivity(a.activity || []);
        const ch = await api.getTeamChat();
        setTeamChat(ch.messages || []);
      }
    } catch (e) {
      try {
        const t = await api.getTeam();
        setTeam(t.team);
        const a = await api.getTeamActivity();
        setActivity(a.activity || []);
        const ch = await api.getTeamChat();
        setTeamChat(ch.messages || []);
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
          org_id: orgId,
          user_id: userId,
          user_name: profile?.name || 'Admin',
          message: chatInput,
        });
        setChatInput('');
        const { data } = await db.getTeamChat(orgId);
        setTeamChat(data || []);
      } else {
        await api.sendTeamChat(chatInput, team?.admin?.name || 'Admin');
        setChatInput('');
        const ch = await api.getTeamChat();
        setTeamChat(ch.messages || []);
      }
    } catch (e) {
      try {
        await api.sendTeamChat(chatInput, team?.admin?.name || 'Admin');
        setChatInput('');
        const ch = await api.getTeamChat();
        setTeamChat(ch.messages || []);
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
      setShowInvite(false);
      setInvName('');
      setInvEmail('');
      fetchAll();
    } catch (e) {}
  };

  const members = [
    { name: team?.admin?.name || 'Admin', isAdmin: true },
    ...(team?.members || []),
  ];

  const isSendDisabled = sending || !chatInput.trim();

  // ─── Render ────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Team Header ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: c.text }]}>Your Team</Text>
            <Text style={[styles.headerSub, { color: c.textSecondary }]}>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </Text>
          </View>
          <View style={[styles.onlineBadge, { backgroundColor: 'rgba(68,229,113,0.12)' }]}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </Animated.View>

        {/* ─── Member Avatars ──────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingVertical: Spacing.lg }}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.xl }}
          accessibilityLabel="Team members"
        >
          {members.map((m, i) => (
            <MemberAvatar key={i} member={m} index={i} colors={c} />
          ))}
          <InviteAvatar onPress={() => setShowInvite(true)} colors={c} />
        </ScrollView>

        {/* ─── Activity Stream ─────────────────────────────── */}
        <SectionDivider label="ACTIVITY STREAM" colors={c} />

        <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm }}>
          {activity.length === 0 && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: c.surfaceLow }]}>
                <Ionicons name="pulse-outline" size={28} color={c.textMuted} />
              </View>
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                No activity yet
              </Text>
              <Text style={[styles.emptySubtext, { color: c.textMuted }]}>
                Team actions will appear here
              </Text>
            </Animated.View>
          )}
          {activity.slice(0, 5).map((a, i) => (
            <ActivityCard
              key={i}
              item={a}
              index={i}
              isLatest={i === 0}
              colors={c}
              darkMode={darkMode}
            />
          ))}
        </View>

        {/* ─── Team Chat ───────────────────────────────────── */}
        <SectionDivider label="SECURE CHANNEL" colors={c} style={{ marginTop: Spacing.xxl }} />

        <Animated.View
          entering={FadeInDown.delay(200).duration(450)}
          style={[
            styles.chatContainer,
            {
              backgroundColor: c.surfaceLow,
              borderColor: c.border,
              borderWidth: 1,
            },
          ]}
        >
          {/* Chat Header Bar */}
          <View style={[styles.chatHeaderBar, { borderBottomColor: c.border }]}>
            <Ionicons name="lock-closed" size={12} color={c.textMuted} />
            <Text style={[styles.chatHeaderText, { color: c.textMuted }]}>
              End-to-end encrypted
            </Text>
          </View>

          <ScrollView
            ref={chatRef}
            style={{ maxHeight: 280 }}
            contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}
            showsVerticalScrollIndicator={false}
          >
            {teamChat.length === 0 && (
              <Animated.View entering={FadeIn.duration(400)} style={styles.emptyChatContainer}>
                <View style={[styles.emptyChatIcon, { backgroundColor: 'rgba(68,229,113,0.08)' }]}>
                  <Ionicons name="chatbubbles-outline" size={32} color={c.textMuted} />
                </View>
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                  Start a team conversation!
                </Text>
              </Animated.View>
            )}
            {teamChat.map((m, i) => {
              const isMe = m.userId === userId || m.user_id === userId;
              return (
                <ChatBubble
                  key={i}
                  message={m}
                  index={i}
                  isMe={isMe}
                  colors={c}
                  darkMode={darkMode}
                />
              );
            })}
          </ScrollView>
        </Animated.View>
      </ScrollView>

      {/* ─── Chat Input Bar ──────────────────────────────── */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(300)}
        style={[styles.chatInputBar, { borderTopColor: c.border, backgroundColor: c.bg }]}
      >
        <View
          style={[
            styles.chatInputWrapper,
            {
              backgroundColor: c.surfaceLow,
              borderColor: c.border,
            },
          ]}
        >
          <TextInput
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Type a message..."
            placeholderTextColor={c.textMuted}
            style={[styles.chatTextInput, { color: c.text }]}
            onSubmitEditing={sendChat}
            returnKeyType="send"
            accessibilityLabel="Team chat message"
            multiline
          />
          <SendButton onPress={sendChat} disabled={isSendDisabled} colors={c} />
        </View>
      </Animated.View>

      {/* ─── Invite Modal ────────────────────────────────── */}
      <InviteModal
        visible={showInvite}
        onClose={() => setShowInvite(false)}
        onInvite={invite}
        colors={c}
        darkMode={darkMode}
        invName={invName}
        setInvName={setInvName}
        invEmail={invEmail}
        setInvEmail={setInvEmail}
        invRole={invRole}
        setInvRole={setInvRole}
      />
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── STYLES ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  headerTitle: {
    ...Typography.sectionTitle,
    fontSize: 22,
  },
  headerSub: {
    ...Typography.caption,
    marginTop: 2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    gap: 6,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#44e571',
  },
  onlineText: {
    ...Typography.micro,
    color: '#44e571',
  },

  // Members
  memberItem: {
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 64,
  },
  avatarWrapper: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.bodyBold,
    fontSize: 20,
  },
  memberName: {
    ...Typography.micro,
    fontWeight: '600',
  },
  adminBadge: {
    backgroundColor: 'rgba(68,229,113,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(68,229,113,0.25)',
  },
  adminBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#44e571',
  },
  inviteAvatar: {
    borderStyle: 'dashed',
    borderWidth: 2,
  },

  // Section dividers
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    ...Typography.label,
  },

  // Empty states
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    ...Typography.body,
  },
  emptySubtext: {
    textAlign: 'center',
    ...Typography.caption,
  },
  emptyChatContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyChatIcon: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Activity
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.md,
    overflow: 'hidden',
  },
  latestIndicator: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
    backgroundColor: '#44e571',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    ...Typography.bodyBold,
  },
  activityMeta: {
    ...Typography.micro,
    marginTop: 2,
  },
  activityTime: {
    ...Typography.micro,
    letterSpacing: 1,
  },

  // Chat
  chatContainer: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    minHeight: 140,
    overflow: 'hidden',
  },
  chatHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chatHeaderText: {
    ...Typography.micro,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  chatMsg: {
    flexDirection: 'row',
    gap: Spacing.sm,
    maxWidth: '85%',
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarText: {
    ...Typography.micro,
    fontWeight: '700',
  },
  chatSender: {
    ...Typography.micro,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  chatBubble: {
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  chatText: {
    ...Typography.caption,
    lineHeight: 20,
  },

  // Chat input
  chatInputBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 90,
    paddingTop: Spacing.sm,
    borderTopWidth: 0,
  },
  chatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  chatTextInput: {
    flex: 1,
    ...Typography.bodySmall,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    maxHeight: 100,
  },
  chatSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    gap: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  modalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...Typography.sectionTitle,
  },
  modalInputGroup: {
    gap: Spacing.xs + 2,
  },
  inputLabel: {
    ...Typography.label,
    fontSize: 10,
    marginLeft: 4,
  },
  modalInput: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    ...Typography.body,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleChip: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  roleChipText: {
    ...Typography.captionBold,
    letterSpacing: 0.3,
  },
  inviteBtn: {
    backgroundColor: '#44e571',
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(0,83,31,0.3)',
    minHeight: 52,
  },
  inviteBtnText: {
    color: '#003516',
    ...Typography.btnPrimary,
  },
  cancelBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    textAlign: 'center',
    ...Typography.body,
    paddingVertical: Spacing.sm,
  },
});
