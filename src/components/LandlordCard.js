import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarRating from './StarRating';
import Badge from './Badge';
import { colors, radii, shadows, spacing, typography } from '../utils/theme';

export default function LandlordCard({ landlord, onPress }) {
  const { name, type, avgRating, reviewCount, topArea, propertyCount } = landlord;

  const accessibilityLabel = `${name}, ${type}. Average rating ${avgRating ? avgRating.toFixed(1) : 'none'}. ${reviewCount} reviews.`;

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress} 
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="View full landlord profile and reviews"
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="business-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{name}</Text>
          <Badge label={type} variant="gray" />
        </View>
      </View>

      <View style={styles.divider} />

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          {avgRating != null ? (
            <>
              <StarRating rating={avgRating} size={14} />
              <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
            </>
          ) : (
            <Text style={styles.noReviews}>No reviews yet</Text>
          )}
        </View>
        <Text style={styles.reviewCount}>
          {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
        </Text>
      </View>

      <View style={styles.footer}>
        {topArea && (
          <View style={styles.areaRow}>
            <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.footerText}>{topArea}</Text>
          </View>
        )}
        {propertyCount > 0 && (
          <Text style={styles.footerText}>{propertyCount} {propertyCount === 1 ? 'property' : 'properties'}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  name: {
    ...typography.h4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...typography.label,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  noReviews: {
    ...typography.bodySmall,
    fontStyle: 'italic',
  },
  reviewCount: {
    ...typography.bodySmall,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  footerText: {
    ...typography.bodySmall,
  },
});
