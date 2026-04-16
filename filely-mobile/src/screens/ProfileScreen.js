import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Typography, Radius, Shadow, CardPresets, Spacing, BorderWidth } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { label: 'Account Details',       icon: 'person-outline',         section: 'User',    color: '#4F8EFF' },
  { label: 'Organization Settings', icon: 'business-outline',       section: 'Org',     color: '#44e571' },
  { label: 'Tax Certificates',      icon: 'document-text-outline',  section: 'Tax',     color: '#F59E0B' },
  { label: 'Notification Prefs',    icon: 'notifications-outline',  section: 'User',    color: '#4F8EFF' },
  { label: 'Help & Support',        icon: 'help-circle-outline',    section: 'Support', color: '#FF4B6E' },
];

export default function ProfileScreen({ darkMode, onLogout }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top + 24 }}
    >
      {/* Avatar */}
      <View style={styles.header}>
        <Animated.View entering={FadeInDown.duration(600).springify()} style={[styles.profileHeader, { backgroundColor: 'rgba(79,142,255,0.06)', borderColor: 'rgba(79,142,255,0.15)' }]}>
          <View style={[styles.avatar, { backgroundColor: 'rgba(79,142,255,0.12)', borderColor: 'rgba(79,142,255,0.3)' }]}>
            <Text style={[styles.avatarText, { color: '#4F8EFF' }]}>{profile?.name?.[0] || 'U'}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={[styles.userName, { color: c.text }]}>{profile?.name || 'User Name'}</Text>
            <Text style={[styles.userEmail, { color: c.textSecondary }]}>{profile?.email || 'email@company.ae'}</Text>
            <View style={[styles.planBadge, { backgroundColor: 'rgba(79,142,255,0.12)', borderColor: 'rgba(79,142,255,0.2)' }]}>
              <Text style={{ color: '#4F8EFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                {(profile?.plan || 'basic').toUpperCase()}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: '#44e571', borderColor: 'rgba(0,83,31,0.3)' }]}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Ionicons name="create-outline" size={16} color="#003516" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Menu */}
      <View style={styles.menuList}>
        {menuItems.map((item, i) => (
          <Animated.View
            key={item.label}
            entering={FadeInRight.delay(i * 80).duration(400).springify()}
            style={[styles.menuItem, darkMode ? CardPresets.cardDark : CardPresets.cardLight]}
          >
            <TouchableOpacity
              style={styles.menuItemInner}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <View style={[styles.menuLeft, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={[styles.menuText, { color: c.text }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Sign Out */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          onPress={onLogout}
          style={[styles.logoutBtn, { borderColor: 'rgba(255,75,110,0.3)', backgroundColor: 'rgba(255,75,110,0.08)' }]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={20} color="#FF4B6E" />
          <Text style={[styles.logoutText, { color: '#FF4B6E' }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, paddingHorizontal: Spacing.xxl },
  header:       { marginBottom: Spacing.xxl },
  profileHeader:{ flexDirection: 'row', alignItems: 'center', padding: Spacing.xxl, borderRadius: Radius.xl, borderWidth: 1 },
  avatar:       { width: 60, height: 60, borderRadius: Radius.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 24, fontWeight: '900' },
  userName:     { ...Typography.bodyBold },
  userEmail:    { ...Typography.caption, marginTop: 2 },
  planBadge:    { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, marginTop: 6 },
  editBtn:      { padding: 10, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, minWidth: 44, minHeight: 44 },
  menuList:     { gap: Spacing.sm, marginBottom: Spacing.xxl },
  menuItem:     { borderRadius: Radius.lg, overflow: 'hidden' },
  menuItemInner:{ flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  menuLeft:     { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  menuText:     { ...Typography.bodyBold, flex: 1 },
  logoutSection:{ marginTop: Spacing.md },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: Radius.xl, borderWidth: 1 },
  logoutText:   { ...Typography.btnPrimary },
});
