import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Shell, Card, shellStyles as h } from './_Shell';
import api from '../../api/client';
import { searchVault } from '../../services/smartSearch';
import { categoryById } from '../../services/categories';

export default function SmartSearchScreen({ darkMode, onBack }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const [q, setQ] = useState('');
  const [all, setAll] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getTransactions();
        setAll(res?.transactions || res || []);
      } catch {}
    })();
  }, []);

  const run = useCallback(async () => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const hits = await searchVault(q, all, { limit: 20 });
      setResults(hits);
    } finally { setLoading(false); }
  }, [q, all]);

  return (
    <Shell darkMode={darkMode} onBack={onBack} title="Smart search" subtitle={`${all.length} transactions indexed`}>
      <Card c={c}>
        <Text style={[h.label, { color: c.textMuted }]}>QUERY</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={run}
          returnKeyType="search"
          placeholder="that Dubai dinner last March"
          placeholderTextColor={c.textMuted}
          style={[h.input, { borderColor: c.borderSubtle, color: c.text, backgroundColor: c.bgSecondary }]}
        />
        <Pressable onPress={run} style={[h.btn, h.btnPrimary]}>
          <Ionicons name="sparkles" size={14} color="#FFF" />
          <Text style={h.btnPrimaryText}>Search</Text>
        </Pressable>
      </Card>

      {loading && <ActivityIndicator color={c.primary} />}

      {results.map(({ tx, score, source }) => {
        const cat = categoryById(tx.category);
        return (
          <Card key={tx.id} c={c}>
            <View style={h.row}>
              <View style={[s.catDot, { backgroundColor: cat.color }]}>
                <Ionicons name={cat.icon} size={13} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.merchant, { color: c.text }]} numberOfLines={1}>{tx.merchant || '—'}</Text>
                <Text style={[s.meta, { color: c.textMuted }]}>{tx.date} · {cat.label}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.amount, { color: c.text }]}>{tx.amount} AED</Text>
                <Text style={[s.score, { color: c.primary }]}>{source} · {(score * 100).toFixed(0)}%</Text>
              </View>
            </View>
          </Card>
        );
      })}

      {!loading && q && results.length === 0 && (
        <Text style={[h.hint, { color: c.textMuted, textAlign: 'center' }]}>No matches. Try simpler keywords.</Text>
      )}
    </Shell>
  );
}

const s = StyleSheet.create({
  catDot: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  merchant: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 11, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '800' },
  score: { fontSize: 10, fontWeight: '700', marginTop: 2 },
});
