import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, StatusBar, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { convertPdfToWord, convertPdfToExcel, pickPdf } from '../services/pdfConverter';
import { scanReceipt } from '../services/receiptPipeline';
import { exportCSV, exportPDF } from '../services/exportLedger';
import { exportPeppolBatch } from '../services/eInvoiceExport';
import apiClient from '../api/client';
import { createShareLink } from '../services/publicShare';
import { useAuth } from '../context/AuthContext';
import { listFiles, addFile, removeFile, subscribeFiles, formatWhen } from '../services/recentFiles';

const BRAND = '#2A63E2';

const TOOLS = [
  { id: 'scan',      label: 'Scan Code',   icon: 'qr-code-outline',         bg: '#FDECEA', tint: '#E74C3C' },
  { id: 'watermark', label: 'Watermark',   icon: 'copy-outline',            bg: '#FEF3C7', tint: '#D97706' },
  { id: 'sign',      label: 'eSign PDF',   icon: 'create-outline',          bg: '#FCE7F3', tint: '#DB2777' },
  { id: 'split',     label: 'Split PDF',   icon: 'cut-outline',             bg: '#E0F2FE', tint: '#0EA5E9' },
  { id: 'merge',     label: 'Merge PDF',   icon: 'albums-outline',          bg: '#FFF4E5', tint: '#EA580C' },
  { id: 'protect',   label: 'Protect PDF', icon: 'lock-closed-outline',     bg: '#DCFCE7', tint: '#16A34A' },
  { id: 'compress',  label: 'Compress PDF',icon: 'contract-outline',       bg: '#E0E7FF', tint: '#4338CA' },
  { id: 'all',       label: 'All Tools',   icon: 'apps-outline',            bg: '#E8EFFF', tint: '#2A63E2' },
];

const ALL_TOOLS = [
  { id: 'scanReceipt', label: 'Scan Receipt',     icon: 'scan-outline',            bg: '#E8EFFF', tint: '#2A63E2' },
  { id: 'pdfscan',     label: 'PDF Scanner',      icon: 'document-outline',        bg: '#EEF2FF', tint: '#6366F1' },
  { id: 'pdfword',     label: 'PDF → Word',       icon: 'document-text-outline',   bg: '#F5F3FF', tint: '#8B5CF6' },
  { id: 'pdfexcel',    label: 'PDF → Excel',      icon: 'grid-outline',            bg: '#ECFDF5', tint: '#10B981' },
  { id: 'share',       label: 'Share Ledger',     icon: 'link-outline',            bg: '#FEF3C7', tint: '#D97706' },
  { id: 'export',      label: 'Export Ledger',    icon: 'download-outline',        bg: '#CFFAFE', tint: '#06B6D4' },
  { id: 'peppol',      label: 'PEPPOL',           icon: 'cloud-upload-outline',    bg: '#FFE4E6', tint: '#F43F5E' },
  { id: 'stmt',        label: 'Import Statement', icon: 'receipt-outline',         bg: '#F7FEE7', tint: '#65A30D' },
  { id: 'vault',       label: 'Compliance Vault', icon: 'shield-checkmark-outline',bg: '#F3E8FF', tint: '#7C3AED' },
];

