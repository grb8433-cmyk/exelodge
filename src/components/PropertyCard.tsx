import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { colors, spacing, radii, typography, shadows } from '../utils/theme';

interface PropertyCardProps {
  item: any;
  onPress: () => void;
  marketAverage: number;
}

export default function PropertyCard({ item, onPress, marketAverage }: PropertyCardProps) {
  const isGoodValue = parseFloat(item.price_pppw) <= marketAverage;
  
  // Fallback image if source is broken or 'None'
  const fallbackImage = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233';
  const imageUrl = item.image_url && item.image_url !== 'None' ? item.image_url : fallbackImage;

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.areaBadge}>
          <Text style={styles.areaText}>{item.area || 'Exeter'}</Text>
        </View>
        {isGoodValue && (
          <View style={styles.valueBadge}>
            <Text style={styles.valueEmoji}>💎</Text>
            <Text style={styles.valueText}>GREAT VALUE</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
        
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailEmoji}>🛏️</Text>
            <Text style={styles.detailText}>{item.beds} Beds</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailEmoji}>🚿</Text>
            <Text style={styles.detailText}>{item.baths} Baths</Text>
          </View>
          {item.bills_included && (
            <View style={styles.detailItem}>
              <Text style={styles.detailEmoji}>⚡</Text>
              <Text style={styles.detailText}>Bills</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.priceLabel}>PRICE PP/PW</Text>
            <Text style={styles.price}>£{item.price_pppw}</Text>
          </View>
          <TouchableOpacity style={styles.btn} onPress={onPress}>
            <Text style={styles.btnText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    margin: spacing.sm,
    overflow: 'hidden',
    ...shadows.soft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    height: 180,
    position: 'relative',
    backgroundColor: colors.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  areaBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  areaText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  valueBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueEmoji: {
    fontSize: 10,
  },
  valueText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  content: {
    padding: spacing.md,
  },
  address: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailEmoji: {
    fontSize: 14,
  },
  detailText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  priceLabel: {
    ...typography.label,
    fontSize: 9,
    marginBottom: 2,
  },
  price: {
    ...typography.h3,
    color: colors.primary,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  btnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
