import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, shadows } from '../utils/theme';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233';

export default function PropertyDetailScreen({ propertyId, onBack, onSeeReviews }: { propertyId: string, onBack: () => void, onSeeReviews: (landlordId: string) => void }) {
  const [property, setProperty] = useState<any>(null);
  const [landlord, setLandlord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const { width } = useWindowDimensions();
  const desktopMode = width >= 768;

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  const fetchData = async () => {
    try {
      const { data: prop, error: pErr } = await supabase.from('properties').select('*').eq('id', propertyId).single();
      if (pErr) throw pErr;
      setProperty(prop);

      if (prop.landlord_id) {
        const { data: land, error: lErr } = await supabase.from('landlords').select('*').eq('id', prop.landlord_id).single();
        if (!lErr) setLandlord(land);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenListing = () => {
    if (property?.external_url) {
      if (Platform.OS === 'web') window.open(property.external_url, '_blank');
      else Linking.openURL(property.external_url);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!property) return <View style={styles.center}><Text>Property not found.</Text></View>;

  const imageUrl = property.image_url;
  const isSvg = imageUrl && typeof imageUrl === 'string' && imageUrl.toLowerCase().includes('.svg');
  const hasValidUrl = imageUrl && typeof imageUrl === 'string' && imageUrl.length > 5 && !imageUrl.includes('None') && !isSvg;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <Image 
          source={{ uri: (hasValidUrl && !imgError) ? imageUrl : FALLBACK_IMG }} 
          style={styles.heroImage} 
          onError={() => setImgError(true)}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceText}>{property.source || 'Original Listing'}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.mainHeader, !desktopMode && styles.mainHeaderMobile]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.address, !desktopMode && { fontSize: 24 }]}>{property.address || 'Exeter Property'}</Text>
            <View style={styles.areaRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.area}>{property.area || 'Exeter'}</Text>
            </View>
          </View>
          <View style={[styles.priceContainer, !desktopMode && styles.priceContainerMobile]}>
            <Text style={styles.price}>£{property.price_pppw}</Text>
            <Text style={styles.pppw}>per week</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={styles.iconCircle}>
              <Ionicons name="bed-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.statVal}>{property.beds || 1}</Text>
            <Text style={styles.statLab}>Bedrooms</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.iconCircle}>
              <Ionicons name="water-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.statVal}>{property.baths || 1}</Text>
            <Text style={styles.statLab}>Bathrooms</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.iconCircle}>
              <Ionicons name="flash-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.statVal}>Included</Text>
            <Text style={styles.statLab}>Wifi/Bills</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this Listing</Text>
          <Text style={styles.description}>
            This premium {property.beds}-bedroom property is located in the sought-after {property.area} area of Exeter. 
            Perfectly suited for students, it features {property.baths} {property.baths === 1 ? 'bathroom' : 'bathrooms'} and all necessary modern amenities.
            Explore the full details and booking information directly on the provider's website.
          </Text>
          
          <TouchableOpacity style={styles.listingBtn} onPress={handleOpenListing}>
            <Text style={styles.listingBtnText}>View Full Listing on Portal</Text>
            <Ionicons name="open-outline" size={20} color={colors.white} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>

        {landlord && (
          <View style={styles.landlordCard}>
            <View style={[styles.landlordHeader, !desktopMode && styles.landlordHeaderMobile]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.landlordLabel}>MANAGED BY</Text>
                <Text style={styles.landlordName}>{landlord.name}</Text>
              </View>
              <View style={[styles.verifiedBadge, !desktopMode && styles.verifiedBadgeMobile]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={styles.verifiedText}>Verified Partner</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.reviewLink} 
              onPress={() => onSeeReviews(landlord.id)}
            >
              <Text style={styles.reviewLinkText}>See Student Reviews</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.white 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  hero: { 
    width: '100%', 
    height: 450, 
    position: 'relative' 
  },
  heroImage: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: colors.background 
  },
  backBtn: { 
    position: 'absolute', 
    top: 40, 
    left: 24, 
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    padding: 12, 
    borderRadius: radii.full,
    backdropFilter: 'blur(8px)',
  },
  sourceBadge: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  sourceText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: { 
    padding: spacing.xl, 
    maxWidth: 900, 
    alignSelf: 'center', 
    width: '100%',
    backgroundColor: colors.white,
    marginTop: -32,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  mainHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.xl 
  },
  mainHeaderMobile: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  address: { 
    ...typography.h1,
    color: colors.textPrimary,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  area: { 
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  priceContainer: { 
    alignItems: 'flex-end',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  priceContainerMobile: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
  },
  price: { 
    ...typography.h2,
    color: colors.primary,
  },
  pppw: { 
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statsRow: { 
    flexDirection: 'row', 
    marginBottom: spacing.xxl, 
    backgroundColor: colors.background, 
    borderRadius: radii.lg, 
    padding: spacing.md, // Reduced from lg to fit text
  },
  statBox: { 
    flex: 1, 
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...shadows.soft,
  },
  statVal: { 
    ...typography.h4,
    color: colors.textPrimary,
  },
  statLab: { 
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase', 
    marginTop: 4,
    letterSpacing: 1,
    textAlign: 'center',
  },
  section: { 
    marginBottom: spacing.xxl 
  },
  sectionTitle: { 
    ...typography.h3,
    marginBottom: spacing.md,
  },
  description: { 
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 28, 
    marginBottom: spacing.xl 
  },
  listingBtn: { 
    backgroundColor: colors.textPrimary, 
    paddingVertical: 18, 
    paddingHorizontal: 28, 
    borderRadius: radii.md, 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'flex-start',
    ...shadows.medium,
  },
  listingBtnText: { 
    color: colors.white, 
    fontWeight: '700', 
    fontSize: 16 
  },
  landlordCard: { 
    backgroundColor: colors.primaryLight, 
    borderRadius: radii.lg, 
    padding: spacing.xl, 
    borderWidth: 1, 
    borderColor: colors.primaryMedium 
  },
  landlordHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 24 
  },
  landlordHeaderMobile: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  landlordLabel: { 
    ...typography.label,
    color: colors.primary, 
  },
  landlordName: { 
    ...typography.h3,
    marginTop: 4, 
  },
  verifiedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.white, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: radii.full,
    ...shadows.soft,
  },
  verifiedBadgeMobile: {
    alignSelf: 'flex-start',
  },
  verifiedText: { 
    ...typography.caption,
    fontWeight: '700', 
    color: colors.primary, 
    marginLeft: 6 
  },
  reviewLink: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  reviewLinkText: { 
    ...typography.body,
    fontWeight: '700', 
    color: colors.primary, 
    marginRight: 8 
  }
});
