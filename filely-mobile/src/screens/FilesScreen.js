import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import api from '../api/client';

const CATEGORIES = ['Food','Transport','Shopping','Office','Utilities','Entertainment','Health','Travel','Banking','General'];
const ICONS = { Food:'restaurant-outline', Transport:'car-outline', Shopping:'cart-outline', Office:'briefcase-outline', Utilities:'flash-outline', Entertainment:'film-outline', Health:'heart-outline', Travel:'airplane-outline', Banking:'business-outline', General:'receipt-outline' };

export default function FilesScreen({ darkMode }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState('all');
  const [editingFile, setEditingFile] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [exportData, setExportData] = useState(null);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  const [exportCategory, setExportCategory] = useState('all');

  useEffect(() => { fetchFiles(); }, []);

  const fetchFiles = async () => {
    try { const d = await api.getFiles(); setFiles(d.files || []); } catch(e) {}
  };

  const startEdit = (file) => {
    setEditingFile(file.id);
    setEditName(file.customName || file.merchant);
    setEditCategory(file.category);
    setEditAmount(String(file.amount));
  };

  const confirmEdit = async (file) => {
    const changes = {};
    if (editName !== (file.customName || file.merchant)) changes.merchant = editName;
    if (editCategory !== file.category) changes.category = editCategory;
    if (parseFloat(editAmount) !== file.amount) changes.amount = editAmount;
    if (Object.keys(changes).length > 0) {
      await api.editFile(file.id, changes);
    }
    setEditingFile(null);
    fetchFiles();
  };

  const openExport = async () => {
    try {
      const params = {};
      if (exportDateFrom) params.dateFrom = exportDateFrom;
      if (exportDateTo) params.dateTo = exportDateTo;
      if (exportCategory !== 'all') params.category = exportCategory;
      const d = await api.exportFiles(params);
      setExportData(d);
      setShowExport(true);
    } catch(e) {}
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    setExportDateFrom(`${y}-${m}-01`);
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    setExportDateTo(`${y}-${m}-${lastDay}`);
  };

  const filtered = files.filter(f => filter === 'all' || f.category === filter);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {/* Export Button */}
        <TouchableOpacity onPress={openExport} style={styles.exportBtn}>
          <Ionicons name="document-text" size={18} color="#00531f" />
          <Text style={styles.exportBtnText}>Export PDF</Text>
        </TouchableOpacity>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
          {['all', 'Food', 'Transport', 'Shopping', 'Office', 'Banking'].map(t => (
            <TouchableOpacity key={t} onPress={() => setFilter(t)} style={[styles.filterChip, {
              backgroundColor: filter === t ? (darkMode ? '#fff' : '#0c1e26') : c.surfaceLow,
            }]}>
              <Text style={[styles.filterText, {
                color: filter === t ? (darkMode ? '#000' : '#fff') : c.textSecondary,
              }]}>{t === 'all' ? 'All' : t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.totalText, { color: c.textMuted }]}>{filtered.length} files</Text>

        {/* File Cards */}
        {filtered.map((file, i) => {
          const isEditing = editingFile === file.id;
          const isHighValue = file.amount >= 500;

          return (
            <View key={file.id} style={[
              styles.fileCard,
              { backgroundColor: isHighValue ? (darkMode ? '#fff' : '#0c1e26') : c.card, borderColor: c.border },
            ]}>
              <View style={styles.fileCardHeader}>
                <View style={[styles.fileIcon, { backgroundColor: isHighValue ? 'rgba(68,229,113,0.15)' : c.surfaceLow }]}>
                  <Ionicons name={ICONS[file.category] || 'receipt-outline'} size={22} color={isHighValue ? '#44e571' : c.text} />
                </View>
                {!isEditing && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => startEdit(file)}>
                      <Ionicons name="create-outline" size={20} color={isHighValue ? (darkMode ? '#0c1e26' : '#fff') : c.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {isEditing ? (
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={[styles.editLabel, { color: c.textMuted }]}>NAME</Text>
                    <TextInput value={editName} onChangeText={setEditName} style={[styles.editInput, { color: isHighValue ? (darkMode ? '#0c1e26' : '#fff') : c.text, borderColor: isHighValue ? 'rgba(255,255,255,0.3)' : c.border }]} />
                  </View>
                  <View>
                    <Text style={[styles.editLabel, { color: c.textMuted }]}>CATEGORY</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {CATEGORIES.map(cat => (
                        <TouchableOpacity key={cat} onPress={() => setEditCategory(cat)} style={[
                          styles.catChip,
                          { backgroundColor: editCategory === cat ? '#44e571' : 'rgba(255,255,255,0.1)', borderColor: editCategory === cat ? '#44e571' : c.border },
                        ]}>
                          <Text style={{ color: editCategory === cat ? '#00531f' : (isHighValue ? (darkMode ? '#0c1e26' : '#fff') : c.textSecondary), fontSize: 11, fontWeight: '700' }}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View>
                    <Text style={[styles.editLabel, { color: c.textMuted }]}>AMOUNT (AED)</Text>
                    <TextInput value={editAmount} onChangeText={setEditAmount} keyboardType="numeric" style={[styles.editInput, styles.editAmountInput, { color: isHighValue ? (darkMode ? '#0c1e26' : '#fff') : c.text, borderColor: isHighValue ? 'rgba(255,255,255,0.3)' : c.border }]} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => confirmEdit(file)} style={styles.confirmBtn}>
                      <Ionicons name="checkmark" size={16} color="#00531f" />
                      <Text style={styles.confirmBtnText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingFile(null)} style={[styles.cancelEditBtn, { borderColor: isHighValue ? 'rgba(255,255,255,0.2)' : c.border }]}>
                      <Text style={{ color: isHighValue ? (darkMode ? '#0c1e26' : '#fff') : c.text, fontWeight: '700', fontSize: 13 }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={[styles.fileName, { color: isHighValue ? (darkMode ? '#0c1e26' : '#fff') : c.text }]}>{file.customName || file.merchant}</Text>
                  <View style={styles.fileAmountRow}>
                    <Text style={[styles.fileAmount, { color: isHighValue ? '#44e571' : c.text }]}>{file.amount} <Text style={[styles.fileCurrency, { color: isHighValue ? (darkMode ? 'rgba(12,30,38,0.4)' : 'rgba(255,255,255,0.4)') : c.textMuted }]}>AED</Text></Text>
                    <View style={[styles.statusBadge, isHighValue ? { borderColor: 'rgba(68,229,113,0.3)', borderWidth: 1 } : { backgroundColor: c.limeBg }]}>
                      <Text style={[styles.statusText, { color: isHighValue ? '#44e571' : c.limeDark }]}>{isHighValue ? 'High Value' : 'Processed'}</Text>
                    </View>
                  </View>
                  <Text style={[styles.fileMeta, { color: isHighValue ? (darkMode ? 'rgba(12,30,38,0.4)' : 'rgba(255,255,255,0.3)') : c.textMuted }]}>{file.date} • {file.category}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Export Modal */}
      <Modal visible={showExport} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.exportModal, { backgroundColor: c.card }]}>
            <ScrollView>
              <Text style={[styles.exportTitle, { color: c.text }]}>Export Report</Text>

              {/* Filters */}
              <View style={[styles.exportFilters, { backgroundColor: c.surfaceLow, borderColor: c.border }]}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.editLabel, { color: c.textMuted }]}>FROM</Text>
                    <TextInput value={exportDateFrom} onChangeText={setExportDateFrom} placeholder="YYYY-MM-DD" placeholderTextColor={c.textMuted} style={[styles.exportInput, { backgroundColor: c.card, color: c.text, borderColor: c.border }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.editLabel, { color: c.textMuted }]}>TO</Text>
                    <TextInput value={exportDateTo} onChangeText={setExportDateTo} placeholder="YYYY-MM-DD" placeholderTextColor={c.textMuted} style={[styles.exportInput, { backgroundColor: c.card, color: c.text, borderColor: c.border }]} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity onPress={setCurrentMonth} style={[styles.quickBtn, { borderColor: c.border }]}>
                    <Text style={[{ color: c.text, fontSize: 12, fontWeight: '700' }]}>Current Month</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={openExport} style={styles.applyBtn}>
                    <Text style={{ color: '#00531f', fontSize: 12, fontWeight: '700' }}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Report Data */}
              {exportData && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.reportId, { color: c.textMuted }]}>{exportData.reportId}</Text>
                  <Text style={[styles.reportTitle, { color: c.text }]}>Expense Report</Text>

                  {/* Table */}
                  <View style={[styles.tableHeader, { backgroundColor: '#44e571' }]}>
                    <Text style={[styles.thText, { flex: 1 }]}>Date</Text>
                    <Text style={[styles.thText, { flex: 1.5 }]}>Merchant</Text>
                    <Text style={[styles.thText, { flex: 0.7 }]}>VAT</Text>
                    <Text style={[styles.thText, { flex: 0.8, textAlign: 'right' }]}>Total</Text>
                  </View>
                  {(exportData.transactions || []).map((t, i) => (
                    <View key={i} style={[styles.tableRow, { borderColor: c.border }]}>
                      <Text style={[styles.tdText, { flex: 1, color: c.textSecondary }]}>{t.date?.substring(5)}</Text>
                      <Text style={[styles.tdText, { flex: 1.5, color: c.text, fontWeight: '700' }]}>{t.merchant}</Text>
                      <Text style={[styles.tdText, { flex: 0.7, color: c.text }]}>{t.vat?.toFixed(1)}</Text>
                      <Text style={[styles.tdText, { flex: 0.8, color: c.text, textAlign: 'right', fontWeight: '600' }]}>{t.amount}</Text>
                    </View>
                  ))}

                  {/* Totals */}
                  <View style={[styles.totalSection, { borderColor: c.text }]}>
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalLabel, { color: c.textSecondary }]}>Subtotal</Text>
                      <Text style={[styles.totalValue, { color: c.text }]}>{exportData.subtotal?.toLocaleString()} AED</Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalLabel, { color: c.textSecondary }]}>VAT (5%)</Text>
                      <Text style={[styles.totalValue, { color: c.text }]}>{exportData.totalVat?.toLocaleString()} AED</Text>
                    </View>
                    <View style={[styles.totalRow, { marginTop: 8 }]}>
                      <Text style={[styles.grandLabel, { color: c.text }]}>GRAND TOTAL</Text>
                      <Text style={[styles.grandValue, { color: c.text }]}>{exportData.grandTotal?.toLocaleString()} AED</Text>
                    </View>
                  </View>
                </View>
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
  exportBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', backgroundColor: '#44e571', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6, marginBottom: 16, marginTop: 8 },
  exportBtnText: { color: '#00531f', fontWeight: '800', fontSize: 13 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  filterText: { fontSize: 12, fontWeight: '700' },
  totalText: { fontSize: 12, fontWeight: '600', marginBottom: 12, letterSpacing: 1 },
  fileCard: { padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  fileCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  fileIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  fileAmountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  fileAmount: { fontSize: 26, fontWeight: '900' },
  fileCurrency: { fontSize: 13, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700' },
  fileMeta: { fontSize: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  editLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  editInput: { borderBottomWidth: 2, fontSize: 17, fontWeight: '700', paddingVertical: 6 },
  editAmountInput: { fontSize: 26, fontWeight: '900' },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  confirmBtn: { flex: 1, backgroundColor: '#44e571', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  confirmBtnText: { color: '#00531f', fontWeight: '800', fontSize: 13 },
  cancelEditBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, borderWidth: 1, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  exportModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  exportTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 16 },
  exportFilters: { padding: 16, borderRadius: 16, borderWidth: 1 },
  exportInput: { borderRadius: 10, padding: 10, borderWidth: 1, fontSize: 13 },
  quickBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  applyBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#44e571', alignItems: 'center' },
  reportId: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  reportTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  tableHeader: { flexDirection: 'row', padding: 10, borderRadius: 8 },
  thText: { color: '#00531f', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  tableRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1 },
  tdText: { fontSize: 12 },
  totalSection: { borderTopWidth: 2, marginTop: 16, paddingTop: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 13, fontWeight: '600' },
  grandLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  grandValue: { fontSize: 28, fontWeight: '900' },
  closeBtn: { marginTop: 20, marginBottom: 40, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
});
