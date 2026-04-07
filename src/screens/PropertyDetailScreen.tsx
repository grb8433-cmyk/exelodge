import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, useWindowDimensions, Platform, Linking, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii, typography, shadows } from '../utils/theme';

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233';

interface PropertyDetailScreenProps {
  propertyId: string;
  onBack: () => void;
  onSeeReviews: (landlordId: string) => void;
}

export default function PropertyDetailScreen({ propertyId, onBack, onSeeReviews }: PropertyDetailScreenProps) {
  const [property, setProperty] = useState<any>(null);
  const [landlord, setLandlord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.center}>
        <Text>Property not found.</Text>
      </View>
    );
  }

  const rawImg = property.image_url;
  const isSvg = rawImg && typeof rawImg === 'string' && rawImg.toLowerCase().includes('.svg');
  const validImg = rawImg && typeof rawImg === 'string' && rawImg.length > 5 && !rawImg.includes('None') && !isSvg;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <Image 
          source={{ uri: (validImg && !imageError) ? rawImg : DEFAULT_FALLBACK_IMAGE }} 
          style={styles.heroImage}
          onError={() => setImageError(true)}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={{ fontSize: 24, color: colors.white }}>←</Text>
        </TouchableOpacity>
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceText}>{property.landlord_id || 'Original Listing'}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.mainHeader, !isDesktop && styles.mainHeaderMobile]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.address, !isDesktop && { fontSize: 24 }]}>{property.address || 'Exeter Property'}</Text>
            <View style={styles.areaRow}>
              <Text style={{ fontSize: 16 }}>📍</Text>
              <Text style={styles.area}>{property.area || 'Exeter'}</Text>
            </View>
          </View>
          <View style={[styles.priceContainer, !isDesktop && styles.priceContainerMobile]}>
            <Text style={styles.price}>£{property.price_pppw}</Text>
            <Text style={styles.pppw}>per week</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 22 }}>🛏️</Text>
            </View>
            <Text style={styles.statVal}>{property.beds || 1}</Text>
            <Text style={styles.statLab}>Bedrooms</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 22 }}>🚿</Text>
            </View>
            <Text style={styles.statVal}>{property.baths || 1}</Text>
            <Text style={styles.statLab}>Bathrooms</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 22 }}>⚡</Text>
            </View>
            <Text style={styles.statVal}>{property.bills_included ? 'Included' : 'Not Inc.'}</Text>
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
          <TouchableOpacity 
            style={styles.listingBtn} 
            onPress={() => { if (property?.external_url) window.open(property.external_url, '_blank'); }}
          >
            <Text style={styles.listingBtnText}>View Full Listing on Portal</Text>
            <Text style={{ fontSize: 20, color: colors.white, marginLeft: 8 }}>↗️</Text>
          </TouchableOpacity>
        </View>

        {landlord && (
          <View style={styles.landlordCard}>
            <View style={[styles.landlordHeader, !isDesktop && styles.landlordHeaderMobile]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.landlordLabel}>MANAGED BY</Text>
                <Text style={styles.landlordName}>{landlord.name}</Text>
              </View>
              <View style={[styles.verifiedBadge, !isDesktop && styles.verifiedBadgeMobile]}>
                <Text style={{ fontSize: 16 }}>✅</Text>
                <Text style={styles.verifiedText}>Verified Partner</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.reviewLink} onPress={() => onSeeReviews(landlord.id)}>
              <Text style={styles.reviewLinkText}>See Student Reviews</Text>
              <Text style={{ fontSize: 18, color: colors.primary }}>→</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { width: '100%', height: 450, position: 'relative' },
  heroImage: { width: '100%', height: '100%', backgroundColor: colors.background },
  backBtn: { 
    position: 'absolute', 
    top: 40, 
    left: 24, 
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    padding: 12, 
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceBadge: { 
    position: 'absolute', 
    bottom: 24, 
    right: 24, 
    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: radii.sm 
  },
  sourceText: { ...typography.caption, fontWeight: '700', color: colors.textPrimary },
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
  mainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl },
  mainHeaderMobile: { flexDirection: 'column', gap: spacing.md },
  address: { ...typography.h1, color: colors.textPrimary },
  areaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  area: { ...typography.body, color: colors.textSecondary, marginLeft: 6 },
  priceContainer: { alignItems: 'flex-end', backgroundColor: colors.primaryLight, padding: spacing.md, borderRadius: radii.md },
  priceContainerMobile: { alignItems: 'flex-start', alignSelf: 'flex-start' },
  price: { ...typography.h2, color: colors.primary },
  pppw: { ...typography.caption, color: colors.primary, fontWeight: '700', textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', marginBottom: spacing.xxl, backgroundColor: colors.background, borderRadius: radii.lg, padding: spacing.md },
  statBox: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
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
  statVal: { ...typography.h4, color: colors.textPrimary },
  statLab: { ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase', marginTop: 4, letterSpacing: 1, textAlign: 'center' },
  section: { marginBottom: spacing.xxl },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  description: { ...typography.body, color: colors.textSecondary, lineHeight: 28, marginBottom: spacing.xl },
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
  listingBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  landlordCard: { 
    backgroundColor: colors.primaryLight, 
    borderRadius: radii.lg, 
    padding: spacing.xl, 
    borderWidth: 1, 
    borderColor: colors.primaryMedium 
  },
  landlordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  landlordHeaderMobile: { flexDirection: 'column', gap: spacing.md },
  landlordLabel: { ...typography.label, color: colors.primary },
  landlordName: { ...typography.h3, marginTop: 4 },
  verifiedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.white, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: radii.full,
    ...shadows.soft,
  },
  verifiedBadgeMobile: { alignSelf: 'flex-start' },
  verifiedText: { ...typography.caption, fontWeight: '700', color: colors.primary, marginLeft: 6 },
  reviewLink: { flexDirection: 'row', alignItems: 'center' },
  reviewLinkText: { ...typography.body, fontWeight: '700', color: colors.primary, marginRight: 8 }
});
