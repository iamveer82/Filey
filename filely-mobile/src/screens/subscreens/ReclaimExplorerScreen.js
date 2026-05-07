import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Shell, Card, shellStyles as h } from './_Shell';
import api from '../../api/client';
import { splitReclaim, RECLAIM_PERCENT, RECLAIM_REASON } from '../../services/vatRules';
import { categoryById } from '../../services/categories';

export default function ReclaimExplorerScreen({ darkMode, onBack }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getTransactions();
        setTxs(res?.transactions || res || []);
      } finally { setLoading(false); }
    })();
  }, []);

  const split = useMemo(() => splitReclaim(txs), [txs]);

  const rows = useMemo(() => {
    return Object.entries(split.byCategory)
      .map(([catId, agg]) => ({
        catId,
        cat: categoryById(catId),
        pct: RECLAIM_PERCENT[catId] ?? 0,
        reason: RECLAIM_REASON[catId] || 'No rule',
        ...agg,
      }))
      .sort((a, b) => b.reclaim - a.reclaim);
  }, [split]);

  return (
    <Shell darkMode={darkMode} onBack={onBack} title="VAT reclaim explorer" subtitle={loading ? 'Loading…' : `${txs.length} transactions analysed`}>
      <Card c={c}>
        <View style={h.row}>
          <Stat label="Total VAT" val={`${split.totalVat}`} c={c} />
          <Stat label="Eligible" val={`${split.eligibleVat}`} c={c} accent />
          <Stat label="Blocked" val={`${split.blockedVat}`} c={c} neg />
        </View>
        <Text style={[h.hint, { color: c.textMuted }]}>
          Eligible VAT is what the FTA will refund. Blocked = entertainment, personal, or exempt supplies.
        </Text>
      </Card>

      {rows.length === 0 && !loading && (
        <Text style={[h.hint, { color: c.textMuted, textAlign: 'center' }]}>No VAT data yet.</Text>
      )}

      {rows.map(({ catId, cat, pct, reason, vat, reclaim, blocked, count }) => (
        <Card key={catId} c={c}>
          <View style={h.row}>
            <View style={[s.catDot, { backgroundColor: cat.color }]}>
              <Ionicons name={cat.icon} size={13} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.catLabel, { color: c.text }]}>{cat.label}</Text>
              <Text style={[s.catMeta, { color: c.textMuted }]}>{count} tx · {pct}% reclaim</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.catVat, { color: c.primary }]}>+{reclaim.toFixed(2)}</Text>
              {blocked > 0 && <Text style={[s.catBlocked, { color: c.negative }]}>−{blocked.toFixed(2)}</Text>}
            </View>
          </View>
          <Text style={[h.hint, { color: c.textMuted }]}>{reason}</Text>
        </Card>
      ))}
    </Shell>
  );
}

function Stat({ label, val, c, accent, neg }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[s.sLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[s.sVal, { color: accent ? c.primary : neg ? c.negative : c.text }]}>{val}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  sLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  sVal: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  catDot: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 14, fontWeight: '700' },
  catMeta: { fontSize: 11, marginTop: 2 },
  catVat: { fontSize: 14, fontWeight: '800' },
  catBlocked: { fontSize: 11, fontWeight: '700', marginTop: 2 },
});
