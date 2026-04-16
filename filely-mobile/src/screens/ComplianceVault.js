/**
 * ComplianceVault — FTA Vault tab (alias/redirect to FilesScreen vault view)
 * Also serves as a standalone deep-link entry for compliance search.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ComplianceVault({ darkMode }) {
  const c       = darkMode ? Colors.dark : Colors.light;
  const insets  = useSafeAreaInsets();
  const { orgId } = useAuth();
  const [filter,    setFilter]    = useState('all');
  const [search,    setSearch]    = useState('');
  const [files,     setFiles]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const d = await api.getFiles();
      setFiles(d.files || []);
    } catch { Alert.alert('Error', 'Failed to load vault records'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFiles(); }, []);

  const generateReport = async () => {
    setExporting(true);
    try {
      await api.exportFiles();
      Alert.alert('Export Successful', 'Your FTA-compliant report has been generated.');
    } catch { Alert.alert('Error', 'Failed to generate report'); }
    finally { setExporting(false); }
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = !search ||
      (f.merchant || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.trn     || '').includes(search) ||
      (f.date    || '').includes(search);
    if (filter === 'vat only') return matchesSearch && parseFloat(f.vat) > 0;
    if (filter === 'flagged')  return matchesSearch && f.status === 'flagged';
    return matchesSearch;
  });

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: c.text }]}>5-Year Vault</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>FTA Compliance Archive</Text>
        </View>
        <TouchableOpacity
          onPress={generateReport}
          disabled={exporting}
          style={[styles.exportBtn, Shadow.limeSm]}
          accessibilityRole="button"
          accessibilityLabel="Generate FTA report"
        >
          {exporting
            ? <ActivityIndicator color="#003516" size="small" />
            : <><Ionicons name="download-outline" size={16} color="#003516" /><Text style={styles.exportText}>FTA Report</Text></>
          }
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: c.surfaceLow, borderColor: c.border }]}>
        <Ionicons name="search-outline" size={18} color={c.textMuted} />
        <TextInput
          style={[styles.input, { color: c.text }]}
          placeholder="Search by merchant, TRN, or date..."
          placeholderTextColor={c.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search vault records"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        {[['all', 'All'], ['vat only', 'VAT Only'], ['flagged', 'Flagged']].map(([val, label]) => (
          <TouchableOpacity
            key={val}
            onPress={() => setFilter(val)}
            style={[styles.tab, {
              backgroundColor: filter === val ? '#44e571' : c.surfaceLow,
              borderColor:     filter === val ? '#006e2c' : c.border,
            }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === val }}
          >
            <Text style={[styles.tabText, { color: filter === val ? '#003516' : c.text }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#4F8EFF" size="large" />
          </View>
        ) : filteredFiles.length === 0 ? (
          <View style={[styles.emptyCard, darkMode ? CardPresets.cardDark : CardPresets.cardLight, { marginHorizontal: Spacing.xxl }]}>
            <Ionicons name="folder-open-outline" size={48} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>No records found</Text>
          </View>
        ) : (
          filteredFiles.map((file, i) => (
            <Animated.View
              key={file.id || i}
              entering={FadeInDown.delay(i * 60).duration(400).springify()}
              style={[styles.fileCard, darkMode ? CardPresets.cardDark : CardPresets.cardLight, { marginHorizontal: Spacing.xxl }]}
            >
              <View style={styles.fileRow}>
                <View style={[styles.fileIcon, { backgroundColor: 'rgba(79,142,255,0.12)' }]}>
                  <Ionicons name="document-text" size={20} color="#4F8EFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fileName, { color: c.text }]} numberOfLines={1}>
                    {file.customName || file.merchant}
                  </Text>
                  <Text style={[styles.fileMeta, { color: c.textMuted }]}>{file.date} · {file.category}</Text>
                </View>
                <Text style={[styles.fileAmount, { color: '#FF4B6E' }]}>
                  -{parseFloat(file.amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={styles.footer}>
                {parseFloat(file.vat) > 0 && (
                  <View style={[styles.tag, { backgroundColor: 'rgba(68,229,113,0.1)', borderColor: 'rgba(68,229,113,0.2)' }]}>
                    <Text style={[styles.tagText, { color: '#44e571' }]}>VAT: {parseFloat(file.vat).toFixed(2)} AED</Text>
                  </View>
                )}
                {file.trn && (
                  <View style={[styles.tag, { backgroundColor: 'rgba(79,142,255,0.1)', borderColor: 'rgba(79,142,255,0.2)' }]}>
                    <Text style={[styles.tagText, { color: '#4F8EFF' }]}>TRN ✓</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.viewBtn, { backgroundColor: c.surfaceLow, borderColor: c.border }]}
                  accessibilityLabel={`View ${file.customName || file.merchant}`}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="eye-outline" size={16} color={c.text} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, paddingHorizontal: Spacing.xxl },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  title:         { ...Typography.sectionTitle },
  subtitle:      { ...Typography.micro, marginTop: 2 },
  exportBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#44e571', paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1, borderColor: 'rgba(0,83,31,0.3)' },
  exportText:    { color: '#003516', ...Typography.btnSmall },
  searchBar:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: 12, marginBottom: Spacing.md },
  input:         { flex: 1, ...Typography.bodySmall },
  tabBar:        { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  tab:           { paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1 },
  tabText:       { ...Typography.btnSmall },
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyCard:     { padding: Spacing.xxxl, alignItems: 'center', gap: Spacing.md, marginTop: Spacing.lg },
  emptyText:     { ...Typography.body, textAlign: 'center' },
  fileCard:      { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.sm },
  fileRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  fileIcon:      { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  fileName:      { ...Typography.bodyBold },
  fileMeta:      { ...Typography.micro, marginTop: 2 },
  fileAmount:    { ...Typography.bodyBold },
  footer:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: BorderWidth.hairline, borderTopColor: 'rgba(255,255,255,0.04)' },
  tag:           { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  tagText:       { ...Typography.micro, fontWeight: '800' },
  viewBtn:       { width: 36, height: 36, borderRadius: Radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
});
