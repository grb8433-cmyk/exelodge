import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  TextInput, TouchableOpacity, ScrollView, useWindowDimensions,
  Platform, Modal, Switch,
} from 'react-native';
import Icon from '../components/Icon';
import { supabase } from '../lib/supabase';
import PropertyCard from '../components/PropertyCard';
import { colors, spacing, radii, typography, shadows, fontFamily, isDesktop } from '../utils/theme';

const AREAS = ['Pennsylvania', 'St James', 'Heavitree', 'Newtown', 'Mount Pleasant', 'Haldon', 'City Centre'];
const BED_OPTIONS = [1, 2, 3, 4, 5];
const PRICE_OPTIONS = [120, 140, 160, 180, 200, 250, 300];
const SOURCES = ['UniHomes', 'StuRents', 'AccommodationForStudents', 'Rightmove', 'Cardens'];
const DISTANCE_OPTIONS = [0.5, 1, 2];

type SortOption = 'price_asc' | 'price_desc' | 'dist_streatham' | 'dist_st_lukes' | 'newest';

export default function HomeScreen({ onSelectProperty }: { onSelectProperty: (id: string) => void }) {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [displayLimit, setDisplayLimit] = useState(24);
  const { width } = useWindowDimensions();

  const [showFilters, setShowFilters] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedBeds, setSelectedBeds] = useState<number[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [billsIncluded, setBillsIncluded] = useState<boolean | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [distanceCampus, setDistanceCampus] = useState<'streatham' | 'st_lukes'>('streatham');
  const [sortOption, setSortOption] = useState<SortOption>('price_asc');

  useEffect(() => { fetchProperties(); }, []);

  async function fetchProperties() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('properties')
        .select('*')
        .eq('is_available', true);
      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  const lastUpdated = useMemo(() => {
    if (!properties.length) return null;
    const dates = properties.map(p => new Date(p.last_scraped).getTime()).filter(t => !isNaN(t));
    if (!dates.length) return null;
    return new Date(Math.max(...dates)).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }, [properties]);

  const marketAverage = useMemo(() => {
    if (!properties.length) return 150;
    const valid = properties.map(p => parseFloat(p.price_pppw)).filter(p => !isNaN(p) && p > 0);
    return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 150;
  }, [properties]);

  const filteredProperties = useMemo(() => {
    let result = properties.filter(p => {
      const matchesSearch = !search || p.address?.toLowerCase().includes(search.toLowerCase()) || p.area?.toLowerCase().includes(search.toLowerCase());
      const matchesArea   = !selectedAreas.length || selectedAreas.includes(p.area);
      const matchesBeds   = !selectedBeds.length || (
        selectedBeds.includes(p.bedrooms) || (selectedBeds.includes(5) && p.bedrooms >= 5)
      );
      const matchesPrice  = maxPrice ? parseFloat(p.price_pppw) <= maxPrice : true;
      const matchesBills  = billsIncluded === null ? true : p.bills_included === billsIncluded;
      const matchesSource = !selectedSources.length || selectedSources.includes(p.landlord_id);
      
      let matchesDist = true;
      if (maxDistance) {
        const dist = distanceCampus === 'streatham' ? p.distance_streatham : p.distance_st_lukes;
        matchesDist = dist !== null && dist <= maxDistance;
      }

      return matchesSearch && matchesArea && matchesBeds && matchesPrice && matchesBills && matchesSource && matchesDist;
    });

    // Apply sorting
    result.sort((a, b) => {
      if (sortOption === 'price_asc') return a.price_pppw - b.price_pppw;
      if (sortOption === 'price_desc') return b.price_pppw - a.price_pppw;
      if (sortOption === 'dist_streatham') return (a.distance_streatham ?? 99) - (b.distance_streatham ?? 99);
      if (sortOption === 'dist_st_lukes') return (a.distance_st_lukes ?? 99) - (b.distance_st_lukes ?? 99);
      if (sortOption === 'newest') return new Date(b.last_scraped).getTime() - new Date(a.last_scraped).getTime();
      return 0;
    });

    return result;
  }, [properties, search, selectedAreas, selectedBeds, maxPrice, billsIncluded, selectedSources, maxDistance, distanceCampus, sortOption]);

  const displayedProperties = useMemo(() => filteredProperties.slice(0, displayLimit), [filteredProperties, displayLimit]);

  const activeFilterCount = (selectedAreas.length > 0 ? 1 : 0) + 
                            (selectedBeds.length > 0 ? 1 : 0) + 
                            (maxPrice ? 1 : 0) + 
                            (billsIncluded !== null ? 1 : 0) +
                            (selectedSources.length > 0 ? 1 : 0) +
                            (maxDistance ? 1 : 0);

  const toggleArea = (area: string) => setSelectedAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
  const toggleBed = (bed: number) => setSelectedBeds(prev => prev.includes(bed) ? prev.filter(b => b !== bed) : [...prev, bed]);
  const toggleSource = (src: string) => setSelectedSources(prev => prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]);

  const resetFilters = () => {
    setSelectedAreas([]); setSelectedBeds([]); setMaxPrice(null); setBillsIncluded(null); 
    setSelectedSources([]); setMaxDistance(null); setSearch(''); setDisplayLimit(24);
    setSortOption('price_asc');
  };

  const desktop = isDesktop(width);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Finding the best homes in Exeter…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, !desktop && styles.headerMobile]}>
        <View>
          <Text style={styles.headerEyebrow}>Exeter Student Housing</Text>
          <Text style={[styles.headerTitle, !desktop && { fontSize: 22 }]}>Find Your Next Home</Text>
        </View>
        <View style={[styles.marketWidget, !desktop && styles.marketWidgetMobile]}>
          <View style={styles.marketWidgetInner}>
            <Icon name="trending-up" size={13} color={colors.primary} />
            <Text style={styles.marketLabel}>MARKET AVG</Text>
          </View>
          <Text style={styles.marketValue}>£{marketAverage}<Text style={styles.marketSub}> pw</Text></Text>
        </View>
      </View>

      {/* Search + filter */}
      <View style={styles.searchBar}>
        <View style={styles.searchWrap}>
          <Icon name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by street or area…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <Icon name="x" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
          activeOpacity={0.8}
        >
          <Icon name="sliders" size={15} color={activeFilterCount > 0 ? colors.white : colors.textSecondary} />
          <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          <Text style={styles.resultsCount}>{filteredProperties.length}</Text> properties found
          {lastUpdated && <Text style={styles.lastUpdatedText}> • Listings last updated: {lastUpdated}</Text>}
        </Text>
      </View>

      {/* Listing grid */}
      <FlatList
        data={displayedProperties}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <PropertyCard item={item} marketAverage={marketAverage} onPress={() => onSelectProperty(item.id)} />
        )}
        numColumns={desktop ? 3 : 1}
        key={desktop ? 'desktop' : 'mobile'}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={() =>
          displayLimit < filteredProperties.length ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setDisplayLimit(p => p + 24)} activeOpacity={0.85}>
              <Text style={styles.loadMoreText}>Load More</Text>
              <View style={styles.loadMoreBadge}>
                <Text style={styles.loadMoreBadgeText}>{filteredProperties.length - displayLimit}</Text>
              </View>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="search" size={28} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No properties found</Text>
            <Text style={styles.emptyDesc}>Try adjusting your search or clearing some filters.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={resetFilters}>
              <Text style={styles.emptyBtnText}>Clear all filters</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Filters modal */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Properties</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.modalClose}>
                <Icon name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Sort By</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity style={[styles.chip, sortOption === 'price_asc' && styles.chipActive]} onPress={() => setSortOption('price_asc')}>
                    <Text style={[styles.chipText, sortOption === 'price_asc' && styles.chipTextActive]}>Price: Low to High</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, sortOption === 'price_desc' && styles.chipActive]} onPress={() => setSortOption('price_desc')}>
                    <Text style={[styles.chipText, sortOption === 'price_desc' && styles.chipTextActive]}>Price: High to Low</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, sortOption === 'dist_streatham' && styles.chipActive]} onPress={() => setSortOption('dist_streatham')}>
                    <Text style={[styles.chipText, sortOption === 'dist_streatham' && styles.chipTextActive]}>Distance: Streatham</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, sortOption === 'dist_st_lukes' && styles.chipActive]} onPress={() => setSortOption('dist_st_lukes')}>
                    <Text style={[styles.chipText, sortOption === 'dist_st_lukes' && styles.chipTextActive]}>Distance: St Lukes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, sortOption === 'newest' && styles.chipActive]} onPress={() => setSortOption('newest')}>
                    <Text style={[styles.chipText, sortOption === 'newest' && styles.chipTextActive]}>Newest Listed</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Preferred Areas</Text>
                <View style={styles.chipRow}>
                  {AREAS.map(area => (
                    <TouchableOpacity
                      key={area}
                      style={[styles.chip, selectedAreas.includes(area) && styles.chipActive]}
                      onPress={() => toggleArea(area)}
                    >
                      <Text style={[styles.chipText, selectedAreas.includes(area) && styles.chipTextActive]}>{area}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Bedrooms</Text>
                <View style={styles.chipRow}>
                  {BED_OPTIONS.map(n => (
                    <TouchableOpacity key={n} style={[styles.chip, selectedBeds.includes(n) && styles.chipActive]} onPress={() => toggleBed(n)}>
                      <Text style={[styles.chipText, selectedBeds.includes(n) && styles.chipTextActive]}>{n}{n === 5 ? '+' : ''}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Max Price (per person / week)</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity style={[styles.chip, maxPrice === null && styles.chipActive]} onPress={() => setMaxPrice(null)}>
                    <Text style={[styles.chipText, maxPrice === null && styles.chipTextActive]}>Any</Text>
                  </TouchableOpacity>
                  {PRICE_OPTIONS.map(price => (
                    <TouchableOpacity key={price} style={[styles.chip, maxPrice === price && styles.chipActive]} onPress={() => setMaxPrice(price)}>
                      <Text style={[styles.chipText, maxPrice === price && styles.chipTextActive]}>£{price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Source Site</Text>
                <View style={styles.chipRow}>
                  {SOURCES.map(src => (
                    <TouchableOpacity
                      key={src}
                      style={[styles.chip, selectedSources.includes(src) && styles.chipActive]}
                      onPress={() => toggleSource(src)}
                    >
                      <Text style={[styles.chipText, selectedSources.includes(src) && styles.chipTextActive]}>{src}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Max Distance from Campus</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, distanceCampus === 'streatham' && styles.chipActive]}
                    onPress={() => setDistanceCampus('streatham')}
                  >
                    <Text style={[styles.chipText, distanceCampus === 'streatham' && styles.chipTextActive]}>Streatham</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.chip, distanceCampus === 'st_lukes' && styles.chipActive]}
                    onPress={() => setDistanceCampus('st_lukes')}
                  >
                    <Text style={[styles.chipText, distanceCampus === 'st_lukes' && styles.chipTextActive]}>St Lukes</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.chipRow, { marginTop: 12 }]}>
                  <TouchableOpacity style={[styles.chip, maxDistance === null && styles.chipActive]} onPress={() => setMaxDistance(null)}>
                    <Text style={[styles.chipText, maxDistance === null && styles.chipTextActive]}>Any Distance</Text>
                  </TouchableOpacity>
                  {DISTANCE_OPTIONS.map(d => (
                    <TouchableOpacity key={d} style={[styles.chip, maxDistance === d && styles.chipActive]} onPress={() => setMaxDistance(d)}>
                      <Text style={[styles.chipText, maxDistance === d && styles.chipTextActive]}>Within {d} mi</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.filterGroupLabel}>Bills Included Only</Text>
                    <Text style={styles.filterGroupSub}>Show only properties with bills included</Text>
                  </View>
                  <Switch
                    value={billsIncluded === true}
                    onValueChange={v => setBillsIncluded(v ? true : null)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.white}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalResetBtn} onPress={resetFilters}>
                <Text style={styles.modalResetText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApplyBtn} onPress={() => setShowFilters(false)}>
                <Text style={styles.modalApplyText}>Show {filteredProperties.length} Properties</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontFamily, fontSize: 14, color: colors.textMuted },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  headerEyebrow: { fontFamily, ...typography.label, color: colors.primary, marginBottom: 4 },
  headerTitle: { fontFamily, fontSize: 28, fontWeight: '800' as any, color: colors.textPrimary, letterSpacing: -0.5 },
  marketWidget: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMedium,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'flex-end',
  },
  marketWidgetMobile: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  marketWidgetInner: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  marketLabel: { fontFamily, fontSize: 10, fontWeight: '700' as any, color: colors.primary, letterSpacing: 0.5 },
  marketValue: { fontFamily, fontSize: 22, fontWeight: '800' as any, color: colors.primary, letterSpacing: -0.5 },
  marketSub: { fontFamily, fontSize: 13, fontWeight: '500' as any, color: colors.primary },

  searchBar: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
    alignItems: 'center',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily,
    fontSize: 14,
    color: colors.textPrimary,
    height: '100%',
  },
  clearBtn: { padding: 4 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 7,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { fontFamily, fontSize: 13, fontWeight: '600' as any, color: colors.textSecondary },
  filterBtnTextActive: { color: colors.white },

  resultsBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultsText: { fontFamily, fontSize: 13, color: colors.textMuted },
  lastUpdatedText: { fontStyle: 'italic', fontSize: 12 },
  resultsCount: { fontWeight: '700' as any, color: colors.textPrimary },

  listContent: { padding: spacing.sm },

  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: spacing.xl,
    marginHorizontal: spacing.md,
    paddingVertical: 16,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  loadMoreText: { fontFamily, color: colors.textPrimary, fontWeight: '700' as any, fontSize: 15 },
  loadMoreBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  loadMoreBadgeText: { fontFamily, fontSize: 12, fontWeight: '700' as any, color: colors.primary },

  empty: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontFamily, fontSize: 17, fontWeight: '700' as any, color: colors.textPrimary },
  emptyDesc: { fontFamily, fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
  emptyBtn: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 11, paddingHorizontal: 20,
    borderRadius: radii.md, marginTop: 4,
  },
  emptyBtnText: { fontFamily, fontSize: 14, color: colors.primary, fontWeight: '700' as any },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(28,25,23,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    height: '85%',
    ...shadows.medium,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.borderDark,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontFamily, fontSize: 18, fontWeight: '700' as any, color: colors.textPrimary },
  modalClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  modalBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  filterGroup: { marginBottom: spacing.xl },
  filterGroupLabel: { fontFamily, fontSize: 15, fontWeight: '700' as any, color: colors.textPrimary, marginBottom: 4 },
  filterGroupSub: { fontFamily, fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily, fontSize: 13, fontWeight: '600' as any, color: colors.textSecondary },
  chipTextActive: { color: colors.white },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  modalResetBtn: {
    flex: 1, paddingVertical: 14,
    borderRadius: radii.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modalResetText: { fontFamily, fontWeight: '700' as any, color: colors.textSecondary, fontSize: 14 },
  modalApplyBtn: {
    flex: 2, backgroundColor: colors.primary,
    paddingVertical: 14, borderRadius: radii.md,
    alignItems: 'center', ...shadows.soft,
  },
  modalApplyText: { fontFamily, fontWeight: '700' as any, color: colors.white, fontSize: 14 },
});
