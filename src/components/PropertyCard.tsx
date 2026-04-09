import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from './Icon';
import { colors, spacing, radii, shadows, fontFamily } from '../utils/theme';

interface PropertyCardProps {
  item: any;
  onPress: () => void;
  marketAverage: number;
}

export default function PropertyCard({ item, onPress, marketAverage }: PropertyCardProps) {
  const price = parseFloat(item.price_pppw);
  const isVeryGoodValue = price > 0 && price <= marketAverage * 0.9;
  const isGoodValue     = price > 0 && price <= marketAverage && !isVeryGoodValue;

  const fallbackImage = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&q=80';
  const imageUrl = item.image_url && item.image_url !== 'None' ? item.image_url : fallbackImage;

  const priceDiff = marketAverage > 0 ? Math.round(((price - marketAverage) / marketAverage) * 100) : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      {/* Image */}
      <View style={styles.imageWrap}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        <View style={styles.imageGradient} />

        {/* Area badge */}
        <View style={styles.areaBadge}>
          <Text style={styles.areaText}>{item.area || 'Exeter'}</Text>
        </View>

        {/* Value badge */}
        {isVeryGoodValue && (
          <View style={[styles.valueBadge, styles.valueBadgeGold]}>
            <Icon name="award" size={10} color={colors.accentDark} />
            <Text style={[styles.valueBadgeText, { color: colors.accentDark }]}>BEST VALUE</Text>
          </View>
        )}
        {isGoodValue && (
          <View style={[styles.valueBadge, styles.valueBadgeGreen]}>
            <Icon name="trending-down" size={10} color={colors.white} />
            <Text style={[styles.valueBadgeText, { color: colors.white }]}>GREAT VALUE</Text>
          </View>
        )}

        {/* Bills badge */}
        {item.bills_included && (
          <View style={styles.billsBadge}>
            <Icon name="zap" size={9} color={colors.accent} />
            <Text style={styles.billsText}>Bills Inc.</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.address} numberOfLines={1}>{item.address}</Text>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Icon name="home" size={12} color={colors.textMuted} />
            <Text style={styles.detailText}>{item.beds} bed</Text>
          </View>
          <View style={styles.detailDot} />
          <View style={styles.detailItem}>
            <Icon name="droplet" size={12} color={colors.textMuted} />
            <Text style={styles.detailText}>{item.baths} bath</Text>
          </View>
          {item.area && (
            <>
              <View style={styles.detailDot} />
              <View style={styles.detailItem}>
                <Icon name="map-pin" size={12} color={colors.textMuted} />
                <Text style={styles.detailText} numberOfLines={1}>{item.area}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.priceLabel}>PER PERSON / WEEK</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>£{item.price_pppw}</Text>
              {priceDiff !== 0 && (
                <View style={[styles.diffBadge, priceDiff < 0 ? styles.diffBadgeGood : styles.diffBadgeBad]}>
                  <Text style={[styles.diffText, priceDiff < 0 ? styles.diffTextGood : styles.diffTextBad]}>
                    {priceDiff > 0 ? '+' : ''}{priceDiff}%
                  </Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.viewBtn} onPress={onPress}>
            <Text style={styles.viewBtnText}>View</Text>
            <Icon name="arrow-right" size={13} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: radii.lg,
    margin: spacing.sm,
    overflow: 'hidden',
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageWrap: {
    height: 196,
    position: 'relative',
    backgroundColor: colors.surfaceSubtle,
  },
  image: { width: '100%', height: '100%' },
  imageGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 60,
    backgroundColor: 'rgba(28,25,23,0.35)',
  },
  areaBadge: {
    position: 'absolute',
    top: 12, left: 12,
    backgroundColor: 'rgba(28,25,23,0.72)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  areaText: {
    fontFamily,
    color: colors.white,
    fontSize: 10,
    fontWeight: '700' as any,
    textTransform: 'uppercase' as any,
    letterSpacing: 0.5,
  },
  valueBadge: {
    position: 'absolute',
    top: 12, right: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueBadgeGold: {
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  valueBadgeGreen: { backgroundColor: colors.primary },
  valueBadgeText: {
    fontFamily,
    fontSize: 9,
    fontWeight: '800' as any,
    letterSpacing: 0.5,
  },
  billsBadge: {
    position: 'absolute',
    bottom: 10, left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(28,25,23,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  billsText: {
    fontFamily,
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700' as any,
  },
  content: { padding: spacing.md, paddingBottom: 14 },
  address: {
    fontFamily,
    fontSize: 15,
    fontWeight: '700' as any,
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.borderDark },
  detailText: {
    fontFamily,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500' as any,
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
    fontFamily,
    fontSize: 9,
    fontWeight: '700' as any,
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as any,
    marginBottom: 2,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: {
    fontFamily,
    fontSize: 22,
    fontWeight: '800' as any,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.xs },
  diffBadgeGood: { backgroundColor: colors.primaryLight },
  diffBadgeBad: { backgroundColor: '#FEF2F2' },
  diffText: { fontFamily, fontSize: 10, fontWeight: '700' as any },
  diffTextGood: { color: colors.success },
  diffTextBad: { color: colors.error },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.sm,
  },
  viewBtnText: { fontFamily, color: colors.white, fontWeight: '700' as any, fontSize: 13 },
});
