import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from './Icon';
import { colors, spacing, radii, shadows, fontFamily, getUniversityColors } from '../utils/theme';

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

  const isVeryGoodValue = price > 0 && price <= marketAverage * 0.9;
  const isGoodValue     = price > 0 && price <= marketAverage && !isVeryGoodValue;

  const fallbackImage = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&q=80';
  const imageUrl = item.image_url && item.image_url !== 'None' ? item.image_url : fallbackImage;

  const priceDiff = marketAverage > 0 ? Math.round(((price - marketAverage) / marketAverage) * 100) : 0;

  let distance = null;
  let nearestCampus = '';

  if (universityId === 'exeter') {
    distance = (item.distance_streatham !== null && item.distance_st_lukes !== null)
      ? Math.min(item.distance_streatham, item.distance_st_lukes)
      : (item.distance_streatham ?? item.distance_st_lukes);
    nearestCampus = distance === item.distance_streatham ? 'Streatham' : 'St Lukes';
  } else {
    distance = (item.distance_uob !== null && item.distance_uwe !== null)
      ? Math.min(item.distance_uob, item.distance_uwe)
      : (item.distance_uob ?? item.distance_uwe);
    nearestCampus = distance === item.distance_uob ? 'UoB' : 'UWE';
  }

  const updatedText = timeAgo(item.last_scraped);
  const sourceColor = SOURCE_COLORS[item.landlord_id] || theme.primary;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        
        {/* Value Badges */}
        <View style={styles.badgeContainer}>
          {isVeryGoodValue && (
            <View style={[styles.valueBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.valueBadgeText}>GREAT VALUE</Text>
            </View>
          )}
          {item.bills_included && (
            <View style={styles.billsBadge}>
              <Text style={styles.billsBadgeText}>BILLS INC.</Text>
            </View>
          )}
        </View>

        <View style={[styles.sourceTag, { backgroundColor: sourceColor }]}>
          <Text style={styles.sourceTagText}>{item.landlord_id}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: theme.primary }]}>£{Math.round(price)}</Text>
            <Text style={styles.pppw}>pppw</Text>
          </View>
          {priceDiff !== 0 && (
            <Text style={[styles.diff, { color: priceDiff > 0 ? colors.error : theme.primary }]}>
              {priceDiff > 0 ? '+' : ''}{priceDiff}% avg
            </Text>
          )}
        </View>

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

        <View style={styles.divider} />

        <View style={styles.footer}>
          <View style={styles.commute}>
            <Icon name="zap" size={12} color={theme.accent} />
            <Text style={styles.commuteText}>{distance ? `${Math.round(distance * 20)}m to ${nearestCampus}` : 'Commute unknown'}</Text>
          </View>
          
          <TouchableOpacity style={[styles.viewBtn, { backgroundColor: theme.primaryLight }]} onPress={onPress}>
            <Text style={[styles.viewBtnText, { color: theme.primary }]}>View</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.updatedRow}>
          <Icon name="clock" size={10} color={colors.textMuted} />
          <Text style={styles.updatedText}>{updatedText}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.card,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    marginHorizontal: 8,
  },
  imageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.surfaceSubtle,
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
  valueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  valueBadgeText: {
    fontFamily,
    fontSize: 10,
    fontWeight: '800' as any,
    color: colors.white,
    letterSpacing: 0.5,
  },
  billsBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  billsBadgeText: {
    fontFamily,
    fontSize: 10,
    fontWeight: '800' as any,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  sourceTag: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopLeftRadius: radii.md,
  },
  sourceTagText: {
    fontFamily,
    fontSize: 10,
    fontWeight: '700' as any,
    color: colors.white,
    textTransform: 'uppercase' as any,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontFamily,
    fontSize: 22,
    fontWeight: '800' as any,
  },
  pppw: {
    fontFamily,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600' as any,
  },
  diff: {
    fontFamily,
    fontSize: 11,
    fontWeight: '700' as any,
  },
  address: {
    fontFamily,
    fontSize: 15,
    fontWeight: '700' as any,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500' as any,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  commuteText: {
    fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600' as any,
  },
  viewBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  viewBtnText: {
    fontFamily,
    fontWeight: '700' as any,
    fontSize: 13,
  },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  updatedText: {
    fontFamily,
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500' as any,
  },
});
