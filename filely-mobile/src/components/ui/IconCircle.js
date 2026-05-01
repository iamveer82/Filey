import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function IconCircle({
  name, size = 22, bgColor = '#E8EFFF', iconColor = '#2A63E2',
  containerSize = 32, radius = 8,
}) {
  return (
    <View
      style={{
        width: containerSize,
        height: containerSize,
        borderRadius: radius,
        backgroundColor: bgColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={size} color={iconColor} />
    </View>
  );
}
