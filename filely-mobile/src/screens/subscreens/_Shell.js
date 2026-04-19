import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../theme/colors';

export function Shell({ darkMode, onBack, title, subtitle, children, scroll = true }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  return (
    <View style={[s.root, { backgroundColor: c.bg }]}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <View style={[s.header, { paddingTop: insets.top + 8, borderBottomColor: c.borderSubtle }]}>
        <Pressable onPress={onBack} style={s.back} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: c.text }]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[s.subtitle, { color: c.textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      <Body
        style={{ flex: 1 }}
        contentContainerStyle={scroll ? { padding: 18, paddingBottom: insets.bottom + 24, gap: 14 } : undefined}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Body>
    </View>
  );
}

export function Card({ c, children, style }) {
  return (
    <View style={[s.card, { backgroundColor: c.card, borderColor: c.borderSubtle }, style]}>
      {children}
    </View>
  );
}

export const shellStyles = StyleSheet.create({
  btn: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  btnPrimary: { backgroundColor: '#2A63E2' },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  btnGhostText: { fontSize: 13, fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  hint: { fontSize: 11.5, lineHeight: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3, marginBottom: 8 },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, gap: 8 },
  back: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 11.5, marginTop: 2 },
  card: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
});
