import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import HousemateCard from '../../components/HousemateCard';
import { getHousemateProfiles, getInterests, toggleInterest, getMyProfile } from '../../utils/storage';
import { colors, radii, spacing, typography } from '../../utils/theme';

const SOCIAL_STYLES = ['All', 'Quiet', 'Occasional', 'Social'];
const GENDERS = ['All', 'Male', 'Female', 'Non-binary'];
const YEARS = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year'];

export default function BrowseProfilesScreen({ navigation }) {
  const [profiles, setProfiles] = useState([]);
  const [interests, setInterests] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [socialFilter, setSocialFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');

  const load = useCallback(async () => {
    setLoading(true);
    const [profs, ints, me] = await Promise.all([
      getHousemateProfiles({ socialStyle: socialFilter, gender: genderFilter, year: yearFilter }),
      getInterests(),
      getMyProfile(),
    ]);
    setProfiles(profs);
    setInterests(ints);
    setMyProfile(me);
    setLoading(false);
  }, [socialFilter, genderFilter, yearFilter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleInterest = async (profileId) => {
    const updated = await toggleInterest(profileId);
    setInterests(updated);
  };

  const filterChipRow = (label, options, value, onSelect) => (
    <View style={styles.filterSection}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.filterChip, value === opt && styles.filterChipActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.filterChipText, value === opt && styles.filterChipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('MyProfile')}>
          <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.actionBtnText}>My Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.matchesBtn]} onPress={() => navigation.navigate('Matches')}>
          <Ionicons name="heart-outline" size={18} color={colors.white} />
          <Text style={[styles.actionBtnText, styles.matchesBtnText]}>My Matches</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {filterChipRow('Lifestyle', SOCIAL_STYLES, socialFilter, setSocialFilter)}
        {filterChipRow('Gender', GENDERS, genderFilter, setGenderFilter)}
        {filterChipRow('Year', YEARS, yearFilter, setYearFilter)}
      </View>

      {/* Profile list */}
      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HousemateCard
              profile={item}
              isLiked={interests.includes(item.id)}
              onInterest={handleInterest}
            />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            !myProfile ? (
              <TouchableOpacity
                style={styles.createProfileBanner}
                onPress={() => navigation.navigate('CreateEditProfile')}
              >
                <Ionicons name="person-add-outline" size={20} color={colors.white} />
                <Text style={styles.createProfileText}>Create your profile so others can find you</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.white} />
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centre}>
              <Ionicons name="people-outline" size={52} color={colors.border} />
              <Text style={styles.emptyTitle}>No profiles match your filters</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search above</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  matchesBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  matchesBtnText: {
    color: colors.white,
  },
  filtersContainer: {
    backgroundColor: colors.white,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterSection: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  filterLabel: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  filterChips: {
    gap: 6,
    paddingRight: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  list: {
    padding: spacing.md,
  },
  createProfileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  createProfileText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.textSecondary,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
});