export default function ServicesScreen({ navigation }) {
  const { orgId } = useAuth();
  const [busy, setBusy] = useState(null);
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const reloadFiles = useCallback(async () => { try { setFiles(await listFiles()); } catch {} }, []);
  useEffect(() => { reloadFiles(); const u = subscribeFiles(reloadFiles); return u; }, [reloadFiles]);

  const handle = async (id) => {
    setBusy(id);
    try {
      switch (id) {
        case 'scan':
        case 'scanReceipt': {
          const res = await scanReceipt('camera');
          if (res.success) {
            await addFile({ name: `Receipt ${res.transaction?.merchant || 'scan'}.pdf`, kind: 'receipt' });
            Alert.alert('Scanned', `${res.transaction?.merchant || ''} ${res.transaction?.amount || ''} AED`);
          } else if (res.error) Alert.alert('Scan failed', res.error);
          break;
        }
        case 'pdfscan':
          Alert.alert('PDF Scanner', 'Camera stream → bundles pages → saves PDF. Coming next.');
          break;
        case 'pdfword': {
          const pick = await pickPdf();
          if (!pick) break;
          const out = await convertPdfToWord(pick.uri);
          if (out?.uri) {
            await addFile({ name: (pick.name || 'document').replace(/\.pdf$/i, '.rtf'), kind: 'word', uri: out.uri });
            if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(out.uri);
          }
          break;
        }
        case 'pdfexcel': {
          const pick = await pickPdf();
          if (!pick) break;
          const out = await convertPdfToExcel(pick.uri);
          if (out?.uri) {
            await addFile({ name: (pick.name || 'document').replace(/\.pdf$/i, '.csv'), kind: 'excel', uri: out.uri });
            if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(out.uri);
          }
          break;
        }
        case 'sign':
          Alert.alert('eSign PDF', 'Pick PDF → draw signature → embed. UI wiring pending.');
          break;
        case 'watermark':
          Alert.alert('Watermark', 'Add text/image watermark to PDF. Coming next.');
          break;
        case 'split':
          Alert.alert('Split PDF', 'Split PDF by page range. Coming next.');
          break;
        case 'merge':
          Alert.alert('Merge PDF', 'Pick multiple PDFs → merge into one. Coming next.');
          break;
        case 'protect':
          Alert.alert('Protect PDF', 'Password-lock a PDF. Coming next.');
          break;
        case 'compress':
          Alert.alert('Compress PDF', 'Shrink PDF file size. Coming next.');
          break;
        case 'all':
          setShowAll(v => !v);
          break;
        case 'share': {
          const link = await createShareLink({ orgId: orgId || 'default', ttlDays: 30 });
          Alert.alert('Share link (30 days)', link.url);
          break;
        }
        case 'export': {
          const list = await apiClient.getTransactions({});
          const rows = Array.isArray(list) ? list : list?.transactions || [];
          Alert.alert('Export', `${rows.length} transactions`, [
            { text: 'CSV', onPress: () => exportCSV(rows, {}) },
            { text: 'PDF', onPress: () => exportPDF(rows, {}) },
            { text: 'Cancel', style: 'cancel' },
          ]);
          break;
        }
        case 'peppol': {
          const list = await apiClient.getTransactions({});
          const rows = Array.isArray(list) ? list : list?.transactions || [];
          await exportPeppolBatch(rows, {});
          break;
        }
        case 'stmt':
          navigation?.navigate?.('Settings', { screen: 'statement' });
          break;
        case 'vault':
          Alert.alert('Compliance Vault', '5-year FTA-grade archive.');
          break;
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const uploadFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (res.canceled) return;
      const f = res.assets?.[0];
      if (f) await addFile({ name: f.name || 'Uploaded file', kind: 'pdf', uri: f.uri });
    } catch (e) { Alert.alert('Upload failed', e?.message || ''); }
  };

  const shareFile = async (f) => {
    if (f.uri && await Sharing.isAvailableAsync()) await Sharing.shareAsync(f.uri);
    else Alert.alert('Share', f.name);
  };

  const fileIcon = (kind) => {
    if (kind === 'word')    return { icon: 'document-text', tint: '#2563EB' };
    if (kind === 'excel')   return { icon: 'grid',          tint: '#059669' };
    if (kind === 'receipt') return { icon: 'receipt',       tint: '#DB2777' };
    return { icon: 'document', tint: '#64748B' };
  };

  const filteredFiles = files.filter(f =>
    !query.trim() || f.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Ionicons name="flash" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>Filey</Text>
        </View>
        <Pressable hitSlop={10} style={styles.searchBtn}>
          <Ionicons name="search-outline" size={20} color="#0B1435" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {TOOLS.map((t, i) => (
            <Animated.View key={t.id} entering={FadeInUp.delay(60 + i * 30).duration(320)} style={styles.cell}>
              <Pressable
                onPress={() => handle(t.id)}
                disabled={busy === t.id}
                accessibilityRole="button"
                accessibilityLabel={t.label}
                style={({ pressed }) => [styles.toolBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.toolCircle, { backgroundColor: t.bg }]}>
                  <Ionicons name={t.icon} size={24} color={t.tint} />
                </View>
                <Text style={styles.toolLabel} numberOfLines={2}>{t.label}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {showAll && (
          <Animated.View entering={FadeIn.duration(260)} style={styles.grid}>
            {ALL_TOOLS.map((t, i) => (
              <View key={t.id} style={styles.cell}>
                <Pressable
                  onPress={() => handle(t.id)}
                  disabled={busy === t.id}
                  style={({ pressed }) => [styles.toolBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[styles.toolCircle, { backgroundColor: t.bg }]}>
                    <Ionicons name={t.icon} size={22} color={t.tint} />
                  </View>
                  <Text style={styles.toolLabel} numberOfLines={2}>{t.label}</Text>
                </Pressable>
              </View>
            ))}
          </Animated.View>
        )}

        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Recent Files</Text>
          <Pressable hitSlop={8}>
            <Ionicons name="arrow-forward" size={20} color={BRAND} />
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="rgba(11,20,53,0.45)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search files"
            placeholderTextColor="rgba(11,20,53,0.45)"
            style={styles.searchInput}
          />
        </View>

        {filteredFiles.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No files yet. Use a tool above — the result will land here.</Text>
          </View>
        )}

        {filteredFiles.map((f) => {
          const fi = fileIcon(f.kind);
          return (
            <View key={f.id} style={styles.fileCard}>
              <View style={styles.fileThumb}>
                <Ionicons name={fi.icon} size={22} color={fi.tint} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                <Text style={styles.fileDate}>{formatWhen(f.ts)}</Text>
              </View>
              <Pressable hitSlop={8} onPress={() => shareFile(f)} style={styles.fileIconBtn}>
                <Ionicons name="share-social-outline" size={18} color="#0B1435" />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => removeFile(f.id)} style={styles.fileIconBtn}>
                <Ionicons name="ellipsis-vertical" size={18} color="#0B1435" />
              </Pressable>
            </View>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.fabRow}>
        <Pressable onPress={() => handle('scan')} style={[styles.fab, { backgroundColor: '#4B7CF0' }]} accessibilityLabel="Scan with camera">
          <Ionicons name="camera" size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable onPress={uploadFile} style={[styles.fab, { backgroundColor: BRAND }]} accessibilityLabel="Upload file">
          <Ionicons name="cloud-upload" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F9FC' },

  topBar: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
  },
  brandTitle: { fontSize: 18, fontWeight: '800', color: '#0B1435', letterSpacing: -0.3 },
  searchBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F2F4F8',
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 10 },
  cell: { width: '25%', paddingHorizontal: 6, marginBottom: 16, alignItems: 'center' },
  toolBtn: { alignItems: 'center', width: '100%' },
  toolCircle: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  toolLabel: {
    fontSize: 11.5, fontWeight: '600',
    color: '#0B1435', textAlign: 'center', lineHeight: 14,
  },

  recentHeader: {
    marginTop: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  recentTitle: { fontSize: 18, fontWeight: '800', color: '#0B1435', letterSpacing: -0.3 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.06)',
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: '#0B1435', padding: 0 },

  emptyBox: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: 'rgba(11,20,53,0.5)', fontSize: 13, textAlign: 'center' },

  fileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.05)',
  },
  fileThumb: {
    width: 46, height: 54, borderRadius: 8,
    backgroundColor: '#F2F4F8',
    alignItems: 'center', justifyContent: 'center',
  },
  fileName: { color: '#0B1435', fontSize: 14, fontWeight: '700' },
  fileDate: { color: 'rgba(11,20,53,0.5)', fontSize: 11.5, marginTop: 4 },
  fileIconBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  fabRow: {
    position: 'absolute', bottom: 96, right: 20,
    flexDirection: 'row', gap: 10,
  },
  fab: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
});
