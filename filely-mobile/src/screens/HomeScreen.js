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
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal, Switch } from 'react-native';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TABS = ['Dashboard', 'Cards', 'Analytics', 'Recurring'];

const RECENT_SEND = [
  { name: 'Agnes',  color: '#FDE68A' },
  { name: 'Isyana', color: '#FCA5A5' },
  { name: 'Nurdin', color: '#A7F3D0' },
  { name: 'Budi',   color: '#C7D2FE' },
  { name: 'Broto',  color: '#FBCFE8' },
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

const METRIC_LIBRARY = {
  m_balance: {
    id: 'm_balance', label: 'Total Balance', sub: 'All accounts',
    amount: 365500, prefix: '$', delta: '+2.4%', deltaUp: true,
    icon: 'wallet', gradient: ['#3B6BFF', '#2E5BFF', '#1E3A8A'], chipLabel: 'PRIMARY',
  },
  m_income: {
    id: 'm_income', label: 'Income', sub: 'This month',
    amount: 12480, prefix: '$', delta: '+18.2%', deltaUp: true,
    icon: 'arrow-down-circle', gradient: ['#16A34A', '#0F7A37', '#064E21'], chipLabel: 'INCOMING',
  },
  m_spend: {
    id: 'm_spend', label: 'Spending', sub: 'This month',
    amount: 4832, prefix: '$', delta: '-6.8%', deltaUp: false,
    icon: 'arrow-up-circle', gradient: ['#0B1435', '#1A2654', '#0B1435'], chipLabel: 'OUTGOING',
  },
  m_savings: {
    id: 'm_savings', label: 'Savings', sub: 'Year-to-date',
    amount: 48200, prefix: '$', delta: '+31.5%', deltaUp: true,
    icon: 'trending-up', gradient: ['#8B5CF6', '#6D28D9', '#4C1D95'], chipLabel: 'GROWTH',
  },
  m_vat: {
    id: 'm_vat', label: 'VAT Payable', sub: 'Current quarter',
    amount: 3420, prefix: 'AED ', delta: '-4.1%', deltaUp: false,
    icon: 'receipt', gradient: ['#F59E0B', '#B45309', '#78350F'], chipLabel: 'FTA',
  },
  m_invest: {
    id: 'm_invest', label: 'Investments', sub: 'Portfolio value',
    amount: 89450, prefix: '$', delta: '+12.7%', deltaUp: true,
    icon: 'trending-up-outline', gradient: ['#EC4899', '#BE185D', '#831843'], chipLabel: 'EQUITY',
  },
  m_debt: {
    id: 'm_debt', label: 'Debt', sub: 'Outstanding',
    amount: 12300, prefix: '$', delta: '-8.4%', deltaUp: true,
    icon: 'card-outline', gradient: ['#475569', '#1E293B', '#0F172A'], chipLabel: 'LIABILITY',
  },
};

const DEFAULT_METRIC_IDS = ['m_balance', 'm_income', 'm_spend'];
const STORAGE_KEY = '@filey/home_metrics_v1';

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

function PillTab({ t, isActive, onPress }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={anim}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.94, { damping: 14, stiffness: 420 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 320 }); }}
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
    </Animated.View>
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
      {TABS.map((t) => (
        <PillTab key={t} t={t} isActive={t === active} onPress={() => onChange(t)} />
      ))}
    </ScrollView>
  );
}

const CARD_W = SCREEN_W * 0.78;
const CARD_GAP = 14;
const SNAP = CARD_W + CARD_GAP;

function formatMoney(n, prefix) {
  return `${prefix}${Math.round(n).toLocaleString('en-US')}`;
}

function CountUpText({ to, prefix = '$', style }) {
  const v = useSharedValue(0);
  const [display, setDisplay] = useState(`${prefix}0`);

  useEffect(() => {
    v.value = 0;
    v.value = withTiming(to, { duration: 900 });
    const id = setInterval(() => {
      setDisplay(formatMoney(v.value, prefix));
    }, 16);
    const stop = setTimeout(() => {
      clearInterval(id);
      setDisplay(formatMoney(to, prefix));
    }, 950);
    return () => { clearInterval(id); clearTimeout(stop); };
  }, [to, prefix]);

  return <Text style={style}>{display}</Text>;
}

