import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';
import apiClient from '../api/client';
import { exportCSV, exportPDF } from '../services/exportLedger';
import { exportPeppolBatch } from '../services/eInvoiceExport';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FORMATS = [
  { id: 'pdf',    label: 'PDF Report',     desc: 'Professional formatted PDF',     icon: 'document-text',       color: '#2A63E2', ext: '.pdf' },
  { id: 'csv',    label: 'CSV (Excel)',     desc: 'Spreadsheet compatible',        icon: 'grid',                color: '#10B981', ext: '.csv' },
  { id: 'word',   label: 'Microsoft Word',  desc: 'Rich text document (.rtf)',     icon: 'document',            color: '#2563EB', ext: '.rtf' },
  { id: 'peppol', label: 'PEPPOL eInvoice', desc: 'XML for government portals',    icon: 'cloud-upload',        color: '#F43F5E', ext: '.xml' },
  { id: 'json',   label: 'JSON Data',       desc: 'Machine-readable export',       icon: 'code-slash',          color: '#8B5CF6', ext: '.json' },
];

export default function ExportScreen({ navigation }) {
  const [busy, setBusy] = useState(null);

  const handleExport = async (fmt) => {
    setBusy(fmt.id);
    try {
      const list = await apiClient.getTransactions({});
      const rows = Array.isArray(list) ? list : list?.transactions || [];
      if (!rows.length) {
        Alert.alert('Empty', 'No transactions to export yet.');
        return;
      }
      if (fmt.id === 'csv') await exportCSV(rows, {});
      else if (fmt.id === 'pdf') await exportPDF(rows, { company: 'My Company' });
      else if (fmt.id === 'peppol') await exportPeppolBatch(rows, { supplierName: 'My Company' });
      else {
        // JSON fallback
        const { FileSystem } = require('expo-file-system');
        const path = `${FileSystem.cacheDirectory}filey-export-${Date.now()}.json`;
        await FileSystem.writeAsStringAsync(path, JSON.stringify(rows, null, 2));
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
      }
    } catch (e) {
      Alert.alert('Export failed', e?.message || 'Unknown error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0B1435" />
        </Pressable>
        <Text style={styles.headerTitle}>Export to…</Text>
        <View style={styles.backBtn} />
      </View>

      <Animated.View entering={FadeInUp.duration(400)} style={styles.sheet}>
        <Text style={styles.sectionLabel}>CHOOSE FORMAT</Text>
        {FORMATS.map((f, i) => (
          <Animated.View key={f.id} entering={FadeInUp.delay(60 + i * 40).duration(320)}>
            <Pressable
              onPress={() => handleExport(f)}
              disabled={busy === f.id}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: f.color + '14' }]}>
                <Ionicons name={f.icon} size={20} color={f.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{f.label}</Text>
                <Text style={styles.rowDesc}>{f.desc}</Text>
              </View>
              {busy === f.id ? (
                <ActivityIndicator size="small" color="#2A63E2" />
              ) : (
                <Ionicons name="chevron-forward" size={18} color="rgba(11,20,53,0.25)" />
              )}
            </Pressable>
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 52 : 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0B1435',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(11,20,53,0.45)',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(11,20,53,0.06)',
  },
  iconWrap: {
    width: 44, height: 44,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B1435',
  },
  rowDesc: {
    fontSize: 12,
    color: 'rgba(11,20,53,0.5)',
    marginTop: 2,
  },
});
