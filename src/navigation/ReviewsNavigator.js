import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../utils/theme';

import ReviewsListScreen from '../screens/reviews/ReviewsListScreen';
import LandlordProfileScreen from '../screens/reviews/LandlordProfileScreen';
import SubmitReviewScreen from '../screens/reviews/SubmitReviewScreen';
import ExeLodgeHeader from '../components/ExeLodgeHeader';

const Stack = createNativeStackNavigator();

export default function ReviewsNavigator() {
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
        name="ReviewsList"
        component={ReviewsListScreen}
        options={{ title: 'Landlord Reviews' }}
      />
      <Stack.Screen
        name="LandlordProfile"
        component={LandlordProfileScreen}
        options={{ title: 'Landlord Profile' }}
      />
      <Stack.Screen
        name="SubmitReview"
        component={SubmitReviewScreen}
        options={{ title: 'Write a Review' }}
      />
    </Stack.Navigator>
  );
}
