/**
 * VAT summary modal — fetches transactions, computes FTA-style 5% VAT split,
 * renders hero + reclaim/owed + category breakdown. Export buttons included.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import Animated, {
  FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/client';
import { summarizeVat } from '../services/categories';
import { exportCSV, exportPDF } from '../services/exportLedger';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function Tap({ children, style, onPress, disabled }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 420 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 320 }); }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}

export default function VatSummaryModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [txs, setTxs] = useState([]);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    (async () => {
      try {
        const res = await api.getTransactions();
        const list = res?.transactions || res || [];
        setTxs(list);
        setSummary(summarizeVat(list));
      } catch (e) {
        Alert.alert('Error', 'Failed to load transactions');
      } finally { setLoading(false); }
    })();
  }, [visible]);

  const doExport = async (fmt) => {
    setExporting(fmt);
    try {
      if (fmt === 'csv') await exportCSV(txs);
      else await exportPDF(txs, { company: 'My Company' });
    } catch (e) {
      Alert.alert('Export failed', e.message || String(e));
    } finally { setExporting(null); }
  };

  const maxCatAmt = summary?.byCategory[0]?.amt || 1;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.wrap, { paddingTop: insets.top + 8 }]}>
        <View style={s.hero}>
          <Animated.View entering={FadeIn.duration(300)}>
            <View style={s.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.kicker}>FTA VAT 5% · {new Date().toISOString().slice(0, 7)}</Text>
                <Text style={s.title}>VAT Summary</Text>
              </View>
              <Tap onPress={onClose} style={s.closeBtn}>
                <Ionicons name="close" size={22} color="#FFF" />
              </Tap>
            </View>
            {loading ? (
              <ActivityIndicator color="#FFF" style={{ marginTop: 40 }} />
            ) : summary ? (
              <>
                <View style={s.bigStat}>
                  <Text style={s.bigLabel}>TOTAL VAT PAID</Text>
                  <Text style={s.bigValue}>{summary.totalVat.toFixed(2)} AED</Text>
                </View>
                <View style={s.splitRow}>
                  <View style={s.splitCell}>
                    <Text style={s.splitLabel}>RECLAIMABLE</Text>
                    <Text style={[s.splitValue, { color: '#BEF264' }]}>{summary.reclaimable.toFixed(2)}</Text>
                  </View>
                  <View style={s.splitDivider} />
                  <View style={s.splitCell}>
                    <Text style={s.splitLabel}>NON-RECLAIM</Text>
                    <Text style={[s.splitValue, { color: '#FCA5A5' }]}>{summary.nonReclaimable.toFixed(2)}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </Animated.View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
          {loading ? null : !summary || summary.count === 0 ? (
            <Text style={s.empty}>No transactions in vault yet. Scan a receipt to get started.</Text>
          ) : (
            <>
              <Text style={s.sectionTitle}>BY CATEGORY · {summary.count} TX</Text>
              {summary.byCategory.map((cat, i) => (
                <Animated.View key={cat.id} entering={FadeInUp.delay(40 * i).duration(360)} style={s.catRow}>
                  <View style={s.catHead}>
                    <View style={[s.catDot, { backgroundColor: cat.color }]} />
                    <Text style={s.catLabel}>{cat.label}</Text>
                    <Text style={s.catCount}>×{cat.count}</Text>
                    <Text style={s.catAmt}>{cat.amt.toFixed(2)} AED</Text>
                  </View>
                  <View style={s.catBarBg}>
                    <View
                      style={[s.catBarFill, {
                        width: `${Math.max(4, (cat.amt / maxCatAmt) * 100)}%`,
                        backgroundColor: cat.color,
                      }]}
                    />
                  </View>
                  <Text style={s.catVat}>VAT {cat.vat.toFixed(2)} AED</Text>
                </Animated.View>
              ))}

              <Text style={[s.sectionTitle, { marginTop: 28 }]}>EXPORT</Text>
              <View style={s.exportRow}>
                <Tap onPress={() => doExport('csv')} disabled={exporting === 'csv'} style={s.exportBtn}>
                  {exporting === 'csv' ? <ActivityIndicator color="#0B1435" /> : (
                    <>
                      <Ionicons name="grid-outline" size={16} color="#0B1435" />
                      <Text style={s.exportText}>CSV (Excel)</Text>
                    </>
                  )}
                </Tap>
                <Tap onPress={() => doExport('pdf')} disabled={exporting === 'pdf'} style={[s.exportBtn, { backgroundColor: '#3B6BFF' }]}>
                  {exporting === 'pdf' ? <ActivityIndicator color="#FFF" /> : (
                    <>
                      <Ionicons name="document-text-outline" size={16} color="#FFF" />
                      <Text style={[s.exportText, { color: '#FFF' }]}>PDF report</Text>
                    </>
                  )}
                </Tap>
              </View>

              <Text style={s.foot}>FTA 5-year retention · all figures AED</Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#FFF' },
  hero: {
    backgroundColor: '#3B6BFF', paddingHorizontal: 20, paddingBottom: 22,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  kicker: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  bigStat: { marginTop: 12 },
  bigLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  bigValue: { color: '#FFF', fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  splitRow: {
    marginTop: 14, flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, padding: 14, alignItems: 'center',
  },
  splitCell: { flex: 1 },
  splitDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'stretch', marginHorizontal: 14 },
  splitLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  splitValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#6B7280', marginBottom: 12 },
  catRow: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    padding: 12, marginBottom: 10,
  },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catLabel: { flex: 1, color: '#0B1435', fontSize: 13.5, fontWeight: '700' },
  catCount: { color: '#6B7280', fontSize: 11, fontWeight: '600', marginRight: 6 },
  catAmt: { color: '#0B1435', fontSize: 13, fontWeight: '700' },
  catBarBg: { height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 3 },
  catVat: { color: '#6B7280', fontSize: 11, fontWeight: '600', marginTop: 6 },
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, borderRadius: 16, backgroundColor: '#E8EEFF',
  },
  exportText: { color: '#0B1435', fontSize: 13.5, fontWeight: '700' },
  foot: { textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 20 },
  empty: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 40 },
});
