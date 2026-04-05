import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Badge from '../../components/Badge';
import { getMyProfile } from '../../utils/storage';
import { colors, radii, shadows, spacing, typography } from '../../utils/theme';

const CLEANLINESS_LABELS = { 1: 'Relaxed', 2: 'Fairly relaxed', 3: 'Moderate', 4: 'Fairly tidy', 5: 'Very tidy' };

export default function MyProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getMyProfile().then((p) => {
        setProfile(p);
        setLoading(false);
      });
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="person-circle-outline" size={80} color={colors.border} />
        <Text style={styles.emptyTitle}>No profile yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your anonymous profile so other students can find you as a potential housemate.
        </Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateEditProfile')}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.white} />
          <Text style={styles.createBtnText}>Create My Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile header */}
      <View style={styles.heroCard}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={36} color={colors.primary} />
        </View>
        <Text style={styles.displayName}>{profile.displayName || 'My Profile'}</Text>
        <Text style={styles.courseText}>{profile.course} · {profile.year}</Text>
        <View style={styles.privacyNote}>
          <Ionicons name="eye-off-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.privacyNoteText}>Your name is never shown publicly</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.card}>
        <ProfileRow icon="cash-outline" label="Budget" value={`£${profile.budgetMin}–£${profile.budgetMax} pppw`} />
        <ProfileRow icon="location-outline" label="Preferred Areas" value={profile.areaPreferences?.join(', ')} />
        <ProfileRow icon="search-outline" label="Looking For" value={profile.lookingFor} />
        <ProfileRow icon="calendar-outline" label="Age" value={profile.age?.toString()} />
        <ProfileRow icon="person-outline" label="Gender" value={profile.gender} />
        <ProfileRow icon="moon-outline" label="Sleep Schedule" value={profile.sleepSchedule} />
        <ProfileRow icon="happy-outline" label="Social Style" value={profile.socialStyle} />
        <ProfileRow icon="sparkles-outline" label="Cleanliness" value={CLEANLINESS_LABELS[profile.cleanliness]} />
      </View>

      <View style={styles.card}>
        <ProfileRow icon="flame-outline" label="Smoking" value={profile.smoking} />
        <ProfileRow icon="wine-outline" label="Drinking" value={profile.drinking} />
        <ProfileRow icon="paw-outline" label="Pets" value={profile.pets} />
        <ProfileRow icon="language-outline" label="Languages" value={profile.languages} />
      </View>

      {profile.notes ? (
        <View style={styles.card}>
          <Text style={styles.notesLabel}>About Me</Text>
          <Text style={styles.notesText}>{profile.notes}</Text>
        </View>
      ) : null}

      {/* Edit button */}
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => navigation.navigate('CreateEditProfile', { existing: profile })}
      >
        <Ionicons name="pencil-outline" size={18} color={colors.white} />
        <Text style={styles.editBtnText}>Edit Profile</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function ProfileRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={rowStyles.row}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} style={rowStyles.icon} />
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  icon: {},
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  value: {
    flex: 2,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: 12,
    backgroundColor: colors.background,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  displayName: {
    ...typography.h3,
    marginBottom: 4,
  },
  courseText: {
    ...typography.bodySmall,
    marginBottom: 8,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  privacyNoteText: {
    ...typography.caption,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  notesLabel: {
    ...typography.h4,
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  notesText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    paddingBottom: spacing.md,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.sm,
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});
