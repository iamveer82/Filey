import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Switch, Alert,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import AISettingsScreen from './AISettingsScreen';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SpringPressable({ children, style, onPress, ...rest }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
      style={[style, anim]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

function Row({ icon, label, right, onPress, danger, c }) {
  const tint = danger ? c.negative : c.primary;
  const bg = danger ? c.negativeLight : c.primaryLight;
  return (
    <SpringPressable onPress={onPress} style={[s.row, { borderBottomColor: c.borderSubtle }]}>
      <View style={[s.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[s.rowLabel, { color: danger ? c.negative : c.text }]} numberOfLines={1}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {right || <Ionicons name="chevron-forward" size={18} color={c.textMuted} />}
      </View>
    </SpringPressable>
  );
}

function Section({ title, children, c, delay = 80 }) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(500)} style={{ marginTop: 28 }}>
      <Text style={[s.sectionTitle, { color: c.textMuted }]}>{title}</Text>
      <View style={[s.card, { backgroundColor: c.card, borderColor: c.borderSubtle }]}>
        {children}
      </View>
    </Animated.View>
  );
}

export default function SettingsScreen({ navigation, darkMode, onToggleDarkMode, onSignOut, onLogout }) {
  const doSignOut = onSignOut || onLogout;
  const c = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, profile: authProfile, signOut } = useAuth();
  const [profile, setProfile] = useState(authProfile);
  const [notifications, setNotifications] = useState(true);
  const [subScreen, setSubScreen] = useState(null); // 'ai' | null

  useEffect(() => {
    (async () => {
      try {
        const d = await api.getProfile();
        if (d?.profile) setProfile(d.profile);
      } catch {}
    })();
  }, []);

  const name = profile?.name || authProfile?.name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || profile?.email || '';
  const company = profile?.company || 'My Company';

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        try { await signOut(); } catch {}
        doSignOut?.();
      } },
    ]);
  }, [signOut, doSignOut]);

  if (subScreen === 'ai') {
    return <AISettingsScreen darkMode={darkMode} onBack={() => setSubScreen(null)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <View style={[s.hero, { paddingTop: insets.top + 8 }]}>
        <Animated.View entering={FadeInDown.duration(500)} style={s.heroInner}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{name[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={s.heroName}>{name}</Text>
          <Text style={s.heroEmail}>{email}</Text>
          <View style={s.companyPill}>
            <Ionicons name="business" size={12} color="#FFFFFF" />
            <Text style={s.companyText}>{company}</Text>
          </View>
        </Animated.View>
      </View>

      <View style={[s.sheet, { backgroundColor: c.bg }]}>
        <View style={s.handle} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 140 }}
        >
          <Section title="ACCOUNT" c={c} delay={80}>
            <Row icon="person-circle-outline" label="Edit profile" c={c} onPress={() => {}} />
            <Row icon="business-outline" label="Company details" c={c} onPress={() => {}} />
            <Row icon="ribbon-outline" label="Certificates" c={c} onPress={() => {}} />
            <Row icon="sparkles-outline" label="Upgrade plan" c={c} onPress={() => {}} />
          </Section>

          <Section title="PREFERENCES" c={c} delay={120}>
            <Row
              icon={darkMode ? 'moon' : 'sunny'}
              label="Dark mode"
              c={c}
              right={
                <Switch
                  value={darkMode}
                  onValueChange={onToggleDarkMode}
                  trackColor={{ false: '#E5E7EB', true: c.primary }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <Row
              icon="notifications-outline"
              label="Notifications"
              c={c}
              right={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: '#E5E7EB', true: c.primary }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <Row icon="globe-outline" label="Language" c={c} onPress={() => {}} />
          </Section>

          <Section title="AI & INTEGRATIONS" c={c} delay={150}>
            <Row icon="sparkles-outline" label="LLM provider & API keys" c={c} onPress={() => setSubScreen('ai')} />
            <Row icon="globe-outline" label="Web search provider" c={c} onPress={() => setSubScreen('ai')} />
          </Section>

          <Section title="COMPLIANCE" c={c} delay={180}>
            <Row icon="shield-checkmark-outline" label="VAT settings" c={c} onPress={() => {}} />
            <Row icon="receipt-outline" label="FTA integration" c={c} onPress={() => {}} />
            <Row icon="download-outline" label="Export data" c={c} onPress={() => {}} />
          </Section>

          <Section title="SUPPORT" c={c} delay={200}>
            <Row icon="help-circle-outline" label="Help center" c={c} onPress={() => {}} />
            <Row icon="lock-closed-outline" label="Privacy policy" c={c} onPress={() => {}} />
            <Row icon="document-text-outline" label="Terms of service" c={c} onPress={() => {}} />
            <Row icon="information-circle-outline" label="About Filey" c={c} onPress={() => {}} />
          </Section>

          <Animated.View entering={FadeInUp.delay(240).duration(500)} style={{ marginTop: 28 }}>
            <SpringPressable
              onPress={handleSignOut}
              style={[s.signOutBtn, { backgroundColor: c.negative }]}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
              <Text style={s.signOutText}>Sign out</Text>
            </SpringPressable>
            <Text style={[s.version, { color: c.textMuted }]}>Filey v1.0.0 • UAE</Text>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: '#3B6BFF',
    paddingBottom: 48,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroInner: { alignItems: 'center', paddingTop: 12 },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  heroName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  companyPill: {
    marginTop: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
  },
  companyText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  sheet: {
    flex: 1,
    marginTop: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(11,23,53,0.15)',
    alignSelf: 'center', marginTop: 6, marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    marginBottom: 10, marginLeft: 4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 56, borderRadius: 28,
    shadowColor: '#FF5470', shadowOpacity: 0.25, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  signOutText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 16 },
});
