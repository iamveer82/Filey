import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert, ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { getPageCount } from '../services/pdfTools';
import { splitPdfsInteractive } from '../services/pdfMerger';
import { addFile } from '../services/recentFiles';

export default function SplitPDFScreen({ navigation }) {
  const [pdf, setPdf] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [splitAt, setSplitAt] = useState('');
  const [busy, setBusy] = useState(false);

  const pickPdf = async () => {
    const r = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (r.canceled || !r.assets?.[0]) return;
    const file = r.assets[0];
    setPdf(file);
    try {
      const info = await getPageCount(file.uri);
      setPageCount(info.pageCount || 1);
      setSplitAt(String(Math.ceil((info.pageCount || 1) / 2)));
    } catch {
      setPageCount(1);
      setSplitAt('1');
    }
  };

  const runSplit = async () => {
    if (!pdf) {
      Alert.alert('Select PDF', 'Please select a PDF to split.');
      return;
    }
    const at = parseInt(splitAt, 10);
    if (isNaN(at) || at < 1 || at >= pageCount) {
      Alert.alert('Invalid split point', `Enter a page number between 1 and ${pageCount - 1}.`);
      return;
    }
    setBusy(true);
    try {
      const ranges = [
        { start: 1, end: at },
        { start: at + 1, end: pageCount },
      ];
      const res = await splitPdfsInteractive(pdf.uri, ranges, pdf.name || 'split');
      if (res.success) {
        Alert.alert('Split complete!', res.message, [
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Split failed', res.error || 'Could not split PDF.');
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to split PDF');
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
        <Text style={styles.headerTitle}>Split PDF</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {!pdf && (
          <Animated.View entering={FadeInUp.duration(350)}>
            <Pressable onPress={pickPdf} style={styles.pickCard}>
              <Ionicons name="cloud-upload-outline" size={32} color="#2A63E2" />
              <Text style={styles.pickTitle}>Select PDF</Text>
              <Text style={styles.pickDesc}>Tap to choose a PDF to split</Text>
            </Pressable>
          </Animated.View>
        )}

        {pdf && (
          <Animated.View entering={FadeInUp.duration(300)}>
            <View style={styles.pdfChip}>
              <Ionicons name="document-text" size={20} color="#2A63E2" />
              <View style={{ flex: 1 }}>
                <Text style={styles.pdfChipName} numberOfLines={1}>{pdf.name || 'document.pdf'}</Text>
                <Text style={styles.pdfChipMeta}>{pageCount} pages</Text>
              </View>
              <Pressable onPress={() => { setPdf(null); setPageCount(0); }} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="rgba(11,20,53,0.35)" />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {pdf && pageCount > 1 && (
          <Animated.View entering={FadeInUp.delay(100).duration(350)} style={styles.section}>
            <Text style={styles.sectionLabel}>SPLIT AT PAGE</Text>
            <TextInput
              value={splitAt}
              onChangeText={setSplitAt}
              keyboardType="number-pad"
              placeholder={`1 - ${pageCount - 1}`}
              placeholderTextColor="rgba(11,20,53,0.35)"
              style={styles.input}
            />
            <Text style={styles.hint}>Creates 2 PDFs: pages 1–{splitAt || '?'} and pages {parseInt(splitAt || '0', 10) + 1}–{pageCount}</Text>
          </Animated.View>
        )}

        {pdf && pageCount <= 1 && (
          <Animated.View entering={FadeInUp.delay(100).duration(350)} style={styles.section}>
            <View style={styles.warnCard}>
              <Ionicons name="alert-circle" size={20} color="#F59E0B" />
              <Text style={styles.warnText}>This PDF has only 1 page. Nothing to split.</Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {pdf && pageCount > 1 && (
        <View style={styles.bottomBar}>
          <Pressable
            onPress={runSplit}
            disabled={busy}
            style={[styles.actionBtn, busy && { opacity: 0.6 }]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.actionText}>Split PDF</Text>
                <Ionicons name="cut" size={18} color="#FFFFFF" />
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

  pickCard: {
    backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(11,20,53,0.08)',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingVertical: 44, gap: 8,
  },
  pickTitle: { fontSize: 16, fontWeight: '700', color: '#0B1435' },
  pickDesc: { fontSize: 13, color: 'rgba(11,20,53,0.45)', textAlign: 'center' },

  pdfChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.06)',
  },
  pdfChipName: { fontSize: 14, fontWeight: '600', color: '#0B1435' },
  pdfChipMeta: { fontSize: 12, color: 'rgba(11,20,53,0.45)', marginTop: 2 },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(11,20,53,0.45)', letterSpacing: 0.8, marginBottom: 10,
  },
  input: {
    height: 52, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: 'rgba(11,20,53,0.08)',
    paddingHorizontal: 14, fontSize: 15, color: '#0B1435',
  },
  hint: { fontSize: 12, color: 'rgba(11,20,53,0.45)', marginTop: 8 },

  warnCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
  },
  warnText: { fontSize: 13, fontWeight: '600', color: '#92400E' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: 'rgba(11,20,53,0.08)',
    paddingHorizontal: 20, paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  actionBtn: {
    height: 52, borderRadius: 14,
    backgroundColor: '#2A63E2',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  actionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
