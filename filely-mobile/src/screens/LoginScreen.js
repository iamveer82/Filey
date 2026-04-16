import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, Spacing, BorderWidth } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ darkMode, onNavigateToCompanySetup }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (isSignUp && !name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await signUp(email.trim(), password, name.trim());
        // Navigate to Company Setup flow
        onNavigateToCompanySetup?.();
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e) {
      setError(e.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View entering={FadeInUp.duration(800).springify()} style={styles.logoSection}>
        <View style={[styles.logoIcon, { backgroundColor: c.limeLight, borderColor: c.border, borderWidth: BorderWidth.thin }]}>
          <Ionicons name="sparkles" size={48} color={c.lime} />
        </View>
        <Text style={[styles.logoTitle, { color: c.text }]}>Filely</Text>
        <Text style={[styles.logoSubtitle, { color: c.textSecondary }]}>
          UAE Tax Scanner — Smart, Simple, Compliant
        </Text>
      </Animated.View>

      <Animated.View layout={Layout.springify()} entering={FadeInDown.duration(600).springify()} style={styles.formSection}>
        {isSignUp && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: c.textMuted }]}>FULL NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={c.textMuted}
              style={[styles.textInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]}
              autoCapitalize="words"
            />
          </Animated.View>
        )}

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: c.textMuted }]}>EMAIL</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.ae"
            placeholderTextColor={c.textMuted}
            style={[styles.textInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: c.textMuted }]}>PASSWORD</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Min 6 characters"
            placeholderTextColor={c.textMuted}
            secureTextEntry
            style={[styles.textInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]}
          />
        </View>

        {error ? (
          <Animated.Text entering={FadeIn.duration(300)} style={styles.errorText}>{error}</Animated.Text>
        ) : null}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submitBtn}
        >
          {loading ? (
            <ActivityIndicator color="#00531f" />
          ) : (
            <Text style={styles.submitBtnText}>
              {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { setIsSignUp(!isSignUp); setError(''); }}
          style={styles.toggleBtn}
        >
          <Text style={[styles.toggleText, { color: c.textSecondary }]}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={{ color: '#44e571', fontWeight: '700' }}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom accent */}
      <View style={styles.bottomAccent}>
        <View style={styles.bottomLine} />
        <Text style={[styles.bottomText, { color: c.textMuted }]}>
          5-Year Vault — UAE Corporate Tax Compliance
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.xxl, justifyContent: 'center' },
  logoSection: { alignItems: 'center', marginBottom: 48 },
  logoIcon: {
    width: 90, height: 90, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    ...Shadow.softSm,
  },
  logoTitle: { fontSize: 36, fontWeight: '900', letterSpacing: -1, marginBottom: 8 },
  logoSubtitle: { ...Typography.bodySmall, textAlign: 'center' },
  formSection: { gap: 20, marginBottom: 40 },
  inputGroup: { gap: 8 },
  inputLabel: { ...Typography.labelWide },
  textInput: {
    borderRadius: Radius.md, padding: Spacing.lg, borderWidth: BorderWidth.thin, ...Typography.body,
  },
  errorText: { color: '#ba1a1a', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  submitBtn: {
    backgroundColor: '#44e571', borderRadius: Radius.pill,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: BorderWidth.thin, borderColor: '#000',
    ...Shadow.hardMd,
    marginTop: 8,
  },
  submitBtnText: { ...Typography.btnPrimary, color: '#00531f' },
  toggleBtn: { alignItems: 'center', marginTop: 8 },
  toggleText: { ...Typography.bodySmall },
  bottomAccent: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  bottomLine: { width: 40, height: 3, borderRadius: 2, backgroundColor: '#44e571', marginBottom: Spacing.sm },
  bottomText: { ...Typography.micro, letterSpacing: 0.5 },
});
