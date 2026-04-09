import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { colors, spacing, radii, typography, shadows, fontFamily } from '../utils/theme';

interface SidebarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

const navItems = [
  { id: 'Home',    label: 'Overview',     icon: 'grid'    },
  { id: 'Houses',  label: 'Find a House', icon: 'home'    },
  { id: 'Reviews', label: 'Reviews',      icon: 'star'    },
  { id: 'Rights',  label: 'Your Rights',  icon: 'shield'  },
];

export default function Sidebar({ activeTab, onTabPress }: SidebarProps) {
  return (
    <View style={styles.sidebar}>
      {/* Brand */}
      <View style={styles.brand}>
        <View style={styles.logoMark}>
          <Icon name="home" size={14} color={colors.white} />
        </View>
        <View>
          <Text style={styles.logoText}>ExeLodge</Text>
          <Text style={styles.logoSub}>Exeter Student Housing</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Nav */}
      <View style={styles.nav}>
        <Text style={styles.navSection}>NAVIGATION</Text>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onTabPress(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.accentBar, isActive && styles.accentBarActive]} />
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Icon
                  name={item.icon}
                  size={16}
                  color={isActive ? colors.primary : colors.textMuted}
                />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.footerText}>Live Data</Text>
        </View>
        <Text style={styles.footerCopy}>© 2026 ExeLodge</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 256,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: '100%',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily,
    fontSize: 17,
    fontWeight: '800' as any,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  logoSub: {
    fontFamily,
    fontSize: 10,
    fontWeight: '500' as any,
    color: colors.textMuted,
    letterSpacing: 0.3,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.sm,
  },
  nav: {
    flex: 1,
    gap: 2,
  },
  navSection: {
    fontFamily,
    fontSize: 10,
    fontWeight: '700' as any,
    color: colors.textMuted,
    letterSpacing: 1,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingRight: spacing.md,
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: colors.primaryLight,
  },
  accentBar: {
    width: 3,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  accentBarActive: {
    backgroundColor: colors.primary,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  iconWrapActive: {
    backgroundColor: colors.primaryMedium,
  },
  navLabel: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500' as any,
    color: colors.textSecondary,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '700' as any,
  },
  footer: {
    paddingHorizontal: spacing.sm,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  footerText: {
    fontFamily,
    fontSize: 12,
    fontWeight: '600' as any,
    color: colors.textSecondary,
  },
  footerCopy: {
    fontFamily,
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '400' as any,
  },
});
