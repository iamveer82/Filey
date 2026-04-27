import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { mergePdfs } from '../services/pdfMerger';
import { addFile } from '../services/recentFiles';

export default function MergePdfScreen({ navigation }) {
  const [pdfs, setPdfs] = useState([]);
  const [busy, setBusy] = useState(false);

  const addPdfs = async () => {
    const r = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (r.canceled || !r.assets?.length) return;
    const newPdfs = r.assets.map((a, i) => ({
      uri: a.uri,
      name: a.name || `PDF ${i + 1}`,
      selected: true,
    }));
    setPdfs((prev) => [...prev, ...newPdfs]);
  };

  const toggle = (idx) => {
    setPdfs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], selected: !next[idx].selected };
      return next;
    });
  };

  const remove = (idx) => {
    setPdfs((prev) => prev.filter((_, i) => i !== idx));
  };

  const runMerge = async () => {
    const selected = pdfs.filter((p) => p.selected);
    if (selected.length < 2) {
      Alert.alert('Select more', 'Choose at least 2 PDFs to merge.');
      return;
    }
    setBusy(true);
    try {
      const res = await mergePdfs(selected, null);
      if (res.success) {
        await addFile({ name: `Merged-${Date.now()}.pdf`, kind: 'pdf', uri: res.outputUri });
        Alert.alert('Merged!', res.message, [
          {
            text: 'Share',
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.outputUri);
            },
          },
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Merge failed', res.error);
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to merge PDFs');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0B1435" />
        </Pressable>
        <Text style={styles.headerTitle}>Merge PDF</Text>
        <Pressable onPress={addPdfs} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="add" size={24} color="#2A63E2" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {pdfs.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="documents-outline" size={40} color="rgba(11,20,53,0.2)" />
            <Text style={styles.emptyText}>Tap + to add PDFs</Text>
          </View>
        )}

        {pdfs.map((p, i) => (
          <Animated.View key={`${p.uri}-${i}`} entering={FadeInUp.delay(i * 40).duration(300)} style={styles.docCard}>
            <Pressable onPress={() => toggle(i)} style={styles.checkbox}>
              <View style={[styles.checkInner, p.selected && styles.checkOn]}>
                {p.selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
            </Pressable>
            <Ionicons name="document-text" size={22} color="#2A63E2" style={{ marginHorizontal: 10 }} />
            <Text style={styles.docName} numberOfLines={1}>{p.name}</Text>
            <Pressable onPress={() => remove(i)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color="rgba(11,20,53,0.25)" />
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>

      {pdfs.length > 0 && (
        <View style={styles.bottomBar}>
          <Pressable
            onPress={runMerge}
            disabled={busy}
            style={[styles.mergeBtn, busy && { opacity: 0.6 }]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.mergeText}>Merge {pdfs.filter((p) => p.selected).length} PDFs</Text>
                <Ionicons name="git-merge" size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 52 : 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(11,20,53,0.06)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0B1435' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: 'rgba(11,20,53,0.45)', fontSize: 14, fontWeight: '500' },
  docCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 14,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.06)',
  },
  checkbox: { padding: 4 },
  checkInner: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: 'rgba(11,20,53,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: '#2A63E2', borderColor: '#2A63E2' },
  docName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0B1435' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: 'rgba(11,20,53,0.08)',
    paddingHorizontal: 20, paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  mergeBtn: {
    height: 52, borderRadius: 14,
    backgroundColor: '#2A63E2',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  mergeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
