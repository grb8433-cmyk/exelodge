import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  TextInput, TouchableOpacity, ScrollView, useWindowDimensions,
  Platform, Modal, Switch, Animated,
} from 'react-native';
import Icon from '../components/Icon';
import { supabase } from '../lib/supabase';
import PropertyCard from '../components/PropertyCard';
import MapView from '../components/MapView';
import { colors, spacing, radii, typography, shadows, fontFamily, isDesktop, getUniversityColors } from '../utils/theme';
import { getFavorites, toggleFavorite } from '../utils/favorites';
import { trackEvent } from '../utils/analytics';

import UNIVERSITIES from '../../config/universities.json';

const AREAS_MAP: Record<string, string[]> = {
  exeter: ['Pennsylvania', 'St James', 'Heavitree', 'Newtown', 'Mount Pleasant', 'Haldon', 'City Centre', 'St Davids', 'St Leonards', 'Riverside'],
  bristol: ['City Centre', 'Clifton', 'Redland', 'Cotham', 'Stokes Croft', 'Southville', 'Horfield', 'Bishopston', 'Filton', 'Stoke Bishop'],
  southampton: ['City Centre', 'Highfield', 'Portswood', 'Shirley', 'Swaythling', 'Bassett']
};

const SOURCES_MAP: Record<string, string[]> = {
  exeter: ['UniHomes', 'StuRents', 'AccommodationForStudents', 'Rightmove', 'Cardens', 'RSJInvestments', 'StarStudents', 'Gillams'],
  bristol: ['UniHomes', 'StuRents', 'AccommodationForStudents', 'Rightmove', 'UWEStudentPad', 'BristolSULettings', 'CJHole', 'BristolDigs', 'StudentCrowd', 'JointLiving', 'UniteStudents'],
  southampton: ['UniHomes', 'StuRents', 'AccommodationForStudents', 'Rightmove', 'OnTheMarket', 'StudentCrowd', 'EveryStudent', 'AmberStudent', 'StudNoFee', 'iStudentLets']
};

const CAMPUS_MAP: Record<string, {id: string, label: string}[]> = {
  exeter: [{id: 'streatham', label: 'Streatham'}, {id: 'st_lukes', label: 'St Lukes'}],
  bristol: [{id: 'uob', label: 'UoB'}, {id: 'uwe', label: 'UWE'}],
  southampton: [{id: 'highfield', label: 'Highfield'}, {id: 'solent', label: 'Solent'}]
};

type SortOption = 'price_asc' | 'price_desc' | 'dist_campus1' | 'dist_campus2' | 'newest';

