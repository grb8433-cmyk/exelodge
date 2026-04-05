import React, { useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import LandlordCard from '../../components/LandlordCard';
import { getLandlordsWithStats } from '../../utils/storage';
import { colors, radii, shadows, spacing, typography } from '../../utils/theme';

const RANK_OPTIONS = [
  { id: 'reviews', label: 'Most Reviewed', icon: 'chatbubbles-outline' },
  { id: 'overallRating', label: 'Top Rated', icon: 'star-outline' },
  { id: 'maintenance', label: 'Best for Repairs', icon: 'hammer-outline' },
  { id: 'deposit', label: 'Deposit Return', icon: 'cash-outline' },
  { id: 'communication', label: 'Communication', icon: 'call-outline' },
];

export default function ReviewsListScreen({ navigation }) {
  const [landlords, setLandlords] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('reviews');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('SubmitReview', { landlordId: null })}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getLandlordsWithStats();
    setLandlords(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = landlords.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || (l.type || '').toLowerCase().includes(q);
  });

  // Sort logic based on selected league table category
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'reviews') {
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    }
    // Handle ranking by specific rating keys
    const valA = sortBy === 'overallRating' ? a.avgRating : (a.ratings?.[sortBy] || 0);
    const valB = sortBy === 'overallRating' ? b.avgRating : (b.ratings?.[sortBy] || 0);
    
    if (valA !== valB) return valB - valA;
    // Tie-break with review count
    return (b.reviewCount || 0) - (a.reviewCount || 0);
  });

  const RankingHeader = () => (
    <View style={styles.rankingContainer}>
      <Text style={styles.rankingTitle}>Compare Exeter Landlords</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rankingScroll}>
        {RANK_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.rankChip, sortBy === opt.id && styles.rankChipActive]}
            onPress={() => setSortBy(opt.id)}
          >
            <Ionicons 
              name={opt.icon} 
              size={14} 
              color={sortBy === opt.id ? colors.white : colors.primary} 
            />
            <Text style={[styles.rankChipText, sortBy === opt.id && styles.rankChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search landlord or agency..."
            placeholderTextColor={colors.inactive}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <>
          <FlatList
            data={sorted}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View>
                {sortBy !== 'reviews' && item.ratings?.[sortBy] > 0 && (
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreBadgeText}>
                      {RANK_OPTIONS.find(o => o.id === sortBy)?.label}: {item.ratings[sortBy].toFixed(1)} ★
                    </Text>
                  </View>
                )}
                <LandlordCard
                  landlord={item}
                  onPress={() => navigation.navigate('LandlordProfile', { landlordId: item.id })}
                />
              </View>
            )}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View>
                <RankingHeader />
                <View style={styles.listHeader}>
                  <Text style={styles.resultCount}>{sorted.length} {sorted.length === 1 ? 'landlord' : 'landlords'}</Text>
                  <Text style={styles.sortLabel}>Ranked by {RANK_OPTIONS.find(o => o.id === sortBy)?.label}</Text>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="star-outline" size={52} color={colors.border} />
                <Text style={styles.emptyTitle}>No landlords yet</Text>
                <Text style={styles.emptySubtitle}>Reviews added by students will appear here.</Text>
              </View>
            }
          />
          
          {/* Floating Action Button */}
          <TouchableOpacity 
            style={styles.fab} 
            onPress={() => navigation.navigate('SubmitReview', { landlordId: null })}
            activeOpacity={0.9}
          >
            <Ionicons name="create" size={24} color={colors.white} />
            <Text style={styles.fabText}>Add Review</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBtn: {
    marginRight: spacing.sm,
    padding: 8,
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  rankingContainer: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  rankingTitle: {
    ...typography.label,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  rankingScroll: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  rankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  rankChipActive: {
    backgroundColor: colors.primary,
  },
  rankChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  rankChipTextActive: {
    color: colors.white,
  },
  scoreBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 10,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  scoreBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  list: {
    padding: spacing.md,
    paddingBottom: 100, // Space for FAB
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  resultCount: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  sortLabel: {
    ...typography.caption,
    fontStyle: 'italic',
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
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
    maxWidth: 240,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.full,
    gap: 8,
    ...shadows.card,
    elevation: 5,
  },
  fabText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