function MetricCard({ item, index, scrollX }) {
  const inputRange = [(index - 1) * SNAP, index * SNAP, (index + 1) * SNAP];

  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollX.value, inputRange, [0.92, 1, 0.92], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.55, 1, 0.55], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [10, 0, 10], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }], opacity };
  });

  return (
    <Animated.View style={[{ width: CARD_W, marginRight: CARD_GAP }, cardStyle]}>
      <LinearGradient
        colors={item.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metricCard}
      >
        <View style={styles.metricBlob1} />
        <View style={styles.metricBlob2} />

        <View style={styles.metricTop}>
          <View style={styles.metricIconWrap}>
            <Ionicons name={item.icon} size={18} color="#FFFFFF" />
          </View>
          <View style={styles.metricChip}>
            <Text style={styles.metricChipText}>{item.chipLabel}</Text>
          </View>
        </View>

        <View style={{ marginTop: 'auto' }}>
          <Text style={styles.metricLabel}>{item.label}</Text>
          <CountUpText to={item.amount} prefix={item.prefix} style={styles.metricAmount} />
          <View style={styles.metricBottomRow}>
            <Text style={styles.metricSub}>{item.sub}</Text>
            <View style={[styles.deltaPill, { backgroundColor: item.deltaUp ? 'rgba(34,197,94,0.22)' : 'rgba(255,84,112,0.22)' }]}>
              <Ionicons
                name={item.deltaUp ? 'trending-up' : 'trending-down'}
                size={12}
                color={item.deltaUp ? '#A7F3D0' : '#FCA5A5'}
              />
              <Text style={[styles.deltaText, { color: item.deltaUp ? '#A7F3D0' : '#FCA5A5' }]}>{item.delta}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function Dot({ i, scrollX }) {
  const dotStyle = useAnimatedStyle(() => {
    const inputRange = [(i - 1) * SNAP, i * SNAP, (i + 1) * SNAP];
    const w = interpolate(scrollX.value, inputRange, [6, 22, 6], Extrapolation.CLAMP);
    const o = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP);
    return { width: w, opacity: o };
  });
  return <Animated.View style={[styles.dot, dotStyle]} />;
}

