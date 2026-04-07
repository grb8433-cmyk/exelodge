import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import Sidebar from './src/components/Sidebar';
import HomeScreen from './src/screens/HomeScreen';
import OverviewScreen from './src/screens/OverviewScreen';
import ReviewsScreen from './src/screens/ReviewsScreen';
import RightsScreen from './src/screens/RightsScreen';
import PropertyDetailScreen from './src/screens/PropertyDetailScreen';
import SubmitReviewScreen from './src/screens/SubmitReviewScreen';
import { colors, typography, shadows, radii } from './src/utils/theme';

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [landlordIdForReview, setLandlordIdForReview] = useState<string | null>(null);
  const [targetLandlordId, setTargetLandlordId] = useState<string | null>(null);
  
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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
      case 'Home':
        return <OverviewScreen onNavigateToHouses={() => setActiveTab('Houses')} />;
      case 'Houses':
        return <HomeScreen onSelectProperty={(id) => setSelectedPropertyId(id)} />;
      case 'Reviews':
        return (
          <ReviewsScreen 
            initialLandlordId={targetLandlordId} 
            onAddReview={(id) => setLandlordIdForReview(id)} 
          />
        );
      case 'Rights':
        return <RightsScreen />;
      default:
        return <OverviewScreen onNavigateToHouses={() => setActiveTab('Houses')} />;
    }
  };

  const MobileBottomTabs = () => (
    <View style={styles.bottomTabContainer}>
      {[
        { id: 'Home', label: 'Overview', emoji: '🏠' },
        { id: 'Houses', label: 'Houses', emoji: '🏢' },
        { id: 'Reviews', label: 'Reviews', emoji: '⭐' },
        { id: 'Rights', label: 'Rights', emoji: '🛡️' }
      ].map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity 
            key={tab.id} 
            onPress={() => {
              setSelectedPropertyId(null);
              setLandlordIdForReview(null);
              setActiveTab(tab.id);
            }}
            style={styles.tabItem}
          >
            <Text style={{ fontSize: 24, opacity: isActive ? 1 : 0.6 }}>{tab.emoji}</Text>
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { flexDirection: isDesktop ? 'row' : 'column' }]}>
        {!isDesktop && (
          <View style={styles.mobileHeader}>
            <Text style={styles.logoText}>ExeLodge</Text>
          </View>
        )}
        
        {isDesktop && (
          <Sidebar 
            activeTab={activeTab} 
            onTabPress={(tab) => {
              setSelectedPropertyId(null);
              setLandlordIdForReview(null);
              setActiveTab(tab);
            }} 
          />
        )}
        
        <View style={styles.mainContent}>
          {renderContent()}
        </View>

        {!isDesktop && <MobileBottomTabs />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, backgroundColor: colors.background },
  mainContent: { flex: 1, height: '100%' },
  mobileHeader: {
    height: 60,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.soft,
  },
  logoText: {
    ...typography.logo,
    fontSize: 22,
    color: colors.primary,
  },
  bottomTabContainer: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 85 : 70,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    ...shadows.medium,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 4,
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: '700',
  }
});
