import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
  TextInput,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TABS = ['Dashboard', 'Cards', 'Analytics', 'Recurring'];

const RECENT_SEND = [
  { name: 'Alex',   color: '#FDE68A' },
  { name: 'Priya',  color: '#FCA5A5' },
  { name: 'Sam',    color: '#A7F3D0' },
  { name: 'Liam',   color: '#C7D2FE' },
  { name: 'Nora',   color: '#FBCFE8' },
];

const ACTIVITY = [
  { id: 'a1', name: 'Salary',       subtitle: 'Monthly pay',     amount: 143,  type: 'in',  icon: 'briefcase-outline' },
  { id: 'a2', name: 'Amazon',       subtitle: 'Online order',    amount: -921, type: 'out', icon: 'bag-handle-outline' },
];

const BARS = [
  { m: 'Mar', a: 52, b: 30 },
  { m: 'Apr', a: 40, b: 48 },
  { m: 'May', a: 58, b: 34 },
  { m: 'Jun', a: 30, b: 52 },
  { m: 'Jul', a: 62, b: 38 },
  { m: 'Aug', a: 44, b: 56 },
];

const BILLS = [
  { id: 'b1', day: '13th', mo: 'Aug', name: 'Figma',  amt: '$50' },
  { id: 'b2', day: '15th', mo: 'Aug', name: 'Github', amt: '$11' },
];

const CARDS = [
  { id: 'c1', variant: 'blue',  label: 'Diamond',  holder: 'Erickson',     number: '1288 7068 2260 2640' },
  { id: 'c2', variant: 'black', label: 'Platinum', holder: 'Aden Erickson', number: '1288 7068 2260 2640' },
];

const RECURRING = [
  { id: 'r1', name: 'Netflix',  freq: 'Monthly', amt: '$15.99', icon: 'play-circle-outline' },
  { id: 'r2', name: 'Spotify',  freq: 'Monthly', amt: '$9.99',  icon: 'musical-notes-outline' },
  { id: 'r3', name: 'iCloud',   freq: 'Monthly', amt: '$2.99',  icon: 'cloud-outline' },
  { id: 'r4', name: 'Dropbox',  freq: 'Yearly',  amt: '$119',   icon: 'archive-outline' },
];

function Avatar({ name, color, size = 36 }) {
  const initials = (name || '?').slice(0, 1).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color || '#A7F3D0',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }}
    >
      <Text style={{ color: '#0B1435', fontWeight: '700', fontSize: size * 0.38 }}>
        {initials}
      </Text>
    </View>
  );
}

