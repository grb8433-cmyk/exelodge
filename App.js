import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import WebResponsiveNavigator from './src/navigation/WebResponsiveNavigator';
import { initializeData } from './src/utils/storage';
import { colors, typography } from './src/utils/theme';

// Ignore specific logs if necessary
LogBox.ignoreLogs(['runtime not ready']);

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    console.log('[App] Mounting...');
    // Seed AsyncStorage on first launch
    initializeData()
      .then(() => {
        console.log('[App] Data initialized');
        setReady(true);
      })
      .catch(err => {
        console.error('[App] Initialization failed:', err);
        // Still set ready true so we can show an error or the app shell
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <StatusBar style="dark" />
        <Text style={styles.splashWordmark}>ExeLodge</Text>
        <Text style={styles.splashTagline}>Student Housing · Exeter</Text>
        <ActivityIndicator style={styles.splashSpinner} color={colors.primary} size="small" />
        <Text style={styles.syncText}>Syncing latest Exeter listings...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <WebResponsiveNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  splashWordmark: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -2,
  },
  splashTagline: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  splashSpinner: {
    marginTop: 24,
  },
  syncText: {
    ...typography.caption,
    marginTop: 8,
    color: colors.primary,
    fontWeight: '600',
  },
});
