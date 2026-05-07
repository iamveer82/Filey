/**
 * PersonaScreen — give the assistant a soul.
 *
 * The user picks a vibe (Friend, Butler, Coach, Noir, Hype, Monk, Scholar,
 * Street), tweaks formality/emoji/slang sliders, sets what the assistant
 * should call them, and writes free-form custom rules. Mirror mode lets the
 * assistant adapt to their natural messaging style.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput, Switch, Alert,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import {
  VIBES, DEFAULT_PERSONA, getPersona, setPersona, applyVibe,
} from '../services/personaProfile';

function Stepper({ label, value, min, max, onChange, c, hint }) {
  return (
    <View style={[s.stepperRow, { borderBottomColor: c.borderSubtle }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.stepperLabel, { color: c.text }]}>{label}</Text>
        {hint ? <Text style={[s.stepperHint, { color: c.textMuted }]}>{hint}</Text> : null}
      </View>
      <View style={s.stepperCtrl}>
        <Pressable
          hitSlop={8}
          onPress={() => { try { Haptics.selectionAsync(); } catch {} onChange(Math.max(min, value - 1)); }}
          style={[s.stepperBtn, { backgroundColor: c.borderSubtle }]}
          disabled={value <= min}
        >
          <Ionicons name="remove" size={16} color={c.text} />
        </Pressable>
        <Text style={[s.stepperVal, { color: c.text }]}>{value}</Text>
        <Pressable
          hitSlop={8}
          onPress={() => { try { Haptics.selectionAsync(); } catch {} onChange(Math.min(max, value + 1)); }}
          style={[s.stepperBtn, { backgroundColor: c.borderSubtle }]}
          disabled={value >= max}
        >
          <Ionicons name="add" size={16} color={c.text} />
        </Pressable>
      </View>
    </View>
  );
}

function VibeCard({ vibe, selected, onPress, c }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.vibeCard,
        {
          backgroundColor: selected ? c.primary : c.card,
          borderColor: selected ? c.primary : c.borderSubtle,
        },
      ]}
    >
      <View style={s.vibeRow}>
        <Text style={[s.vibeTitle, { color: selected ? '#FFFFFF' : c.text }]}>{vibe.label}</Text>
        {selected ? <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" /> : null}
      </View>
      <Text style={[s.vibeBlurb, { color: selected ? 'rgba(255,255,255,0.9)' : c.textMuted }]}>
        {vibe.blurb}
      </Text>
    </Pressable>
  );
}

const SLANG_LEVELS = ['none', 'light', 'heavy'];

export default function PersonaScreen({ darkMode, onBack }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [persona, setLocal] = useState(DEFAULT_PERSONA);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try { setLocal(await getPersona()); } catch {}
      setLoading(false);
    })();
  }, []);

  const update = useCallback((patch) => {
    setLocal(prev => ({ ...prev, ...patch }));
    setDirty(true);
  }, []);

  const pickVibe = useCallback(async (vibeId) => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    const v = VIBES.find(x => x.id === vibeId) || VIBES[0];
    setLocal(prev => ({
      ...prev,
      vibe: v.id,
      tone: v.seed.tone,
      formality: v.seed.formality,
      emoji: v.seed.emoji,
      slang: v.seed.slang,
    }));
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    try {
      await setPersona(persona);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setDirty(false);
      Alert.alert('Saved', 'Your assistant has a new soul.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save persona.');
    }
  }, [persona]);

  const reset = useCallback(() => {
    Alert.alert('Reset persona?', 'Restore default Trusty Friend tone and clear custom rules.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await setPersona({ ...DEFAULT_PERSONA });
          setLocal({ ...DEFAULT_PERSONA });
          setDirty(false);
        },
      },
    ]);
  }, []);

  if (loading) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[s.header, { paddingTop: insets.top + 6, backgroundColor: c.bg, borderBottomColor: c.borderSubtle }]}>
        <Pressable onPress={onBack} hitSlop={8} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: c.text }]}>Persona</Text>
          <Text style={[s.headerSub, { color: c.textMuted }]}>Give your AI a soul</Text>
        </View>
        <Pressable onPress={reset} hitSlop={8}>
          <Text style={[s.resetText, { color: c.textMuted }]}>Reset</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 140 }}>
        <Animated.View entering={FadeInUp.duration(400)}>
          <Text style={[s.sectionLabel, { color: c.textMuted }]}>VIBE</Text>
          <Text style={[s.sectionHint, { color: c.textMuted }]}>
            One core archetype. The rest of the dials shape the details.
          </Text>
          <View style={{ marginTop: 8 }}>
            {VIBES.map(v => (
              <VibeCard
                key={v.id}
                vibe={v}
                selected={persona.vibe === v.id}
                onPress={() => pickVibe(v.id)}
                c={c}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(80).duration(400)} style={{ marginTop: 28 }}>
          <Text style={[s.sectionLabel, { color: c.textMuted }]}>NAMES</Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.borderSubtle }]}>
            <Text style={[s.fieldLabel, { color: c.textMuted }]}>Agent name</Text>
            <TextInput
              value={persona.agentName}
              onChangeText={v => update({ agentName: v })}
              placeholder="Fili"
              placeholderTextColor={c.textMuted}
              style={[s.input, { color: c.text, borderColor: c.borderSubtle }]}
            />
            <Text style={[s.fieldLabel, { color: c.textMuted, marginTop: 12 }]}>What should it call you?</Text>
            <TextInput
              value={persona.preferredName}
              onChangeText={v => update({ preferredName: v })}
              placeholder="(leave empty to skip)"
              placeholderTextColor={c.textMuted}
              style={[s.input, { color: c.text, borderColor: c.borderSubtle }]}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(400)} style={{ marginTop: 28 }}>
          <Text style={[s.sectionLabel, { color: c.textMuted }]}>VOICE DIALS</Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.borderSubtle }]}>
            <Stepper
              label="Formality"
              hint="0 = best-friend texting · 10 = old-world butler"
              value={persona.formality}
              min={0}
              max={10}
              onChange={v => update({ formality: v })}
              c={c}
            />
            <Stepper
              label="Emoji"
              hint="0 = none · 3 = enthusiastic"
              value={persona.emoji}
              min={0}
              max={3}
              onChange={v => update({ emoji: v })}
              c={c}
            />
            <View style={[s.stepperRow, { borderBottomColor: c.borderSubtle }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.stepperLabel, { color: c.text }]}>Slang</Text>
                <Text style={[s.stepperHint, { color: c.textMuted }]}>none · light · heavy</Text>
              </View>
              <View style={s.slangRow}>
                {SLANG_LEVELS.map(level => {
                  const active = persona.slang === level;
                  return (
                    <Pressable
                      key={level}
                      onPress={() => { try { Haptics.selectionAsync(); } catch {} update({ slang: level }); }}
                      style={[
                        s.slangChip,
                        {
                          backgroundColor: active ? c.primary : 'transparent',
                          borderColor: active ? c.primary : c.borderSubtle,
                        },
                      ]}
                    >
                      <Text style={[s.slangChipText, { color: active ? '#FFFFFF' : c.text }]}>{level}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(160).duration(400)} style={{ marginTop: 28 }}>
          <Text style={[s.sectionLabel, { color: c.textMuted }]}>OPTIONAL TOUCHES</Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.borderSubtle }]}>
            <Text style={[s.fieldLabel, { color: c.textMuted }]}>Greeting (used on a fresh thread)</Text>
            <TextInput
              value={persona.greeting}
              onChangeText={v => update({ greeting: v })}
              placeholder="e.g. Evening, partner. What did the books do today?"
              placeholderTextColor={c.textMuted}
              style={[s.input, { color: c.text, borderColor: c.borderSubtle }]}
            />
            <Text style={[s.fieldLabel, { color: c.textMuted, marginTop: 12 }]}>Sign-off (occasional)</Text>
            <TextInput
              value={persona.signOff}
              onChangeText={v => update({ signOff: v })}
              placeholder="e.g. — yours, Fili"
              placeholderTextColor={c.textMuted}
              style={[s.input, { color: c.text, borderColor: c.borderSubtle }]}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={{ marginTop: 28 }}>
          <Text style={[s.sectionLabel, { color: c.textMuted }]}>CUSTOM RULES</Text>
          <Text style={[s.sectionHint, { color: c.textMuted }]}>
            Free-form. The assistant treats this as standing instructions.
          </Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.borderSubtle }]}>
            <TextInput
              value={persona.customInstructions}
              onChangeText={v => update({ customInstructions: v })}
              placeholder={`e.g.\n- Roast me when I overspend on coffee.\n- Always end summaries with a one-line stoic quote.\n- Don't ever call me "user".`}
              placeholderTextColor={c.textMuted}
              multiline
              style={[s.textarea, { color: c.text, borderColor: c.borderSubtle }]}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(240).duration(400)} style={{ marginTop: 28 }}>
          <Text style={[s.sectionLabel, { color: c.textMuted }]}>STYLE MIRRORING</Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.borderSubtle }]}>
            <View style={[s.stepperRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.stepperLabel, { color: c.text }]}>Mirror my style</Text>
                <Text style={[s.stepperHint, { color: c.textMuted }]}>
                  Quietly learn how you write — message length, slang, emoji — and match it.
                </Text>
              </View>
              <Switch
                value={!!persona.mirrorMode}
                onValueChange={v => update({ mirrorMode: v })}
                trackColor={{ false: '#E5E7EB', true: c.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            {persona.mirroredStyle ? (
              <View style={s.mirrorReadout}>
                <Text style={[s.mirrorTitle, { color: c.textMuted }]}>WHAT I'VE LEARNED</Text>
                <Text style={[s.mirrorLine, { color: c.text }]}>
                  Avg msg length ≈ {Math.round(persona.mirroredStyle.chars || 0)} chars
                </Text>
                <Text style={[s.mirrorLine, { color: c.text }]}>
                  Emoji rate {(persona.mirroredStyle.emojiPer100 || 0).toFixed(2)} / 100 chars
                </Text>
                <Text style={[s.mirrorLine, { color: c.text }]}>
                  Slang rate {((persona.mirroredStyle.slangRate || 0) * 100).toFixed(1)}%
                </Text>
                <Text style={[s.mirrorLine, { color: c.text }]}>
                  Formal markers {((persona.mirroredStyle.formalRate || 0) * 100).toFixed(1)}%
                </Text>
                <Pressable
                  onPress={() => update({ mirroredStyle: null })}
                  style={[s.clearBtn, { borderColor: c.borderSubtle }]}
                  hitSlop={8}
                >
                  <Text style={[s.clearBtnText, { color: c.textMuted }]}>Clear learned style</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[s.footer, { backgroundColor: c.bg, borderTopColor: c.borderSubtle, paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={save}
          disabled={!dirty}
          style={[
            s.saveBtn,
            { backgroundColor: dirty ? c.primary : c.borderSubtle, opacity: dirty ? 1 : 0.6 },
          ]}
        >
          <Ionicons name="sparkles" size={18} color="#FFFFFF" />
          <Text style={s.saveBtnText}>{dirty ? 'Save persona' : 'Saved'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, marginTop: 1 },
  resetText: { fontSize: 13, fontWeight: '600', paddingHorizontal: 8 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionHint: { fontSize: 12, marginBottom: 12, lineHeight: 18 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },

  vibeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  vibeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vibeTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  vibeBlurb: { fontSize: 12.5, marginTop: 4, lineHeight: 17 },

  fieldLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14,
    minHeight: 110,
    textAlignVertical: 'top',
  },

  stepperRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepperLabel: { fontSize: 14, fontWeight: '700' },
  stepperHint: { fontSize: 12, marginTop: 2 },
  stepperCtrl: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperVal: { fontSize: 15, fontWeight: '800', minWidth: 22, textAlign: 'center' },

  slangRow: { flexDirection: 'row', gap: 6 },
  slangChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    borderWidth: 1,
  },
  slangChipText: { fontSize: 12.5, fontWeight: '700' },

  mirrorReadout: {
    marginTop: 14, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
    gap: 4,
  },
  mirrorTitle: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4,
  },
  mirrorLine: { fontSize: 12.5 },
  clearBtn: {
    marginTop: 10, alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  clearBtnText: { fontSize: 12, fontWeight: '600' },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 26,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
