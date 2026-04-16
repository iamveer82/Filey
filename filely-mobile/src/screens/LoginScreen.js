import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  interpolate,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInDown,
  Layout,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, Spacing, BorderWidth } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ---------------------------------------------------------------------------
// Floating Orb — a single semi-transparent gradient circle drifting around
// ---------------------------------------------------------------------------
function FloatingOrb({ color, size, initialX, initialY, durationX, durationY, delay = 0 }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    // Entrance
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 60 }));

    // Infinite drift
    translateX.value = withDelay(
      delay,
      withRepeat(
        withTiming(initialX * 0.6, {
          duration: durationX,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(initialY * 0.5, {
          duration: durationY,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: initialX,
          top: initialY,
        },
        animStyle,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Animated Accent Line at bottom
// ---------------------------------------------------------------------------
function AccentLine({ color }) {
  const lineWidth = useSharedValue(0);

  useEffect(() => {
    lineWidth.value = withDelay(
      1600,
      withSpring(56, { damping: 14, stiffness: 80 }),
    );
  }, []);

  const lineStyle = useAnimatedStyle(() => ({
    width: lineWidth.value,
    height: 3,
    borderRadius: 2,
    backgroundColor: color,
  }));

  return <Animated.View style={lineStyle} />;
}

// ---------------------------------------------------------------------------
// LoginScreen
// ---------------------------------------------------------------------------
export default function LoginScreen({ darkMode, onNavigateToCompanySetup }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const { signIn, signUp } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secureText, setSecureText] = useState(true);

  // ── Logo entrance animations ──────────────────────────────
  const logoScale = useSharedValue(0);
  const logoGlow = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);

  // ── Submit button spring ──────────────────────────────────
  const btnScale = useSharedValue(1);

  // ── Error shake ───────────────────────────────────────────
  const errorShake = useSharedValue(0);

  useEffect(() => {
    // 1) Logo circle springs in
    logoScale.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 90 }));

    // 2) Glow pulse starts
    logoGlow.value = withDelay(
      600,
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );

    // 3) Title fades in
    titleOpacity.value = withDelay(700, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));

    // 4) Subtitle slides up
    subtitleOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));
    subtitleTranslateY.value = withDelay(1000, withSpring(0, { damping: 14, stiffness: 100 }));
  }, []);

  // ── Trigger error shake ───────────────────────────────────
  useEffect(() => {
    if (error) {
      errorShake.value = withSequence(
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [error]);

  // ── Animated styles ───────────────────────────────────────
  const logoCircleStyle = useAnimatedStyle(() => {
    const glowOpacity = interpolate(logoGlow.value, [0, 1], [0.15, 0.45]);
    return {
      transform: [{ scale: logoScale.value }],
      shadowOpacity: glowOpacity,
    };
  });

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const errorAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: errorShake.value }],
  }));

  // ── Handlers ──────────────────────────────────────────────
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

  const onPressIn = () => {
    btnScale.value = withSpring(0.94, { damping: 12, stiffness: 200 });
  };
  const onPressOut = () => {
    btnScale.value = withSpring(1, { damping: 8, stiffness: 180 });
  };

  const toggleMode = () => {
    setIsSignUp((prev) => !prev);
    setError('');
  };

  // ── Orb configs (background decoration) ───────────────────
  const orbs = [
    {
      color: 'rgba(68,229,113,0.08)',
      size: 260,
      initialX: -60,
      initialY: SCREEN_HEIGHT * 0.08,
      durationX: 7000,
      durationY: 9000,
      delay: 0,
    },
    {
      color: 'rgba(79,142,255,0.07)',
      size: 220,
      initialX: SCREEN_WIDTH * 0.55,
      initialY: SCREEN_HEIGHT * 0.18,
      durationX: 8500,
      durationY: 7500,
      delay: 300,
    },
    {
      color: 'rgba(68,229,113,0.05)',
      size: 180,
      initialX: SCREEN_WIDTH * 0.2,
      initialY: SCREEN_HEIGHT * 0.6,
      durationX: 9500,
      durationY: 6500,
      delay: 600,
    },
    {
      color: 'rgba(79,142,255,0.05)',
      size: 140,
      initialX: SCREEN_WIDTH * 0.7,
      initialY: SCREEN_HEIGHT * 0.55,
      durationX: 6500,
      durationY: 8000,
      delay: 900,
    },
  ];

  // ── Render ────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={c.bg} />

      {/* Floating background orbs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {orbs.map((orb, i) => (
          <FloatingOrb key={i} {...orb} />
        ))}
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* ── Logo Section ──────────────────────────────── */}
        <View style={styles.logoSection}>
          <Animated.View
            style={[
              styles.logoCircle,
              {
                backgroundColor: darkMode
                  ? 'rgba(68,229,113,0.10)'
                  : 'rgba(68,229,113,0.14)',
                borderColor: darkMode
                  ? 'rgba(68,229,113,0.25)'
                  : 'rgba(68,229,113,0.35)',
                shadowColor: '#44e571',
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: 30,
                elevation: 12,
              },
              logoCircleStyle,
            ]}
          >
            <Text style={styles.logoLetter}>F</Text>
          </Animated.View>

          <Animated.Text
            style={[
              styles.logoTitle,
              { color: c.text },
              titleStyle,
            ]}
          >
            Filely
          </Animated.Text>

          <Animated.Text
            style={[
              styles.logoSubtitle,
              { color: c.textSecondary },
              subtitleStyle,
            ]}
          >
            UAE Tax Scanner — Smart, Simple, Compliant
          </Animated.Text>
        </View>

        {/* ── Form Section ──────────────────────────────── */}
        <Animated.View layout={Layout.springify()} style={styles.formSection}>

          {/* Name field (sign up only) */}
          {isSignUp && (
            <Animated.View
              entering={FadeInDown.duration(400).springify()}
              exiting={FadeOut.duration(200)}
              layout={Layout.springify()}
              style={styles.inputGroup}
            >
              <Text style={[styles.inputLabel, { color: c.textMuted }]}>FULL NAME</Text>
              <View style={[styles.inputWrapper, { backgroundColor: c.surfaceLow, borderColor: c.border }]}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={c.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  placeholderTextColor={c.textMuted}
                  style={[styles.textInput, { color: c.text }]}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </Animated.View>
          )}

          {/* Email */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(500).springify()}
            layout={Layout.springify()}
            style={styles.inputGroup}
          >
            <Text style={[styles.inputLabel, { color: c.textMuted }]}>EMAIL</Text>
            <View style={[styles.inputWrapper, { backgroundColor: c.surfaceLow, borderColor: c.border }]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={c.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@company.ae"
                placeholderTextColor={c.textMuted}
                style={[styles.textInput, { color: c.text }]}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>
          </Animated.View>

          {/* Password */}
          <Animated.View
            entering={FadeInDown.delay(350).duration(500).springify()}
            layout={Layout.springify()}
            style={styles.inputGroup}
          >
            <Text style={[styles.inputLabel, { color: c.textMuted }]}>PASSWORD</Text>
            <View style={[styles.inputWrapper, { backgroundColor: c.surfaceLow, borderColor: c.border }]}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={c.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor={c.textMuted}
                secureTextEntry={secureText}
                style={[styles.textInput, { color: c.text, flex: 1 }]}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                onPress={() => setSecureText(!secureText)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={secureText ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={c.textMuted}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Error message */}
          {error ? (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={errorAnimStyle}
            >
              <View style={[styles.errorContainer, { backgroundColor: darkMode ? 'rgba(255,75,110,0.10)' : 'rgba(220,38,38,0.08)' }]}>
                <Ionicons name="alert-circle" size={16} color={c.error} style={{ marginRight: 6 }} />
                <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
              </View>
            </Animated.View>
          ) : null}

          {/* Submit Button */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(500).springify()}
            layout={Layout.springify()}
          >
            <AnimatedTouchable
              onPress={handleSubmit}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={loading}
              activeOpacity={0.85}
              style={[
                styles.submitBtn,
                btnAnimStyle,
                loading && styles.submitBtnLoading,
              ]}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#00531f" size="small" />
                  <Text style={[styles.submitBtnText, { marginLeft: 10, opacity: 0.7 }]}>
                    {isSignUp ? 'CREATING...' : 'SIGNING IN...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>
                  {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
                </Text>
              )}
            </AnimatedTouchable>
          </Animated.View>

          {/* Toggle Sign In / Sign Up */}
          <Animated.View
            entering={FadeInDown.delay(650).duration(500).springify()}
            layout={Layout.springify()}
          >
            <TouchableOpacity
              onPress={toggleMode}
              style={styles.toggleBtn}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleText, { color: c.textSecondary }]}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={styles.toggleHighlight}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* ── Bottom Accent ───────────────────────────────── */}
      <Animated.View
        entering={FadeInUp.delay(1400).duration(600)}
        style={styles.bottomAccent}
      >
        <AccentLine color="#44e571" />
        <Text style={[styles.bottomText, { color: c.textMuted }]}>
          5-Year Vault — UAE Corporate Tax Compliance
        </Text>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    justifyContent: 'center',
  },

  // ── Logo ───────────────────────────────────────────────
  logoSection: {
    alignItems: 'center',
    marginBottom: 44,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BorderWidth.medium,
    marginBottom: 22,
  },
  logoLetter: {
    fontSize: 46,
    fontWeight: '900',
    color: '#44e571',
    letterSpacing: -2,
    includeFontPadding: false,
  },
  logoTitle: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  logoSubtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
    maxWidth: 260,
  },

  // ── Form ───────────────────────────────────────────────
  formSection: {
    gap: 18,
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    ...Typography.labelWide,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: BorderWidth.thin,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    ...Typography.body,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Error ──────────────────────────────────────────────
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },

  // ── Submit Button ──────────────────────────────────────
  submitBtn: {
    backgroundColor: '#44e571',
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderWidth: BorderWidth.thin,
    borderColor: 'rgba(0,83,31,0.25)',
    ...Shadow.limeMd,
    marginTop: 6,
  },
  submitBtnLoading: {
    opacity: 0.9,
  },
  submitBtnText: {
    ...Typography.btnPrimary,
    color: '#00531f',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Toggle ─────────────────────────────────────────────
  toggleBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  toggleText: {
    ...Typography.bodySmall,
  },
  toggleHighlight: {
    color: '#44e571',
    fontWeight: '700',
  },

  // ── Bottom Accent ──────────────────────────────────────
  bottomAccent: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 36,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  bottomText: {
    ...Typography.micro,
    letterSpacing: 0.5,
  },
});