function MetricCarousel({ metrics, onOpenCustomize }) {
  const scrollX = useSharedValue(0);
  const [activeIdx, setActiveIdx] = useState(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
      const idx = Math.round(e.contentOffset.x / SNAP);
      if (idx !== activeIdx) runOnJS(setActiveIdx)(idx);
    },
  });

  useEffect(() => {
    try { Haptics.selectionAsync(); } catch {}
  }, [activeIdx]);

  if (!metrics?.length) {
    return (
      <Animated.View entering={FadeInUp.duration(500).delay(80)} style={styles.emptyCarousel}>
        <Ionicons name="albums-outline" size={28} color="rgba(255,255,255,0.7)" />
        <Text style={styles.emptyCarouselText}>No cards visible</Text>
        <Pressable onPress={onOpenCustomize} style={styles.emptyCarouselBtn}>
          <Ionicons name="add" size={14} color="#3B6BFF" />
          <Text style={styles.emptyCarouselBtnText}>Add a card</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(80)}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SNAP}
        snapToAlignment="start"
        contentContainerStyle={{
          paddingHorizontal: (SCREEN_W - CARD_W) / 2,
          paddingVertical: 12,
        }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {metrics.map((m, i) => (
          <MetricCard key={m.id} item={m} index={i} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>

      <View style={styles.dotsRow}>
        {metrics.map((_, i) => <Dot key={i} i={i} scrollX={scrollX} />)}
      </View>
    </Animated.View>
  );
}

function CustomizeSheet({ visible, onClose, ids, setIds }) {
  const [local, setLocal] = useState(ids);
  useEffect(() => { if (visible) setLocal(ids); }, [visible, ids]);

  const toggle = (id) => {
    try { Haptics.selectionAsync(); } catch {}
    setLocal(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const move = (id, dir) => {
    setLocal(prev => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };

  const save = () => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setIds(local);
    onClose();
  };

  const reset = () => {
    setLocal(DEFAULT_METRIC_IDS);
  };

  const allIds = Object.keys(METRIC_LIBRARY);
  const ordered = [
    ...local,
    ...allIds.filter(id => !local.includes(id)),
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.customSheet} onPress={() => {}}>
          <View style={styles.customHandle} />
          <View style={styles.customHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.customTitle}>Customize Dashboard</Text>
              <Text style={styles.customSub}>Toggle visibility, reorder, or add new cards.</Text>
            </View>
            <Pressable onPress={reset} hitSlop={8} style={styles.resetBtn}>
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {ordered.map((id) => {
              const m = METRIC_LIBRARY[id];
              if (!m) return null;
              const enabled = local.includes(id);
              const idx = local.indexOf(id);
              return (
                <View key={id} style={styles.customRow}>
                  <LinearGradient
                    colors={m.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.customDot}
                  >
                    <Ionicons name={m.icon} size={14} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customRowLabel}>{m.label}</Text>
                    <Text style={styles.customRowSub}>{m.sub}</Text>
                  </View>
                  {enabled && (
                    <View style={styles.orderControls}>
                      <Pressable onPress={() => move(id, -1)} hitSlop={8} disabled={idx === 0} style={[styles.orderBtn, idx === 0 && { opacity: 0.35 }]}>
                        <Ionicons name="chevron-up" size={14} color="#0B1435" />
                      </Pressable>
                      <Pressable onPress={() => move(id, 1)} hitSlop={8} disabled={idx === local.length - 1} style={[styles.orderBtn, idx === local.length - 1 && { opacity: 0.35 }]}>
                        <Ionicons name="chevron-down" size={14} color="#0B1435" />
                      </Pressable>
                    </View>
                  )}
                  <Switch
                    value={enabled}
                    onValueChange={() => toggle(id)}
                    trackColor={{ false: '#E5E7EB', true: '#3B6BFF' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.customFooter}>
            <Pressable onPress={save} style={styles.saveBtn}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.saveText}>Save changes</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
  const [metricIds, setMetricIds] = useState(DEFAULT_METRIC_IDS);
  const [showCustomize, setShowCustomize] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) setMetricIds(parsed);
        }
      } catch {}
    })();
  }, []);

  const persistMetrics = (next) => {
    setMetricIds(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const visibleMetrics = useMemo(
    () => metricIds.map(id => METRIC_LIBRARY[id]).filter(Boolean),
    [metricIds]
  );

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {active === 'Dashboard' && (
                <Pressable
                  style={styles.bellBtn}
                  hitSlop={8}
                  onPress={() => setShowCustomize(true)}
                  accessibilityLabel="Customize dashboard"
                >
                  <Ionicons name="options-outline" size={20} color="#FFFFFF" />
                </Pressable>
              )}
              <Pressable style={styles.bellBtn} hitSlop={8}>
                <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
                <View style={styles.bellDot} />
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ marginTop: 14 }}>
            <PillTabs active={active} onChange={setActive} />
          </Animated.View>

          <View style={styles.heroContent}>
            {active === 'Dashboard' && (
              <MetricCarousel
                metrics={visibleMetrics}
                onOpenCustomize={() => setShowCustomize(true)}
              />
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

      <CustomizeSheet
        visible={showCustomize}
        onClose={() => setShowCustomize(false)}
        ids={metricIds}
        setIds={persistMetrics}
      />
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
    paddingTop: 4,
    paddingBottom: 12,
    minHeight: 220,
  },
  metricCard: {
    height: 190,
    borderRadius: 26,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#0B1435',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  metricBlob1: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -60, right: -40,
  },
  metricBlob2: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -30, left: -30,
  },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  metricChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  metricChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  metricLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 12.5, fontWeight: '600', letterSpacing: 0.4 },
  metricAmount: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: -1.2, marginTop: 2 },
  metricBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  metricSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  deltaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  deltaText: { fontSize: 11, fontWeight: '800' },
  dotsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 2,
  },
  dot: {
    height: 6, borderRadius: 3,
    backgroundColor: '#FFFFFF',
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
  emptyCarousel: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 30, gap: 8,
  },
  emptyCarouselText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  emptyCarouselBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    marginTop: 4,
  },
  emptyCarouselBtnText: { color: '#3B6BFF', fontSize: 13, fontWeight: '700' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  customSheet: {
    backgroundColor: '#F3F6FC',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '85%',
  },
  customHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(11,23,53,0.18)',
    alignSelf: 'center', marginTop: 8, marginBottom: 6,
  },
  customHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(11,23,53,0.06)',
  },
  customTitle: { fontSize: 20, fontWeight: '800', color: '#0B1435', letterSpacing: -0.4 },
  customSub: { fontSize: 12.5, color: 'rgba(11,23,53,0.6)', marginTop: 2 },
  resetBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, backgroundColor: 'rgba(59,107,255,0.1)',
  },
  resetText: { color: '#3B6BFF', fontWeight: '700', fontSize: 12.5 },
  customRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 14, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(11,23,53,0.06)',
  },
  customDot: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  customRowLabel: { fontSize: 14.5, fontWeight: '700', color: '#0B1435' },
  customRowSub: { fontSize: 12, color: 'rgba(11,23,53,0.55)', marginTop: 2 },
  orderControls: { flexDirection: 'column', gap: 2 },
  orderBtn: {
    width: 28, height: 22, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(11,23,53,0.06)',
  },
  customFooter: {
    padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: 'rgba(11,23,53,0.06)',
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#3B6BFF', height: 52, borderRadius: 26,
    shadowColor: '#3B6BFF', shadowOpacity: 0.3, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
