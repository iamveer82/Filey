import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Platform, Dimensions, ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInRight, FadeIn, SlideInRight,
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withRepeat, withSequence, withDelay, interpolate,
  Extrapolation, runOnJS, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 48;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/* ─── Category Icons (unchanged) ─────────────────────── */
const CATEGORY_ICONS = {
  Food: 'restaurant-outline', Transport: 'car-outline', Shopping: 'bag-outline',
  Office: 'briefcase-outline', Utilities: 'flash-outline', Entertainment: 'film-outline',
  Health: 'heart-outline', Travel: 'airplane-outline', Banking: 'business-outline',
  General: 'receipt-outline',
};

/* ─── AmountText (unchanged) ─────────────────────────── */
function AmountText({ amount, style }) {
  const sign  = amount >= 0 ? '+' : '';
  const color = amount >= 0 ? '#44e571' : '#FF4B6E';
  return (
    <Text style={[style, { color }]}>
      {sign}{Math.abs(amount).toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED
    </Text>
  );
}

/* ─── Animated Number Counter ────────────────────────── */
function AnimatedCounter({ value, visible, style }) {
  const displayValue = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    displayValue.value = withTiming(value, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const [displayText, setDisplayText] = useState('0.00');

  useEffect(() => {
    if (!visible) return;
    const steps = 30;
    const stepDuration = 1200 / steps;
    let current = 0;
    const increment = value / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        current = value;
        clearInterval(timer);
      }
      setDisplayText(current.toLocaleString('en-AE', { minimumFractionDigits: 2 }));
    }, stepDuration);
    return () => clearInterval(timer);
  }, [value, visible]);

  if (!visible) {
    return <Text style={style}>{'••••••  AED'}</Text>;
  }

  return (
    <Animated.Text style={[style, { opacity }]}>
      {displayText} AED
    </Animated.Text>
  );
}

/* ─── Spring Press Button ────────────────────────────── */
function SpringPressable({ children, onPress, style, accessibilityLabel, accessibilityRole }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 350 });
  };

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      style={[style, animatedStyle]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole || 'button'}
    >
      {children}
    </AnimatedTouchable>
  );
}

