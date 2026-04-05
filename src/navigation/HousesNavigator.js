import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../utils/theme';

import HouseListScreen from '../screens/houses/HouseListScreen';
import HouseDetailScreen from '../screens/houses/HouseDetailScreen';
import FilterScreen from '../screens/houses/FilterScreen';
import ExeLodgeHeader from '../components/ExeLodgeHeader';

const Stack = createNativeStackNavigator();

export default function HousesNavigator() {
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
        name="HouseList"
        component={HouseListScreen}
        options={{ title: 'Find a House' }}
      />
      <Stack.Screen
        name="HouseDetail"
        component={HouseDetailScreen}
        options={{ title: 'Property Details' }}
      />
      <Stack.Screen
        name="Filter"
        component={FilterScreen}
        options={{
          title: 'Filter Properties',
          presentation: 'modal',
          headerStyle: { backgroundColor: colors.white },
        }}
      />
    </Stack.Navigator>
  );
}
