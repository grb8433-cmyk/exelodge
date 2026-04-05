import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../utils/theme';

/**
 * Displays a row of stars.
 * If onRate is provided, the stars are interactive (for review forms).
 */
export default function StarRating({ rating = 0, maxStars = 5, size = 16, onRate, color }) {
  const starColor = color || colors.primary;

  return (
    <View style={styles.row}>
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = i < Math.round(rating);
        const icon = filled ? 'star' : 'star-outline';

        if (onRate) {
          return (
            <TouchableOpacity key={i} onPress={() => onRate(i + 1)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
              <Ionicons name={icon} size={size} color={filled ? starColor : colors.border} style={styles.star} />
            </TouchableOpacity>
          );
        }

        return (
          <Ionicons
            key={i}
            name={icon}
            size={size}
            color={filled ? starColor : colors.border}
            style={styles.star}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
});
