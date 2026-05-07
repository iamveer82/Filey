import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, Alert, ActivityIndicator, ScrollView, TextInput, Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { protectPdf } from '../services/pdfTools';
import { addFile } from '../services/recentFiles';

export default function ProtectPDFScreen({ navigation }) {
  const [pdf, setPdf] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState({
    printing: true,
    copying: false,
    modifying: false,
    annotating: true,
  });
  const [busy, setBusy] = useState(false);

  const pickPdf = async () => {
    const r = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (r.canceled || !r.assets?.[0]) return;
    setPdf(r.assets[0]);
  };

  const togglePermission = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const runProtect = async () => {
    if (!pdf) {
      Alert.alert('Select PDF', 'Please select a PDF to protect.');
      return;
    }
    if (password.length < 4) {
      Alert.alert('Password too short', 'Use at least 4 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords mismatch', 'Password and confirmation must match.');
      return;
    }
    setBusy(true);
    try {
      const res = await protectPdf(pdf.uri, password, pdf.name || 'protected', permissions);
      if (res.success && res.uri) {
        await addFile({ name: `Protected-${Date.now()}.pdf`, kind: 'pdf', uri: res.uri });
        Alert.alert('Protected!', 'PDF locked with password.', [
          {
            text: 'Share',
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: 'Save Protected PDF' });
            },
          },
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Protection failed', res.error || 'Could not protect PDF.');
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to protect PDF');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0B1435" />
        </Pressable>
        <Text style={styles.headerTitle}>Protect PDF</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {!pdf && (
          <Animated.View entering={FadeInUp.duration(350)}>
            <Pressable onPress={pickPdf} style={styles.pickCard}>
              <Ionicons name="cloud-upload-outline" size={32} color="#2A63E2" />
              <Text style={styles.pickTitle}>Select PDF</Text>
              <Text style={styles.pickDesc}>Tap to choose a PDF from your files</Text>
            </Pressable>
          </Animated.View>
        )}

        {pdf && (
          <Animated.View entering={FadeInUp.duration(300)}>
            <View style={styles.pdfChip}>
              <Ionicons name="document-text" size={20} color="#2A63E2" />
              <Text style={styles.pdfChipName} numberOfLines={1}>{pdf.name || 'document.pdf'}</Text>
              <Pressable onPress={() => setPdf(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="rgba(11,20,53,0.35)" />
              </Pressable>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(100).duration(350)} style={styles.section}>
          <Text style={styles.sectionLabel}>PASSWORD</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor="rgba(11,20,53,0.35)"
              secureTextEntry={!showPassword}
              style={styles.input}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(11,20,53,0.4)" />
            </Pressable>
          </View>

          <View style={[styles.inputWrap, { marginTop: 10 }]}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor="rgba(11,20,53,0.35)"
              secureTextEntry={!showPassword}
              style={styles.input}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(180).duration(350)} style={styles.section}>
          <Text style={styles.sectionLabel}>PERMISSIONS</Text>
          {[
            { key: 'printing', label: 'Allow printing', icon: 'print-outline' },
            { key: 'copying', label: 'Allow copying text', icon: 'copy-outline' },
            { key: 'modifying', label: 'Allow modifying', icon: 'create-outline' },
            { key: 'annotating', label: 'Allow annotating', icon: 'chatbox-outline' },
          ].map((item) => (
            <View key={item.key} style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name={item.icon} size={18} color="#2A63E2" style={{ marginRight: 10 }} />
                <Text style={styles.rowLabel}>{item.label}</Text>
              </View>
              <Switch
                value={permissions[item.key]}
                onValueChange={() => togglePermission(item.key)}
                trackColor={{ false: 'rgba(11,20,53,0.1)', true: '#2A63E2' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="rgba(11,20,53,0.1)"
              />
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      {pdf && (
        <View style={styles.bottomBar}>
          <Pressable
            onPress={runProtect}
            disabled={busy}
            style={[styles.actionBtn, busy && { opacity: 0.6 }]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.actionText}>Lock PDF</Text>
                <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'ios' ? 52 : 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(11,20,53,0.06)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0B1435' },

  pickCard: {
    backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(11,20,53,0.08)',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingVertical: 44, gap: 8,
  },
  pickTitle: { fontSize: 16, fontWeight: '700', color: '#0B1435' },
  pickDesc: { fontSize: 13, color: 'rgba(11,20,53,0.45)', textAlign: 'center' },

  pdfChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.06)',
  },
  pdfChipName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0B1435' },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(11,20,53,0.45)', letterSpacing: 0.8, marginBottom: 10,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.08)',
    paddingHorizontal: 14,
  },
  input: { flex: 1, height: 52, fontSize: 15, color: '#0B1435' },
  eyeBtn: { padding: 6 },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(11,20,53,0.06)',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#0B1435' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: 'rgba(11,20,53,0.08)',
    paddingHorizontal: 20, paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  actionBtn: {
    height: 52, borderRadius: 14,
    backgroundColor: '#2A63E2',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  actionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
