import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';

const ONBOARDING_STEPS = [
  {
    title: 'Scan in Seconds',
    desc: 'Snap a photo of any receipt and let our AI extract the details instantly.',
    icon: 'camera-outline',
    color: '#44e571'
  },
  {
    title: 'UAE VAT Compliant',
    desc: 'Automatically track 5% VAT and ensure your business meets FTA standards.',
    icon: 'shield-checkmark-outline',
    color: '#44e571'
  },
  {
    title: 'Secure 5-Year Vault',
    desc: 'Your documents are safely stored for the legal retention period, always ready.',
    icon: 'lock-closed-outline',
    color: '#44e571'
  }
];

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
      <View style={styles.content}>
        <Animated.View
          key={currentStep}
          entering={FadeInDown.duration(600).springify()}
          style={styles.card}
        >
          <View style={[styles.iconCircle, { backgroundColor: c.limeLight }]}>
            <Ionicons name={step.icon} size={64} color={step.color} />
          </View>
          <Text style={[styles.title, { color: c.text }]}>{step.title}</Text>
          <Text style={[styles.desc, { color: c.textSecondary }]}>{step.desc}</Text>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {ONBOARDING_STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === currentStep ? c.lime : c.border, width: i === currentStep ? 20 : 8 }
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={nextStep}
            style={[styles.nextBtn, { backgroundColor: c.lime }]}
          >
            <Text style={styles.nextBtnText}>
              {currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#00531f" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.xxl, justifyContent: 'center', alignItems: 'center' },
  card: {
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
    marginBottom: 60
  },
  iconCircle: {
    width: 140, height: 140, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32, borderWidth: BorderWidth.thin, borderColor: 'rgba(68,229,113,0.3)'
  },
  title: {
    ...Typography.hero,
    textAlign: 'center',
    marginBottom: 16
  },
  desc: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: Radius.pill,
    borderWidth: BorderWidth.thin,
    borderColor: '#000',
    ...Shadow.hardMd
  },
  nextBtnText: {
    ...Typography.btnPrimary,
    color: '#00531f'
  },
});
