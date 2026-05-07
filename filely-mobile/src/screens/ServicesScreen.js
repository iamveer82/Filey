import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, StatusBar, TextInput, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { convertPdfToWord, convertPdfToExcel, pickPdf } from '../services/pdfConverter';
import { scanReceipt } from '../services/receiptPipeline';
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
        case 'scan': {
          const res = await scanReceipt('camera');
          if (res.success) {
            await addFile({ name: `Receipt ${res.transaction?.merchant || 'scan'}.pdf`, kind: 'receipt' });
            Alert.alert('Scanned', `${res.transaction?.merchant || ''} ${res.transaction?.amount || ''} AED`);
          } else if (res.error) Alert.alert('Scan failed', res.error);
          break;
        }
        case 'scanReceipt': {
          const res = await scanReceipt('gallery');
          if (res.success) {
            await addFile({ name: `Receipt ${res.transaction?.merchant || 'scan'}.pdf`, kind: 'receipt' });
            Alert.alert('Scanned', `${res.transaction?.merchant || ''} ${res.transaction?.amount || ''} AED`);
          } else if (res.error) Alert.alert('Scan failed', res.error);
          break;
        }
        case 'pdfscan': {
          navigation.navigate('Scanner');
          break;
        }
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
        case 'sign': {
          navigation.navigate('Signature');
          break;
        }
        case 'watermark': {
          navigation.navigate('Watermark');
          break;
        }
        case 'split': {
          navigation.navigate('Split');
          break;
        }
        case 'merge': {
          navigation.navigate('Merge');
          break;
        }
        case 'protect': {
          navigation.navigate('Protect');
          break;
        }
        case 'compress': {
          navigation.navigate('Compress');
          break;
        }
        case 'watermark': {
          navigation.navigate('Watermark');
          break;
        }
        case 'all':
          setShowAll(v => !v);
          break;
        case 'share': {
          const link = await createShareLink({ orgId: orgId || 'default', ttlDays: 30 });
          Alert.alert('Share link (30 days)', link.url);
          break;
        }
        case 'export': {
          navigation.navigate('Export');
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
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#2A63E2" />

      {/* Blue section: tool grid only */}
      <View style={styles.blueSection}>
        {/* Search bar */}
        <Animated.View entering={FadeInUp.duration(400)} style={styles.searchBarHero}>
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.7)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tools or files…"
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={styles.searchInputHero}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )}
        </Animated.View>

        {/* Tool grid - blue background */}
        <View style={styles.scroll}>
          <View style={styles.grid}>
            {TOOLS.map((t, i) => (
              <Animated.View key={t.id} entering={FadeInUp.delay(60 + i * 30).duration(320)} style={styles.cell}>
                <Pressable
                  onPress={() => handle(t.id)}
                  disabled={busy === t.id}
                  accessibilityRole="button"
                  accessibilityLabel={t.label}
                  style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnPressed]}
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
                    style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnPressed]}
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
        </View>

      </View>

      {/* White section: Recent Files (scrollable) */}
      <View style={styles.whiteSection}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Files</Text>
            <Pressable hitSlop={8}>
              <Ionicons name="arrow-forward" size={20} color={BRAND} />
            </Pressable>
          </View>

          {filteredFiles.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No files yet. Use a tool above — the result will land here.</Text>
            </View>
          )}

          {filteredFiles.map((f, i) => {
            const fi = fileIcon(f.kind);
            return (
              <Animated.View
                key={f.id}
                entering={FadeInUp.delay(i * 40).duration(300)}
                style={[styles.fileCard, { borderLeftWidth: 4, borderLeftColor: fi.tint }]}
              >
                <View style={[styles.fileThumb, { backgroundColor: fi.tint + '14' }]}>
                  <Ionicons name={fi.icon} size={22} color={fi.tint} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                  <Text style={styles.fileDate}>{formatWhen(f.ts)}</Text>
                </View>
                <Pressable hitSlop={8} onPress={() => shareFile(f)} style={styles.fileIconBtn}>
                  <Ionicons name="share-social-outline" size={18} color="#0B1435" />
                </Pressable>
                <Pressable hitSlop={8} onPress={() => removeFile(f.id)} style={styles.fileIconBtn}>
                  <Ionicons name="ellipsis-vertical" size={18} color="#0B1435" />
                </Pressable>
              </Animated.View>
            );
          })}

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* FAB row - inside whiteSection for proper positioning */}
        <View style={styles.fabRow}>
          <Pressable onPress={() => handle('scan')} style={[styles.fab, { backgroundColor: '#4B7CF0' }]} accessibilityLabel="Scan with camera">
            <Ionicons name="camera" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={uploadFile} style={[styles.fab, { backgroundColor: BRAND }]} accessibilityLabel="Upload file">
            <Ionicons name="cloud-upload" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2A63E2' },

  blueSection: {
    backgroundColor: '#2A63E2',
  },

  hero: {
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'ios' ? 64 : 44,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  searchBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  searchBarHero: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 22,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInputHero: {
    flex: 1,
    fontSize: 13.5,
    color: '#FFFFFF',
    padding: 0,
  },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8, marginBottom: 4 },

  whiteSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cell: { width: '25%', paddingHorizontal: 8, marginBottom: 20, alignItems: 'center' },
  toolBtn: { alignItems: 'center', width: '100%', paddingVertical: 4 },
  toolBtnPressed: { opacity: 0.7 },
  toolCircle: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  toolLabel: {
    fontSize: 11.5, fontWeight: '600',
    color: '#FFFFFF', textAlign: 'center', lineHeight: 14,
  },

  recentHeader: {
    marginTop: 4, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  recentTitle: { fontSize: 18, fontWeight: '800', color: '#0B1435', letterSpacing: -0.3 },

  emptyBox: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { color: 'rgba(11,20,53,0.5)', fontSize: 13, textAlign: 'center' },

  fileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.08)',
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
