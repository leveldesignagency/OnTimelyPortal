import 'react-native-get-random-values';

// TextEncoder polyfill for React Native
if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = class TextEncoder {
    encoding = 'utf-8';
    encode(str: string) {
      const utf8: number[] = [];
      for (let i = 0; i < str.length; i++) {
        let charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
        } else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
        } else {
          i++;
          charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3f));
          utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
        }
      }
      return new Uint8Array(utf8);
    }
    encodeInto() {
      throw new Error('encodeInto not implemented');
    }
  };
}

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text, Image, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import LoginScreen from './screens/LoginScreen';
import GuestDashboard from './screens/GuestDashboard';
import { ThemeProvider } from './ThemeContext';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import TimelineScreen from './screens/TimelineScreen';
import GuestsProfile from './screens/GuestsProfile';
import GuestChatScreen from './screens/GuestChatScreen';
import TranslatorScreen from './screens/TranslatorScreen';
import CurrencyConverterScreen from './screens/CurrencyConverterScreen';
import OfflineMapsScreen from './screens/OfflineMapsScreen';
import SOSScreen from './screens/SOSScreen';
import GlobalAlertProvider from './components/GlobalAlertProvider';
import { supabase } from './lib/supabase';
import { pushNotificationService } from './lib/pushNotifications';
import { getEventAddOns } from './lib/supabase';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [guestProfile, setGuestProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Icon sources
  const icons = {
    Apps: require('./assets/icon__apps.png'),
    Timeline: require('./assets/icon__timeline.png'),
    Dashboard: require('./assets/icon__home.png'),
    Messages: require('./assets/icon__chat.png'),
    Profile: require('./assets/icon__profile.png'),
  };

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize push notifications when user and guest profile are available
  useEffect(() => {
    if (user && guestProfile) {
      initializePushNotifications();
    }
  }, [user, guestProfile]);

  // Fetch guest profile after login
  useEffect(() => {
    if (user && user.email) {
      setLoading(true);
      supabase
        .from('guests')
        .select('*')
        .eq('email', user.email)
        .single()
        .then(({ data, error }) => {
          console.log('[DEBUG] Guest fetch:', { data, error, email: user.email });
          if (error) {
            setGuestProfile(null);
          } else {
            setGuestProfile(data);
          }
          setLoading(false);
        });
    } else {
      setGuestProfile(null);
      setLoading(false);
    }
  }, [user]);

  // Initialize push notifications
  const initializePushNotifications = async () => {
    try {
      // Register for push notifications
      const token = await pushNotificationService.registerForPushNotifications();
      
      if (token && user) {
        // For guests, use email; for regular users, use user.id
        if (guestProfile?.email) {
          await pushNotificationService.savePushTokenToSupabase(user.id, guestProfile.email);
        } else {
          await pushNotificationService.savePushTokenToSupabase(user.id);
        }
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  };

  function MessagesScreen() {
    return <GuestChatScreen guest={guestProfile} />;
  }
  function AppsStack() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AppsList" component={AppsListScreen} />
        <Stack.Screen name="Translator" component={TranslatorScreen} />
        <Stack.Screen name="CurrencyConverter" component={CurrencyConverterScreen} />
        <Stack.Screen name="OfflineMaps" component={OfflineMapsScreen} />
        <Stack.Screen name="SOS" component={SOSScreen} />
      </Stack.Navigator>
    );
  }

  function AppsListScreen({ navigation }: { navigation: any }) {
    // DEBUG: Log guestProfile and eventId
    console.log('[AppsScreen] guestProfile:', guestProfile);
    const [addOns, setAddOns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const eventId = guestProfile?.event_id;
    const email = guestProfile?.email;

    useEffect(() => {
      if (!eventId || !email) return;
      setLoading(true);
      getEventAddOns(eventId, email)
        .then((data: any[]) => {
          console.log('[AppsScreen] fetched add-ons:', data);
          setAddOns(data.filter((a: any) => a.enabled));
          setLoading(false);
        })
        .catch((err) => {
          console.error('[AppsScreen] error fetching add-ons:', err);
          setLoading(false);
        });
    }, [eventId, email]);

    // NOTE: AppsScreen is currently defined inline in App.tsx. You can extract it to its own file (e.g., screens/AppScreen.tsx) if you want a dedicated component file.
    if (loading) {
      return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;
    }
    if (!addOns.length) {
      return <View style={styles.center}><Text style={{ color: '#fff', fontSize: 18 }}>No apps enabled for this event.</Text></View>;
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#181A20', padding: 16, paddingTop: 64 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {addOns.map((addon, idx) => (
            <TouchableOpacity
              key={addon.addon_key}
              style={{
                width: '47%',
                aspectRatio: 1,
                backgroundColor: '#23242b',
                borderRadius: 20,
                marginBottom: 16,
                padding: 18,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (addon.addon_key === 'translator') {
                  // Navigate to translator screen
                  navigation.navigate('Translator');
                } else if (addon.addon_key === 'currencyConverter') {
                  // Navigate to currency converter screen
                  navigation.navigate('CurrencyConverter');
                } else if (addon.addon_key === 'offlineMaps') {
                  // Navigate to offline maps screen
                  navigation.navigate('OfflineMaps');
                } else if (addon.addon_key === 'safetyBeacon') {
                  // Navigate to SOS screen
                  navigation.navigate('SOS');
                } else {
                  Alert.alert('Coming Soon', `${addon.addon_label || addon.addon_key} will be available soon!`);
                }
              }}
            >
              <Text style={{ fontSize: 38, marginBottom: 10 }}>{addon.addon_icon || '🧩'}</Text>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 }}>{addon.addon_label || addon.addon_key}</Text>
              <Text style={{ color: '#aaa', fontSize: 13, textAlign: 'center' }}>{addon.addon_description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  const handleLogin = (loggedInUser: any) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (user && !guestProfile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', marginHorizontal: 24 }}>
          No guest profile found for your account ({user.email}).\n\nPlease contact support or ensure your email is registered as a guest.
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GlobalAlertProvider>
        <ThemeProvider>
          <NavigationContainer>
          <StatusBar style="light" />
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
                tabBarIcon: ({ focused }) => {
                  const iconName = route.name as keyof typeof icons;
                  const iconSource = icons[iconName];
                  return (
                    <Image
                      source={iconSource}
                      style={{
                        width: focused ? 34 : 28,
                        height: focused ? 34 : 28,
                        tintColor: focused ? '#fff' : '#888',
                        marginTop: focused ? -4 : 0,
                        resizeMode: 'contain',
                      }}
                    />
                  );
                },
                tabBarButton: (props) => (
                  <View
                    {...props}
                    onTouchEnd={(e) => {
                      // Add haptic feedback on tab press
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      // Call the original onPress if it exists
                      if (props.onPress) {
                        props.onPress(e);
                      }
                    }}
                  />
                ),
              })}
            >
              {/* Order: Apps, Timeline, Dashboard (Home), Messages (Chat), Profile (right to left) */}
              <Tab.Screen name="Apps" component={AppsStack} />
              <Tab.Screen name="Timeline">
                {() => <TimelineScreen guest={guestProfile} />}
              </Tab.Screen>
              <Tab.Screen name="Dashboard">
                {() => <GuestDashboard guest={guestProfile} onLogout={handleLogout} />}
              </Tab.Screen>
              <Tab.Screen name="Messages" component={MessagesScreen} />
              <Tab.Screen name="Profile">
                {() => <GuestsProfile guest={guestProfile} />}
              </Tab.Screen>
            </Tab.Navigator>
          ) : (
            <LoginScreen onLogin={handleLogin} />
          )}
        </NavigationContainer>
        </ThemeProvider>
      </GlobalAlertProvider>
    </GestureHandlerRootView>
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
