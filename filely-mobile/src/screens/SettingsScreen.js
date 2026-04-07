import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Switch, Image, Alert, Modal, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Colors } from '../theme/colors';
import api from '../api/client';

export default function SettingsScreen({ darkMode }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [notifications, setNotifications] = useState(true);

  // Certificates
  const [certificates, setCertificates] = useState([]);
  const [certName, setCertName] = useState('');
  const [showAddCert, setShowAddCert] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCertView, setShowCertView] = useState(null);

  // Reminders
  const [reminders, setReminders] = useState([]);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminderTime, setNewReminderTime] = useState('');

  useEffect(() => { fetchProfile(); fetchCertificates(); fetchReminders(); }, []);

  const fetchProfile = async () => {
    try { const d = await api.getProfile(); setProfile(d.profile); } catch(e) {}
  };

  const fetchCertificates = async () => {
    try { const d = await api.getCertificates(); setCertificates(d.certificates || []); } catch(e) {}
  };

  const fetchReminders = async () => {
    try { const d = await api.getReminders(); setReminders(d.reminders || []); } catch(e) {}
  };

  useEffect(() => {
    if (profile) { setEditName(profile.name || ''); setEditEmail(profile.email || ''); setEditCompany(profile.company || ''); }
  }, [profile]);

  const saveProfile = async () => {
    try {
      await api.updateProfile({ name: editName, email: editEmail, company: editCompany });
      setProfile({ ...profile, name: editName, email: editEmail, company: editCompany });
      setEditing(false);
    } catch(e) { Alert.alert('Error', 'Could not save profile. Please try again.'); }
  };

  // Avatar
  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photo library to update your profile picture.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true, quality: 0.6, allowsEditing: true, aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      const dataUri = `data:${mimeType};base64,${asset.base64}`;
      try {
        await api.updateAvatar({ avatar: dataUri });
        setProfile({ ...profile, avatar: dataUri });
      } catch(e) { Alert.alert('Error', 'Could not update profile picture.'); }
    }
  };

  // Certificates
  const pickAndUpload = () => {
    if (!certName.trim()) { Alert.alert('Name required', 'Please enter a certificate name first.'); return; }
    Alert.alert('Add Certificate', 'Choose file source', [
      { text: 'Photo Library', onPress: pickFromPhotos },
      { text: 'Files (PDF, Docs…)', onPress: pickFromFiles },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickFromPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      await uploadCert(`data:${mimeType};base64,${asset.base64}`, mimeType);
    }
  };

  const pickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      try {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        const mimeType = asset.mimeType || 'application/octet-stream';
        await uploadCert(`data:${mimeType};base64,${base64}`, mimeType);
      } catch(e) { Alert.alert('Error', 'Could not read the selected file.'); }
    }
  };

  const uploadCert = async (fileData, mimeType) => {
    setUploading(true);
    try {
      await api.uploadCertificate({ name: certName, file: fileData, mimeType });
      setCertName(''); setShowAddCert(false); fetchCertificates();
    } catch(e) { Alert.alert('Upload failed', 'Could not upload the certificate.'); }
    finally { setUploading(false); }
  };

  const deleteCertificate = (id) => {
    Alert.alert('Delete Certificate', 'Are you sure?', [
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.deleteCertificate(id); fetchCertificates(); } catch(e) {} } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openCert = async (cert) => {
    if (!cert.file) return;
    if (cert.mimeType?.startsWith('image/')) { setShowCertView(cert); return; }
    try {
      const ext = cert.name.includes('.') ? cert.name.split('.').pop() : 'pdf';
      const path = `${FileSystem.cacheDirectory}cert_${cert.id}.${ext}`;
      const base64 = cert.file.includes(',') ? cert.file.split(',')[1] : cert.file;
      await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Linking.openURL(path);
    } catch(e) { Alert.alert('Cannot open file', 'No app available to open this file type.'); }
  };

  const getFileIcon = (mimeType, name) => {
    if (mimeType?.startsWith('image/')) return 'image-outline';
    if (mimeType?.includes('pdf')) return 'document-text-outline';
    if (mimeType?.includes('word') || name?.endsWith('.doc') || name?.endsWith('.docx')) return 'document-outline';
    if (mimeType?.includes('sheet') || mimeType?.includes('excel') || name?.endsWith('.xlsx')) return 'grid-outline';
    return 'document-text-outline';
  };

  // Reminders
  const addReminder = async () => {
    if (!newReminderTime) { Alert.alert('Enter a time', 'Please enter a time in HH:MM format.'); return; }
    try {
      await api.addReminder({ time: newReminderTime });
      setNewReminderTime(''); setShowAddReminder(false); fetchReminders();
    } catch(e) { Alert.alert('Error', 'Could not add reminder.'); }
  };

  const deleteReminder = async (id) => {
    try { await api.deleteReminder(id); fetchReminders(); } catch(e) {}
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Log Out', style: 'destructive', onPress: () => Alert.alert('Logged Out', 'You have been logged out.') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleMenuPress = (label) => {
    Alert.alert(label, 'This feature is coming soon!');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 120 }}>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
            <View style={[styles.avatar, { borderColor: c.text }]}>
              {profile?.avatar ? (
                <Image source={{ uri: profile.avatar }} style={{ width: 80, height: 80, borderRadius: 40 }} />
              ) : (
                <Text style={[styles.avatarText, { color: c.text }]}>{profile?.name?.[0] || 'U'}</Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickAvatar} style={[styles.cameraBtn, { borderColor: c.text }]}>
            <Ionicons name="camera" size={14} color={c.text} />
          </TouchableOpacity>
        </View>

        {editing ? (
          <View style={{ width: '100%', gap: 12, paddingHorizontal: 20 }}>
            <View>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>FULL NAME</Text>
              <TextInput value={editName} onChangeText={setEditName} style={[styles.editInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]} />
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>EMAIL</Text>
              <TextInput value={editEmail} onChangeText={setEditEmail} style={[styles.editInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]} keyboardType="email-address" />
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: c.textMuted }]}>COMPANY</Text>
              <TextInput value={editCompany} onChangeText={setEditCompany} style={[styles.editInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity onPress={saveProfile} style={styles.saveBtn}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(false)} style={[styles.cancelBtn, { borderColor: c.border }]}><Text style={{ color: c.text, fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ width: '100%', paddingHorizontal: 20 }}>
            <Text style={[styles.profileName, { color: c.text }]}>{profile?.name || 'Set your name'}</Text>
            <View style={styles.infoRows}>
              <View style={[styles.infoRow, { borderColor: c.border }]}>
                <Text style={[styles.infoLabel, { color: c.textMuted }]}>EMAIL</Text>
                <Text style={[styles.infoValue, { color: c.text }]}>{profile?.email || 'Set email'}</Text>
              </View>
              <View style={[styles.infoRow, { borderColor: c.border }]}>
                <Text style={[styles.infoLabel, { color: c.textMuted }]}>COMPANY</Text>
                <Text style={[styles.infoValue, { color: c.text }]}>{profile?.company || 'Set company'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editProfileLink}>
              <Text style={styles.editProfileText}>Edit Profile</Text>
              <Ionicons name="arrow-forward" size={14} color="#006e2c" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Organization Details Card */}
      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <View style={[styles.orgCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.orgCardHeader}>
            <View>
              <Text style={[styles.orgLabel, { color: '#006e2c' }]}>MANAGEMENT</Text>
              <Text style={[styles.orgTitle, { color: c.text }]}>Organization Details</Text>
            </View>
            <TouchableOpacity onPress={() => setEditing(true)} style={[styles.orgEditBtn, { borderColor: c.text }]}>
              <Ionicons name="create-outline" size={16} color={c.text} />
            </TouchableOpacity>
          </View>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={[styles.orgFieldLabel, { color: c.textMuted }]}>Company Name</Text>
              <Text style={[styles.orgFieldValue, { color: c.text }]}>{profile?.company || 'Set company'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.orgFieldLabel, { color: c.textMuted }]}>TRN</Text>
                <Text style={[styles.orgFieldValue, { color: c.text }]}>10034455290003</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.orgFieldLabel, { color: c.textMuted }]}>VAT Quarters</Text>
                <Text style={[styles.orgFieldValue, { color: c.text }]}>Jan, Apr, Jul, Oct</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Certificates */}
      <View style={{ marginTop: 24 }}>
        <Text style={[styles.sectionLabel, { color: c.textMuted, paddingHorizontal: 24 }]}>CERTIFICATES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingVertical: 4 }}>
          {certificates.map(cert => (
            <View key={cert.id} style={[styles.certCard, { backgroundColor: c.card, borderColor: c.text }]}>
              <View style={styles.certCardHeader}>
                <Ionicons name={getFileIcon(cert.mimeType, cert.name)} size={22} color={c.textMuted} />
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity onPress={() => openCert(cert)} style={[styles.certViewBtn, { borderColor: c.text }]}>
                    <Ionicons name="eye-outline" size={14} color={c.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteCertificate(cert.id)} style={[styles.certViewBtn, { borderColor: c.text, backgroundColor: '#fee2e2' }]}>
                    <Ionicons name="close" size={14} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.certName, { color: c.text }]} numberOfLines={1}>{cert.name}</Text>
            </View>
          ))}

          {showAddCert ? (
            <View style={[styles.certAddCard, { borderStyle: 'solid', backgroundColor: c.card, borderColor: c.text, width: 200, justifyContent: 'space-between' }]}>
              <TextInput
                value={certName} onChangeText={setCertName}
                placeholder="Certificate name..." placeholderTextColor={c.textMuted}
                style={[styles.certName, { color: c.text, borderBottomWidth: 1, borderColor: c.border, paddingBottom: 4 }]}
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={pickAndUpload} disabled={uploading}
                  style={{ flex: 1, backgroundColor: '#44e571', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                  {uploading ? <ActivityIndicator size="small" color="#00531f" /> : <Text style={{ color: '#00531f', fontWeight: '800', fontSize: 11 }}>UPLOAD</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowAddCert(false); setCertName(''); }}
                  style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: c.border }}>
                  <Text style={{ color: c.text, fontWeight: '700', fontSize: 11 }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowAddCert(true)} style={[styles.certAddCard, { borderColor: c.text }]}>
              <View style={[styles.certAddIcon, { borderColor: c.text }]}>
                <Ionicons name="add" size={18} color={c.text} />
              </View>
              <Text style={[styles.certAddText, { color: c.text }]}>ADD NEW</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Notifications & Reminders */}
      <View style={{ paddingHorizontal: 20, marginTop: 28, gap: 16 }}>
        <View style={[styles.notifToggleRow, { backgroundColor: c.surfaceLow }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="notifications" size={22} color={c.text} />
            <Text style={[styles.notifToggleText, { color: c.text }]}>Daily Reminders</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ true: '#44e571', false: c.surfaceLow }}
            thumbColor="#fff"
            style={{ borderWidth: 1, borderColor: c.text, borderRadius: 16 }}
          />
        </View>

        {notifications && (
          <View style={{ paddingHorizontal: 4 }}>
            <Text style={[styles.sectionLabel, { color: c.textMuted, marginBottom: 10 }]}>REMINDER TIMES</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {reminders.map(r => (
                <TouchableOpacity key={r.id} onPress={() => deleteReminder(r.id)} style={[styles.timePillActive, { backgroundColor: c.text }]}>
                  <Text style={[styles.timePillText, { color: darkMode ? '#000' : '#fff' }]}>{r.label || r.time}</Text>
                  <Ionicons name="close" size={14} color={darkMode ? '#000' : '#fff'} />
                </TouchableOpacity>
              ))}
              {showAddReminder ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    value={newReminderTime}
                    onChangeText={setNewReminderTime}
                    placeholder="HH:MM"
                    placeholderTextColor={c.textMuted}
                    keyboardType="numbers-and-punctuation"
                    style={[styles.timePill, { borderColor: c.border, color: c.text, paddingHorizontal: 12, paddingVertical: 8, minWidth: 80 }]}
                    autoFocus
                    maxLength={5}
                  />
                  <TouchableOpacity onPress={addReminder} style={[styles.timeAddBtn, { borderColor: c.text }]}>
                    <Ionicons name="checkmark" size={18} color={c.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setShowAddReminder(false); setNewReminderTime(''); }} style={[styles.timeAddBtn, { borderColor: c.border, backgroundColor: 'transparent' }]}>
                    <Ionicons name="close" size={16} color={c.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setShowAddReminder(true)} style={[styles.timeAddBtn, { borderColor: c.text }]}>
                  <Ionicons name="add" size={18} color={c.text} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Menu Items */}
      <View style={{ paddingHorizontal: 20, marginTop: 28, gap: 6 }}>
        {[
          { icon: 'shield-checkmark-outline', label: 'Privacy & Security', sub: null },
          { icon: 'language-outline', label: 'Language', sub: 'English (US) / Arabic' },
          { icon: 'chatbubble-outline', label: 'Help & Support', sub: null },
        ].map((item, i) => (
          <TouchableOpacity key={i} onPress={() => handleMenuPress(item.label)} style={[styles.menuRow, { backgroundColor: darkMode ? 'transparent' : c.bg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={[styles.menuIcon, { backgroundColor: c.card, borderColor: c.border }]}>
                <Ionicons name={item.icon} size={20} color={c.text} />
              </View>
              <View>
                <Text style={[styles.menuLabel, { color: c.text }]}>{item.label}</Text>
                {item.sub && <Text style={[styles.menuSub, { color: '#006e2c' }]}>{item.sub}</Text>}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#000" />
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      {/* Certificate Image View Modal */}
      <Modal visible={!!showCertView} transparent animationType="fade" onRequestClose={() => setShowCertView(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: c.card, borderRadius: 16, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
              <Text style={{ color: c.text, fontWeight: '700', flex: 1, marginRight: 8 }} numberOfLines={1}>{showCertView?.name}</Text>
              <TouchableOpacity onPress={() => setShowCertView(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={c.text} />
              </TouchableOpacity>
            </View>
            {showCertView && (
              <Image source={{ uri: showCertView.file }} style={{ width: '100%', height: 400 }} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>

      {/* Add Reminder Modal */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileSection: { alignItems: 'center', paddingTop: 16 },
  avatarContainer: { position: 'relative', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(68,229,113,0.1)', overflow: 'hidden' },
  avatarText: { fontSize: 32, fontWeight: '800' },
  cameraBtn: { position: 'absolute', bottom: 0, right: -8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#44e571', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 28, fontWeight: '900', letterSpacing: -1, textAlign: 'center', marginBottom: 16 },
  infoRows: { gap: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, paddingBottom: 10 },
  infoLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  editProfileLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16 },
  editProfileText: { color: '#006e2c', fontWeight: '700', fontSize: 14 },
  fieldLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  editInput: { borderRadius: 14, padding: 14, borderWidth: 1, fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: '#44e571', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#00531f', fontWeight: '800', fontSize: 15 },
  cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, borderWidth: 1, alignItems: 'center' },
  orgCard: { padding: 20, borderRadius: 16, borderWidth: 1, shadowColor: '#0c1e26', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 30 },
  orgCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  orgLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 3, marginBottom: 4 },
  orgTitle: { fontSize: 20, fontWeight: '700' },
  orgEditBtn: { padding: 8, borderRadius: 8, backgroundColor: '#44e571', borderWidth: 1 },
  orgFieldLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
  orgFieldValue: { fontSize: 16, fontWeight: '700' },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 12 },
  certCard: { width: 160, padding: 14, borderRadius: 12, borderWidth: 1, height: 128, justifyContent: 'space-between', shadowColor: '#0c1e26', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  certCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  certViewBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#44e571', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  certName: { fontSize: 12, fontWeight: '700' },
  certAddCard: { width: 160, padding: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', height: 128, alignItems: 'center', justifyContent: 'center', gap: 8 },
  certAddIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#44e571', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  certAddText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  notifToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14 },
  notifToggleText: { fontWeight: '700', fontSize: 14, letterSpacing: -0.3 },
  timePillActive: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  timePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 24, borderWidth: 1 },
  timePillText: { fontSize: 12, fontWeight: '700' },
  timeAddBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#44e571', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  menuLabel: { fontWeight: '700', fontSize: 14 },
  menuSub: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#44e571', height: 56, borderRadius: 16, borderWidth: 1, borderColor: '#000', shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 },
  logoutText: { fontWeight: '900', fontSize: 14, letterSpacing: 1, color: '#000' },
});
