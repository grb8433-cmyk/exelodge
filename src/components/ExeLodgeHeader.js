import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../utils/theme';

export default function ExeLodgeHeader({ title, navigation }) {
  const canGoBack = navigation?.canGoBack();

  return (
    <View style={styles.container}>
      {canGoBack && (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}
      
      <Text style={styles.wordmark}>ExeLodge</Text>
      <View style={styles.divider} />
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    marginRight: 4,
    padding: 4,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
});
