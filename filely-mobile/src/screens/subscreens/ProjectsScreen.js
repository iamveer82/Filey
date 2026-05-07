import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Shell, Card, shellStyles as h } from './_Shell';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { listProjects, addProject, archiveProject, groupByProject } from '../../services/projects';

export default function ProjectsScreen({ darkMode, onBack }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const { orgId } = useAuth();
  const [projects, setProjects] = useState([]);
  const [txs, setTxs] = useState([]);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [list, res] = await Promise.all([
      listProjects(orgId),
      api.getTransactions().catch(() => ({ transactions: [] })),
    ]);
    setProjects(list);
    setTxs(res?.transactions || res || []);
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);

  const onAdd = useCallback(async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addProject(orgId, { name: name.trim(), client: client.trim() || null });
      setName(''); setClient('');
      await refresh();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setBusy(false); }
  }, [orgId, name, client, refresh]);

  const onArchive = useCallback((pid) => {
    Alert.alert('Archive?', 'Hide this project from lists. Tx stay tagged.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: async () => { await archiveProject(orgId, pid); await refresh(); } },
    ]);
  }, [orgId, refresh]);

  const grouped = useMemo(() => groupByProject(txs, projects), [txs, projects]);

  return (
    <Shell darkMode={darkMode} onBack={onBack} title="Projects & clients" subtitle="Tag receipts, bill-back by project">
      <Card c={c}>
        <Text style={[h.label, { color: c.textMuted }]}>NEW PROJECT</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Project name"
          placeholderTextColor={c.textMuted}
          style={[h.input, { borderColor: c.borderSubtle, color: c.text, backgroundColor: c.bgSecondary }]}
        />
        <TextInput
          value={client}
          onChangeText={setClient}
          placeholder="Client (optional)"
          placeholderTextColor={c.textMuted}
          style={[h.input, { borderColor: c.borderSubtle, color: c.text, backgroundColor: c.bgSecondary }]}
        />
        <Pressable onPress={onAdd} disabled={!name.trim() || busy} style={[h.btn, h.btnPrimary, { opacity: !name.trim() || busy ? 0.5 : 1 }]}>
          <Ionicons name="add" size={14} color="#FFF" />
          <Text style={h.btnPrimaryText}>Add project</Text>
        </Pressable>
      </Card>

      <Text style={[h.sectionTitle, { color: c.text, marginTop: 4 }]}>Bill-back totals</Text>

      {grouped.length === 0 && (
        <Text style={[h.hint, { color: c.textMuted, textAlign: 'center' }]}>No tagged transactions yet.</Text>
      )}

      {grouped.map(({ project, totalAmt, totalVat, reclaim, txs: ptx }) => (
        <Card key={project.id} c={c}>
          <View style={h.row}>
            <View style={[s.dot, { backgroundColor: project.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[s.pname, { color: c.text }]} numberOfLines={1}>{project.name}</Text>
              {project.client && <Text style={[s.pclient, { color: c.textMuted }]} numberOfLines={1}>{project.client}</Text>}
            </View>
            {project.id !== 'unassigned' && (
              <Pressable onPress={() => onArchive(project.id)} hitSlop={10}>
                <Ionicons name="archive-outline" size={18} color={c.textMuted} />
              </Pressable>
            )}
          </View>
          <View style={[h.row, { marginTop: 4 }]}>
            <Stat label="Spend" val={`${totalAmt} AED`} c={c} />
            <Stat label="VAT" val={`${totalVat}`} c={c} />
            <Stat label="Reclaim" val={`${reclaim}`} c={c} accent />
          </View>
          <Text style={[h.hint, { color: c.textMuted }]}>{ptx.length} tx</Text>
        </Card>
      ))}
    </Shell>
  );
}

function Stat({ label, val, c, accent }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[s.statLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[s.statVal, { color: accent ? c.primary : c.text }]}>{val}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  dot: { width: 12, height: 12, borderRadius: 6 },
  pname: { fontSize: 15, fontWeight: '800' },
  pclient: { fontSize: 11.5, marginTop: 1 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statVal: { fontSize: 14, fontWeight: '800', marginTop: 2 },
});
