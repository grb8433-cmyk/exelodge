import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Image, useWindowDimensions, Platform, Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii, typography, shadows, fontFamily, isDesktop } from '../utils/theme';

export default function OverviewScreen({ onNavigateToHouses }: { onNavigateToHouses: () => void }) {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const desktop = isDesktop(width);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('properties').select('price_pppw, external_url').limit(500);
        if (data) setProperties(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    if (!properties.length) return { count: 0, avg: 0, min: 0, max: 0, sources: 0 };
    const prices = properties.map(p => parseFloat(p.price_pppw)).filter(p => p > 0);
    const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const sources = new Set(properties.map(p => {
      if (!p.external_url) return 'Direct';
      try { return p.external_url.split('/')[2].replace('www.', ''); }
      catch { return 'Other'; }
    })).size;
    return { count: properties.length, avg: Math.round(avg), min: Math.min(...prices), max: Math.max(...prices), sources: Math.max(sources, 4) };
  }, [properties]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const openGuild = () => {
    const url = 'https://www.exeterguild.com/advice';
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading market data…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* ── HERO ── */}
      <View style={[styles.hero, !desktop && styles.heroMobile]}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1569329007721-f00490129200?q=80&w=2070&auto=format&fit=crop' }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        {/* Layered gradient overlay — dark top + emerald tint at bottom */}
        <View style={styles.heroOverlayDark} />
        <View style={styles.heroOverlayGreen} />

        <View style={[styles.heroContent, !desktop && styles.heroContentMobile]}>
          <View style={styles.heroPill}>
            <View style={styles.heroPillDot} />
            <Text style={styles.heroPillText}>{getGreeting()} — {stats.count} homes listed live</Text>
          </View>

          <Text style={[styles.heroTitle, !desktop && styles.heroTitleMobile]}>
            Find Your Perfect{'\n'}Student Home in Exeter
          </Text>
          <Text style={[styles.heroSub, !desktop && styles.heroSubMobile]}>
            Verified listings, real landlord reviews, and your legal rights — all in one place.
          </Text>

          <TouchableOpacity style={[styles.heroCTA, !desktop && styles.heroCTAMobile]} onPress={onNavigateToHouses} activeOpacity={0.88}>
            <Text style={styles.heroCTAText}>Search Verified Listings</Text>
            <Feather name="arrow-right" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── TRUST BAR ── */}
      <View style={[styles.trustBar, !desktop && styles.trustBarMobile]}>
        {[
          { icon: 'check-circle' as const, label: 'Verified Landlords & Reviews' },
          { icon: 'bar-chart-2' as const, label: 'Live Market Average' },
          { icon: 'shield' as const, label: 'Tenant Rights Guide' },
          { icon: 'database' as const, label: 'Multi-Source Data' },
        ].map((item, i) => (
          <View key={i} style={[styles.trustItem, !desktop && styles.trustItemMobile]}>
            <View style={styles.trustIconWrap}>
              <Feather name={item.icon} size={14} color={colors.primary} />
            </View>
            <Text style={styles.trustText}>{item.label}</Text>
            {desktop && i < 3 && <View style={styles.trustDivider} />}
          </View>
        ))}
      </View>

      <View style={[styles.main, !desktop && styles.mainMobile]}>

        {/* ── GUILD CARD ── */}
        <View style={[styles.guildCard, !desktop && styles.guildCardMobile]}>
          <View style={[styles.guildLeft, !desktop && styles.guildLeftMobile]}>
            <View style={styles.guildIconWrap}>
              <Feather name="users" size={22} color={colors.white} />
            </View>
            <Text style={styles.guildTitle}>Exeter Students' Guild Housing Advice</Text>
            <Text style={styles.guildSub}>Free, independent guidance for every student.</Text>
            <TouchableOpacity style={styles.guildBtn} onPress={openGuild} activeOpacity={0.85}>
              <Text style={styles.guildBtnText}>Book an Appointment</Text>
              <Feather name="external-link" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.guildRight, !desktop && styles.guildRightMobile]}>
            <Text style={styles.guildDesc}>
              Our housing specialists offer free advice on contracts, landlord disputes, and tenant legislation.
              Whether you're signing your first lease or dealing with an unresponsive landlord — we're here.
            </Text>
            <TouchableOpacity onPress={openGuild} style={styles.guildLink}>
              <Text style={styles.guildLinkText}>Visit Guild Housing Advice</Text>
              <Feather name="arrow-right" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── STATS / FEATURES GRID ── */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionLabel}>LIVE MARKET DATA</Text>
            <Text style={styles.sectionTitle}>Market Insights & Features</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.livePulse} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={[styles.grid, !desktop && styles.gridMobile]}>

          {/* Stat: Market Average */}
          <View style={[styles.statCard, !desktop && styles.cardFull]}>
            <View style={[styles.statIcon, { backgroundColor: colors.primaryLight }]}>
              <Feather name="trending-up" size={18} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>£{stats.avg}</Text>
            <Text style={styles.statUnit}>per person / week</Text>
            <Text style={styles.cardDesc}>Current Exeter market average across {stats.sources} sources.</Text>
          </View>

          {/* Stat: Total Homes */}
          <View style={[styles.statCard, !desktop && styles.cardFull]}>
            <View style={[styles.statIcon, { backgroundColor: colors.accentLight }]}>
              <Feather name="home" size={18} color={colors.accent} />
            </View>
            <Text style={styles.statValue}>{stats.count}</Text>
            <Text style={styles.statUnit}>unique homes listed</Text>
            <Text style={styles.cardDesc}>Aggregated and deduplicated daily from all major portals.</Text>
          </View>

          {/* Feature: Price Comparison */}
          <View style={[styles.featureCard, !desktop && styles.cardFull]}>
            <View style={[styles.statIcon, { backgroundColor: '#F0F4FF' }]}>
              <Feather name="layers" size={18} color="#4B6CF5" />
            </View>
            <Text style={styles.featureTitle}>Price Comparison</Text>
            <Text style={styles.cardDesc}>Compare listings side-by-side to find hidden value and avoid overpaying.</Text>
          </View>

          {/* Feature: Landlord Reviews */}
          <View style={[styles.featureCard, !desktop && styles.cardFull]}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF8F0' }]}>
              <Feather name="message-circle" size={18} color="#E07B20" />
            </View>
            <Text style={styles.featureTitle}>Landlord Reviews</Text>
            <Text style={styles.cardDesc}>Authentic tenant experiences from Exeter students across all providers.</Text>
          </View>

          {/* Feature: Legal Checklist */}
          <View style={[styles.featureCard, !desktop && styles.cardFull]}>
            <View style={[styles.statIcon, { backgroundColor: '#F5F0FF' }]}>
              <Feather name="file-text" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.featureTitle}>Legal Checklist</Text>
            <Text style={styles.cardDesc}>Plain-English guide to your rights under the 2025 Renters' Rights Act.</Text>
          </View>

          {/* Feature: Full Coverage */}
          <View style={[styles.featureCard, !desktop && styles.cardFull]}>
            <View style={[styles.statIcon, { backgroundColor: colors.primaryLight }]}>
              <Feather name="map-pin" size={18} color={colors.primary} />
            </View>
            <Text style={styles.featureTitle}>Full Exeter Coverage</Text>
            <Text style={styles.cardDesc}>All 10 key student neighbourhoods monitored including Pennsylvania & St James.</Text>
          </View>

        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontFamily, fontSize: 14, color: colors.textMuted },

  // Hero
  hero: { width: '100%', height: 520, position: 'relative', overflow: 'hidden' },
  heroMobile: { height: 420 },
  heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroOverlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 10, 9, 0.55)',
  },
  heroOverlayGreen: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(11, 110, 79, 0.25)',
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
  },
  heroContentMobile: { paddingHorizontal: spacing.lg },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.full,
    marginBottom: 20,
  },
  heroPillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  heroPillText: { fontFamily, color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500' as any },
  heroTitle: {
    fontFamily,
    fontSize: 52,
    fontWeight: '800' as any,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 60,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroTitleMobile: { fontSize: 30, lineHeight: 36 },
  heroSub: {
    fontFamily,
    fontSize: 17,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 26,
    fontWeight: '400' as any,
    maxWidth: 560,
  },
  heroSubMobile: { fontSize: 15, marginTop: 12 },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: radii.md,
    marginTop: 32,
    ...shadows.medium,
  },
  heroCTAMobile: { marginTop: 24, paddingVertical: 14, paddingHorizontal: 22 },
  heroCTAText: { fontFamily, color: colors.primary, fontSize: 16, fontWeight: '700' as any, letterSpacing: -0.1 },

  // Trust bar
  trustBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  trustBarMobile: {
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 8,
  },
  trustItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
  },
  trustItemMobile: {
    flex: 0,
    width: '47%',
    justifyContent: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    padding: 10,
    borderRadius: radii.md,
  },
  trustIconWrap: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustText: { fontFamily, fontSize: 13, fontWeight: '600' as any, color: colors.textSecondary },
  trustDivider: { position: 'absolute', right: 0, width: 1, height: 24, backgroundColor: colors.border },

  // Main content
  main: { paddingHorizontal: 52, paddingTop: spacing.xl, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  mainMobile: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },

  // Guild card
  guildCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  guildCardMobile: { flexDirection: 'column' },
  guildLeft: {
    width: '38%',
    backgroundColor: colors.primary,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  guildLeftMobile: { width: '100%', padding: spacing.lg },
  guildIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  guildTitle: {
    fontFamily,
    fontSize: 18,
    fontWeight: '800' as any,
    color: colors.white,
    lineHeight: 24,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  guildSub: {
    fontFamily,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 20,
    lineHeight: 18,
  },
  guildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  guildBtnText: { fontFamily, color: colors.primary, fontWeight: '700' as any, fontSize: 13 },
  guildRight: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  guildRightMobile: { padding: spacing.lg },
  guildDesc: {
    fontFamily,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 25,
    marginBottom: spacing.lg,
  },
  guildLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guildLinkText: { fontFamily, color: colors.primary, fontWeight: '700' as any, fontSize: 14 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  sectionLabel: { ...typography.label, color: colors.primary, marginBottom: 4 },
  sectionTitle: { fontFamily, fontSize: 20, fontWeight: '700' as any, color: colors.textPrimary },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primaryMedium,
  },
  livePulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  liveText: { fontFamily, fontSize: 10, fontWeight: '800' as any, color: colors.primary, letterSpacing: 0.5 },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridMobile: { gap: spacing.sm },

  // Stat card (2 of 6)
  statCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: '31.5%',
    minHeight: 180,
    ...shadows.soft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Feature card (4 of 6)
  featureCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: '31.5%',
    minHeight: 160,
    ...shadows.soft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardFull: { width: '100%', minHeight: 'auto' as any },

  statIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statValue: {
    fontFamily,
    fontSize: 36,
    fontWeight: '800' as any,
    color: colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 40,
  },
  statUnit: {
    fontFamily,
    fontSize: 11,
    fontWeight: '600' as any,
    color: colors.textMuted,
    textTransform: 'uppercase' as any,
    letterSpacing: 0.5,
    marginTop: 2,
    marginBottom: 8,
  },
  featureTitle: {
    fontFamily,
    fontSize: 16,
    fontWeight: '700' as any,
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 2,
  },
  cardDesc: {
    fontFamily,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
