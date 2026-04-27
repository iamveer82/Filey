import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function CreditCard({ variant, label, number, holder, extra, style }) {
  const isBlue = variant === 'blue';
  const bg = isBlue ? '#2A63E2' : '#111827';
  const accentBg = isBlue ? '#2E5BFF' : '#1F2937';

  return (
    <View style={[styles.card, { backgroundColor: bg }, style]}>
      <View style={[styles.cardHighlight, { backgroundColor: accentBg }]} />

      <View style={styles.cardTopRow}>
        <Ionicons name="wifi" size={22} color="#FFFFFF" style={{ transform: [{ rotate: '90deg' }] }} />
        <Text style={styles.cardLabel}>{label}</Text>
      </View>

      <Text style={styles.cardNumber}>{number}</Text>

      <View style={styles.cardBottomRow}>
        <View>
          <Text style={styles.cardHolderLabel}>CARDHOLDER</Text>
          <Text style={styles.cardHolder}>{holder}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {extra ? (
            <>
              <Text style={styles.cardHolderLabel}>EXPIRES</Text>
              <Text style={styles.cardHolder}>{extra}</Text>
            </>
          ) : (
            <Text style={styles.cardVisa}>VISA</Text>
          )}
        </View>
      </View>
    </View>
  );
}

export default function LoginScreen({ darkMode = true, onNavigateToCompanySetup }) {
  const { signIn, signUp } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pressScale = useSharedValue(1);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const onBtnPressIn = () => {
    pressScale.value = withSpring(0.96, { damping: 14, stiffness: 220 });
  };
  const onBtnPressOut = () => {
    pressScale.value = withSpring(1, { damping: 14, stiffness: 220 });
  };

  const openAuth = useCallback((nextMode) => {
    setMode(nextMode);
    setError('');
    setModalVisible(true);
  }, []);

  const submit = useCallback(async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const res = await signUp(email, password, name || 'Filey User');
        if (res?.error) {
          setError(String(res.error.message || res.error));
        } else {
          setModalVisible(false);
          onNavigateToCompanySetup && onNavigateToCompanySetup();
        }
      } else {
        const res = await signIn(email, password);
        if (res?.error) setError(String(res.error.message || res.error));
        else setModalVisible(false);
      }
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [email, password, name, mode, signUp, signIn, onNavigateToCompanySetup]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1435" />

      <Animated.View
        entering={FadeInDown.duration(500)}
        style={styles.statusRow}
      >
        <View style={styles.dotOnline} />
        <Text style={styles.statusText}>Secure session</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        style={styles.titleRow}
      >
        <Text style={styles.titleSmall}>Welcome to Filey</Text>
        <Ionicons name="hand-left-outline" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
      </Animated.View>

      <View style={styles.cardStack}>
        <Animated.View
          entering={FadeInUp.delay(250).duration(700).springify().damping(14)}
          style={{
            position: 'absolute',
            transform: [{ translateX: -30 }, { translateY: 0 }, { rotate: '-8deg' }],
          }}
        >
          <CreditCard
            variant="blue"
            label="Diamond"
            number="1288 7068 2260 2640"
            holder="Erickson"
          />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(450).duration(700).springify().damping(14)}
          style={{
            position: 'absolute',
            transform: [{ translateX: 30 }, { translateY: 60 }, { rotate: '4deg' }],
          }}
        >
          <CreditCard
            variant="black"
            label="Platinum"
            number="1288 7068 2260 2640"
            holder="Aden Erickson"
            extra="05/24"
          />
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInUp.delay(650).duration(600)}
        style={styles.heroWrap}
      >
        <Text style={styles.hero}>Better Homes,{'\n'}Smarter, For{'\n'}Your Finance.</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(800).duration(500)}
        style={styles.ctaWrap}
      >
        <AnimatedPressable
          onPressIn={onBtnPressIn}
          onPressOut={onBtnPressOut}
          onPress={() => openAuth('signup')}
          style={[styles.ctaBtn, btnStyle]}
        >
          <Text style={styles.ctaText}>Let's Go!</Text>
          <Ionicons name="arrow-forward" size={20} color="#0B1435" style={{ marginLeft: 8 }} />
        </AnimatedPressable>

        <Pressable
          onPress={() => openAuth('signin')}
          hitSlop={10}
          style={styles.signInLink}
        >
          <Text style={styles.signInText}>
            Already have account?{' '}
            <Text style={styles.signInTextBold}>Sign in</Text>
          </Text>
        </Pressable>
      </Animated.View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => !loading && setModalVisible(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
          pointerEvents="box-none"
        >
          <Animated.View
            entering={SlideInDown.duration(320)}
            style={styles.sheet}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </Text>
            <Text style={styles.sheetSubtitle}>
              {mode === 'signup'
                ? 'Start tracking spending in seconds.'
                : 'Welcome back to Filey.'}
            </Text>

            {mode === 'signup' ? (
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color="rgba(11,20,53,0.48)" />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Name"
                  placeholderTextColor="rgba(11,20,53,0.48)"
                  style={styles.input}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            ) : null}

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="rgba(11,20,53,0.48)" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="rgba(11,20,53,0.48)"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="rgba(11,20,53,0.48)" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="rgba(11,20,53,0.48)"
                style={styles.input}
                secureTextEntry
                editable={!loading}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              onPress={submit}
              disabled={loading}
              style={({ pressed }) => [
                styles.sheetCta,
                pressed && { opacity: 0.88 },
                loading && { opacity: 0.72 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.sheetCtaText}>
                    {mode === 'signup' ? 'Create account' : 'Sign in'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
              hitSlop={10}
              style={{ alignSelf: 'center', paddingVertical: 8, marginTop: 4 }}
            >
              <Text style={styles.switchModeText}>
                {mode === 'signup'
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Create one"}
              </Text>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const CARD_W = 340;
const CARD_H = 220;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B1435',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dotOnline: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  statusText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '500',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 16,
  },
  titleSmall: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.92,
  },
  cardStack: {
    height: CARD_H + 80,
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 22,
    padding: 22,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  cardHighlight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: 2,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardHolderLabel: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardHolder: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cardVisa: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  heroWrap: {
    marginTop: 24,
  },
  hero: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  ctaWrap: {
    marginTop: 'auto',
  },
  ctaBtn: {
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  ctaText: {
    color: '#0B1435',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  signInLink: {
    alignSelf: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  signInText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
  },
  signInTextBold: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(11,20,53,0.14)',
    marginBottom: 14,
  },
  sheetTitle: {
    color: '#0B1435',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sheetSubtitle: {
    color: 'rgba(11,20,53,0.64)',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 18,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F6FC',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(11,20,53,0.06)',
  },
  input: {
    flex: 1,
    height: 52,
    marginLeft: 10,
    color: '#0B1435',
    fontSize: 15,
  },
  errorText: {
    color: '#FF5470',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 6,
  },
  sheetCta: {
    marginTop: 8,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2A63E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchModeText: {
    color: 'rgba(11,20,53,0.64)',
    fontSize: 13,
  },
});
