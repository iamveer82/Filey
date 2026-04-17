/**
 * ComplianceVault — Premium 5-Year FTA Vault
 * Staggered list animations, skeleton loading, pull-to-refresh,
 * spring press feedback on cards and buttons.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ---------------------------------------------------------------------------
//  Skeleton shimmer placeholder
// ---------------------------------------------------------------------------
function SkeletonCard({ darkMode, index }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const shimmer = useSharedValue(0.35);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  return (
    <Animated.View
      entering={FadeIn.delay(index * 120).duration(400)}
      style={[
        styles.fileCard,
        darkMode ? CardPresets.cardDark : CardPresets.cardLight,
        { marginHorizontal: Spacing.xxl },
      ]}
    >
      <View style={styles.fileRow}>
        <Animated.View
          style={[
            pulseStyle,
            styles.fileIcon,
            { backgroundColor: darkMode ? 'rgba(59,107,255,0.08)' : 'rgba(59,107,255,0.06)' },
          ]}
        />
        <View style={{ flex: 1, gap: 6 }}>
          <Animated.View
            style={[
              pulseStyle,
              { width: '65%', height: 14, borderRadius: 6, backgroundColor: c.surfaceLow },
            ]}
          />
          <Animated.View
            style={[
              pulseStyle,
              { width: '40%', height: 10, borderRadius: 4, backgroundColor: c.surfaceLow },
            ]}
          />
        </View>
        <Animated.View
          style={[
            pulseStyle,
            { width: 60, height: 14, borderRadius: 6, backgroundColor: c.surfaceLow },
          ]}
        />
      </View>
      <View style={[styles.footer, { borderTopColor: c.border }]}>
        <Animated.View
          style={[
            pulseStyle,
            { width: 80, height: 20, borderRadius: 6, backgroundColor: c.surfaceLow },
          ]}
        />
        <Animated.View
          style={[
            pulseStyle,
            { width: 48, height: 20, borderRadius: 6, backgroundColor: c.surfaceLow },
          ]}
        />
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
//  Animated empty-state folder icon (breathing scale)
// ---------------------------------------------------------------------------
function BreathingFolder({ color }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={breathStyle}>
      <Ionicons name="folder-open-outline" size={56} color={color} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
//  Pressable card wrapper with spring scale
// ---------------------------------------------------------------------------
function PressableCard({ children, style, onPress, accessibilityLabel }) {
  const pressed = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  const handlePressIn = () => {
    pressed.value = withSpring(0.97, { damping: 15, stiffness: 200 });
  };
  const handlePressOut = () => {
    pressed.value = withSpring(1, { damping: 12, stiffness: 180 });
  };

  return (
    <AnimatedTouchable
      activeOpacity={0.92}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[animStyle, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      {children}
    </AnimatedTouchable>
  );
}

// ---------------------------------------------------------------------------
//  Filter tab with spring scale on press
// ---------------------------------------------------------------------------
function FilterTab({ label, active, onPress, activeColor, inactiveColor, textColor, activeTextColor, borderActive, borderInactive }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 14, stiffness: 220 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
  };

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animStyle,
        styles.tab,
        {
          backgroundColor: active ? activeColor : inactiveColor,
          borderColor: active ? borderActive : borderInactive,
        },
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabText, { color: active ? activeTextColor : textColor }]}>
        {label}
      </Text>
    </AnimatedTouchable>
  );
}

// ---------------------------------------------------------------------------
//  Export button with spring press + lime glow
// ---------------------------------------------------------------------------
function ExportButton({ onPress, exporting, darkMode }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.93, { damping: 14, stiffness: 220 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
  };

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={exporting}
      style={[animStyle, styles.exportBtn, Shadow.limeMd]}
      accessibilityRole="button"
      accessibilityLabel="Generate FTA report"
    >
      {exporting ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <Ionicons name="hourglass-outline" size={16} color="#003516" />
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(200)} style={styles.exportInner}>
          <Ionicons name="download-outline" size={16} color="#003516" />
          <Text style={styles.exportText}>FTA Report</Text>
        </Animated.View>
      )}
    </AnimatedTouchable>
  );
}

// ===========================================================================
//  MAIN COMPONENT
// ===========================================================================
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
  const [searchFocused, setSearchFocused] = useState(false);

  // Search-bar focus border animation
  const searchBorderAnim = useSharedValue(0);
  const searchBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      searchBorderAnim.value,
      [0, 1],
      [c.border, c.accent]
    ),
  }));

  // ---- API calls (unchanged business logic) ----
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

  useEffect(() => {
    fetchFiles();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await api.getFiles();
      setFiles(d.files || []);
    } catch {
      Alert.alert('Error', 'Failed to refresh vault records');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const generateReport = async () => {
    setExporting(true);
    try {
      await api.exportFiles();
      Alert.alert('Export Successful', 'Your FTA-compliant report has been generated.');
    } catch {
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setExporting(false);
    }
  };

  // ---- Filtering (unchanged business logic) ----
  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      !search ||
      (f.merchant || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.trn || '').includes(search) ||
      (f.date || '').includes(search);
    if (filter === 'vat only') return matchesSearch && parseFloat(f.vat) > 0;
    if (filter === 'flagged') return matchesSearch && f.status === 'flagged';
    return matchesSearch;
  });

  // Handle search focus
  const handleSearchFocus = () => {
    setSearchFocused(true);
    searchBorderAnim.value = withTiming(1, { duration: 250 });
  };
  const handleSearchBlur = () => {
    setSearchFocused(false);
    searchBorderAnim.value = withTiming(0, { duration: 250 });
  };

  // ---- Render ----
  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top + 16 }]}>
      {/* ── Header ── */}
      <Animated.View
        entering={FadeInDown.duration(600).springify().damping(18).stiffness(140)}
        style={styles.header}
      >
        <View>
          <Text style={[styles.title, { color: c.text }]}>5-Year Vault</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>FTA Compliance Archive</Text>
        </View>
        <ExportButton
          onPress={generateReport}
          exporting={exporting}
          darkMode={darkMode}
        />
      </Animated.View>

      {/* ── Search Bar ── */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(500).springify().damping(18)}
        style={[
          styles.searchBar,
          { backgroundColor: c.surfaceLow },
          searchBorderStyle,
          searchFocused && styles.searchBarFocused,
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={searchFocused ? c.accent : c.textMuted}
        />
        <TextInput
          style={[styles.input, { color: c.text }]}
          placeholder="Search by merchant, TRN, or date..."
          placeholderTextColor={c.textMuted}
          value={search}
          onChangeText={setSearch}
          onFocus={handleSearchFocus}
          onBlur={handleSearchBlur}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search vault records"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Clear search"
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={18} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ── Filter Tabs ── */}
      <Animated.View
        entering={FadeInDown.delay(160).duration(500).springify().damping(18)}
        style={styles.tabBar}
      >
        {[
          ['all', 'All'],
          ['vat only', 'VAT Only'],
          ['flagged', 'Flagged'],
        ].map(([val, label]) => (
          <FilterTab
            key={val}
            label={label}
            active={filter === val}
            onPress={() => setFilter(val)}
            activeColor="#3B6BFF"
            inactiveColor={c.surfaceLow}
            textColor={c.text}
            activeTextColor="#003516"
            borderActive="#2E5BFF"
            borderInactive={c.border}
          />
        ))}
        {/* Record count badge */}
        {!loading && (
          <Animated.View
            entering={FadeIn.delay(300).duration(300)}
            style={[styles.countBadge, { backgroundColor: c.accentLight }]}
          >
            <Text style={[styles.countText, { color: c.accent }]}>
              {filteredFiles.length}
            </Text>
          </Animated.View>
        )}
      </Animated.View>

      {/* ── File List ── */}
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.accent}
            colors={['#3B6BFF']}
            progressBackgroundColor={c.card}
          />
        }
      >
        {loading ? (
          /* ── Skeleton Loading ── */
          <View>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} darkMode={darkMode} index={i} />
            ))}
          </View>
        ) : filteredFiles.length === 0 ? (
          /* ── Empty State ── */
          <Animated.View
            entering={FadeIn.delay(100).duration(500)}
            style={[
              styles.emptyCard,
              darkMode ? CardPresets.cardDark : CardPresets.cardLight,
              { marginHorizontal: Spacing.xxl },
            ]}
          >
            <BreathingFolder color={c.textMuted} />
            <Text style={[styles.emptyTitle, { color: c.textSecondary }]}>
              No records found
            </Text>
            <Text style={[styles.emptyHint, { color: c.textMuted }]}>
              {search
                ? 'Try adjusting your search or filter criteria'
                : 'Upload receipts to start building your compliance vault'}
            </Text>
          </Animated.View>
        ) : (
          /* ── File Cards (staggered) ── */
          filteredFiles.map((file, i) => (
            <Animated.View
              key={file.id || i}
              entering={FadeInDown.delay(i * 60)
                .duration(400)
                .springify()
                .damping(16)
                .stiffness(140)}
            >
              <PressableCard
                style={[
                  styles.fileCard,
                  darkMode ? CardPresets.cardDark : CardPresets.cardLight,
                  { marginHorizontal: Spacing.xxl },
                ]}
                accessibilityLabel={`View ${file.customName || file.merchant}`}
              >
                {/* Top row: icon + name + amount */}
                <View style={styles.fileRow}>
                  <View
                    style={[
                      styles.fileIcon,
                      {
                        backgroundColor: darkMode
                          ? 'rgba(59,107,255,0.12)'
                          : 'rgba(59,107,255,0.08)',
                      },
                    ]}
                  >
                    <Ionicons name="document-text" size={20} color="#3B6BFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fileName, { color: c.text }]} numberOfLines={1}>
                      {file.customName || file.merchant}
                    </Text>
                    <Text style={[styles.fileMeta, { color: c.textMuted }]}>
                      {file.date} · {file.category}
                    </Text>
                  </View>
                  <Text style={[styles.fileAmount, { color: c.negative }]}>
                    -
                    {parseFloat(file.amount || 0).toLocaleString('en-AE', {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </View>

                {/* Footer: tags + view action */}
                <View style={[styles.footer, { borderTopColor: c.borderSubtle }]}>
                  {parseFloat(file.vat) > 0 && (
                    <Animated.View
                      entering={SlideInRight.delay(i * 60 + 200).duration(300).springify()}
                      style={[styles.tag, styles.vatTag]}
                    >
                      <View style={styles.tagGlow} />
                      <Text style={styles.vatTagText}>
                        VAT: {parseFloat(file.vat).toFixed(2)} AED
                      </Text>
                    </Animated.View>
                  )}
                  {file.trn && (
                    <Animated.View
                      entering={SlideInRight.delay(i * 60 + 280).duration(300).springify()}
                      style={[styles.tag, styles.trnTag]}
                    >
                      <View style={styles.trnTagGlow} />
                      <Text style={styles.trnTagText}>TRN</Text>
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color="#3B6BFF"
                        style={{ marginLeft: 2 }}
                      />
                    </Animated.View>
                  )}
                  {file.status === 'flagged' && (
                    <Animated.View
                      entering={SlideInRight.delay(i * 60 + 340).duration(300).springify()}
                      style={[styles.tag, styles.flagTag]}
                    >
                      <Ionicons name="warning" size={11} color="#F59E0B" />
                      <Text style={styles.flagTagText}>Flagged</Text>
                    </Animated.View>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.viewBtn,
                      {
                        backgroundColor: c.surfaceLow,
                        borderColor: c.border,
                      },
                    ]}
                    accessibilityLabel={`View details for ${file.customName || file.merchant}`}
                    accessibilityRole="button"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="eye-outline" size={16} color={c.text} />
                  </TouchableOpacity>
                </View>
              </PressableCard>
            </Animated.View>
          ))
        )}
      </Animated.ScrollView>
    </View>
  );
}

