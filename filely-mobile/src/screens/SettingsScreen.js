import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import api from '../api/client';

export default function SettingsScreen({ darkMode }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [aiModel, setAiModel] = useState('gemini');
  const [notifications, setNotifications] = useState(true);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try { const d = await api.getProfile(); setProfile(d.profile); } catch(e) {}
  };

  useEffect(() => {
    if (profile) { setEditName(profile.name || ''); setEditEmail(profile.email || ''); setEditCompany(profile.company || ''); }
  }, [profile]);

  const saveProfile = async () => {
    try {
      await api.updateProfile({ name: editName, email: editEmail, company: editCompany });
      setProfile({ ...profile, name: editName, email: editEmail, company: editCompany });
      setEditing(false);
    } catch(e) {}
  };

  const models = [
    { id: 'gemini', label: 'Speedy (Gemini)', desc: 'Fast OCR, low-cost processing. Best for everyday receipts.' },
    { id: 'claude', label: 'Smart (Claude)', desc: 'Advanced reasoning for complex documents. Higher accuracy.' },
    { id: 'auto', label: 'Auto', desc: 'Intelligently selects the best model based on complexity.' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
      {/* Model Switcher */}
      <View style={{ marginTop: 16 }}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Model Switcher</Text>
            <Text style={[styles.sectionSub, { color: c.textSecondary }]}>Select the AI engine</Text>
          </View>
          <Ionicons name="hardware-chip-outline" size={24} color={c.lime} />
        </View>

        <View style={[styles.modelSwitcher, { backgroundColor: c.surfaceLow }]}>
          {models.map(m => (
            <TouchableOpacity key={m.id} onPress={() => setAiModel(m.id)} style={[
              styles.modelBtn,
              aiModel === m.id && styles.modelBtnActive,
            ]}>
              <Text style={[styles.modelBtnText, aiModel === m.id && styles.modelBtnTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.infoCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={c.textMuted} />
          <Text style={[styles.infoText, { color: c.textSecondary }]}>
            {models.find(m => m.id === aiModel)?.desc}
          </Text>
        </View>
      </View>

      {/* Notifications */}
      <View style={{ marginTop: 32 }}>
        <Text style={[styles.sectionTitle, { color: c.text, marginBottom: 16 }]}>Notifications</Text>
        <View style={[styles.notifCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.notifRow}>
            <View style={[styles.notifIcon, { backgroundColor: c.surfaceLow }]}>
              <Ionicons name="notifications" size={20} color={c.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, { color: c.text }]}>Remind me twice daily</Text>
              <Text style={[styles.notifSub, { color: c.textMuted }]}>Morning digest & Evening summary</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ true: '#44e571', false: c.surfaceLow }}
              thumbColor="#fff"
            />
          </View>
          {notifications && (
            <View style={[styles.notifExamples, { borderColor: c.border }]}>
              <Text style={[styles.notifExample, { color: c.textSecondary }]}>☀️ "Hey! Any new ADNOC or Etisalat bills?"</Text>
              <Text style={[styles.notifExample, { color: c.textSecondary }]}>🌙 "Evening check-in: Snap any receipts!"</Text>
            </View>
          )}
        </View>
      </View>

      {/* Profile */}
      <View style={{ marginTop: 32 }}>
        <Text style={[styles.sectionTitle, { color: c.text, marginBottom: 16 }]}>Profile</Text>
        <View style={[styles.profileCard, { backgroundColor: c.card, borderColor: c.border }]}>
          {editing ? (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={[styles.fieldLabel, { color: c.textMuted }]}>FULL NAME</Text>
                <TextInput value={editName} onChangeText={setEditName} style={[styles.fieldInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]} />
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: c.textMuted }]}>EMAIL</Text>
                <TextInput value={editEmail} onChangeText={setEditEmail} style={[styles.fieldInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]} keyboardType="email-address" />
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: c.textMuted }]}>COMPANY</Text>
                <TextInput value={editCompany} onChangeText={setEditCompany} style={[styles.fieldInput, { backgroundColor: c.surfaceLow, color: c.text, borderColor: c.border }]} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={saveProfile} style={styles.saveBtn}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setEditing(false)} style={[styles.cancelBtn, { borderColor: c.border }]}><Text style={[{ color: c.text, fontWeight: '700' }]}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={[styles.fieldLabel, { color: c.textMuted }]}>NAME</Text>
                <Text style={[styles.fieldValue, { color: c.text }]}>{profile?.name || 'Set name'}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <View>
                <Text style={[styles.fieldLabel, { color: c.textMuted }]}>EMAIL</Text>
                <Text style={[styles.fieldValue, { color: c.text }]}>{profile?.email || 'Set email'}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <View>
                <Text style={[styles.fieldLabel, { color: c.textMuted }]}>COMPANY</Text>
                <Text style={[styles.fieldValue, { color: c.text }]}>{profile?.company || 'Set company'}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditing(true)} style={styles.editLink}>
                <Text style={styles.editLinkText}>Edit profile</Text>
                <Ionicons name="arrow-forward" size={14} color="#006e2c" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Upgrade Card */}
      <View style={[styles.upgradeCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.upgradeHeader}>
          <View>
            <Text style={[styles.upgradePlan, { color: c.text }]}>Elite Plan</Text>
            <Text style={[styles.upgradePrice, { color: c.textSecondary }]}>9.99 AED/month</Text>
          </View>
          <View style={[styles.recommendBadge]}>
            <Text style={styles.recommendText}>Recommended</Text>
          </View>
        </View>
        {['150 AI Scans/month', 'Team Access + Invites', 'Audit-Ready PDF Export', 'Advanced AI (Gemini Pro + Claude)'].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color="#006e2c" />
            <Text style={[styles.featureText, { color: c.text }]}>{f}</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.upgradeBtn}>
          <Text style={styles.upgradeBtnText}>Upgrade to Elite</Text>
        </TouchableOpacity>
      </View>

      {/* Settings List */}
      {[{ icon: 'lock-closed-outline', label: 'Privacy & Security' }, { icon: 'cloud-done-outline', label: 'Storage Management' }, { icon: 'help-circle-outline', label: 'Help & Support' }].map((item, i) => (
        <TouchableOpacity key={i} style={[styles.settingsRow, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name={item.icon} size={20} color={c.textMuted} />
          <Text style={[styles.settingsLabel, { color: c.text }]}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  sectionSub: { fontSize: 13, marginTop: 2 },
  modelSwitcher: { flexDirection: 'row', borderRadius: 28, padding: 4, gap: 4 },
  modelBtn: { flex: 1, paddingVertical: 14, borderRadius: 24, alignItems: 'center' },
  modelBtnActive: { backgroundColor: '#44e571', shadowColor: '#44e571', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  modelBtnText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  modelBtnTextActive: { color: '#0c1e26' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 12 },
  infoText: { fontSize: 12, lineHeight: 18, flex: 1 },
  notifCard: { borderRadius: 16, padding: 18, borderWidth: 1 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontWeight: '700', fontSize: 15 },
  notifSub: { fontSize: 11, marginTop: 2 },
  notifExamples: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, gap: 6 },
  notifExample: { fontSize: 13 },
  profileCard: { borderRadius: 16, padding: 24, borderWidth: 1 },
  fieldLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  fieldValue: { fontSize: 18, fontWeight: '500' },
  fieldInput: { borderRadius: 14, padding: 14, borderWidth: 1, fontSize: 15 },
  divider: { height: 1 },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editLinkText: { color: '#006e2c', fontWeight: '700', fontSize: 14 },
  saveBtn: { flex: 1, backgroundColor: '#44e571', borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#00531f', fontWeight: '800', fontSize: 15 },
  cancelBtn: { flex: 1, borderRadius: 24, paddingVertical: 14, borderWidth: 1, alignItems: 'center' },
  upgradeCard: { borderRadius: 16, padding: 24, borderWidth: 1, marginTop: 32 },
  upgradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  upgradePlan: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  upgradePrice: { fontSize: 13, marginTop: 4 },
  recommendBadge: { backgroundColor: 'rgba(68,229,113,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  recommendText: { color: '#006e2c', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  featureText: { fontSize: 14, fontWeight: '500' },
  upgradeBtn: { backgroundColor: '#44e571', borderRadius: 24, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  upgradeBtnText: { color: '#00531f', fontWeight: '800', fontSize: 16 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 14, borderWidth: 1, marginTop: 12, gap: 12 },
  settingsLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
});
