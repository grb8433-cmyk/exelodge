import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { colors, radii, spacing, typography } from '../utils/theme';

export default function DesktopSidebar() {
  const navigation = useNavigation();
  
  // Find the current active tab name from the root navigator
  const activeTab = useNavigationState(state => {
    return state?.routes[state.index]?.name || 'HomeTab';
  });

  const menuItems = [
    { id: 'HomeTab', label: 'Home', icon: 'grid' },
    { id: 'HousesTab', label: 'Find a House', icon: 'business' },
    { id: 'ReviewsTab', label: 'Reviews', icon: 'star' },
    { id: 'RightsTab', label: 'Your Rights', icon: 'shield-checkmark' },
  ];

  const handleNavigate = (id) => {
    if (activeTab === id) {
      // If already on this tab, reset the stack to the top (the list)
      navigation.reset({
        index: 0,
        routes: [{ name: id }],
      });
    } else {
      navigation.navigate(id);
    }
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.header}>
        <Text style={styles.logo}>ExeLodge</Text>
        <Text style={styles.tagline}>Exeter Student Housing</Text>
      </View>

      <View style={styles.menu}>
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => handleNavigate(item.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Navigate to ${item.label}`}
            >
              <Ionicons
                name={isActive ? item.icon : `${item.icon}-outline`}
                size={22}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={styles.divider} />
        <View style={styles.userStatus}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.userName}>Student Account</Text>
            <Text style={styles.userSub}>University of Exeter</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: '100%',
    padding: spacing.md,
  },
  header: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  menu: {
    flex: 1,
    gap: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: colors.primaryLight,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  menuLabelActive: {
    color: colors.primary,
  },
  footer: {
    paddingTop: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  userStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
