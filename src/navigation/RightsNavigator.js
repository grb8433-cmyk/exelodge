import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../utils/theme';

import RightsHomeScreen from '../screens/rights/RightsHomeScreen';
import TopicDetailScreen from '../screens/rights/TopicDetailScreen';
import WhatDoIDoScreen from '../screens/rights/WhatDoIDoScreen';
import ExeLodgeHeader from '../components/ExeLodgeHeader';

const Stack = createNativeStackNavigator();

export default function RightsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerTitle: (props) => <ExeLodgeHeader title={props.children} navigation={navigation} />,
        headerTintColor: colors.primary,
        headerBackTitleVisible: false,
        headerStyle: { backgroundColor: colors.white },
        headerShadowVisible: false,
      })}
    >
      <Stack.Screen
        name="RightsHome"
        component={RightsHomeScreen}
        options={{ title: 'Know Your Rights' }}
      />
      <Stack.Screen
        name="TopicDetail"
        component={TopicDetailScreen}
        options={({ route }) => ({ title: route.params?.title || 'Your Rights' })}
      />
      <Stack.Screen
        name="WhatDoIDo"
        component={WhatDoIDoScreen}
        options={{ title: 'What Do I Do If...' }}
      />
    </Stack.Navigator>
  );
}
