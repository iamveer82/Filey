import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { convertPdfToWord, convertPdfToExcel, pickPdf } from '../services/pdfConverter';
import { scanReceipt } from '../services/receiptPipeline';
import { exportCSV, exportPDF } from '../services/exportLedger';
import { exportPeppolBatch } from '../services/eInvoiceExport';
import apiClient from '../api/client';
import { createShareLink } from '../services/publicShare';
import { useAuth } from '../context/AuthContext';

const BRAND = '#2A63E2';

const SERVICES = [
  { id: 'scan',     title: 'Scan Receipt',     sub: 'OCR + auto-fill',           icon: 'scan-outline',            color: '#2A63E2' },
  { id: 'pdfscan',  title: 'PDF Scanner',      sub: 'Turn photos into a PDF',    icon: 'document-outline',        color: '#6366F1' },
  { id: 'pdfword',  title: 'PDF → Word',       sub: 'Convert PDF to editable',   icon: 'document-text-outline',   color: '#8B5CF6' },
  { id: 'pdfexcel', title: 'PDF → Excel',      sub: 'Tables to spreadsheet',     icon: 'grid-outline',            color: '#10B981' },
  { id: 'sign',     title: 'Add Signature',    sub: 'Sign a PDF',                icon: 'create-outline',          color: '#EC4899' },
  { id: 'share',    title: 'Share Ledger',     sub: 'Read-only link for CA',     icon: 'link-outline',            color: '#F59E0B' },
  { id: 'export',   title: 'Export Ledger',    sub: 'CSV / PDF download',        icon: 'download-outline',        color: '#06B6D4' },
  { id: 'peppol',   title: 'PEPPOL e-Invoice', sub: 'UBL 2.1 XML batch',         icon: 'cloud-upload-outline',    color: '#F43F5E' },
  { id: 'stmt',     title: 'Import Statement', sub: 'Reconcile bank PDF',        icon: 'receipt-outline',         color: '#84CC16' },
  { id: 'vault',    title: 'Compliance Vault', sub: '5-yr FTA archive',          icon: 'shield-checkmark-outline',color: '#7C3AED' },
];

export default function ServicesScreen({ darkMode, navigation }) {
  const { orgId } = useAuth();
  const [busy, setBusy] = useState(null);

  const handle = async (id) => {
    setBusy(id);
    try {
      switch (id) {
        case 'scan': {
          const res = await scanReceipt('camera');
          if (res.success) Alert.alert('Scanned', `${res.transaction?.merchant || ''} ${res.transaction?.amount || ''} AED`);
          else if (res.error) Alert.alert('Scan failed', res.error);
          break;
        }
        case 'pdfscan': {
          Alert.alert('PDF Scanner', 'Opens camera stream → bundles pages → saves PDF. (Pipeline ready, UI coming next.)');
          break;
        }
        case 'pdfword': {
          const pick = await pickPdf();
          if (!pick) break;
          const out = await convertPdfToWord(pick.uri);
          if (out?.uri && await Sharing.isAvailableAsync()) await Sharing.shareAsync(out.uri);
          break;
        }
        case 'pdfexcel': {
          const pick = await pickPdf();
          if (!pick) break;
          const out = await convertPdfToExcel(pick.uri);
          if (out?.uri && await Sharing.isAvailableAsync()) await Sharing.shareAsync(out.uri);
          break;
        }
        case 'sign': {
          Alert.alert('Add Signature', 'Opens PDF → draw signature → embed. (UI wiring pending.)');
          break;
        }
        case 'share': {
          const link = await createShareLink({ orgId: orgId || 'default', ttlDays: 30 });
          Alert.alert('Share link (30 days)', link.url, [
            { text: 'Copy', onPress: () => Platform.OS === 'web' ? navigator.clipboard?.writeText?.(link.url) : null },
            { text: 'OK' },
          ]);
          break;
        }
        case 'export': {
          const list = await apiClient.getTransactions({});
          const rows = Array.isArray(list) ? list : list?.transactions || [];
          Alert.alert('Export', `${rows.length} transactions — choose format`, [
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
        case 'stmt': {
          navigation?.navigate?.('Settings', { screen: 'statement' });
          break;
        }
        case 'vault': {
          Alert.alert('Compliance Vault', '5-year FTA-grade archive. Routes to old Vault view.');
          break;
        }
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: darkMode ? '#0A0A0A' : '#F5F7FC' }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(400)}>
          <Text style={[styles.h1, { color: darkMode ? '#FFFFFF' : '#0B1435' }]}>Services</Text>
          <Text style={[styles.sub, { color: darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(11,20,53,0.55)' }]}>
            Tools that work on any file you throw at them.
          </Text>
        </Animated.View>

        <View style={styles.grid}>
          {SERVICES.map((s, i) => (
            <Animated.View key={s.id} entering={FadeInUp.delay(80 + i * 40).duration(360)} style={styles.cell}>
              <Pressable
                onPress={() => handle(s.id)}
                disabled={busy === s.id}
                accessibilityRole="button"
                accessibilityLabel={s.title}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: darkMode ? '#14192E' : '#FFFFFF',
                    borderColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(11,20,53,0.06)',
                    opacity: pressed ? 0.85 : busy === s.id ? 0.6 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: s.color + '22' }]}>
                  <Ionicons name={s.icon} size={22} color={s.color} />
                </View>
                <Text style={[styles.cardTitle, { color: darkMode ? '#FFFFFF' : '#0B1435' }]}>{s.title}</Text>
                <Text style={[styles.cardSub, { color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(11,20,53,0.5)' }]}>{s.sub}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInUp.delay(600).duration(400)}>
          <View style={[styles.bannerWrap, { backgroundColor: darkMode ? 'rgba(59,107,255,0.12)' : 'rgba(59,107,255,0.08)' }]}>
            <View style={[styles.iconWrap, { backgroundColor: BRAND + '25', marginBottom: 10 }]}>
              <Ionicons name="sparkles" size={20} color={BRAND} />
            </View>
            <Text style={[styles.bannerTitle, { color: darkMode ? '#FFFFFF' : '#0B1435' }]}>Ask Filey AI</Text>
            <Text style={[styles.bannerSub, { color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(11,20,53,0.6)' }]}>
              Say "export last month as PDF" or "scan this receipt" — the AI runs any service hands-free.
            </Text>
          </View>
        </Animated.View>

        <View style={{ height: 140 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingTop: 12 },
  h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { width: '50%', paddingHorizontal: 6, marginBottom: 12 },
  card: {
    borderRadius: 18,
    padding: 16,
    minHeight: 130,
    borderWidth: 1,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardSub: { fontSize: 12, lineHeight: 16 },
  bannerWrap: {
    marginTop: 20, padding: 20, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(59,107,255,0.2)',
  },
  bannerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  bannerSub: { fontSize: 13, lineHeight: 19 },
});
