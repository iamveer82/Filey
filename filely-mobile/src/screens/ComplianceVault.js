import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInUp, FadeIn, Layout,
  useSharedValue, useAnimatedStyle, withSpring, withRepeat,
  withTiming, withSequence, interpolate,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SpringPressable({ children, style, onPress, disabled, ...rest }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
      style={[style, anim]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

function BreathingShield() {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withRepeat(withSequence(
      withTiming(1.08, { duration: 1400 }),
      withTiming(1, { duration: 1400 }),
    ), -1, false);
  }, []);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[styles.shield, anim]}>
      <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
    </Animated.View>
  );
}

function StatPill({ label, value }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ComplianceVault({ darkMode }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { orgId } = useAuth();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const d = await api.getFiles();
      setFiles(d.files || []);
    } catch {
      Alert.alert('Error', 'Failed to load vault records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await api.getFiles();
      setFiles(d.files || []);
    } catch {} finally { setRefreshing(false); }
  }, []);

  const generateReport = async () => {
    setExporting(true);
    try {
      await api.exportFiles();
      Alert.alert('Export Successful', 'FTA-compliant report generated.');
    } catch {
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setExporting(false);
    }
  };

  const filtered = files.filter((f) => {
    const q = search.toLowerCase();
    const matchesSearch = !q
      || (f.merchant || '').toLowerCase().includes(q)
      || (f.trn || '').includes(search)
      || (f.date || '').includes(search);
    if (filter === 'vat') return matchesSearch && parseFloat(f.vat) > 0;
    if (filter === 'flagged') return matchesSearch && f.status === 'flagged';
    return matchesSearch;
  });

  const vatTotal = files.reduce((sum, f) => sum + (parseFloat(f.vat) || 0), 0);
  const flaggedCount = files.filter(f => f.status === 'flagged').length;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <View style={[styles.hero, { paddingTop: insets.top + 10 }]}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.heroInner}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>FTA ARCHIVE</Text>
              <Text style={styles.heroTitle}>5-Year Vault</Text>
              <Text style={styles.heroSub}>Tamper-proof compliance storage</Text>
            </View>
            <BreathingShield />
          </View>

          <View style={styles.statRow}>
            <StatPill label="Records" value={files.length.toString()} />
            <StatPill label="VAT AED" value={vatTotal.toFixed(0)} />
            <StatPill label="Flagged" value={flaggedCount.toString()} />
          </View>
        </Animated.View>
      </View>

      <View style={[styles.sheet, { backgroundColor: c.bg }]}>
        <View style={styles.handle} />

        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <Animated.View
            entering={FadeInUp.delay(80).duration(400)}
            style={[styles.searchBar, { backgroundColor: c.card, borderColor: c.borderSubtle }]}
          >
            <Ionicons name="search-outline" size={18} color={c.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search merchant, TRN, date…"
              placeholderTextColor={c.textMuted}
              style={[styles.searchInput, { color: c.text }]}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={c.textMuted} />
              </Pressable>
            )}
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(120).duration(400)} style={styles.filterRow}>
            {[['all', 'All'], ['vat', 'VAT only'], ['flagged', 'Flagged']].map(([v, l]) => {
              const active = filter === v;
              return (
                <SpringPressable
                  key={v}
                  onPress={() => setFilter(v)}
                  style={[
                    styles.filterPill,
                    { backgroundColor: active ? c.primary : c.card, borderColor: active ? c.primary : c.borderSubtle },
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={{ color: active ? '#FFFFFF' : c.text, fontSize: 13, fontWeight: '700' }}>{l}</Text>
                </SpringPressable>
              );
            })}
            <View style={{ flex: 1 }} />
            <SpringPressable
              onPress={generateReport}
              disabled={exporting}
              style={[styles.exportBtn, { backgroundColor: c.primaryLight }]}
            >
              {exporting
                ? <ActivityIndicator size="small" color={c.primary} />
                : <Ionicons name="download-outline" size={16} color={c.primary} />}
              <Text style={{ color: c.primary, fontSize: 12.5, fontWeight: '700' }}>Export</Text>
            </SpringPressable>
          </Animated.View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 140 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
          }
        >
          {loading && (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={c.primary} />
            </View>
          )}

          {!loading && filtered.length === 0 && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: c.primaryLight }]}>
                <Ionicons name="file-tray-outline" size={36} color={c.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: c.text }]}>No records</Text>
              <Text style={[styles.emptySub, { color: c.textMuted }]}>
                {search || filter !== 'all' ? 'Nothing matches your filter.' : 'Scan your first receipt to start.'}
              </Text>
            </Animated.View>
          )}

          {!loading && filtered.map((f, i) => {
            const flagged = f.status === 'flagged';
            const vat = parseFloat(f.vat) || 0;
            return (
              <Animated.View
                key={f.id || i}
                entering={FadeInUp.delay(Math.min(i * 40, 240)).duration(400)}
                layout={Layout.springify()}
              >
                <SpringPressable
                  onPress={() => {}}
                  style={[styles.card, { backgroundColor: c.card, borderColor: flagged ? c.negative : c.borderSubtle }]}
                  accessibilityLabel={`Record ${f.customName || f.merchant}`}
                >
                  <View style={[styles.cardIcon, { backgroundColor: flagged ? c.negativeLight : c.primaryLight }]}>
                    <Ionicons
                      name={flagged ? 'alert-circle' : 'receipt'}
                      size={18}
                      color={flagged ? c.negative : c.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={1}>
                      {f.customName || f.merchant || 'Untitled'}
                    </Text>
                    <Text style={[styles.cardMeta, { color: c.textMuted }]} numberOfLines={1}>
                      {f.date || '—'}{f.category ? ` · ${f.category}` : ''}{f.trn ? ` · ${f.trn}` : ''}
                    </Text>
                    {vat > 0 && (
                      <View style={[styles.vatChip, { backgroundColor: c.primaryLight }]}>
                        <Ionicons name="shield-checkmark" size={10} color={c.primary} />
                        <Text style={{ color: c.primary, fontSize: 11, fontWeight: '700' }}>
                          VAT {vat.toFixed(2)} AED
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.cardAmount, { color: c.text }]}>
                      {parseFloat(f.amount || 0).toLocaleString('en-AE', { maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={[styles.cardCurrency, { color: c.textMuted }]}>AED</Text>
                  </View>
                </SpringPressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#2A63E2',
    paddingBottom: 44,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroInner: { gap: 20 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroKicker: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  shield: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  statRow: { flexDirection: 'row', gap: 8 },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10.5, fontWeight: '600', marginTop: 2, letterSpacing: 0.6 },
  sheet: {
    flex: 1, marginTop: -24,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 8,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(11,23,53,0.15)',
    alignSelf: 'center', marginTop: 6, marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 16, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14.5 },
  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginTop: 12,
  },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 18, borderWidth: 1,
  },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
  },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptySub: { fontSize: 13.5, textAlign: 'center', marginTop: 6 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 18, borderWidth: 1,
    marginBottom: 10,
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardMeta: { fontSize: 12, marginTop: 3 },
  vatChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  cardAmount: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  cardCurrency: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
