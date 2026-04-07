import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, useWindowDimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, shadows, isDesktop } from '../utils/theme';

export default function ReviewsScreen({ initialLandlordId, onAddReview }: { initialLandlordId?: string | null, onAddReview: (landlordId: string) => void }) {
  const [landlords, setLandlords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLandlord, setSelectedLandlord] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const { width } = useWindowDimensions();
  const desktopMode = isDesktop(width);

  useEffect(() => {
    fetchLandlords();
  }, []);

  const fetchLandlords = async () => {
    try {
      const { data, error } = await supabase.from('landlords').select('*').order('name').limit(50);
      if (error) throw error;
      
      // Filter out any existing 'general' record from the DB to avoid duplicates/singular names
      const list = (data || []).filter(l => l.id !== 'general' && l.id !== 'other');
      
      // Manually add the "General Landlords" option with the correct plural spelling
      const fullList = [...list, { id: 'other', name: 'General Landlords', type: 'Private Providers' }];
      setLandlords(fullList);
      
      // Handle initial landlord selection
      if (initialLandlordId) {
        // Special case: if target is 'general' or 'other', we select our 'other' list item
        const found = fullList.find(l => l.id === initialLandlordId || (initialLandlordId === 'general' && l.id === 'other'));
        if (found) {
          setSelectedLandlord(found);
          fetchReviews('general');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (landlordId: string) => {
    setReviewsLoading(true);
    // Always translate 'other' to the real 'general' bucket in DB
    const targetId = landlordId === 'other' ? 'general' : landlordId;
    
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('landlord_id', targetId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleLandlordSelect = (landlord: any) => {
    setSelectedLandlord(landlord);
    fetchReviews(landlord.id);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#006633" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, !desktopMode && styles.headerMobile]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Verified Landlord Reviews</Text>
          <Text style={styles.subHeader}>Transparent feedback from Exeter students.</Text>
        </View>
      </View>

      <View style={[styles.contentRow, !desktopMode && styles.contentRowMobile]}>
        {/* Landlord List / Selector */}
        <View style={[styles.sidebar, !desktopMode && styles.sidebarMobile]}>
          {!desktopMode && <Text style={styles.sidebarTitleMobile}>Select Landlord:</Text>}
          {desktopMode && <Text style={styles.sidebarTitle}>Select a Landlord</Text>}
          
          <FlatList
            data={landlords}
            horizontal={!desktopMode}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={!desktopMode && styles.horizontalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.landlordItem, 
                  selectedLandlord?.id === item.id && styles.activeLandlord,
                  !desktopMode && styles.landlordItemMobile
                ]}
                onPress={() => handleLandlordSelect(item)}
              >
                <Text style={[
                  styles.landlordName, 
                  selectedLandlord?.id === item.id && styles.activeLandlordText,
                  !desktopMode && { fontSize: 13 }
                ]}>
                  {item.name}
                </Text>
                {desktopMode && <Ionicons name="chevron-forward" size={16} color={selectedLandlord?.id === item.id ? '#fff' : '#9ca3af'} />}
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Reviews View */}
        <View style={styles.mainView}>
          {selectedLandlord ? (
            <View style={{ flex: 1 }}>
              <View style={styles.landlordHero}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>{selectedLandlord.name}</Text>
                  <Text style={styles.heroType}>{selectedLandlord.type || 'Verified Provider'}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.addReviewBtn}
                  onPress={() => onAddReview(selectedLandlord.id)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addReviewText}>Write a Review</Text>
                </TouchableOpacity>
              </View>

              {reviewsLoading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color="#006633" />
              ) : (
                <FlatList
                  data={reviews}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.reviewsList}
                  ListEmptyComponent={
                    <View style={styles.emptyReviews}>
                      <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
                      <Text style={styles.emptyText}>No reviews yet for this landlord.</Text>
                      <Text style={styles.emptySubtext}>Be the first to share your experience.</Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <View style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.ratingBadge}>
                          <Text style={styles.ratingText}>{( ((item.maintenance || 5) + (item.communication || 5) + (item.value || 5) + (item.deposit || 5)) / 4 ).toFixed(1)}</Text>
                        </View>
                        <View>
                          <Text style={styles.reviewDate}>
                            {item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB') : 'Recently'}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.metricsGrid}>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Maintenance</Text>
                          <View style={styles.stars}>
                            {[1,2,3,4,5].map(s => <Ionicons key={s} name={s <= (item.maintenance || 5) ? "star" : "star-outline"} size={12} color="#fbbf24" />)}
                          </View>
                        </View>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Communication</Text>
                          <View style={styles.stars}>
                            {[1,2,3,4,5].map(s => <Ionicons key={s} name={s <= (item.communication || 5) ? "star" : "star-outline"} size={12} color="#fbbf24" />)}
                          </View>
                        </View>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Value</Text>
                          <View style={styles.stars}>
                            {[1,2,3,4,5].map(s => <Ionicons key={s} name={s <= (item.value || 5) ? "star" : "star-outline"} size={12} color="#fbbf24" />)}
                          </View>
                        </View>
                        <View style={styles.metric}>
                          <Text style={styles.metricLabel}>Deposit Safety</Text>
                          <View style={styles.stars}>
                            {[1,2,3,4,5].map(s => <Ionicons key={s} name={s <= (item.deposit || 5) ? "star" : "star-outline"} size={12} color="#fbbf24" />)}
                          </View>
                        </View>
                      </View>

                      <Text style={styles.reviewComment}>
                        { (item.landlord_id === 'general' || item.landlord_id === 'other') && (item.review || '').startsWith('[LANDLORD:') 
                          ? <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 16 }}>
                              {(item.review || '').match(/\[LANDLORD: (.*?)\]/)?.[1] || 'Private Landlord'}
                              {"\n"}
                            </Text> 
                          : null}
                        { (item.landlord_id === 'general' || item.landlord_id === 'other') && (item.review || '').startsWith('[LANDLORD:')
                          ? (item.review || '').replace(/\[LANDLORD: .*?\] /, '')
                          : (item.review || 'No review text provided.')}
                      </Text>
                    </View>
                  )}
                />
              )}
            </View>
          ) : (
            <View style={styles.placeholderView}>
              <Ionicons name="business-outline" size={64} color="#d1d5db" />
              <Text style={styles.placeholderText}>Select a landlord from the list to see their reviews.</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 40, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  headerMobile: { padding: 20, paddingTop: 30 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#111827' },
  subHeader: { fontSize: 16, color: '#6b7280', marginTop: 8 },
  contentRow: { flex: 1, flexDirection: 'row' },
  contentRowMobile: { flexDirection: 'column' },
  sidebar: { width: 300, borderRightWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  sidebarMobile: { width: '100%', borderRightWidth: 0, borderBottomWidth: 1 },
  sidebarTitle: { padding: 20, fontSize: 14, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 },
  sidebarTitleMobile: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 5, fontSize: 12, fontWeight: '700', color: '#6b7280' },
  horizontalList: { paddingHorizontal: 15, paddingBottom: 15 },
  landlordItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  landlordItemMobile: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderBottomWidth: 0, backgroundColor: '#f3f4f6' },
  activeLandlord: { backgroundColor: '#006633' },
  landlordName: { fontSize: 15, fontWeight: '600', color: '#374151' },
  activeLandlordText: { color: '#fff' },
  mainView: { flex: 1, backgroundColor: '#f9fafb' },
  landlordHero: { padding: 32, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center' },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  heroType: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  addReviewBtn: { backgroundColor: '#006633', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addReviewText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  reviewsList: { padding: 32 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  ratingBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  ratingText: { color: '#16a34a', fontWeight: '700', fontSize: 18 },
  reviewDate: { fontSize: 13, color: '#9ca3af' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  metric: { width: '50%', marginBottom: 12 },
  metricLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  stars: { flexDirection: 'row' },
  reviewComment: { fontSize: 15, color: '#4b5563', lineHeight: 24 },
  emptyReviews: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6b7280', marginTop: 8 },
  placeholderView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  placeholderText: { fontSize: 16, color: '#9ca3af', textAlign: 'center', marginTop: 20 }
});