// ===========================================================================
//  STYLES
// ===========================================================================
const styles = StyleSheet.create({
  /* Layout */
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.sectionTitle,
    fontSize: 22,
    letterSpacing: -0.6,
  },
  subtitle: {
    ...Typography.micro,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  /* Export button */
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3B6BFF',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(59,107,255,0.35)',
    minHeight: 44,
    minWidth: 44,
  },
  exportInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exportText: {
    color: '#003516',
    ...Typography.btnSmall,
  },

  /* Search bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    marginBottom: Spacing.md,
    minHeight: 48,
  },
  searchBarFocused: {
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    ...Typography.bodySmall,
    paddingVertical: 0,
  },
  clearBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Filter tabs */
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    ...Typography.btnSmall,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    marginLeft: 'auto',
  },
  countText: {
    ...Typography.micro,
    fontWeight: '800',
  },

  /* Empty state */
  emptyCard: {
    padding: Spacing.xxxl,
    paddingVertical: 48,
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.bodyBold,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  emptyHint: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },

  /* File cards */
  fileCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    ...Typography.bodyBold,
  },
  fileMeta: {
    ...Typography.micro,
    marginTop: 2,
  },
  fileAmount: {
    ...Typography.bodyBold,
    fontVariant: ['tabular-nums'],
  },

  /* Footer & tags */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: BorderWidth.hairline,
  },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    overflow: 'hidden',
  },

  /* VAT tag with glow */
  vatTag: {
    backgroundColor: 'rgba(59,107,255,0.10)',
    borderColor: 'rgba(59,107,255,0.25)',
  },
  vatTagText: {
    ...Typography.micro,
    fontWeight: '800',
    color: '#3B6BFF',
  },
  tagGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(59,107,255,0.05)',
    borderRadius: 8,
  },

  /* TRN tag with glow */
  trnTag: {
    backgroundColor: 'rgba(59,107,255,0.10)',
    borderColor: 'rgba(59,107,255,0.25)',
  },
  trnTagText: {
    ...Typography.micro,
    fontWeight: '800',
    color: '#3B6BFF',
  },
  trnTagGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(59,107,255,0.05)',
    borderRadius: 8,
  },

  /* Flagged tag */
  flagTag: {
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderColor: 'rgba(245,158,11,0.25)',
  },
  flagTagText: {
    ...Typography.micro,
    fontWeight: '800',
    color: '#F59E0B',
  },

  /* View button */
  viewBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
});
