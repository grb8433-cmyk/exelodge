import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, useWindowDimensions, Platform, Linking, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii, typography, shadows, getUniversityColors, isDesktop } from '../utils/theme';
import { AREA_COORDS, CAMPUS_COORDS } from '../data/seeds';
import UNIVERSITIES from '../../config/universities.json';

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233';

const formatDate = (dateStr: string) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return dateStr;
  }
  return d.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
};

const calculateStraightDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const p = 0.017453292519943295;    // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + 
            c(lat1 * p) * c(lat2 * p) * 
            (1 - c((lon2 - lon1) * p))/2;

  return 12742 * Math.asin(Math.sqrt(a)) * 0.621371; // 2 * R; R = 6371 km -> convert to miles
};

const CAMPUS_DATA = {
  exeter: [
    { id: 'streatham', label: 'Streatham', icon: '🏰' },
    { id: 'st_lukes', label: "St Luke's", icon: '🏥' }
  ],
  bristol: [
    { id: 'uob', label: 'UoB', icon: '🎓' },
    { id: 'uwe', label: 'UWE', icon: '🏢' }
  ]
};

interface PropertyDetailScreenProps {
  propertyId: string;
  universityId: string;
  onBack: () => void;
  onSeeReviews: (landlordId: string) => void;
}

