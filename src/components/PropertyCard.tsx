import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from './Icon';
import { colors, spacing, radii, shadows, fontFamily, getUniversityColors, typography } from '../utils/theme';

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

export default function PropertyCard({ item, universityId, onPress, marketAverage }: {
  item: any;
  universityId: string;
  onPress: () => void;
  marketAverage: number;
}) {
  const price = parseFloat(item.price_pppw);
  const theme = getUniversityColors(universityId);

  const fallbackImage = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&q=80';
  const imageUrl = item.image_url && item.image_url !== 'None' ? item.image_url : fallbackImage;

  const isCheaper = price > 0 && price < marketAverage;
  const isMoreExpensive = price > marketAverage;

  const updatedText = timeAgo(item.last_scraped);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        
        {/* Price Badge */}
        <View style={[styles.priceBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.priceText}>£{Math.round(price)}<Text style={styles.priceUnit}> pppw</Text></Text>
        </View>

        {/* Bills Badge */}
        {item.bills_included && (
          <View style={styles.billsBadge}>
            <Text style={[styles.billsBadgeText, { color: theme.primary }]}>BILLS INC.</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="map-pin" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.area}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="users" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.bedrooms} bed</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.valueRow}>
            {isCheaper ? (
              <View style={styles.valueIndicator}>
                <Icon name="trending-down" size={14} color="#059669" />
                <Text style={[styles.valueText, { color: '#059669' }]}>Below average</Text>
              </View>
            ) : isMoreExpensive ? (
              <View style={styles.valueIndicator}>
                <Icon name="trending-up" size={14} color="#D97706" />
                <Text style={[styles.valueText, { color: '#D97706' }]}>Above average</Text>
              </View>
            ) : (
              <Text style={styles.valueTextMuted}>Market average</Text>
            )}
          </View>
          
          <View style={styles.updatedRow}>
            <Icon name="clock" size={10} color={colors.textMuted} />
            <Text style={styles.updatedText}>{updatedText}</Text>
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
});
