import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Shell, Card, shellStyles as h } from './_Shell';
import api from '../../api/client';
import { pickStatementPdf, extractRows, reconcile } from '../../services/statementImport';

export default function StatementImportScreen({ darkMode, onBack }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const [asset, setAsset] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const onPick = useCallback(async () => {
    const a = await pickStatementPdf();
    if (a) { setAsset(a); setResult(null); }
  }, []);

  const onRun = useCallback(async () => {
    if (!asset) return;
    setBusy(true);
    try {
      const [rows, txRes] = await Promise.all([
        extractRows(asset),
        api.getTransactions().catch(() => ({ transactions: [] })),
      ]);
      const txs = txRes?.transactions || txRes || [];
      if (!rows.length) { Alert.alert('No rows', 'Could not extract debits from this PDF.'); setResult(null); return; }
      setResult(reconcile(rows, txs));
    } catch (e) {
      Alert.alert('Error', e.message || 'Import failed');
    } finally { setBusy(false); }
  }, [asset]);

  return (
    <Shell darkMode={darkMode} onBack={onBack} title="Bank statement import" subtitle="Reconcile against receipts">
      <Card c={c}>
        <Text style={[h.label, { color: c.textMuted }]}>PDF STATEMENT</Text>
        <Pressable onPress={onPick} style={[h.btn, { backgroundColor: c.primaryBg }]}>
          <Ionicons name="document-attach" size={14} color={c.primary} />
          <Text style={[h.btnGhostText, { color: c.primary }]}>
            {asset ? asset.name || 'Selected' : 'Pick PDF'}
          </Text>
        </Pressable>
        {asset && (
          <Pressable onPress={onRun} disabled={busy} style={[h.btn, h.btnPrimary, { opacity: busy ? 0.5 : 1 }]}>
            <Ionicons name="sparkles" size={14} color="#FFF" />
            <Text style={h.btnPrimaryText}>{busy ? 'Reconciling…' : 'Reconcile'}</Text>
          </Pressable>
        )}
        <Text style={[h.hint, { color: c.textMuted }]}>
          Matches by amount (±0.02 AED) and date (±2 days).
        </Text>
      </Card>

      {busy && <ActivityIndicator color={c.primary} />}

      {result && (
        <>
          <View style={h.row}>
            <Stat label="Matched" val={result.matched.length} color={c.positive} c={c} />
            <Stat label="Missing" val={result.missing.length} color={c.negative} c={c} />
          </View>

          {result.missing.length > 0 && (
            <>
              <Text style={[h.sectionTitle, { color: c.text, marginTop: 6 }]}>Missing receipts</Text>
              {result.missing.map((r, i) => (
                <Card key={i} c={c}>
                  <Text style={[s.mMerch, { color: c.text }]} numberOfLines={1}>{r.merchant || '—'}</Text>
                  <Text style={[s.mMeta, { color: c.textMuted }]}>
                    {r.date} · {r.amount} AED{r.ref ? ` · ${r.ref}` : ''}
                  </Text>
                </Card>
              ))}
            </>
          )}

          {result.matched.length > 0 && (
            <>
              <Text style={[h.sectionTitle, { color: c.text, marginTop: 6 }]}>Matched</Text>
              {result.matched.slice(0, 20).map(({ row, tx }) => (
                <Card key={tx.id} c={c}>
                  <Text style={[s.mMerch, { color: c.text }]} numberOfLines={1}>{tx.merchant || row.merchant || '—'}</Text>
                  <Text style={[s.mMeta, { color: c.textMuted }]}>
                    {row.date} · {row.amount} AED → tx {tx.id.slice(-6)}
                  </Text>
                </Card>
              ))}
            </>
          )}
        </>
      )}
    </Shell>
  );
}

function Stat({ label, val, color, c }) {
  return (
    <View style={[s.stat, { backgroundColor: c.bgSecondary, borderColor: c.borderSubtle }]}>
      <Text style={[s.statVal, { color }]}>{val}</Text>
      <Text style={[s.statLabel, { color: c.textMuted }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  stat: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  mMerch: { fontSize: 14, fontWeight: '700' },
  mMeta: { fontSize: 11.5, marginTop: 2 },
});
