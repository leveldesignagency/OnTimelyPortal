import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  events: any[];
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

export default function MobileSidebar({ 
  isOpen, 
  onClose, 
  events, 
  onNavigate, 
  onLogout 
}: MobileSidebarProps) {
  const insets = useSafeAreaInsets();
  const [collapsedSections, setCollapsedSections] = useState({
    live: false,
    upcoming: false,
    finished: false
  });

  const getEventStatus = (event: any) => {
    const now = new Date();
    const startDate = new Date(event.from);
    const endDate = new Date(event.to);
    
    if (now >= startDate && now <= endDate) return 'live';
    if (now < startDate) return 'upcoming';
    return 'finished';
  };

  const liveEvents = events.filter(event => getEventStatus(event) === 'live');
  const upcomingEvents = events.filter(event => getEventStatus(event) === 'upcoming');
  const finishedEvents = events.filter(event => getEventStatus(event) === 'finished');

  const toggleSection = (section: 'live' | 'upcoming' | 'finished') => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      
      {/* Sidebar */}
      <View style={[styles.sidebar, { 
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        height: height + insets.top + insets.bottom
      }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>TIMELY</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Event Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EVENT MANAGEMENT</Text>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onNavigate('dashboard');
                onClose();
              }}
            >
              <Text style={styles.navText}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onNavigate('create-event');
                onClose();
              }}
            >
              <Text style={styles.navText}>Create Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onNavigate('teams');
                onClose();
              }}
            >
              <Text style={styles.navText}>Teams</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Live Events */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('live')}
            >
              <Text style={styles.sectionTitle}>LIVE EVENTS</Text>
              <Ionicons
                name={collapsedSections.live ? 'chevron-down' : 'chevron-up'}
                size={16}
                color="#888"
              />
            </TouchableOpacity>
            
            {!collapsedSections.live && liveEvents.length > 0 && (
              <View style={styles.eventContainer}>
                {liveEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventItem}
                    onPress={() => {
                      onNavigate(`event/${event.id}`);
                      onClose();
                    }}
                  >
                    <Text style={styles.eventText}>{event.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Upcoming Events */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('upcoming')}
            >
              <Text style={styles.sectionTitle}>UPCOMING EVENTS</Text>
              <Ionicons
                name={collapsedSections.upcoming ? 'chevron-down' : 'chevron-up'}
                size={16}
                color="#888"
              />
            </TouchableOpacity>
            
            {!collapsedSections.upcoming && upcomingEvents.length > 0 && (
              <View style={styles.eventContainer}>
                {upcomingEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventItem}
                    onPress={() => {
                      onNavigate(`event/${event.id}`);
                      onClose();
                    }}
                  >
                    <Text style={styles.eventText}>{event.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Finished Events */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('finished')}
            >
              <Text style={styles.sectionTitle}>FINISHED EVENTS</Text>
              <Ionicons
                name={collapsedSections.finished ? 'chevron-down' : 'chevron-up'}
                size={16}
                color="#888"
              />
            </TouchableOpacity>
            
            {!collapsedSections.finished && finishedEvents.length > 0 && (
              <View style={styles.eventContainer}>
                {finishedEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventItem}
                    onPress={() => {
                      onNavigate(`event/${event.id}`);
                      onClose();
                    }}
                  >
                    <Text style={styles.eventText}>{event.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Settings & Logout */}
          <View style={styles.section}>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onNavigate('settings');
                onClose();
              }}
            >
              <MaterialCommunityIcons name="cog" size={20} color="#fff" />
              <Text style={styles.navText}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onLogout();
                onClose();
              }}
            >
              <MaterialCommunityIcons name="logout" size={20} color="#fff" />
              <Text style={styles.navText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 0.8,
    backgroundColor: '#1a1a1a',
    zIndex: 1000,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  logo: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginBottom: 4,
  },
  navText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  eventContainer: {
    marginLeft: 16,
  },
  eventItem: {
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 4,
  },
  eventText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
}); 