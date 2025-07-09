import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import GuestDashboard from './screens/GuestDashboard';
import { ThemeProvider } from './ThemeContext';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import TimelineScreen from './screens/TimelineScreen';

const Tab = createBottomTabNavigator();

function ProfileScreen() {
  return <View style={styles.center}><Text>Profile (Coming Soon)</Text></View>;
}
function MessagesScreen() {
  return <View style={styles.center}><Text>Messages (Coming Soon)</Text></View>;
}
function TimelineTabScreen() {
  return <TimelineScreen guest={user} />;
}
function AppsScreen() {
  return <View style={styles.center}><Text>Apps (Coming Soon)</Text></View>;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (loggedInUser: any) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <NavigationContainer>
      <StatusBar style="auto" />
        {user ? (
          <Tab.Navigator
            initialRouteName="Dashboard"
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarShowLabel: false,
              tabBarStyle: {
                backgroundColor: '#181A20',
                borderTopWidth: 0,
                height: 70,
                paddingBottom: 10,
                paddingTop: 10,
                elevation: 10,
              },
              tabBarIcon: ({ focused, color, size }) => {
                if (route.name === 'Profile') {
                  return <Ionicons name="person-circle" size={28} color={focused ? '#fff' : '#888'} />;
                } else if (route.name === 'Messages') {
                  return <MaterialCommunityIcons name="message-text-outline" size={26} color={focused ? '#fff' : '#888'} />;
                } else if (route.name === 'Dashboard') {
                  return <FontAwesome5 name="home" size={focused ? 36 : 28} color={focused ? '#fff' : '#888'} style={{ marginTop: focused ? -8 : 0 }} />;
                } else if (route.name === 'Timeline') {
                  return <MaterialCommunityIcons name="timeline-clock-outline" size={26} color={focused ? '#fff' : '#888'} />;
                } else if (route.name === 'Apps') {
                  return <Ionicons name="apps" size={28} color={focused ? '#fff' : '#888'} />;
                }
                return null;
              },
            })}
          >
            <Tab.Screen name="Profile" component={ProfileScreen} />
            <Tab.Screen name="Messages" component={MessagesScreen} />
            <Tab.Screen name="Dashboard">
              {() => <GuestDashboard guest={user} onLogout={handleLogout} />}
            </Tab.Screen>
            <Tab.Screen name="Timeline">
              {() => <TimelineScreen guest={user} />}
            </Tab.Screen>
            <Tab.Screen name="Apps" component={AppsScreen} />
          </Tab.Navigator>
        ) : (
          <LoginScreen onLogin={handleLogin} />
        )}
      </NavigationContainer>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181A20',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181A20',
  },
});
