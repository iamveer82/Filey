import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Switch, Image, Alert, Modal, ActivityIndicator, Linking, Platform,
} from 'react-native';
import Animated, {
  FadeInDown, FadeIn, ZoomIn,
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolateColor, runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const MAX_CERT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

let ImagePicker, DocumentPicker, FileSystem;
if (Platform.OS !== 'web') {
  ImagePicker = require('expo-image-picker');
  DocumentPicker = require('expo-document-picker');
  FileSystem = require('expo-file-system/legacy');
}

/* ── Animated wrappers ─────────────────────────────────── */
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const SPRING_CONFIG = { damping: 15, stiffness: 150, mass: 0.8 };
const PRESS_SCALE = 0.97;

function SpringPressable({ onPress, style, children, disabled, ...rest }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <AnimatedTouchable
      activeOpacity={0.85}
      onPressIn={() => { scale.value = withSpring(PRESS_SCALE, SPRING_CONFIG); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG); }}
      onPress={onPress}
      disabled={disabled}
      style={[animStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedTouchable>
  );
}

/* ── Section header ────────────────────────────────────── */
function SectionHeader({ label, delay = 0 }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400).springify()}>
      <Text style={[styles.sectionLabel]}>{label}</Text>
    </Animated.View>
  );
}

/* ── Grouped section card (iOS style) ──────────────────── */
function GroupedSection({ children, c, darkMode, delay = 0 }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(450).springify()}
      style={[
        styles.groupedCard,
        {
          backgroundColor: darkMode ? c.card : c.bgSecondary,
          borderColor: c.border,
          ...(darkMode ? Shadow.softSm : Shadow.darkSm),
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* ── Row separator ─────────────────────────────────────── */
function RowSeparator({ c }) {
  return <View style={[styles.rowSeparator, { backgroundColor: c.border }]} />;
}

/* ── Menu row inside grouped card ──────────────────────── */
function MenuRow({ icon, label, sub, color, c, onPress, isLast }) {
  return (
    <>
      <SpringPressable
        onPress={onPress}
        style={styles.groupedRow}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={styles.groupedRowLeft}>
          <View style={[styles.menuIcon, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          <View>
            <Text style={[styles.menuLabel, { color: c.text }]}>{label}</Text>
            {sub ? <Text style={[styles.menuSub, { color: c.accent }]}>{sub}</Text> : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
      </SpringPressable>
      {!isLast && <RowSeparator c={c} />}
    </>
  );
}

/* ── Toggle row inside grouped card ────────────────────── */
function ToggleRow({ icon, label, color, c, value, onValueChange, isLast }) {
  return (
    <>
      <View style={styles.groupedRow}>
        <View style={styles.groupedRowLeft}>
          <View style={[styles.menuIcon, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          <Text style={[styles.menuLabel, { color: c.text }]}>{label}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ true: '#3B6BFF', false: c.surfaceLow }}
          thumbColor="#fff"
        />
      </View>
      {!isLast && <RowSeparator c={c} />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function SettingsScreen({ darkMode }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, profile: authProfile, signOut, updateProfile: authUpdateProfile, orgId } = useAuth();
  const isWeb = Platform.OS === 'web';

  /* ── State ─────────────────────────────── */
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [certName, setCertName] = useState('');
  const [showAddCert, setShowAddCert] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCertView, setShowCertView] = useState(null);

  /* ── Camera badge press animation ──────── */
  const cameraBadgeScale = useSharedValue(1);
  const cameraBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cameraBadgeScale.value }],
  }));

  /* ── Data fetching ─────────────────────── */
  useEffect(() => { fetchProfile(); fetchCertificates(); }, []);

  const fetchProfile = async () => {
    try {
      if (!isWeb && authProfile) {
        setProfile({ name: authProfile.name || user?.email || 'User', email: user?.email || '', company: authProfile.company || '' });
      } else {
        const d = await api.getProfile();
        setProfile(d.profile);
      }
    } catch { try { const d = await api.getProfile(); setProfile(d.profile); } catch {} }
  };

  useEffect(() => {
    if (profile) { setEditName(profile.name || ''); setEditEmail(profile.email || ''); setEditCompany(profile.company || ''); }
  }, [profile]);

  const fetchCertificates = async () => {
    try {
      if (!isWeb && orgId && orgId !== 'default') {
        const { db } = require('../lib/supabase');
        const { data } = await db.getCertificates(orgId);
        setCertificates(data || []);
      } else {
        const d = await api.getCertificates();
        setCertificates(d.certificates || []);
      }
    } catch { try { const d = await api.getCertificates(); setCertificates(d.certificates || []); } catch {} }
  };

  const saveProfile = async () => {
    try {
      if (!isWeb && user) await authUpdateProfile({ name: editName, email: editEmail, company: editCompany });
      else await api.updateProfile({ name: editName, email: editEmail, company: editCompany });
      setProfile({ ...profile, name: editName, email: editEmail, company: editCompany });
      setEditing(false);
    } catch { Alert.alert('Error', 'Could not save profile. Please try again.'); }
  };

  /* ── Certificate logic ─────────────────── */
  const pickAndUpload = () => {
    if (isWeb) { Alert.alert('Not available', 'Certificate upload requires the mobile app.'); return; }
    if (!certName.trim()) { Alert.alert('Name required', 'Please enter a certificate name first.'); return; }
    Alert.alert('Add Certificate', 'Choose file source', [
      { text: 'Photo Library', onPress: pickFromPhotos },
      { text: 'Files (PDF, Docs\u2026)', onPress: pickFromFiles },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickFromPhotos = async () => {
    if (isWeb || !ImagePicker) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photo library to upload certificates.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64 && asset.base64.length * 0.75 > MAX_CERT_SIZE_BYTES) {
        Alert.alert('File too large', 'Please choose a file smaller than 5 MB.');
        return;
      }
      await uploadCert(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`, asset.mimeType || 'image/jpeg');
    }
  };

  const pickFromFiles = async () => {
    if (isWeb || !DocumentPicker || !FileSystem) return;
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.size && asset.size > MAX_CERT_SIZE_BYTES) {
        Alert.alert('File too large', 'Please choose a file smaller than 5 MB.');
        return;
      }
      try {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        await uploadCert(`data:${asset.mimeType || 'application/octet-stream'};base64,${base64}`, asset.mimeType || 'application/octet-stream');
      } catch { Alert.alert('Error', 'Could not read the selected file.'); }
    }
  };

  const uploadCert = async (fileData, mimeType) => {
    setUploading(true);
    try {
      await api.uploadCertificate({ name: certName, file: fileData, mimeType });
      setCertName(''); setShowAddCert(false); fetchCertificates();
    } catch { Alert.alert('Upload failed', 'Could not upload the certificate. Please try again.'); }
    finally { setUploading(false); }
  };

  const deleteCertificate = (id) => {
    Alert.alert('Delete Certificate', 'Are you sure?', [
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.deleteCertificate(id); fetchCertificates(); } catch {} } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openCert = async (cert) => {
    if (!cert.file) return;
    if (cert.mimeType?.startsWith('image/')) { setShowCertView(cert); return; }
    if (isWeb) { Alert.alert('Not available', 'File preview requires the mobile app.'); return; }
    if (!FileSystem) return;
    try {
      const ext = cert.name.includes('.') ? cert.name.split('.').pop() : 'pdf';
      const path = `${FileSystem.cacheDirectory}cert_${cert.id}.${ext}`;
      const base64Data = cert.file.includes(',') ? cert.file.split(',')[1] : cert.file;
      await FileSystem.writeAsStringAsync(path, base64Data, { encoding: FileSystem.EncodingType.Base64 });
      await Linking.openURL(path);
    } catch { Alert.alert('Cannot open file', 'No app available to open this file type.'); }
  };

  const getFileIcon = (mimeType, name) => {
    if (mimeType?.startsWith('image/'))                              return 'image-outline';
    if (mimeType?.includes('pdf'))                                   return 'document-text-outline';
    if (mimeType?.includes('word') || name?.match(/\.docx?$/))      return 'document-outline';
    if (mimeType?.includes('sheet') || name?.match(/\.xlsx?$/))     return 'grid-outline';
    return 'document-text-outline';
  };

  const trn = profile?.trn || authProfile?.trn || '';

  /* ── Menu items ────────────────────────── */
  const securityItems = [
    { icon: 'shield-checkmark-outline', label: 'Privacy & Security', color: '#3B6BFF' },
    { icon: 'cloud-download-outline', label: 'AI Model Management', color: '#F59E0B' },
  ];

  const dataItems = [
    { icon: 'download-outline', label: 'Export My Data', color: '#3B6BFF' },
    { icon: 'people-outline', label: 'Workspace Transfer', color: '#3B6BFF' },
  ];

  const generalItems = [
    { icon: 'language-outline', label: 'Language', color: c.textMuted, sub: 'English (US) / Arabic' },
    { icon: 'chatbubble-outline', label: 'Help & Support', color: c.textMuted },
  ];

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Profile Section ───────────────────────────────── */}
      <View style={[styles.profileSection, { paddingTop: insets.top + 20 }]}>

        {/* Avatar with ZoomIn + spring */}
        <Animated.View
          entering={ZoomIn.delay(100).duration(500).springify()}
          style={styles.avatarContainer}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: 'rgba(59,107,255,0.12)',
                borderColor: 'rgba(59,107,255,0.3)',
                borderWidth: 2,
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: '#3B6BFF' }]}>
              {profile?.name?.[0] || 'U'}
            </Text>
          </View>

          {/* Camera badge with press animation */}
          <AnimatedTouchable
            style={[styles.cameraBtn, cameraBadgeStyle]}
            onPressIn={() => { cameraBadgeScale.value = withSpring(0.85, SPRING_CONFIG); }}
            onPressOut={() => { cameraBadgeScale.value = withSpring(1, SPRING_CONFIG); }}
            accessibilityLabel="Change profile photo"
            accessibilityRole="button"
            activeOpacity={0.9}
          >
            <Ionicons name="camera" size={14} color="#003516" />
          </AnimatedTouchable>
        </Animated.View>

        {/* Profile info / edit */}
        {editing ? (
          /* ── Edit Mode ────────────────── */
          <Animated.View
            entering={FadeInDown.duration(350).springify()}
            style={{ width: '100%', gap: Spacing.md, paddingHorizontal: Spacing.xxl }}
          >
            {[
              { label: 'FULL NAME', value: editName, setter: setEditName, type: 'default' },
              { label: 'EMAIL', value: editEmail, setter: setEditEmail, type: 'email-address' },
              { label: 'COMPANY', value: editCompany, setter: setEditCompany, type: 'default' },
            ].map((field, idx) => (
              <Animated.View
                key={field.label}
                entering={FadeInDown.delay(idx * 80).duration(350).springify()}
              >
                <Text style={[styles.fieldLabel, { color: c.textMuted }]}>{field.label}</Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType={field.type}
                  autoCapitalize={field.type === 'email-address' ? 'none' : 'words'}
                  style={[
                    styles.editInput,
                    {
                      backgroundColor: c.surfaceLow,
                      color: c.text,
                      borderColor: c.border,
                    },
                  ]}
                  placeholderTextColor={c.textMuted}
                  accessibilityLabel={`Edit ${field.label.toLowerCase()}`}
                />
              </Animated.View>
            ))}

            <Animated.View
              entering={FadeInDown.delay(260).duration(350).springify()}
              style={styles.editActions}
            >
              <SpringPressable
                onPress={saveProfile}
                style={styles.saveBtn}
                accessibilityRole="button"
                accessibilityLabel="Save profile"
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </SpringPressable>
              <SpringPressable
                onPress={() => setEditing(false)}
                style={[styles.cancelBtn, { borderColor: c.border }]}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing"
              >
                <Text style={{ color: c.text, ...Typography.bodyBold }}>Cancel</Text>
              </SpringPressable>
            </Animated.View>
          </Animated.View>
        ) : (
          /* ── Display Mode ─────────────── */
          <Animated.View
            entering={FadeInDown.delay(200).duration(400).springify()}
            style={{ width: '100%', paddingHorizontal: Spacing.xxl }}
          >
            <Text style={[styles.profileName, { color: c.text }]}>
              {profile?.name || 'Set your name'}
            </Text>

            <View
              style={[
                styles.profileCard,
                {
                  backgroundColor: darkMode ? c.card : c.bgSecondary,
                  borderColor: c.border,
                  ...(darkMode ? Shadow.softSm : Shadow.darkSm),
                },
              ]}
            >
              {[
                { label: 'EMAIL', value: profile?.email || 'Set email', icon: 'mail-outline' },
                { label: 'COMPANY', value: profile?.company || 'Set company', icon: 'business-outline' },
                ...(trn ? [{ label: 'TRN', value: trn, icon: 'receipt-outline' }] : []),
              ].map((row, idx, arr) => (
                <React.Fragment key={row.label}>
                  <View style={styles.profileInfoRow}>
                    <View style={styles.profileInfoLeft}>
                      <View style={[styles.profileInfoIcon, { backgroundColor: c.accentLight }]}>
                        <Ionicons name={row.icon} size={16} color={c.accent} />
                      </View>
                      <View>
                        <Text style={[styles.profileInfoLabel, { color: c.textMuted }]}>{row.label}</Text>
                        <Text style={[styles.profileInfoValue, { color: c.text }]}>{row.value}</Text>
                      </View>
                    </View>
                  </View>
                  {idx < arr.length - 1 && (
                    <View style={[styles.rowSeparator, { backgroundColor: c.border, marginLeft: 52 }]} />
                  )}
                </React.Fragment>
              ))}
            </View>

            <SpringPressable
              onPress={() => setEditing(true)}
              style={styles.editProfileLink}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <Text style={[styles.editProfileText, { color: '#3B6BFF' }]}>Edit Profile</Text>
              <Ionicons name="arrow-forward" size={14} color="#3B6BFF" />
            </SpringPressable>
          </Animated.View>
        )}
      </View>

      {/* ── Organization Card ──────────────────────────────── */}
      <View style={{ paddingHorizontal: Spacing.xxl, marginTop: Spacing.xxxl }}>
        <Animated.View
          entering={FadeInDown.delay(300).duration(450).springify()}
          style={[
            styles.orgCard,
            {
              backgroundColor: darkMode ? c.card : c.bgSecondary,
              borderColor: c.border,
              ...(darkMode ? Shadow.softSm : Shadow.darkSm),
            },
          ]}
        >
          <View style={styles.orgCardHeader}>
            <View>
              <View style={styles.orgBadge}>
                <Ionicons name="business" size={12} color="#3B6BFF" />
                <Text style={[styles.orgLabel, { color: '#3B6BFF' }]}>ORGANIZATION</Text>
              </View>
              <Text style={[styles.orgTitle, { color: c.text }]}>Company Details</Text>
            </View>
            <SpringPressable
              onPress={() => setEditing(true)}
              style={styles.orgEditBtn}
              accessibilityRole="button"
              accessibilityLabel="Edit organization"
            >
              <Ionicons name="create-outline" size={16} color="#003516" />
            </SpringPressable>
          </View>

          <View style={{ gap: Spacing.lg }}>
            <View>
              <Text style={[styles.orgFieldLabel, { color: c.textMuted }]}>Company</Text>
              <Text style={[styles.orgFieldValue, { color: c.text }]}>{profile?.company || '\u2013'}</Text>
            </View>
            <View style={[styles.rowSeparator, { backgroundColor: c.border }]} />
            <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.orgFieldLabel, { color: c.textMuted }]}>TRN</Text>
                <Text style={[styles.orgFieldValue, { color: c.text }]}>{trn || '\u2013'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.orgFieldLabel, { color: c.textMuted }]}>VAT Quarters</Text>
                <Text style={[styles.orgFieldValue, { color: c.text }]}>Jan, Apr, Jul, Oct</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* ── Certificates ──────────────────────────────────── */}
      <View style={{ marginTop: Spacing.xxxl }}>
        <View style={{ paddingHorizontal: Spacing.xxl }}>
          <SectionHeader label="CERTIFICATES" delay={350} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.xxl,
            gap: Spacing.md,
            paddingVertical: 4,
          }}
        >
          {certificates.map((cert, idx) => (
            <Animated.View
              key={cert.id}
              entering={FadeIn.delay(400 + idx * 80).duration(400)}
            >
              <View
                style={[
                  styles.certCard,
                  {
                    backgroundColor: darkMode ? c.card : c.bgSecondary,
                    borderColor: c.border,
                    ...(darkMode ? Shadow.softSm : Shadow.darkSm),
                  },
                ]}
              >
                <View style={styles.certCardHeader}>
                  <View style={[styles.certFileIconWrap, { backgroundColor: c.accentLight }]}>
                    <Ionicons name={getFileIcon(cert.mimeType, cert.name)} size={18} color={c.accent} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <SpringPressable
                      onPress={() => openCert(cert)}
                      style={[styles.certActionBtn, { backgroundColor: 'rgba(59,107,255,0.15)' }]}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${cert.name}`}
                    >
                      <Ionicons name="eye-outline" size={14} color="#3B6BFF" />
                    </SpringPressable>
                    <SpringPressable
                      onPress={() => deleteCertificate(cert.id)}
                      style={[styles.certActionBtn, { backgroundColor: 'rgba(255,75,110,0.12)' }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${cert.name}`}
                    >
                      <Ionicons name="close" size={14} color="#FF4B6E" />
                    </SpringPressable>
                  </View>
                </View>
                <Text style={[styles.certName, { color: c.text }]} numberOfLines={2}>
                  {cert.name}
                </Text>
              </View>
            </Animated.View>
          ))}

          {/* Add certificate card */}
          {showAddCert ? (
            <Animated.View entering={FadeIn.duration(300)}>
              <View
                style={[
                  styles.certAddCardExpanded,
                  {
                    backgroundColor: darkMode ? c.card : c.bgSecondary,
                    borderColor: c.border,
                    ...(darkMode ? Shadow.softSm : Shadow.darkSm),
                  },
                ]}
              >
                <TextInput
                  value={certName}
                  onChangeText={setCertName}
                  placeholder="Certificate name..."
                  placeholderTextColor={c.textMuted}
                  style={[
                    styles.certNameInput,
                    { color: c.text, borderBottomColor: c.border },
                  ]}
                  autoFocus
                  accessibilityLabel="Certificate name"
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <SpringPressable
                    onPress={pickAndUpload}
                    disabled={uploading}
                    style={styles.certUploadBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Upload certificate"
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#003516" />
                    ) : (
                      <Text style={styles.certUploadBtnText}>UPLOAD</Text>
                    )}
                  </SpringPressable>
                  <SpringPressable
                    onPress={() => { setShowAddCert(false); setCertName(''); }}
                    style={[styles.certCancelBtn, { borderColor: c.border }]}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Ionicons name="close" size={14} color={c.text} />
                  </SpringPressable>
                </View>
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.delay(500).duration(300)}>
              <SpringPressable
                onPress={() => setShowAddCert(true)}
                style={[styles.certAddCard, { borderColor: c.border }]}
                accessibilityRole="button"
                accessibilityLabel="Add new certificate"
              >
                <View style={[styles.certAddIcon, { backgroundColor: '#3B6BFF' }]}>
                  <Ionicons name="add" size={18} color="#003516" />
                </View>
                <Text style={[styles.certAddText, { color: c.text }]}>ADD NEW</Text>
              </SpringPressable>
            </Animated.View>
          )}
        </ScrollView>
      </View>

      {/* ── Notifications Group ────────────────────────────── */}
      <View style={{ paddingHorizontal: Spacing.xxl, marginTop: Spacing.xxxl }}>
        <SectionHeader label="PREFERENCES" delay={400} />
        <GroupedSection c={c} darkMode={darkMode} delay={450}>
          <ToggleRow
            icon="notifications"
            label="Daily Reminders"
            color="#3B6BFF"
            c={c}
            value={notifications}
            onValueChange={setNotifications}
            isLast
          />
        </GroupedSection>
      </View>

      {/* ── Security & AI Group ────────────────────────────── */}
      <View style={{ paddingHorizontal: Spacing.xxl, marginTop: Spacing.xxxl }}>
        <SectionHeader label="SECURITY & AI" delay={500} />
        <GroupedSection c={c} darkMode={darkMode} delay={550}>
          {securityItems.map((item, i) => (
            <MenuRow
              key={item.label}
              icon={item.icon}
              label={item.label}
              color={item.color}
              c={c}
              isLast={i === securityItems.length - 1}
            />
          ))}
        </GroupedSection>
      </View>

      {/* ── Data & Workspace Group ─────────────────────────── */}
      <View style={{ paddingHorizontal: Spacing.xxl, marginTop: Spacing.xxl }}>
        <SectionHeader label="DATA & WORKSPACE" delay={600} />
        <GroupedSection c={c} darkMode={darkMode} delay={650}>
          {dataItems.map((item, i) => (
            <MenuRow
              key={item.label}
              icon={item.icon}
              label={item.label}
              color={item.color}
              c={c}
              isLast={i === dataItems.length - 1}
            />
          ))}
        </GroupedSection>
      </View>

      {/* ── General Group ──────────────────────────────────── */}
      <View style={{ paddingHorizontal: Spacing.xxl, marginTop: Spacing.xxl }}>
        <SectionHeader label="GENERAL" delay={700} />
        <GroupedSection c={c} darkMode={darkMode} delay={750}>
          {generalItems.map((item, i) => (
            <MenuRow
              key={item.label}
              icon={item.icon}
              label={item.label}
              sub={item.sub}
              color={item.color}
              c={c}
              isLast={i === generalItems.length - 1}
            />
          ))}
        </GroupedSection>
      </View>

      {/* ── Logout ────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: Spacing.xxl, marginTop: Spacing.xxxl }}>
        <Animated.View entering={FadeInDown.delay(800).duration(400).springify()}>
          <SpringPressable
            onPress={signOut}
            style={styles.logoutBtn}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={20} color="#FF4B6E" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </SpringPressable>
        </Animated.View>
      </View>

      {/* ── App version ───────────────────────────────────── */}
      <Animated.View
        entering={FadeIn.delay(900).duration(400)}
        style={styles.versionContainer}
      >
        <Text style={[styles.versionText, { color: c.textMuted }]}>Filey v1.0</Text>
      </Animated.View>

      {/* ── Certificate Image Modal ───────────────────────── */}
      <Modal
        visible={!!showCertView}
        transparent
        animationType="none"
        onRequestClose={() => setShowCertView(null)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={ZoomIn.duration(350).springify()}
            style={[styles.modalContent, { backgroundColor: c.card }]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[styles.modalTitle, { color: c.text }]}
                numberOfLines={1}
              >
                {showCertView?.name}
              </Text>
              <SpringPressable
                onPress={() => setShowCertView(null)}
                style={[styles.modalCloseBtn, { backgroundColor: c.surfaceLow }]}
                accessibilityLabel="Close preview"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={c.text} />
              </SpringPressable>
            </View>
            {showCertView && (
              <Image
                source={{ uri: showCertView.file }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </Animated.View>
        </View>
      </Modal>
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  /* ── Profile ──────────────────────────── */
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.xxl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: '#3B6BFF',
    borderWidth: 2.5,
    borderColor: '#0B0F1E',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  profileName: {
    ...Typography.valueL,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  profileCard: {
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.thin,
    overflow: 'hidden',
    padding: Spacing.xs,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 52,
  },
  profileInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  profileInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfoLabel: {
    ...Typography.label,
    marginBottom: 2,
  },
  profileInfoValue: {
    ...Typography.bodyBold,
  },
  editProfileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  editProfileText: {
    ...Typography.bodyBold,
  },

  /* ── Edit Mode ────────────────────────── */
  fieldLabel: {
    ...Typography.labelWide,
    marginBottom: Spacing.xs,
  },
  editInput: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: BorderWidth.thin,
    ...Typography.bodyBold,
    minHeight: 48,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#3B6BFF',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    ...Shadow.limeSm,
  },
  saveBtnText: {
    color: '#003516',
    ...Typography.btnPrimary,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    borderWidth: BorderWidth.thin,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },

  /* ── Organization ─────────────────────── */
  orgCard: {
    padding: Spacing.xxl,
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.thin,
  },
  orgCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xxl,
  },
  orgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  orgLabel: {
    ...Typography.label,
  },
  orgTitle: {
    ...Typography.cardTitle,
  },
  orgEditBtn: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: '#3B6BFF',
    borderWidth: 1,
    borderColor: 'rgba(59,107,255,0.35)',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgFieldLabel: {
    ...Typography.label,
    marginBottom: 4,
  },
  orgFieldValue: {
    ...Typography.bodyBold,
  },

  /* ── Section label ────────────────────── */
  sectionLabel: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: Spacing.md,
  },

  /* ── Grouped section (iOS style) ──────── */
  groupedCard: {
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.thin,
    overflow: 'hidden',
  },
  groupedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
  },
  groupedRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.lg,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    ...Typography.bodyBold,
  },
  menuSub: {
    ...Typography.micro,
    marginTop: 2,
  },

  /* ── Certificates ─────────────────────── */
  certCard: {
    width: 170,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.thin,
    height: 136,
    justifyContent: 'space-between',
  },
  certCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  certFileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certActionBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  certName: {
    ...Typography.caption,
    marginTop: Spacing.sm,
  },
  certAddCard: {
    width: 170,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.medium,
    borderStyle: 'dashed',
    height: 136,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  certAddCardExpanded: {
    width: 200,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: BorderWidth.thin,
    height: 136,
    justifyContent: 'space-between',
  },
  certAddIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certAddText: {
    ...Typography.btnLabel,
  },
  certNameInput: {
    ...Typography.caption,
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  certUploadBtn: {
    flex: 1,
    backgroundColor: '#3B6BFF',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...Shadow.limeSm,
  },
  certUploadBtnText: {
    color: '#003516',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  certCancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Logout ───────────────────────────── */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,75,110,0.3)',
    height: 56,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,75,110,0.08)',
  },
  logoutText: {
    color: '#FF4B6E',
    ...Typography.btnPrimary,
  },

  /* ── Version ──────────────────────────── */
  versionContainer: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    paddingBottom: Spacing.md,
  },
  versionText: {
    ...Typography.micro,
  },

  /* ── Modal ────────────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  modalContent: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  modalImage: {
    width: '100%',
    height: 400,
  },
});
