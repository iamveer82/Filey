/**
 * Approvals queue — managers only. Shows pending tx with approve/reject.
 * Dark theme matching chat.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  RefreshControl, Alert, TextInput, Modal,
} from 'react-native';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { listPending, approve, reject, listAudit } from '../services/approvals';
import { categoryById } from '../services/categories';

export default function ApprovalsQueue({ navigation }) {
  const insets = useSafeAreaInsets();
  const { orgId, userId, profile, isManager } = useAuth();
  const submitterName = profile?.name || 'manager';
  const [pending, setPending] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [p, a] = await Promise.all([listPending(orgId), listAudit(orgId)]);
    setPending(p);
    setAudit(a.slice().reverse());
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const doApprove = async (tx) => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    await approve(tx, { userId, orgId, submitterName });
    setPending(prev => prev.filter(t => (t.id || t._id) !== (tx.id || tx._id)));
    load();
  };

  const openReject = (tx) => { setRejecting(tx); setReason(''); };
  const confirmReject = async () => {
    if (!rejecting) return;
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
    await reject(rejecting, { userId, orgId, submitterName }, reason);
    setPending(prev => prev.filter(t => (t.id || t._id) !== (rejecting.id || rejecting._id)));
    setRejecting(null);
    setReason('');
    load();
  };

  if (!isManager) {
    return (
      <View style={[s.empty, { paddingTop: insets.top + 40 }]}>
        <Ionicons name="lock-closed-outline" size={36} color="#6B7280" />
        <Text style={s.emptyTitle}>Manager access only</Text>
        <Text style={s.emptyText}>Ask your admin to grant approval rights.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <StatusBar style="light" />
      <View style={[s.top, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation?.goBack?.()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#F9FAFB" />
        </Pressable>
        <Text style={s.title}>Approvals</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.tabs}>
        <Pressable onPress={() => setTab('pending')} style={[s.tab, tab === 'pending' && s.tabActive]}>
          <Text style={[s.tabText, tab === 'pending' && s.tabTextActive]}>Pending ({pending.length})</Text>
        </Pressable>
        <Pressable onPress={() => setTab('audit')} style={[s.tab, tab === 'audit' && s.tabActive]}>
          <Text style={[s.tabText, tab === 'audit' && s.tabTextActive]}>Audit ({audit.length})</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#F9FAFB" />}
      >
        {tab === 'pending' && pending.length === 0 && !loading && (
          <View style={s.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={40} color="#22C55E" />
            <Text style={s.emptyTitle}>All clear</Text>
            <Text style={s.emptyText}>No pending receipts to review.</Text>
          </View>
        )}

        {tab === 'pending' && pending.map((tx, i) => {
          const cat = categoryById(tx.category);
          return (
            <Animated.View
              key={tx.id || tx._id || i}
              entering={FadeInDown.duration(260).delay(i * 40)}
              layout={Layout.springify()}
              style={s.card}
            >
              <View style={s.cardTop}>
                <View style={[s.catDot, { backgroundColor: cat.color }]}>
                  <Ionicons name={cat.icon} size={14} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.merchant}>{tx.merchant || 'Unknown'}</Text>
                  <Text style={s.sub}>
                    {tx.submittedByName || 'member'} · {tx.date} · {cat.label}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.amount}>{Number(tx.amount || 0).toFixed(2)} AED</Text>
                  <Text style={s.vat}>VAT {Number(tx.vat || 0).toFixed(2)}</Text>
                </View>
              </View>
              {tx.notes ? <Text style={s.notes}>"{tx.notes}"</Text> : null}
              <View style={s.cardActions}>
                <Pressable onPress={() => openReject(tx)} style={s.rejectBtn}>
                  <Ionicons name="close" size={14} color="#FCA5A5" />
                  <Text style={s.rejectText}>Reject</Text>
                </Pressable>
                <Pressable onPress={() => doApprove(tx)} style={s.approveBtn}>
                  <Ionicons name="checkmark" size={14} color="#0A0A0A" />
                  <Text style={s.approveText}>Approve</Text>
                </Pressable>
              </View>
            </Animated.View>
          );
        })}

        {tab === 'audit' && audit.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="document-text-outline" size={40} color="#6B7280" />
            <Text style={s.emptyTitle}>No audit entries yet</Text>
          </View>
        )}

        {tab === 'audit' && audit.map((a, i) => (
          <Animated.View key={i} entering={FadeIn.duration(200)} style={s.auditRow}>
            <Ionicons
              name={a.action === 'approve' ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={a.action === 'approve' ? '#22C55E' : '#FCA5A5'}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.auditText}>
                <Text style={{ fontWeight: '700' }}>{a.actorName}</Text> {a.action}d tx {String(a.txId).slice(0, 8)}
              </Text>
              {a.reason ? <Text style={s.auditReason}>reason: {a.reason}</Text> : null}
              <Text style={s.auditTime}>{new Date(a.ts).toLocaleString()}</Text>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <Pressable style={s.backdrop} onPress={() => setRejecting(null)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.sheetTitle}>Reject receipt</Text>
            <Text style={s.sheetSub}>{rejecting?.merchant} · {rejecting?.amount} AED</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason (required)"
              placeholderTextColor="#6B7280"
              multiline
              style={s.reasonInput}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => setRejecting(null)} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmReject} disabled={!reason.trim()} style={[s.confirmBtn, { opacity: reason.trim() ? 1 : 0.5 }]}>
                <Text style={s.confirmText}>Reject</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  top: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#262626',
  },
  title: { flex: 1, color: '#F9FAFB', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: '#1F1F1F' },
  tabActive: { backgroundColor: '#F9FAFB' },
  tabText: { color: '#9CA3AF', fontSize: 12.5, fontWeight: '700' },
  tabTextActive: { color: '#0A0A0A' },
  card: { backgroundColor: '#141414', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#262626' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  merchant: { color: '#F9FAFB', fontSize: 14.5, fontWeight: '700' },
  sub: { color: '#9CA3AF', fontSize: 11.5, marginTop: 2 },
  amount: { color: '#F9FAFB', fontSize: 15, fontWeight: '800' },
  vat: { color: '#2A63E2', fontSize: 11, fontWeight: '700', marginTop: 1 },
  notes: { color: '#D1D5DB', fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveBtn: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', height: 36, borderRadius: 12, backgroundColor: '#F9FAFB' },
  approveText: { color: '#0A0A0A', fontSize: 12.5, fontWeight: '700' },
  rejectBtn: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', height: 36, borderRadius: 12, backgroundColor: '#1F1F1F', borderWidth: 1, borderColor: '#2A2A2A' },
  rejectText: { color: '#FCA5A5', fontSize: 12.5, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { color: '#F9FAFB', fontSize: 15, fontWeight: '700' },
  emptyText: { color: '#9CA3AF', fontSize: 12.5, textAlign: 'center' },
  auditRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#141414', borderRadius: 12, marginBottom: 6 },
  auditText: { color: '#E5E7EB', fontSize: 12.5 },
  auditReason: { color: '#9CA3AF', fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  auditTime: { color: '#6B7280', fontSize: 10.5, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: '#141414', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#262626' },
  sheetTitle: { color: '#F9FAFB', fontSize: 16, fontWeight: '800' },
  sheetSub: { color: '#9CA3AF', fontSize: 12.5, marginTop: 4 },
  reasonInput: { backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#262626', borderRadius: 12, padding: 12, color: '#F9FAFB', fontSize: 14, marginTop: 12, minHeight: 72 },
  cancelBtn: { flex: 1, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F1F1F' },
  cancelText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  confirmBtn: { flex: 1, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DC2626' },
  confirmText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
