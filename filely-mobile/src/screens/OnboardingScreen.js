import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import Animated, {
  FadeInDown, FadeInUp, FadeIn, FadeOut,
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withRepeat, withSequence, withDelay, Easing, interpolate,
  SlideInRight, SlideOutLeft,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, Spacing, BorderWidth } from '../theme/tokens';

const { width: SCREEN_W } = Dimensions.get('window');
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const ONBOARDING_STEPS = [
  {
    title: 'Scan in\nSeconds',
    desc: 'Snap a photo of any receipt and let our AI extract the details instantly.',
    icon: 'camera-outline',
    color: '#44e571',
    accentBg: 'rgba(68,229,113,0.12)',
  },
  {
    title: 'UAE VAT\nCompliant',
    desc: 'Automatically track 5% VAT and ensure your business meets FTA standards.',
    icon: 'shield-checkmark-outline',
    color: '#4F8EFF',
    accentBg: 'rgba(79,142,255,0.12)',
  },
  {
    title: 'Secure\n5-Year Vault',
    desc: 'Your documents are safely stored for the legal retention period, always ready.',
    icon: 'lock-closed-outline',
    color: '#F59E0B',
    accentBg: 'rgba(245,158,11,0.12)',
  },
];

/* ─── Animated Icon with pulse ring ──────────────────────── */
function PulsingIcon({ icon, color, accentBg }) {
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.3);
  const iconScale = useSharedValue(0);

  useEffect(() => {
    iconScale.value = withSpring(1, { damping: 10, stiffness: 80 });
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.15, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ), -1, false
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={[styles.iconRing, { borderColor: color }, ringStyle]} />
      <Animated.View style={[styles.iconCircle, { backgroundColor: accentBg }, iconStyle]}>
        <Ionicons name={icon} size={56} color={color} />
      </Animated.View>
    </View>
  );
}

/* ─── Spring Pressable ──────────────────────────────────── */
function SpringButton({ children, onPress, style }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.93, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
      activeOpacity={0.9}
      style={[style, animStyle]}
      accessibilityRole="button"
    >
      {children}
    </AnimatedTouchable>
  );
}

export default function OnboardingScreen({ darkMode, onComplete }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
    }
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Skip button */}
      <Animated.View entering={FadeIn.delay(800).duration(400)} style={styles.skipWrap}>
        <TouchableOpacity
          onPress={onComplete}
          style={styles.skipBtn}
          accessibilityLabel="Skip onboarding"
          accessibilityRole="button"
        >
          <Text style={[styles.skipText, { color: c.textMuted }]}>Skip</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.content}>
        {/* Animated Step Card */}
        <Animated.View
          key={`step-${currentStep}`}
          entering={SlideInRight.duration(500).springify()}
          exiting={SlideOutLeft.duration(300)}
          style={styles.card}
        >
          <PulsingIcon icon={step.icon} color={step.color} accentBg={step.accentBg} />

          <Animated.Text
            entering={FadeInDown.delay(200).duration(500).springify()}
            style={[styles.title, { color: c.text }]}
          >
            {step.title}
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(350).duration(500).springify()}
            style={[styles.desc, { color: c.textSecondary }]}
          >
            {step.desc}
          </Animated.Text>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Animated pagination dots */}
          <View style={styles.pagination}>
            {ONBOARDING_STEPS.map((_, i) => {
              const isActive = i === currentStep;
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isActive ? step.color : c.border,
                      width: isActive ? 28 : 8,
                    },
                    isActive && {
                      shadowColor: step.color,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.4,
                      shadowRadius: 6,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Next / Get Started button */}
          <SpringButton
            onPress={nextStep}
            style={[
              styles.nextBtn,
              {
                backgroundColor: step.color,
                borderColor: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)',
              },
              Shadow.limeMd,
            ]}
          >
            <Text style={styles.nextBtnText}>
              {currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
            <View style={[styles.nextBtnArrow, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
              <Ionicons name="arrow-forward" size={20} color="#003516" />
            </View>
          </SpringButton>

          {/* Step counter */}
          <Text style={[styles.stepCounter, { color: c.textMuted }]}>
            {currentStep + 1} of {ONBOARDING_STEPS.length}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipWrap: { position: 'absolute', top: 60, right: 24, zIndex: 10 },
  skipBtn: { paddingHorizontal: 16, paddingVertical: 10, minWidth: 44, minHeight: 44, justifyContent: 'center' },
  skipText: { ...Typography.bodyBold },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xxl },
  card: { alignItems: 'center', width: '100%', marginBottom: 80 },

  // Icon
  iconContainer: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  iconRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  iconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: { ...Typography.hero, textAlign: 'center', marginBottom: 16 },
  desc: { ...Typography.body, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20, maxWidth: 320 },

  // Footer
  footer: { position: 'absolute', bottom: 60, width: '100%', alignItems: 'center', paddingHorizontal: Spacing.xxl },
  pagination: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 32,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: BorderWidth.thin,
    width: '100%',
    justifyContent: 'center',
  },
  nextBtnText: { ...Typography.btnPrimary, color: '#003516', flex: 1, textAlign: 'center' },
  nextBtnArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCounter: { ...Typography.micro, marginTop: 16, letterSpacing: 1 },
});
