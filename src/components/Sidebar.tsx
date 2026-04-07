import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, shadows } from '../utils/theme';

interface SidebarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabPress }: SidebarProps) {
  const navItems = [
    { id: 'Home', label: 'Overview', icon: 'grid-outline' },
    { id: 'Houses', label: 'Find a House', icon: 'business-outline' },
    { id: 'Reviews', label: 'Reviews', icon: 'star-outline' },
    { id: 'Rights', label: 'Your Rights', icon: 'shield-checkmark-outline' },
  ];

  return (
    <View style={styles.sidebar}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>ExeLodge</Text>
        <Text style={styles.logoSubtext}>Exeter Student Housing</Text>
      </View>

      <View style={styles.navContainer}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navItem, 
                isActive && styles.activeNavItem
              ]}
              onPress={() => onTabPress(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={(isActive ? item.icon.replace('-outline', '') : item.icon) as any} 
                size={20} 
                color={isActive ? colors.white : colors.textSecondary} 
              />
              <Text style={[
                styles.navLabel, 
                isActive && styles.activeNavLabel
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2026 ExeLodge</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderColor: colors.border,
    height: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  logoText: {
    ...typography.logo,
    color: colors.primary,
  },
  logoSubtext: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  navContainer: {
    flex: 1,
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full, // Pill shape
  },
  activeNavItem: {
    backgroundColor: colors.primary,
    ...shadows.soft,
  },
  navLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 12,
  },
  activeNavLabel: {
    color: colors.white,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing.md,
  },
  footerText: {
    ...typography.label,
    fontSize: 10,
  },
});
