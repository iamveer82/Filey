import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Shell, Card, shellStyles as h } from './_Shell';
import api from '../../api/client';
import { getVersions } from '../../services/txVersioning';

export default function VersionsScreen({ darkMode, onBack }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const [txs, setTxs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getTransactions();
        const list = res?.transactions || res || [];
        setTxs(list.slice(0, 50));
      } catch {}
    })();
  }, []);

  const onPick = useCallback(async (id) => {
    setSelectedId(id);
    setVersions(await getVersions(id));
  }, []);

  const selected = txs.find(t => t.id === selectedId);

  return (
    <Shell darkMode={darkMode} onBack={onBack} title="Audit trail" subtitle="Receipt version history">
      <Card c={c}>
        <Text style={[h.label, { color: c.textMuted }]}>PICK TRANSACTION</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {txs.map(t => {
            const on = t.id === selectedId;
            return (
              <Pressable
                key={t.id}
                onPress={() => onPick(t.id)}
                style={[s.pill, {
                  borderColor: on ? c.primary : c.borderSubtle,
                  backgroundColor: on ? c.primaryBg : 'transparent',
                }]}
              >
                <Text style={[s.pillText, { color: on ? c.primary : c.textSecondary }]} numberOfLines={1}>
                  {(t.merchant || t.id.slice(-6)).slice(0, 18)}
                </Text>
              </Pressable>
            );
          })}
          {txs.length === 0 && <Text style={[h.hint, { color: c.textMuted }]}>No transactions.</Text>}
        </ScrollView>
      </Card>

      {selected && (
        <Card c={c}>
          <Text style={[s.selTitle, { color: c.text }]} numberOfLines={1}>{selected.merchant || 'Transaction'}</Text>
          <Text style={[s.selMeta, { color: c.textMuted }]}>{selected.date} · {selected.amount} AED</Text>
          <Text style={[h.hint, { color: c.textMuted }]}>{versions.length} version{versions.length === 1 ? '' : 's'}</Text>
        </Card>
      )}

      {versions.map((v, i) => (
        <Card key={i} c={c}>
          <View style={h.row}>
            <View style={[s.icon, { backgroundColor: v.action === 'create' ? c.positiveLight : c.primaryBg }]}>
              <Ionicons
                name={v.action === 'create' ? 'sparkles' : 'pencil'}
                size={13}
                color={v.action === 'create' ? c.positive : c.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.vAction, { color: c.text }]}>
                {v.action === 'create' ? 'Original capture' : 'Edit'}
                {v.actorName ? ` · ${v.actorName}` : ''}
              </Text>
              <Text style={[s.vTime, { color: c.textMuted }]}>
                {new Date(v.ts).toLocaleString()}
              </Text>
            </View>
          </View>

          {v.reason && (
            <Text style={[s.reason, { color: c.textSecondary }]}>“{v.reason}”</Text>
          )}

          {v.action === 'create' && v.ocrText && (
            <View style={[s.ocrBox, { backgroundColor: c.bgSecondary, borderColor: c.borderSubtle }]}>
              <Text style={[s.ocrLabel, { color: c.textMuted }]}>ORIGINAL OCR</Text>
              <Text style={[s.ocrText, { color: c.textSecondary }]} numberOfLines={6}>{v.ocrText}</Text>
            </View>
          )}

          {v.diff && Object.keys(v.diff).length > 0 && (
            <View style={{ gap: 4 }}>
              {Object.entries(v.diff).map(([k, d]) => (
                <View key={k} style={h.row}>
                  <Text style={[s.dKey, { color: c.textMuted }]}>{k}</Text>
                  <Text style={[s.dFrom, { color: c.negative }]} numberOfLines={1}>{String(d.from ?? '∅')}</Text>
                  <Ionicons name="arrow-forward" size={12} color={c.textMuted} />
                  <Text style={[s.dTo, { color: c.positive }]} numberOfLines={1}>{String(d.to ?? '∅')}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      ))}

      {selected && versions.length === 0 && (
        <Text style={[h.hint, { color: c.textMuted, textAlign: 'center' }]}>No version history (created before v-tracking).</Text>
      )}
    </Shell>
  );
}

const s = StyleSheet.create({
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: '700' },
  selTitle: { fontSize: 15, fontWeight: '800' },
  selMeta: { fontSize: 12, marginTop: 2 },
  icon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  vAction: { fontSize: 13, fontWeight: '700' },
  vTime: { fontSize: 11, marginTop: 2 },
  reason: { fontSize: 12, fontStyle: 'italic' },
  ocrBox: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 4 },
  ocrLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  ocrText: { fontSize: 11, lineHeight: 15 },
  dKey: { fontSize: 11, fontWeight: '700', width: 70 },
  dFrom: { fontSize: 11, flex: 1 },
  dTo: { fontSize: 11, flex: 1 },
});
