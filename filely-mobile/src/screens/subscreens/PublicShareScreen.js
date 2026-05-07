import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Share, Alert, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Shell, Card, shellStyles as h } from './_Shell';
import { useAuth } from '../../context/AuthContext';
import { createShareLink } from '../../services/publicShare';

const TTL_OPTIONS = [7, 30, 90];

export default function PublicShareScreen({ darkMode, onBack }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const { orgId } = useAuth();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [ttl, setTtl] = useState(30);
  const [link, setLink] = useState(null);
  const [generating, setGenerating] = useState(false);

  const onGenerate = useCallback(async () => {
    if (!orgId) { Alert.alert('Error', 'No org context'); return; }
    setGenerating(true);
    try {
      const res = await createShareLink({ orgId, from: from.trim() || null, to: to.trim() || null, ttlDays: ttl });
      setLink(res);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not create link');
    } finally { setGenerating(false); }
  }, [orgId, from, to, ttl]);

  const onCopy = useCallback(async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link.url);
    Alert.alert('Copied', 'Link copied to clipboard.');
  }, [link]);

  const onShare = useCallback(async () => {
    if (!link) return;
    try { await Share.share({ message: `Read-only ledger (expires ${new Date(link.expiresAt).toLocaleDateString()}):\n${link.url}` }); } catch {}
  }, [link]);

  return (
    <Shell darkMode={darkMode} onBack={onBack} title="Share with accountant" subtitle="Signed, read-only, time-limited">
      <Card c={c}>
        <Text style={[h.label, { color: c.textMuted }]}>DATE RANGE (OPTIONAL)</Text>
        <View style={h.row}>
          <TextInput
            value={from}
            onChangeText={setFrom}
            placeholder="From YYYY-MM-DD"
            placeholderTextColor={c.textMuted}
            style={[h.input, { flex: 1, borderColor: c.borderSubtle, color: c.text, backgroundColor: c.bgSecondary }]}
          />
          <TextInput
            value={to}
            onChangeText={setTo}
            placeholder="To YYYY-MM-DD"
            placeholderTextColor={c.textMuted}
            style={[h.input, { flex: 1, borderColor: c.borderSubtle, color: c.text, backgroundColor: c.bgSecondary }]}
          />
        </View>
        <Text style={[h.label, { color: c.textMuted, marginTop: 6 }]}>EXPIRES IN</Text>
        <View style={h.row}>
          {TTL_OPTIONS.map(n => (
            <Pressable
              key={n}
              onPress={() => setTtl(n)}
              style={[h.chip, {
                borderColor: ttl === n ? c.primary : c.borderSubtle,
                backgroundColor: ttl === n ? c.primaryBg : 'transparent',
              }]}
            >
              <Text style={{ color: ttl === n ? c.primary : c.textSecondary, fontWeight: '700', fontSize: 12 }}>{n}d</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onGenerate} disabled={generating} style={[h.btn, h.btnPrimary, { opacity: generating ? 0.5 : 1 }]}>
          <Ionicons name="link" size={14} color="#FFF" />
          <Text style={h.btnPrimaryText}>{generating ? 'Generating…' : 'Generate link'}</Text>
        </Pressable>
      </Card>

      {link && (
        <Card c={c}>
          <Text style={[h.label, { color: c.textMuted }]}>SIGNED LINK</Text>
          <Text style={[s.url, { color: c.primary }]} numberOfLines={3}>{link.url}</Text>
          <Text style={[h.hint, { color: c.textMuted }]}>Expires {new Date(link.expiresAt).toLocaleString()}</Text>
          <View style={h.row}>
            <Pressable onPress={onCopy} style={[h.btn, { flex: 1, backgroundColor: c.primaryBg }]}>
              <Ionicons name="copy-outline" size={14} color={c.primary} />
              <Text style={[h.btnGhostText, { color: c.primary }]}>Copy</Text>
            </Pressable>
            <Pressable onPress={onShare} style={[h.btn, h.btnPrimary, { flex: 1 }]}>
              <Ionicons name="share-social" size={14} color="#FFF" />
              <Text style={h.btnPrimaryText}>Share</Text>
            </Pressable>
          </View>
        </Card>
      )}
    </Shell>
  );
}

const s = StyleSheet.create({
  url: { fontSize: 12, fontWeight: '700' },
});
