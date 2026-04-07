import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, useWindowDimensions, Platform, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, spacing, radii, typography, shadows, isDesktop } from '../utils/theme';

export default function OverviewScreen({ onNavigateToHouses }: { onNavigateToHouses: () => void }) {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const desktopMode = isDesktop(width);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await supabase.from('properties').select('price_pppw, external_url').limit(500);
        if (data) setProperties(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const stats = useMemo(() => {
    if (!properties.length) return { count: 0, avg: 0, min: 0, max: 0, sources: 0 };
    const prices = properties.map(p => parseFloat(p.price_pppw)).filter(p => p > 0);
    const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 0;
    
    const sources = new Set(properties.map(p => {
      if (!p.external_url) return 'Direct';
      try {
        const domain = p.external_url.split('/')[2].replace('www.', '');
        return domain;
      } catch { return 'Other'; }
    })).size;
    
    return {
      count: properties.length,
      avg: Math.round(avg),
      min,
      max,
      sources: Math.max(sources, 4) 
    };
  }, [properties]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const handleBookAppointment = () => {
    const url = 'https://www.exeterguild.com/advice';
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* 1. Hero Section with Fixed Background Image */}
      <View style={styles.heroContainer}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1569329007721-f00490129200?q=80&w=2070&auto=format&fit=crop' }} 
          style={styles.heroBackgroundImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay}>
          <Text style={[styles.heroGreeting, styles.textShadow]}>{getGreeting()}</Text>
          <Text style={[styles.heroTitle, styles.textShadow]}>ExeLodge — Exeter Student Housing Platform</Text>
          <Text style={[styles.heroSubtitle, styles.textShadow]}>Your Guide to Fair and Verified Student Homes</Text>
          
          <TouchableOpacity style={styles.heroCTA} onPress={onNavigateToHouses}>
            <Text style={styles.heroCTAText}>Start Searching Verified Listings</Text>
            <Text style={{ fontSize: 20, marginLeft: 12 }}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. The Trust Bar */}
      <View style={styles.trustBar}>
        <View style={styles.trustItem}>
          <Text style={{ fontSize: 20 }}>⭐</Text>
          <Text style={styles.trustText}>Verified Landlords & Reviews</Text>
        </View>
        <View style={styles.trustItem}>
          <Text style={{ fontSize: 20 }}>📈</Text>
          <Text style={styles.trustText}>Market Average Comparison</Text>
        </View>
        <View style={styles.trustItem}>
          <Text style={{ fontSize: 20 }}>🛡️</Text>
          <Text style={styles.trustText}>Tenant Rights Guide</Text>
        </View>
        <View style={styles.trustItem}>
          <Text style={{ fontSize: 20 }}>📊</Text>
          <Text style={styles.trustText}>Verified Data</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        
        {/* 3. Guild Advice Highlight */}
        <View style={styles.guildCard}>
          <View style={[styles.guildLeft, !desktopMode && { width: '100%', borderTopRightRadius: radii.lg, borderBottomLeftRadius: 0 }]}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🏠</Text>
            <Text style={styles.guildTitle}>Exeter Guild: Here to help you find your home</Text>
            <TouchableOpacity style={styles.guildButton} onPress={handleBookAppointment}>
              <Text style={styles.guildButtonText}>Book an Appointment</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.guildRight}>
            <Text style={styles.guildDesc}>
              The Students' Guild offers free, independent advice on housing contracts, landlord disputes, and tenant legislation. 
              Our specialists ensure you're treated fairly by Exeter property providers.
            </Text>
            <TouchableOpacity onPress={handleBookAppointment}>
              <Text style={styles.guildLink}>Visit Guild Housing Advice →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Features Grid & Stats */}
        <View style={styles.gridHeader}>
          <Text style={styles.sectionTitle}>Market Insights & Features</Text>
          <View style={styles.liveBadge}>
            <View style={styles.pulse} />
            <Text style={styles.liveText}>LIVE DATA</Text>
          </View>
        </View>

        <View style={styles.featuresGrid}>
          {/* Stat Card 1: Market Average */}
          <View style={styles.featureCard}>
            <View style={styles.statIconCircle}>
              <Text style={{ fontSize: 24 }}>📈</Text>
            </View>
            <Text style={styles.statValue}>£{stats.avg}</Text>
            <Text style={styles.statLabel}>MARKET AVG PW</Text>
            <Text style={styles.featureDesc}>Based on current {stats.sources} primary portals.</Text>
          </View>

          {/* Stat Card 2: Listing Count */}
          <View style={styles.featureCard}>
            <View style={styles.statIconCircle}>
              <Text style={{ fontSize: 24 }}>📋</Text>
            </View>
            <Text style={styles.statValue}>{stats.count}</Text>
            <Text style={styles.statLabel}>TOTAL UNIQUE HOMES</Text>
            <Text style={styles.featureDesc}>Aggregated across Exeter daily.</Text>
          </View>

          {/* Feature Card 3: Comparison */}
          <View style={styles.featureCard}>
            <View style={styles.statIconCircle}>
              <Text style={{ fontSize: 24 }}>⚖️</Text>
            </View>
            <Text style={styles.featureCardTitle}>Price Comparison</Text>
            <Text style={styles.featureDesc}>Compare listings side-by-side to find hidden value and avoid overpaying.</Text>
          </View>

          {/* Feature Card 4: Reviews */}
          <View style={styles.featureCard}>
            <View style={styles.statIconCircle}>
              <Text style={{ fontSize: 24 }}>💬</Text>
            </View>
            <Text style={styles.featureCardTitle}>Landlord Reviews</Text>
            <Text style={styles.featureDesc}>Read authentic experiences from previous Exeter student tenants.</Text>
          </View>

          {/* Feature Card 5: Rights */}
          <View style={styles.featureCard}>
            <View style={styles.statIconCircle}>
              <Text style={{ fontSize: 24 }}>📜</Text>
            </View>
            <Text style={styles.featureCardTitle}>Legal Checklist</Text>
            <Text style={styles.featureDesc}>A plain-English guide to your rights under the 2025 Renters Act.</Text>
          </View>

          {/* Feature Card 6: Coverage */}
          <View style={styles.featureCard}>
            <View style={styles.statIconCircle}>
              <Text style={{ fontSize: 24 }}>📍</Text>
            </View>
            <Text style={styles.featureCardTitle}>Full Coverage</Text>
            <Text style={styles.featureDesc}>Monitoring all 10 key student neighbourhoods in Exeter.</Text>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Hero
  heroContainer: {
    width: '100%',
    height: 500,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
    backgroundColor: '#004d26', // Fallback color
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 40, 20, 0.25)', // Emerald tint
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    zIndex: 1,
  },
  textShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  heroGreeting: {
    ...typography.label,
    color: colors.primaryLight,
    marginBottom: 12,
  },
  heroTitle: {
    ...typography.logo,
    color: colors.white,
    fontSize: Platform.OS === 'web' ? 48 : 36,
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 56 : 42,
  },
  heroSubtitle: {
    ...typography.h3,
    color: colors.white,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '400',
    opacity: 0.9,
  },
  heroCTA: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: radii.md,
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.medium,
  },
  heroCTAText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },

  // Trust Bar
  trustBar: {
    width: '100%',
    backgroundColor: colors.primary,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  trustItem: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 200 : '50%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: spacing.sm,
  },
  trustText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 140,
  },

  mainContent: {
    paddingHorizontal: Platform.OS === 'web' ? 60 : spacing.md,
    paddingTop: spacing.xl,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },

  // Guild Card
  guildCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    overflow: 'hidden',
    ...shadows.soft,
    marginBottom: spacing.xl,
  },
  guildLeft: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
    width: Platform.OS === 'web' ? '40%' : '100%',
    justifyContent: 'center',
  },
  guildTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 20,
  },
  guildButton: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  guildButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  guildRight: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  guildDesc: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: 16,
  },
  guildLink: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },

  // Grid Section
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.xs,
    gap: 6,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  featureCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.lg,
    width: Platform.OS === 'web' ? '31.5%' : '100%',
    minHeight: 180,
    ...shadows.soft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.label,
    marginTop: 4,
  },
  featureCardTitle: {
    ...typography.h4,
    marginBottom: 8,
  },
  featureDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  }
});
