import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  Switch, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, {
  FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import {
  PROVIDERS, getPreference, setPreference, getKey, setKey, testKey,
} from '../services/llmProvider';
import {
  WEB_PROVIDERS, getWebPreference, setWebPreference, getWebKey, setWebKey, testWebKey,
} from '../services/webSearch';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SpringPressable({ children, style, onPress, disabled, ...rest }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 420 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 320 }); }}
      style={[style, anim]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

function Card({ children, c, delay = 80 }) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(450)}
      style={[s.card, { backgroundColor: c.card, borderColor: c.borderSubtle }]}
    >
      {children}
    </Animated.View>
  );
}

export default function AISettingsScreen({ darkMode, onBack }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [pref, setPref] = useState({ provider: 'gemma', model: 'gemma-2b-it', useWeb: false });
  const [keys, setKeys] = useState({});
  const [webPref, setWebPref] = useState({ provider: 'tavily' });
  const [webKeys, setWebKeys] = useState({});
  const [testing, setTesting] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await getPreference(); setPref(p);
      const wp = await getWebPreference(); setWebPref(wp);
      const loadedKeys = {};
      for (const id of Object.keys(PROVIDERS)) {
        if (PROVIDERS[id].keyName) loadedKeys[id] = (await getKey(id)) || '';
      }
      setKeys(loadedKeys);
      const wk = {};
      for (const id of Object.keys(WEB_PROVIDERS)) wk[id] = (await getWebKey(id)) || '';
      setWebKeys(wk);
      setLoaded(true);
    })();
  }, []);

  const saveProvider = async (id) => {
    const def = PROVIDERS[id];
    const next = { ...pref, provider: id, model: def.models[0] };
    setPref(next); await setPreference(next);
  };

  const saveModel = async (m) => { const n = { ...pref, model: m }; setPref(n); await setPreference(n); };
  const saveWeb = async (v) => { const n = { ...pref, useWeb: v }; setPref(n); await setPreference(n); };

  const saveKey = async (id, value) => {
    setKeys(k => ({ ...k, [id]: value }));
    await setKey(id, value);
  };
  const saveWebKey = async (id, value) => {
    setWebKeys(k => ({ ...k, [id]: value }));
    await setWebKey(id, value);
  };
  const saveWebProvider = async (id) => {
    const n = { ...webPref, provider: id };
    setWebPref(n); await setWebPreference(n);
  };

  const doTest = useCallback(async (id) => {
    setTesting(`llm:${id}`);
    const r = await testKey(id);
    setTesting(null);
    Alert.alert(r.ok ? 'Connected' : 'Failed', r.ok ? `Reply: ${r.sample}` : r.error);
  }, []);

  const doTestWeb = useCallback(async (id) => {
    setTesting(`web:${id}`);
    const r = await testWebKey(id);
    setTesting(null);
    Alert.alert(r.ok ? 'Connected' : 'Failed', r.ok ? `${r.count} results` : r.error);
  }, []);

  if (!loaded) {
    return (
      <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  const activeDef = PROVIDERS[pref.provider];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <View style={[s.hero, { paddingTop: insets.top + 10 }]}>
        <Animated.View entering={FadeInDown.duration(450)} style={s.heroRow}>
          <SpringPressable onPress={onBack} style={s.backBtn} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </SpringPressable>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>AI & INTEGRATIONS</Text>
            <Text style={s.title}>Models & Keys</Text>
          </View>
          <View style={s.iconWrap}>
            <Ionicons name="sparkles" size={22} color="#FFFFFF" />
          </View>
        </Animated.View>
        <Text style={s.sub}>Connect any LLM or web search provider via your own API key.</Text>
      </View>

      <View style={[s.sheet, { backgroundColor: c.bg }]}>
        <View style={s.handle} />
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[s.sectionTitle, { color: c.textMuted }]}>ACTIVE LLM</Text>
          <Card c={c} delay={60}>
            <View style={s.chipRow}>
              {Object.values(PROVIDERS).map(p => {
                const active = pref.provider === p.id;
                return (
                  <SpringPressable
                    key={p.id}
                    onPress={() => saveProvider(p.id)}
                    style={[s.chip, {
                      backgroundColor: active ? c.primary : c.bg,
                      borderColor: active ? c.primary : c.borderSubtle,
                    }]}
                  >
                    <Text style={{ color: active ? '#FFF' : c.text, fontSize: 12.5, fontWeight: '700' }}>{p.label}</Text>
                  </SpringPressable>
                );
              })}
            </View>

            <View style={[s.divider, { backgroundColor: c.borderSubtle }]} />

            <Text style={[s.label, { color: c.textMuted }]}>MODEL</Text>
            <View style={s.chipRow}>
              {activeDef.models.map(m => {
                const active = pref.model === m;
                return (
                  <SpringPressable
                    key={m}
                    onPress={() => saveModel(m)}
                    style={[s.chip, {
                      backgroundColor: active ? c.primaryLight : c.bg,
                      borderColor: active ? c.primary : c.borderSubtle,
                    }]}
                  >
                    <Text style={{ color: active ? c.primary : c.text, fontSize: 12, fontWeight: '600' }}>{m}</Text>
                  </SpringPressable>
                );
              })}
            </View>

            {activeDef.keyName ? (
              <>
                <View style={[s.divider, { backgroundColor: c.borderSubtle }]} />
                <Text style={[s.label, { color: c.textMuted }]}>API KEY</Text>
                <TextInput
                  value={keys[pref.provider] || ''}
                  onChangeText={(t) => saveKey(pref.provider, t)}
                  placeholder={`Paste ${activeDef.label} key`}
                  placeholderTextColor={c.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[s.field, { backgroundColor: c.bg, color: c.text, borderColor: c.borderSubtle }]}
                />
                <SpringPressable
                  onPress={() => doTest(pref.provider)}
                  disabled={testing === `llm:${pref.provider}` || !keys[pref.provider]}
                  style={[s.testBtn, {
                    backgroundColor: c.primary,
                    opacity: (testing === `llm:${pref.provider}` || !keys[pref.provider]) ? 0.5 : 1,
                  }]}
                >
                  {testing === `llm:${pref.provider}`
                    ? <ActivityIndicator color="#FFF" />
                    : <>
                        <Ionicons name="flash" size={15} color="#FFF" />
                        <Text style={s.testBtnText}>Test connection</Text>
                      </>
                  }
                </SpringPressable>
              </>
            ) : (
              <Text style={[s.helper, { color: c.textMuted }]}>On-device model. No key required.</Text>
            )}
          </Card>

          <Text style={[s.sectionTitle, { color: c.textMuted, marginTop: 28 }]}>WEB SEARCH</Text>
          <Card c={c} delay={120}>
            <View style={[s.row, { borderBottomColor: c.borderSubtle }]}>
              <View style={[s.miniIcon, { backgroundColor: c.primaryLight }]}>
                <Ionicons name="globe" size={16} color={c.primary} />
              </View>
              <Text style={[s.rowLabel, { color: c.text }]}>Enable web search</Text>
              <Switch
                value={pref.useWeb}
                onValueChange={saveWeb}
                trackColor={{ false: '#E5E7EB', true: c.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <Text style={[s.label, { color: c.textMuted, marginTop: 12 }]}>PROVIDER</Text>
            <View style={s.chipRow}>
              {Object.values(WEB_PROVIDERS).map(p => {
                const active = webPref.provider === p.id;
                return (
                  <SpringPressable
                    key={p.id}
                    onPress={() => saveWebProvider(p.id)}
                    style={[s.chip, {
                      backgroundColor: active ? c.primary : c.bg,
                      borderColor: active ? c.primary : c.borderSubtle,
                    }]}
                  >
                    <Text style={{ color: active ? '#FFF' : c.text, fontSize: 12.5, fontWeight: '700' }}>{p.label}</Text>
                  </SpringPressable>
                );
              })}
            </View>

            <Text style={[s.label, { color: c.textMuted }]}>API KEY</Text>
            <TextInput
              value={webKeys[webPref.provider] || ''}
              onChangeText={(t) => saveWebKey(webPref.provider, t)}
              placeholder={`Paste ${WEB_PROVIDERS[webPref.provider].label} key`}
              placeholderTextColor={c.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={[s.field, { backgroundColor: c.bg, color: c.text, borderColor: c.borderSubtle }]}
            />
            <SpringPressable
              onPress={() => doTestWeb(webPref.provider)}
              disabled={testing === `web:${webPref.provider}` || !webKeys[webPref.provider]}
              style={[s.testBtn, {
                backgroundColor: c.primary,
                opacity: (testing === `web:${webPref.provider}` || !webKeys[webPref.provider]) ? 0.5 : 1,
              }]}
            >
              {testing === `web:${webPref.provider}`
                ? <ActivityIndicator color="#FFF" />
                : <>
                    <Ionicons name="search" size={15} color="#FFF" />
                    <Text style={s.testBtnText}>Test connection</Text>
                  </>
              }
            </SpringPressable>
          </Card>

          <Text style={[s.footNote, { color: c.textMuted }]}>
            Keys stored encrypted on-device via iOS Keychain. Never sent to Filey servers.
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: '#3B6BFF',
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  kicker: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 18 },
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
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginLeft: 2 },
  field: {
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
  },
  testBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 44, borderRadius: 22,
  },
  testBtnText: { color: '#FFF', fontSize: 13.5, fontWeight: '700' },
  helper: { fontSize: 12.5, fontStyle: 'italic' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  miniIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 14.5, fontWeight: '600' },
  footNote: { textAlign: 'center', fontSize: 12, marginTop: 20, lineHeight: 17 },
});
