import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import GlobalHeader from '../components/GlobalHeader';
// Using system fonts instead of Google Fonts

const { width, height } = Dimensions.get('window');

interface AdminDashboardProps {
  user?: any;
  onLogout?: () => void;
  navigation?: any;
  route?: any;
  onMenuPress?: () => void;
}

export default function AdminDashboard({ user, onLogout, navigation, route, onMenuPress }: AdminDashboardProps) {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [stats, setStats] = useState({
    totalEvents: 0,
    liveEvents: 0,
    upcomingEvents: 0,
    pastEvents: 0,
    totalGuests: 0,
    totalStaff: 0,
  });

  // No need to load fonts since we're using system fonts
  const fontsLoaded = true;

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      console.log('[AdminDashboard] Starting data fetch...');
      setLoading(true);
      
      // Get current user with company_id
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('[AdminDashboard] Auth user:', authUser?.email);
      
      if (!authUser || !authUser.email) {
        Alert.alert('Error', 'No authenticated user found');
        return;
      }

      // Fetch user profile with company_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .single();

      console.log('[AdminDashboard] User data:', userData, 'Error:', userError);

      if (userError || !userData) {
        console.error('Error fetching user profile:', userError);
        Alert.alert('Error', 'Failed to load user profile');
        return;
      }

      setUserProfile(userData);

      // Fetch events for the company (matching desktop app structure)
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('company_id', userData.company_id)
        .order('from', { ascending: true });

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
      } else {
        setEvents(eventsData || []);
      }

      // Fetch guests for the company
      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select('*')
        .eq('company_id', userData.company_id);

      if (guestsError) {
        console.error('Error fetching guests:', guestsError);
      } else {
        setGuests(guestsData || []);
      }

      // Fetch staff members for the company
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', userData.company_id);

      if (staffError) {
        console.error('Error fetching staff:', staffError);
      } else {
        setStaff(staffData || []);
      }

      // Try to fetch recent activity - handle case where table doesn't exist
      try {
        const { data: activityData, error: activityError } = await supabase
          .from('activity_log')
          .select('*')
          .eq('company_id', userData.company_id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (activityError) {
          console.log('Activity log table not found, skipping activity fetch');
          setRecentActivity([]);
        } else {
          setRecentActivity(activityData || []);
        }
      } catch (error) {
        console.log('Activity fetch failed, continuing without activity data');
        setRecentActivity([]);
      }

      // Calculate stats
      const now = new Date();
      const liveEvents = eventsData?.filter((event: any) => {
        const startDate = new Date(event.from);
        const endDate = new Date(event.to);
        return now >= startDate && now <= endDate;
      }).length || 0;

      const upcomingEvents = eventsData?.filter((event: any) => {
        const startDate = new Date(event.from);
        return now < startDate;
      }).length || 0;

      const pastEvents = eventsData?.filter((event: any) => {
        const endDate = new Date(event.to);
        return now > endDate;
      }).length || 0;

      setStats({
        totalEvents: eventsData?.length || 0,
        liveEvents,
        upcomingEvents,
        pastEvents,
        totalGuests: guestsData?.length || 0,
        totalStaff: staffData?.length || 0,
      });
          } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load dashboard data');
      } finally {
        console.log('[AdminDashboard] Data fetch complete, setting loading to false');
        setLoading(false);
      }
    };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const handleNavigate = (route: string) => {
    // Handle navigation to different routes
    console.log('Navigate to:', route);
    if (navigation) {
      if (route === 'create-event') {
        navigation.navigate('CreateEvent');
      } else if (route === 'teams') {
        navigation.navigate('Teams');
      } else if (route === 'dashboard') {
        navigation.navigate('AdminDashboard');
      }
    }
  };

  const getGlassCardStyle = () => ({
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  });

  const getEventStatus = (event: any) => {
    const now = new Date();
    const startDate = new Date(event.from);
    const endDate = new Date(event.to);
    
    if (now >= startDate && now <= endDate) return 'live';
    if (now < startDate) return 'upcoming';
    return 'finished';
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'live': return '#10b981';
      case 'upcoming': return '#f59e0b';
      case 'finished': return '#ef4444';
      default: return '#666';
    }
  };

  const formatActivityMessage = (activity: any) => {
    // Convert database action types to user-friendly messages
    const action = activity.action_type || 'Activity';
    const eventName = activity.details?.event_title || '';
    
    // Map common action types to user-friendly messages
    const actionMap: { [key: string]: string } = {
      'event_created': 'Created event',
      'event_updated': 'Updated event',
      'event_deleted': 'Deleted event',
      'guest_added': 'Added guest',
      'guest_updated': 'Updated guest',
      'guest_removed': 'Removed guest',
      'itinerary_created': 'Created itinerary',
      'itinerary_updated': 'Updated itinerary',
      'itinerary_deleted': 'Deleted itinerary',
      'team_created': 'Created team',
      'team_updated': 'Updated team',
      'team_deleted': 'Deleted team',
      'user_joined': 'User joined',
      'user_left': 'User left',
      'notification_sent': 'Sent notification',
      'report_generated': 'Generated report',
      'settings_updated': 'Updated settings',
      'login': 'User logged in',
      'logout': 'User logged out',
      'guests_added': 'Added guests',
      'guests_updated': 'Updated guests',
      'guests_removed': 'Removed guests',
    };

    // Get user-friendly action text
    const friendlyAction = actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Combine action with event name if available
    if (eventName) {
      return `${friendlyAction} for "${eventName}"`;
    }
    
    return friendlyAction;
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  console.log('[AdminDashboard] Rendering with:', { 
    loading, 
    userProfile, 
    events: events.length, 
    stats 
  });

  return (
    <View style={styles.container}>
      {/* Global Header */}
      <GlobalHeader
        title="Admin Dashboard"
        onMenuPress={onMenuPress}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, getGlassCardStyle()]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="calendar-multiple" size={24} color="#10b981" />
            </View>
            <Text style={styles.statNumber}>{stats.totalEvents}</Text>
            <Text style={styles.statLabel}>Total Events</Text>
          </View>

          <View style={[styles.statCard, getGlassCardStyle()]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="account-group" size={24} color="#10b981" />
            </View>
            <Text style={styles.statNumber}>{stats.totalGuests}</Text>
            <Text style={styles.statLabel}>Total Guests</Text>
          </View>

          <View style={[styles.statCard, getGlassCardStyle()]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="account-hard-hat" size={24} color="#10b981" />
            </View>
            <Text style={styles.statNumber}>{stats.totalStaff}</Text>
            <Text style={styles.statLabel}>Staff Members</Text>
          </View>

          <View style={[styles.statCard, getGlassCardStyle()]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="play-circle" size={24} color="#10b981" />
            </View>
            <Text style={styles.statNumber}>{stats.liveEvents}</Text>
            <Text style={styles.statLabel}>Live Events</Text>
          </View>

          <View style={[styles.statCard, getGlassCardStyle()]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="calendar-clock" size={24} color="#10b981" />
            </View>
            <Text style={styles.statNumber}>{stats.upcomingEvents}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>

          <View style={[styles.statCard, getGlassCardStyle()]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="calendar-check" size={24} color="#10b981" />
            </View>
            <Text style={styles.statNumber}>{stats.pastEvents}</Text>
            <Text style={styles.statLabel}>Finished Events</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={[styles.actionCard, getGlassCardStyle()]}
              onPress={() => handleNavigate('create-event')}
            >
              <MaterialCommunityIcons name="plus-circle" size={32} color="#10b981" />
              <Text style={styles.actionText}>Create Event</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, getGlassCardStyle()]}
              onPress={() => handleNavigate('teams')}
            >
              <MaterialCommunityIcons name="account-group" size={32} color="#10b981" />
              <Text style={styles.actionText}>Workspace</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, getGlassCardStyle()]}>
              <MaterialCommunityIcons name="account-multiple" size={32} color="#10b981" />
              <Text style={styles.actionText}>Manage Guests</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, getGlassCardStyle()]}>
              <MaterialCommunityIcons name="help-circle" size={32} color="#10b981" />
              <Text style={styles.actionText}>Help Centre</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Events</Text>
          {loading ? (
            <View style={[styles.loadingCard, getGlassCardStyle()]}>
              <Text style={styles.loadingText}>Loading events...</Text>
            </View>
          ) : events.length === 0 ? (
            <View style={[styles.emptyCard, getGlassCardStyle()]}>
              <MaterialCommunityIcons name="calendar-blank" size={48} color="#666" />
              <Text style={styles.emptyText}>No events found</Text>
              <Text style={styles.emptySubtext}>Create your first event to get started</Text>
            </View>
          ) : (
            events.slice(0, 5).map((event, index) => {
              const status = getEventStatus(event);
              return (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.eventCard, getGlassCardStyle()]}
                  onPress={() => {
                    if (navigation && navigation.navigate) {
                      navigation.navigate('EventDashboard', { eventId: event.id });
                    }
                  }}
                >
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>{event.name}</Text>
                    <View style={[
                      styles.eventStatus,
                      { backgroundColor: getEventStatusColor(status) }
                    ]}>
                      <Text style={styles.eventStatusText}>
                        {status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.eventDate}>
                    {new Date(event.from).toLocaleDateString()} - {new Date(event.to).toLocaleDateString()}
                  </Text>
                  <Text style={styles.eventDescription} numberOfLines={2}>
                    {event.description || 'No description available'}
                  </Text>
                  {event.location && (
                    <Text style={styles.eventLocation}>
                      📍 {event.location}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {loading ? (
            <View style={[styles.loadingCard, getGlassCardStyle()]}>
              <Text style={styles.loadingText}>Loading activity...</Text>
            </View>
          ) : recentActivity.length === 0 ? (
            <View style={[styles.emptyCard, getGlassCardStyle()]}>
              <MaterialCommunityIcons name="clock-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>No recent activity</Text>
              <Text style={styles.emptySubtext}>Activity will appear here as you use the app</Text>
            </View>
          ) : (
            recentActivity.map((activity, index) => (
              <View key={activity.id || index} style={[styles.activityCard, getGlassCardStyle()]}>
                <View style={styles.activityHeader}>
                  <MaterialCommunityIcons 
                    name="circle-small" 
                    size={24} 
                    color="#10b981" 
                  />
                  <Text style={styles.activityText}>
                    {formatActivityMessage(activity)}
                  </Text>
                </View>
                <Text style={styles.activityTime}>
                  {getRelativeTime(activity.created_at)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
  },
  header: {
    margin: 16,
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.8,
  },
  userName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20, // Add bottom padding for better scrolling
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: (width - 48) / 2,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 48) / 2,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
  },
  eventCard: {
    padding: 16,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  eventStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  eventDate: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.8,
    marginBottom: 8,
  },
  eventDescription: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.9,
    lineHeight: 20,
  },
  eventLocation: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.7,
    marginTop: 4,
  },
  activityCard: {
    padding: 16,
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
    marginLeft: 8,
  },
  activityTime: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.6,
    marginLeft: 32,
  },
}); 