export default function HomeScreen({ universityId, isDarkMode = false, onSelectProperty }: { universityId: string, isDarkMode?: boolean, onSelectProperty: (id: string) => void }) {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [displayLimit, setDisplayLimit] = useState(24);
  const { width } = useWindowDimensions();
  
  const currentUni = UNIVERSITIES.find(u => u.id === universityId) || UNIVERSITIES[0];
  const theme = getUniversityColors(universityId, isDarkMode);
  const AREAS = AREAS_MAP[universityId] || AREAS_MAP.exeter;
  const SOURCES = SOURCES_MAP[universityId] || SOURCES_MAP.exeter;
  const CAMPUSES = CAMPUS_MAP[universityId] || CAMPUS_MAP.exeter;

  const [showFilters, setShowFilters] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedBeds, setSelectedBeds] = useState<number[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [billsIncluded, setBillsIncluded] = useState<boolean | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [distanceCampusIdx, setDistanceCampusIdx] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>('price_asc');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Animation states
  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);

  const clampedScrollY = useMemo(() => Animated.diffClamp(scrollY, 0, headerHeight || 1), [headerHeight]);
  const headerTranslate = useMemo(() => clampedScrollY.interpolate({
    inputRange: [0, headerHeight || 1],
    outputRange: [0, -(headerHeight || 1)],
    extrapolate: 'clamp',
  }), [clampedScrollY, headerHeight]);

  useEffect(() => { 
    setSelectedAreas([]);
    setSelectedSources([]);
    fetchProperties(); 
    loadFavorites();
  }, [universityId]);

  async function loadFavorites() {
    const favs = await getFavorites();
    setFavorites(favs);
  }

  const handleToggleFavorite = async (id: string) => {
    const newFavs = await toggleFavorite(id);
    setFavorites(newFavs);
  };

  async function fetchProperties() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('properties')
        .select('*')
        .eq('is_available', true)
        .eq('university', universityId);
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
      const matchesSaved  = !showSavedOnly || favorites.includes(p.id.toString());
      
      let matchesDist = true;
      if (maxDistance) {
        const campusKey = `distance_${CAMPUSES[distanceCampusIdx].id}`;
        const dist = p[campusKey];
        matchesDist = dist !== null && dist <= maxDistance;
      }

      return matchesSearch && matchesArea && matchesBeds && matchesPrice && matchesBills && matchesSource && matchesDist && matchesSaved;
    });

    result.sort((a, b) => {
      const pA = parseFloat(a.price_pppw) || 0;
      const pB = parseFloat(b.price_pppw) || 0;
      
      if (sortOption === 'price_asc') return pA - pB;
      if (sortOption === 'price_desc') return pB - pA;
      
      if (sortOption === 'dist_campus1') {
        const k = `distance_${CAMPUSES[0].id}`;
        return (a[k] ?? 99) - (b[k] ?? 99);
      }
      if (sortOption === 'dist_campus2') {
        const k = `distance_${CAMPUSES[1].id}`;
        return (a[k] ?? 99) - (b[k] ?? 99);
      }
      
      if (sortOption === 'newest') {
        const dA = a.last_scraped ? new Date(a.last_scraped).getTime() : 0;
        const dB = b.last_scraped ? new Date(b.last_scraped).getTime() : 0;
        return (isNaN(dB) ? 0 : dB) - (isNaN(dA) ? 0 : dA);
      }
      return 0;
    });

    return result;
  }, [properties, search, selectedAreas, selectedBeds, maxPrice, billsIncluded, selectedSources, maxDistance, distanceCampusIdx, sortOption, showSavedOnly, favorites]);

  const displayedProperties = useMemo(() => filteredProperties.slice(0, displayLimit), [filteredProperties, displayLimit]);

  const activeFilterCount = (selectedAreas.length > 0 ? 1 : 0) + 
                            (selectedBeds.length > 0 ? 1 : 0) + 
                            (maxPrice ? 1 : 0) + 
                            (billsIncluded !== null ? 1 : 0) +
                            (selectedSources.length > 0 ? 1 : 0) +
                            (maxDistance ? 1 : 0);

  const toggleArea = (area: string) => {
    setSelectedAreas(prev => {
      const next = prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area];
      trackEvent('filter_applied', { filter: 'area', value: area, universityId });
      return next;
    });
  };
  const toggleBed = (bed: number) => {
    setSelectedBeds(prev => {
      const next = prev.includes(bed) ? prev.filter(b => b !== bed) : [...prev, bed];
      trackEvent('filter_applied', { filter: 'beds', value: bed, universityId });
      return next;
    });
  };
  const toggleSource = (src: string) => {
    setSelectedSources(prev => {
      const next = prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src];
      trackEvent('filter_applied', { filter: 'source', value: src, universityId });
      return next;
    });
  };

  const handleSetMaxPrice = (price: number | null) => {
    setMaxPrice(price);
    if (price !== null) trackEvent('filter_applied', { filter: 'max_price', value: price, universityId });
  };

  const handleSetSortOption = (option: SortOption) => {
    setSortOption(option);
    trackEvent('filter_applied', { filter: 'sort', value: option, universityId });
  };

  const handleSetBillsIncluded = (val: boolean | null) => {
    setBillsIncluded(val);
    if (val !== null) trackEvent('filter_applied', { filter: 'bills_included', value: val, universityId });
  };

  const resetFilters = () => {
    setSelectedAreas([]); setSelectedBeds([]); setMaxPrice(null); setBillsIncluded(null); 
    setSelectedSources([]); setMaxDistance(null); setSearch(''); setDisplayLimit(24);
    setSortOption('price_asc');
  };

  const desktop = isDesktop(width);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.primary }]}>Finding the best homes in {currentUni.city}…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated Header Wrapper */}
      <Animated.View 
        style={[
          styles.headerContainer, 
          { transform: [{ translateY: headerTranslate }], backgroundColor: theme.surface, borderBottomColor: theme.border }
        ]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        {/* Header */}
        <View style={[styles.header, !desktop && styles.headerMobile]}>
          <View>
            <Text style={[styles.headerEyebrow, { color: theme.primary }]}>{currentUni.city} Student Housing</Text>
            <View style={styles.titleRow}>
              <Text style={[styles.headerTitle, { color: theme.textPrimary }, !desktop && { fontSize: 22 }]}>Find Your Next Home</Text>
              
              {/* View Toggle */}
              {Platform.OS === 'web' && (
                <View style={[styles.viewToggle, { backgroundColor: theme.primaryLight }]}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: theme.primary }]}
                    onPress={() => setViewMode('list')}
                  >
                    <Icon name="list" size={14} color={viewMode === 'list' ? colors.white : theme.primary} />
                    <Text style={[styles.toggleBtnLabel, { color: viewMode === 'list' ? colors.white : theme.primary }]}>List</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, viewMode === 'map' && { backgroundColor: theme.primary }]}
                    onPress={() => setViewMode('map')}
                  >
                    <Icon name="map" size={14} color={viewMode === 'map' ? colors.white : theme.primary} />
                    <Text style={[styles.toggleBtnLabel, { color: viewMode === 'map' ? colors.white : theme.primary }]}>Map</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.marketWidget, !desktop && styles.marketWidgetMobile, { backgroundColor: theme.primaryLight }]}>
            <View style={[styles.marketWidgetInner, !desktop && styles.marketWidgetInnerMobile]}>
              <Icon name="trending-up" size={13} color={theme.primary} />
              <Text style={[styles.marketLabel, { color: theme.primary }]}>MARKET AVG</Text>
            </View>
            <Text style={[styles.marketValue, { color: theme.primary }]}>£{marketAverage}<Text style={[styles.marketSub, { color: theme.textMuted }]}> pw</Text></Text>
          </View>
        </View>

        {/* Search + filter */}
        <View style={[styles.searchBar, { borderTopColor: theme.border }]}>
          <View style={[styles.searchWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Icon name="search" size={16} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search by street or area…"
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                <Icon name="x" size={14} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: theme.surface, borderColor: theme.border }, activeFilterCount > 0 && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={() => setShowFilters(true)}
            activeOpacity={0.8}
          >
            <Icon name="sliders" size={15} color={activeFilterCount > 0 ? colors.white : theme.primary} />
            <Text style={[styles.filterBtnText, { color: activeFilterCount > 0 ? colors.white : theme.primary }]}>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: theme.surface, borderColor: theme.border }, showSavedOnly && { backgroundColor: '#ef4444', borderColor: '#ef4444' }]}
            onPress={() => setShowSavedOnly(!showSavedOnly)}
            activeOpacity={0.8}
          >
            <Icon name="heart" size={15} color={showSavedOnly ? colors.white : '#ef4444'} fill={showSavedOnly ? colors.white : 'transparent'} />
            {!desktop && <Text style={[styles.filterBtnText, { color: showSavedOnly ? colors.white : '#ef4444' }]}>Saved</Text>}
            {desktop && <Text style={[styles.filterBtnText, { color: showSavedOnly ? colors.white : '#ef4444' }]}>Saved ({favorites.length})</Text>}
          </TouchableOpacity>
        </View>

        {/* Results count */}
        <View style={[styles.resultsBar, { backgroundColor: theme.surfaceSubtle }]}>
          <Text style={[styles.resultsText, { color: theme.textSecondary }]}>
            <Text style={[styles.resultsCount, { color: theme.primary }]}>{filteredProperties.length}</Text> properties found
            {lastUpdated && <Text style={[styles.lastUpdatedText, { color: theme.textMuted }]}> • Listings last updated: {lastUpdated}</Text>}
          </Text>
        </View>
      </Animated.View>

      {/* View Content (List or Map) */}
      {viewMode === 'list' ? (
        <Animated.FlatList
          data={displayedProperties}
          keyExtractor={(item) => item.id.toString()}
          numColumns={desktop ? 3 : 1}
          key={desktop ? 'desktop' : 'mobile'}
          contentContainerStyle={[styles.list, { paddingTop: headerHeight + 20, paddingHorizontal: desktop ? 32 : 16 }]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: theme.primaryLight }]}>
                <Icon name={showSavedOnly ? "heart" : "search"} size={32} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{showSavedOnly ? "No saved homes" : "No matching properties"}</Text>
              <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
                {showSavedOnly ? "You haven't saved any properties to your favorites yet." : `Try adjusting your filters or search terms to find more results in ${currentUni.city}.`}
              </Text>
              <TouchableOpacity style={[styles.resetBtn, { backgroundColor: theme.primary }]} onPress={showSavedOnly ? () => setShowSavedOnly(false) : resetFilters}>
                <Text style={styles.resetBtnText}>{showSavedOnly ? "Show All Properties" : "Clear All Filters"}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <PropertyCard 
              item={item} 
              universityId={universityId} 
              isDarkMode={isDarkMode} 
              marketAverage={marketAverage} 
              onPress={() => onSelectProperty(item.id)}
              isFavorite={favorites.includes(item.id.toString())}
              onToggleFavorite={() => handleToggleFavorite(item.id.toString())}
            />
          )}
          onEndReached={() => setDisplayLimit(prev => prev + 12)}
          onEndReachedThreshold={0.5}
        />
      ) : (
        <View style={{ flex: 1, marginTop: headerHeight }}>
          <MapView 
            properties={filteredProperties} 
            universityId={universityId} 
            onSelectProperty={onSelectProperty} 
          />
        </View>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Filters & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Icon name="x" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.filterGroup}>
                <Text style={[styles.filterGroupLabel, { color: theme.textMuted }]}>Sort By</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, sortOption === 'price_asc' && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => handleSetSortOption('price_asc')}>
                    <Text style={[styles.chipText, { color: theme.textSecondary }, sortOption === 'price_asc' && { color: colors.white }]}>Price: Low to High</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, sortOption === 'price_desc' && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => handleSetSortOption('price_desc')}>
                    <Text style={[styles.chipText, { color: theme.textSecondary }, sortOption === 'price_desc' && { color: colors.white }]}>Price: High to Low</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, sortOption === 'dist_campus1' && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => handleSetSortOption('dist_campus1')}>
                    <Text style={[styles.chipText, { color: theme.textSecondary }, sortOption === 'dist_campus1' && { color: colors.white }]}>Distance: {CAMPUSES[0].label}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, sortOption === 'dist_campus2' && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => handleSetSortOption('dist_campus2')}>
                    <Text style={[styles.chipText, { color: theme.textSecondary }, sortOption === 'dist_campus2' && { color: colors.white }]}>Distance: {CAMPUSES[1].label}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, sortOption === 'newest' && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => handleSetSortOption('newest')}>
                    <Text style={[styles.chipText, { color: theme.textSecondary }, sortOption === 'newest' && { color: colors.white }]}>Newest Listed</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={[styles.filterGroupLabel, { color: theme.textMuted }]}>Preferred Areas</Text>
                <View style={styles.chipRow}>
                  {AREAS.map(area => (
                    <TouchableOpacity
                      key={area}
                      style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, selectedAreas.includes(area) && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                      onPress={() => toggleArea(area)}
                    >
                      <Text style={[styles.chipText, { color: theme.textSecondary }, selectedAreas.includes(area) && { color: colors.white }]}>{area}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={[styles.filterGroupLabel, { color: theme.textMuted }]}>Bedrooms</Text>
                <View style={styles.chipRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity key={n} style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, selectedBeds.includes(n) && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => toggleBed(n)}>
                      <Text style={[styles.chipText, { color: theme.textSecondary }, selectedBeds.includes(n) && { color: colors.white }]}>{n}{n === 5 ? '+' : ''}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={[styles.filterGroupLabel, { color: theme.textMuted }]}>Max Price (per person / week)</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, maxPrice === null && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => handleSetMaxPrice(null)}>
                    <Text style={[styles.chipText, { color: theme.textSecondary }, maxPrice === null && { color: colors.white }]}>Any</Text>
                  </TouchableOpacity>
                  {[100, 120, 150, 180, 200, 250, 300, 400].map(price => (
                    <TouchableOpacity key={price} style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, maxPrice === price && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => handleSetMaxPrice(price)}>
                      <Text style={[styles.chipText, { color: theme.textSecondary }, maxPrice === price && { color: colors.white }]}>£{price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={[styles.filterGroupLabel, { color: theme.textMuted }]}>Source Site</Text>
                <View style={styles.chipRow}>
                  {SOURCES.map(src => (
                    <TouchableOpacity
                      key={src}
                      style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, selectedSources.includes(src) && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                      onPress={() => toggleSource(src)}
                    >
                      <Text style={[styles.chipText, { color: theme.textSecondary }, selectedSources.includes(src) && { color: colors.white }]}>{src}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={[styles.filterGroupLabel, { color: theme.textMuted }]}>Utilities</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, billsIncluded === null && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => handleSetBillsIncluded(null)}>
                    <Text style={[styles.chipText, { color: theme.textSecondary }, billsIncluded === null && { color: colors.white }]}>Any</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, billsIncluded === true && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => handleSetBillsIncluded(true)}>
                    <Text style={[styles.chipText, { color: theme.textSecondary }, billsIncluded === true && { color: colors.white }]}>Bills Included</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={[styles.filterGroupLabel, { color: theme.textMuted }]}>Campus Distance</Text>
                <View style={styles.chipRow}>
                  {CAMPUSES.map((c, idx) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, distanceCampusIdx === idx && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                      onPress={() => setDistanceCampusIdx(idx)}
                    >
                      <Text style={[styles.chipText, { color: theme.textSecondary }, distanceCampusIdx === idx && { color: colors.white }]}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={[styles.chipRow, { marginTop: 12 }]}>
                  <TouchableOpacity style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, maxDistance === null && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setMaxDistance(null)}>
                    <Text style={[styles.chipText, { color: theme.textSecondary }, maxDistance === null && { color: colors.white }]}>Any Distance</Text>
                  </TouchableOpacity>
                  {[0.5, 1, 2, 3].map(d => (
                    <TouchableOpacity key={d} style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }, maxDistance === d && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setMaxDistance(d)}>
                      <Text style={[styles.chipText, { color: theme.textSecondary }, maxDistance === d && { color: colors.white }]}>Within {d} mi</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
              <TouchableOpacity style={[styles.modalReset, { borderColor: theme.border }]} onPress={resetFilters}>
                <Text style={[styles.modalResetText, { color: theme.textSecondary }]}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalApply, { backgroundColor: theme.primary }]} onPress={() => setShowFilters(false)}>
                <Text style={styles.modalApplyText}>Show {filteredProperties.length} Homes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontFamily, fontSize: 14, fontWeight: '700' as any },

  headerContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    zIndex: 10,
    ...shadows.soft,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: spacing.md,
  },
  headerMobile: { 
    paddingHorizontal: 16, 
    paddingTop: 32,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerEyebrow: { ...typography.eyebrow, marginBottom: 2 },
  headerTitle: { ...typography.h1Page, color: colors.textPrimary },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  toggleBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  marketWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 12,
  },
  marketWidgetMobile: { 
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  marketWidgetInner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 16 },
  marketWidgetInnerMobile: { marginRight: 8 },
  marketLabel: { ...typography.eyebrow, fontSize: 9, letterSpacing: 1 },
  marketValue: { ...typography.priceLarge, fontSize: 18 },
  marketSub: { fontSize: 11, fontWeight: '400' as any, color: colors.textMuted },

  searchBar: {
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingVertical: spacing.md,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
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
  },
  clearBtn: { padding: 4 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterBtnText: { fontFamily, fontSize: 14, fontWeight: '700' as any },

  resultsBar: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSubtle,
  },
  resultsText: { fontFamily, fontSize: 12, color: colors.textSecondary },
  resultsCount: { fontWeight: '800' as any },
  lastUpdatedText: { color: colors.textMuted },

  list: {
    gap: 20,
    paddingBottom: 40,
  },
  
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { ...typography.h2Section, color: colors.textPrimary },
  emptyDesc: { ...typography.body, color: colors.textMuted, textAlign: 'center', maxWidth: 300 },
  resetBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  resetBtnText: { color: colors.white, fontWeight: '700' as any, fontSize: 14 },

  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h2Section },
  modalBody: { padding: spacing.lg },
  filterGroup: { marginBottom: 32 },
  filterGroupLabel: { ...typography.eyebrow, marginBottom: spacing.md, color: colors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipText: { fontFamily, fontSize: 14, fontWeight: '600' as any, color: colors.textSecondary },
  
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  modalReset: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalResetText: { fontFamily, fontWeight: '600' as any, color: colors.textSecondary, fontSize: 14 },
  modalApply: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  modalApplyText: { fontFamily, fontWeight: '700' as any, color: colors.white, fontSize: 14 },
});
