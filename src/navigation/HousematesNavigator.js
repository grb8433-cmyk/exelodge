import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../utils/theme';

import BrowseProfilesScreen from '../screens/housemates/BrowseProfilesScreen';
import MyProfileScreen from '../screens/housemates/MyProfileScreen';
import CreateEditProfileScreen from '../screens/housemates/CreateEditProfileScreen';
import MatchesScreen from '../screens/housemates/MatchesScreen';
import ExeLodgeHeader from '../components/ExeLodgeHeader';

const Stack = createNativeStackNavigator();

export default function HousematesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitle: (props) => <ExeLodgeHeader title={props.children} />,
        headerTintColor: colors.primary,
        headerBackTitleVisible: false,
        headerStyle: { backgroundColor: colors.white },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="BrowseProfiles"
        component={BrowseProfilesScreen}
        options={{ title: 'Find Housemates (beta)' }}
      />
      <Stack.Screen
        name="MyProfile"
        component={MyProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen
        name="CreateEditProfile"
        component={CreateEditProfileScreen}
        options={{ title: 'Create Profile' }}
      />
      <Stack.Screen
        name="Matches"
        component={MatchesScreen}
        options={{ title: 'My Matches' }}
      />
    </Stack.Navigator>
  );
}
