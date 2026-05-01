import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';

const EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];

export default function CompanySetupScreen({ darkMode, onComplete }) {
  const c = Colors.light;
  const [form, setForm] = useState({
    companyName: '',
    tradeLicense: '',
    emirate: 'Dubai',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.companyName.trim() || !form.tradeLicense.trim()) {
      Alert.alert('Required Fields', 'Please enter both Company Name and Trade License Number.');
      return;
    }
    setLoading(true);
    try {
      await api.updateCompanyProfile(form);
      onComplete?.();
    } catch (e) {
      Alert.alert('Error', 'Failed to save company details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.xxl }}>
        <Animated.View entering={FadeInUp.duration(800).springify()} style={styles.header}>
          <Ionicons name="business-outline" size={48} color={c.lime} />
          <Text style={[styles.title, { color: c.text }]}>Company Setup</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Enter your business details to enable UAE VAT compliance tracking.
          </Text>
        </Animated.View>

        <Animated.View layout={Layout.springify()} entering={FadeInDown.duration(600).springify()} style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textMuted }]}>COMPANY NAME</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]}
              placeholder="e.g. Global Trade LLC"
              placeholderTextColor={c.textMuted}
              value={form.companyName}
              onChangeText={(t) => setForm({ ...form, companyName: t })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textMuted }]}>TRADE LICENSE NUMBER</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]}
              placeholder="TRN or License #"
              placeholderTextColor={c.textMuted}
              value={form.tradeLicense}
              onChangeText={(t) => setForm({ ...form, tradeLicense: t })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: c.textMuted }]}>PRIMARY EMIRATE</Text>
            <View style={styles.emirateContainer}>
              {EMIRATES.map(e => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setForm({ ...form, emirate: e })}
                  style={[
                    styles.emirateChip,
                    { backgroundColor: form.emirate === e ? c.lime : c.surfaceLow, borderColor: form.emirate === e ? '#000' : c.border }
                  ]}
                >
                  <Text style={[styles.emirateText, { color: form.emirate === e ? '#2E5BFF' : c.text }]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: c.lime }]}
          >
            {loading ? <ActivityIndicator color="#2E5BFF" /> : (
              <Text style={styles.submitBtnText}>Complete Setup</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', marginBottom: 40, gap: 12 },
  title: { ...Typography.hero, textAlign: 'center' },
  subtitle: { ...Typography.body, textAlign: 'center', lineHeight: 22 },
  form: { gap: 24 },
  inputGroup: { gap: 8 },
  label: Typography.labelWide,
  input: {
    borderRadius: Radius.md, padding: Spacing.lg, borderWidth: BorderWidth.thin, ...Typography.body,
  },
  emirateContainer: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8
  },
  emirateChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm,
    borderWidth: BorderWidth.thin,
  },
  emirateText: { ...Typography.micro, fontWeight: '800' },
  submitBtn: {
    marginTop: 20, paddingVertical: 18, borderRadius: Radius.lg,
    alignItems: 'center', borderWidth: BorderWidth.thin, borderColor: '#000',
    ...Shadow.hardMd
  },
  submitBtnText: { ...Typography.btnPrimary, color: '#2E5BFF' },
});
