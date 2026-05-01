/**
 * FilesScreen — The 5-Year Vault & Transaction Ledger
 * Per the Filey blueprint: chronological ledger, TRN filter,
 * FTA export, and advanced search. Dark navy fintech style.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Modal, Alert, ActivityIndicator, Platform,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['All','Food','Transport','Shopping','Office','Utilities','Entertainment','Health','Travel','Banking','General'];
const CATEGORY_ICONS = {
  Food:'restaurant-outline', Transport:'car-outline', Shopping:'bag-outline',
  Office:'briefcase-outline', Utilities:'flash-outline', Entertainment:'film-outline',
  Health:'heart-outline', Travel:'airplane-outline', Banking:'business-outline', General:'receipt-outline',
};

function groupByDate(files) {
  const groups = {};
  files.forEach(f => {
    const d = f.date ? f.date.substring(0, 10) : 'Unknown';
    if (!groups[d]) groups[d] = [];
    groups[d].push(f);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => ({ title: date, data }));
}

function formatDate(str) {
  try {
    const d = new Date(str);
    return d.toLocaleDateString('en-AE', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return str; }
}

export default function FilesScreen({ darkMode }) {
  const c = Colors.light;
  const insets = useSafeAreaInsets();
  const { orgId } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [files,       setFiles]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('All');
  const [search,      setSearch]      = useState('');
  const [activeTab,   setActiveTab]   = useState('ledger'); // 'ledger' | 'vault'
  const [showExport,  setShowExport]  = useState(false);
  const [exportData,  setExportData]  = useState(null);
  const [exporting,   setExporting]   = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [editName,    setEditName]    = useState('');
  const [editAmount,  setEditAmount]  = useState('');
  const [editCat,     setEditCat]     = useState('');

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        const { data } = await db.getFiles(orgId);
        setFiles(data || []);
      } else {
        const d = await api.getFiles();
        setFiles(d.files || []);
      }
    } catch {
      try { const d = await api.getFiles(); setFiles(d.files || []); } catch {}
    } finally {
      setLoading(false);
    }
  }, [orgId, isWeb]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const filtered = files.filter(f => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      (f.merchant || '').toLowerCase().includes(q) ||
      (f.customName || '').toLowerCase().includes(q) ||
      (f.trn || '').includes(q) ||
      (f.date || '').includes(q);
    const matchesCat = filter === 'All' || f.category === filter;
    const matchesTab = activeTab === 'ledger'
      ? true
      : activeTab === 'vault' ? !!f.trn : true;
    return matchesSearch && matchesCat && matchesTab;
  });

  const sections = groupByDate(filtered);
  const totalAmount = filtered.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
  const totalVat    = filtered.reduce((s, f) => s + (parseFloat(f.vat)    || 0), 0);

  const startEdit = (file) => {
    setEditingFile(file.id);
    setEditName(file.customName || file.merchant || '');
    setEditAmount(String(file.amount || ''));
    setEditCat(file.category || 'General');
  };

  const confirmEdit = async (file) => {
    try {
      const changes = {};
      const newName = editName.trim();
      if (newName && newName !== (file.customName || file.merchant)) changes.customName = newName;
      if (editCat !== file.category) changes.category = editCat;
      const newAmt = parseFloat(editAmount);
      if (!isNaN(newAmt) && newAmt !== file.amount) changes.amount = newAmt;
      if (Object.keys(changes).length > 0) await api.editFile(file.id, changes);
    } catch {}
    setEditingFile(null);
    fetchFiles();
  };

  const openExport = async () => {
    setExporting(true);
    try {
      const d = await api.exportFiles();
      setExportData(d);
      setShowExport(true);
    } catch { Alert.alert('Export Failed', 'Could not generate the report. Please try again.'); }
    finally { setExporting(false); }
  };

  const renderItem = ({ item: file }) => {
    const isEditing  = editingFile === file.id;
    const icon = CATEGORY_ICONS[file.category] || 'receipt-outline';
    const hasTRN = !!file.trn;

    return (
      <View style={[styles.txnCard, CardPresets.cardLight]}>
        {isEditing ? (
          <View style={{ gap: Spacing.md }}>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              style={[styles.editInput, { color: c.text, borderColor: c.border, backgroundColor: c.surfaceLow }]}
              placeholder="Merchant name"
              placeholderTextColor={c.textMuted}
              accessibilityLabel="Edit merchant name"
            />
            <TextInput
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
              style={[styles.editInput, { color: c.text, borderColor: c.border, backgroundColor: c.surfaceLow }]}
              placeholder="Amount (AED)"
              placeholderTextColor={c.textMuted}
              accessibilityLabel="Edit amount"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {CATEGORIES.slice(1).map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setEditCat(cat)}
                  style={[styles.catChip, { backgroundColor: editCat === cat ? '#3B6BFF' : c.surfaceLow, borderColor: editCat === cat ? '#2E5BFF' : c.border }]}
                >
                  <Text style={{ color: editCat === cat ? '#003516' : c.textSecondary, fontSize: 11, fontWeight: '700' }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity onPress={() => confirmEdit(file)} style={styles.confirmBtn} accessibilityRole="button" accessibilityLabel="Confirm edit">
                <Ionicons name="checkmark" size={16} color="#003516" />
                <Text style={styles.confirmBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingFile(null)} style={[styles.cancelEditBtn, { borderColor: c.border }]} accessibilityRole="button" accessibilityLabel="Cancel edit">
                <Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <View style={[styles.txnIcon, { backgroundColor: 'rgba(59,107,255,0.12)' }]}>
              <Ionicons name={icon} size={20} color="#3B6BFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.txnMerchant, { color: c.text }]} numberOfLines={1}>
                  {file.customName || file.merchant}
                </Text>
                {hasTRN && (
                  <View style={styles.trnBadge}>
                    <Text style={styles.trnBadgeText}>TRN</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.txnMeta, { color: c.textMuted }]}>
                {file.category}{hasTRN ? ` • ${file.trn}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.txnAmount, { color: '#FF4B6E' }]}>
                -{parseFloat(file.amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED
              </Text>
              {parseFloat(file.vat) > 0 && (
                <Text style={[styles.txnVat, { color: '#3B6BFF' }]}>VAT {parseFloat(file.vat).toFixed(2)}</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => startEdit(file)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={`Edit ${file.customName || file.merchant}`}
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={18} color={c.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.dateHeader}>
      <Text style={[styles.dateHeaderText, { color: c.textMuted }]}>{formatDate(title)}</Text>
      <View style={[styles.dateHeaderLine, { backgroundColor: c.border }]} />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {/* ── Header ────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={[styles.title, { color: c.text }]}>5-Year Vault</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>{filtered.length} records · {totalAmount.toLocaleString('en-AE', { minimumFractionDigits: 0 })} AED</Text>
        </View>
        <TouchableOpacity
          onPress={openExport}
          disabled={exporting}
          style={[styles.exportBtn, Shadow.limeSm]}
          accessibilityRole="button"
          accessibilityLabel="Generate FTA report"
        >
          {exporting ? <ActivityIndicator size="small" color="#003516" /> : (
            <>
              <Ionicons name="download-outline" size={16} color="#003516" />
              <Text style={styles.exportBtnText}>FTA Report</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Search ────────────────────────────────── */}
      <View style={[styles.searchBar, { backgroundColor: c.surfaceLow, borderColor: c.border }]}>
        <Ionicons name="search-outline" size={18} color={c.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: c.text }]}
          placeholder="Search by merchant, TRN, or date..."
          placeholderTextColor={c.textMuted}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search transactions"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Clear search" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tabs ──────────────────────────────────── */}
      <View style={styles.tabRow}>
        {[{ id: 'ledger', label: 'Ledger' }, { id: 'vault', label: 'FTA Vault' }].map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tab, { backgroundColor: activeTab === tab.id ? '#3B6BFF' : c.surfaceLow, borderColor: activeTab === tab.id ? '#2E5BFF' : c.border }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.id }}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.id ? '#003516' : c.textSecondary }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Category Filter ───────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: Spacing.xxl, gap: Spacing.sm }}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            onPress={() => setFilter(cat)}
            style={[styles.filterChip, { backgroundColor: filter === cat ? '#3B6BFF' : c.surfaceLow, borderColor: filter === cat ? '#2563EB' : c.border }]}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === cat }}
          >
            <Text style={[styles.filterText, { color: filter === cat ? '#FFFFFF' : c.textSecondary }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Summary Strip ─────────────────────────── */}
      <View style={[styles.summaryStrip, { backgroundColor: c.surfaceLow, borderColor: c.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Total</Text>
          <Text style={[styles.summaryValue, { color: c.text }]}>{totalAmount.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: c.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: c.textMuted }]}>VAT 5%</Text>
          <Text style={[styles.summaryValue, { color: '#3B6BFF' }]}>{totalVat.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: c.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: c.textMuted }]}>Records</Text>
          <Text style={[styles.summaryValue, { color: c.text }]}>{filtered.length}</Text>
        </View>
      </View>

      {/* ── List ──────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#3B6BFF" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={[styles.emptyCard, CardPresets.cardLight, { marginHorizontal: Spacing.xxl }]}>
          <Ionicons name="folder-open-outline" size={48} color={c.textMuted} />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>No records found</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id || item.merchant + item.date)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingHorizontal: Spacing.xxl, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* ── Export Modal ──────────────────────────── */}
      <Modal visible={showExport} transparent animationType="slide" onRequestClose={() => setShowExport(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.exportModal, darkMode ? CardPresets.cardElevatedDark || CardPresets.cardDark : CardPresets.cardLight]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.exportHeader}>
                <Text style={[styles.exportTitle, { color: c.text }]}>FTA Compliance Report</Text>
                <TouchableOpacity onPress={() => setShowExport(false)} accessibilityLabel="Close export" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={c.text} />
                </TouchableOpacity>
              </View>

              {exportData && (
                <>
                  <View style={[styles.tableHeader, { backgroundColor: '#3B6BFF' }]}>
                    <Text style={[styles.thText, { flex: 1.2 }]}>Date</Text>
                    <Text style={[styles.thText, { flex: 2 }]}>Merchant</Text>
                    <Text style={[styles.thText, { flex: 0.8 }]}>VAT</Text>
                    <Text style={[styles.thText, { flex: 1, textAlign: 'right' }]}>Total</Text>
                  </View>
                  {(exportData.transactions || []).map((t, i) => (
                    <View key={i} style={[styles.tableRow, { borderColor: c.border }]}>
                      <Text style={[styles.tdText, { flex: 1.2, color: c.textSecondary }]}>{(t.date || '').substring(5)}</Text>
                      <Text style={[styles.tdText, { flex: 2, color: c.text, fontWeight: '700' }]} numberOfLines={1}>{t.merchant}</Text>
                      <Text style={[styles.tdText, { flex: 0.8, color: '#3B6BFF' }]}>{(t.vat || 0).toFixed(1)}</Text>
                      <Text style={[styles.tdText, { flex: 1, color: c.text, textAlign: 'right', fontWeight: '600' }]}>{(t.amount || 0).toLocaleString()}</Text>
                    </View>
                  ))}
                  <View style={[styles.totalSection, { borderColor: c.border }]}>
                    {[
                      { label: 'Subtotal', value: exportData.subtotal },
                      { label: 'VAT 5%', value: exportData.totalVat, color: '#3B6BFF' },
                      { label: 'Grand Total', value: exportData.grandTotal, large: true },
                    ].map(row => (
                      <View key={row.label} style={styles.totalRow}>
                        <Text style={[styles.totalLabel, { color: c.textSecondary }]}>{row.label}</Text>
                        <Text style={[row.large ? styles.grandValue : styles.totalValue, { color: row.color || c.text }]}>
                          {(row.value || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity onPress={() => setShowExport(false)} style={[styles.closeBtn, { backgroundColor: c.surfaceLow }]}>
                <Text style={[{ color: c.text, fontWeight: '700', fontSize: 15 }]}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.lg },
  title: { ...Typography.sectionTitle },
  subtitle: { ...Typography.micro, marginTop: 2 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3B6BFF', paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1, borderColor: 'rgba(59,107,255,0.35)' },
  exportBtnText: { color: '#003516', ...Typography.btnSmall },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: Spacing.xxl, marginBottom: Spacing.md, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  searchInput: { flex: 1, ...Typography.bodySmall },

  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.xxl, gap: Spacing.sm, marginBottom: Spacing.md },
  tab: { paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: Radius.pill, borderWidth: 1 },
  tabText: { ...Typography.btnSmall },

  filterScroll: { maxHeight: 48, marginBottom: Spacing.md },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1 },
  filterText: { ...Typography.micro },

  summaryStrip: { flexDirection: 'row', marginHorizontal: Spacing.xxl, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.lg, alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryLabel: { ...Typography.micro },
  summaryValue: { ...Typography.captionBold || Typography.caption },
  summaryDivider: { width: 1, height: 32 },

  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  dateHeaderText: { ...Typography.overline, whiteSpace: 'nowrap' },
  dateHeaderLine: { flex: 1, height: 1 },

  txnCard: { marginBottom: Spacing.sm, padding: Spacing.lg },
  txnIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  txnMerchant: { ...Typography.bodyBold },
  txnMeta: { ...Typography.micro, marginTop: 2 },
  txnAmount: { ...Typography.bodyBold },
  txnVat: { ...Typography.micro, marginTop: 2 },
  trnBadge: { backgroundColor: 'rgba(59,107,255,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  trnBadgeText: { fontSize: 9, fontWeight: '800', color: '#3B6BFF', letterSpacing: 0.5 },

  catChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.sm, borderWidth: 1 },
  editInput: { borderRadius: Radius.sm, padding: Spacing.md, borderWidth: 1, ...Typography.body },
  confirmBtn: { flex: 1, backgroundColor: '#3B6BFF', borderRadius: Radius.md, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(59,107,255,0.35)' },
  confirmBtnText: { color: '#003516', ...Typography.btnSmall },
  cancelEditBtn: { flex: 1, borderRadius: Radius.md, paddingVertical: 12, borderWidth: 1, alignItems: 'center' },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyCard: { padding: Spacing.xxxl, alignItems: 'center', gap: Spacing.md, marginTop: Spacing.lg },
  emptyText: { ...Typography.body, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  exportModal: { borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.xxl, maxHeight: '90%' },
  exportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  exportTitle: { ...Typography.sectionTitle },
  tableHeader: { flexDirection: 'row', padding: Spacing.md, borderRadius: Radius.sm, marginBottom: 2 },
  thText: { color: '#003516', ...Typography.btnLabel },
  tableRow: { flexDirection: 'row', padding: Spacing.md, borderBottomWidth: BorderWidth.hairline },
  tdText: { ...Typography.micro },
  totalSection: { borderTopWidth: BorderWidth.medium, marginTop: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { ...Typography.body },
  totalValue: { ...Typography.bodyBold },
  grandValue: { ...Typography.valueS },
  closeBtn: { marginTop: Spacing.xxl, marginBottom: 20, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center' },
});
