import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList, useWindowDimensions,
} from 'react-native';
import Icon from '../components/Icon';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii, typography, shadows, fontFamily, isDesktop, getUniversityColors } from '../utils/theme';

import UNIVERSITIES from '../../config/universities.json';

const EXETER_LANDLORDS = [
  'UniHomes', 'StuRents', 'AccommodationForStudents', 'Rightmove', 'Cardens', 'RSJInvestments', 'StarStudents', 'Gillams'
];

const BRISTOL_LANDLORDS = [
  'UniHomes', 'StuRents', 'AccommodationForStudents', 'Rightmove', 'UWEStudentPad', 'BristolSULettings', 'CJHole', 'BristolDigs', 'StudentCrowd', 'JointLiving', 'UniteStudents'
];

export default function ReviewsScreen({ universityId, initialLandlordId, onAddReview }: { 
  universityId: string,
  initialLandlordId?: string | null, 
  onAddReview: (landlordId: string) => void 
}) {
  const [landlords, setLandlords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLandlord, setSelectedLandlord] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const { width } = useWindowDimensions();
  const desktop = isDesktop(width);
  
  const currentUni = UNIVERSITIES.find(u => u.id === universityId) || UNIVERSITIES[0];
  const theme = getUniversityColors(universityId);

  useEffect(() => { fetchLandlords(); }, [universityId]);

  const fetchLandlords = async () => {
    try {
      setFetchError(false);
      const { data, error } = await supabase.from('landlords').select('*').order('name');
      if (error) throw error;
      
      const targetIds = universityId === 'bristol' ? BRISTOL_LANDLORDS : EXETER_LANDLORDS;
      
      // Create objects for all target landlords to ensure they show up even if not in DB
      const fullList = targetIds.map(id => {
        const dbEntry = (data || []).find(l => l.id === id || l.name === id);
        return dbEntry || { id, name: id, type: 'Verified Provider' };
      });

      // Sort alphabetically by name
      fullList.sort((a, b) => a.name.localeCompare(b.name));
      
      // Append "General Landlords"
      const finalList = [...fullList, { id: 'other', name: 'General Landlords', type: 'Private Providers' }];
      
      setLandlords(finalList);
      
      if (initialLandlordId) {
        const found = finalList.find(l => l.id === initialLandlordId || (initialLandlordId === 'general' && l.id === 'other'));
        if (found) { setSelectedLandlord(found); fetchReviews(found.id); }
      } else if (finalList.length > 0 && desktop) {
        setSelectedLandlord(finalList[0]);
        fetchReviews(finalList[0].id);
      }
    } catch (err) { 
      console.error(err);
      setFetchError(true);
    }
    finally { setLoading(false); }
  };

  const fetchReviews = async (landlordId: string) => {
    setReviewsLoading(true);
    setFetchError(false);
    const targetId = landlordId === 'other' ? 'general' : landlordId;
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('landlord_id', targetId)
        .eq('approved', true) // Moderation: only show approved reviews
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setReviews(data || []);
    } catch (err) { 
      console.error(err);
      setFetchError(true);
    }
    finally { setReviewsLoading(false); }
  };

  const handleLandlordSelect = (landlord: any) => { setSelectedLandlord(landlord); fetchReviews(landlord.id); };

  const getScore = (item: any) => {
    if (!item) return 5;
    if (item.overall_rating !== undefined && item.overall_rating !== null) return Number(item.overall_rating);
    const m = Number(item.maintenance_rating ?? item.maintenance ?? 5);
    const c = Number(item.communication_rating ?? item.communication ?? 5);
    const v = Number(item.value_rating ?? item.value ?? 5);
    const d = Number(item.deposit_rating ?? item.deposit ?? 5);
    const sum = (isNaN(m) ? 5 : m) + (isNaN(c) ? 5 : c) + (isNaN(v) ? 5 : v) + (isNaN(d) ? 5 : d);
    return sum / 4;
  };

  const renderStars = (score: number) => {
    const sVal = isNaN(score) ? 0 : Math.round(score);
    return (
      <View style={styles.starsRow}>
        {[1,2,3,4,5].map(s => (
          <Text key={s} style={{ fontSize: 13, color: s <= sVal ? '#FBBF24' : colors.border }}>{'★'}</Text>
        ))}
      </View>
    );
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '??';
    return parts.map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Page header */}
      <View style={[styles.pageHeader, !desktop && styles.pageHeaderMobile]}>
        <View>
          <Text style={[styles.headerEyebrow, { color: theme.primary }]}>Tenant Verified</Text>
          <Text style={[styles.pageTitle, !desktop && { fontSize: 22 }]}>Landlord Reviews</Text>
        </View>
        <Text style={styles.pageDesc}>Transparent feedback from real {currentUni.city} students.</Text>
      </View>

      <View style={[styles.body, !desktop && styles.bodyMobile]}>

        {/* Landlord panel */}
        <View style={[styles.landlordPanel, !desktop && styles.landlordPanelMobile]}>
          {desktop ? (
            <>
              <View style={styles.panelHeader}>
                <Text style={styles.panelHeaderText}>LANDLORDS</Text>
                <View style={[styles.panelCount, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.panelCountText, { color: theme.primary }]}>{landlords.length}</Text>
                </View>
              </View>
              <FlatList
                data={landlords}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.desktopList}
                renderItem={({ item }) => {
                  const isActive = selectedLandlord?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.landlordItem, isActive && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                      onPress={() => handleLandlordSelect(item)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.landlordAvatar, { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : theme.primaryLight }]}>
                        <Text style={[styles.landlordAvatarText, { color: isActive ? colors.white : theme.primary }]}>
                          {getInitials(item.name)}
                        </Text>
                      </View>
                      <View style={styles.landlordMeta}>
                        <Text style={[styles.landlordName, isActive && { color: colors.white }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.type && (
                          <Text style={[styles.landlordType, { color: isActive ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>{item.type}</Text>
                        )}
                      </View>
                      <Icon name="chevron-right" size={14} color={isActive ? 'rgba(255,255,255,0.6)' : colors.borderDark} />
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mobileList}
              decelerationRate="fast"
              keyboardShouldPersistTaps="handled"
            >
              {landlords.map((item) => {
                const isActive = selectedLandlord?.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.landlordItem, isActive && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => handleLandlordSelect(item)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.landlordName, isActive && { color: colors.white }]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Reviews panel */}
        <View style={styles.reviewsPanel}>
          {fetchError ? (
            <View style={styles.center}>
              <Text style={{ color: colors.error, marginBottom: 16 }}>Couldn't load reviews right now. Please try again later.</Text>
              <TouchableOpacity onPress={fetchLandlords} style={[styles.emptyBtn, { backgroundColor: theme.primary }]}>
                <Text style={styles.emptyBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : selectedLandlord ? (
            <View style={{ flex: 1 }}>
              <View style={{ display: 'none' }} />
              <View style={[styles.reviewsHero, !desktop && styles.reviewsHeroMobile]}>
                <View style={styles.reviewsHeroLeft}>
                  <View style={[styles.heroAvatar, { backgroundColor: theme.primaryLight, borderColor: theme.primaryMedium }]}>
                    <Text style={[styles.heroAvatarText, { color: theme.primary }]}>{getInitials(selectedLandlord.name)}</Text>
                  </View>
                  <View>
                    <Text style={[styles.heroName, !desktop && { fontSize: 18 }]}>{selectedLandlord.name}</Text>
                    <Text style={styles.heroType}>{selectedLandlord.type || 'Verified Provider'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.writeReviewBtn, { backgroundColor: theme.primary }]}
                  onPress={() => onAddReview(selectedLandlord.id)}
                  activeOpacity={0.85}
                >
                  <Icon name="edit-2" size={14} color={colors.white} />
                  <Text style={styles.writeReviewText}>Write a Review</Text>
                </TouchableOpacity>
              </View>

              {reviewsLoading ? (
                <ActivityIndicator style={{ marginTop: 48 }} color={theme.primary} />
              ) : (
                <FlatList
                  data={reviews}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.reviewsList}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <View style={styles.emptyIcon}>
                        <Icon name="message-square" size={28} color={colors.textMuted} />
                      </View>
                      <Text style={styles.emptyTitle}>No reviews yet — be the first to share your experience!</Text>
                      <Text style={styles.emptyDesc}>Your feedback helps other {currentUni.city} students make informed decisions.</Text>
                      <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: theme.primary }]} onPress={() => onAddReview(selectedLandlord.id)}>
                        <Text style={styles.emptyBtnText}>Write the First Review</Text>
                      </TouchableOpacity>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const score = getScore(item);
                    
                    let dateStr = 'Recently';
                    try {
                      if (item.created_at) {
                        const d = new Date(item.created_at);
                        if (!isNaN(d.getTime())) {
                          dateStr = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                        }
                      }
                    } catch (e) {
                      console.log('Date parse error', e);
                    }

                    const isGeneral = item.landlord_id === 'general' || item.landlord_id === 'other';
                    const rawReviewText = item.review_text || item.review || '';
                    const landlordPrefix = isGeneral && rawReviewText.startsWith('[LANDLORD:')
                      ? rawReviewText.match(/\[LANDLORD: (.*?)\]/)?.[1] || null
                      : null;
                    
                    const landlordName = item.landlord_name || landlordPrefix || selectedLandlord.name;
                    
                    const reviewText = landlordPrefix
                      ? rawReviewText.replace(/\[LANDLORD: .*?\] /, '')
                      : (rawReviewText || 'No review text provided.');

                    return (
                      <View style={styles.reviewCard}>
                        <View style={styles.reviewCardHeader}>
                          <View style={styles.reviewScoreBlock}>
                            <Text style={styles.reviewScoreNum}>{Number(score).toFixed(1)}</Text>
                            {renderStars(Number(score))}
                          </View>
                          <Text style={styles.reviewDate}>{dateStr}</Text>
                        </View>

                        <View style={[styles.landlordTag, { backgroundColor: theme.primaryLight }]}>
                          <Icon name="user" size={11} color={theme.primary} />
                          <Text style={[styles.landlordTagText, { color: theme.primary }]}>{landlordName}</Text>
                        </View>

                        <View style={styles.metricsGrid}>
                          {[
                            { label: 'Maintenance', score: item.maintenance_rating || item.maintenance || 5 },
                            { label: 'Communication', score: item.communication_rating || item.communication || 5 },
                            { label: 'Value', score: item.value_rating || item.value || 5 },
                            { label: 'Deposit Safety', score: item.deposit_rating || item.deposit || 5 },
                          ].map((metric) => (
                            <View key={metric.label} style={styles.metric}>
                              <Text style={styles.metricLabel}>{metric.label}</Text>
                              <View style={styles.metricBar}>
                                <View style={[styles.metricBarFill, { width: `${(metric.score / 5) * 100}%` as any, backgroundColor: theme.primary }]} />
                              </View>
                              <Text style={styles.metricScore}>{metric.score}/5</Text>
                            </View>
                          ))}
                        </View>

                        <Text style={styles.reviewText}>{reviewText}</Text>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          ) : (
            <View style={styles.placeholder}>
              <View style={styles.placeholderIcon}>
                <Icon name="layers" size={32} color={colors.textMuted} />
              </View>
              <Text style={styles.placeholderTitle}>Select a landlord</Text>
              <Text style={styles.placeholderDesc}>Choose a landlord from the list to view their tenant reviews.</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  pageHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: 48,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  pageHeaderMobile: { 
    flexDirection: 'column', 
    alignItems: 'flex-start', 
    paddingHorizontal: spacing.md, 
    paddingTop: 40,
    gap: 4
  },
  headerEyebrow: { ...typography.label, marginBottom: 2 },
  pageTitle: { fontFamily, fontSize: 24, fontWeight: '800' as any, color: colors.textPrimary, letterSpacing: -0.4 },
  pageDesc: { fontFamily, fontSize: 13, color: colors.textMuted },

  body: { flex: 1, flexDirection: 'row' },
  bodyMobile: { flexDirection: 'column' },

  landlordPanel: {
    width: 280,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  landlordPanelMobile: {
    width: '100%',
    height: 72,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 99,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelHeaderText: { fontFamily, fontSize: 11, fontWeight: '700' as any, color: colors.textMuted, letterSpacing: 0.8 },
  panelCount: {
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  panelCountText: { fontFamily, fontSize: 11, fontWeight: '700' as any },
  desktopList: { paddingVertical: spacing.sm },
  mobileList: { 
    paddingHorizontal: 16, 
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  landlordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
    ...shadows.soft,
  },
  landlordAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  landlordAvatarText: { fontFamily, fontSize: 12, fontWeight: '700' as any },
  landlordMeta: { flex: 1, marginLeft: 12 },
  landlordName: { fontFamily, fontSize: 14, fontWeight: '600' as any, color: colors.textPrimary },
  landlordType: { fontFamily, fontSize: 11, marginTop: 1 },

  reviewsPanel: { flex: 1, backgroundColor: colors.background },
  reviewsHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewsHeroMobile: { padding: spacing.md },
  reviewsHeroLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  heroAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  heroAvatarText: { fontFamily, fontSize: 16, fontWeight: '800' as any },
  heroName: { fontFamily, fontSize: 22, fontWeight: '800' as any, color: colors.textPrimary, letterSpacing: -0.3 },
  heroType: { fontFamily, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    ...shadows.soft,
  },
  writeReviewText: { fontFamily, color: colors.white, fontWeight: '700' as any, fontSize: 13 },

  reviewsList: { padding: spacing.md, gap: spacing.md },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
    marginBottom: spacing.md,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  reviewScoreBlock: { gap: 4 },
  reviewScoreNum: { fontFamily, fontSize: 28, fontWeight: '800' as any, color: colors.textPrimary, letterSpacing: -0.5, lineHeight: 30 },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewDate: { fontFamily, fontSize: 12, color: colors.textMuted, marginTop: 4 },
  landlordTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  landlordTagText: { fontFamily, fontSize: 12, fontWeight: '700' as any },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.md },
  metric: { width: '47%', gap: 4 },
  metricLabel: { fontFamily, fontSize: 11, color: colors.textMuted, fontWeight: '600' as any },
  metricBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  metricBarFill: { height: '100%', borderRadius: 2 },
  metricScore: { fontFamily, fontSize: 11, fontWeight: '700' as any, color: colors.textSecondary },
  reviewText: { fontFamily, fontSize: 14, color: colors.textSecondary, lineHeight: 22 },

  emptyState: { paddingVertical: 64, alignItems: 'center', gap: 12 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontFamily, fontSize: 17, fontWeight: '700' as any, color: colors.textPrimary },
  emptyDesc: { fontFamily, fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  emptyBtn: {
    paddingVertical: 11, paddingHorizontal: 20,
    borderRadius: radii.md, marginTop: 4,
  },
  emptyBtnText: { fontFamily, fontSize: 13, color: colors.white, fontWeight: '700' as any },

  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: spacing.xl },
  placeholderIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  placeholderTitle: { fontFamily, fontSize: 17, fontWeight: '700' as any, color: colors.textSecondary },
  placeholderDesc: { fontFamily, fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 300, lineHeight: 22 },
});