export default function PropertyDetailScreen({ propertyId, universityId, onBack, onSeeReviews }: PropertyDetailScreenProps) {
  const [property, setProperty] = useState<any>(null);
  const [landlord, setLandlord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const { width } = useWindowDimensions();
  const desktop = isDesktop(width);
  const isSmallMobile = width < 400;
  
  const currentUni = UNIVERSITIES.find(u => u.id === universityId) || UNIVERSITIES[0];
  const campuses = (CAMPUS_DATA as any)[universityId] || CAMPUS_DATA.exeter;
  const theme = getUniversityColors(universityId);

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
        <ActivityIndicator color={theme.primary} />
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

  // ── Commute Logic with Area Safety Net ─────────────────────────────────────
  let dists = campuses.map((c: any) => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    dist: property[`distance_${c.id}`]
  }));
  
  let isEstimate = false;

  if (dists.every((d: any) => d.dist === null || d.dist === undefined)) {
    const universityAreas = (AREA_COORDS as any)[universityId] || {};
    const areaCenter = universityAreas[property.area];
    const universityCampuses = (CAMPUS_COORDS as any)[universityId] || {};
    
    if (areaCenter) {
      isEstimate = true;
      dists = dists.map((d: any) => {
        const campusCoord = universityCampuses[d.id];
        return {
          ...d,
          dist: campusCoord ? calculateStraightDistance(areaCenter.latitude, areaCenter.longitude, campusCoord.latitude, campusCoord.longitude) : null
        };
      });
    }
  }

  const openInMaps = () => {
    const lat = property.latitude;
    const lon = property.longitude;
    const addr = encodeURIComponent(property.address);
    const url = (lat && lon) 
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
      : `https://www.google.com/maps/search/?api=1&query=${addr}+${currentUni.city}`;
    
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  const openListing = () => {
    if (property?.external_url) {
      if (Platform.OS === 'web') window.open(property.external_url, '_blank');
      else Linking.openURL(property.external_url);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { height: desktop ? 500 : 320 }]}>
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

      <View style={[styles.content, { padding: desktop ? spacing.xl : spacing.lg }]}>
        <View style={[styles.mainHeader, !desktop && styles.mainHeaderMobile]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.address, !desktop && { fontSize: 28 }, isSmallMobile && { fontSize: 24 }]}>
              {property.address || `${currentUni.city} Property`}
            </Text>
            <TouchableOpacity style={styles.areaRow} onPress={openInMaps}>
              <Text style={{ fontSize: 16 }}>📍</Text>
              <Text style={styles.area}>{property.area || currentUni.city} (View on Map)</Text>
              <Text style={{ fontSize: 12, color: theme.primary, marginLeft: 4 }}>↗️</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.priceContainer, !desktop && styles.priceContainerMobile, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.price, { color: theme.primary }]}>£{Math.round(property.price_pppw)}</Text>
            <Text style={[styles.pppw, { color: theme.primary }]}>per week</Text>
            <Text style={[styles.priceEstLabel, { color: theme.primary }]}>per person (est.)</Text>
          </View>
        </View>
        <Text style={styles.infoNote}>
          Prices are estimated per person based on equal rent split between bedrooms.
        </Text>

        <View style={[styles.statsRow, isSmallMobile && { flexDirection: 'column', alignItems: 'stretch', gap: spacing.md }]}>
          <View style={styles.statBox}>
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 22 }}>🛏️</Text>
            </View>
            <View style={styles.statTextGroup}>
              <Text style={styles.statVal}>{property.bedrooms || 1}</Text>
              <Text style={styles.statLab}>Bedrooms</Text>
            </View>
          </View>
          <View style={styles.statBox}>
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 22 }}>🚿</Text>
            </View>
            <View style={styles.statTextGroup}>
              <Text style={styles.statVal}>{property.bathrooms || 1}</Text>
              <Text style={styles.statLab}>Bathrooms</Text>
            </View>
          </View>
          <View style={styles.statBox}>
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 22 }}>⚡</Text>
            </View>
            <View style={styles.statTextGroup}>
              <Text style={styles.statVal}>{property.bills_included ? 'Included' : 'Not Inc.'}</Text>
              <Text style={styles.statLab}>Wifi/Bills</Text>
            </View>
          </View>
        </View>

        <View style={styles.commuteHeader}>
          <Text style={styles.sectionTitle}>Campus Commute (Walking)</Text>
          {isEstimate && (
            <View style={[styles.estimateBadge, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
              <Text style={[styles.estimateBadgeText, { color: theme.primary }]}>AREA ESTIMATE</Text>
            </View>
          )}
        </View>
        <View style={[styles.statsRow, isSmallMobile && { flexDirection: 'column', alignItems: 'stretch', gap: spacing.md }]}>
          {dists.map((d: any) => (
            <View key={d.id} style={styles.statBox}>
              <View style={styles.iconCircle}>
                <Text style={{ fontSize: 22 }}>{d.icon}</Text>
              </View>
              <View style={styles.statTextGroup}>
                <Text style={styles.statVal}>{d.dist ? Math.round(d.dist * 20) : '?'} mins</Text>
                <Text style={styles.statLab}>To {d.label}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.statBox} onPress={openInMaps}>
            <View style={[styles.iconCircle, { backgroundColor: theme.primaryLight }]}>
              <Text style={{ fontSize: 22 }}>🗺️</Text>
            </View>
            <View style={styles.statTextGroup}>
              <Text style={[styles.statVal, { color: theme.primary }]}>Maps</Text>
              <Text style={styles.statLab}>Open Route</Text>
            </View>
          </TouchableOpacity>
        </View>

        {property.available_from && (
          <View style={[styles.section, { marginBottom: spacing.lg }]}>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, marginRight: 12 }}>📅</Text>
                <Text style={styles.description}>
                  Available from <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{formatDate(property.available_from)}</Text>
                </Text>
             </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this Listing</Text>
          <Text style={styles.description}>
            This premium {property.bedrooms || property.beds}-bedroom property is located in the sought-after {property.area} area of {currentUni.city}. 
            Perfectly suited for students, it features {property.bathrooms || property.baths} { (property.bathrooms || property.baths) === 1 ? 'bathroom' : 'bathrooms'} and all necessary modern amenities. 
            Explore the full details and booking information directly on the provider's website.
          </Text>
          <TouchableOpacity 
            style={[styles.listingBtn, !desktop && { width: '100%', justifyContent: 'center' }, { backgroundColor: theme.primary }]} 
            onPress={openListing}
          >
            <Text style={styles.listingBtnText}>View on {property.landlord_id || 'Provider Site'}</Text>
            <Text style={{ fontSize: 20, color: colors.white, marginLeft: 8 }}>↗️</Text>
          </TouchableOpacity>
        </View>

        {landlord && (
          <View style={[styles.landlordCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
            <View style={[styles.landlordHeader, !desktop && styles.landlordHeaderMobile]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.landlordLabel, { color: theme.primary }]}>MANAGED BY</Text>
                <Text style={styles.landlordName}>{landlord.name}</Text>
              </View>
              <View style={[styles.verifiedBadge, !desktop && styles.verifiedBadgeMobile]}>
                <Text style={{ fontSize: 16 }}>✅</Text>
                <Text style={[styles.verifiedText, { color: theme.primary }]}>Verified Partner</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.reviewLink} onPress={() => onSeeReviews(landlord.id)}>
              <Text style={[styles.reviewLinkText, { color: theme.primary }]}>See Student Reviews</Text>
              <Text style={{ fontSize: 18, color: theme.primary }}>→</Text>
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
  hero: { width: '100%', position: 'relative' },
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
    zIndex: 10,
    minHeight: 44,
    minWidth: 44,
  },
  sourceBadge: { 
    position: 'absolute', 
    bottom: 48, 
    right: 24, 
    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: radii.sm 
  },
  sourceText: { ...typography.caption, fontWeight: '700', color: colors.textPrimary },
  content: { 
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
  areaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, minHeight: 44 },
  area: { ...typography.body, color: colors.textSecondary, marginLeft: 6 },
  priceContainer: { alignItems: 'flex-end', padding: spacing.md, borderRadius: radii.md },
  priceContainerMobile: { alignItems: 'flex-start', alignSelf: 'flex-start' },
  price: { ...typography.h2 },
  pppw: { ...typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  priceEstLabel: { ...typography.caption, fontWeight: '500', textTransform: 'lowercase', marginTop: 2 },
  infoNote: { ...typography.bodySmall, color: colors.textMuted, fontStyle: 'italic', marginBottom: spacing.xl, marginTop: -spacing.md },
  statsRow: { 
    flexDirection: 'row', 
    marginBottom: spacing.xxl, 
    backgroundColor: colors.background, 
    borderRadius: radii.lg, 
    padding: spacing.md,
    justifyContent: 'space-around',
  },
  statBox: { flex: 1, alignItems: 'center', paddingHorizontal: 2, flexDirection: 'row', justifyContent: 'center', minHeight: 44 },
  statTextGroup: { marginLeft: 12, flexShrink: 1 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  statVal: { ...typography.h4, color: colors.textPrimary, fontSize: 15 },
  statLab: { ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase', marginTop: 1, fontSize: 9, letterSpacing: 0.5 },
  commuteHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.md 
  },
  estimateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  estimateBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
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
    minHeight: 56,
  },
  listingBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  landlordCard: { 
    borderRadius: radii.lg, 
    padding: spacing.xl, 
    borderWidth: 1, 
  },
  landlordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  landlordHeaderMobile: { flexDirection: 'column', gap: spacing.md },
  landlordLabel: { ...typography.label },
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
  verifiedText: { ...typography.caption, fontWeight: '700', marginLeft: 6 },
  reviewLink: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  reviewLinkText: { ...typography.body, fontWeight: '700', marginRight: 8 }
});
