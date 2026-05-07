/**
 * ClaudeSidebar — left-swipe drawer matching Claude iOS app design.
 * White bg, black text. Reanimated drawer + pan-to-close gesture.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, Dimensions,
  TextInput, Alert, Platform, Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  listThreads,
  createThread,
  renameThread,
  deleteThread,
  setActiveThreadId,
} from '../services/threads';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.86, 340);

const NAV_ITEMS = [
  { key: 'chats',     label: 'Chats',     icon: 'chatbubbles-outline'  },
  { key: 'projects',  label: 'Projects',  icon: 'cube-outline'          },
  { key: 'artifacts', label: 'Artifacts', icon: 'sparkles-outline'      },
  { key: 'code',      label: 'Code',      icon: 'code-slash-outline'    },
  { key: 'dispatch',  label: 'Dispatch',  icon: 'paper-plane-outline'   },
];

const SPRING_OPEN  = { damping: 22, stiffness: 220, mass: 0.85 };
const SPRING_CLOSE = { damping: 26, stiffness: 240, mass: 0.85 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ClaudeSidebar({
  open,
  activeThreadId,
  onClose,
  onPickThread,
  onNewChat,
  userName = 'You',
  userInitials = 'YO',
  appName = 'Filey',
}) {
  const insets = useSafeAreaInsets();
  const drawerX = useSharedValue(-SIDEBAR_WIDTH);
  const backdrop = useSharedValue(0);

  const [threads, setThreads] = useState([]);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const [active, setActive] = useState('chats');
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      const rows = await listThreads();
      if (mounted.current) setThreads(rows || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (open) {
      drawerX.value = withSpring(0, SPRING_OPEN);
      backdrop.value = withTiming(1, { duration: 240 });
      refresh();
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    } else {
      drawerX.value = withSpring(-SIDEBAR_WIDTH, SPRING_CLOSE);
      backdrop.value = withTiming(0, { duration: 200 });
      Keyboard.dismiss();
    }
  }, [open, refresh]);

  const closeNow = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleNewChat = useCallback(() => {
    onNewChat?.();
    closeNow();
  }, [onNewChat, closeNow]);

  const handlePickThread = useCallback(async (id) => {
    try { Haptics.selectionAsync(); } catch {}
    try { await setActiveThreadId(id); } catch {}
    onPickThread?.(id);
    closeNow();
  }, [onPickThread, closeNow]);

  const handleLongPress = useCallback((t) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    Alert.alert(t.title || 'Chat', undefined, [
      { text: 'Rename', onPress: () => { setEditing(t.id); setDraft(t.title || ''); } },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try { await deleteThread(t.id); } catch {}
          refresh();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [refresh]);

  const saveRename = useCallback(async () => {
    if (editing && draft.trim()) {
      try { await renameThread(editing, draft.trim()); } catch {}
    }
    setEditing(null);
    setDraft('');
    refresh();
  }, [editing, draft, refresh]);

  // ── Drag-to-close pan gesture on drawer ────────────────────────────────
  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-25, 25])
    .onUpdate((e) => {
      const next = Math.min(0, e.translationX);
      drawerX.value = next;
      backdrop.value = interpolate(
        next,
        [-SIDEBAR_WIDTH, 0],
        [0, 1],
        Extrapolate.CLAMP
      );
    })
    .onEnd((e) => {
      const shouldClose =
        e.translationX < -SIDEBAR_WIDTH * 0.3 || e.velocityX < -650;
      if (shouldClose) {
        drawerX.value = withSpring(-SIDEBAR_WIDTH, SPRING_CLOSE);
        backdrop.value = withTiming(0, { duration: 200 });
        runOnJS(closeNow)();
      } else {
        drawerX.value = withSpring(0, SPRING_OPEN);
        backdrop.value = withTiming(1, { duration: 200 });
      }
    });

  // ── Animated styles ────────────────────────────────────────────────────
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drawerX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value * 0.35,
  }));

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.root]}
      pointerEvents={open ? 'auto' : 'none'}
    >
      {/* Backdrop */}
      <AnimatedPressable
        onPress={closeNow}
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      />

      {/* Drawer */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.drawer,
            {
              width: SIDEBAR_WIDTH,
              paddingTop: insets.top + 8,
              paddingBottom: Math.max(insets.bottom, 8),
            },
            drawerStyle,
          ]}
        >
          {/* Brand header */}
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>{appName}</Text>
            <Pressable
              onPress={closeNow}
              hitSlop={12}
              style={styles.brandClose}
            >
              <Ionicons name="menu" size={20} color="#0B1435" />
            </Pressable>
          </View>

          {/* Nav items */}
          <View style={styles.navBlock}>
            {NAV_ITEMS.map((it) => {
              const isActive = active === it.key;
              return (
                <Pressable
                  key={it.key}
                  onPress={() => {
                    setActive(it.key);
                    try { Haptics.selectionAsync(); } catch {}
                  }}
                  style={({ pressed }) => [
                    styles.navRow,
                    pressed && { backgroundColor: 'rgba(11,20,53,0.04)' },
                  ]}
                >
                  <Ionicons
                    name={it.icon}
                    size={22}
                    color={isActive ? '#0B1435' : 'rgba(11,20,53,0.65)'}
                  />
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                    {it.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Recents header */}
          <Text style={styles.sectionLabel}>Recents</Text>

          {/* Recents list */}
          <ScrollView
            style={styles.recentScroll}
            contentContainerStyle={styles.recentScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {threads.length === 0 && (
              <Text style={styles.emptyHint}>
                No chats yet. Tap the + button below to start.
              </Text>
            )}

            {threads.map((t) => {
              const isActiveThread = t.id === activeThreadId;
              const isEdit = editing === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => !isEdit && handlePickThread(t.id)}
                  onLongPress={() => !isEdit && handleLongPress(t)}
                  delayLongPress={320}
                  style={({ pressed }) => [
                    styles.recentRow,
                    isActiveThread && styles.recentRowActive,
                    pressed && !isActiveThread && {
                      backgroundColor: 'rgba(11,20,53,0.04)',
                    },
                  ]}
                >
                  {isEdit ? (
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      onBlur={saveRename}
                      onSubmitEditing={saveRename}
                      autoFocus
                      style={styles.recentEditInput}
                      placeholderTextColor="rgba(11,20,53,0.35)"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.recentText,
                        isActiveThread && styles.recentTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {t.title || 'Untitled'}
                    </Text>
                  )}
                </Pressable>
              );
            })}
            <View style={{ height: 80 }} />
          </ScrollView>

          {/* Footer: user pill + new-chat FAB */}
          <View style={styles.footer}>
            <View style={styles.userPill}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userInitials}</Text>
              </View>
              <Text style={styles.userName} numberOfLines={1}>
                {userName}
              </Text>
            </View>

            <Pressable
              onPress={handleNewChat}
              style={({ pressed }) => [
                styles.fab,
                pressed && { transform: [{ scale: 0.92 }] },
              ]}
              hitSlop={6}
            >
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 1000,
    elevation: 1000,
  },
  backdrop: {
    backgroundColor: '#000000',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(11,20,53,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 14,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 18,
  },
  brandText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0B1435',
    letterSpacing: -0.6,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  brandClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,20,53,0.05)',
  },

  navBlock: {
    gap: 2,
    marginBottom: 22,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  navLabel: {
    fontSize: 17,
    color: 'rgba(11,20,53,0.78)',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  navLabelActive: {
    color: '#0B1435',
    fontWeight: '600',
  },

  sectionLabel: {
    fontSize: 12.5,
    color: 'rgba(11,20,53,0.45)',
    fontWeight: '600',
    letterSpacing: 0.2,
    paddingHorizontal: 4,
    marginBottom: 6,
  },

  recentScroll: {
    flex: 1,
  },
  recentScrollContent: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: 'rgba(11,20,53,0.4)',
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  recentRow: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  recentRowActive: {
    backgroundColor: 'rgba(11,20,53,0.06)',
  },
  recentText: {
    fontSize: 15,
    color: '#0B1435',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  recentTextActive: {
    color: '#0B1435',
    fontWeight: '600',
  },
  recentEditInput: {
    fontSize: 15,
    color: '#0B1435',
    paddingVertical: 0,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(11,20,53,0.06)',
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: 'rgba(11,20,53,0.05)',
    flex: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0B1435',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  userName: {
    fontSize: 14,
    color: '#0B1435',
    fontWeight: '500',
    flexShrink: 1,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6A3D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6A3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});
