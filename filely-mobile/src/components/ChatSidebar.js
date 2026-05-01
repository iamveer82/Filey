import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, ScrollView,
  Alert, TextInput, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listThreads, createThread, renameThread, deleteThread, setActiveThreadId } from '../services/threads';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = Math.min(SCREEN_W * 0.85, 320);
const DELETE_W = 80;

function SidebarItem({ icon, label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[si.row, active && si.rowActive]}>
      <Ionicons name={icon} size={20} color={active ? '#F9FAFB' : '#A1A1AA'} />
      <Text style={[si.label, active && si.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const si = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  rowActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  label: { color: '#A1A1AA', fontSize: 15, fontWeight: '500' },
  labelActive: { color: '#F9FAFB', fontWeight: '600' },
});

function SwipeableThreadRow({ t, active, isEdit, editing, onPick, onLongPress, onDelete, draft, setDraft, saveRename }) {
  const scrollRef = useRef(null);

  const confirmDelete = () => {
    Alert.alert('Delete chat', `Remove "${t.title}"?`, [
      { text: 'Cancel', style: 'cancel', onPress: () => scrollRef.current?.scrollTo({ x: 0, animated: true }) },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(t.id); } },
    ]);
  };

  return (
    <View style={sw.rowWrap}>
      <View style={sw.deleteBg}>
        <Pressable onPress={confirmDelete} style={sw.deleteBtn}>
          <Text style={sw.deleteText}>Delete</Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        snapToInterval={DELETE_W}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEnabled={!isEdit}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        <Pressable
          onPress={() => { scrollRef.current?.scrollTo({ x: 0, animated: true }); !isEdit && onPick(t.id); }}
          onLongPress={() => !isEdit && onLongPress(t)}
          delayLongPress={300}
          style={[sw.threadRow, active && sw.threadRowActive]}
        >
          <Ionicons name={active ? 'chatbubble' : 'chatbubble-outline'} size={14} color={active ? '#2A63E2' : '#71717A'} />
          {isEdit ? (
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onBlur={saveRename}
              onSubmitEditing={saveRename}
              autoFocus
              style={sw.threadInput}
            />
          ) : (
            <Text style={[sw.threadText, active && sw.threadTextActive]} numberOfLines={1}>{t.title}</Text>
          )}
          <Text style={sw.threadTime}>{fmtTime(t.updatedAt)}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const sw = StyleSheet.create({
  rowWrap: {
    position: 'relative',
    marginBottom: 2,
  },
  deleteBg: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0,
    width: DELETE_W,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  deleteBtn: {
    width: DELETE_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#111111',
    width: DRAWER_W - 32,
  },
  threadRowActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  threadText: { flex: 1, color: '#D4D4D8', fontSize: 14, fontWeight: '500' },
  threadTextActive: { color: '#F9FAFB', fontWeight: '600' },
  threadTime: { color: '#52525B', fontSize: 11, fontWeight: '500' },
  threadInput: {
    flex: 1, color: '#F9FAFB', fontSize: 14,
    backgroundColor: '#1F1F1F', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
});

export default function ChatSidebar({ visible, activeId, onClose, onPick, userProfile }) {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(-DRAWER_W);

  const refresh = async () => setRows(await listThreads());

  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
      refresh();
    } else {
      translateX.value = withTiming(-DRAWER_W, { duration: 320, easing: Easing.in(Easing.cubic) });
    }
  }, [visible]);

  const pick = async (id) => {
    await setActiveThreadId(id);
    onPick?.(id);
    onClose?.();
  };

  const create = async () => {
    const t = await createThread('New chat');
    onPick?.(t.id);
    onClose?.();
  };

  const handleDelete = useCallback(async (id) => {
    await deleteThread(id);
    refresh();
  }, []);

  const longPress = useCallback((t) => {
    Alert.alert(t.title, undefined, [
      { text: 'Rename', onPress: () => { setEditing(t.id); setDraft(t.title); } },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(t.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handleDelete]);

  const saveRename = async () => {
    if (editing && draft.trim()) {
      await renameThread(editing, draft.trim());
      setEditing(null);
      refresh();
    }
  };

  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  const name = userProfile?.name || userProfile?.email?.split('@@')[0] || 'User';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={s.root}>
        {/* Backdrop */}
        <Pressable style={s.backdrop} onPress={onClose} />

        {/* Drawer */}
        <Animated.View style={[s.drawer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }, anim]}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.brand}>Filey</Text>
            <Pressable onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={22} color="#F9FAFB" />
            </Pressable>
          </View>

          {/* Nav */}
          <View style={s.nav}>
            <SidebarItem icon="chatbubbles-outline" label="Chats" active />
            <SidebarItem icon="settings-outline" label="Settings" onPress={() => { onClose?.(); /* navigate to settings */ }} />
          </View>

          {/* Recents */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Recents</Text>
              <Pressable onPress={create} style={s.newBtn}>
                <Ionicons name="add" size={16} color="#F9FAFB" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {rows.length === 0 && (
                <Text style={s.empty}>No chats yet. Tap + to start.</Text>
              )}
              {rows.map(t => {
                const active = t.id === activeId;
                const isEdit = editing === t.id;
                return (
                  <SwipeableThreadRow
                    key={t.id}
                    t={t}
                    active={active}
                    isEdit={isEdit}
                    editing={editing}
                    onPick={pick}
                    onLongPress={longPress}
                    onDelete={handleDelete}
                    draft={draft}
                    setDraft={setDraft}
                    saveRename={saveRename}
                  />
                );
              })}
            </ScrollView>
          </View>

          {/* User profile */}
          <View style={s.profile}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <Text style={s.profileName} numberOfLines={1}>{name}</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  drawer: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: DRAWER_W,
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    gap: 20,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 8,
  },
  brand: {
    color: '#F9FAFB', fontSize: 22, fontWeight: '700', letterSpacing: -0.5,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  nav: { gap: 2 },

  section: { flex: 1, gap: 8 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: '#71717A', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
  },
  newBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  empty: {
    color: '#52525B', fontSize: 13, textAlign: 'center', paddingVertical: 24,
  },

  profile: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2A63E2',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF', fontSize: 13, fontWeight: '700',
  },
  profileName: {
    flex: 1, color: '#E4E4E7', fontSize: 14, fontWeight: '600',
  },
});
