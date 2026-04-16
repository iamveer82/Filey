import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, Spacing, BorderWidth } from '../theme/tokens';

const STEPS = [
  { id: 'check',    label: 'Checking AI model status',   icon: 'search-outline'            },
  { id: 'download', label: 'Downloading AI model',        icon: 'cloud-download-outline'    },
  { id: 'verify',   label: 'Verifying model integrity',   icon: 'shield-checkmark-outline'  },
  { id: 'ready',    label: 'AI engine ready',             icon: 'checkmark-circle-outline'  },
];

const MODEL_TOTAL_MB = 2457; // Gemma 4 E2B ~2.4 GB

export default function AIInitializationScreen({ darkMode, onComplete }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const [currentStep,      setCurrentStep]      = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedMB,     setDownloadedMB]     = useState(0);
  const [error,            setError]            = useState(null);
  const progressAnim = useSharedValue(0);

  // Keep a ref to the resumable instance so we can call savable()
  const resumableRef = useRef(null);
  // Track last-saved progress % to avoid excessive disk writes
  const lastSavedPct = useRef(-1);

  useEffect(() => {
    runInitialization();
    // Cleanup: pause download on unmount
    return () => { resumableRef.current?.pauseAsync?.()?.catch?.(() => {}); };
  }, []);

  const getFileSystem = () => require('expo-file-system/legacy');

  const runInitialization = async () => {
    try {
      const FileSystem = getFileSystem();
      const modelDir   = `${FileSystem.documentDirectory}ai/`;
      const modelPath  = `${modelDir}gemma-4-E2B-it.litertlm`;
      const statePath  = `${modelDir}download_state.json`;

      // ── Step 0: Check if model already exists ──────────────
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

      // ── Ensure model directory exists ──────────────────────
      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
      }

      const cdnUrl = process.env.EXPO_PUBLIC_MODEL_CDN_URL ||
        'https://pub-7c6ed127f05443e089954241c1b7d763.r2.dev/gemma-4-E2B-it.litertlm';

      // ── Step 1: Start / resume download ────────────────────
      setCurrentStep(1);

      // Try to load previously saved download state for true resumability
      let savedState = null;
      try {
        const stateInfo = await FileSystem.getInfoAsync(statePath);
        if (stateInfo.exists) {
          const stateJson = await FileSystem.readAsStringAsync(statePath);
          savedState = JSON.parse(stateJson);
        }
      } catch {
        savedState = null;
      }

      const onProgress = (progress) => {
        const total  = progress.totalBytesExpectedToWrite || 1;
        const pct    = Math.round((progress.totalBytesWritten / total) * 100);
        const mb     = Math.round(progress.totalBytesWritten / (1024 * 1024));
        setDownloadProgress(pct);
        setDownloadedMB(mb);
        progressAnim.value = progress.totalBytesWritten / total;

        // Persist download state to disk every 5% increment so we can resume
        if (pct - lastSavedPct.current >= 5 && resumableRef.current) {
          lastSavedPct.current = pct;
          try {
            const snapshot = JSON.stringify(resumableRef.current.savable());
            FileSystem.writeAsStringAsync(statePath, snapshot).catch(() => {});
          } catch {}
        }
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        cdnUrl,
        modelPath,
        {},
        onProgress,
        savedState ?? undefined,
      );
      resumableRef.current = downloadResumable;

      const result = await downloadResumable.downloadAsync();

      // Clear persisted state on success
      await FileSystem.deleteAsync(statePath, { idempotent: true }).catch(() => {});

      if (!result?.uri) throw new Error('Download did not complete.');

      // ── Step 2: Verify ─────────────────────────────────────
      setCurrentStep(2);
      const verifyInfo = await FileSystem.getInfoAsync(modelPath);
      if (!verifyInfo.exists || verifyInfo.size < 1_000_000) {
        throw new Error('Model download incomplete or corrupted.');
      }

      // ── Step 3: Ready ──────────────────────────────────────
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
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Animated.View entering={FadeInUp.duration(800).springify()} style={styles.logoSection}>
        <View style={[styles.logoIcon, { backgroundColor: 'rgba(79,142,255,0.12)', borderColor: 'rgba(79,142,255,0.2)', borderWidth: 1 }]}>
          <Ionicons name="sparkles" size={48} color="#4F8EFF" />
        </View>
        <Text style={[styles.logoTitle, { color: c.text }]}>Filely AI</Text>
        <Text style={[styles.logoSubtitle, { color: c.textSecondary }]}>
          Waking up your offline intelligence...
        </Text>
      </Animated.View>

      <View style={styles.stepsSection}>
        {STEPS.map((step, i) => {
          const isActive   = i === currentStep;
          const isComplete = i < currentStep;

          return (
            <Animated.View
              key={step.id}
              entering={FadeInDown.delay(i * 200).duration(600).springify()}
              style={styles.stepRow}
            >
              <View style={[
                styles.stepIcon,
                {
                  backgroundColor: isComplete ? '#44e571' : isActive ? c.surfaceLow : 'transparent',
                  borderColor:     isComplete ? 'rgba(0,83,31,0.3)' : isActive ? '#4F8EFF' : c.border,
                },
              ]}>
                {isComplete  ? <Ionicons name="checkmark" size={18} color="#003516" /> :
                 isActive    ? <ActivityIndicator size="small" color={isActive ? '#4F8EFF' : c.lime} /> :
                               <Ionicons name={step.icon} size={16} color={c.textMuted} />}
              </View>
              <Text style={[
                styles.stepLabel,
                { color: isComplete ? '#44e571' : isActive ? c.text : c.textMuted },
              ]}>
                {step.label}
              </Text>
              {step.id === 'download' && isActive && (
                <Text style={[styles.progressText, { color: c.textSecondary }]}>
                  {downloadedMB} / {MODEL_TOTAL_MB} MB
                </Text>
              )}
            </Animated.View>
          );
        })}
      </View>

      {currentStep === 1 && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.progressSection}>
          <View style={[styles.progressBarBg, { backgroundColor: c.surfaceLow }]}>
            <Animated.View style={[styles.progressBarFill, progressStyle]} />
          </View>
          <Text style={[styles.progressLabel, { color: c.textMuted }]}>
            {downloadProgress}% — Resumable download active
          </Text>
        </Animated.View>
      )}

      {error && (
        <Animated.View entering={FadeIn.duration(300)} style={[styles.errorSection, { borderColor: 'rgba(255,75,110,0.2)' }]}>
          <Ionicons name="alert-circle-outline" size={32} color="#FF4B6E" />
          <Text style={[styles.errorText, { color: '#FF4B6E' }]}>{error}</Text>
          <TouchableOpacity
            onPress={handleRetry}
            style={[styles.retryBtn, Shadow.softSm]}
            accessibilityRole="button"
            accessibilityLabel="Retry AI setup"
          >
            <Text style={styles.retryBtnText}>Resume Download</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xxl },
  logoSection:    { alignItems: 'center', marginBottom: 60 },
  logoIcon:       { width: 90, height: 90, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...Shadow.softSm },
  logoTitle:      { fontSize: 36, fontWeight: '900', letterSpacing: -1, marginBottom: 8 },
  logoSubtitle:   { ...Typography.bodySmall, textAlign: 'center' },
  stepsSection:   { gap: 20, marginBottom: 40 },
  stepRow:        { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepIcon:       { width: 40, height: 40, borderRadius: Radius.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepLabel:      { fontSize: 16, fontWeight: '700', flex: 1 },
  progressText:   { fontSize: 12, fontWeight: '600' },
  progressSection:{ width: '100%', marginBottom: 30 },
  progressBarBg:  { height: 10, borderRadius: Radius.full, overflow: 'hidden' },
  progressBarFill:{ height: '100%', backgroundColor: '#4F8EFF', borderRadius: Radius.full },
  progressLabel:  { fontSize: 12, marginTop: 10, textAlign: 'center' },
  errorSection:   { alignItems: 'center', gap: 16, padding: 24, borderRadius: Radius.lg, backgroundColor: 'rgba(255,75,110,0.05)', borderWidth: 1 },
  errorText:      { fontSize: 14, textAlign: 'center', fontWeight: '600' },
  retryBtn:       { backgroundColor: '#44e571', borderRadius: Radius.pill, paddingHorizontal: 32, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(0,83,31,0.3)' },
  retryBtnText:   { color: '#003516', fontWeight: '900', fontSize: 14 },
});
