import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing } from '../utils/theme';

interface MapViewProps {
  properties: any[];
  universityId: string;
  onSelectProperty: (id: string) => void;
}

export default function MapView(_props: MapViewProps) {
  return (
    <View style={styles.fallback}>
      <Text>Map View is only available on Web.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
});
