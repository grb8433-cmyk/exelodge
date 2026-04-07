import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, ScrollView, useWindowDimensions, Platform, Modal, Switch } from 'react-native';
import { supabase } from '../lib/supabase';
import PropertyCard from '../components/PropertyCard';
import { colors, spacing, radii, typography, shadows, isDesktop } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';

const AREAS = ['Pennsylvania', 'St James', 'Heavitree', 'Newtown', 'Mount Pleasant', 'Haldon', 'City Centre'];
const BED_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const PRICE_OPTIONS = [120, 140, 160, 180, 200, 250, 300];

export default function HomeScreen({ onSelectProperty }: { onSelectProperty: (id: string) => void }) {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { width } = useWindowDimensions();
  
  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [minBeds, setMinBeds] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [billsIncluded, setBillsIncluded] = useState<boolean | null>(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('price_pppw', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  const marketAverage = useMemo(() => {
    if (properties.length === 0) return 150;
    const validPrices = properties.map(p => parseFloat(p.price_pppw)).filter(p => !isNaN(p) && p > 0);
    if (validPrices.length === 0) return 150;
    return Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length);
  }, [properties]);

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      // Search check
      const matchesSearch = !search || 
                           p.address?.toLowerCase().includes(search.toLowerCase()) || 
                           p.area?.toLowerCase().includes(search.toLowerCase());
      
      // Area check
      const matchesArea = selectedAreas.length === 0 || selectedAreas.includes(p.area);
      
      // Beds check
      const matchesBeds = minBeds ? p.beds >= minBeds : true;
      
      // Price check
      const matchesPrice = maxPrice ? parseFloat(p.price_pppw) <= maxPrice : true;
      
      // Bills check
      const matchesBills = billsIncluded === null ? true : p.bills_included === billsIncluded;

      return matchesSearch && matchesArea && matchesBeds && matchesPrice && matchesBills;
    });
  }, [properties, search, selectedAreas, minBeds, maxPrice, billsIncluded]);

  const activeFilterCount = (selectedAreas.length > 0 ? 1 : 0) + (minBeds ? 1 : 0) + (maxPrice ? 1 : 0) + (billsIncluded !== null ? 1 : 0);

  const toggleArea = (area: string) => {
    setSelectedAreas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const resetFilters = () => {
    setSelectedAreas([]);
    setMinBeds(null);
    setMaxPrice(null);
    setBillsIncluded(null);
    setSearch('');
  };

  const desktopMode = isDesktop(width);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Finding the best homes in Exeter...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={[styles.header, !desktopMode && styles.headerMobile]}>
        <View>
          <Text style={styles.welcome}>Welcome to Exeter</Text>
          <Text style={[styles.title, !desktopMode && { fontSize: 24 }]}>Find your next home</Text>
        </View>
        <View style={[styles.statsHeader, !desktopMode && styles.statsHeaderMobile]}>
          <Text style={styles.statsLabel}>MARKET AVERAGE</Text>
          <Text style={styles.statsValue}>£{marketAverage}<Text style={styles.statsSub}>pw</Text></Text>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.topBar}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search street or area..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} 
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? colors.white : colors.textPrimary} />
          <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>
            Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Grid */}
      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <PropertyCard 
            item={item} 
            marketAverage={marketAverage} 
            onPress={() => onSelectProperty(item.id)} 
          />
        )}
        numColumns={desktopMode ? 3 : 1}
        key={desktopMode ? 'desktop' : 'mobile'}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No properties match your criteria.</Text>
            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
              <Text style={styles.resetBtnText}>Clear all filters</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Advanced Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detailed Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Areas */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Preferred Areas</Text>
                <View style={styles.chipGrid}>
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

              {/* Bedrooms */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Minimum Bedrooms</Text>
                <View style={styles.chipGrid}>
                  <TouchableOpacity 
                    style={[styles.chip, minBeds === null && styles.chipActive]}
                    onPress={() => setMinBeds(null)}
                  >
                    <Text style={[styles.chipText, minBeds === null && styles.chipTextActive]}>Any</Text>
                  </TouchableOpacity>
                  {BED_OPTIONS.map(num => (
                    <TouchableOpacity 
                      key={num}
                      style={[styles.chip, minBeds === num && styles.chipActive]}
                      onPress={() => setMinBeds(num)}
                    >
                      <Text style={[styles.chipText, minBeds === num && styles.chipTextActive]}>{num}+</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Max Price */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Max Price (pppw)</Text>
                <View style={styles.chipGrid}>
                  <TouchableOpacity 
                    style={[styles.chip, maxPrice === null && styles.chipActive]}
                    onPress={() => setMaxPrice(null)}
                  >
                    <Text style={[styles.chipText, maxPrice === null && styles.chipTextActive]}>Any</Text>
                  </TouchableOpacity>
                  {PRICE_OPTIONS.map(price => (
                    <TouchableOpacity 
                      key={price}
                      style={[styles.chip, maxPrice === price && styles.chipActive]}
                      onPress={() => setMaxPrice(price)}
                    >
                      <Text style={[styles.chipText, maxPrice === price && styles.chipTextActive]}>£{price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Bills Included */}
              <View style={styles.filterSection}>
                <View style={styles.switchRow}>
                  <Text style={styles.filterLabel}>Bills Included Only</Text>
                  <Switch
                    value={billsIncluded === true}
                    onValueChange={(v) => setBillsIncluded(v ? true : null)}
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
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.bodySmall,
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  welcome: {
    ...typography.label,
    color: colors.primary,
    marginBottom: 4,
  },
  title: {
    ...typography.h2,
    fontSize: 32,
  },
  statsHeader: {
    alignItems: 'flex-end',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  statsHeaderMobile: {
    alignItems: 'flex-start',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLabel: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.primary,
  },
  statsValue: {
    ...typography.h3,
    color: colors.primary,
  },
  statsSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  topBar: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.white,
    ...shadows.soft,
    zIndex: 10,
    gap: spacing.md,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    height: '100%',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBtnText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  filterBtnTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
  },
  empty: {
    paddingVertical: 100,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  resetBtn: {
    marginTop: spacing.lg,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
  },
  resetBtnText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    height: '85%',
    ...shadows.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h3,
  },
  modalBody: {
    padding: spacing.xl,
  },
  filterSection: {
    marginBottom: spacing.xl,
  },
  filterLabel: {
    ...typography.h4,
    marginBottom: spacing.md,
    color: colors.textPrimary,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalFooter: {
    padding: spacing.xl,
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalResetText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalApplyBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  modalApplyText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.white,
  },
});
