import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert, ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { addTextWatermark, removeWatermarkFromPdf } from '../services/pdfWatermark';
import { addFile } from '../services/recentFiles';

export default function WatermarkPDFScreen({ navigation }) {
  const [pdf, setPdf] = useState(null);
  const [mode, setMode] = useState('add'); // 'add' | 'remove'
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.15);
  const [busy, setBusy] = useState(false);

  const pickPdf = async () => {
    const r = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (r.canceled || !r.assets?.[0]) return;
    setPdf(r.assets[0]);
  };

  const runWatermark = async () => {
    if (!pdf) {
      Alert.alert('Select PDF', 'Please select a PDF first.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'add') {
        const res = await addTextWatermark(pdf.uri, text || 'Watermark', { opacity, rotation: 45, fontSize: 48, color: '#808080', position: 'center' });
        if (res.success && res.outputUri) {
          await addFile({ name: `Watermarked-${Date.now()}.pdf`, kind: 'pdf', uri: res.outputUri });
          Alert.alert('Watermarked!', res.message, [
            {
              text: 'Share',
              onPress: async () => {
                if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.outputUri, { mimeType: 'application/pdf', dialogTitle: 'Save Watermarked PDF' });
              },
            },
            { text: 'Done', onPress: () => navigation.goBack() },
          ]);
        } else {
          Alert.alert('Failed', res.error || 'Could not add watermark.');
        }
      } else {
        const res = await removeWatermarkFromPdf(pdf.uri);
        if (res.success && res.outputUri) {
          await addFile({ name: `Clean-${Date.now()}.pdf`, kind: 'pdf', uri: res.outputUri });
          Alert.alert('Cleaned!', res.message, [
            {
              text: 'Share',
              onPress: async () => {
                if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.outputUri, { mimeType: 'application/pdf', dialogTitle: 'Save Cleaned PDF' });
              },
            },
            { text: 'Done', onPress: () => navigation.goBack() },
          ]);
        } else {
          Alert.alert('Failed', res.error || 'Could not remove watermark.');
        }
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Watermark operation failed.');
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
        <Text style={styles.headerTitle}>Watermark PDF</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        {!pdf && (
          <Animated.View entering={FadeInUp.duration(350)}>
            <Pressable onPress={pickPdf} style={styles.pickCard}>
              <Ionicons name="cloud-upload-outline" size={32} color="#2A63E2" />
              <Text style={styles.pickTitle}>Select PDF</Text>
              <Text style={styles.pickDesc}>Tap to choose a PDF to watermark</Text>
            </Pressable>
          </Animated.View>
        )}

        {pdf && (
          <Animated.View entering={FadeInUp.duration(300)}>
            <View style={styles.pdfChip}>
              <Ionicons name="document-text" size={20} color="#2A63E2" />
              <Text style={styles.pdfChipName} numberOfLines={1}>{pdf.name || 'document.pdf'}</Text>
              <Pressable onPress={() => setPdf(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="rgba(11,20,53,0.35)" />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {pdf && (
          <Animated.View entering={FadeInUp.delay(80).duration(350)}>
            <View style={styles.modeRow}>
              <Pressable
                onPress={() => setMode('add')}
                style={[styles.modeBtn, mode === 'add' && styles.modeBtnActive]}
              >
                <Text style={[styles.modeText, mode === 'add' && styles.modeTextActive]}>Add Watermark</Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('remove')}
                style={[styles.modeBtn, mode === 'remove' && styles.modeBtnActive]}
              >
                <Text style={[styles.modeText, mode === 'remove' && styles.modeTextActive]}>Remove Watermark</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {pdf && mode === 'add' && (
          <Animated.View entering={FadeInUp.delay(120).duration(350)} style={styles.section}>
            <Text style={styles.sectionLabel}>TEXT</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Enter watermark text"
              placeholderTextColor="rgba(11,20,53,0.35)"
              style={styles.input}
            />

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>OPACITY</Text>
            <View style={styles.opacityRow}>
              <Text style={styles.opacityValue}>{Math.round(opacity * 100)}%</Text>
            </View>
            <View style={styles.opacityTrack}>
              {[0.05, 0.1, 0.15, 0.25, 0.4].map((v) => (
                <Pressable key={v} onPress={() => setOpacity(v)} style={styles.opacityChip}>
                  <View style={[styles.opacityChipInner, opacity === v && { backgroundColor: '#2A63E2' }]}>
                    <Text style={[styles.opacityChipText, opacity === v && { color: '#FFFFFF' }]}>{Math.round(v * 100)}%</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Preview</Text>
              <View style={styles.previewCanvas}>
                <Text style={[styles.previewWatermark, { opacity }]}>{text || 'Watermark'}</Text>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {pdf && (
        <View style={styles.bottomBar}>
          <Pressable
            onPress={runWatermark}
            disabled={busy}
            style={[styles.actionBtn, busy && { opacity: 0.6 }]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.actionText}>{mode === 'add' ? 'Add Watermark' : 'Remove Watermark'}</Text>
                <Ionicons name={mode === 'add' ? 'copy' : 'refresh'} size={18} color="#FFFFFF" />
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

  modeRow: {
    flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 4, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.06)',
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  modeBtnActive: { backgroundColor: '#2A63E2' },
  modeText: { fontSize: 13, fontWeight: '700', color: 'rgba(11,20,53,0.55)' },
  modeTextActive: { color: '#FFFFFF' },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(11,20,53,0.45)', letterSpacing: 0.8, marginBottom: 10,
  },
  input: {
    height: 52, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: 'rgba(11,20,53,0.08)',
    paddingHorizontal: 14, fontSize: 15, color: '#0B1435',
  },

  opacityRow: { alignItems: 'flex-end', marginBottom: 8 },
  opacityValue: { fontSize: 13, fontWeight: '700', color: '#2A63E2' },
  opacityTrack: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  opacityChip: { flex: 1 },
  opacityChipInner: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: 'rgba(11,20,53,0.08)',
  },
  opacityChipText: { fontSize: 12, fontWeight: '700', color: '#0B1435' },

  previewBox: { marginTop: 4 },
  previewLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(11,20,53,0.45)', letterSpacing: 0.8, marginBottom: 8 },
  previewCanvas: {
    height: 120, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: 'rgba(11,20,53,0.08)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  previewWatermark: { fontSize: 22, fontWeight: '800', color: '#0B1435', transform: [{ rotate: '-15deg' }] },

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
