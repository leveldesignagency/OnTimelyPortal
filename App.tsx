import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import GuestDashboard from './screens/GuestDashboard';
import ItineraryTimeline from './screens/ItineraryTimeline';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="GuestDashboard" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="GuestDashboard">
          {props => <GuestDashboard {...props} user={currentUser} />}
        </Stack.Screen>
        <Stack.Screen name="ItineraryTimeline" component={ItineraryTimeline} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
}); 