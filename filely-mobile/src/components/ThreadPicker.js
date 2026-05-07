/**
 * Thread picker — bottom sheet listing chats.
 * Tap to switch, long-press to rename/delete.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listThreads, createThread, renameThread, deleteThread, setActiveThreadId } from '../services/threads';

export default function ThreadPicker({ visible, activeId, onClose, onPick }) {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');

  const refresh = async () => setRows(await listThreads());

  useEffect(() => { if (visible) refresh(); }, [visible]);

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

  const longPress = (t) => {
    Alert.alert(t.title, undefined, [
      { text: 'Rename', onPress: () => { setEditing(t.id); setDraft(t.title); } },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteThread(t.id); refresh(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const saveRename = async () => {
    if (editing && draft.trim()) {
      await renameThread(editing, draft.trim());
      setEditing(null);
      refresh();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title}>Chats</Text>
            <Pressable onPress={create} style={s.newBtn}>
              <Ionicons name="add" size={16} color="#0A0A0A" />
              <Text style={s.newText}>New</Text>
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 420 }}>
            {rows.length === 0 && (
              <Text style={s.empty}>No chats yet. Tap New to start.</Text>
            )}
            {rows.map(t => {
              const active = t.id === activeId;
              const isEdit = editing === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => !isEdit && pick(t.id)}
                  onLongPress={() => !isEdit && longPress(t)}
                  delayLongPress={300}
                  style={[s.row, active && s.rowActive]}
                >
                  <Ionicons name={active ? 'chatbubble' : 'chatbubble-outline'} size={15} color={active ? '#2A63E2' : '#9CA3AF'} />
                  {isEdit ? (
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      onBlur={saveRename}
                      onSubmitEditing={saveRename}
                      autoFocus
                      style={s.rowInput}
                    />
                  ) : (
                    <Text style={[s.rowText, active && s.rowTextActive]} numberOfLines={1}>{t.title}</Text>
                  )}
                  <Text style={s.rowTime}>{fmtTime(t.updatedAt)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 32,
    borderTopWidth: 1, borderColor: '#262626',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A2A2A',
    alignSelf: 'center', marginBottom: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { flex: 1, color: '#F9FAFB', fontSize: 17, fontWeight: '800' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  newText: { color: '#0A0A0A', fontSize: 12.5, fontWeight: '700' },
  empty: { color: '#6B7280', fontSize: 13, textAlign: 'center', paddingVertical: 32 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 4,
  },
  rowActive: { backgroundColor: '#141414' },
  rowText: { flex: 1, color: '#E5E7EB', fontSize: 14, fontWeight: '500' },
  rowTextActive: { color: '#F9FAFB', fontWeight: '700' },
  rowTime: { color: '#6B7280', fontSize: 11, fontWeight: '600' },
  rowInput: {
    flex: 1, color: '#F9FAFB', fontSize: 14,
    backgroundColor: '#1F1F1F', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
});
