import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

interface TeamCalendarPageProps {
  onNavigate: (route: string) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  team_id?: string;
}

export default function TeamCalendarPage({ onNavigate }: TeamCalendarPageProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);

  useEffect(() => {
    loadEvents();
    checkCalendarConnections();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (userProfile?.company_id) {
        // Load team events
        const { data: eventsData, error } = await supabase
          .from('events')
          .select(`
            id,
            name as title,
            description,
            from as start_date,
            to as end_date,
            team_id
          `)
          .eq('company_id', userProfile.company_id)
          .not('team_id', 'is', null);

        if (error) {
          console.error('Error loading events:', error);
        } else {
          setEvents(eventsData || []);
        }
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCalendarConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for existing calendar connections
      const { data: connections } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', user.id);

      if (connections) {
        setGoogleConnected(connections.some(c => c.provider === 'google'));
        setOutlookConnected(connections.some(c => c.provider === 'outlook'));
      }
    } catch (error) {
      console.error('Error checking calendar connections:', error);
    }
  };

  const connectGoogleCalendar = async () => {
    Alert.alert(
      'Connect Google Calendar',
      'Google Calendar integration will be available in the next update!',
      [{ text: 'OK' }]
    );
    // TODO: Implement Google Calendar OAuth
  };

  const connectOutlookCalendar = async () => {
    Alert.alert(
      'Connect Outlook Calendar',
      'Outlook Calendar integration will be available in the next update!',
      [{ text: 'OK' }]
    );
    // TODO: Implement Outlook Calendar OAuth
  };

  const addNewEvent = () => {
    Alert.alert(
      'Add New Event',
      'Event creation will be available in the next update!',
      [{ text: 'OK' }]
    );
    // TODO: Navigate to event creation form
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventStart = event.start_date.split('T')[0];
      const eventEnd = event.end_date.split('T')[0];
      return dateStr >= eventStart && dateStr <= eventEnd;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday(date) && styles.today,
            isSelected(date) && styles.selectedDay,
          ]}
          onPress={() => setSelectedDate(date)}
        >
          <Text style={[
            styles.dayText,
            isToday(date) && styles.todayText,
            isSelected(date) && styles.selectedDayText,
          ]}>
            {day}
          </Text>
          {dayEvents.length > 0 && (
            <View style={styles.eventIndicator}>
              <Text style={styles.eventCount}>{dayEvents.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return days;
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('teams')} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Calendar</Text>
        <TouchableOpacity style={styles.addButton} onPress={addNewEvent}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Calendar Connection Buttons */}
          <View style={styles.connectionSection}>
            <Text style={styles.sectionTitle}>Calendar Connections</Text>
            <View style={styles.connectionButtons}>
              <TouchableOpacity 
                style={[styles.connectionButton, googleConnected && styles.connectedButton]}
                onPress={connectGoogleCalendar}
              >
                <MaterialCommunityIcons 
                  name="google" 
                  size={20} 
                  color={googleConnected ? "#fff" : "#888"} 
                />
                <Text style={[styles.connectionText, googleConnected && styles.connectedText]}>
                  {googleConnected ? 'Connected' : 'Connect Google'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.connectionButton, outlookConnected && styles.connectedButton]}
                onPress={connectOutlookCalendar}
              >
                <MaterialCommunityIcons 
                  name="microsoft-outlook" 
                  size={20} 
                  color={outlookConnected ? "#fff" : "#888"} 
                />
                <Text style={[styles.connectionText, outlookConnected && styles.connectedText]}>
                  {outlookConnected ? 'Connected' : 'Connect Outlook'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => changeMonth('prev')}>
              <MaterialCommunityIcons name="chevron-left" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{getMonthName(currentMonth)}</Text>
            <TouchableOpacity onPress={() => changeMonth('next')}>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Day Names */}
          <View style={styles.dayNames}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.dayName}>{day}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {renderCalendar()}
          </View>

          {/* Selected Date Events */}
          <View style={styles.eventsSection}>
            <Text style={styles.eventsTitle}>
              Events for {formatDate(selectedDate)}
            </Text>
            
            {selectedDateEvents.length === 0 ? (
              <View style={styles.noEvents}>
                <MaterialCommunityIcons name="calendar-blank" size={48} color="#666" />
                <Text style={styles.noEventsText}>No events scheduled</Text>
              </View>
            ) : (
              selectedDateEvents.map(event => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    <MaterialCommunityIcons name="calendar" size={20} color="#00ff88" />
                    <Text style={styles.eventTitle}>{event.title}</Text>
                  </View>
                  {event.description && (
                    <Text style={styles.eventDescription}>{event.description}</Text>
                  )}
                  <Text style={styles.eventDate}>
                    {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    padding: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  connectionSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  connectionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  connectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  connectedButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  connectionText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  connectedText: {
    color: '#fff',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  dayNames: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingTop: 12,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    margin: 1,
    borderRadius: 8,
  },
  today: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  selectedDay: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  dayText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
  todayText: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#10b981',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCount: {
    fontSize: 10,
    color: '#000',
    fontWeight: 'bold',
  },
  eventsSection: {
    padding: 20,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  noEvents: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
  },
  eventCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  eventDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  eventDate: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
}); 