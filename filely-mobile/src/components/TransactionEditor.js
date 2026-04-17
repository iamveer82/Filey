/**
 * Inline transaction editor — edit extracted fields before saving to vault.
 * Used inside AIMessagingHub chat bubbles (dark theme).
 */
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { CATEGORIES, categoryById } from '../services/categories';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function Tap({ onPress, style, children, disabled }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 420 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 320 }); }}
      style={[style, anim]}
    >
      {children}
    </AnimatedPressable>
  );
}

export default function TransactionEditor({ transaction, imageUri, submitterName, onSave, onCancel, compact = false }) {
  const [showImage, setShowImage] = useState(false);
  const [tx, setTx] = useState({
    merchant: transaction?.merchant || '',
    date: transaction?.date || new Date().toISOString().slice(0, 10),
    amount: String(transaction?.amount ?? ''),
    vat: String(transaction?.vat ?? ''),
    trn: transaction?.trn || '',
    category: transaction?.category || 'other',
    notes: transaction?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const activeCat = useMemo(() => categoryById(tx.category), [tx.category]);

  const set = (k, v) => setTx(s => ({ ...s, [k]: v }));

  // Auto-calc VAT 5% if amount changes and vat empty
  const syncVat = (amt) => {
    set('amount', amt);
    if (!tx.vat || parseFloat(tx.vat) === 0) {
      const n = parseFloat(amt);
      if (!isNaN(n)) set('vat', (n * 0.05 / 1.05).toFixed(2));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.({
        ...transaction,
        ...tx,
        amount: parseFloat(tx.amount) || 0,
        vat: parseFloat(tx.vat) || 0,
      });
    } finally { setSaving(false); }
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={s.wrap}>
      <View style={s.header}>
        <View style={[s.catDot, { backgroundColor: activeCat.color }]}>
          <Ionicons name={activeCat.icon} size={13} color="#fff" />
        </View>
        <Text style={s.title}>Edit before saving</Text>
        {submitterName ? (
          <View style={s.submitterPill}>
            <Ionicons name="person" size={10} color="#9CA3AF" />
            <Text style={s.submitterText} numberOfLines={1}>{submitterName}</Text>
          </View>
        ) : null}
        {imageUri ? (
          <Tap onPress={() => setShowImage(true)} style={s.thumbBtn}>
            <Image source={{ uri: imageUri }} style={s.thumb} />
          </Tap>
        ) : null}
      </View>

      {imageUri ? (
        <Modal visible={showImage} transparent animationType="fade" onRequestClose={() => setShowImage(false)}>
          <Pressable style={s.imageBackdrop} onPress={() => setShowImage(false)}>
            <Image source={{ uri: imageUri }} style={s.imageFull} resizeMode="contain" />
            <View style={s.imageClose}>
              <Ionicons name="close-circle" size={36} color="#FFF" />
            </View>
          </Pressable>
        </Modal>
      ) : null}

      <View style={s.field}>
        <Text style={s.label}>MERCHANT</Text>
        <TextInput
          value={tx.merchant}
          onChangeText={(t) => set('merchant', t)}
          placeholder="e.g. ADNOC"
          placeholderTextColor="#6B7280"
          style={s.input}
        />
      </View>

      <View style={s.row}>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>DATE</Text>
          <TextInput
            value={tx.date}
            onChangeText={(t) => set('date', t)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#6B7280"
            style={s.input}
          />
        </View>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>TRN</Text>
          <TextInput
            value={tx.trn}
            onChangeText={(t) => set('trn', t)}
            placeholder="100..."
            placeholderTextColor="#6B7280"
            autoCapitalize="characters"
            style={s.input}
          />
        </View>
      </View>

      <View style={s.row}>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>AMOUNT (AED)</Text>
          <TextInput
            value={tx.amount}
            onChangeText={syncVat}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#6B7280"
            style={s.input}
          />
        </View>
        <View style={[s.field, { flex: 1 }]}>
          <Text style={s.label}>VAT (AED)</Text>
          <TextInput
            value={tx.vat}
            onChangeText={(t) => set('vat', t)}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#6B7280"
            style={s.input}
          />
        </View>
      </View>

      <Text style={[s.label, { marginTop: 4 }]}>CATEGORY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
        {CATEGORIES.map(cat => {
          const active = tx.category === cat.id;
          return (
            <Tap
              key={cat.id}
              onPress={() => set('category', cat.id)}
              style={[s.catChip, {
                backgroundColor: active ? cat.color : '#1F1F1F',
                borderColor: active ? cat.color : '#2A2A2A',
              }]}
            >
              <Ionicons name={cat.icon} size={12} color={active ? '#fff' : cat.color} />
              <Text style={[s.catLabel, { color: active ? '#fff' : '#E5E7EB' }]}>{cat.label}</Text>
            </Tap>
          );
        })}
      </ScrollView>

      {!compact && (
        <View style={s.field}>
          <Text style={s.label}>NOTES</Text>
          <TextInput
            value={tx.notes}
            onChangeText={(t) => set('notes', t)}
            placeholder="Optional"
            placeholderTextColor="#6B7280"
            multiline
            style={[s.input, { minHeight: 44 }]}
          />
        </View>
      )}

      <View style={s.actionRow}>
        {onCancel && (
          <Tap onPress={onCancel} style={s.cancelBtn}>
            <Text style={s.cancelText}>Discard</Text>
          </Tap>
        )}
        <Tap onPress={handleSave} disabled={saving} style={[s.saveBtn, { opacity: saving ? 0.6 : 1 }]}>
          <Ionicons name="checkmark-circle" size={15} color="#0A0A0A" />
          <Text style={s.saveText}>{saving ? 'Saving…' : 'Save to Vault'}</Text>
        </Tap>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginTop: 10,
    backgroundColor: '#141414',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  catDot: {
    width: 22, height: 22, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#F9FAFB', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  field: { gap: 6 },
  label: { color: '#6B7280', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  input: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1, borderColor: '#262626',
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    color: '#F9FAFB', fontSize: 14,
  },
  row: { flexDirection: 'row', gap: 10 },
  catRow: { gap: 8, paddingVertical: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 12, borderWidth: 1,
  },
  catLabel: { fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1F1F1F',
  },
  cancelText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  saveBtn: {
    flex: 2, flexDirection: 'row', gap: 7,
    height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  saveText: { color: '#0A0A0A', fontSize: 13.5, fontWeight: '700' },
  submitterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, backgroundColor: '#1F1F1F',
    maxWidth: 110,
  },
  submitterText: { color: '#9CA3AF', fontSize: 10.5, fontWeight: '700' },
  thumbBtn: { marginLeft: 'auto' },
  thumb: { width: 38, height: 38, borderRadius: 8, backgroundColor: '#0A0A0A' },
  imageBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  imageFull: { width: '100%', height: '80%' },
  imageClose: { position: 'absolute', top: 60, right: 20 },
});
