import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInUp, Layout,
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import api from '../api/client';

const EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];
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

export default function CompanySetupScreen({ darkMode, onComplete }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({ companyName: '', tradeLicense: '', emirate: 'Dubai' });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!form.companyName.trim() || !form.tradeLicense.trim()) {
      Alert.alert('Required Fields', 'Enter Company Name and Trade License Number.');
      return;
    }
    setLoading(true);
    try {
      await api.updateCompanyProfile(form);
      onComplete?.();
    } catch {
      Alert.alert('Error', 'Failed to save company details.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <View style={[styles.hero, { paddingTop: insets.top + 18 }]}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.heroInner}>
          <View style={styles.iconWrap}>
            <Ionicons name="business" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.kicker}>STEP 1 OF 2</Text>
          <Text style={styles.title}>Company Setup</Text>
          <Text style={styles.sub}>UAE VAT tracking needs your business basics.</Text>
        </Animated.View>
      </View>

      <View style={[styles.sheet, { backgroundColor: c.bg }]}>
        <View style={styles.handle} />
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.delay(80).duration(500)} layout={Layout.springify()} style={{ gap: 18 }}>
            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>COMPANY NAME</Text>
              <TextInput
                value={form.companyName}
                onChangeText={(t) => setForm({ ...form, companyName: t })}
                placeholder="e.g. Global Trade LLC"
                placeholderTextColor={c.textMuted}
                style={[styles.field, { backgroundColor: c.card, color: c.text, borderColor: c.borderSubtle }]}
              />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>TRADE LICENSE / TRN</Text>
              <TextInput
                value={form.tradeLicense}
                onChangeText={(t) => setForm({ ...form, tradeLicense: t })}
                placeholder="TRN or License #"
                placeholderTextColor={c.textMuted}
                autoCapitalize="characters"
                style={[styles.field, { backgroundColor: c.card, color: c.text, borderColor: c.borderSubtle }]}
              />
            </View>

            <View style={{ gap: 10 }}>
              <Text style={[styles.label, { color: c.textMuted }]}>PRIMARY EMIRATE</Text>
              <View style={styles.chipRow}>
                {EMIRATES.map(e => {
                  const active = form.emirate === e;
                  return (
                    <SpringPressable
                      key={e}
                      onPress={() => setForm({ ...form, emirate: e })}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? c.primary : c.card,
                          borderColor: active ? c.primary : c.borderSubtle,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={{ color: active ? '#FFFFFF' : c.text, fontSize: 12.5, fontWeight: '700' }}>{e}</Text>
                    </SpringPressable>
                  );
                })}
              </View>
            </View>

            <SpringPressable
              onPress={save}
              disabled={loading}
              style={[styles.submit, { backgroundColor: c.primary, opacity: loading ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Complete setup"
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : (
                  <>
                    <Text style={styles.submitText}>Complete Setup</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
            </SpringPressable>

            <Text style={[styles.footNote, { color: c.textMuted }]}>
              Your data is encrypted and stored for FTA 5-year retention.
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#3B6BFF',
    paddingBottom: 48,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroInner: { alignItems: 'flex-start', gap: 8 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  kicker: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.6, marginTop: 2 },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 20, marginTop: 4 },
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
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginLeft: 2 },
  field: {
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 16, borderWidth: 1,
  },
  submit: {
    marginTop: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 56, borderRadius: 28,
    shadowColor: '#3B6BFF', shadowOpacity: 0.3, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  footNote: { textAlign: 'center', fontSize: 12, marginTop: 10, lineHeight: 17 },
});
