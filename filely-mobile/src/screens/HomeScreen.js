import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Platform, Dimensions, ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const CARD_W = width - 48;

const CATEGORY_ICONS = {
  Food: 'restaurant-outline', Transport: 'car-outline', Shopping: 'bag-outline',
  Office: 'briefcase-outline', Utilities: 'flash-outline', Entertainment: 'film-outline',
  Health: 'heart-outline', Travel: 'airplane-outline', Banking: 'business-outline',
  General: 'receipt-outline',
};

function AmountText({ amount, style }) {
  const sign  = amount >= 0 ? '+' : '';
  const color = amount >= 0 ? '#44e571' : '#FF4B6E';
  return <Text style={[style, { color }]}>{sign}{Math.abs(amount).toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED</Text>;
}

export default function HomeScreen({ darkMode, onNavigateToScanner }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { orgId, profile } = useAuth();
  const isWeb = Platform.OS === 'web';
  const [dashboard, setDashboard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);

  const fetchDashboard = async () => {
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        const data = await db.getDashboard(orgId);
        setDashboard(data);
      } else {
        setDashboard(await api.getDashboard());
      }
    } catch {
      try { setDashboard(await api.getDashboard()); } catch {}
    }
  };

  useEffect(() => { fetchDashboard(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchDashboard(); setRefreshing(false); };

  const d = dashboard || {};
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = profile?.name?.split(' ')[0] || 'User';
  const totalSpend = d.totalSpend || 0;
  const totalVat   = d.totalVat   || 0;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.lime} />
        }
      >
        {/* ── Header ─────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(600).springify()}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerLeft}>
            <Text style={[styles.greetingLabel, { color: c.textMuted }]}>{greeting}</Text>
            <Text style={[styles.greetingName, { color: c.text }]}>{firstName}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: c.cardElevated || c.card, borderColor: c.border }]}
              accessibilityLabel="Search transactions"
            >
              <Ionicons name="search-outline" size={20} color={c.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: c.cardElevated || c.card, borderColor: c.border }]}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={20} color={c.text} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Balance Card ───────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600).springify()}
          style={[styles.balanceCard, { backgroundColor: '#1C2A4A', borderColor: 'rgba(79,142,255,0.2)' }]}
        >
          <View style={styles.balanceCardInner}>
            <View>
              <Text style={styles.balanceLabelText}>Monthly Spend</Text>
              <View style={styles.balanceRow}>
                {balanceVisible
                  ? <Text style={styles.balanceAmount}>{totalSpend.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED</Text>
                  : <Text style={styles.balanceAmount}>••••••  AED</Text>
                }
                <TouchableOpacity
                  onPress={() => setBalanceVisible(v => !v)}
                  style={styles.eyeBtn}
                  accessibilityLabel={balanceVisible ? 'Hide balance' : 'Show balance'}
                >
                  <Ionicons name={balanceVisible ? 'eye-outline' : 'eye-off-outline'} size={18} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>
              <View style={styles.changeRow}>
                <Ionicons name="trending-up" size={14} color="#44e571" />
                <Text style={styles.changeText}>VAT Recoverable: {totalVat.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              onPress={onNavigateToScanner}
              style={styles.qaBtn}
              accessibilityLabel="Scan receipt"
              accessibilityRole="button"
            >
              <View style={[styles.qaBtnIcon, { backgroundColor: '#44e571' }]}>
                <Ionicons name="camera" size={18} color="#003516" />
              </View>
              <Text style={styles.qaBtnLabel}>Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaBtn} accessibilityLabel="Transfer" accessibilityRole="button">
              <View style={[styles.qaBtnIcon, { backgroundColor: 'rgba(79,142,255,0.2)', borderWidth: 1, borderColor: 'rgba(79,142,255,0.4)' }]}>
                <Ionicons name="swap-horizontal" size={18} color="#4F8EFF" />
              </View>
              <Text style={styles.qaBtnLabel}>Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaBtn} accessibilityLabel="Export report" accessibilityRole="button">
              <View style={[styles.qaBtnIcon, { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' }]}>
                <Ionicons name="document-text-outline" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.qaBtnLabel}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaBtn} accessibilityLabel="More options" accessibilityRole="button">
              <View style={[styles.qaBtnIcon, { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }]}>
                <Ionicons name="grid-outline" size={18} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={styles.qaBtnLabel}>More</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Stats Row ──────────────────────────────── */}
        <View style={styles.statsRow}>
          <Animated.View
            entering={FadeInRight.delay(200).duration(500).springify()}
            style={[styles.statCard, darkMode ? CardPresets.cardDark : CardPresets.cardLight]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(68,229,113,0.12)' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#44e571" />
            </View>
            <Text style={[styles.statValue, { color: c.text }]}>{d.totalStored || 0}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Vault Receipts</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInRight.delay(320).duration(500).springify()}
            style={[styles.statCard, darkMode ? CardPresets.cardDark : CardPresets.cardLight]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(79,142,255,0.12)' }]}>
              <Ionicons name="scan-outline" size={20} color="#4F8EFF" />
            </View>
            <Text style={[styles.statValue, { color: c.text }]}>{d.scanCount || 0}<Text style={[styles.statMax, { color: c.textMuted }]}>/{d.scanLimit || 50}</Text></Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>AI Scans</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInRight.delay(440).duration(500).springify()}
            style={[styles.statCard, darkMode ? CardPresets.cardDark : CardPresets.cardLight]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <Ionicons name="business-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: c.text }]}>{totalVat.toFixed(0)}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>VAT (AED)</Text>
          </Animated.View>
        </View>

        {/* ── Upcoming / Compliance Alert ────────────── */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(600).springify()}
          style={[styles.alertCard, { backgroundColor: 'rgba(79,142,255,0.08)', borderColor: 'rgba(79,142,255,0.2)' }]}
        >
          <View style={styles.alertLeft}>
            <View style={[styles.alertIcon, { backgroundColor: 'rgba(79,142,255,0.15)' }]}>
              <Ionicons name="calendar-outline" size={20} color="#4F8EFF" />
            </View>
            <View>
              <Text style={[styles.alertTitle, { color: c.text }]}>UAE VAT Filing</Text>
              <Text style={[styles.alertSub, { color: c.textMuted }]}>Next quarter deadline</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.alertBtn}
            accessibilityLabel="View VAT filing details"
            accessibilityRole="button"
          >
            <Text style={styles.alertBtnText}>View</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Recent Transactions ────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Recent Activity</Text>
          <TouchableOpacity accessibilityLabel="See all transactions" accessibilityRole="button">
            <Text style={[styles.sectionLink, { color: '#4F8EFF' }]}>See All</Text>
          </TouchableOpacity>
        </View>

        {!d.recentTransactions || d.recentTransactions.length === 0 ? (
          <View style={[styles.emptyCard, darkMode ? CardPresets.cardDark : CardPresets.cardLight]}>
            <Ionicons name="receipt-outline" size={40} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              No transactions yet.{'\n'}Start scanning receipts!
            </Text>
          </View>
        ) : (
          d.recentTransactions.map((txn, i) => (
            <Animated.View
              key={txn.id || i}
              entering={FadeInDown.delay(i * 80 + 400).duration(500).springify()}
              style={[styles.txnRow, darkMode ? CardPresets.cardDark : CardPresets.cardLight]}
            >
              <View style={[styles.txnAvatar, { backgroundColor: 'rgba(79,142,255,0.15)' }]}>
                <Ionicons name={CATEGORY_ICONS[txn.category] || 'receipt-outline'} size={20} color="#4F8EFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txnMerchant, { color: c.text }]} numberOfLines={1}>
                  {txn.customName || txn.merchant}
                </Text>
                <Text style={[styles.txnMeta, { color: c.textMuted }]}>
                  {txn.date} • {txn.category}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AmountText amount={-Math.abs(txn.amount)} style={styles.txnAmount} />
                {txn.vat > 0 && (
                  <Text style={[styles.txnVat, { color: c.textMuted }]}>VAT {txn.vat} AED</Text>
                )}
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* ── Floating Scan FAB ──────────────────────── */}
      <TouchableOpacity
        style={[styles.fab, Shadow.limeMd]}
        onPress={onNavigateToScanner}
        accessibilityLabel="Scan a receipt"
        accessibilityRole="button"
        activeOpacity={0.85}
      >
        <Ionicons name="camera" size={26} color="#003516" />
        <Text style={styles.fabText}>Scan Receipt</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.lg },
  headerLeft: { gap: 2 },
  greetingLabel: { ...Typography.overline },
  greetingName: { ...Typography.sectionTitle },
  headerRight: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4B6E', borderWidth: 2, borderColor: '#0B0F1E' },

  // Balance card
  balanceCard: { marginHorizontal: Spacing.xxl, borderRadius: Radius.xxl, borderWidth: 1, marginBottom: Spacing.xxl, overflow: 'hidden' },
  balanceCardInner: { padding: Spacing.xxl },
  balanceLabelText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginBottom: Spacing.sm },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  balanceAmount: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1, flex: 1 },
  eyeBtn: { padding: 4 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs },
  changeText: { fontSize: 13, fontWeight: '600', color: '#44e571' },

  // Quick actions
  quickActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md },
  qaBtn: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  qaBtnIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  qaBtnLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },

  // Stats row
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.xxl, gap: Spacing.md, marginBottom: Spacing.xxl },
  statCard: { flex: 1, padding: Spacing.md, alignItems: 'center', gap: 6 },
  statIconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  statValue: { ...Typography.valueS },
  statMax: { ...Typography.caption },
  statLabel: { ...Typography.micro, textAlign: 'center' },

  // Alert card
  alertCard: { marginHorizontal: Spacing.xxl, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xxl },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  alertIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { ...Typography.bodyBold },
  alertSub: { ...Typography.micro, marginTop: 2 },
  alertBtn: { backgroundColor: '#4F8EFF', paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: Radius.pill },
  alertBtnText: { color: '#FFFFFF', ...Typography.btnSmall },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xxl, marginBottom: Spacing.md },
  sectionTitle: { ...Typography.cardTitle },
  sectionLink: { ...Typography.bodySmall, fontWeight: '700' },

  // Transactions
  txnRow: { marginHorizontal: Spacing.xxl, marginBottom: Spacing.sm, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  txnAvatar: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  txnMerchant: { ...Typography.bodyBold },
  txnMeta: { ...Typography.micro, marginTop: 2 },
  txnAmount: { ...Typography.bodyBold },
  txnVat: { ...Typography.micro, marginTop: 2 },

  // Empty state
  emptyCard: { marginHorizontal: Spacing.xxl, padding: Spacing.xxxl, alignItems: 'center', gap: Spacing.md },
  emptyText: { ...Typography.body, textAlign: 'center', lineHeight: 22 },

  // FAB
  fab: {
    position: 'absolute', bottom: 36, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#44e571',
    paddingHorizontal: 28, paddingVertical: 16,
    borderRadius: Radius.pill,
    borderWidth: 1.5, borderColor: 'rgba(0,83,31,0.4)',
  },
  fabText: { ...Typography.btnPrimary, color: '#003516' },
});
