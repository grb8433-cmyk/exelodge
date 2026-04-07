import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors, shadows, radii, spacing, typography } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233';

export default function PropertyCard({ item, marketAverage, onPress }: { item: any, marketAverage: number, onPress: () => void }) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (!item) return null;

  const price = parseFloat(item.price_pppw) || 0;
  const bedrooms = item.beds || 1;
  const bathrooms = item.baths || 1;

  const imageUrl = item.image_url;
  const isSvg = imageUrl && typeof imageUrl === 'string' && imageUrl.toLowerCase().includes('.svg');
  const hasValidUrl = imageUrl && 
                      typeof imageUrl === 'string' && 
                      imageUrl.length > 5 && 
                      imageUrl !== 'None' && 
                      !isSvg;

  return (
    <View 
      style={[
        styles.card, 
        isHovered && Platform.OS === 'web' && styles.cardHovered
      ]}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <TouchableOpacity activeOpacity={0.9} style={styles.imageContainer} onPress={onPress}>
        <Image
          source={{ uri: (hasValidUrl && !imgError) ? imageUrl : FALLBACK_IMG }}
          style={styles.image}
          onError={() => setImgError(true)}
          resizeMode="cover"
        />
        
        {/* Floating Badges */}
        <View style={styles.badgeContainer}>
          <View style={styles.pillBadge}>
            <Text style={styles.pillBadgeText}>{item.source || 'Listing'}</Text>
          </View>
          
          {item.bills_included && (
            <View style={styles.pillBadge}>
              <Ionicons name="flash" size={12} color={colors.textPrimary} style={{ marginRight: 4 }} />
              <Text style={styles.pillBadgeText}>Bills Included</Text>
            </View>
          )}
        </View>

        {price < (marketAverage - 10) && (
          <View style={styles.valueBadge}>
            <Text style={styles.valueBadgeText}>Best Value</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <View style={styles.infoContent}>
        <View style={styles.detailsRow}>
          <View style={styles.leftInfo}>
            <Text style={styles.address} numberOfLines={1}>{item.address || 'Exeter'}</Text>
            <Text style={styles.area}>{item.area || 'Exeter'}</Text>
            
            <View style={styles.iconRow}>
              <View style={styles.feature}>
                <Ionicons name="bed-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.featureText}>{bedrooms}</Text>
              </View>
              <View style={styles.feature}>
                <Ionicons name="water-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.featureText}>{bathrooms}</Text>
              </View>
            </View>
          </View>

          <View style={styles.rightInfo}>
            <Text style={styles.price}>£{price}<Text style={styles.pppw}>/pw</Text></Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>View Listing</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    flex: 1,
    backgroundColor: colors.cardBg, 
    borderRadius: radii.lg, 
    margin: spacing.sm,
    ...shadows.soft,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHovered: {
    ...shadows.medium,
    transform: [{ translateY: -4 }],
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#f1f5f9',
  },
  image: { 
    width: '100%', 
    height: '100%', 
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  pillBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.soft,
  },
  pillBadgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  valueBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  valueBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoContent: { 
    padding: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  leftInfo: {
    flex: 1,
    paddingRight: 8,
  },
  rightInfo: {
    alignItems: 'flex-end',
  },
  address: { 
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  area: { 
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 8,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  price: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: colors.textPrimary,
  },
  pppw: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  actionButton: { 
    backgroundColor: colors.primary, 
    paddingVertical: 12, 
    borderRadius: radii.md, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionButtonText: { 
    color: colors.white, 
    fontWeight: '700', 
    fontSize: 14,
  }
});
