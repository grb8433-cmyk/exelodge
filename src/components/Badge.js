import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../utils/theme';

/**
 * Small pill-shaped label badge.
 * variant: 'green' | 'red' | 'gray' | 'outline'
 */
export default function Badge({ label, variant = 'green', style }) {
  const bg = {
    green: colors.primaryLight,
    red: '#FEE2E2',
    gray: '#F3F4F6',
    outline: colors.white,
  }[variant];

  const textColor = {
    green: colors.primaryDark,
    red: colors.error,
    gray: colors.textSecondary,
    outline: colors.textSecondary,
  }[variant];

  const borderColor = variant === 'outline' ? colors.border : 'transparent';

  return (
    <View 
      style={[styles.badge, { backgroundColor: bg, borderColor }, style]}
      accessibilityRole="text"
      accessibilityLabel={`Badge: ${label}`}
    >
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
