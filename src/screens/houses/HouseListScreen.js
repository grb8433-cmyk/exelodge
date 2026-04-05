import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import PropertyCard from '../../components/PropertyCard';
import { getProperties, getLandlordById } from '../../utils/storage';
import { colors, radii, shadows, spacing, typography, isDesktop } from '../../utils/theme';

const DEFAULT_FILTERS = {
  areas: [],
  minBeds: 0,
  maxPrice: 0,
  campus: 'Streatham',
  billsIncluded: null,
};

export default function HouseListScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const desktop = isDesktop(width);
  // Grid: 3 columns on large desktop, 2 on tablet, 1 on mobile
  const numColumns = width >= 1200 ? 3 : width >= 768 ? 2 : 1;

  const [allProperties, setAllProperties] = useState([]);
  const [landlords, setLandlords] = useState({});
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (route.params?.filters) {
      setFilters(route.params.filters);
    }
  }, [route.params?.filters]);

  const load = useCallback(async () => {
    setLoading(true);
    const props = await getProperties({ ...filters, search });

    const landlordMap = {};
    for (const p of props) {
      if (!landlordMap[p.landlordId]) {
        const l = await getLandlordById(p.landlordId);
        if (l) landlordMap[p.landlordId] = l.name;
      }
    }

    setLandlords(landlordMap);
    setAllProperties(props);
    setLoading(false);
  }, [filters, search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleLandlordPress = (landlordId) => {
    navigation.navigate('ReviewsTab', {
      screen: 'LandlordProfile',
      params: { landlordId },
    });
  };

  const renderItem = ({ item }) => (
    <View style={{ flex: 1 / numColumns, padding: spacing.xs }}>
      <PropertyCard
        property={item}
        landlordName={landlords[item.landlordId]}
        onPress={() => navigation.navigate('HouseDetail', { propertyId: item.id })}
        onLandlordPress={() => handleLandlordPress(item.landlordId)}
      />
    </View>
  );

  const activeFilterCount = [
    filters.areas.length > 0,
    filters.minBeds > 0,
    filters.maxPrice > 0,
    filters.campus !== 'Streatham',
    filters.billsIncluded !== null,
  ].filter(Boolean).length;

  return (
    <View style={styles.container}>
      {/* Search + filter bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Street, postcode or area..."
            placeholderTextColor={colors.inactive}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={load}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.inactive} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => navigation.navigate('Filter', { filters, defaultFilters: DEFAULT_FILTERS })}
        >
          <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? colors.white : colors.primary} />
          <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>Filters</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active filter summary strip */}
      {activeFilterCount > 0 && (
        <View style={styles.filterStrip}>
          <Text style={styles.filterStripText}>
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
            {filters.campus !== 'Streatham' ? ` · sorted by ${filters.campus}` : ''}
          </Text>
          <TouchableOpacity onPress={() => setFilters(DEFAULT_FILTERS)}>
            <Text style={styles.clearFiltersText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          key={numColumns}
          numColumns={numColumns}
          data={allProperties}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View>
                <Text style={styles.resultCount}>
                  {allProperties.length} properties available
                </Text>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Monitoring 42 Exeter agencies & platforms</Text>
                </View>
              </View>
              {desktop && (
                <Text style={styles.sortStatus}>
                  Sorted by distance to {filters.campus}
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color={colors.border} />
              <Text style={styles.emptyTitle}>No houses found</Text>
              <Text style={styles.emptySubtitle}>Try clearing your filters or searching a different area.</Text>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flex: 1,
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
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 42,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  filterBtnTextActive: {
    color: colors.white,
  },
  filterBadge: {
    backgroundColor: colors.error,
    borderRadius: radii.full,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  filterStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  filterStripText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  clearFiltersText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  list: {
    padding: spacing.md,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  resultCount: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E', // Bright success green
  },
  statusText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sortStatus: {
    ...typography.caption,
    fontStyle: 'italic',
    marginTop: 2,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
    maxWidth: 260,
  },
});
