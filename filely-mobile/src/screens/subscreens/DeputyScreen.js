import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Shell, Card, shellStyles as h } from './_Shell';
import { useAuth } from '../../context/AuthContext';
import { setDeputy, clearDeputy, getDeputy, isActive } from '../../services/delegation';

export default function DeputyScreen({ darkMode, onBack }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const { userId } = useAuth();
  const [deputy, setD] = useState(null);
  const [deputyId, setDid] = useState('');
  const [deputyName, setDname] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');

  const refresh = useCallback(async () => {
    setD(await getDeputy(userId));
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const onSet = useCallback(async () => {
    if (!deputyId.trim()) { Alert.alert('Missing', 'Deputy ID required'); return; }
    try {
      await setDeputy(userId, {
        deputyId: deputyId.trim(),
        deputyName: deputyName.trim() || deputyId.trim(),
        start: start || null,
        end: end || null,
        note: note.trim() || null,
      });
      setDid(''); setDname(''); setStart(''); setEnd(''); setNote('');
      await refresh();
      Alert.alert('Saved', 'Deputy set.');
    } catch (e) { Alert.alert('Error', e.message); }
  }, [userId, deputyId, deputyName, start, end, note, refresh]);

  const onClear = useCallback(() => {
    Alert.alert('Clear deputy?', 'You will approve directly again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await clearDeputy(userId); await refresh(); } },
    ]);
  }, [userId, refresh]);

  const active = isActive(deputy);

  return (
    <Shell darkMode={darkMode} onBack={onBack} title="Out-of-office" subtitle="Delegate approvals while away">
      {deputy && (
        <Card c={c}>
          <View style={h.row}>
            <View style={[s.badge, { backgroundColor: active ? c.positiveLight : c.bgSecondary }]}>
              <Text style={[s.badgeText, { color: active ? c.positive : c.textMuted }]}>
                {active ? 'ACTIVE' : 'SCHEDULED'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.dname, { color: c.text }]} numberOfLines={1}>{deputy.deputyName || deputy.deputyId}</Text>
              <Text style={[s.drange, { color: c.textMuted }]}>
                {deputy.start || '—'} → {deputy.end || '—'}
              </Text>
            </View>
          </View>
          {deputy.note && <Text style={[h.hint, { color: c.textMuted }]}>{deputy.note}</Text>}
          <Pressable onPress={onClear} style={[h.btn, { backgroundColor: c.negativeLight }]}>
            <Ionicons name="close-circle-outline" size={14} color={c.negative} />
            <Text style={[h.btnGhostText, { color: c.negative }]}>Clear deputy</Text>
          </Pressable>
        </Card>
      )}

      <Card c={c}>
        <Text style={[h.label, { color: c.textMuted }]}>{deputy ? 'REPLACE DEPUTY' : 'SET DEPUTY'}</Text>
        <TextInput value={deputyId} onChangeText={setDid} placeholder="Deputy user ID" placeholderTextColor={c.textMuted}
          style={[h.input, { borderColor: c.borderSubtle, color: c.text, backgroundColor: c.bgSecondary }]} />
        <TextInput value={deputyName} onChangeText={setDname} placeholder="Deputy name (optional)" placeholderTextColor={c.textMuted}
          style={[h.input, { borderColor: c.borderSubtle, color: c.text, backgroundColor: c.bgSecondary }]} />
        <View style={h.row}>
          <TextInput value={start} onChangeText={setStart} placeholder="Start YYYY-MM-DD" placeholderTextColor={c.textMuted}
            style={[h.input, { flex: 1, borderColor: c.borderSubtle, color: c.text, backgroundColor: c.bgSecondary }]} />
          <TextInput value={end} onChangeText={setEnd} placeholder="End YYYY-MM-DD" placeholderTextColor={c.textMuted}
            style={[h.input, { flex: 1, borderColor: c.borderSubtle, color: c.text, backgroundColor: c.bgSecondary }]} />
        </View>
        <TextInput value={note} onChangeText={setNote} placeholder="Note (optional)" placeholderTextColor={c.textMuted}
          style={[h.input, { borderColor: c.borderSubtle, color: c.text, backgroundColor: c.bgSecondary }]} />
        <Pressable onPress={onSet} style={[h.btn, h.btnPrimary]}>
          <Ionicons name="person-add" size={14} color="#FFF" />
          <Text style={h.btnPrimaryText}>Save deputy</Text>
        </Pressable>
      </Card>
    </Shell>
  );
}

const s = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  dname: { fontSize: 15, fontWeight: '800' },
  drange: { fontSize: 11.5, marginTop: 2 },
});
