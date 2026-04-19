import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Pressable, Platform,
} from 'react-native';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  useAnimatedStyle, useSharedValue, withTiming, withSpring,
  withRepeat, withSequence,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';

const STEPS = [
  { id: 'check',    label: 'Checking AI model status', icon: 'search-outline' },
  { id: 'download', label: 'Downloading AI model',     icon: 'cloud-download-outline' },
  { id: 'verify',   label: 'Verifying model integrity',icon: 'shield-checkmark-outline' },
  { id: 'ready',    label: 'AI engine ready',          icon: 'checkmark-circle-outline' },
];

const MODEL_TOTAL_MB = 2457;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SpringPressable({ children, style, onPress, ...rest }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
      style={[style, anim]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

function BreathingOrb() {
  const s = useSharedValue(1);
  const glow = useSharedValue(0.4);
  useEffect(() => {
    s.value = withRepeat(withSequence(
      withTiming(1.08, { duration: 1400 }),
      withTiming(1, { duration: 1400 }),
    ), -1, false);
    glow.value = withRepeat(withSequence(
      withTiming(0.8, { duration: 1400 }),
      withTiming(0.4, { duration: 1400 }),
    ), -1, false);
  }, []);
  const coreStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: s.value * 1.3 }] }));
  return (
    <View style={styles.orbWrap}>
      <Animated.View style={[styles.orbGlow, glowStyle]} />
      <Animated.View style={[styles.orbCore, coreStyle]}>
        <Ionicons name="sparkles" size={44} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

export default function AIInitializationScreen({ darkMode, onComplete }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedMB, setDownloadedMB] = useState(0);
  const [error, setError] = useState(null);
  const progressAnim = useSharedValue(0);
  const resumableRef = useRef(null);
  const lastSavedPct = useRef(-1);

  useEffect(() => {
    runInitialization();
    return () => { resumableRef.current?.pauseAsync?.()?.catch?.(() => {}); };
  }, []);

  const getFileSystem = () => require('expo-file-system/legacy');

  const runInitialization = async () => {
    try {
      const FileSystem = getFileSystem();
      const modelDir = `${FileSystem.documentDirectory}ai/`;
      const modelPath = `${modelDir}gemma-4-E2B-it.litertlm`;
      const statePath = `${modelDir}download_state.json`;

      setCurrentStep(0);
      const modelInfo = await FileSystem.getInfoAsync(modelPath);
      if (modelInfo.exists && modelInfo.size > 1_000_000) {
        setCurrentStep(3);
        setDownloadProgress(100);
        setDownloadedMB(MODEL_TOTAL_MB);
        progressAnim.value = withTiming(1, { duration: 800 });
        setTimeout(() => onComplete?.(), 1200);
        return;
      }

      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
      }

      const cdnUrl = process.env.EXPO_PUBLIC_MODEL_CDN_URL ||
        'https://pub-7c6ed127f05443e089954241c1b7d763.r2.dev/gemma-4-E2B-it.litertlm';

      setCurrentStep(1);

      let savedState = null;
      try {
        const stateInfo = await FileSystem.getInfoAsync(statePath);
        if (stateInfo.exists) {
          const stateJson = await FileSystem.readAsStringAsync(statePath);
          savedState = JSON.parse(stateJson);
        }
      } catch { savedState = null; }

      const onProgress = (progress) => {
        const total = progress.totalBytesExpectedToWrite || 1;
        const pct = Math.round((progress.totalBytesWritten / total) * 100);
        const mb = Math.round(progress.totalBytesWritten / (1024 * 1024));
        setDownloadProgress(pct);
        setDownloadedMB(mb);
        progressAnim.value = progress.totalBytesWritten / total;

        if (pct - lastSavedPct.current >= 5 && resumableRef.current) {
          lastSavedPct.current = pct;
          try {
            const snapshot = JSON.stringify(resumableRef.current.savable());
            FileSystem.writeAsStringAsync(statePath, snapshot).catch(() => {});
          } catch {}
        }
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        cdnUrl, modelPath, {}, onProgress, savedState ?? undefined,
      );
      resumableRef.current = downloadResumable;

      const result = await downloadResumable.downloadAsync();
      await FileSystem.deleteAsync(statePath, { idempotent: true }).catch(() => {});
      if (!result?.uri) throw new Error('Download did not complete.');

      setCurrentStep(2);
      const verifyInfo = await FileSystem.getInfoAsync(modelPath);
      if (!verifyInfo.exists || verifyInfo.size < 1_000_000) {
        throw new Error('Model download incomplete or corrupted.');
      }

      setCurrentStep(3);
      setDownloadProgress(100);
      setDownloadedMB(MODEL_TOTAL_MB);
      progressAnim.value = withTiming(1, { duration: 500 });
      setTimeout(() => onComplete?.(), 1500);
    } catch (err) {
      setError(err.message || 'Failed to initialize AI.');
    }
  };

  const handleRetry = () => {
    setError(null);
    setCurrentStep(0);
    setDownloadProgress(0);
    setDownloadedMB(0);
    progressAnim.value = 0;
    lastSavedPct.current = -1;
    runInitialization();
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressAnim.value * 100)}%`,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: '#2A63E2' }}>
      <StatusBar style="light" />
      <View style={[styles.hero, { paddingTop: insets.top + 40 }]}>
        <Animated.View entering={FadeInUp.duration(700)} style={{ alignItems: 'center' }}>
          <BreathingOrb />
          <Text style={styles.title}>Filely AI</Text>
          <Text style={styles.subtitle}>Waking up your offline intelligence…</Text>
        </Animated.View>
      </View>

      <View style={[styles.sheet, { backgroundColor: c.bg, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.handle} />
        <View style={styles.stepsSection}>
          {STEPS.map((step, i) => {
            const isActive = i === currentStep;
            const isComplete = i < currentStep;
            return (
              <Animated.View
                key={step.id}
                entering={FadeInDown.delay(i * 120).duration(500)}
                style={styles.stepRow}
              >
                <View style={[
                  styles.stepIcon,
                  {
                    backgroundColor: isComplete ? c.primary : (isActive ? c.primaryLight : c.card),
                    borderColor: isComplete ? c.primary : (isActive ? c.primary : c.borderSubtle),
                  },
                ]}>
                  {isComplete
                    ? <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    : isActive
                      ? <ActivityIndicator size="small" color={c.primary} />
                      : <Ionicons name={step.icon} size={16} color={c.textMuted} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.stepLabel,
                    { color: isComplete || isActive ? c.text : c.textMuted },
                  ]}>
                    {step.label}
                  </Text>
                  {step.id === 'download' && isActive && (
                    <Text style={[styles.stepMeta, { color: c.textMuted }]}>
                      {downloadedMB} / {MODEL_TOTAL_MB} MB · resumable
                    </Text>
                  )}
                </View>
                {isComplete && (
                  <View style={[styles.doneBadge, { backgroundColor: c.primaryLight }]}>
                    <Text style={{ color: c.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>DONE</Text>
                  </View>
                )}
              </Animated.View>
            );
          })}
        </View>

        {currentStep === 1 && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.progressSection}>
            <View style={[styles.progressBarBg, { backgroundColor: c.borderSubtle }]}>
              <Animated.View style={[styles.progressBarFill, { backgroundColor: c.primary }, progressStyle]} />
            </View>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: c.textMuted }]}>
                {downloadProgress}% · downloading
              </Text>
              <Text style={[styles.progressLabel, { color: c.text, fontWeight: '700' }]}>
                {downloadedMB} MB
              </Text>
            </View>
          </Animated.View>
        )}

        {error && (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.errorCard, { backgroundColor: c.negativeLight, borderColor: c.negative }]}>
            <Ionicons name="alert-circle" size={24} color={c.negative} />
            <Text style={[styles.errorText, { color: c.negative }]}>{error}</Text>
            <SpringPressable
              onPress={handleRetry}
              style={[styles.retryBtn, { backgroundColor: c.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Resume download"
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Resume Download</Text>
            </SpringPressable>
          </Animated.View>
        )}

        <Text style={[styles.footNote, { color: c.textMuted }]}>
          AI runs offline on your device. No data leaves your phone.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingBottom: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  orbWrap: {
    width: 140, height: 140,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 22,
  },
  orbGlow: {
    position: 'absolute',
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  orbCore: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 6 },
  sheet: {
    flex: 1, marginTop: -28,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 8, paddingHorizontal: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(11,23,53,0.15)',
    alignSelf: 'center', marginTop: 6, marginBottom: 24,
  },
  stepsSection: { gap: 14, marginBottom: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepIcon: {
    width: 40, height: 40, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  stepLabel: { fontSize: 15, fontWeight: '700' },
  stepMeta: { fontSize: 12, marginTop: 2 },
  doneBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  progressSection: { marginBottom: 20 },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressLabel: { fontSize: 12 },
  errorCard: {
    alignItems: 'center', gap: 10, padding: 18,
    borderRadius: 18, borderWidth: 1, marginTop: 6,
  },
  errorText: { fontSize: 13.5, textAlign: 'center', fontWeight: '600' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 22,
    marginTop: 4,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  footNote: { textAlign: 'center', fontSize: 12, marginTop: 'auto', paddingTop: 20 },
});
