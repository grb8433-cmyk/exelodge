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

export default function ReviewsScreen({ universityId, isDarkMode = false, initialLandlordId, onAddReview }: { 
  universityId: string,
  isDarkMode?: boolean,
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
  const theme = getUniversityColors(universityId, isDarkMode);

  useEffect(() => { fetchLandlords(); }, [universityId]);

  const fetchLandlords = async () => {
    try {
      setFetchError(false);
      const { data, error } = await supabase.from('landlords').select('*').order('name');
      if (error) throw error;
      
      const targetIds = universityId === 'bristol' ? BRISTOL_LANDLORDS : EXETER_LANDLORDS;
      
      const fullList = targetIds.map(id => {
        const dbEntry = (data || []).find(l => l.id === id || l.name === id);
        return dbEntry || { id, name: id, type: 'Verified Provider' };
      });

      fullList.sort((a, b) => a.name.localeCompare(b.name));
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
        .eq('approved', true)
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

  const getScoreColor = (score: number) => {
    if (score >= 4.0) return colors.scoreHigh;
    if (score >= 3.0) return colors.scoreMid;
    return colors.scoreLow;
  };

  const renderStars = (score: number) => {
    const sVal = isNaN(score) ? 0 : Math.round(score);
    return (
      <View style={styles.starsRow}>
        {[1,2,3,4,5].map(s => (
          <Icon key={s} name="star" size={13} color={s <= sVal ? colors.starFilled : colors.starEmpty} />
        ))}
      </View>
    );
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.split(' ').filter(Boolean);
    return parts.length ? parts.map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.pageHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }, !desktop && styles.pageHeaderMobile]}>
        <View>
          <Text style={[styles.headerEyebrow, { color: theme.primary }]}>TENANT VERIFIED</Text>
          <Text style={[styles.pageTitle, { color: theme.textPrimary }, !desktop && { fontSize: 22 }]}>Landlord Reviews</Text>
        </View>
        <Text style={[styles.pageDesc, { color: theme.textMuted }]}>Transparent feedback from real {currentUni.city} students.</Text>
      </View>

      <View style={[styles.body, !desktop && styles.bodyMobile]}>
        {/* Landlord Sidebar */}
        <View style={[styles.landlordSidebar, { backgroundColor: theme.surface, borderRightColor: theme.border, borderBottomColor: theme.border }, !desktop && styles.landlordSidebarMobile]}>
          <View style={[styles.panelHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.panelHeaderText, { color: theme.textMuted }]}>LANDLORDS</Text>
            <View style={[styles.panelCount, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.panelCountText, { color: theme.primary }]}>{landlords.length}</Text>
            </View>
          </View>
          
          <FlatList
            data={landlords}
            keyExtractor={(item) => item.id}
            horizontal={!desktop}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={desktop ? styles.desktopList : styles.mobileList}
            renderItem={({ item }) => {
              const isActive = selectedLandlord?.id === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.landlordItem, 
                    { borderBottomColor: theme.border },
                    isActive && { backgroundColor: theme.primary, borderColor: theme.primary },
                    !desktop && [styles.landlordItemMobile, { borderColor: theme.border }]
                  ]}
                  onPress={() => handleLandlordSelect(item)}
                  activeOpacity={0.75}
                >
                  <View style={[
                    styles.landlordAvatar, 
                    { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : theme.primaryLight }
                  ]}>
                    <Text style={[styles.landlordAvatarText, { color: isActive ? colors.white : theme.primary }]}>
                      {getInitials(item.name)}
                    </Text>
                  </View>
                  <View style={styles.landlordMeta}>
                    <Text style={[styles.landlordName, { color: theme.textPrimary }, isActive && { color: colors.white }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.landlordType, { color: isActive ? 'rgba(255,255,255,0.7)' : theme.textMuted }]}>
                      {item.type || 'Verified Provider'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Reviews Feed */}
        <View style={[styles.reviewsPanel, { backgroundColor: theme.background }]}>
          {selectedLandlord ? (
            <View style={{ flex: 1 }}>
              <View style={[styles.reviewsHero, { backgroundColor: theme.surface, borderBottomColor: theme.border }, !desktop && styles.reviewsHeroMobile]}>
                <View style={styles.reviewsHeroLeft}>
                  <View style={[styles.heroAvatar, { backgroundColor: theme.primaryLight, borderColor: theme.primaryMedium }]}>
                    <Text style={[styles.heroAvatarText, { color: theme.primary }]}>{getInitials(selectedLandlord.name)}</Text>
                  </View>
                  <View>
                    <Text style={[styles.heroName, { color: theme.textPrimary }, !desktop && { fontSize: 18 }]}>{selectedLandlord.name}</Text>
                    <Text style={[styles.heroType, { color: theme.textMuted }]}>{selectedLandlord.type || 'Verified Provider'}</Text>
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
                      <View style={[styles.emptyIcon, { backgroundColor: theme.surfaceSubtle }]}>
                        <Icon name="message-square" size={28} color={theme.textMuted} />
                      </View>
                      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No reviews yet — be the first to share!</Text>
                      <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>Your feedback helps other {currentUni.city} students make informed decisions.</Text>
                      <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: theme.primary }]} onPress={() => onAddReview(selectedLandlord.id)}>
                        <Text style={styles.emptyBtnText}>Write the First Review</Text>
                      </TouchableOpacity>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const score = Number(item.overall_rating ?? 5);
                    const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Recently';

                    return (
                      <View style={[styles.reviewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={styles.reviewCardHeader}>
                          <View style={styles.reviewScoreBlock}>
                            <Text style={[styles.reviewScoreNum, { color: getScoreColor(score) }]}>{score.toFixed(1)}</Text>
                            {renderStars(score)}
                          </View>
                          <Text style={[styles.reviewDate, { color: theme.textMuted }]}>{dateStr}</Text>
                        </View>

                        <Text style={[styles.reviewText, { color: theme.textSecondary }]}>{item.review_text || 'No review text provided.'}</Text>
                        
                        <View style={styles.metricsGrid}>
                          {[
                            { label: 'MAINTENANCE', score: item.maintenance_rating || 5 },
                            { label: 'COMMUNICATION', score: item.communication_rating || 5 },
                            { label: 'VALUE', score: item.value_rating || 5 },
                            { label: 'DEPOSIT', score: item.deposit_rating || 5 },
                          ].map((metric) => (
                            <View key={metric.label} style={styles.metric}>
                              <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{metric.label}</Text>
                              <View style={[styles.metricBar, { backgroundColor: theme.surfaceSubtle }]}>
                                <View style={[styles.metricBarFill, { width: `${(metric.score / 5) * 100}%` as any, backgroundColor: theme.primaryMedium }]} />
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Icon name="layers" size={32} color={theme.textMuted} />
              <Text style={[styles.placeholderTitle, { color: theme.textSecondary }]}>Select a landlord</Text>
              <Text style={[styles.placeholderDesc, { color: theme.textMuted }]}>Choose a provider from the list to view their tenant reviews.</Text>
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
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  pageHeaderMobile: { flexDirection: 'column', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 40, gap: 4 },
  headerEyebrow: { ...typography.eyebrow, marginBottom: 2 },
  pageTitle: { ...typography.h1Page, color: colors.textPrimary },
  pageDesc: { ...typography.bodySubtle, color: colors.textMuted },

  body: { flex: 1, flexDirection: 'row' },
  bodyMobile: { flexDirection: 'column' },

  landlordSidebar: {
    width: 280,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  landlordSidebarMobile: { width: '100%', borderRightWidth: 0, borderBottomWidth: 1 },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelHeaderText: { ...typography.eyebrow, fontSize: 9 },
  panelCount: { borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 2 },
  panelCountText: { ...typography.caption, fontWeight: '700' as any },
  
  desktopList: { paddingVertical: 8 },
  mobileList: { padding: 12, gap: 10 },
  
  landlordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  landlordItemMobile: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minWidth: 160,
  },
  landlordAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  landlordAvatarText: { ...typography.caption, fontWeight: '700' as any },
  landlordMeta: { flex: 1 },
  landlordName: { ...typography.body, fontWeight: '600' as any, color: colors.textPrimary },
  landlordType: { ...typography.caption, color: colors.textMuted },

  reviewsPanel: { flex: 1, backgroundColor: colors.background },
  reviewsHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewsHeroMobile: { padding: 16 },
  reviewsHeroLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  heroAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  heroAvatarText: { ...typography.body, fontWeight: '800' as any },
  heroName: { ...typography.h2Section, fontSize: 20, letterSpacing: -0.3 },
  heroType: { ...typography.bodySubtle, color: colors.textMuted },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    ...shadows.soft,
  },
  writeReviewText: { ...typography.bodySmall, color: colors.white, fontWeight: '700' as any },

  reviewsList: { padding: 24, gap: 16 },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reviewScoreBlock: { gap: 4 },
  reviewScoreNum: { ...typography.h2ReviewScore, fontSize: 30, lineHeight: 30 },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewDate: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  reviewText: { ...typography.body, color: colors.textSecondary, marginBottom: 20 },
  
  metricsGrid: { flexDirection: 'row', gap: 12 },
  metric: { flex: 1, gap: 4 },
  metricLabel: { ...typography.eyebrow, fontSize: 8 },
  metricBar: { height: 3, backgroundColor: colors.surfaceSubtle, borderRadius: 2, overflow: 'hidden' },
  metricBarFill: { height: '100%', borderRadius: 2 },

  emptyState: { paddingVertical: 64, alignItems: 'center', gap: 12 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { ...typography.h3Card, textAlign: 'center' },
  emptyDesc: { ...typography.bodySubtle, color: colors.textMuted, textAlign: 'center', maxWidth: 280 },
  emptyBtn: { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 12, marginTop: 4 },
  emptyBtnText: { ...typography.bodySmall, color: colors.white, fontWeight: '700' as any },

  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 48 },
  placeholderTitle: { ...typography.h3Card, color: colors.textSecondary },
  placeholderDesc: { ...typography.body, color: colors.textMuted, textAlign: 'center', maxWidth: 300 },
});