function PillTabs({ active, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4 }}
      style={{ flexGrow: 0 }}
    >
      {TABS.map((t) => {
        const isActive = t === active;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            hitSlop={8}
            style={[
              styles.pillTab,
              isActive ? styles.pillTabActive : styles.pillTabInactive,
            ]}
          >
            <Text
              style={[
                styles.pillTabText,
                { color: isActive ? '#3B6BFF' : 'rgba(255,255,255,0.78)' },
              ]}
            >
              {t}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Bar({ a, b, label, delay }) {
  const hA = useSharedValue(0);
  const hB = useSharedValue(0);

  useEffect(() => {
    hA.value = withDelay(delay, withTiming(a, { duration: 700 }));
    hB.value = withDelay(delay + 80, withTiming(b, { duration: 700 }));
  }, [a, b, delay, hA, hB]);

  const styleA = useAnimatedStyle(() => ({ height: hA.value }));
  const styleB = useAnimatedStyle(() => ({ height: hB.value }));

  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4 }}>
        <Animated.View style={[styles.barA, styleA]} />
        <Animated.View style={[styles.barB, styleB]} />
      </View>
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

function MiniCard({ variant, label, holder, number }) {
  const isBlue = variant === 'blue';
  const bg = isBlue ? '#3B6BFF' : '#111827';
  const accentBg = isBlue ? '#2E5BFF' : '#1F2937';
  return (
    <View style={[styles.miniCard, { backgroundColor: bg }]}>
      <View style={[styles.miniCardHighlight, { backgroundColor: accentBg }]} />
      <View style={styles.cardTopRow}>
        <Ionicons name="wifi" size={18} color="#FFFFFF" style={{ transform: [{ rotate: '90deg' }] }} />
        <Text style={styles.miniCardLabel}>{label}</Text>
      </View>
      <Text style={styles.miniCardNumber}>{number}</Text>
      <View style={styles.cardBottomRow}>
        <View>
          <Text style={styles.miniCardHolderLabel}>CARDHOLDER</Text>
          <Text style={styles.miniCardHolder}>{holder}</Text>
        </View>
        <Text style={styles.miniCardVisa}>VISA</Text>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation, darkMode = true }) {
  const { profile } = useAuth();
  const name = profile?.name || 'Friend';
  const [active, setActive] = useState('Dashboard');

  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const balance = useMemo(() => '$365,500', []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#3B6BFF" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        stickyHeaderIndices={[]}
      >
        {/* Blue hero */}
        <View style={styles.hero}>
          <Animated.View
            entering={FadeInDown.duration(500)}
            style={styles.heroTopRow}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Avatar name={name} color="#FDE68A" size={44} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.heroGreet}>Good Morning, {name}</Text>
                  <Ionicons name="hand-left-outline" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
                <Text style={styles.heroSubGreet}>Let's manage today's finance</Text>
              </View>
            </View>
            <Pressable style={styles.bellBtn} hitSlop={8}>
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
              <View style={styles.bellDot} />
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ marginTop: 14 }}>
            <PillTabs active={active} onChange={setActive} />
          </Animated.View>

          <View style={styles.heroContent}>
            {active === 'Dashboard' && (
              <Animated.View entering={FadeInUp.duration(500)} style={{ alignItems: 'center' }}>
                <Text style={styles.balanceLabel}>Balance</Text>
                <Text style={styles.balanceAmount}>{balance}</Text>
                <View style={styles.savedBanner}>
                  <Text style={styles.savedBannerText}>
                    🎉 You have saved $10 in last 30 days
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                </View>
              </Animated.View>
            )}

            {active === 'Analytics' && (
              <Animated.View entering={FadeInUp.duration(500)} style={styles.analyticsBox}>
                <View style={styles.analyticsHeader}>
                  <Text style={styles.analyticsTitle}>Spending by</Text>
                  <View style={styles.monthlyPill}>
                    <Text style={styles.monthlyText}>Monthly</Text>
                    <Ionicons name="chevron-down" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  </View>
                </View>
                <View style={styles.chartRow}>
                  <View style={styles.yAxis}>
                    <Text style={styles.yLabel}>$60</Text>
                    <Text style={styles.yLabel}>$40</Text>
                    <Text style={styles.yLabel}>$20</Text>
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row' }}>
                    {BARS.map((b, i) => (
                      <Bar key={b.m} a={b.a} b={b.b} label={b.m} delay={120 * i} />
                    ))}
                  </View>
                </View>
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FFFFFF' }]} />
                    <Text style={styles.legendText}>Earned</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: 'rgba(255,255,255,0.45)' }]} />
                    <Text style={styles.legendText}>Spent</Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {active === 'Cards' && (
              <Animated.View entering={FadeInUp.duration(500)}>
                <FlatList
                  horizontal
                  data={CARDS}
                  keyExtractor={(i) => i.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
                  renderItem={({ item }) => (
                    <MiniCard
                      variant={item.variant}
                      label={item.label}
                      holder={item.holder}
                      number={item.number}
                    />
                  )}
                />
              </Animated.View>
            )}

            {active === 'Recurring' && (
              <Animated.View entering={FadeInUp.duration(500)} style={{ paddingHorizontal: 20 }}>
                {RECURRING.map((r) => (
                  <View key={r.id} style={styles.recurringRow}>
                    <View style={styles.recurringIcon}>
                      <Ionicons name={r.icon} size={18} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.recurringName}>{r.name}</Text>
                      <Text style={styles.recurringFreq}>{r.freq}</Text>
                    </View>
                    <Text style={styles.recurringAmt}>{r.amt}</Text>
                  </View>
                ))}
              </Animated.View>
            )}
          </View>
        </View>

        {/* White bottom sheet */}
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />

          {active === 'Dashboard' && (
            <>
              <Animated.View entering={FadeInUp.delay(100).duration(400)}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Send</Text>
                  <Pressable hitSlop={8}>
                    <Text style={styles.sectionLink}>See all</Text>
                  </Pressable>
                </View>
                <View style={styles.recentSendRow}>
                  {RECENT_SEND.map((p, i) => (
                    <View key={p.name} style={{ alignItems: 'center', marginRight: 16 }}>
                      <Avatar name={p.name} color={p.color} size={52} />
                      <Text style={styles.recentName}>{p.name}</Text>
                    </View>
                  ))}
                  <Pressable style={styles.recentAdd} hitSlop={8}>
                    <Ionicons name="add" size={22} color="#3B6BFF" />
                  </Pressable>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(200).duration(400)}>
                <View style={[styles.sectionHeader, { marginTop: 22 }]}>
                  <Text style={styles.sectionTitle}>Current Activity</Text>
                </View>
                <View style={styles.searchRow}>
                  <View style={styles.searchInputWrap}>
                    <Ionicons name="search-outline" size={16} color="rgba(11,20,53,0.48)" />
                    <TextInput
                      placeholder="Search transactions"
                      placeholderTextColor="rgba(11,20,53,0.48)"
                      style={styles.searchInput}
                    />
                  </View>
                  <Pressable style={styles.filterBtn} hitSlop={8}>
                    <Ionicons name="options-outline" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>

                {ACTIVITY.map((a) => {
                  const isIn = a.type === 'in';
                  return (
                    <View key={a.id} style={styles.activityRow}>
                      <View style={[styles.activityIcon, { backgroundColor: isIn ? 'rgba(34,197,94,0.14)' : 'rgba(255,84,112,0.14)' }]}>
                        <Ionicons name={a.icon} size={18} color={isIn ? '#22C55E' : '#FF5470'} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.activityName}>{a.name}</Text>
                        <Text style={styles.activitySub}>{a.subtitle}</Text>
                      </View>
                      <Text style={[styles.activityAmt, { color: isIn ? '#22C55E' : '#FF5470' }]}>
                        {isIn ? '+' : '-'}${Math.abs(a.amount)}
                      </Text>
                    </View>
                  );
                })}
              </Animated.View>
            </>
          )}

          {active === 'Analytics' && (
            <>
              <Animated.View entering={FadeInUp.delay(100).duration(400)}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Budget</Text>
                </View>
                <View style={styles.budgetCard}>
                  <View style={styles.budgetIcon}>
                    <Ionicons name="locate-outline" size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.budgetTitle}>Set your budget goal</Text>
                    <Text style={styles.budgetSub}>Track monthly spending limits</Text>
                  </View>
                  <Pressable style={styles.budgetAdd} hitSlop={8}>
                    <Ionicons name="add" size={20} color="#0B1435" />
                  </Pressable>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(200).duration(400)}>
                <View style={[styles.sectionHeader, { marginTop: 22 }]}>
                  <Text style={styles.sectionTitle}>Bills Due</Text>
                  <Pressable hitSlop={8}>
                    <Text style={styles.sectionLink}>See all</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                >
                  {BILLS.map((b) => (
                    <View key={b.id} style={styles.billCard}>
                      <Text style={styles.billDay}>{b.day}</Text>
                      <Text style={styles.billMo}>{b.mo}</Text>
                      <Text style={styles.billName}>{b.name}</Text>
                      <Text style={styles.billAmt}>{b.amt}</Text>
                    </View>
                  ))}
                  <Pressable style={styles.billAddCard} hitSlop={8}>
                    <Ionicons name="add" size={22} color="#3B6BFF" />
                    <Text style={styles.billAddText}>Add a Bill</Text>
                  </Pressable>
                </ScrollView>
              </Animated.View>
            </>
          )}

          {active === 'Cards' && (
            <Animated.View entering={FadeInUp.delay(100).duration(400)}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Card Details</Text>
              </View>
              <Text style={styles.bodyMuted}>Tap a card above to manage it.</Text>
            </Animated.View>
          )}

          {active === 'Recurring' && (
            <Animated.View entering={FadeInUp.delay(100).duration(400)}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming</Text>
              </View>
              <Text style={styles.bodyMuted}>Your recurring subscriptions renew automatically.</Text>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Floating New Payment FAB */}
      <View pointerEvents="box-none" style={styles.fabWrap}>
        <AnimatedPressable
          onPressIn={() => { fabScale.value = withSpring(0.94, { damping: 14, stiffness: 240 }); }}
          onPressOut={() => { fabScale.value = withSpring(1, { damping: 14, stiffness: 240 }); }}
          onPress={() => navigation?.navigate?.('NewPayment')}
          style={[styles.fab, fabStyle]}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.fabText}>New Payment</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const HERO_H = 340;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#3B6BFF',
  },
  hero: {
    backgroundColor: '#3B6BFF',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroGreet: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  heroSubGreet: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginTop: 2,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5470',
    borderWidth: 1.5,
    borderColor: '#3B6BFF',
  },
  pillTab: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    minWidth: 44,
  },
  pillTabActive: {
    backgroundColor: '#FFFFFF',
  },
  pillTabInactive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  pillTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroContent: {
    paddingTop: 18,
    paddingBottom: 20,
    minHeight: 180,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: 6,
  },
  savedBanner: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  analyticsBox: {
    paddingHorizontal: 20,
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticsTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  monthlyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  monthlyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
  },
  yAxis: {
    justifyContent: 'space-between',
    height: 120,
    marginRight: 8,
  },
  yLabel: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 10,
    fontWeight: '600',
  },
  barA: {
    width: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  barB: {
    width: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  barLabel: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '600',
  },
  miniCard: {
    width: 220,
    height: 140,
    borderRadius: 18,
    padding: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  miniCardHighlight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniCardLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  miniCardNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  miniCardHolderLabel: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  miniCardHolder: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  miniCardVisa: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  recurringIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  recurringFreq: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    marginTop: 2,
  },
  recurringAmt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -12,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: 420,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(11,20,53,0.14)',
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#0B1435',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionLink: {
    color: '#3B6BFF',
    fontSize: 13,
    fontWeight: '700',
  },
  recentSendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  recentName: {
    color: '#0B1435',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  recentAdd: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(59,107,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchInputWrap: {
    flex: 1,
    height: 44,
    backgroundColor: '#F3F6FC',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(11,20,53,0.06)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#0B1435',
    fontSize: 14,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#3B6BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11,20,53,0.06)',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityName: {
    color: '#0B1435',
    fontSize: 14,
    fontWeight: '700',
  },
  activitySub: {
    color: 'rgba(11,20,53,0.58)',
    fontSize: 12,
    marginTop: 2,
  },
  activityAmt: {
    fontSize: 14,
    fontWeight: '800',
  },
  budgetCard: {
    backgroundColor: '#0B1435',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  budgetSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 2,
  },
  budgetAdd: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billCard: {
    width: 120,
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#F3F6FC',
    borderWidth: 1,
    borderColor: 'rgba(11,20,53,0.06)',
  },
  billDay: {
    color: '#0B1435',
    fontSize: 18,
    fontWeight: '800',
  },
  billMo: {
    color: 'rgba(11,20,53,0.58)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
    marginBottom: 10,
  },
  billName: {
    color: '#0B1435',
    fontSize: 13,
    fontWeight: '700',
  },
  billAmt: {
    color: '#3B6BFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  billAddCard: {
    width: 120,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(59,107,255,0.08)',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(59,107,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billAddText: {
    color: '#3B6BFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  bodyMuted: {
    color: 'rgba(11,20,53,0.58)',
    fontSize: 13,
  },
  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B6BFF',
    shadowColor: '#3B6BFF',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
});
