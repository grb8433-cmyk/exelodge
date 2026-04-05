import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Badge from './Badge';
import { colors, radii, shadows, spacing, typography } from '../utils/theme';
import { EXETER_AVG_PPPW } from '../data/seeds';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'; // High-quality Exeter-style house

export default function PropertyCard({ property, landlordName, onPress, onLandlordPress }) {
  const isGoodValue = property.pricePppw < EXETER_AVG_PPPW;
  const diff = Math.abs(property.pricePppw - EXETER_AVG_PPPW);

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

  const handleExternalLink = () => {
    const url = property.externalUrl || property.directUrl;
    if (url) {
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open listing.'));
    } else {
      Alert.alert('Not available', 'Original listing link not found.');
    }
  };

  const accessibilityLabel = `${property.address}, ${property.beds} bedrooms, ${formattedPrice} per week. ${isGoodValue ? 'Good value.' : ''}`;

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress} 
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="View full property details"
    >
      {/* Property Thumbnail */}
      <Image 
        source={{ uri: property.imageUrl || PLACEHOLDER_IMAGE }} 
        style={styles.thumbnail}
        resizeMode="cover"
      />

      {/* Price + Value badge row */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.price}>{formattedPrice}</Text>
          <Text style={styles.priceLabel}>per person per week</Text>
        </View>
        <Badge
          label={isGoodValue ? `Good Value  ↓${formattedDiff}` : `Above Avg  ↑${formattedDiff}`}
          variant={isGoodValue ? 'green' : 'red'}
        />
      </View>

      {/* Address */}
      <Text style={styles.address} numberOfLines={1}>
        {property.address}, {property.postcode}
      </Text>
      <Badge label={property.area} variant="gray" style={styles.areaBadge} />

      {/* Beds / Baths */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="bed-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.statText}>{property.beds} bed</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="water-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.statText}>{property.baths} bath</Text>
        </View>
        {property.billsIncluded && (
          <View style={styles.stat}>
            <Ionicons name="flash-outline" size={15} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.primary }]}>Bills incl.</Text>
          </View>
        )}
      </View>

      {/* View Listing Button */}
      <TouchableOpacity style={styles.listingBtn} onPress={handleExternalLink}>
        <Text style={styles.listingBtnText}>View Listing</Text>
        <Ionicons name="open-outline" size={14} color={colors.primary} />
      </TouchableOpacity>

      {/* Campus distances */}
      <View style={styles.distanceRow}>
        <View style={styles.distanceChip}>
          <Ionicons name="walk-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.distanceText}>Streatham {property.streathamMins}min</Text>
        </View>
        <View style={styles.distanceChip}>
          <Ionicons name="walk-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.distanceText}>St Luke's {property.stLukesMins}min</Text>
        </View>
      </View>

      {/* Landlord */}
      {landlordName && (
        <TouchableOpacity 
          onPress={onLandlordPress} 
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`View reviews for ${landlordName}`}
        >
          <Text style={styles.landlordLink}>
            <Ionicons name="person-circle-outline" size={13} color={colors.primary} />
            {'  '}
            <Text style={styles.landlordName}>{landlordName}</Text>
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    marginBottom: spacing.md,
    width: 'calc(100% + 32px)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  price: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 30,
  },
  priceLabel: {
    ...typography.caption,
    marginTop: 1,
  },
  address: {
    ...typography.h4,
    marginBottom: 6,
  },
  areaBadge: {
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  listingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 8,
    marginBottom: 14,
  },
  listingBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  distanceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  distanceText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  landlordLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  landlordName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
