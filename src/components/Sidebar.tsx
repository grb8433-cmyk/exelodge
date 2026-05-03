import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { colors, spacing, radii, typography, shadows, fontFamily, getUniversityColors } from '../utils/theme';

import UNIVERSITIES from '../../config/universities.json';

interface SidebarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
  universityId: string;
  onSwitchCity: () => void;
}

const navItems = [
  { id: 'Home',    label: 'Overview',     icon: 'grid'    },
  { id: 'Houses',  label: 'Find a House', icon: 'home'    },
  { id: 'Reviews', label: 'Reviews',      icon: 'star'    },
  { id: 'Rights',  label: 'Your Rights',  icon: 'shield'  },
];

export default function Sidebar({ activeTab, onTabPress, universityId, onSwitchCity }: SidebarProps) {
  const currentUni = UNIVERSITIES.find(u => u.id === universityId) || UNIVERSITIES[0];
  const theme = getUniversityColors(universityId);

  return (
    <View style={[styles.sidebar, { backgroundColor: theme.primary }]}>
      <View style={styles.brand}>
        <View style={styles.logoRow}>
          <View style={[styles.logoMark, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Icon name="home" size={14} color={colors.white} />
          </View>
          <Text style={styles.logoText}>ExeLodge</Text>
        </View>
        <Text style={styles.logoSub}>{currentUni.city} Student Housing</Text>
      </View>

      <TouchableOpacity onPress={onSwitchCity} style={styles.switchCityBtn}>
        <View style={styles.switchIconBox}>
          <Icon name="refresh-cw" size={10} color={colors.white} />
        </View>
        <Text style={styles.switchCityText}>Switch City</Text>
      </TouchableOpacity>

      {/* Nav */}
      <View style={styles.nav}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navItem, 
                isActive && { backgroundColor: 'rgba(255,255,255,0.18)' }
              ]}
              onPress={() => onTabPress(item.id)}
              activeOpacity={0.8}
            >
              <Icon
                name={item.icon}
                size={18}
                color={colors.white}
                style={{ opacity: isActive ? 1 : 0.7 }}
              />
              <Text style={[styles.navLabel, { opacity: isActive ? 1 : 0.7, fontWeight: isActive ? '700' : '500' as any }]}>
                {item.label}
              </Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.footerText}>Live Market Data</Text>
        </View>
        <Text style={styles.footerCopy}>© 2026 ExeLodge Platform</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    height: '100%',
    paddingHorizontal: 12,
    paddingTop: 28,
    paddingBottom: 24,
    ...shadows.medium,
  },
  brand: {
    paddingHorizontal: 12,
    marginBottom: 20,
    paddingBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  logoText: {
    ...typography.wordmark,
    color: colors.white,
  },
  logoSub: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600' as any,
    marginLeft: 44, // Align with text after logoMark
  },
  switchCityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 32,
    marginHorizontal: 12,
  },
  switchIconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchCityText: {
    fontFamily,
    fontSize: 11,
    fontWeight: '700' as any,
    color: colors.white,
    textTransform: 'uppercase' as any,
    letterSpacing: 0.5,
  },
  nav: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
    minHeight: 44,
  },
  navLabel: {
    fontFamily,
    fontSize: 14,
    color: colors.white,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
    marginLeft: 'auto',
  },
  footer: {
    paddingHorizontal: 12,
    gap: 6,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0B9B6E', // scoreHigh
  },
  footerText: {
    fontFamily,
    fontSize: 11,
    fontWeight: '600' as any,
    color: 'rgba(255,255,255,0.7)',
  },
  footerCopy: {
    fontFamily,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '400' as any,
    marginLeft: 12,
  },
});
