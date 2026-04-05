import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import StarRating from '../../components/StarRating';
import ReviewCard from '../../components/ReviewCard';
import Badge from '../../components/Badge';
import {
  getLandlordById,
  getReviewsByLandlord,
  computeRatingBreakdown,
  getPropertiesByLandlord,
} from '../../utils/storage';
import { colors, radii, shadows, spacing, typography } from '../../utils/theme';

const RATING_LABELS = {
  maintenance: 'Maintenance & Repairs',
  deposit: 'Deposit Return',
  condition: 'Property Condition',
  communication: 'Communication',
  wouldRentAgain: 'Would Rent Again',
};

export default function LandlordProfileScreen({ navigation, route }) {
  const { landlordId } = route.params;
  const [landlord, setLandlord] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, revs, props] = await Promise.all([
        getLandlordById(landlordId),
        getReviewsByLandlord(landlordId),
        getPropertiesByLandlord(landlordId),
      ]);
      setLandlord(l);
      setReviews(revs);
      setBreakdown(computeRatingBreakdown(revs));
      setProperties(props);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [landlordId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openLink = (type, value) => {
    const urls = {
      phone: `tel:${value.replace(/\s/g, '')}`,
      email: `mailto:${value}`,
      web: value.startsWith('http') ? value : `https://${value}`,
      instagram: `https://instagram.com/${value.replace('@', '')}`,
    };
    Linking.openURL(urls[type]).catch(() =>
      Alert.alert('Cannot open link', 'Please try manually.')
    );
  };

  const avgOverall = useMemo(() => 
    (breakdown && breakdown.overallRating) ? breakdown.overallRating : null, 
  [breakdown]);

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!landlord) {
    return (
      <View style={styles.centre}>
        <Text style={typography.body}>Landlord not found.</Text>
      </View>
    );
  }

  const Header = () => (
    <View style={styles.headerContainer}>
      {/* Hero */}
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="business-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.heroName}>{landlord.name}</Text>
        <Badge label={landlord.type} variant="gray" style={styles.typeBadge} />

        {avgOverall != null ? (
          <View style={styles.overallRow}>
            <Text style={styles.overallScore}>{avgOverall.toFixed(1)}</Text>
            <StarRating rating={avgOverall} size={22} />
          </View>
        ) : (
          <Text style={styles.noReviews}>No reviews yet — be the first!</Text>
        )}

        <Text style={styles.reviewCount}>
          {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
        </Text>
      </View>

      {/* Contact info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contact</Text>
        {landlord.phone && (
          <ContactRow icon="call-outline" label={landlord.phone} accessibilityLabel={`Call ${landlord.name}`} onPress={() => openLink('phone', landlord.phone)} />
        )}
        {landlord.email && (
          <ContactRow icon="mail-outline" label={landlord.email} accessibilityLabel={`Email ${landlord.name}`} onPress={() => openLink('email', landlord.email)} />
        )}
        {landlord.website && (
          <ContactRow icon="globe-outline" label={landlord.website} accessibilityLabel={`Visit website of ${landlord.name}`} onPress={() => openLink('web', landlord.website)} />
        )}
        {landlord.instagram && (
          <ContactRow icon="logo-instagram" label={landlord.instagram} accessibilityLabel={`View Instagram of ${landlord.name}`} onPress={() => openLink('instagram', landlord.instagram)} />
        )}
      </View>

      {/* Rating breakdown */}
      {breakdown && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rating Breakdown</Text>
          {Object.entries(RATING_LABELS).map(([key, label]) => (
            <View key={key} style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>{label}</Text>
              <View style={styles.ratingRight}>
                <StarRating rating={breakdown[key]} size={14} />
                <Text style={styles.ratingScore}>{(breakdown[key] || 0).toFixed(1)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Associated properties */}
      {properties.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Properties ({properties.length})</Text>
          {properties.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.propertyRow}
              accessibilityRole="button"
              accessibilityLabel={`View details for ${p.address}`}
              onPress={() =>
                navigation.navigate('HousesTab', {
                  screen: 'HouseDetail',
                  params: { propertyId: p.id },
                })
              }
            >
              <View style={styles.propertyInfo}>
                <Text style={styles.propertyAddress}>{p.address}</Text>
                <Text style={styles.propertyMeta}>{p.beds} bed · £{p.pricePppw}pppw · {p.area}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.reviewsHeader}>
        <Text style={styles.sectionTitle}>Student Reviews</Text>
        <TouchableOpacity
          style={styles.writeReviewBtn}
          accessibilityRole="button"
          accessibilityLabel="Write a review for this landlord"
          onPress={() => navigation.navigate('SubmitReview', { landlordId })}
        >
          <Ionicons name="pencil-outline" size={14} color={colors.white} />
          <Text style={styles.writeReviewBtnText}>Write a Review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <FlatList
      data={reviews}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ReviewCard review={item} />}
      ListHeaderComponent={Header}
      contentContainerStyle={styles.content}
      style={styles.container}
      ListEmptyComponent={
        <View style={styles.emptyReviews}>
          <Ionicons name="chatbubble-outline" size={36} color={colors.border} />
          <Text style={styles.emptyText}>No reviews yet</Text>
          <Text style={styles.emptySubtext}>Be the first Exeter student to review this landlord.</Text>
        </View>
      }
      ListFooterComponent={<View style={{ height: 32 }} />}
    />
  );
}

function ContactRow({ icon, label, onPress, accessibilityLabel }) {
  return (
    <TouchableOpacity 
      style={contactStyles.row} 
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={contactStyles.label} numberOfLines={1}>{label}</Text>
      <Ionicons name="open-outline" size={14} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const contactStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  headerContainer: {
    marginBottom: spacing.sm,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroName: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    marginBottom: spacing.sm,
  },
  overallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  overallScore: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primary,
  },
  noReviews: {
    ...typography.bodySmall,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  reviewCount: {
    ...typography.bodySmall,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ratingLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  ratingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingScore: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    width: 28,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  propertyMeta: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.sm,
  },
  writeReviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    ...typography.h4,
    color: colors.textSecondary,
  },
  emptySubtext: {
    ...typography.bodySmall,
    textAlign: 'center',
    maxWidth: 240,
  },
});
