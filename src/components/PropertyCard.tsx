import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from './Icon';
import { colors, spacing, radii, shadows, fontFamily, getUniversityColors, typography } from '../utils/theme';
import { trackEvent } from '../utils/analytics';

const SOURCE_COLORS: Record<string, string> = {
  UniHomes: '#10B981',
  StuRents: '#3B82F6',
  AccommodationForStudents: '#F59E0B',
  Rightmove: '#2C3E50',
};

const timeAgo = (dateStr: string) => {
  if (!dateStr) return 'Recently';
  try {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
  } catch (e) {
    return 'Recently';
  }
};

export default function PropertyCard({
  item,
  universityId,
  isDarkMode = false,
  onPress,
  marketAverage,
  isFavorite = false,
  onToggleFavorite,
  landlordRating,
}: {
  item: any;
  universityId: string;
  isDarkMode?: boolean;
  onPress: () => void;
  marketAverage: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  landlordRating?: { avg: number; count: number };
}) {
  const price = parseFloat(item.price_pppw);
  const theme = getUniversityColors(universityId, isDarkMode);

  const fallbackImage = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&q=80';
  const imageUrl = item.image_url && item.image_url !== 'None' ? item.image_url : fallbackImage;

  const isCheaper = price > 0 && price < marketAverage;
  const isMoreExpensive = price > marketAverage;

  const updatedText = timeAgo(item.last_scraped);

  const handlePress = () => {
    trackEvent('click_property', { propertyId: item.id, universityId });
    onPress();
  };

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={handlePress} activeOpacity={0.95}>
      <View style={[styles.imageContainer, { backgroundColor: theme.surfaceSubtle }]}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        
        {/* Budget Badge */}
        {item.price_pppw <= 80 && (
          <View style={styles.budgetBadge}>
            <Text style={styles.budgetBadgeText}>BUDGET</Text>
          </View>
        )}

        {/* Heart Button */}
        <TouchableOpacity style={styles.heartBtn} onPress={onToggleFavorite} activeOpacity={0.7}>
          <Icon 
            name="heart" 
            size={18} 
            color={isFavorite ? '#ef4444' : '#ffffff'} 
            fill={isFavorite ? '#ef4444' : 'transparent'} 
          />
        </TouchableOpacity>

        {/* Price Badge */}
        <View style={[styles.priceBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.priceText}>£{Math.round(price)}<Text style={styles.priceUnit}> pppw</Text></Text>
        </View>

        {/* Bills Badge */}
        {item.bills_included && (
          <View style={[styles.billsBadge, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }]}>
            <Text style={[styles.billsBadgeText, { color: theme.primary }]}>BILLS INC.</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.address, { color: theme.textPrimary }]} numberOfLines={1}>{item.address}</Text>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="map-pin" size={12} color={theme.textMuted} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.area}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="users" size={12} color={theme.textMuted} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.bedrooms} bed</Text>
          </View>
        </View>

        {landlordRating && landlordRating.count > 0 && (
          <View style={styles.ratingRow}>
            <Icon name="star" size={11} color="#F59E0B" fill="#F59E0B" />
            <Text style={[styles.ratingText, { color: theme.textPrimary }]}>{landlordRating.avg.toFixed(1)}</Text>
            <Text style={[styles.ratingCount, { color: theme.textMuted }]}>· {landlordRating.count} review{landlordRating.count !== 1 ? 's' : ''}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.valueRow}>
            {isCheaper ? (
              <View style={styles.valueIndicator}>
                <Icon name="trending-down" size={14} color={theme.success} />
                <Text style={[styles.valueText, { color: theme.success }]}>Below average</Text>
              </View>
            ) : isMoreExpensive ? (
              <View style={styles.valueIndicator}>
                <Icon name="trending-up" size={14} color={theme.warning} />
                <Text style={[styles.valueText, { color: theme.warning }]}>Above average</Text>
              </View>
            ) : (
              <Text style={[styles.valueTextMuted, { color: theme.textMuted }]}>Market average</Text>
            )}
          </View>
          
          <View style={styles.updatedRow}>
            <Icon name="clock" size={10} color={theme.textMuted} />
            <Text style={[styles.updatedText, { color: theme.textMuted }]}>{updatedText}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg, // 16px
    overflow: 'hidden',
    ...shadows.card,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    marginHorizontal: 10,
  },
  imageContainer: {
    height: 192,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.surfaceSubtle,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  priceBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...shadows.soft,
  },
  priceText: {
    fontFamily,
    fontSize: 18,
    fontWeight: '700' as any,
    color: colors.white,
  },
  priceUnit: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400' as any,
  },
  billsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    // backdropBlur: 4 (handled via rgba bg in simple RN, or blur component if needed)
  },
  billsBadgeText: {
    fontFamily,
    fontSize: 10,
    fontWeight: '700' as any,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  address: {
    ...typography.h3Card,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...typography.bodySmall, // Map to bodySubtle if needed
    color: colors.textSecondary,
    fontWeight: '500' as any,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  valueRow: {
    flex: 1,
  },
  valueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    fontFamily,
    fontSize: 12,
    fontWeight: '600' as any,
  },
  valueTextMuted: {
    fontFamily,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500' as any,
  },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  updatedText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontFamily,
    fontSize: 12,
    fontWeight: '700' as any,
  },
  ratingCount: {
    fontFamily,
    fontSize: 11,
  },
  budgetBadge: { 
    position: 'absolute', 
    top: 12, 
    left: 12, 
    backgroundColor: '#10B981', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6, 
    zIndex: 10 
  },
  budgetBadgeText: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#ffffff' 
  },
  heartBtn: { 
    position: 'absolute', 
    top: 12, 
    right: 12, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    borderRadius: 20, 
    padding: 6, 
    zIndex: 10 
  },
});
