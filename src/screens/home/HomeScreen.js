import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, radii, shadows, spacing, typography, isDesktop } from '../../utils/theme';
import { getProperties, getReviews, getLandlordById } from '../../utils/storage';
import PropertyCard from '../../components/PropertyCard';
import ReviewCard from '../../components/ReviewCard';

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const desktop = isDesktop(width);
  const [featured, setFeatured] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const loadData = useCallback(async () => {
    // Load Featured Houses
    const props = await getProperties();
    setFeatured(props.slice(0, 3));

    // Load Recent Reviews
    setLoadingReviews(true);
    const allReviews = await getReviews();
    const latest = allReviews.slice(0, 3);
    
    // Enrich reviews with landlord names
    const enriched = await Promise.all(latest.map(async (r) => {
      const landlord = await getLandlordById(r.landlordId);
      return { ...r, landlordName: landlord?.name || 'Unknown Landlord' };
    }));
    
    setRecentReviews(enriched);
    setLoadingReviews(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const features = [
    {
      id: 'houses',
      title: 'Find a House',
      subtitle: 'Browse 100+ real student properties in Exeter',
      icon: 'search-outline',
      tab: 'HousesTab',
      color: colors.primary,
    },
    {
      id: 'reviews',
      title: 'Landlord Reviews',
      subtitle: 'Read honest experiences from fellow students',
      icon: 'star-outline',
      tab: 'ReviewsTab',
      color: '#F59E0B',
    },
    {
      id: 'rights',
      title: 'Know Your Rights',
      subtitle: 'Plain-English guide to tenant law',
      icon: 'shield-checkmark-outline',
      tab: 'RightsTab',
      color: '#10B981',
    },
  ];

  const stats = [
    { label: 'Properties', value: '150+', icon: 'home' },
    { label: 'Agencies', value: '30+', icon: 'business' },
  ];

  const Container = Platform.OS === 'web' ? View : SafeAreaView;

  return (
    <Container style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, desktop && styles.contentDesktop]}
      >
        
        {/* Hero Section */}
        <View style={[styles.hero, desktop && styles.heroDesktop]}>
          <View style={desktop ? styles.heroTextContainerDesktop : styles.heroTextContainer}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.logoText}>ExeLodge</Text>
            <Text style={[styles.tagline, desktop && styles.taglineDesktop]}>
              The complete student housing platform for the University of Exeter. 
              Find houses, vet landlords, and know your rights — all in one place.
            </Text>
            
            {desktop && (
              <TouchableOpacity 
                style={styles.ctaButton}
                onPress={() => navigation.navigate('HousesTab')}
              >
                <Text style={styles.ctaButtonText}>Start Searching</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Row (Desktop Only) */}
        {desktop && (
          <View style={styles.statsRow}>
            {stats.map((stat, i) => (
              <View key={i} style={styles.statCard}>
                <Ionicons name={stat.icon} size={24} color={colors.primary} />
                <Text style={statValueStyle(stat.value)}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={desktop ? styles.mainGridDesktop : styles.mainGrid}>
          {/* Feature Grid */}
          <View style={[styles.section, desktop && styles.featureSectionDesktop]}>
            <Text style={styles.sectionTitle}>Explore Features</Text>
            <View style={styles.grid}>
              {features.map((feature) => (
                <TouchableOpacity
                  key={feature.id}
                  style={styles.featureCard}
                  onPress={() => navigation.navigate(feature.tab)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconBox, { backgroundColor: feature.color + '15' }]}>
                    <Ionicons name={feature.icon} size={28} color={feature.color} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{feature.title}</Text>
                    <Text style={styles.cardSubtitle}>{feature.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Featured Properties (More prominent on desktop) */}
          <View style={[styles.section, desktop && styles.featuredSectionDesktop]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Houses</Text>
              <TouchableOpacity onPress={() => navigation.navigate('HousesTab')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={desktop ? styles.featuredGridDesktop : styles.featuredList}>
              {featured.map((item) => (
                <View key={item.id} style={desktop ? styles.featuredItemDesktop : styles.featuredItem}>
                  <PropertyCard
                    property={item}
                    onPress={() => navigation.navigate('HousesTab', { screen: 'HouseDetail', params: { propertyId: item.id } })}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Recent Reviews Feed */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Student Reviews</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ReviewsTab')}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {loadingReviews ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : recentReviews.length > 0 ? (
            <View style={desktop ? styles.reviewsGridDesktop : styles.reviewsList}>
              {recentReviews.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={desktop ? styles.reviewItemDesktop : styles.reviewItem}
                  onPress={() => navigation.navigate('ReviewsTab', { screen: 'LandlordProfile', params: { landlordId: item.landlordId } })}
                >
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewLandlord}>{item.landlordName}</Text>
                    <View style={styles.reviewStars}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.reviewRating}>{item.overallRating}.0</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewSnippet} numberOfLines={2}>"{item.review}"</Text>
                  <Text style={styles.reviewDate}>{item.date}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyReviews}>No reviews yet. Be the first to add one!</Text>
          )}
        </View>

        {/* Info Section */}
        <View style={[styles.infoBox, desktop && styles.infoBoxDesktop]}>
          <Text style={styles.infoTitle}>Why students choose ExeLodge</Text>
          <View style={desktop ? styles.infoGridDesktop : styles.infoGridMobile}>
            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoItemTitle}>Verified Reviews</Text>
                <Text style={styles.infoText}>Authentic experiences from Exeter students with @exeter.ac.uk verification.</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <Ionicons name="navigate" size={24} color={colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoItemTitle}>Campus Distance</Text>
                <Text style={styles.infoText}>We calculate walking times to both Streatham and St Luke's automatically.</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoIconBox}>
                <Ionicons name="people" size={24} color={colors.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoItemTitle}>Safe Matching</Text>
                <Text style={styles.infoText}>Connect with compatible housemates anonymously until you both match.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </Container>
  );
}

// Dynamic style helper for stats
const statValueStyle = (val) => ({
  fontSize: val.length > 4 ? 20 : 24,
  fontWeight: '800',
  color: colors.textPrimary,
  marginTop: 8,
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.xl,
  },
  contentDesktop: {
    padding: spacing.xl,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  hero: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  heroDesktop: {
    paddingVertical: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  heroTextContainer: {
    alignItems: 'center',
  },
  heroTextContainerDesktop: {
    alignItems: 'center',
    maxWidth: 600,
  },
  welcomeText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  logoText: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -2,
    marginTop: -4,
  },
  tagline: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 24,
    maxWidth: 320,
  },
  taglineDesktop: {
    fontSize: 18,
    maxWidth: 500,
    marginBottom: spacing.lg,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: radii.full,
    gap: 10,
    ...shadows.card,
  },
  ctaButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  mainGrid: {
    gap: spacing.xl,
  },
  mainGridDesktop: {
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'flex-start',
  },
  section: {
    gap: spacing.md,
  },
  featureSectionDesktop: {
    flex: 1,
  },
  featuredSectionDesktop: {
    flex: 1.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.h2,
    fontSize: 22,
  },
  seeAll: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  grid: {
    gap: spacing.md,
  },
  featureCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.h3,
    fontSize: 17,
    marginBottom: 2,
  },
  cardSubtitle: {
    ...typography.caption,
    fontSize: 12,
  },
  featuredList: {
    gap: spacing.md,
  },
  featuredGridDesktop: {
    gap: spacing.md,
  },
  featuredItem: {
    width: '100%',
  },
  featuredItemDesktop: {
    width: '100%',
  },
  reviewsList: {
    gap: spacing.md,
  },
  reviewsGridDesktop: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  reviewItem: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  reviewItemDesktop: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewLandlord: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewRating: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309', // Dark amber
  },
  reviewSnippet: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyReviews: {
    ...typography.bodySmall,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  infoBox: {
    padding: spacing.xl,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoBoxDesktop: {
    padding: 40,
  },
  infoTitle: {
    ...typography.h2,
    color: colors.primaryDark,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  infoGridMobile: {
    gap: spacing.md,
  },
  infoGridDesktop: {
    flexDirection: 'row',
    gap: spacing.xl,
    flexWrap: 'wrap',
  },
  infoItem: {
    flex: 1,
    minWidth: 280,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: spacing.md,
  },
  infoIconBox: {
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.primaryDark,
    lineHeight: 22,
    opacity: 0.85,
  },
});