/* ─── Scroll Progress Bar ────────────────────────────── */
function ScrollProgressBar({ scrollY, headerHeight, color }) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [0, 800],
      [0, 100],
      Extrapolation.CLAMP,
    );
    return {
      width: `${progress}%`,
      opacity: interpolate(scrollY.value, [0, 20], [0, 1], Extrapolation.CLAMP),
    };
  });

  return (
    <Animated.View style={[styles.scrollProgressTrack, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
      <Animated.View style={[styles.scrollProgressBar, { backgroundColor: color }, animatedStyle]} />
    </Animated.View>
  );
}

/* ─── Decorative Orb for Balance Card ────────────────── */
function CardOrb({ size, color, top, left, right, bottom, opacity: orbOpacity }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: orbOpacity || 0.12,
        top, left, right, bottom,
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════
   HomeScreen
   ═══════════════════════════════════════════════════════ */
export default function HomeScreen({ darkMode, onNavigateToScanner }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { orgId, profile } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [dashboard, setDashboard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);

  /* ── Data Fetching ─────────────────────────────────── */
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
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const d = dashboard || {};
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = profile?.name?.split(' ')[0] || 'User';
  const totalSpend = d.totalSpend || 0;
  const totalVat   = d.totalVat   || 0;

  /* ── Scroll-driven header parallax ─────────────────── */
  const scrollY = useSharedValue(0);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 120, 200],
      [1, 0.6, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [0, 200],
      [0, -40],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY }] };
  });

  const handleScroll = (event) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };

  /* ── FAB pulse animation ───────────────────────────── */
  const fabPulse = useSharedValue(1);

  useEffect(() => {
    fabPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.sine) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sine) }),
      ),
      -1,
      false,
    );
  }, []);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabPulse.value }],
  }));

  const fabGlowStyle = useAnimatedStyle(() => {
    const glowOpacity = interpolate(
      fabPulse.value,
      [1, 1.06],
      [0.25, 0.55],
      Extrapolation.CLAMP,
    );
    return { opacity: glowOpacity };
  });

  /* ── FAB press animation ───────────────────────────── */
  const fabScale = useSharedValue(1);

  const fabPressStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fabPulse.value * fabScale.value },
    ],
  }));

  const handleFabPressIn = () => {
    fabScale.value = withSpring(0.88, { damping: 15, stiffness: 400 });
  };

  const handleFabPressOut = () => {
    fabScale.value = withSpring(1, { damping: 12, stiffness: 350 });
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {/* ── Scroll Progress Bar ──────────────────────── */}
      <View style={[styles.scrollProgressContainer, { top: insets.top }]}>
        <ScrollProgressBar scrollY={scrollY} headerHeight={200} color={c.lime} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.lime}
            progressBackgroundColor={c.card}
          />
        }
      >
        {/* ── Header with parallax fade ──────────────── */}
        <Animated.View style={headerAnimatedStyle}>
          <Animated.View
            entering={FadeInDown.delay(80).duration(500).springify()}
            style={[styles.header, { paddingTop: insets.top + 20 }]}
          >
            <View style={styles.headerLeft}>
              <Animated.Text
                entering={FadeInDown.delay(120).duration(500).springify()}
                style={[styles.greetingLabel, { color: c.textMuted }]}
              >
                {greeting}
              </Animated.Text>
              <Animated.Text
                entering={FadeInDown.delay(200).duration(600).springify()}
                style={[styles.greetingName, { color: c.text }]}
              >
                {firstName}
              </Animated.Text>
            </View>
            <Animated.View
              entering={FadeIn.delay(400).duration(500)}
              style={styles.headerRight}
            >
              <SpringPressable
                style={[styles.iconBtn, {
                  backgroundColor: c.cardElevated || c.card,
                  borderColor: c.border,
                }]}
                accessibilityLabel="Search transactions"
              >
                <Ionicons name="search-outline" size={20} color={c.text} />
              </SpringPressable>
              <SpringPressable
                style={[styles.iconBtn, {
                  backgroundColor: c.cardElevated || c.card,
                  borderColor: c.border,
                }]}
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={20} color={c.text} />
                <View style={[styles.notifDot, { borderColor: c.bg }]} />
              </SpringPressable>
            </Animated.View>
          </Animated.View>
        </Animated.View>

        {/* ── Premium Balance Card ───────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(700).springify()}
          style={[styles.balanceCard, Shadow.softLg]}
        >
          {/* Decorative orbs for depth */}
          <CardOrb size={180} color="#4F8EFF" top={-60} right={-40} opacity={0.08} />
          <CardOrb size={120} color="#44e571" bottom={-30} left={-20} opacity={0.06} />
          <CardOrb size={80} color="#4F8EFF" top={40} left={60} opacity={0.05} />
          <CardOrb size={60} color="#44e571" bottom={50} right={30} opacity={0.04} />

          {/* Card top border accent line */}
          <View style={styles.cardAccentLine} />

          {/* Inner content */}
          <View style={styles.balanceCardInner}>
            {/* Card chip / brand mark */}
            <View style={styles.cardTopRow}>
              <View style={styles.cardChip}>
                <View style={styles.cardChipInner} />
              </View>
              <View style={styles.cardBrandMark}>
                <Text style={styles.cardBrandText}>FILEY</Text>
                <View style={styles.cardBrandDot} />
              </View>
            </View>

            {/* Balance */}
            <View style={styles.balanceSection}>
              <Text style={styles.balanceLabelText}>MONTHLY SPEND</Text>
              <View style={styles.balanceRow}>
                <AnimatedCounter
                  value={totalSpend}
                  visible={balanceVisible}
                  style={styles.balanceAmount}
                />
                <SpringPressable
                  onPress={() => setBalanceVisible(v => !v)}
                  style={styles.eyeBtn}
                  accessibilityLabel={balanceVisible ? 'Hide balance' : 'Show balance'}
                >
                  <Ionicons
                    name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="rgba(255,255,255,0.5)"
                  />
                </SpringPressable>
              </View>

              {/* VAT info row */}
              <View style={styles.vatRow}>
                <View style={styles.vatBadge}>
                  <Ionicons name="trending-up" size={12} color="#44e571" />
                </View>
                <Text style={styles.vatText}>
                  VAT Recoverable: {totalVat.toLocaleString('en-AE', { minimumFractionDigits: 2 })} AED
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {[
              { icon: 'camera', label: 'Scan', bg: '#44e571', iconColor: '#003516', onPress: onNavigateToScanner },
              { icon: 'swap-horizontal', label: 'Transfer', bg: 'rgba(79,142,255,0.15)', iconColor: '#4F8EFF', borderColor: 'rgba(79,142,255,0.35)' },
              { icon: 'document-text-outline', label: 'Report', bg: 'rgba(245,158,11,0.12)', iconColor: '#F59E0B', borderColor: 'rgba(245,158,11,0.25)' },
              { icon: 'grid-outline', label: 'More', bg: 'rgba(255,255,255,0.06)', iconColor: 'rgba(255,255,255,0.65)', borderColor: 'rgba(255,255,255,0.10)' },
            ].map((action, index) => (
              <Animated.View
                key={action.label}
                entering={FadeInDown.delay(350 + index * 80).duration(500).springify()}
              >
                <SpringPressable
                  onPress={action.onPress}
                  style={styles.qaBtn}
                  accessibilityLabel={action.label}
                >
                  <View style={[
                    styles.qaBtnIcon,
                    {
                      backgroundColor: action.bg,
                      borderWidth: action.borderColor ? 1 : 0,
                      borderColor: action.borderColor || 'transparent',
                    },
                  ]}>
                    <Ionicons name={action.icon} size={20} color={action.iconColor} />
                  </View>
                  <Text style={styles.qaBtnLabel}>{action.label}</Text>
                </SpringPressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* ── Stats Row ──────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            {
              icon: 'shield-checkmark', iconColor: '#44e571',
              iconBg: 'rgba(68,229,113,0.12)',
              value: d.totalStored || 0, suffix: '',
              label: 'Vault Receipts', delay: 250,
            },
            {
              icon: 'scan-outline', iconColor: '#4F8EFF',
              iconBg: 'rgba(79,142,255,0.12)',
              value: d.scanCount || 0, suffix: `/${d.scanLimit || 50}`,
              label: 'AI Scans', delay: 380,
            },
            {
              icon: 'business-outline', iconColor: '#F59E0B',
              iconBg: 'rgba(245,158,11,0.12)',
              value: totalVat.toFixed(0), suffix: '',
              label: 'VAT (AED)', delay: 510,
            },
          ].map((stat) => (
            <Animated.View
              key={stat.label}
              entering={SlideInRight.delay(stat.delay).duration(550).springify()}
              style={[styles.statCard, darkMode ? CardPresets.cardDark : CardPresets.cardLight]}
            >
              <View style={[styles.statIconWrap, { backgroundColor: stat.iconBg }]}>
                <Ionicons name={stat.icon} size={20} color={stat.iconColor} />
              </View>
              <Text style={[styles.statValue, { color: c.text }]}>
                {stat.value}
                {stat.suffix ? <Text style={[styles.statMax, { color: c.textMuted }]}>{stat.suffix}</Text> : null}
              </Text>
              <Text style={[styles.statLabel, { color: c.textMuted }]}>{stat.label}</Text>
            </Animated.View>
          ))}
        </View>

        {/* ── Compliance Alert Card ──────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(350).duration(600).springify()}
          style={[styles.alertCard, {
            backgroundColor: darkMode ? 'rgba(79,142,255,0.06)' : 'rgba(59,130,246,0.06)',
            borderColor: darkMode ? 'rgba(79,142,255,0.18)' : 'rgba(59,130,246,0.18)',
          }]}
        >
          <View style={styles.alertLeft}>
            <View style={[styles.alertIcon, {
              backgroundColor: darkMode ? 'rgba(79,142,255,0.15)' : 'rgba(59,130,246,0.12)',
            }]}>
              <Ionicons name="calendar-outline" size={20} color={darkMode ? '#4F8EFF' : '#3B82F6'} />
            </View>
            <View>
              <Text style={[styles.alertTitle, { color: c.text }]}>UAE VAT Filing</Text>
              <Text style={[styles.alertSub, { color: c.textMuted }]}>Next quarter deadline</Text>
            </View>
          </View>
          <SpringPressable
            style={styles.alertBtn}
            accessibilityLabel="View VAT filing details"
          >
            <Text style={styles.alertBtnText}>View</Text>
          </SpringPressable>
        </Animated.View>

        {/* ── Recent Transactions ────────────────────── */}
        <Animated.View
          entering={FadeIn.delay(450).duration(400)}
          style={styles.sectionHeader}
        >
          <Text style={[styles.sectionTitle, { color: c.text }]}>Recent Activity</Text>
          <SpringPressable accessibilityLabel="See all transactions">
            <Text style={[styles.sectionLink, { color: darkMode ? '#4F8EFF' : '#3B82F6' }]}>See All</Text>
          </SpringPressable>
        </Animated.View>

        {!d.recentTransactions || d.recentTransactions.length === 0 ? (
          <Animated.View
            entering={FadeInDown.delay(500).duration(600).springify()}
            style={[styles.emptyCard, darkMode ? CardPresets.cardDark : CardPresets.cardLight]}
          >
            <View style={[styles.emptyIconWrap, { backgroundColor: c.accentLight }]}>
              <Ionicons name="receipt-outline" size={32} color={c.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.textSecondary }]}>
              No transactions yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>
              Start scanning receipts to track expenses
            </Text>
          </Animated.View>
        ) : (
          d.recentTransactions.map((txn, i) => (
            <Animated.View
              key={txn.id || i}
              entering={FadeInDown.delay(i * 70 + 500).duration(500).springify()}
            >
              <SpringPressable
                style={[styles.txnRow, darkMode ? CardPresets.cardDark : CardPresets.cardLight]}
                accessibilityLabel={`Transaction: ${txn.customName || txn.merchant}`}
              >
                <View style={[styles.txnAvatar, {
                  backgroundColor: darkMode ? 'rgba(79,142,255,0.12)' : 'rgba(59,130,246,0.10)',
                }]}>
                  <Ionicons
                    name={CATEGORY_ICONS[txn.category] || 'receipt-outline'}
                    size={20}
                    color={darkMode ? '#4F8EFF' : '#3B82F6'}
                  />
                </View>
                <View style={styles.txnContent}>
                  <Text style={[styles.txnMerchant, { color: c.text }]} numberOfLines={1}>
                    {txn.customName || txn.merchant}
                  </Text>
                  <Text style={[styles.txnMeta, { color: c.textMuted }]}>
                    {txn.date} {'\u00B7'} {txn.category}
                  </Text>
                </View>
                <View style={styles.txnAmountWrap}>
                  <AmountText amount={-Math.abs(txn.amount)} style={styles.txnAmount} />
                  {txn.vat > 0 && (
                    <Text style={[styles.txnVat, { color: c.textMuted }]}>VAT {txn.vat} AED</Text>
                  )}
                </View>
              </SpringPressable>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* ── Floating Scan FAB with pulse glow ────────── */}
      <View style={styles.fabContainer}>
        {/* Glow layer behind */}
        <Animated.View style={[styles.fabGlow, fabGlowStyle]} pointerEvents="none" />
        <AnimatedTouchable
          style={[styles.fab, Shadow.limeMd, fabPressStyle]}
          onPress={onNavigateToScanner}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          activeOpacity={0.9}
          accessibilityLabel="Scan a receipt"
          accessibilityRole="button"
        >
          <Ionicons name="camera" size={24} color="#003516" />
          <Text style={styles.fabText}>Scan Receipt</Text>
        </AnimatedTouchable>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Scroll progress */
  scrollProgressContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    height: 2,
  },
  scrollProgressTrack: {
    height: 2,
    width: '100%',
  },
  scrollProgressBar: {
    height: 2,
    borderRadius: 1,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  headerLeft: { gap: 4 },
  greetingLabel: {
    ...Typography.overline,
    textTransform: 'uppercase',
  },
  greetingName: {
    ...Typography.hero,
    letterSpacing: -1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: BorderWidth.thin,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#FF4B6E',
    borderWidth: 2,
  },

  /* Balance Card */
  balanceCard: {
    marginHorizontal: Spacing.xxl,
    borderRadius: Radius.xxl,
    backgroundColor: '#111D35',
    borderWidth: BorderWidth.thin,
    borderColor: 'rgba(79,142,255,0.15)',
    marginBottom: Spacing.xxl,
    overflow: 'hidden',
  },
  cardAccentLine: {
    height: 3,
    backgroundColor: '#4F8EFF',
    opacity: 0.5,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
  },
  balanceCardInner: {
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  cardChip: {
    width: 40,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,215,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardChipInner: {
    width: 20,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
  },
  cardBrandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardBrandText: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 4,
  },
  cardBrandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#44e571',
    opacity: 0.6,
  },
  balanceSection: {
    gap: Spacing.sm,
  },
  balanceLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    flex: 1,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  vatBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(68,229,113,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#44e571',
  },

  /* Quick Actions */
  quickActions: {
    flexDirection: 'row',
    borderTopWidth: BorderWidth.thin,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  qaBtn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  qaBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.3,
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { ...Typography.valueS },
  statMax: { ...Typography.caption },
  statLabel: { ...Typography.micro, textAlign: 'center' },

  /* Alert Card */
  alertCard: {
    marginHorizontal: Spacing.xxl,
    borderRadius: Radius.lg,
    borderWidth: BorderWidth.thin,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxl,
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: { ...Typography.bodyBold },
  alertSub: { ...Typography.micro, marginTop: 2 },
  alertBtn: {
    backgroundColor: '#4F8EFF',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  alertBtnText: {
    color: '#FFFFFF',
    ...Typography.btnSmall,
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  sectionTitle: { ...Typography.cardTitle },
  sectionLink: { ...Typography.bodySmall, fontWeight: '700' },

  /* Transactions */
  txnRow: {
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.sm,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  txnAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnContent: { flex: 1 },
  txnMerchant: { ...Typography.bodyBold },
  txnMeta: { ...Typography.micro, marginTop: 3 },
  txnAmountWrap: { alignItems: 'flex-end' },
  txnAmount: { ...Typography.bodyBold },
  txnVat: { ...Typography.micro, marginTop: 2 },

  /* Empty State */
  emptyCard: {
    marginHorizontal: Spacing.xxl,
    paddingVertical: 48,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* FAB */
  fabContainer: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGlow: {
    position: 'absolute',
    width: 200,
    height: 54,
    borderRadius: Radius.pill,
    backgroundColor: '#44e571',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#44e571',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(0,83,31,0.3)',
  },
  fabText: {
    ...Typography.btnPrimary,
    color: '#003516',
  },
});
