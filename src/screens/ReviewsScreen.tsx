import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList, useWindowDimensions,
} from 'react-native';
import Icon from '../components/Icon';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii, typography, shadows, fontFamily, isDesktop } from '../utils/theme';

export default function ReviewsScreen({ initialLandlordId, onAddReview }: { initialLandlordId?: string | null, onAddReview: (landlordId: string) => void }) {
  const [landlords, setLandlords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLandlord, setSelectedLandlord] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const { width } = useWindowDimensions();
  const desktop = isDesktop(width);

  useEffect(() => { fetchLandlords(); }, []);

  const fetchLandlords = async () => {
    try {
      const { data, error } = await supabase.from('landlords').select('*').order('name').limit(50);
      if (error) throw error;
      const list = (data || []).filter(l => l.id !== 'general' && l.id !== 'other');
      const fullList = [...list, { id: 'other', name: 'General Landlords', type: 'Private Providers' }];
      setLandlords(fullList);
      if (initialLandlordId) {
        const found = fullList.find(l => l.id === initialLandlordId || (initialLandlordId === 'general' && l.id === 'other'));
        if (found) { setSelectedLandlord(found); fetchReviews('general'); }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchReviews = async (landlordId: string) => {
    setReviewsLoading(true);
    const targetId = landlordId === 'other' ? 'general' : landlordId;
    try {
      const { data, error } = await supabase.from('reviews').select('*').eq('landlord_id', targetId).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      setReviews(data || []);
    } catch (err) { console.error(err); }
    finally { setReviewsLoading(false); }
  };

  const handleLandlordSelect = (landlord: any) => { setSelectedLandlord(landlord); fetchReviews(landlord.id); };

  const avgScore = (item: any) => (((item.maintenance || 5) + (item.communication || 5) + (item.value || 5) + (item.deposit || 5)) / 4);

  const renderStars = (score: number) => (
    <View style={styles.starsRow}>
      {[1,2,3,4,5].map(s => (
        <Text key={s} style={{ fontSize: 13, color: s <= Math.round(score) ? '#FBBF24' : colors.border }}>{'★'}</Text>
      ))}
    </View>
  );

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Page header */}
      <View style={[styles.pageHeader, !desktop && styles.pageHeaderMobile]}>
        <View>
          <Text style={styles.headerEyebrow}>Tenant Verified</Text>
          <Text style={[styles.pageTitle, !desktop && { fontSize: 22 }]}>Landlord Reviews</Text>
        </View>
        <Text style={styles.pageDesc}>Transparent feedback from real Exeter students.</Text>
      </View>

      <View style={[styles.body, !desktop && styles.bodyMobile]}>

        {/* Landlord panel */}
        <View style={[styles.landlordPanel, !desktop && styles.landlordPanelMobile]}>
          {desktop && (
            <View style={styles.panelHeader}>
              <Text style={styles.panelHeaderText}>LANDLORDS</Text>
              <View style={styles.panelCount}>
                <Text style={styles.panelCountText}>{landlords.length}</Text>
              </View>
            </View>
          )}

          <FlatList
            data={landlords}
            horizontal={!desktop}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={!desktop ? styles.mobileList : styles.desktopList}
            renderItem={({ item }) => {
              const isActive = selectedLandlord?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.landlordItem, isActive && styles.landlordItemActive, !desktop && styles.landlordItemMobile]}
                  onPress={() => handleLandlordSelect(item)}
                  activeOpacity={0.75}
                >
                  {desktop && (
                    <View style={[styles.landlordAvatar, isActive && styles.landlordAvatarActive]}>
                      <Text style={[styles.landlordAvatarText, isActive && { color: colors.white }]}>
                        {getInitials(item.name)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.landlordMeta}>
                    <Text style={[styles.landlordName, isActive && styles.landlordNameActive, !desktop && { fontSize: 13 }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {desktop && item.type && (
                      <Text style={[styles.landlordType, isActive && { color: 'rgba(255,255,255,0.7)' }]}>{item.type}</Text>
                    )}
                  </View>
                  {desktop && (
                    <Icon name="chevron-right" size={14} color={isActive ? 'rgba(255,255,255,0.6)' : colors.borderDark} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Reviews panel */}
        <View style={styles.reviewsPanel}>
          {selectedLandlord ? (
            <View style={{ flex: 1 }}>
              <View style={[styles.reviewsHero, !desktop && styles.reviewsHeroMobile]}>
                <View style={styles.reviewsHeroLeft}>
                  <View style={styles.heroAvatar}>
                    <Text style={styles.heroAvatarText}>{getInitials(selectedLandlord.name)}</Text>
                  </View>
                  <View>
                    <Text style={[styles.heroName, !desktop && { fontSize: 18 }]}>{selectedLandlord.name}</Text>
                    <Text style={styles.heroType}>{selectedLandlord.type || 'Verified Provider'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.writeReviewBtn}
                  onPress={() => onAddReview(selectedLandlord.id)}
                  activeOpacity={0.85}
                >
                  <Icon name="edit-2" size={14} color={colors.white} />
                  <Text style={styles.writeReviewText}>Write a Review</Text>
                </TouchableOpacity>
              </View>

              {reviewsLoading ? (
                <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
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
                      <Text style={styles.emptyTitle}>No reviews yet</Text>
                      <Text style={styles.emptyDesc}>Be the first to share your experience with this landlord.</Text>
                      <TouchableOpacity style={styles.emptyBtn} onPress={() => onAddReview(selectedLandlord.id)}>
                        <Text style={styles.emptyBtnText}>Write the First Review</Text>
                      </TouchableOpacity>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const score = avgScore(item);
                    const date = item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently';

                    const isGeneral = item.landlord_id === 'general' || item.landlord_id === 'other';
                    const landlordPrefix = isGeneral && (item.review || '').startsWith('[LANDLORD:')
                      ? (item.review || '').match(/\[LANDLORD: (.*?)\]/)?.[1] || null
                      : null;
                    const reviewText = landlordPrefix
                      ? (item.review || '').replace(/\[LANDLORD: .*?\] /, '')
                      : (item.review || 'No review text provided.');

                    return (
                      <View style={styles.reviewCard}>
                        <View style={styles.reviewCardHeader}>
                          <View style={styles.reviewScoreBlock}>
                            <Text style={styles.reviewScoreNum}>{score.toFixed(1)}</Text>
                            {renderStars(score)}
                          </View>
                          <Text style={styles.reviewDate}>{date}</Text>
                        </View>

                        {landlordPrefix && (
                          <View style={styles.landlordTag}>
                            <Icon name="user" size={11} color={colors.primary} />
                            <Text style={styles.landlordTagText}>{landlordPrefix}</Text>
                          </View>
                        )}

                        <View style={styles.metricsGrid}>
                          {[
                            { label: 'Maintenance', score: item.maintenance || 5 },
                            { label: 'Communication', score: item.communication || 5 },
                            { label: 'Value', score: item.value || 5 },
                            { label: 'Deposit Safety', score: item.deposit || 5 },
                          ].map((metric) => (
                            <View key={metric.label} style={styles.metric}>
                              <Text style={styles.metricLabel}>{metric.label}</Text>
                              <View style={styles.metricBar}>
                                <View style={[styles.metricBarFill, { width: `${(metric.score / 5) * 100}%` as any }]} />
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  pageHeaderMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 4, paddingHorizontal: spacing.lg },
  headerEyebrow: { ...typography.label, color: colors.primary, marginBottom: 4 },
  pageTitle: { fontFamily, fontSize: 26, fontWeight: '800' as any, color: colors.textPrimary, letterSpacing: -0.4 },
  pageDesc: { fontFamily, fontSize: 14, color: colors.textMuted },

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
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 90,
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
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  panelCountText: { fontFamily, fontSize: 11, fontWeight: '700' as any, color: colors.textSecondary },
  desktopList: { paddingVertical: spacing.sm },
  mobileList: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 8, alignItems: 'center' },
  landlordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.md,
    marginHorizontal: spacing.sm,
    marginVertical: 2,
  },
  landlordItemActive: { backgroundColor: colors.primary },
  landlordItemMobile: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    marginHorizontal: 0,
  },
  landlordAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  landlordAvatarActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  landlordAvatarText: { fontFamily, fontSize: 12, fontWeight: '700' as any, color: colors.primary },
  landlordMeta: { flex: 1 },
  landlordName: { fontFamily, fontSize: 14, fontWeight: '600' as any, color: colors.textPrimary },
  landlordNameActive: { color: colors.white },
  landlordType: { fontFamily, fontSize: 11, color: colors.textMuted, marginTop: 1 },

  reviewsPanel: { flex: 1, backgroundColor: colors.background },
  reviewsHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewsHeroMobile: { padding: spacing.lg },
  reviewsHeroLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  heroAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.primaryMedium,
  },
  heroAvatarText: { fontFamily, fontSize: 16, fontWeight: '800' as any, color: colors.primary },
  heroName: { fontFamily, fontSize: 22, fontWeight: '800' as any, color: colors.textPrimary, letterSpacing: -0.3 },
  heroType: { fontFamily, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    ...shadows.soft,
  },
  writeReviewText: { fontFamily, color: colors.white, fontWeight: '700' as any, fontSize: 13 },

  reviewsList: { padding: spacing.xl, paddingTop: spacing.lg, gap: spacing.md },
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
    backgroundColor: colors.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  landlordTagText: { fontFamily, fontSize: 12, fontWeight: '700' as any, color: colors.primary },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.md },
  metric: { width: '47%', gap: 4 },
  metricLabel: { fontFamily, fontSize: 11, color: colors.textMuted, fontWeight: '600' as any },
  metricBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  metricBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
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
    backgroundColor: colors.primary,
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
