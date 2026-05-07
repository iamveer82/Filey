import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STEPS = [
  {
    icon: 'wallet',
    title: 'Track every\ndirham',
    subtitle: 'Capture and categorize every expense with instant AI-powered insights.',
  },
  {
    icon: 'shield-checkmark',
    title: 'UAE VAT on\nautopilot',
    subtitle: 'Automatic 5% VAT tracking and FTA-ready filings, quarter after quarter.',
  },
  {
    icon: 'camera',
    title: 'All your receipts,\none tap',
    subtitle: 'Scan, staple, and archive for 5 years — compliance made effortless.',
  },
];

function SpringButton({ children, onPress, style, accessibilityLabel }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 14, stiffness: 220 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 220 }); }}
      style={[style, animStyle]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
    >
      {children}
    </AnimatedPressable>
  );
}

function IllustrationCircle({ icon, c }) {
  return (
    <View style={styles.illusWrap}>
      <View style={[styles.illusOuter, { backgroundColor: c.primaryBg }]} />
      <View style={[styles.illusMid, { backgroundColor: c.primaryLight }]} />
      <View style={[styles.illusInner, { backgroundColor: c.primary }]}>
        <Ionicons name={icon} size={72} color="#FFFFFF" />
      </View>
    </View>
  );
}

export default function OnboardingScreen({ darkMode = false, onComplete }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) onComplete?.();
    else setStep(step + 1);
  };

  const current = STEPS[step];

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

      {/* Progress indicator */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[styles.progressRow, { paddingTop: insets.top + 16 }]}
      >
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSeg,
              {
                backgroundColor: i <= step ? c.primary : c.border,
                flex: i === step ? 2 : 1,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Skip */}
      <Pressable
        onPress={onComplete}
        hitSlop={16}
        style={[styles.skip, { top: insets.top + 32 }]}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
      >
        <Text style={[styles.skipText, { color: c.textMuted }]}>Skip</Text>
      </Pressable>

      {/* Step content */}
      <View style={styles.content}>
        <Animated.View
          key={`illus-${step}`}
          entering={FadeInUp.duration(500).springify().damping(16)}
        >
          <IllustrationCircle icon={current.icon} c={c} />
        </Animated.View>

        <Animated.Text
          key={`title-${step}`}
          entering={FadeInUp.delay(60).duration(500)}
          style={[styles.title, { color: c.text }]}
        >
          {current.title}
        </Animated.Text>

        <Animated.Text
          key={`sub-${step}`}
          entering={FadeInUp.delay(120).duration(500)}
          style={[styles.subtitle, { color: c.textMuted }]}
        >
          {current.subtitle}
        </Animated.Text>
      </View>

      {/* Bottom actions */}
      <Animated.View
        entering={FadeIn.delay(200).duration(400)}
        style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}
      >
        <SpringButton
          onPress={next}
          style={[styles.cta, { backgroundColor: c.primary }]}
          accessibilityLabel={isLast ? 'Get started' : 'Continue'}
        >
          <Text style={styles.ctaText}>{isLast ? 'Get Started' : 'Continue'}</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </SpringButton>
      </Animated.View>
    </View>
  );
}

const ILLUS = 240;

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
  },
  progressSeg: {
    height: 6,
    borderRadius: 3,
  },
  skip: {
    position: 'absolute',
    right: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  illusWrap: {
    width: ILLUS,
    height: ILLUS,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 56,
  },
  illusOuter: {
    position: 'absolute',
    width: ILLUS,
    height: ILLUS,
    borderRadius: ILLUS / 2,
  },
  illusMid: {
    position: 'absolute',
    width: ILLUS - 48,
    height: ILLUS - 48,
    borderRadius: (ILLUS - 48) / 2,
  },
  illusInner: {
    width: ILLUS - 100,
    height: ILLUS - 100,
    borderRadius: (ILLUS - 100) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2A63E2',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  cta: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2A63E2',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
