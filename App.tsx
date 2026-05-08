import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity, Platform, Image, ScrollView, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { Feather } from '@expo/vector-icons';
import Icon from './src/components/Icon';
import Sidebar from './src/components/Sidebar';
import { supabase } from './src/lib/supabase';
import HomeScreen from './src/screens/HomeScreen';
import OverviewScreen from './src/screens/OverviewScreen';
import ReviewsScreen from './src/screens/ReviewsScreen';
import RightsScreen from './src/screens/RightsScreen';
import PropertyDetailScreen from './src/screens/PropertyDetailScreen';
import SubmitReviewScreen from './src/screens/SubmitReviewScreen';
import { colors, shadows, radii, fontFamily, getUniversityColors, isDesktop, spacing, typography } from './src/utils/theme';
import UNIVERSITIES from './config/universities.json';

const TABS = [
  { id: 'Home',    label: 'Overview', icon: 'grid'   },
  { id: 'Houses',  label: 'Houses',   icon: 'home'   },
  { id: 'Reviews', label: 'Reviews',  icon: 'star'   },
  { id: 'Rights',  label: 'Rights',   icon: 'shield' },
];

function LandingScreen({ onSelect, isDarkMode, toggleDarkMode }: { onSelect: (id: string) => void, isDarkMode: boolean, toggleDarkMode: () => void }) {
  const { width } = useWindowDimensions();
  const desktop = isDesktop(width);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const newCounts: Record<string, number> = {};
        await Promise.all(UNIVERSITIES.map(async (uni) => {
          const { count, error } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('university', uni.id)
            .eq('is_available', true);
          
          if (!error && count !== null) {
            newCounts[uni.id] = count;
          }
        }));
        setCounts(newCounts);
      } catch (err) { 
        console.error('Error fetching counts:', err); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchCounts();
  }, []);

  return (
    <View style={styles.landingContainer}>
      {/* Decorative Blobs */}
      <View style={styles.blobExeter} />
      <View style={styles.blobBristol} />
      <View style={styles.blobCenter} />

      {/* Dark Mode Toggle */}
      <View style={styles.themeToggleWrap}>
        <TouchableOpacity 
          style={styles.themeToggle} 
          onPress={toggleDarkMode}
          activeOpacity={0.8}
        >
          <Icon name={isDarkMode ? 'moon' : 'sun'} size={14} color={colors.white} />
          <Text style={styles.themeToggleText}>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</Text>
          <View style={[styles.toggleTrack, { backgroundColor: isDarkMode ? '#0B6E4F' : 'rgba(255,255,255,0.2)' }]}>
            <View style={[styles.toggleThumb, isDarkMode && { transform: [{ translateX: 16 }] }]} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.landingContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          entering={FadeInUp.duration(600).springify()}
          style={styles.landingHero}
        >
          <View style={styles.landingIconBox}>
            <Icon name="home" size={32} color={colors.white} />
          </View>
          <Text style={styles.landingLogoText}>ExeLodge</Text>
          <Text style={styles.landingTitle}>The Student{'\n'}Housing Platform</Text>
          <Text style={styles.landingSub}>Verified listings, real reviews, and tenant legal empowerment.</Text>
        </Animated.View>

        <View style={[styles.cityCards, !desktop && styles.cityCardsMobile]}>
          {UNIVERSITIES.map((uni, i) => (
            <Animated.View
              key={uni.id}
              entering={FadeInDown.duration(500).delay(150 + i * 100).springify()}
              style={{ flex: 1 }}
            >
              <TouchableOpacity
                style={[styles.cityCard, { borderColor: 'rgba(255,255,255,0.1)' }]}
                onPress={() => onSelect(uni.id)}
                activeOpacity={0.9}
              >
                <View style={[styles.cityCardHero, { backgroundColor: uni.primaryColor }]}>
                  <Text style={styles.cityCardName}>{uni.city}</Text>
                </View>
                <View style={styles.cityCardFooter}>
                  <Text style={styles.cityCardUni}>{uni.name}</Text>
                  {loading ? (
                    <ActivityIndicator size="small" color={uni.primaryColor} />
                  ) : (
                    <Text style={[styles.cityCount, { color: uni.primaryColor }]}>
                      {counts[uni.id] || 0} properties available
                    </Text>
                  )}
                  <View style={[styles.cityCardBtn, { backgroundColor: uni.primaryColor }]}>
                    <Text style={styles.cityCardBtnText}>Explore {uni.city}</Text>
                    <Icon name="arrow-right" size={14} color={colors.white} />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
        
        <Animated.View 
          entering={FadeInDown.duration(800).delay(600)}
          style={styles.landingFooter}
        >
          <Text style={styles.landingFooterText}>Exeter, Bristol & Southampton Student Housing Platform • 2026</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = Font.useFonts(Feather.font);
  const [activeTab, setActiveTab] = useState('Home');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [landlordIdForReview, setLandlordIdForReview] = useState<string | null>(null);
  const [targetLandlordId, setTargetLandlordId] = useState<string | null>(null);
  const [universityId, setUniversityId] = useState('exeter');
  const [showLanding, setShowLanding] = useState(true); // Always start with landing for hard refresh
  const [fontLoadingTimedOut, setFontLoadingTimedOut] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const { width } = useWindowDimensions();
  const desktop = isDesktop(width);

  const currentUni = UNIVERSITIES.find(u => u.id === universityId) || UNIVERSITIES[0];
  const theme = getUniversityColors(universityId, isDarkMode);

  // Dynamic Favicon & Browser Title
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Title
      if (!showLanding) {
        document.title = `ExeLodge | ${currentUni.city} Student Housing & Accommodation`;
      } else {
        document.title = 'ExeLodge | Student Housing in Exeter, Bristol & Southampton';
      }

      // Meta description
      const cityDescriptions: Record<string, string> = {
        exeter:       'Find student houses and accommodation in Exeter. Compare prices per person per week, distance to Streatham and St Lukes campus, and bills-inclusive options across hundreds of verified Exeter student listings.',
        bristol:      'Find student houses and flats in Bristol. Compare prices per person per week, distance to UoB and UWE campus, and bills-inclusive options across hundreds of verified Bristol student listings.',
        southampton:  'Find student houses and accommodation in Southampton. Compare prices per person per week, distance to Highfield and Solent campus, and bills-inclusive options across hundreds of verified Southampton student listings.',
      };
      let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = showLanding
        ? 'Find student housing in Exeter, Bristol and Southampton. Compare prices, distance to campus, and bills-inclusive options across hundreds of verified listings.'
        : cityDescriptions[universityId] || cityDescriptions.exeter;

      // Favicon
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      
      // We can use a colored SVG data URI as a dynamic favicon
      const faviconColor = theme.primary.replace('#', '%23');
      link.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='25' fill='${faviconColor}'></rect><g transform='translate(20, 20) scale(2.5)' stroke='white' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'></path><path d='M9 22V12h6v10'></path></g></svg>`;
    }
  }, [currentUni, showLanding, theme, isDarkMode]);

  // URL Syncing for Web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const propertyParam = urlParams.get('property');
      if (propertyParam) {
        setSelectedPropertyId(propertyParam);
        setShowLanding(false);
      }

      const path = window.location.pathname.substring(1).split('/')[0];
      if (path === '') {
        // Keep showLanding true
      } else if (UNIVERSITIES.some(u => u.id === path)) {
        setUniversityId(path);
        setShowLanding(false);
        setActiveTab('Houses');
      }
    }
  }, []);

  useEffect(() => {
    if (fontError) {
      console.error('Error loading fonts:', fontError);
    }
  }, [fontError]);

  // Fallback if fonts take too long or fail
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!fontsLoaded) {
        console.warn('Font loading timed out, proceeding with system fonts');
        setFontLoadingTimedOut(true);
      }
    }, 3000); // 3 seconds timeout
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  useEffect(() => {
    if (Platform.OS === 'web' && !showLanding) {
      const currentPath = window.location.pathname.substring(1).split('/')[0];
      if (currentPath !== universityId) {
        window.history.pushState({}, '', `/${universityId}${window.location.hash}`);
      }
    }
  }, [universityId, showLanding]);

  useEffect(() => {
    if (Platform.OS === 'web' && !showLanding) {
      if (selectedPropertyId) {
        window.history.pushState({}, '', `/${universityId}?property=${selectedPropertyId}`);
      } else {
        const params = new URLSearchParams(window.location.search);
        if (params.has('property')) {
          window.history.pushState({}, '', `/${universityId}`);
        }
      }
    }
  }, [selectedPropertyId, universityId, showLanding]);

  const selectUniversity = (id: string) => {
    setUniversityId(id);
    setShowLanding(false);
    setActiveTab('Home');
  };

  const navigateTab = (tab: string) => {
    setSelectedPropertyId(null);
    setLandlordIdForReview(null);
    setActiveTab(tab);
  };

  const goToLanding = () => {
    setShowLanding(true);
    if (Platform.OS === 'web') {
      window.history.pushState({}, '', '/');
    }
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Only block if fonts haven't loaded AND we haven't timed out AND there's no error
  if (!fontsLoaded && !fontLoadingTimedOut && !fontError) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0B6E4F" />
      </View>
    );
  }

  if (showLanding) {
    return (
      <SafeAreaProvider>
        <LandingScreen onSelect={selectUniversity} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
      </SafeAreaProvider>
    );
  }

  const renderContent = () => {
    if (selectedPropertyId) {
      return (
        <PropertyDetailScreen
          propertyId={selectedPropertyId}
          universityId={universityId}
          isDarkMode={isDarkMode}
          onBack={() => setSelectedPropertyId(null)}
          onSeeReviews={(id) => {
            setSelectedPropertyId(null);
            setTargetLandlordId(id);
            setActiveTab('Reviews');
          }}
        />
      );
    }
    if (landlordIdForReview) {
      return (
        <SubmitReviewScreen
          landlordId={landlordIdForReview}
          universityId={universityId}
          isDarkMode={isDarkMode}
          onCancel={() => setLandlordIdForReview(null)}
          onSuccess={() => {
            setLandlordIdForReview(null);
            setTargetLandlordId(landlordIdForReview);
            setActiveTab('Reviews');
          }}
        />
      );
    }
    switch (activeTab) {
      case 'Home':    return <OverviewScreen universityId={universityId} isDarkMode={isDarkMode} onSelectUniversity={(id) => setUniversityId(id)} onNavigateToHouses={() => setActiveTab('Houses')} />;
      case 'Houses':  return <HomeScreen universityId={universityId} isDarkMode={isDarkMode} onSelectProperty={(id) => setSelectedPropertyId(id)} />;
      case 'Reviews': return <ReviewsScreen universityId={universityId} isDarkMode={isDarkMode} initialLandlordId={targetLandlordId} onAddReview={(id) => setLandlordIdForReview(id)} />;
      case 'Rights':  return <RightsScreen universityId={universityId} isDarkMode={isDarkMode} />;
      default:        return <OverviewScreen universityId={universityId} isDarkMode={isDarkMode} onSelectUniversity={(id) => setUniversityId(id)} onNavigateToHouses={() => setActiveTab('Houses')} />;
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.primary }]}>
        <View style={[styles.root, { flexDirection: desktop ? 'row' : 'column', backgroundColor: theme.background }]}>
          
          {/* Global Background Blobs */}
          <View style={[styles.globalBlobTop, { backgroundColor: theme.primary, opacity: isDarkMode ? 0.12 : 0.05 }]} pointerEvents="none" />
          <View style={[styles.globalBlobBottom, { backgroundColor: theme.primary, opacity: isDarkMode ? 0.10 : 0.04 }]} pointerEvents="none" />

          {/* Mobile top header */}
          {!desktop && (
            <View style={[styles.mobileHeader, { backgroundColor: theme.primary }]}>
              {/* Header Bubbles */}
              <View style={styles.mobileHeaderBubble} pointerEvents="none" />

              <View style={[styles.mobileLogoMark, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Icon name="home" size={12} color={colors.white} />
              </View>
              <View style={styles.mobileHeaderCenter}>
                <Text style={styles.mobileLogoText}>ExeLodge</Text>
                <TouchableOpacity onPress={goToLanding} style={styles.mobileSwitchCity}>
                  <Text style={styles.mobileCityName}>| {currentUni.city}</Text>
                  <Text style={styles.mobileSwitchText}>Switch City</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Desktop sidebar */}
          {desktop && (
            <Sidebar 
              activeTab={activeTab} 
              onTabPress={navigateTab} 
              universityId={universityId} 
              isDarkMode={isDarkMode}
              onSwitchCity={goToLanding}
            />
          )}

          {/* Main content */}
          <View style={styles.main}>
            {renderContent()}
          </View>

          {/* Mobile bottom tabs */}
          {!desktop && (
            <View style={[styles.bottomTabs, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={styles.tabItem}
                    onPress={() => navigateTab(tab.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.tabIconWrap, isActive && { backgroundColor: theme.primaryLight }]}>
                      <Icon name={tab.icon} size={18} color={isActive ? theme.primary : theme.textMuted} />
                    </View>
                    <Text style={[styles.tabLabel, { color: isActive ? theme.primary : theme.textMuted, fontWeight: isActive ? '700' : '600' as any }]}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1 },
  root: { flex: 1 },
  main: { flex: 1, overflow: 'hidden' },

  globalBlobTop: {
    position: 'absolute',
    top: -150,
    left: -150,
    width: 500,
    height: 500,
    borderRadius: 250,
    zIndex: 0,
  },
  globalBlobBottom: {
    position: 'absolute',
    bottom: -200,
    right: -200,
    width: 600,
    height: 600,
    borderRadius: 300,
    zIndex: 0,
  },

  mobileHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    ...shadows.soft,
    zIndex: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  mobileHeaderBubble: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.white,
    opacity: 0.15,
  },
  mobileLogoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mobileLogoText: {
    ...typography.wordmark,
    fontSize: 16,
    color: colors.white,
  },
  mobileSwitchCity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    height: '100%',
    paddingRight: 16,
  },
  mobileCityName: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400' as any,
    color: 'rgba(255,255,255,0.85)',
  },
  mobileSwitchText: {
    fontFamily,
    fontSize: 9,
    fontWeight: '800' as any,
    color: colors.white,
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase' as any,
  },

  bottomTabs: {
    flexDirection: 'row',
    height: 56,
    borderTopWidth: 1,
    ...shadows.medium,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabIconWrap: {
    width: 44,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily,
    fontSize: 10,
  },

  // ── Theme Toggle ──────────────────────────────────────────────────────────
  themeToggleWrap: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 60,
    right: 24,
    zIndex: 100,
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  themeToggleText: {
    fontFamily,
    fontSize: 12,
    fontWeight: '700' as any,
    color: colors.white,
    marginRight: 4,
  },
  toggleTrack: {
    width: 32,
    height: 18,
    borderRadius: 16,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
    ...shadows.soft,
  },

  // ── Landing Revamp ──────────────────────────────────────────────────────────
  landingContainer: {
    flex: 1,
    backgroundColor: '#0D1117',
    overflow: 'hidden',
  },
  blobExeter: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#0B6E4F',
    opacity: 0.20,
  },
  blobBristol: {
    position: 'absolute',
    bottom: -150,
    right: -150,
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: '#BE0F34',
    opacity: 0.15,
  },
  blobCenter: {
    position: 'absolute',
    top: '30%',
    left: '25%',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: '#FFFFFF',
    opacity: 0.05,
  },
  landingContent: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  landingHero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  landingIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#0B6E4F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadows.medium,
  },
  landingLogoText: {
    fontFamily,
    fontSize: 18,
    fontWeight: '900' as any,
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  landingTitle: {
    ...typography.h1Landing,
    color: colors.white,
    textAlign: 'center',
  },
  landingSub: {
    ...typography.body,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 480,
  },
  cityCards: {
    flexDirection: 'row',
    gap: 24,
    width: '100%',
    maxWidth: 800,
  },
  cityCardsMobile: {
    flexDirection: 'column',
    maxWidth: 360,
  },
  cityCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.medium,
    minHeight: 280,
  },
  cityCardHero: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityCardName: {
    fontFamily,
    fontSize: 32,
    fontWeight: '900' as any,
    color: colors.white,
    letterSpacing: -1,
  },
  cityCardFooter: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  cityCardUni: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600' as any,
    color: colors.white,
    textAlign: 'center',
  },
  cityCount: {
    fontFamily,
    fontSize: 12,
    fontWeight: '700' as any,
    marginBottom: 8,
  },
  cityCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  cityCardBtnText: {
    fontFamily,
    fontSize: 14,
    fontWeight: '700' as any,
    color: colors.white,
  },
  landingFooter: {
    marginTop: 64,
    opacity: 0.25,
  },
  landingFooterText: {
    fontFamily,
    fontSize: 10,
    fontWeight: '600' as any,
    color: colors.white,
    letterSpacing: 1,
    textTransform: 'uppercase' as any,
  },
});
