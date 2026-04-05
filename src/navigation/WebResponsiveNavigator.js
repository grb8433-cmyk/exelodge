import React from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { colors, isDesktop } from '../utils/theme';

import AppNavigator from './AppNavigator';
import DesktopSidebar from '../components/DesktopSidebar';

const BREAKPOINT = 768;

export default function WebResponsiveNavigator() {
  const { width } = useWindowDimensions();
  const desktop = isDesktop(width);

  // We always render the AppNavigator (which contains the root logic).
  // On desktop, we wrap it in a shell with a sidebar.
  
  if (Platform.OS !== 'web' || !desktop) {
    return (
      <View style={styles.mobileWrapper}>
        <AppNavigator />
      </View>
    );
  }

  return (
    <View style={styles.desktopContainer}>
      <DesktopSidebar />
      <View style={styles.mainContent}>
        <AppNavigator />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
    // Use flex instead of absolute for better browser UI stability
    height: Platform.OS === 'web' ? '100%' : undefined,
    width: '100%',
  },
  mainContent: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.background,
    position: 'relative',
  },
});
