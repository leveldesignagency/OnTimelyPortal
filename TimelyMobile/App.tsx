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

import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text, Image, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import GuestDashboard from './screens/GuestDashboard';
import AdminDashboardApp from './screens/AdminDashboardApp';
import CreateEventAppPage from './screens/CreateEventAppPage';
import TeamsPage from './screens/TeamsPage';
import ChatConversationPage from './screens/ChatConversationPage';
import EventDashboardPage from './screens/EventDashboardPage';
import EventLauncherPage from './screens/EventLauncherPage';
import AssignOverviewPage from './screens/AssignOverviewPage';
import EventPortalManagementPage from './screens/EventPortalManagementPage';
import EventHomepageBuilderPage from './screens/EventHomepageBuilderPage';
import PreviewTimelinePage from './screens/PreviewTimelinePage';
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
import GlobalAnnouncementModal from './components/GlobalAnnouncementModal';
import GlobalSidebar from './components/GlobalSidebar';
import GlobalHeader from './components/GlobalHeader';
import { supabase } from './lib/supabase';
import { pushNotificationService } from './lib/pushNotifications';
import { getEventAddOns } from './lib/supabase';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import announcementService, { Announcement } from './lib/announcementService';
import ViewModulesPage from './screens/ViewModulesPage';
import SettingsPage from './screens/SettingsPage';
import CreateItineraryPage from './screens/CreateItineraryPage';
import CreateGuestsPage from './screens/CreateGuestsPage';
import GuestChatAdminScreen from './screens/GuestChatAdminScreen';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [guestProfile, setGuestProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [globalAnnouncement, setGlobalAnnouncement] = useState<Announcement | null>(null);
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [events, setEvents] = useState<any[]>([]);

  const navigationRef = useRef<any>(null);

  // Icon sources
  const icons = {
    Apps: require('./assets/icon__apps.png'),
    Timeline: require('./assets/icon__timeline.png'),
    Dashboard: require('./assets/icon__home.png'),
    Messages: require('./assets/icon__chat.png'),
    Profile: require('./assets/icon__profile.png'),
  };

  useEffect(() => {
    // Initialize app state (no force logout - keep existing sessions)
    console.log('[App.tsx] Initializing app state');
    setLoading(false);
  }, []);

  const isAdmin = user?.role === 'admin' || user?.app_metadata?.user_role === 'admin'; // Check both direct role and app_metadata

  // Fetch events when user is authenticated (like desktop)
  useEffect(() => {
    const fetchEvents = async () => {
      if (!user || !isAdmin) {
        setEvents([]);
        return;
      }

      try {
        console.log('[App.tsx] Fetching events for user:', user.email);
        
        // Get current user with company_id
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser || !authUser.email) {
          setEvents([]);
          return;
        }

        // Fetch user profile with company_id
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single();

        if (userError || !userData) {
          console.error('Error fetching user profile:', userError);
          setEvents([]);
          return;
        }

        // Fetch events for the company (matching desktop app structure)
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('company_id', userData.company_id)
          .order('from', { ascending: true });

        if (eventsError) {
          console.error('Error fetching events:', eventsError);
          setEvents([]);
        } else {
          console.log('[App.tsx] Fetched events:', eventsData?.length || 0);
          setEvents(eventsData || []);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      }
    };

    fetchEvents();
  }, [user, isAdmin]);

  // Initialize push notifications when user and guest profile are available (guest users only)
  useEffect(() => {
    if (user && guestProfile && !isAdmin) {
      initializePushNotifications();
    }
  }, [user, guestProfile, isAdmin]);

  // Show random announcement on first time (guest users only)
  useEffect(() => {
    if (user && guestProfile?.event_id && !isAdmin) {
      const showRandomAnnouncement = async () => {
        try {
          // Check if we've shown an announcement before
          const hasShownAnnouncement = await AsyncStorage.getItem('hasShownAnnouncement');
          
          if (!hasShownAnnouncement) {
            // Get announcements
            const announcements = await announcementService.getAnnouncements(guestProfile.event_id);
            
            if (announcements.length > 0) {
              // Pick a random announcement
              const randomIndex = Math.floor(Math.random() * announcements.length);
              const randomAnnouncement = announcements[randomIndex];
              
              // Show the modal
              setGlobalAnnouncement(randomAnnouncement);
              setShowGlobalModal(true);
              
              // Mark as shown
              await AsyncStorage.setItem('hasShownAnnouncement', 'true');
            }
          }
        } catch (error) {
          console.error('Error showing random announcement:', error);
        }
      };

      showRandomAnnouncement();
    }
  }, [user, guestProfile, isAdmin]);

  // Subscribe to new announcements and show them immediately (guest users only)
  useEffect(() => {
    if (user && guestProfile?.event_id && !isAdmin) {
      console.log('[App.tsx] Setting up announcement subscription for eventId:', guestProfile.event_id);
      console.log('[App.tsx] EventId type:', typeof guestProfile.event_id);
      console.log('[App.tsx] EventId length:', guestProfile.event_id?.length);
      
      const setupAnnouncementSubscription = async () => {
        try {
          console.log('[App.tsx] Calling subscribeToAnnouncements...');
          const subscription = await announcementService.subscribeToAnnouncements(
            guestProfile.event_id,
            (newAnnouncement) => {
              console.log('[App.tsx] Received new announcement:', newAnnouncement);
              // Show the new announcement immediately
              setGlobalAnnouncement(newAnnouncement);
              setShowGlobalModal(true);
            }
          );
          console.log('[App.tsx] Subscription created:', subscription);

          return () => {
            if (subscription && typeof subscription.unsubscribe === 'function') {
              console.log('[App.tsx] Unsubscribing from announcements');
              subscription.unsubscribe();
            }
          };
        } catch (error) {
          console.error('[App.tsx] Error setting up announcement subscription:', error);
        }
      };

      setupAnnouncementSubscription();
    } else {
      console.log('[App.tsx] Not setting up subscription - user:', !!user, 'guestProfile:', !!guestProfile, 'event_id:', guestProfile?.event_id, 'isAdmin:', isAdmin);
    }
  }, [user, guestProfile, isAdmin]);

  // Simplified user fetching - only fetch when explicitly logging in
  const handleLogin = (loggedInUser: any) => {
    console.log('[App.tsx] handleLogin called with user:', loggedInUser);
    
    // Check if this is a guest session (from RPC) or admin user (from Supabase auth)
    if (loggedInUser.role === 'guest') {
      // This is a guest user from RPC login
      console.log('[App.tsx] Guest user logged in');
      setUser(loggedInUser);
      setGuestProfile(loggedInUser); // Guest data is already in the session
    } else {
      // This is an admin user from Supabase auth
      console.log('[App.tsx] Admin user logged in');
      setUser(loggedInUser);
      setGuestProfile(null);
    }
  };

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

  function MessagesScreen({ navigation }: any) {
    return <GuestChatScreen 
      route={{
        params: {
          eventId: guestProfile?.event_id,
          eventName: guestProfile?.event_name || 'Guest Chat',
          guest: guestProfile
        }
      }}
      navigation={navigation}
      onAnnouncementPress={(announcement) => {
        setGlobalAnnouncement(announcement);
        setShowGlobalModal(true);
      }} 
    />;
  }

  function AdminStack() {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen 
          name="AdminDashboard" 
          component={AdminDashboardScreen} 
        />
        <Stack.Screen 
          name="CreateEvent" 
          component={CreateEventScreen} 
        />
        <Stack.Screen 
          name="Teams" 
          component={TeamsScreen} 
        />
        <Stack.Screen 
          name="ChatConversation" 
          component={ChatConversationScreen} 
        />
        <Stack.Screen 
          name="EventDashboard" 
          component={EventDashboardScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="EventLauncher" 
          component={EventLauncherScreen} 
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="AssignOverview" 
          component={AssignOverviewScreen} 
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="EventPortalManagement" 
          component={EventPortalManagementScreen} 
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="EventHomepageBuilder" 
          component={EventHomepageBuilderScreen} 
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="PreviewTimeline" 
          component={PreviewTimelineScreen} 
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="ViewModules" 
          component={ViewModulesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="CreateItinerary" 
          component={CreateItineraryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="CreateGuests" 
          component={CreateGuestsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="GuestChatAdmin" 
          component={GuestChatAdminScreenWrapper}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  function AdminDashboardScreen(props: any) {
    return (
      <AdminDashboardApp 
        {...props} 
        user={user} 
        onLogout={handleAdminLogout} 
        onMenuPress={toggleSidebar}
        onNavigate={(route: string) => {
          if (route === 'create-event') {
            props.navigation.navigate('CreateEvent');
          } else if (route === 'teams') {
            props.navigation.navigate('Teams');
          } else if (route === 'settings') {
            props.navigation.navigate('Settings');
          } else if (route === 'dashboard') {
            props.navigation.navigate('AdminDashboard');
          }
        }}
      />
    );
  }

  function CreateEventScreen(props: any) {
    return (
      <CreateEventAppPage 
        {...props} 
        onNavigate={(route) => {
          if (route === 'dashboard') {
            props.navigation.navigate('AdminDashboard');
          }
        }} 
        onGoBack={() => props.navigation.goBack()} 
        onMenuPress={toggleSidebar}
      />
    );
  }

    function TeamsScreen(props: any) {
    return (
      <TeamsPage
        {...props}
        onNavigate={(route) => {
          if (route === 'dashboard') {
            props.navigation.navigate('AdminDashboard');
          } else if (route.startsWith('chat-conversation-')) {
            const chatId = route.replace('chat-conversation-', '');
            console.log('🔍 TeamsScreen: Navigating to chat:', chatId);
            props.navigation.navigate('ChatConversation', { chatId, chatName: 'Chat' });
          }
        }}
        onMenuPress={toggleSidebar}
      />
    );
  }

  function ChatConversationScreen(props: any) {
    return (
      <ChatConversationPage
        {...props}
        chatId={props.route.params?.chatId || ''}
        chatName={props.route.params?.chatName || 'Chat'}
        onNavigate={(route) => {
          if (route === 'dashboard') {
            props.navigation.navigate('AdminDashboard');
          }
        }}
        onMenuPress={toggleSidebar}
        onGoBack={() => props.navigation.goBack()}
      />
    );
  }

  function EventDashboardScreen(props: any) {
    console.log('🔍 EventDashboardScreen called with props:', props);
    console.log('🔍 EventDashboardScreen route params:', props.route.params);
    
    return (
      <EventDashboardPage
        {...props}
        eventId={props.route.params?.eventId || ''}
        onNavigate={(route: string, params?: any) => {
          console.log('🔍 EventDashboard onNavigate called:', route, params);
          if (route === 'dashboard') {
            props.navigation.navigate('AdminDashboard');
          } else if (route === 'events') {
            props.navigation.navigate('AdminDashboard');
          } else if (route === 'event-launcher') {
            console.log('🔍 EventDashboard navigating to EventLauncher with params:', params);
            props.navigation.navigate('EventLauncher', params);
          } else if (route === 'event-portal-management') {
            console.log('🔍 EventDashboard navigating to EventPortalManagement with params:', params);
            props.navigation.navigate('EventPortalManagement', params);
          } else if (route === 'create-itinerary' || route === 'CreateItinerary') {
            console.log('🔍 EventDashboard navigating to CreateItinerary with params:', params);
            props.navigation.navigate('CreateItinerary', params);
          } else if (route === 'create-guests' || route === 'add-guests' || route === 'CreateGuests') {
            console.log('🔍 EventDashboard navigating to CreateGuests with params:', params);
            props.navigation.navigate('CreateGuests', params);
          } else {
            // Handle other navigation routes
            console.log('EventDashboard navigation:', route, params);
          }
        }}
        onMenuPress={toggleSidebar}
        onGoBack={() => props.navigation.goBack()}
      />
    );
  }

  function EventLauncherScreen(props: any) {
    console.log('🔍 EventLauncherScreen called with props:', props);
    console.log('🔍 EventLauncherScreen route params:', props.route.params);
    console.log('🔍 EventLauncherScreen eventId:', props.route.params?.eventId);
    
    return (
      <EventLauncherPage
        {...props}
        eventId={props.route.params?.eventId || ''}
        onNavigate={(route: string, params?: any) => {
          console.log('🔍 EventLauncher onNavigate called:', route, params);
          if (route === 'dashboard') {
            props.navigation.navigate('AdminDashboard');
          } else if (route === 'events') {
            props.navigation.navigate('AdminDashboard');
          } else if (route === 'assign-overview') {
            props.navigation.navigate('AssignOverview', params);
          } else {
            console.log('EventLauncher navigation:', route, params);
          }
        }}
        onMenuPress={toggleSidebar}
        onGoBack={() => props.navigation.goBack()}
      />
    );
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

  function getAddonIcon(addonKey: string): string {
    const iconMap: { [key: string]: string } = {
      translator: 'language',
      currencyConverter: 'calculator',
      offlineMaps: 'map',
      safetyBeacon: 'shield-checkmark',
      default: 'apps'
    };
    return iconMap[addonKey] || iconMap.default;
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
              <Ionicons 
                name={getAddonIcon(addon.addon_key)} 
                size={48} 
                color="#007AFF" 
                style={{ marginBottom: 10 }}
              />
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 }}>{addon.addon_label || addon.addon_key}</Text>
              <Text style={{ color: '#aaa', fontSize: 13, textAlign: 'center' }}>{addon.addon_description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  function AssignOverviewScreen(props: any) {
    console.log('🔍 AssignOverviewScreen called with props:', props);
    console.log('🔍 AssignOverviewScreen route params:', props.route.params);
    
    return (
      <AssignOverviewPage
        {...props}
        eventId={props.route.params?.eventId || ''}
        guestAssignments={props.route.params?.guestAssignments || {}}
        guests={props.route.params?.guests || []}
        itineraries={props.route.params?.itineraries || []}
        activeAddOns={props.route.params?.activeAddOns || []}
        onNavigate={(route: string, params?: any) => {
          console.log('🔍 AssignOverview onNavigate called:', route, params);
          if (route === 'dashboard') {
            props.navigation.navigate('AdminDashboard');
          } else if (route === 'event-launcher') {
            props.navigation.navigate('EventLauncher', params);
          } else if (route === 'EventPortalManagement') {
            props.navigation.navigate('EventPortalManagement', params);
          } else {
            console.log('AssignOverview navigation:', route, params);
          }
        }}
        onMenuPress={toggleSidebar}
        onGoBack={() => props.navigation.goBack()}
      />
    );
  }

  function EventPortalManagementScreen(props: any) {
    console.log('🔍 EventPortalManagementScreen called with props:', props);
    console.log('🔍 EventPortalManagementScreen route params:', props.route.params);
    
    return (
      <EventPortalManagementPage
        {...props}
        eventId={props.route.params?.eventId || ''}
        guestAssignments={props.route.params?.guestAssignments || {}}
        guests={props.route.params?.guests || []}
        itineraries={props.route.params?.itineraries || []}
        activeAddOns={props.route.params?.activeAddOns || []}
        onNavigate={(route: string, params?: any) => {
          console.log('🔍 EventPortalManagement onNavigate called:', route, params);
          if (route === 'dashboard') {
            props.navigation.navigate('AdminDashboard');
          } else if (route === 'event-launcher') {
            props.navigation.navigate('EventLauncher', params);
          } else if (route === 'assign-overview') {
            props.navigation.navigate('AssignOverview', params);
          } else if (route === 'PreviewTimeline') {
            props.navigation.navigate('PreviewTimeline', params);
          } else if (route === 'event-homepage-builder') {
            props.navigation.navigate('EventHomepageBuilder', params);
          } else if (route === 'guest-chat-admin') {
            props.navigation.navigate('GuestChatAdmin', params);
          } else {
            console.log('EventPortalManagement navigation:', route, params);
          }
        }}
        onMenuPress={toggleSidebar}
        onGoBack={() => props.navigation.goBack()}
      />
    );
  }

  function EventHomepageBuilderScreen(props: any) {
    console.log('🔍 EventHomepageBuilderScreen called with props:', props);
    console.log('🔍 EventHomepageBuilderScreen route params:', props.route.params);
    
    return (
      <EventHomepageBuilderPage
        eventId={props.route.params?.eventId || ''}
        navigation={props.navigation}
        onNavigate={(route: string, params?: any) => {
          console.log('🔍 EventHomepageBuilder onNavigate called:', route, params);
          if (route === 'event-portal-management') {
            props.navigation.navigate('EventPortalManagement', params);
          } else if (route === 'goBack') {
            props.navigation.goBack();
          } else {
            console.log('EventHomepageBuilder navigation:', route, params);
          }
        }}
        onMenuPress={toggleSidebar}
      />
    );
  }

  function GuestChatAdminScreenWrapper(props: any) {
    console.log('🔍 GuestChatAdminScreenWrapper called with props:', props);
    console.log('🔍 GuestChatAdminScreenWrapper route params:', props.route.params);
    
    return (
      <GuestChatAdminScreen
        route={props.route}
        navigation={props.navigation}
        onNavigate={(route: string, params?: any) => {
          console.log('🔍 GuestChatAdmin onNavigate called:', route, params);
          if (route === 'event-portal-management') {
            props.navigation.navigate('EventPortalManagement', params);
          } else {
            console.log('GuestChatAdmin navigation:', route, params);
          }
        }}
        onMenuPress={toggleSidebar}
      />
    );
  }

  function PreviewTimelineScreen(props: any) {
    console.log('🔍 PreviewTimelineScreen called with props:', props);
    console.log('🔍 PreviewTimelineScreen route params:', props.route.params);
    
    return (
      <PreviewTimelinePage
        eventId={props.route.params?.eventId || ''}
        guests={props.route.params?.guests || []}
        itineraries={props.route.params?.itineraries || []}
        activeAddOns={props.route.params?.activeAddOns || []}
      />
    );
  }

  function ViewModulesScreen({ route }: { route: any }) {
    return <ViewModulesPage eventId={route.params?.eventId} />;
  }

  function SettingsScreen(props: any) {
    return (
      <SettingsPage
        {...props}
        onNavigate={(route) => {
          if (route === 'dashboard') {
            props.navigation.navigate('AdminDashboard');
          }
        }}
        onMenuPress={toggleSidebar}
      />
    );
  }

  function CreateItineraryScreen(props: any) {
    const eventId = props.route.params?.eventId || '';
    const itineraryId = props.route.params?.itineraryId;
    return <CreateItineraryPage eventId={eventId} itineraryId={itineraryId} onNavigate={props.navigation.navigate} />;
  }

  function CreateGuestsScreen(props: any) {
    const eventId = props.route.params?.eventId || '';
    const guestId = props.route.params?.guestId;
    return <CreateGuestsPage eventId={eventId} guestId={guestId} onNavigate={props.navigation.navigate} />;
  }


  // Admin logout - uses Supabase auth signOut
  const handleAdminLogout = () => {
    // Force clear all state
    setUser(null);
    setGuestProfile(null);
    setSidebarVisible(false);
    setGlobalAnnouncement(null);
    setShowGlobalModal(false);
    
    // Sign out from Supabase (admin uses Supabase auth)
    supabase.auth.signOut();
  };

  // Guest logout - uses RPC, no Supabase auth signOut
  const handleGuestLogout = () => {
    console.log('[App.tsx] Guest logout called');
    // Force clear all state
    setUser(null);
    setGuestProfile(null);
    setSidebarVisible(false);
    setGlobalAnnouncement(null);
    setShowGlobalModal(false);
    
    // Guest uses RPC, no Supabase auth signOut needed
    console.log('[App.tsx] Guest logout completed');
  };

  const handleGlobalNavigation = (route: string, params?: any) => {
    console.log('Global navigation to:', route);
    
    if (route === 'logout') {
      // Use admin logout for global sidebar (admin only)
      if (isAdmin) {
        handleAdminLogout();
      }
      return;
    }
    
    // Handle navigation for admin routes
    if (isAdmin && navigationRef.current) {
      if (route === 'create-event') {
        navigationRef.current.navigate('CreateEvent');
      } else if (route === 'teams') {
        navigationRef.current.navigate('Teams');
      } else if (route === 'settings') {
        navigationRef.current.navigate('Settings');
      } else if (route === 'dashboard') {
        navigationRef.current.navigate('AdminDashboard');
      } else if (route.startsWith('chat-conversation-')) {
        const chatId = route.replace('chat-conversation-', '');
        console.log('🔍 Navigating to chat conversation:', chatId);
        // We'll need to get the chat name from the chat list, but for now use a default
        navigationRef.current.navigate('ChatConversation', { chatId, chatName: 'Chat' });
              } else if (route.startsWith('event-')) {
          const eventId = route.replace('event-', '');
          console.log('🔍 Navigating to event dashboard:', eventId);
          navigationRef.current.navigate('EventDashboard', { eventId });
        } else if (route === 'event-launcher') {
          const eventId = params?.eventId;
          console.log('🔍 Navigating to event launcher:', eventId);
          navigationRef.current.navigate('EventLauncher', { eventId });
        } else if (route === 'guest-chat-admin') {
          const eventId = params?.eventId;
          const eventName = params?.eventName || 'Admin Chat';
          console.log('🔍 Navigating to guest chat admin:', eventId, eventName);
          navigationRef.current.navigate('GuestChatAdmin', { eventId, eventName });
        }
    }
    
    // Close sidebar after navigation
    setSidebarVisible(false);
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };



  // Track unread messages
  useEffect(() => {
    if (!user || !isAdmin) return;

    const subscription = supabase.channel('unread_messages').on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        // Only count messages not sent by current user
        if (payload.new.sender_id !== user.id) {
          setUnreadMessages(prev => prev + 1);
        }
      }
    ).subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, isAdmin]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Check if user is guest
  const isGuest = user && (user.role === 'guest' || guestProfile);

  if (user && !isAdmin && !guestProfile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', marginHorizontal: 24 }}>
          No guest profile found for your account ({user.email}).\n\nPlease contact support or ensure your email is registered as a guest.
        </Text>
      </View>
    );
  }

    return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GlobalAlertProvider>
          <ThemeProvider>
              <NavigationContainer ref={navigationRef}>
                <StatusBar style="light" />
                {user ? (
                  isAdmin ? (
                    // Admin Dashboard - Full screen without tabs
                    <AdminStack />
                  ) : (
                    // Guest Dashboard - With tabs
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
                    {() => <GuestDashboard guest={guestProfile} onLogout={handleGuestLogout} />}
                  </Tab.Screen>
                  <Tab.Screen name="Messages" component={MessagesScreen} />
                                             <Tab.Screen name="Profile">
                             {() => <GuestsProfile guest={guestProfile} onLogout={handleGuestLogout} />}
                           </Tab.Screen>
                </Tab.Navigator>
                )
              ) : (
                <LoginScreen onLogin={handleLogin} />
              )}
            </NavigationContainer>
            
            {/* Global Sidebar */}
            <GlobalSidebar
              isVisible={sidebarVisible}
              onClose={() => setSidebarVisible(false)}
              onNavigate={handleGlobalNavigation}
              user={user}
              isAdmin={isAdmin}
              events={events}
              unreadMessages={unreadMessages}
            />
            
            </ThemeProvider>
          </GlobalAlertProvider>
                      {globalAnnouncement && showGlobalModal && (
              <GlobalAnnouncementModal
                announcement={globalAnnouncement}
                isVisible={showGlobalModal}
                onClose={() => setShowGlobalModal(false)}
              />
            )}
            

        </GestureHandlerRootView>
      </SafeAreaProvider>
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