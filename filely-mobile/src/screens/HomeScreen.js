import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import api from '../api/client';

export default function HomeScreen({ darkMode }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const [dashboard, setDashboard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try { const d = await api.getDashboard(); setDashboard(d); } catch(e) {}
  };

  useEffect(() => { fetchDashboard(); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchDashboard(); setRefreshing(false); };

  const d = dashboard || {};
  const greeting = new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening';
  const streak = Math.min(d.transactionCount || 0, 3);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.lime} />}
    >
      {/* Greeting */}
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <Text style={[styles.greetingText, { color: c.textMuted }]}>{greeting.toUpperCase()}</Text>
          {streak > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: c.limeLight }]}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={[styles.streakText, { color: c.limeDark }]}>{streak}-day streak</Text>
            </View>
          )}
        </View>
        <Text style={[styles.heroText, { color: c.text }]}>
          Your financial{' '}
          <Text style={[styles.heroAccent, { color: c.limeDark }]}>clarity</Text>
          {"\n"}at a glance.
        </Text>
      </View>

      {/* Fili Mascot */}
      <View style={[styles.mascotCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.mascotIcon}>
          <Text style={{ fontSize: 32 }}>🦅</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.mascotTitle, { color: c.text }]}>Fili says:</Text>
          <Text style={[styles.mascotText, { color: c.textSecondary }]}>
            {d.transactionCount > 0
              ? `Great work! You've tracked ${d.transactionCount} expenses this month. Keep it up! 💪`
              : `Hey! Got any new receipts for Filely to sort? Let's get that VAT back! ☀️`}
          </Text>
        </View>
      </View>

      {/* Bento Grid */}
      <View style={styles.bentoGrid}>
        {/* Monthly Spend */}
        <View style={[styles.bentoCard, { backgroundColor: c.card }]}>
          <Ionicons name="card-outline" size={24} color={c.textMuted} />
          <Text style={[styles.bentoLabel, { color: c.textSecondary }]}>This Month's Spend</Text>
          <Text style={[styles.bentoValue, { color: c.text }]}>{(d.totalSpend || 0).toLocaleString()} AED</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min((d.scanCount || 0) / (d.scanLimit || 50) * 100, 100)}%` }]} />
          </View>
        </View>

        {/* VAT */}
        <View style={[styles.bentoCard, { backgroundColor: c.card, borderLeftWidth: 4, borderLeftColor: c.lime }]}>
          <Ionicons name="business-outline" size={24} color={c.textMuted} />
          <Text style={[styles.bentoLabel, { color: c.textSecondary }]}>VAT Tracked (5%)</Text>
          <Text style={[styles.bentoValue, { color: c.text }]}>{(d.totalVat || 0).toLocaleString()} AED</Text>
          <View style={[styles.vatBadge, { backgroundColor: c.limeLight }]}>
            <Ionicons name="checkmark-circle" size={14} color={c.limeDark} />
            <Text style={[styles.vatBadgeText, { color: c.limeDark }]}>UAE VAT Compliant</Text>
          </View>
        </View>

        {/* Scans */}
        <View style={[styles.bentoCard, { backgroundColor: darkMode ? '#fff' : '#0c1e26' }]}>
          <Ionicons name="scan-outline" size={24} color={darkMode ? 'rgba(12,30,38,0.4)' : 'rgba(255,255,255,0.4)'} />
          <Text style={[styles.bentoLabel, { color: darkMode ? 'rgba(12,30,38,0.6)' : 'rgba(255,255,255,0.6)' }]}>AI Scans Used</Text>
          <Text style={[styles.bentoValue, { color: c.lime }]}>{d.scanCount || 0}/{d.scanLimit || 50}</Text>
        </View>
      </View>

      {/* Recent Transactions */}
      <Text style={[styles.sectionTitle, { color: c.text }]}>
        <View style={[styles.sectionLine, { backgroundColor: c.lime }]} />
        {'  '}Recent Transactions
      </Text>

      {(d.recentTransactions || []).length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: c.surfaceLow }]}>
          <Ionicons name="receipt-outline" size={40} color={c.textMuted} />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>
            No transactions yet. Start scanning in Chat!
          </Text>
        </View>
      )}

      {(d.recentTransactions || []).map((txn, i) => (
        <View key={i} style={[styles.txnCard, { backgroundColor: c.surfaceLow }]}>
          <View style={[styles.txnAvatar, { backgroundColor: c.limeBg }]}>
            <Text style={[styles.txnAvatarText, { color: c.limeDark }]}>{(txn.merchant || 'U')[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.txnMerchant, { color: c.text }]}>{txn.customName || txn.merchant}</Text>
            <Text style={[styles.txnMeta, { color: c.textMuted }]}>{txn.category} • {txn.date}</Text>
          </View>
          <Text style={[styles.txnAmount, { color: c.text }]}>{txn.amount} AED</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: { marginTop: 10, marginBottom: 20 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  greetingText: { fontSize: 12, fontWeight: '600', letterSpacing: 2 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
  streakEmoji: { fontSize: 14 },
  streakText: { fontSize: 11, fontWeight: '700' },
  heroText: { fontSize: 36, fontWeight: '800', letterSpacing: -1.5, lineHeight: 42 },
  heroAccent: { fontStyle: 'italic' },
  mascotCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24, gap: 12 },
  mascotIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(68,229,113,0.15)', alignItems: 'center', justifyContent: 'center' },
  mascotTitle: { fontWeight: '700', fontSize: 15, marginBottom: 4 },
  mascotText: { fontSize: 13, lineHeight: 18 },
  bentoGrid: { gap: 12, marginBottom: 32 },
  bentoCard: { padding: 24, borderRadius: 16, marginBottom: 0 },
  bentoLabel: { fontSize: 13, fontWeight: '600', marginTop: 12 },
  bentoValue: { fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  progressBar: { height: 6, backgroundColor: 'rgba(68,229,113,0.2)', borderRadius: 3, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#44e571', borderRadius: 3 },
  vatBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginTop: 16, gap: 4 },
  vatBadgeText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  sectionLine: { width: 32, height: 2, borderRadius: 1, marginRight: 8 },
  emptyCard: { padding: 32, borderRadius: 16, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  txnCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 8, gap: 12 },
  txnAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  txnAvatarText: { fontWeight: '700', fontSize: 18 },
  txnMerchant: { fontWeight: '700', fontSize: 15 },
  txnMeta: { fontSize: 12, marginTop: 2 },
  txnAmount: { fontWeight: '800', fontSize: 16 },
});
