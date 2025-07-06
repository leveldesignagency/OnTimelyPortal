import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { supabase } from '../lib/supabase';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const HOUR_HEIGHT = 200; // px per hour
const TIMELINE_WIDTH = 2;
const DOT_SIZE = 18;
const TIME_LABEL_WIDTH = 60;
const TIMELINE_HEIGHT = 24 * HOUR_HEIGHT; // Full 24 hours

// Get Y position for a given time (hours and minutes)
function getYForTime(hours: number, minutes: number = 0, seconds: number = 0) {
  const totalHours = hours + minutes / 60 + seconds / 3600;
  return totalHours * HOUR_HEIGHT;
}

export default function TimelineScreen({ guest }: { guest: any }) {
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const scrollViewRef = useRef<ScrollView>(null);
  const timeScrollViewRef = useRef<ScrollView>(null);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch itineraries for selected date
  useEffect(() => {
    async function fetchItineraries() {
      if (!guest?.event_id || !guest?.id) return;
      setLoading(true);
      
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('event_id', guest.event_id)
        .eq('date', selectedDateStr)
        .order('start_time', { ascending: true });
        
      setItineraries(data || []);
      setLoading(false);
    }
    fetchItineraries();
  }, [guest, selectedDate]);

  // Auto-scroll to keep current time centered
  useEffect(() => {
    if (!scrollViewRef.current || !timeScrollViewRef.current) return;
    
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    
    // Debug logging
    console.log('=== SCROLL DEBUG ===');
    console.log('Current device time:', currentTime.toLocaleTimeString());
    console.log('Hours:', hours, 'Minutes:', minutes, 'Seconds:', seconds);
    
    const currentY = getYForTime(hours, minutes, seconds);
    const centerOffset = SCREEN_HEIGHT / 2;
    const scrollTarget = currentY - centerOffset;
    
    console.log('Current Y position:', currentY);
    console.log('Screen height:', SCREEN_HEIGHT);
    console.log('Center offset:', centerOffset);
    console.log('Scroll target:', scrollTarget);
    console.log('==================');
    
    // Scroll both ScrollViews to the same position
    scrollViewRef.current.scrollTo({
      y: scrollTarget,
      animated: true,
    });
    timeScrollViewRef.current.scrollTo({
      y: scrollTarget,
      animated: true,
    });
  }, [currentTime]);

  // Date navigation functions
  const goToPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setSelectedDate(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Time labels - Live Digital Clock */}
        <View style={{ width: TIME_LABEL_WIDTH + 15, paddingRight: 12, paddingLeft: 15 }}>
          <ScrollView
            ref={timeScrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ height: TIMELINE_HEIGHT }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          >
            {Array.from({ length: 24 * 4 }).map((_, i) => { // Every 15 minutes
              const totalMinutes = i * 15;
              const hours = Math.floor(totalMinutes / 60);
              const minutes = totalMinutes % 60;
              const y = getYForTime(hours, minutes);
              
              return (
                <Text
                  key={i}
                  style={[
                    styles.timeLabel,
                    {
                      position: 'absolute',
                      top: y - 8, // Center the label on the time position
                    }
                  ]}
                >
                  {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
                </Text>
              );
            })}
          </ScrollView>
        </View>

        {/* Timeline */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ height: TIMELINE_HEIGHT, alignItems: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          {/* Vertical timeline line */}
          <View style={styles.timelineLine} />
          
          {/* Current time indicator */}
          <View
            style={[
              styles.currentTimeIndicator,
              { top: getYForTime(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds()) }
            ]}
          />

          {/* Itinerary items */}
          {itineraries.map((item) => {
            const [hours, minutes] = item.start_time.split(':').map(Number);
            const y = getYForTime(hours, minutes);
            
            // Check if item is currently active (within its time range)
            const now = new Date();
            const itemDate = new Date(selectedDate);
            const startTime = new Date(itemDate);
            const endTime = new Date(itemDate);
            const [startHours, startMinutes] = item.start_time.split(':').map(Number);
            const [endHours, endMinutes] = item.end_time.split(':').map(Number);
            
            startTime.setHours(startHours, startMinutes, 0, 0);
            endTime.setHours(endHours, endMinutes, 0, 0);
            
            const isActive = now >= startTime && now <= endTime && 
                           selectedDate.toDateString() === now.toDateString();
            
            return (
              <View key={item.id} style={[styles.itemContainer, { top: y }]}>
                {isActive ? (
                  // Active item - show full card
                  <>
                    <View style={styles.dot} />
                    <BlurView intensity={60} tint="light" style={styles.timelineCard}>
                      <Text style={styles.title}>{item.title}</Text>
                      <Text style={styles.time}>{item.start_time} - {item.end_time}</Text>
                      {item.location && <Text style={styles.location}>{item.location}</Text>}
                    </BlurView>
                  </>
                ) : (
                  // Inactive item - show small circle milestone
                  <View style={styles.milestoneContainer}>
                    <View style={styles.milestone} />
                    <Text style={styles.milestoneTitle}>{item.title}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
      
      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
          <Text style={styles.navArrow}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        
        <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
          <Text style={styles.navArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  timelineLine: {
    position: 'absolute',
    left: (SCREEN_WIDTH / 2) - (TIME_LABEL_WIDTH + 15 + 12) - (TIMELINE_WIDTH / 2),
    top: 0,
    bottom: 0,
    width: TIMELINE_WIDTH,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 2,
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: -TIME_LABEL_WIDTH - 15 - 12,
    right: 0,
    height: 2,
    backgroundColor: '#0080ff',
    shadowColor: '#0080ff',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    zIndex: 1,
  },
  timeLabel: {
    color: '#fff',
    opacity: 0.6,
    fontSize: 14,
    textAlign: 'right',
    fontWeight: '500',
  },
  itemContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 5,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#fff',
    marginBottom: 8,
  },
  milestoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: -8, // Position exactly on the timeline center
    zIndex: 3,
  },
  milestone: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#0080ff',
    shadowColor: '#0080ff',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    // Add inner glow effect
    elevation: 8,
  },
  milestoneTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 12,
    opacity: 0.8,
  },
  timelineCard: {
    minWidth: 200,
    maxWidth: 280,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  location: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.6,
    marginTop: 2,
  },
  dateNavigation: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    padding: 8,
  },
  navArrow: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 12,
  },
}); 