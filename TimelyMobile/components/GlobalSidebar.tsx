import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface Event {
  id: string;
  name: string;
  from: string;
  to: string;
}

interface GlobalSidebarProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  user: any;
  isAdmin: boolean;
  events?: Event[];
  unreadMessages?: number;
}

export default function GlobalSidebar({ 
  isVisible, 
  onClose, 
  onNavigate, 
  user, 
  isAdmin,
  events = [],
  unreadMessages = 0
}: GlobalSidebarProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useState(new Animated.Value(-width * 0.85))[0];
  const [collapsedSections, setCollapsedSections] = useState({
    live: false,
    upcoming: false,
    finished: false
  });

  const handleNavigate = (route: string) => {
    console.log('🔍 GlobalSidebar handleNavigate called with route:', route);
    onNavigate(route);
    onClose();
  };

  // Event status logic matching desktop exactly
  const getEventStatus = (event: Event) => {
    const today = new Date();
    const eventStart = new Date(event.from);
    const eventEnd = new Date(event.to);
    
    // Event is live if today is between start and end dates (inclusive)
    if (today >= eventStart && today <= eventEnd) {
      return 'live';
    }
    
    // Event is upcoming if start date is in the future
    if (today < eventStart) {
      return 'upcoming';
    }
    
    // Event is past if end date has passed
    return 'past';
  };

  // Filter events by status
  const liveEvents = events.filter(e => getEventStatus(e) === 'live');
  const upcomingEvents = events.filter(e => getEventStatus(e) === 'upcoming');
  const pastEvents = events.filter(e => getEventStatus(e) === 'past');

  // Debug logging
  console.log('[GlobalSidebar] Total events:', events.length);
  console.log('[GlobalSidebar] Live events:', liveEvents.length);
  console.log('[GlobalSidebar] Upcoming events:', upcomingEvents.length);
  console.log('[GlobalSidebar] Past events:', pastEvents.length);

  const toggleSection = (section: 'live' | 'upcoming' | 'finished') => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Slide animation effects
  useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width * 0.85,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <Animated.View style={[styles.sidebar, { 
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          transform: [{ translateX: slideAnim }]
        }]}
        onStartShouldSetResponder={() => true}
        onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>TIMELY</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* EVENT MANAGEMENT */}
            <Text style={styles.sectionTitle}>EVENT MANAGEMENT</Text>
            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => handleNavigate('dashboard')}
            >
              <MaterialCommunityIcons name="view-dashboard" size={16} color="#fff" />
              <Text style={styles.navText}>Dashboard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => handleNavigate('create-event')}
            >
              <MaterialCommunityIcons name="plus-circle" size={16} color="#fff" />
              <Text style={styles.navText}>Create Event</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => handleNavigate('teams')}
            >
              <View style={styles.navItemContent}>
                <MaterialCommunityIcons name="account-group" size={16} color="#fff" />
                <Text style={styles.navText}>Workspace</Text>
                {unreadMessages > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationText}>
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* EVENTS */}
            <Text style={styles.sectionTitle}>EVENTS</Text>
            
            {/* LIVE EVENTS */}
            <TouchableOpacity 
              style={styles.eventSectionHeader}
              onPress={() => toggleSection('live')}
            >
              <View style={styles.eventSectionHighlight}>
                <Text style={styles.eventSectionText}>LIVE EVENTS</Text>
              </View>
              <Ionicons 
                name={collapsedSections.live ? "chevron-down" : "chevron-forward"} 
                size={14} 
                color="#fff" 
              />
            </TouchableOpacity>
            
            {!collapsedSections.live && liveEvents.length > 0 && (
              <View style={styles.eventContainer}>
                {liveEvents.map(event => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventItem}
                    onPress={() => {
                      console.log('🔍 Live event pressed:', event.id, event.name);
                      handleNavigate(`event-${event.id}`);
                    }}
                  >
                    <Text style={styles.eventText}>{event.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* UPCOMING EVENTS */}
            <TouchableOpacity 
              style={styles.eventSectionHeader}
              onPress={() => toggleSection('upcoming')}
            >
              <View style={styles.eventSectionHighlight}>
                <Text style={styles.eventSectionText}>UPCOMING EVENTS</Text>
              </View>
              <Ionicons 
                name={collapsedSections.upcoming ? "chevron-down" : "chevron-forward"} 
                size={14} 
                color="#fff" 
              />
            </TouchableOpacity>
            
            {!collapsedSections.upcoming && upcomingEvents.length > 0 && (
              <View style={styles.eventContainer}>
                {upcomingEvents.map(event => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventItem}
                    onPress={() => handleNavigate(`event-${event.id}`)}
                  >
                    <Text style={styles.eventText}>{event.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* FINISHED EVENTS - Only show if there are past events */}
            {pastEvents.length > 0 && (
              <>
                <TouchableOpacity 
                  style={styles.eventSectionHeader}
                  onPress={() => toggleSection('finished')}
                >
                  <View style={styles.eventSectionHighlight}>
                    <Text style={styles.eventSectionText}>FINISHED EVENTS</Text>
                  </View>
                  <Ionicons 
                    name={collapsedSections.finished ? "chevron-down" : "chevron-forward"} 
                    size={14} 
                    color="#fff" 
                  />
                </TouchableOpacity>
                
                {!collapsedSections.finished && pastEvents.length > 0 && (
                  <View style={styles.eventContainer}>
                    {pastEvents.map(event => (
                      <TouchableOpacity
                        key={event.id}
                        style={styles.eventItem}
                        onPress={() => handleNavigate(`event-${event.id}`)}
                      >
                        <Text style={styles.eventText}>{event.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Settings Section */}
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>SETTINGS</Text>
            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => handleNavigate('settings')}
            >
              <MaterialCommunityIcons name="cog" size={16} color="#fff" />
              <Text style={styles.navText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => handleNavigate('help')}
            >
              <MaterialCommunityIcons name="help-circle" size={16} color="#fff" />
              <Text style={styles.navText}>Help Centre</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => handleNavigate('logout')}
            >
              <MaterialCommunityIcons name="logout" size={16} color="#ff4444" />
              <Text style={[styles.navText, styles.signOutText]}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  sidebar: {
    width: width * 0.85,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flex: 1,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingBottom: 20, // Extra padding at bottom for safety
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.7)', // Slightly transparent
    marginBottom: 12,
    marginTop: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  navText: {
    color: '#fff',
    fontSize: 15,
    marginLeft: 10,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  eventSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 4,
  },
  eventSectionHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // TableView highlight
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  eventSectionText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#fff',
  },
  eventContainer: {
    marginLeft: 16,
    marginBottom: 8,
  },
  eventItem: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  eventText: {
    color: '#fff',
    fontSize: 13,
  },

  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  notificationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  signOutText: {
    color: '#ff4444',
  },
}); 