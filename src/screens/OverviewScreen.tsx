import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Image, useWindowDimensions, Platform, Linking,
} from 'react-native';
import Icon from '../components/Icon';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii, typography, shadows, fontFamily, isDesktop, getUniversityColors } from '../utils/theme';
import UNIVERSITIES from '../../config/universities.json';

export default function OverviewScreen({ universityId, isDarkMode = false, onSelectUniversity, onNavigateToHouses }: { 
  universityId: string, 
  isDarkMode?: boolean,
  onSelectUniversity: (id: string) => void,
  onNavigateToHouses: () => void 
}) {
  const [properties, setProperties] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const desktop = isDesktop(width);
  
  const currentUni = UNIVERSITIES.find(u => u.id === universityId) || UNIVERSITIES[0];
  const theme = getUniversityColors(universityId, isDarkMode);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, count } = await supabase.from('properties')
          .select('price_pppw, external_url', { count: 'exact' })
          .eq('university', universityId)
          .eq('is_available', true)
          .gte('price_pppw', 75);
        if (data) setProperties(data);
        if (count !== null) setTotalCount(count);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [universityId]);

  const stats = useMemo(() => {
    if (!properties.length) return { avg: 0, count: totalCount, sources: 0 };
    const valid = properties.map(p => parseFloat(p.price_pppw)).filter(p => !isNaN(p) && p > 0);
    const avg = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;

    const hosts = new Set(properties.map(p => {
        try { return new URL(p.external_url).hostname; } catch { return 'Other'; }
    }));

    return { avg, count: totalCount, sources: hosts.size };
  }, [properties, totalCount]);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const openGuild = (type?: 'uob' | 'uwe' | 'exeter' | 'susu' | 'solent') => {
    let url = 'https://www.exeterguild.com/advice';
    if (type === 'uob')    url = 'https://www.bristolsu.org.uk/advice-support';
    if (type === 'uwe')    url = 'https://www.thestudentsunion.co.uk/advice-support/housing/';
    if (type === 'susu')   url = 'https://www.susu.org/advice/housing';
    if (type === 'solent') url = 'https://www.solentsu.co.uk/advice/';
    if (universityId === 'bristol' && !type)     url = 'https://www.bristolsu.org.uk/advice-support';
    if (universityId === 'southampton' && !type) url = 'https://www.susu.org/advice/housing';

    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.primary }]}>Loading market data…</Text>
      </View>
    );
  }

  const trustItems = [
    { icon: 'check-circle', label: 'Verified Landlords & Reviews' },
    { icon: 'bar-chart-2',  label: 'Live Market Average'          },
    { icon: 'shield',       label: 'Tenant Rights Guide'          },
    { icon: 'database',     label: 'Multi-Source Data'            },
  ] as const;

  const renderAdviceCard = (uniType: 'exeter' | 'uob' | 'uwe' | 'susu' | 'solent') => {
    const CONFIG = {
      exeter: { title: "Exeter Students' Guild", linkText: "Guild",       sub: "Free, independent guidance for every Exeter student." },
      uob:    { title: "Bristol SU",              linkText: "Bristol SU",  sub: "Free, independent guidance for University of Bristol students." },
      uwe:    { title: "UWE Bristol SU",          linkText: "UWE SU",      sub: "Free, independent guidance for UWE Bristol students." },
      susu:   { title: "Southampton SUSU",        linkText: "SUSU",        sub: "Free, independent guidance for University of Southampton students." },
      solent: { title: "Solent SU",               linkText: "Solent SU",   sub: "Free, independent guidance for Southampton Solent students." },
    };
    const { title, linkText, sub } = CONFIG[uniType];

    return (
      <View style={[styles.guildCard, !desktop && styles.guildCardMobile, { backgroundColor: theme.primaryLight, borderColor: theme.primaryMedium, marginBottom: 24 }]}>
        <View style={[styles.guildLeft, !desktop && styles.guildLeftMobile]}>
          <View style={[styles.guildIconWrap, { backgroundColor: theme.primary }]}>
            <Icon name="users" size={22} color={colors.white} />
          </View>
          <Text style={[styles.guildTitle, { color: theme.textPrimary }]}>{title} Housing Advice</Text>
          <Text style={[styles.guildSub, { color: theme.textSecondary }]}>{sub}</Text>
          <TouchableOpacity style={[styles.guildBtn, { backgroundColor: theme.surface }]} onPress={() => openGuild(uniType)} activeOpacity={0.85}>
            <Text style={[styles.guildBtnText, { color: theme.primary }]}>Book an Appointment</Text>
            <Icon name="external-link" size={13} color={theme.primary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.guildRight, !desktop && styles.guildRightMobile, { borderLeftColor: theme.primaryMedium }]}>
          <Text style={[styles.guildDesc, { color: theme.textSecondary }]}>
            Housing specialists offer free advice on contracts, landlord disputes, and tenant legislation.
            Whether you're signing your first lease or dealing with an unresponsive landlord — they're here.
          </Text>
          <TouchableOpacity onPress={() => openGuild(uniType)} style={styles.guildLink}>
            <Text style={[styles.guildLinkText, { color: theme.primary }]}>Visit {linkText} Housing Advice</Text>
            <Icon name="arrow-right" size={14} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* ── HERO ── */}
      <View style={[styles.hero, !desktop && styles.heroMobile]}>
        <Image
          source={{ uri: universityId === 'exeter'
            ? 'https://images.unsplash.com/photo-h3WFG7y8eyQ?q=80&w=2070&auto=format&fit=crop'
            : universityId === 'bristol'
            ? 'https://images.unsplash.com/photo-bdoHlRE78TA?q=80&w=2070&auto=format&fit=crop'
            : 'https://images.unsplash.com/photo-7w4nbbYLJKY?q=80&w=2070&auto=format&fit=crop' }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        
        <View style={[styles.heroOverlayVibrant, { backgroundColor: theme.primary }]} />
        
        {/* Hero Background Bubbles */}
        <View style={styles.heroBubble1} pointerEvents="none" />
        <View style={styles.heroBubble2} pointerEvents="none" />

        <View style={[styles.heroContent, !desktop && styles.heroContentMobile]}>
          <View style={styles.heroPill}>
            <View style={styles.heroPillDot} />
            <Text style={styles.heroPillText}>{getGreeting()} — {stats.count} homes listed live</Text>
          </View>

          <Text style={[styles.heroTitle, !desktop && styles.heroTitleMobile]}>
            Find Your Perfect{'\n'}Student Home in {currentUni.city}
          </Text>
          <Text style={[styles.heroSub, !desktop && styles.heroSubMobile]}>
            Verified listings, real landlord reviews, and your legal rights — all in one place.
          </Text>

          <TouchableOpacity 
            style={[styles.heroCTA, !desktop && styles.heroCTAMobile, { backgroundColor: theme.surface }]} 
            onPress={onNavigateToHouses} 
            activeOpacity={0.88}
          >
            <Text style={[styles.heroCTAText, { color: theme.primary }]}>Search Verified Listings</Text>
            <Icon name="arrow-right" size={18} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inner}>
        {/* ── CITY SELECTOR ── */}
        <View style={[styles.citySelector, !desktop && styles.citySelectorMobile]}>
          <Text style={[styles.citySelectorTitle, { color: theme.textMuted }]}>Switch City</Text>

          {desktop ? (
            <View style={styles.cityCards}>
              {UNIVERSITIES.map(uni => (
                <TouchableOpacity
                  key={uni.id}
                  style={[styles.cityCard, { backgroundColor: theme.surface, borderColor: theme.border }, universityId === uni.id && { borderColor: uni.primaryColor, backgroundColor: theme.primaryLight }]}
                  onPress={() => onSelectUniversity(uni.id)}
                >
                  <Text style={[styles.cityCardName, { color: theme.textPrimary }, universityId === uni.id && { color: uni.primaryColor }]}>{uni.city}</Text>
                  <Text style={[styles.cityCardUni, { color: theme.textMuted }]}>{uni.name}</Text>
                  {universityId === uni.id && (
                    <View style={[styles.cityActiveDot, { backgroundColor: uni.primaryColor }]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.cityPillRow}>
              {UNIVERSITIES.map(uni => {
                const shortName: Record<string, string> = { exeter: 'UoE', bristol: 'UoB & UWE', southampton: 'UoS & Solent' };
                return (
                  <TouchableOpacity
                    key={uni.id}
                    style={[styles.cityPill, { borderColor: uni.primaryColor }, universityId === uni.id && { backgroundColor: uni.primaryColor }]}
                    onPress={() => onSelectUniversity(uni.id)}
                    activeOpacity={0.8}
                  >
                    <Text numberOfLines={1} style={[styles.cityPillText, { color: universityId === uni.id ? colors.white : theme.textPrimary }]}>{uni.city}</Text>
                    <Text numberOfLines={1} style={[styles.cityPillSub, { color: universityId === uni.id ? 'rgba(255,255,255,0.75)' : theme.textMuted }]}>{shortName[uni.id] || uni.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── HOUSING ADVICE CARDS ── */}
        {universityId === 'exeter' ? (
          renderAdviceCard('exeter')
        ) : universityId === 'southampton' ? (
          <>
            {renderAdviceCard('susu')}
            {renderAdviceCard('solent')}
          </>
        ) : (
          <>
            {renderAdviceCard('uob')}
            {renderAdviceCard('uwe')}
          </>
        )}

        {/* ── STATS / FEATURES GRID ── */}
        <View style={[styles.sectionHeader, !desktop && styles.sectionHeaderMobile]}>
          <View>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>LIVE MARKET DATA</Text>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Market Insights & Features</Text>
          </View>
          <View style={[styles.liveBadge, { backgroundColor: theme.primaryLight }]}>
            <View style={[styles.livePulse, { backgroundColor: theme.primary }]} />
            <Text style={[styles.liveText, { color: theme.primary }]}>LIVE</Text>
          </View>
        </View>

        <View style={[styles.grid, !desktop && styles.gridMobile]}>

          <View style={[styles.statCard, !desktop && styles.cardFull, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.primaryLight }]}>
              <Icon name="trending-up" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.primary }]}>£{stats.avg}</Text>
            <Text style={[styles.statUnit, { color: theme.textMuted }]}>per person / week</Text>
            <Text style={[styles.cardDesc, { color: theme.textMuted }]}>Current {currentUni.city} market average across {stats.sources} sources.</Text>
          </View>

          <View style={[styles.statCard, !desktop && styles.cardFull, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.accentAmberBg }]}>
              <Icon name="home" size={18} color={theme.accentAmber} />
            </View>
            <Text style={[styles.statValue, { color: theme.accentAmber }]}>{stats.count}</Text>
            <Text style={[styles.statUnit, { color: theme.textMuted }]}>unique homes listed</Text>
            <Text style={[styles.cardDesc, { color: theme.textMuted }]}>Aggregated and deduplicated daily from all major portals.</Text>
          </View>

          <View style={[styles.featureCard, !desktop && styles.cardFull, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.accentPriceBg }]}>
              <Icon name="layers" size={18} color={theme.accentPrice} />
            </View>
            <Text style={[styles.featureTitle, { color: theme.textPrimary }]}>Price Comparison</Text>
            <Text style={[styles.cardDesc, { color: theme.textMuted }]}>Compare listings side-by-side to find hidden value and avoid overpaying.</Text>
          </View>

          <View style={[styles.featureCard, !desktop && styles.cardFull, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.accentReviewsBg }]}>
              <Icon name="message-circle" size={18} color={theme.accentReviews} />
            </View>
            <Text style={[styles.featureTitle, { color: theme.textPrimary }]}>Landlord Reviews</Text>
            <Text style={[styles.cardDesc, { color: theme.textMuted }]}>Authentic tenant experiences from {currentUni.city} students across all providers.</Text>
          </View>

          <View style={[styles.featureCard, !desktop && styles.cardFull, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.accentLegalBg }]}>
              <Icon name="file-text" size={18} color={theme.accentLegal} />
            </View>
            <Text style={[styles.featureTitle, { color: theme.textPrimary }]}>Legal Checklist</Text>
            <Text style={[styles.cardDesc, { color: theme.textMuted }]}>Plain-English guide to your rights under the 2025 Renters' Rights Act.</Text>
          </View>

          <View style={[styles.featureCard, !desktop && styles.cardFull, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.statIcon, { backgroundColor: theme.primaryLight }]}>
              <Icon name="map-pin" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.featureTitle, { color: theme.textPrimary }]}>Full {currentUni.city} Coverage</Text>
            <Text style={[styles.cardDesc, { color: theme.textMuted }]}>Comprehensive monitoring of all student-friendly areas in {currentUni.city}.</Text>
          </View>

        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontFamily, fontSize: 14, fontWeight: '700' as any },
  inner: { paddingHorizontal: 48, maxWidth: 1152, alignSelf: 'center', width: '100%', paddingBottom: spacing.xl },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: { width: '100%', height: 520, position: 'relative', overflow: 'hidden' },
  heroMobile: { height: 360 },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  
  heroOverlayVibrant: { 
    ...StyleSheet.absoluteFillObject, 
    opacity: 0.82, 
  },
  heroBubble1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: colors.white,
    opacity: 0.15,
  },
  heroBubble2: {
    position: 'absolute',
    bottom: -150,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.white,
    opacity: 0.12,
  },

  heroContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  heroContentMobile: { paddingHorizontal: spacing.lg },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
    marginBottom: 20,
  },
  heroPillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' },
  heroPillText: { fontFamily, color: '#FFFFFF', fontSize: 13, fontWeight: '700' as any },
  heroTitle: {
    ...typography.h1Overview,
    color: colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroTitleMobile: { fontSize: 29, lineHeight: 32 },
  heroSub: {
    fontFamily,
    fontSize: 18,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 26,
    fontWeight: '500' as any,
    maxWidth: 600,
  },
  heroSubMobile: { fontSize: 15, marginTop: 12 },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: radii.md,
    marginTop: 32,
    ...shadows.medium,
  },
  heroCTAMobile: { marginTop: 24, paddingVertical: 14, paddingHorizontal: 22 },
  heroCTAText: { fontFamily, fontSize: 16, fontWeight: '800' as any, letterSpacing: -0.1 },

  citySelector: {
    paddingVertical: 32,
    width: '100%',
  },
  citySelectorMobile: {
    paddingHorizontal: 0,
  },
  citySelectorTitle: {
    ...typography.eyebrow,
    color: colors.textMuted,
    marginBottom: 16,
  },
  cityCards: {
    flexDirection: 'row',
    gap: 16,
  },
  cityCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
    position: 'relative',
    minHeight: 100,
    justifyContent: 'center',
  },
  cityCardName: {
    fontFamily,
    fontSize: 20,
    fontWeight: '800' as any,
    color: colors.textPrimary,
  },
  cityCardUni: {
    fontFamily,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  cityActiveDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cityPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cityPill: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityPillText: {
    fontFamily,
    fontSize: 13,
    fontWeight: '800' as any,
    textAlign: 'center' as any,
  },
  cityPillSub: {
    fontFamily,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center' as any,
  },

  guildCard: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.soft,
  },
  guildCardMobile: { flexDirection: 'column', gap: spacing.lg, padding: spacing.lg },
  guildLeft: { flex: 1 },
  guildLeftMobile: { marginBottom: 12 },
  guildIconWrap: {
    width: 44, height: 44, borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  guildTitle: { ...typography.h2Section, color: colors.textPrimary, marginBottom: 8 },
  guildSub: { ...typography.body, color: colors.textSecondary, marginBottom: 20 },
  guildBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.white, alignSelf: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.sm,
    ...shadows.soft,
  },
  guildBtnText: { fontFamily, fontSize: 14, fontWeight: '700' as any },
  guildRight: { flex: 1.2, borderLeftWidth: 1, borderLeftColor: colors.borderSubtle, paddingLeft: spacing.xl, justifyContent: 'center' },
  guildRightMobile: { borderLeftWidth: 0, paddingLeft: 0 },
  guildDesc: { ...typography.body, color: colors.textSecondary, marginBottom: 16 },
  guildLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guildLinkText: { fontFamily, fontSize: 14, fontWeight: '700' as any },

  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    marginBottom: spacing.lg,
  },
  sectionHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionLabel: { ...typography.eyebrow, color: colors.textMuted, marginBottom: 4 },
  sectionTitle: { ...typography.h2Section, color: colors.textPrimary },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full,
  },
  livePulse: { width: 6, height: 6, borderRadius: 3 },
  liveText: { ...typography.eyebrow, fontSize: 10, letterSpacing: 0.5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridMobile: { flexDirection: 'column' },
  statCard: {
    flex: 1, minWidth: 240, backgroundColor: colors.white,
    padding: spacing.lg, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, ...shadows.soft,
  },
  featureCard: {
    flex: 1, minWidth: 200, backgroundColor: colors.white,
    padding: spacing.lg, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, ...shadows.soft,
  },
  cardFull: { width: '100%', minWidth: '100%' },
  statIcon: {
    width: 40, height: 40, borderRadius: radii.sm,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  statValue: { ...typography.priceLarge },
  statUnit: { ...typography.eyebrow, color: colors.textMuted, marginTop: 2, marginBottom: 12 },
  featureTitle: { ...typography.h3Card, color: colors.textPrimary, marginBottom: 8, marginTop: 2 },
  cardDesc: { ...typography.bodySubtle, color: colors.textMuted },
});
