import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Share, Alert, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { Shell, Card, shellStyles as h } from './_Shell';
import { useAuth } from '../../context/AuthContext';
import { getMyCode, shareText, redeemCode, getPremiumStatus } from '../../services/referral';

export default function ReferralScreen({ darkMode, onBack }) {
  const c = darkMode ? Colors.dark : Colors.light;
  const { userId } = useAuth();
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const [status, setStatus] = useState({ active: false, until: null });

  useEffect(() => {
    (async () => {
      setCode(await getMyCode(userId));
      setStatus(await getPremiumStatus());
    })();
  }, [userId]);

  const onShare = useCallback(async () => {
    try { await Share.share({ message: shareText(code) }); } catch {}
  }, [code]);

  const onCopy = useCallback(async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied', `${code} copied to clipboard.`);
  }, [code]);

  const onRedeem = useCallback(async () => {
    const r = await redeemCode(input.trim().toUpperCase());
    if (r.ok) {
      Alert.alert('Redeemed', 'Premium granted for 1 year.');
      setInput('');
      setStatus(await getPremiumStatus());
    } else {
      Alert.alert('Cannot redeem', r.reason);
    }
  }, [input]);

  return (
    <Shell darkMode={darkMode} onBack={onBack} title="Invite & earn">
      <Card c={c}>
        <Text style={[h.label, { color: c.textMuted }]}>YOUR CODE</Text>
        <View style={[s.codeBox, { backgroundColor: c.bgSecondary, borderColor: c.borderAccent }]}>
          <Text style={[s.code, { color: c.primary }]}>{code}</Text>
        </View>
        <Text style={[h.hint, { color: c.textMuted }]}>
          Share this code. When a teammate signs up, you both get 1 year of premium.
        </Text>
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

      <Card c={c}>
        <Text style={[h.label, { color: c.textMuted }]}>REDEEM A CODE</Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          autoCapitalize="characters"
          placeholder="FX-XXXXXX"
          placeholderTextColor={c.textMuted}
          style={[h.input, { borderColor: c.borderSubtle, color: c.text, backgroundColor: c.bgSecondary, letterSpacing: 2 }]}
        />
        <Pressable onPress={onRedeem} disabled={!input} style={[h.btn, h.btnPrimary, { opacity: input ? 1 : 0.5 }]}>
          <Ionicons name="gift" size={14} color="#FFF" />
          <Text style={h.btnPrimaryText}>Redeem</Text>
        </Pressable>
      </Card>

      <Card c={c}>
        <Text style={[h.label, { color: c.textMuted }]}>PREMIUM STATUS</Text>
        <Text style={[s.statusMain, { color: status.active ? c.positive : c.textMuted }]}>
          {status.active ? 'Active' : 'Inactive'}
        </Text>
        {status.until && (
          <Text style={[h.hint, { color: c.textMuted }]}>
            Valid until {new Date(status.until).toLocaleDateString()}
          </Text>
        )}
      </Card>
    </Shell>
  );
}

const s = StyleSheet.create({
  codeBox: { borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  code: { fontSize: 26, fontWeight: '800', letterSpacing: 4 },
  statusMain: { fontSize: 20, fontWeight: '800' },
});
