import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Sidebar from './src/components/Sidebar';
import HomeScreen from './src/screens/HomeScreen';
import OverviewScreen from './src/screens/OverviewScreen';
import ReviewsScreen from './src/screens/ReviewsScreen';
import RightsScreen from './src/screens/RightsScreen';
import PropertyDetailScreen from './src/screens/PropertyDetailScreen';
import SubmitReviewScreen from './src/screens/SubmitReviewScreen';
import { colors, typography, shadows, radii, fontFamily } from './src/utils/theme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const TABS: { id: string; label: string; icon: FeatherIconName }[] = [
  { id: 'Home',    label: 'Overview', icon: 'grid'    },
  { id: 'Houses',  label: 'Houses',   icon: 'home'    },
  { id: 'Reviews', label: 'Reviews',  icon: 'star'    },
  { id: 'Rights',  label: 'Rights',   icon: 'shield'  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [landlordIdForReview, setLandlordIdForReview] = useState<string | null>(null);
  const [targetLandlordId, setTargetLandlordId] = useState<string | null>(null);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const navigateTab = (tab: string) => {
    setSelectedPropertyId(null);
    setLandlordIdForReview(null);
    setActiveTab(tab);
  };

  const renderContent = () => {
    if (selectedPropertyId) {
      return (
        <PropertyDetailScreen
          propertyId={selectedPropertyId}
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
      case 'Home':    return <OverviewScreen onNavigateToHouses={() => setActiveTab('Houses')} />;
      case 'Houses':  return <HomeScreen onSelectProperty={(id) => setSelectedPropertyId(id)} />;
      case 'Reviews': return <ReviewsScreen initialLandlordId={targetLandlordId} onAddReview={(id) => setLandlordIdForReview(id)} />;
      case 'Rights':  return <RightsScreen />;
      default:        return <OverviewScreen onNavigateToHouses={() => setActiveTab('Houses')} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.root, { flexDirection: isDesktop ? 'row' : 'column' }]}>

        {/* Mobile top header */}
        {!isDesktop && (
          <View style={styles.mobileHeader}>
            <View style={styles.mobileLogoMark}>
              <Feather name="home" size={12} color={colors.white} />
            </View>
            <Text style={styles.mobileLogoText}>ExeLodge</Text>
          </View>
        )}

        {/* Desktop sidebar */}
        {isDesktop && (
          <Sidebar activeTab={activeTab} onTabPress={navigateTab} />
        )}

        {/* Main content */}
        <View style={styles.main}>
          {renderContent()}
        </View>

        {/* Mobile bottom tabs */}
        {!isDesktop && (
          <View style={styles.bottomTabs}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={styles.tabItem}
                  onPress={() => navigateTab(tab.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tabIconWrap, isActive && styles.tabIconWrapActive]}>
                    <Feather name={tab.icon} size={18} color={isActive ? colors.primary : colors.textMuted} />
                  </View>
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  root: { flex: 1, backgroundColor: colors.background },
  main: { flex: 1, overflow: 'hidden' },

  // Mobile header
  mobileHeader: {
    height: 56,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.soft,
  },
  mobileLogoMark: {
    width: 28,
    height: 28,
    borderRadius: radii.xs,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileLogoText: {
    fontFamily,
    fontSize: 18,
    fontWeight: '800' as any,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },

  // Bottom tabs
  bottomTabs: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 84 : 68,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    ...shadows.medium,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabIconWrap: {
    width: 36,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: colors.primaryLight,
  },
  tabLabel: {
    fontFamily,
    fontSize: 10,
    fontWeight: '600' as any,
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700' as any,
  },
});
