import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert, ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { analyzeCompression, compressPdf } from '../services/pdfCompressor';
import { addFile } from '../services/recentFiles';

const QUALITY_OPTIONS = [
  { key: 'high', label: 'High', desc: 'Minimal compression, best quality', color: '#10B981' },
  { key: 'medium', label: 'Medium', desc: 'Balanced quality & size', color: '#F59E0B' },
  { key: 'low', label: 'Low', desc: 'Maximum compression, smaller size', color: '#EF4444' },
];

export default function CompressPDFScreen({ navigation }) {
  const [pdf, setPdf] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [quality, setQuality] = useState('medium');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const pickPdf = async () => {
    const r = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (r.canceled || !r.assets?.[0]) return;
    const file = r.assets[0];
    setPdf(file);
    setResult(null);
    try {
      const a = await analyzeCompression(file.uri);
      setAnalysis(a);
      setQuality(a.recommendedStrategy || 'medium');
    } catch {
      setAnalysis(null);
    }
  };

  const runCompress = async () => {
    if (!pdf) {
      Alert.alert('Select PDF', 'Please select a PDF to compress.');
      return;
    }
    setBusy(true);
    try {
      const res = await compressPdf(pdf.uri, { quality });
      if (res.success && res.outputUri) {
        await addFile({ name: `Compressed-${Date.now()}.pdf`, kind: 'pdf', uri: res.outputUri });
        setResult(res);
        Alert.alert('Compressed!', res.message, [
          {
            text: 'Share',
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.outputUri, { mimeType: 'application/pdf', dialogTitle: 'Save Compressed PDF' });
            },
          },
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Compression failed', res.error || 'Could not compress PDF.');
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to compress PDF');
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
        <Text style={styles.headerTitle}>Compress PDF</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {!pdf && (
          <Animated.View entering={FadeInUp.duration(350)}>
            <Pressable onPress={pickPdf} style={styles.pickCard}>
              <Ionicons name="cloud-upload-outline" size={32} color="#2A63E2" />
              <Text style={styles.pickTitle}>Select PDF</Text>
              <Text style={styles.pickDesc}>Tap to choose a PDF to compress</Text>
            </Pressable>
          </Animated.View>
        )}

        {pdf && (
          <Animated.View entering={FadeInUp.duration(300)}>
            <View style={styles.pdfChip}>
              <Ionicons name="document-text" size={20} color="#2A63E2" />
              <View style={{ flex: 1 }}>
                <Text style={styles.pdfChipName} numberOfLines={1}>{pdf.name || 'document.pdf'}</Text>
                {analysis && (
                  <Text style={styles.pdfChipMeta}>Size: {analysis.originalSizeKB}KB · Est. reduction: {analysis.estimatedReduction}</Text>
                )}
              </View>
              <Pressable onPress={() => { setPdf(null); setAnalysis(null); setResult(null); }} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="rgba(11,20,53,0.35)" />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {pdf && (
          <Animated.View entering={FadeInUp.delay(100).duration(350)} style={styles.section}>
            <Text style={styles.sectionLabel}>COMPRESSION LEVEL</Text>
            {QUALITY_OPTIONS.map((opt) => {
              const active = quality === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setQuality(opt.key)}
                  style={[styles.qualityCard, active && { borderColor: opt.color, backgroundColor: opt.color + '0A' }]}
                >
                  <View style={[styles.qualityDot, { backgroundColor: opt.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.qualityLabel, active && { color: opt.color }]}>{opt.label}</Text>
                    <Text style={styles.qualityDesc}>{opt.desc}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color={opt.color} />}
                </Pressable>
              );
            })}
          </Animated.View>
        )}

        {result && (
          <Animated.View entering={FadeInUp.duration(300)} style={styles.resultCard}>
            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            <Text style={styles.resultTitle}>Compression Complete</Text>
            <Text style={styles.resultMeta}>{result.message}</Text>
          </Animated.View>
        )}
      </ScrollView>

      {pdf && (
        <View style={styles.bottomBar}>
          <Pressable
            onPress={runCompress}
            disabled={busy}
            style={[styles.actionBtn, busy && { opacity: 0.6 }]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.actionText}>Compress PDF</Text>
                <Ionicons name="contract" size={18} color="#FFFFFF" />
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
  pdfChipName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0B1435' },
  pdfChipMeta: { fontSize: 12, color: 'rgba(11,20,53,0.45)', marginTop: 2 },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(11,20,53,0.45)', letterSpacing: 0.8, marginBottom: 10,
  },
  qualityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.08)',
  },
  qualityDot: { width: 10, height: 10, borderRadius: 5 },
  qualityLabel: { fontSize: 15, fontWeight: '700', color: '#0B1435' },
  qualityDesc: { fontSize: 12, color: 'rgba(11,20,53,0.5)', marginTop: 2 },

  resultCard: {
    alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 16,
    padding: 20, marginTop: 8, borderWidth: 1, borderColor: '#10B98120',
    gap: 6,
  },
  resultTitle: { fontSize: 15, fontWeight: '700', color: '#0B1435' },
  resultMeta: { fontSize: 13, color: 'rgba(11,20,53,0.55)', textAlign: 'center' },

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
