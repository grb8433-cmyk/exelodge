import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarRating from '../../components/StarRating';
import Badge from '../../components/Badge';
import { getPropertyById, getLandlordById, getReviewsByLandlord } from '../../utils/storage';
import { colors, radii, shadows, spacing, typography } from '../../utils/theme';
import { EXETER_AVG_PPPW } from '../../data/seeds';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1555854817-5b2260d50c47?auto=format&fit=crop&w=800&q=80'; // High-quality housing placeholder

export default function HouseDetailScreen({ navigation, route }) {
  const { propertyId } = route.params;
  const [property, setProperty] = useState(null);
  const [landlord, setLandlord] = useState(null);
  const [avgRating, setAvgRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fix 'Stuck' bug: React to propertyId changes explicitly
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    (async () => {
      try {
        const prop = await getPropertyById(propertyId);
        if (!isMounted) return;
        
        setProperty(prop);
        if (prop) {
          const [l, reviews] = await Promise.all([
            getLandlordById(prop.landlordId),
            getReviewsByLandlord(prop.landlordId)
          ]);
          
          if (!isMounted) return;
          setLandlord(l);
          setReviewCount(reviews.length);
          if (reviews.length > 0) {
            const avg = reviews.reduce((s, r) => s + r.overallRating, 0) / reviews.length;
            setAvgRating(+avg.toFixed(1));
          }
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [propertyId]);

  const openMaps = () => {
    if (!property) return;
    const query = encodeURIComponent(`${property.address}, ${property.postcode}, Exeter`);
    const url = `https://maps.google.com/?q=${query}`;
    Linking.openURL(url).catch(() => Alert.alert('Cannot open maps', 'Please try manually.'));
  };

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.centre}>
        <Text style={typography.body}>Property not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isGoodValue = property.pricePppw < EXETER_AVG_PPPW;
  const diff = Math.abs(property.pricePppw - EXETER_AVG_PPPW);

  // Formatting currency safely
  const formattedPrice = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(property.pricePppw);

  const formattedDiff = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(diff);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Image with Back Button Overlay */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: property.imageUrl || PLACEHOLDER_IMAGE }} 
          style={styles.heroImage}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.overlayBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Price hero */}
      <View style={styles.priceCard}>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>{formattedPrice}</Text>
            <Text style={styles.priceLabel}>per person per week</Text>
          </View>
          <Badge
            label={isGoodValue ? `Good Value  ↓${formattedDiff}` : `Above Avg  ↑${formattedDiff}`}
            variant={isGoodValue ? 'green' : 'red'}
          />
        </View>
        <Text style={styles.valueContext}>
          {isGoodValue
            ? `${formattedDiff} below the Exeter student average of £${EXETER_AVG_PPPW}pppw`
            : `${formattedDiff} above the Exeter student average of £${EXETER_AVG_PPPW}pppw`}
        </Text>
      </View>

      {/* Address */}
      <View style={styles.section}>
        <Text style={styles.address}>{property.address}</Text>
        <Text style={styles.postcode}>{property.postcode}</Text>
        <Badge label={property.area} variant="gray" style={styles.areaBadge} />
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <StatItem icon="bed-outline" label={`${property.beds} Bedrooms`} />
        <StatItem icon="water-outline" label={`${property.baths} Bathrooms`} />
        <StatItem
          icon="flash-outline"
          label={property.billsIncluded ? 'Bills Included' : 'Bills Extra'}
          color={property.billsIncluded ? colors.primary : colors.textSecondary}
        />
      </View>

      {/* Campus distances */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Campus Distances</Text>
        <View style={styles.distanceRow}>
          <View style={styles.distanceItem}>
            <Ionicons name="school-outline" size={20} color={colors.primary} />
            <Text style={styles.campusName}>Streatham</Text>
            <Text style={styles.campusMins}>{property.streathamMins} min walk</Text>
          </View>
          <View style={styles.distanceDivider} />
          <View style={styles.distanceItem}>
            <Ionicons name="medkit-outline" size={20} color={colors.primary} />
            <Text style={styles.campusName}>St Luke's</Text>
            <Text style={styles.campusMins}>{property.stLukesMins} min walk</Text>
          </View>
        </View>
      </View>

      {/* Features */}
      {property.features && property.features.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featuresList}>
            {property.features.map((f) => (
              <View key={f} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Notes */}
      {property.notes ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <Text style={styles.notesText}>{property.notes}</Text>
        </View>
      ) : null}

      {/* Landlord card */}
      {landlord && (
        <TouchableOpacity
          style={[styles.card, styles.landlordCard]}
          onPress={() =>
            navigation.navigate('ReviewsTab', {
              screen: 'LandlordProfile',
              params: { landlordId: landlord.id },
            })
          }
          activeOpacity={0.85}
        >
          <View style={styles.landlordHeader}>
            <View style={styles.landlordIcon}>
              <Ionicons name="business-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.landlordInfo}>
              <Text style={styles.landlordName}>{landlord.name}</Text>
              <Text style={styles.landlordType}>{landlord.type}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>

          {avgRating != null && (
            <View style={styles.landlordRating}>
              <StarRating rating={avgRating} size={15} />
              <Text style={styles.landlordRatingText}>
                {avgRating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
          )}
          <Text style={styles.landlordCta}>Tap to view full profile & reviews →</Text>
        </TouchableOpacity>
      )}

      {/* Primary Action: View on Website */}
      {property.directUrl && (
        <TouchableOpacity 
          style={styles.directBtn} 
          onPress={() => Linking.openURL(property.directUrl).catch(() => Alert.alert('Error', 'Could not open website.'))}
        >
          <Ionicons name="open-outline" size={20} color={colors.white} />
          <Text style={styles.directBtnText}>View on Landlord Website</Text>
        </TouchableOpacity>
      )}

      {/* View on map */}
      <TouchableOpacity style={styles.mapBtn} onPress={openMaps}>
        <Ionicons name="map-outline" size={18} color={colors.primary} />
        <Text style={styles.mapBtnText}>View on Map</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function StatItem({ icon, label, color }) {
  return (
    <View style={statStyles.item}>
      <Ionicons name={icon} size={20} color={color || colors.textSecondary} />
      <Text style={[statStyles.label, color ? { color } : {}]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: colors.border,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  overlayBack: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    margin: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  backBtn: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
  },
  backBtnText: {
    color: colors.white,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  price: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primaryDark,
    lineHeight: 40,
  },
  priceLabel: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  valueContext: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  address: {
    ...typography.h2,
    marginBottom: 2,
  },
  postcode: {
    ...typography.label,
    marginBottom: 6,
  },
  areaBadge: {
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  distanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  campusName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  campusMins: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    ...typography.body,
    fontSize: 14,
  },
  notesText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  landlordCard: {
    borderColor: colors.primary + '50',
  },
  landlordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  landlordIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landlordInfo: {
    flex: 1,
  },
  landlordName: {
    ...typography.h4,
  },
  landlordType: {
    ...typography.bodySmall,
  },
  landlordRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  landlordRatingText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  landlordCta: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  directBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 16,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  directBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 12,
    marginHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  mapBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
