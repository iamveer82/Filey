import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { BILL_ICONS } from '../assets/billIcons';

export default function IconPicker({ value, onChange, size = 44 }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {BILL_ICONS.map(i => {
        const active = value === i.id;
        return (
          <Pressable
            key={i.id}
            onPress={() => onChange(i.id)}
            accessibilityLabel={i.label}
            style={[
              styles.tile,
              { backgroundColor: i.bg, width: size, height: size, borderColor: active ? '#2A63E2' : 'transparent' },
            ]}
          >
            <SvgXml xml={i.xml} width={size * 0.55} height={size * 0.55} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function BrandIcon({ iconId, size = 32 }) {
  const icon = BILL_ICONS.find(i => i.id === iconId) || BILL_ICONS[BILL_ICONS.length - 1];
  return (
    <View style={[styles.brand, { backgroundColor: icon.bg, width: size, height: size }]}>
      <SvgXml xml={icon.xml} width={size * 0.6} height={size * 0.6} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 6, paddingHorizontal: 2 },
  tile: {
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  brand: {
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
});
