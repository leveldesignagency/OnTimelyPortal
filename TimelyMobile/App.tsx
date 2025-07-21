import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text, Image } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import GuestDashboard from './screens/GuestDashboard';
import { ThemeProvider } from './ThemeContext';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import TimelineScreen from './screens/TimelineScreen';
import GuestsProfile from './screens/GuestsProfile';
import { supabase } from './lib/supabase';
import { pushNotificationService } from './lib/pushNotifications';
import { getEventAddOns } from './lib/supabase';

const Tab = createBottomTabNavigator();

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
    // Initialize push notifications
    initializePushNotifications();
    
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
        // Save token to Supabase
        await pushNotificationService.savePushTokenToSupabase(user.id, user.email);
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  };

  function MessagesScreen() {
    return <View style={styles.center}><Text>Messages (Coming Soon)</Text></View>;
  }
  function AppsScreen() {
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
            <View
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
            >
              <Text style={{ fontSize: 38, marginBottom: 10 }}>{addon.addon_icon || '🧩'}</Text>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 }}>{addon.addon_label || addon.addon_key}</Text>
              <Text style={{ color: '#aaa', fontSize: 13, textAlign: 'center' }}>{addon.addon_description}</Text>
            </View>
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
            })}
          >
            {/* Order: Apps, Timeline, Dashboard (Home), Messages (Chat), Profile (right to left) */}
            <Tab.Screen name="Apps" component={AppsScreen} />
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
