import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Badge from './Badge';
import { colors, radii, shadows, spacing, typography } from '../utils/theme';

const CLEANLINESS_LABELS = { 1: 'Relaxed', 2: 'Fairly relaxed', 3: 'Moderate', 4: 'Fairly tidy', 5: 'Very tidy' };

export default function HousemateCard({ profile, isLiked, onInterest }) {
  const socialStyleVariant = { Quiet: 'gray', Occasional: 'outline', Social: 'green' }[profile.socialStyle] || 'gray';

  return (
    <View style={styles.card}>
      {/* Top: name + course + interest button */}
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          <Text style={styles.courseText}>
            {profile.course} · {profile.year}
          </Text>
        </View>
        <TouchableOpacity style={styles.heartBtn} onPress={() => onInterest && onInterest(profile.id)}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={isLiked ? colors.error : colors.inactive}
          />
        </TouchableOpacity>
      </View>

      {/* Budget */}
      <View style={styles.budgetRow}>
        <Ionicons name="cash-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.budgetText}>
          £{profile.budgetMin}–£{profile.budgetMax} pppw
        </Text>
      </View>

      {/* Chips row */}
      <View style={styles.chipsRow}>
        {profile.areaPreferences.slice(0, 2).map((area) => (
          <Badge key={area} label={area} variant="green" style={styles.chip} />
        ))}
        <Badge label={profile.socialStyle} variant={socialStyleVariant} style={styles.chip} />
        <Badge label={profile.sleepSchedule} variant="gray" style={styles.chip} />
      </View>

      {/* Looking for + cleanliness */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="search-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>{profile.lookingFor}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="sparkles-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metaText}>{CLEANLINESS_LABELS[profile.cleanliness] || 'Moderate'}</Text>
        </View>
      </View>

      {profile.notes ? (
        <Text style={styles.notes} numberOfLines={2}>{profile.notes}</Text>
      ) : null}
    </View>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  displayName: {
    ...typography.h4,
    marginBottom: 2,
  },
  courseText: {
    ...typography.bodySmall,
  },
  heartBtn: {
    padding: 4,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  budgetText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    marginRight: 0,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    ...typography.bodySmall,
    flex: 1,
  },
  notes: {
    ...typography.bodySmall,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
