import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarRating from './StarRating';
import { colors, radii, shadows, spacing, typography } from '../utils/theme';

export default function ReviewCard({ review }) {
  const formattedDate = useMemo(() => {
    return review.date
      ? new Date(review.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : '';
  }, [review.date]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <StarRating rating={review.overallRating} size={15} />
        <Text style={styles.date}>{formattedDate}</Text>
      </View>

      {review.verified && (
        <View style={styles.verifiedRow}>
          <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
          <Text style={styles.verifiedText}>Verified Exeter Student</Text>
        </View>
      )}

      {review.propertyAddress ? (
        <Text style={styles.property}>{review.propertyAddress}</Text>
      ) : null}

      <Text style={styles.body}>{review.review}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  date: {
    ...typography.caption,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  property: {
    ...typography.bodySmall,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  body: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
});
