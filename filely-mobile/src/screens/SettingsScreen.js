import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Switch, Image, Alert, Modal, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const MAX_CERT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

let ImagePicker, DocumentPicker, FileSystem;
if (Platform.OS !== 'web') {
  ImagePicker  = require('expo-image-picker');
  DocumentPicker = require('expo-document-picker');
  FileSystem   = require('expo-file-system/legacy');
}

export default function SettingsScreen({ darkMode }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, profile: authProfile, signOut, updateProfile: authUpdateProfile, orgId } = useAuth();
  const isWeb = Platform.OS === 'web';

  const [profile,       setProfile]       = useState(null);
  const [editing,       setEditing]       = useState(false);
  const [editName,      setEditName]      = useState('');
  const [editEmail,     setEditEmail]     = useState('');
  const [editCompany,   setEditCompany]   = useState('');
  const [notifications, setNotifications] = useState(true);
  const [certificates,  setCertificates]  = useState([]);
  const [certName,      setCertName]      = useState('');
  const [showAddCert,   setShowAddCert]   = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [showCertView,  setShowCertView]  = useState(null);

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

  const pickAndUpload = () => {
    if (isWeb) { Alert.alert('Not available', 'Certificate upload requires the mobile app.'); return; }
    if (!certName.trim()) { Alert.alert('Name required', 'Please enter a certificate name first.'); return; }
    Alert.alert('Add Certificate', 'Choose file source', [
      { text: 'Photo Library', onPress: pickFromPhotos },
      { text: 'Files (PDF, Docs…)', onPress: pickFromFiles },
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
      const base64 = cert.file.includes(',') ? cert.file.split(',')[1] : cert.file;
      await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 120 }}>

      {/* ── Profile Section ─────────────────────── */}
      <View style={[styles.profileSection, { paddingTop: insets.top + 16 }]}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(79,142,255,0.12)', borderColor: 'rgba(79,142,255,0.3)', borderWidth: 2 }]}>
            <Text style={[styles.avatarText, { color: '#4F8EFF' }]}>{profile?.name?.[0] || 'U'}</Text>
          </View>
          <TouchableOpacity style={styles.cameraBtn} accessibilityLabel="Change profile photo" accessibilityRole="button">
            <Ionicons name="camera" size={14} color="#003516" />
          </TouchableOpacity>
        </View>

        {editing ? (
          <View style={{ width: '100%', gap: Spacing.md, paddingHorizontal: Spacing.xxl }}>
            {[
              { label: 'FULL NAME', value: editName, setter: setEditName, type: 'default' },
              { label: 'EMAIL', value: editEmail, setter: setEditEmail, type: 'email-address' },
              { label: 'COMPANY', value: editCompany, setter: setEditCompany, type: 'default' },
            ].map(field => (
              <View key={field.label}>
                <Text style={[styles.fieldLabel, { color: c.textMuted }]}>{field.label}</Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType={field.type}
                  autoCapitalize={field.type === 'email-address' ? 'none' : 'words'}
                  style={[styles.editInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]}
                  accessibilityLabel={`Edit ${field.label.toLowerCase()}`}
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
              <TouchableOpacity onPress={saveProfile} style={styles.saveBtn} accessibilityRole="button" accessibilityLabel="Save profile">
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(false)} style={[styles.cancelBtn, { borderColor: c.border }]} accessibilityRole="button" accessibilityLabel="Cancel editing">
                <Text style={{ color: c.text, ...Typography.bodyBold }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ width: '100%', paddingHorizontal: Spacing.xxl }}>
            <Text style={[styles.profileName, { color: c.text }]}>{profile?.name || 'Set your name'}</Text>
            <View style={styles.infoRows}>
              {[
                { label: 'EMAIL',   value: profile?.email   || 'Set email' },
                { label: 'COMPANY', value: profile?.company || 'Set company' },
                ...(trn ? [{ label: 'TRN', value: trn }] : []),
              ].map(row => (
                <View key={row.label} style={[styles.infoRow, { borderColor: c.border }]}>
                  <Text style={[styles.infoLabel, { color: c.textMuted }]}>{row.label}</Text>
                  <Text style={[styles.infoValue, { color: c.text }]}>{row.value}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editProfileLink} accessibilityRole="button" accessibilityLabel="Edit profile">
              <Text style={[styles.editProfileText, { color: '#4F8EFF' }]}>Edit Profile</Text>
              <Ionicons name="arrow-forward" size={14} color="#4F8EFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Organization Card ──────────────────── */}
      <View style={{ paddingHorizontal: Spacing.xxl, marginTop: Spacing.xxl }}>
        <View style={[styles.orgCard, darkMode ? CardPresets.cardDark : CardPresets.cardLight]}>
          <View style={styles.orgCardHeader}>
            <View>
              <Text style={[styles.orgLabel, { color: '#4F8EFF' }]}>ORGANIZATION</Text>
              <Text style={[styles.orgTitle, { color: c.text }]}>Company Details</Text>
            </View>
            <TouchableOpacity onPress={() => setEditing(true)} style={[styles.orgEditBtn]} accessibilityRole="button" accessibilityLabel="Edit organization">
              <Ionicons name="create-outline" size={16} color="#003516" />
            </TouchableOpacity>
          </View>
          <View style={{ gap: Spacing.md }}>
            <View><Text style={[styles.orgFieldLabel, { color: c.textMuted }]}>Company</Text><Text style={[styles.orgFieldValue, { color: c.text }]}>{profile?.company || '–'}</Text></View>
            <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
              <View style={{ flex: 1 }}><Text style={[styles.orgFieldLabel, { color: c.textMuted }]}>TRN</Text><Text style={[styles.orgFieldValue, { color: c.text }]}>{trn || '–'}</Text></View>
              <View style={{ flex: 1 }}><Text style={[styles.orgFieldLabel, { color: c.textMuted }]}>VAT Quarters</Text><Text style={[styles.orgFieldValue, { color: c.text }]}>Jan, Apr, Jul, Oct</Text></View>
            </View>
          </View>
        </View>
      </View>

      {/* ── Certificates ──────────────────────── */}
      <View style={{ marginTop: Spacing.xxl }}>
        <Text style={[styles.sectionLabel, { color: c.textMuted, paddingHorizontal: Spacing.xxl }]}>CERTIFICATES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.xxl, gap: Spacing.md, paddingVertical: 4 }}>
          {certificates.map(cert => (
            <View key={cert.id} style={[styles.certCard, darkMode ? CardPresets.cardDark : CardPresets.cardLight]}>
              <View style={styles.certCardHeader}>
                <Ionicons name={getFileIcon(cert.mimeType, cert.name)} size={22} color={c.textMuted} />
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity onPress={() => openCert(cert)} style={[styles.certViewBtn, { backgroundColor: 'rgba(79,142,255,0.15)' }]} accessibilityRole="button" accessibilityLabel={`View ${cert.name}`}>
                    <Ionicons name="eye-outline" size={14} color="#4F8EFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteCertificate(cert.id)} style={[styles.certViewBtn, { backgroundColor: 'rgba(255,75,110,0.12)' }]} accessibilityRole="button" accessibilityLabel={`Delete ${cert.name}`}>
                    <Ionicons name="close" size={14} color="#FF4B6E" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.certName, { color: c.text }]} numberOfLines={2}>{cert.name}</Text>
            </View>
          ))}

          {showAddCert ? (
            <View style={[styles.certAddCard, { backgroundColor: c.card, borderColor: c.border, borderStyle: 'solid', width: 200, justifyContent: 'space-between' }]}>
              <TextInput value={certName} onChangeText={setCertName} placeholder="Certificate name..." placeholderTextColor={c.textMuted} style={[styles.certName, { color: c.text, borderBottomWidth: 1, borderColor: c.border, paddingBottom: 4 }]} autoFocus accessibilityLabel="Certificate name" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={pickAndUpload} disabled={uploading} style={{ flex: 1, backgroundColor: '#44e571', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel="Upload certificate">
                  {uploading ? <ActivityIndicator size="small" color="#003516" /> : <Text style={{ color: '#003516', fontWeight: '800', fontSize: 11 }}>UPLOAD</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowAddCert(false); setCertName(''); }} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: c.border }} accessibilityRole="button" accessibilityLabel="Cancel">
                  <Ionicons name="close" size={14} color={c.text} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowAddCert(true)} style={[styles.certAddCard, { borderColor: c.border }]} accessibilityRole="button" accessibilityLabel="Add new certificate">
              <View style={[styles.certAddIcon, { backgroundColor: '#44e571' }]}><Ionicons name="add" size={18} color="#003516" /></View>
              <Text style={[styles.certAddText, { color: c.text }]}>ADD NEW</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* ── Notifications ─────────────────────── */}
      <View style={{ paddingHorizontal: Spacing.xxl, marginTop: Spacing.xxl, gap: Spacing.md }}>
        <View style={[styles.notifToggleRow, darkMode ? CardPresets.cardDark : CardPresets.cardLight]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(79,142,255,0.12)' }]}>
              <Ionicons name="notifications" size={20} color="#4F8EFF" />
            </View>
            <Text style={[styles.notifToggleText, { color: c.text }]}>Daily Reminders</Text>
          </View>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: '#44e571', false: c.surfaceLow }} thumbColor="#fff" />
        </View>
      </View>

      {/* ── Menu Items ────────────────────────── */}
      <View style={{ paddingHorizontal: Spacing.xxl, marginTop: Spacing.xxl, gap: Spacing.xs }}>
        {[
          { icon: 'shield-checkmark-outline', label: 'Privacy & Security',   color: '#4F8EFF' },
          { icon: 'cloud-download-outline',   label: 'AI Model Management',  color: '#F59E0B' },
          { icon: 'download-outline',          label: 'Export My Data',       color: '#44e571' },
          { icon: 'people-outline',            label: 'Workspace Transfer',   color: '#4F8EFF' },
          { icon: 'language-outline',          label: 'Language',             color: c.textMuted, sub: 'English (US) / Arabic' },
          { icon: 'chatbubble-outline',        label: 'Help & Support',       color: c.textMuted },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={[styles.menuRow, { backgroundColor: darkMode ? c.card : c.bg, borderColor: c.border }]} accessibilityRole="button" accessibilityLabel={item.label}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View>
                <Text style={[styles.menuLabel, { color: c.text }]}>{item.label}</Text>
                {item.sub && <Text style={[styles.menuSub, { color: '#4F8EFF' }]}>{item.sub}</Text>}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Logout ────────────────────────────── */}
      <View style={{ paddingHorizontal: Spacing.xxl, marginTop: Spacing.xxl }}>
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={signOut} accessibilityRole="button" accessibilityLabel="Sign out">
          <Ionicons name="log-out-outline" size={20} color="#FF4B6E" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* ── Cert Image Modal ──────────────────── */}
      <Modal visible={!!showCertView} transparent animationType="fade" onRequestClose={() => setShowCertView(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: Spacing.xxl }}>
          <View style={{ backgroundColor: c.card, borderRadius: Radius.xl, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg }}>
              <Text style={{ color: c.text, fontWeight: '700', flex: 1, marginRight: 8 }} numberOfLines={1}>{showCertView?.name}</Text>
              <TouchableOpacity onPress={() => setShowCertView(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Close preview" accessibilityRole="button">
                <Ionicons name="close" size={22} color={c.text} />
              </TouchableOpacity>
            </View>
            {showCertView && <Image source={{ uri: showCertView.file }} style={{ width: '100%', height: 400 }} resizeMode="contain" />}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileSection:   { alignItems: 'center', paddingHorizontal: Spacing.xxl },
  avatarContainer:  { position: 'relative', marginBottom: Spacing.xxl },
  avatar:           { width: 80, height: 80, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText:       { fontSize: 28, fontWeight: '900' },
  cameraBtn:        { position: 'absolute', bottom: 0, right: -6, width: 28, height: 28, borderRadius: Radius.full, backgroundColor: '#44e571', borderWidth: 2, borderColor: '#003516', alignItems: 'center', justifyContent: 'center' },
  profileName:      { ...Typography.valueL, textAlign: 'center', marginBottom: Spacing.lg },
  infoRows:         { gap: Spacing.md },
  infoRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, paddingBottom: Spacing.sm },
  infoLabel:        { ...Typography.label },
  infoValue:        { ...Typography.body },
  editProfileLink:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.lg },
  editProfileText:  { ...Typography.bodyBold },
  fieldLabel:       { ...Typography.labelWide, marginBottom: Spacing.xs },
  editInput:        { borderRadius: Radius.md, padding: Spacing.md, borderWidth: BorderWidth.thin, ...Typography.bodyBold },
  saveBtn:          { flex: 1, backgroundColor: '#44e571', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  saveBtnText:      { color: '#003516', ...Typography.btnPrimary },
  cancelBtn:        { flex: 1, borderRadius: Radius.md, paddingVertical: Spacing.md, borderWidth: BorderWidth.thin, alignItems: 'center' },
  orgCard:          { padding: Spacing.xxl, borderRadius: Radius.xl, borderWidth: BorderWidth.thin },
  orgCardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xxl },
  orgLabel:         { ...Typography.label },
  orgTitle:         { ...Typography.cardTitle },
  orgEditBtn:       { padding: Spacing.sm, borderRadius: Radius.sm, backgroundColor: '#44e571', borderWidth: 1, borderColor: 'rgba(0,83,31,0.3)' },
  orgFieldLabel:    { ...Typography.label, marginBottom: 4 },
  orgFieldValue:    { ...Typography.bodyBold },
  sectionLabel:     { ...Typography.label, marginBottom: Spacing.md },
  certCard:         { width: 160, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: BorderWidth.thin, height: 128, justifyContent: 'space-between' },
  certCardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  certViewBtn:      { width: 28, height: 28, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  certName:         { ...Typography.caption },
  certAddCard:      { width: 160, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: BorderWidth.thin, borderStyle: 'dashed', height: 128, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  certAddIcon:      { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  certAddText:      { ...Typography.btnLabel },
  notifToggleRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: BorderWidth.thin },
  notifToggleText:  { ...Typography.bodyBold },
  menuRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: BorderWidth.thin, borderColor: 'transparent' },
  menuIcon:         { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  menuLabel:        { ...Typography.bodyBold },
  menuSub:          { ...Typography.micro, marginTop: 2 },
  logoutBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,75,110,0.3)', height: 56, borderRadius: Radius.xl, backgroundColor: 'rgba(255,75,110,0.08)' },
  logoutText:       { color: '#FF4B6E', ...Typography.btnPrimary },
});
