import React from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, isDesktop } from '../utils/theme';

import HousesNavigator from './HousesNavigator';
import ReviewsNavigator from './ReviewsNavigator';
import HousematesNavigator from './HousematesNavigator';
import RightsNavigator from './RightsNavigator';
import HomeNavigator from './HomeNavigator';

const Tab = createBottomTabNavigator();

const NotFoundScreen = ({ navigation }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
    <Text style={[typography.h2, { marginTop: 16 }]}>Oops! Page not found.</Text>
    <Text style={[typography.body, { textAlign: 'center', marginTop: 8, color: colors.textSecondary }]}>
      The link might be broken or the page has moved.
    </Text>
    <TouchableOpacity 
      style={{ marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radii.sm }}
      onPress={() => navigation.navigate('HomeTab')}
    >
      <Text style={{ color: colors.white, fontWeight: '700' }}>Go to Homepage</Text>
    </TouchableOpacity>
  </View>
);

export default function AppNavigator() {
  const { width } = useWindowDimensions();
  const desktop = isDesktop(width);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
          // Hide bottom tab bar on desktop web
          display: (Platform.OS === 'web' && desktop) ? 'none' : 'flex',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            HomeTab: focused ? 'grid' : 'grid-outline',
            HousesTab: focused ? 'business' : 'business-outline',
            ReviewsTab: focused ? 'star' : 'star-outline',
            HousematesTab: focused ? 'people' : 'people-outline',
            RightsTab: focused ? 'shield-checkmark' : 'shield-checkmark-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeNavigator} options={{ title: 'Home' }} />
      <Tab.Screen name="HousesTab" component={HousesNavigator} options={{ title: 'Find a House' }} />
      <Tab.Screen name="ReviewsTab" component={ReviewsNavigator} options={{ title: 'Reviews' }} />
      <Tab.Screen name="RightsTab" component={RightsNavigator} options={{ title: 'Your Rights' }} />
      <Tab.Screen 
        name="NotFound" 
        component={NotFoundScreen} 
        options={{ 
          tabBarButton: () => null,
          title: 'Not Found' 
        }} 
      />
    </Tab.Navigator>
  );
}
