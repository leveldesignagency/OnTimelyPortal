import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Animated,
  PanGestureHandler,
  State,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useRealtimeGuests, useRealtimeItineraries } from '../hooks/useRealtime';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TimelineModule {
  id: string;
  module_type: 'question' | 'feedback' | 'multiple_choice' | 'photo_video';
  title?: string;
  question?: string;
  time: string;
  date: string;
  event_id: string;
  created_at: string;
  survey_data?: any;
  feedback_data?: any;
  label?: string;
  created_by?: string;
}

interface ItineraryItem {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  arrival_time?: string;
  location?: string;
  description?: string;
  module?: string;
  survey?: any;
  feedback?: any;
}

interface PreviewTimelinePageProps {
  eventId: string;
  guests?: any[];
  itineraries?: any[];
  activeAddOns?: any[];
}

export default function PreviewTimelinePage({ 
  eventId, 
  guests = [], 
  itineraries = [], 
  activeAddOns = [] 
}: PreviewTimelinePageProps) {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
  const [showEventCard, setShowEventCard] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleType, setModuleType] = useState<string>('');
  const [timelineModules, setTimelineModules] = useState<TimelineModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModuleManagement, setShowModuleManagement] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Real-time data
  const guestsData = useRealtimeGuests(eventId);
  const itinerariesData = useRealtimeItineraries(eventId);
  const currentGuests = guestsData.guests || guests;
  const currentItineraries = itinerariesData.itineraries || itineraries;

  // Animation refs
  const cardAnimation = useRef(new Animated.Value(0)).current;

  // Update current time every minute
  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(new Date());
    };

    // Update immediately
    updateCurrentTime();

    // Update every minute
    const interval = setInterval(updateCurrentTime, 60000);

    return () => clearInterval(interval);
  }, []);

  // Load timeline modules from database
  useEffect(() => {
    const loadTimelineModules = async () => {
      if (!eventId) return;
      
      try {
        console.log('Loading timeline modules for event:', eventId);
        
        const { data, error } = await supabase
          .from('timeline_modules')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading timeline modules:', error);
        } else {
          console.log('Loaded timeline modules:', data);
          setTimelineModules(data || []);
        }
      } catch (error) {
        console.error('Error loading timeline modules:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTimelineModules();
  }, [eventId]);

  // Refresh modules when they change
  useEffect(() => {
    const channel = supabase
      .channel('timeline_modules_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_modules',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          console.log('Timeline modules changed, refreshing...');
          loadTimelineModules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const loadTimelineModules = async () => {
    if (!eventId) return;
    
    try {
      console.log('Loading timeline modules for eventId:', eventId);
      const { data, error } = await supabase
        .from('timeline_modules')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading timeline modules:', error);
      } else {
        console.log('Loaded timeline modules:', data);
        setTimelineModules(data || []);
      }
    } catch (error) {
      console.error('Error loading timeline modules:', error);
    }
  };

  // Generate event dates
  const eventDates = useMemo(() => {
    if (!currentItineraries.length) return [];
    
    const dates = new Set<string>();
    currentItineraries.forEach(item => {
      if (item.date) {
        dates.add(item.date);
      }
    });
    
    return Array.from(dates).sort().map(date => new Date(date));
  }, [currentItineraries]);

  // Get timeline position for a specific timestamp
  const getTimelinePosition = (timestamp: number) => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const totalDuration = endOfDay.getTime() - startOfDay.getTime();
    const timeInDay = timestamp - startOfDay.getTime();
    
    return Math.max(0, Math.min(100, (timeInDay / totalDuration) * 100));
  };

  // Merge itineraries with modules for the selected date
  const mergedEvents = useMemo(() => {
    const targetDate = selectedDate.toISOString().split('T')[0];
    const events: any[] = [];

    // Add itinerary items
    currentItineraries.forEach(item => {
      if (item.date === targetDate) {
        const [h, m] = item.start_time.split(':').map(Number);
        const dateTime = new Date(selectedDate);
        dateTime.setHours(h, m, 0, 0);
        
        const endTime = item.end_time ? item.end_time.split(':').map(Number) : [h + 1, m];
        const endDateTime = new Date(selectedDate);
        endDateTime.setHours(endTime[0], endTime[1], 0, 0);
        
        events.push({
          id: item.id,
          title: item.title,
          date: item.date,
          start_time: item.start_time,
          end_time: item.end_time,
          location: item.location,
          description: item.description,
          dateTime: dateTime,
          endDateTime: endDateTime,
          timestamp: dateTime.getTime(),
          endTimestamp: endDateTime.getTime(),
          type: 'itinerary'
        });
      }
    });

    // Add timeline modules for the selected date
    timelineModules.forEach((module) => {
      const moduleDate = typeof module.date === 'string' ? module.date : module.date?.toISOString()?.split('T')[0];
      if (moduleDate === targetDate) {
        const [h, m] = module.time.split(':').map(Number);
        const dateTime = new Date(selectedDate);
        dateTime.setHours(h, m, 0, 0);
        
        events.push({
          id: `module-${module.id}`,
          title: module.question || module.title || module.label || module.module_type,
          date: module.date,
          time: module.time,
          dateTime: dateTime,
          endDateTime: dateTime,
          timestamp: dateTime.getTime(),
          endTimestamp: dateTime.getTime(),
          type: 'module',
          moduleType: module.module_type,
          moduleData: {
            survey_data: module.survey_data,
            feedback_data: module.feedback_data,
            link: module.link,
            file: module.file
          }
        });
      }
    });

    return events.sort((a, b) => a.timestamp - b.timestamp);
  }, [currentItineraries, timelineModules, selectedDate]);

  // Determine event status based on current time
  const getEventStatus = (event: any) => {
    const now = currentTime.getTime();
    if (now >= event.timestamp && now <= event.endTimestamp) {
      return 'current';
    } else if (now > event.endTimestamp) {
      return 'past';
    } else {
      return 'upcoming';
    }
  };

  const handleEventPress = (index: number) => {
    setSelectedEventIndex(index);
    setShowEventCard(true);
    
    // Animate card appearance
    Animated.spring(cardAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const closeEventCard = () => {
    Animated.spring(cardAnimation, {
      toValue: 0,
      useNativeDriver: true,
    }).start(() => {
      setShowEventCard(false);
      setSelectedEventIndex(null);
    });
  };

  const handleAddModule = (type: string) => {
    setModuleType(type);
    setShowModuleModal(true);
  };

  // Handle module creation
  const handleSaveModule = async (moduleData: any) => {
    try {
      const modulePayload = {
        event_id: eventId,
        module_type: moduleType,
        time: moduleData.time,
        date: moduleData.date,
        // Remove created_by for now since we don't have auth context
      };

      // Add module-specific fields based on type
      switch (moduleType) {
        case 'question':
          modulePayload.question = moduleData.title;
          modulePayload.title = moduleData.title;
          break;
        case 'feedback':
          modulePayload.title = moduleData.title;
          modulePayload.question = moduleData.title; // Add question field for feedback too
          modulePayload.feedback_data = { defaultRating: 5 };
          break;
        case 'multiple_choice':
          modulePayload.question = moduleData.title;
          modulePayload.title = moduleData.title;
          modulePayload.survey_data = { options: moduleData.options || [] };
          break;
        case 'photo_video':
          modulePayload.title = moduleData.title;
          modulePayload.question = moduleData.title; // Add question field for photo/video
          modulePayload.label = moduleData.title;
          break;
      }

      console.log('Creating module with payload:', modulePayload);
      
      const { data, error } = await supabase
        .from('timeline_modules')
        .insert(modulePayload)
        .select()
        .single();

      if (error) {
        console.error('Error creating module:', error);
        setErrorMessage(`Failed to create module: ${error.message}`);
        setShowErrorModal(true);
      } else {
        console.log('Module created successfully:', data);
        
        // Assign module to all guests for this event
        console.log('Current guests for assignment:', currentGuests);
        console.log('Number of guests:', currentGuests.length);
        
        if (currentGuests.length === 0) {
          console.warn('No guests available for module assignment');
          setErrorMessage('Module created but no guests available for assignment');
          setShowErrorModal(true);
          return;
        }
        
        const guestAssignments = currentGuests.map(guest => ({
          module_id: data.id,
          guest_id: guest.id,
          event_id: eventId
        }));
        
        console.log('Guest assignments to create:', guestAssignments);
        
        const { error: assignmentError } = await supabase
          .from('timeline_module_guests')
          .insert(guestAssignments);

        if (assignmentError) {
          console.error('Error assigning module to guests:', assignmentError);
          setErrorMessage(`Module created but failed to assign to guests: ${assignmentError.message}`);
          setShowErrorModal(true);
        } else {
          console.log('Module assigned to guests successfully');
          
          // Verify the assignments were created
          const { data: verifyData, error: verifyError } = await supabase
            .from('timeline_module_guests')
            .select('*')
            .eq('module_id', data.id);
          
          if (verifyError) {
            console.error('Error verifying assignments:', verifyError);
          } else {
            console.log('Verified assignments:', verifyData);
          }
          
          setShowModuleModal(false);
          // Refresh modules
          await loadTimelineModules();
        }
      }
    } catch (error) {
      console.error('Error creating module:', error);
      Alert.alert('Error', 'Failed to create module');
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };



  // Generate time scale with 15-minute intervals
  const timeScale = useMemo(() => {
    const times = [];
    const targetDate = selectedDate;
    
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = new Date(targetDate);
        time.setHours(hour, minute, 0, 0);
        
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const totalDuration = endOfDay.getTime() - startOfDay.getTime();
        const timeInDay = time.getTime() - startOfDay.getTime();
        const position = (timeInDay / totalDuration) * 100;
        
        times.push({
          time: time.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: false 
          }),
          position: Math.max(0, Math.min(100, position))
        });
      }
    }
    return times;
  }, [selectedDate]);

  const selectedEvent = selectedEventIndex !== null ? mergedEvents[selectedEventIndex] : null;

  // Get current time position on timeline
  const getCurrentTimePosition = () => {
    const now = currentTime;
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const totalDuration = endOfDay.getTime() - startOfDay.getTime();
    const currentTimeInDay = now.getTime() - startOfDay.getTime();
    
    return Math.max(0, Math.min(100, (currentTimeInDay / totalDuration) * 100));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Preview Timeline</Text>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => navigation.navigate('ViewModules', { eventId })}
        >
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigateDate('prev')}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigateDate('next')}
        >
          <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Mobile Phone Frame - Smaller */}
      <View style={styles.phoneFrame}>
        {/* Phone Screen */}
        <View style={styles.phoneScreen}>
          {/* Scrollable Timeline Container */}
          <ScrollView 
            style={styles.timelineScrollView}
            contentContainerStyle={styles.timelineScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Timeline Container */}
            <View style={styles.timelineContainer}>
              {/* Time Scale - Left Side */}
              <View style={styles.timeScale}>
                {timeScale.map((timeItem, index) => (
                  <Text key={index} style={[styles.timeLabel, { top: `${timeItem.position}%` }]}>
                    {timeItem.time}
                  </Text>
                ))}
              </View>

              {/* Timeline Content - Right Side */}
              <View style={styles.timelineContent}>
                {/* Vertical Timeline Line */}
                <View style={styles.timelineLine} />
                
                {/* Current Time Indicator - Full Width Blue Line */}
                <View style={[
                  styles.currentTimeIndicator,
                  { top: `${getCurrentTimePosition()}%` }
                ]} />

                {/* Timeline Events with Milestone Circles */}
                {mergedEvents.map((event, index) => {
                  const y = getTimelinePosition(event.timestamp);
                  const status = getEventStatus(event);
                  const isSelected = selectedEventIndex === index;
                  
                  return (
                    <TouchableOpacity 
                      key={event.id} 
                      style={[
                        styles.itemContainer, 
                        { top: `${y}%` },
                        isSelected && styles.selectedItemContainer
                      ]}
                      onPress={() => handleEventPress(index)}
                    >
                      <View style={styles.milestoneContainer}>
                        <View style={[
                          styles.milestone,
                          status === 'current' && styles.currentMilestone,
                          status === 'past' && styles.pastMilestone,
                          isSelected && styles.selectedMilestone
                        ]} />
                        <Text style={[
                          styles.milestoneTitle,
                          isSelected && styles.selectedMilestoneTitle
                        ]}>
                          {event.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>



      {/* Module Buttons - Smaller Text */}
      <View style={styles.moduleButtons}>
        <TouchableOpacity 
          style={styles.moduleButton}
          onPress={() => handleAddModule('question')}
        >
          <MaterialCommunityIcons name="help-circle" size={16} color="#fff" />
          <Text style={styles.moduleButtonText}>Question</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.moduleButton}
          onPress={() => handleAddModule('feedback')}
        >
          <MaterialCommunityIcons name="star" size={16} color="#fff" />
          <Text style={styles.moduleButtonText}>Feedback</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.moduleButton}
          onPress={() => handleAddModule('multiple_choice')}
        >
          <MaterialCommunityIcons name="format-list-bulleted" size={16} color="#fff" />
          <Text style={styles.moduleButtonText}>Multiple Choice</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.moduleButton}
          onPress={() => handleAddModule('photo_video')}
        >
          <MaterialCommunityIcons name="camera" size={16} color="#fff" />
          <Text style={styles.moduleButtonText}>Photo/Video</Text>
        </TouchableOpacity>
      </View>

      {/* Event Detail Card */}
      {showEventCard && selectedEvent && (
        <Animated.View 
          style={[
            styles.eventCard,
            {
              opacity: cardAnimation,
              transform: [{
                scale: cardAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1]
                })
              }]
            }
          ]}
        >
          <View style={styles.eventCardHeader}>
            <Text style={styles.eventCardTitle}>{selectedEvent.title}</Text>
            <TouchableOpacity onPress={closeEventCard}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.eventCardContent}>
            <View style={styles.eventCardRow}>
              <MaterialCommunityIcons name="clock" size={16} color="#ccc" />
              <Text style={styles.eventCardText}>
                {formatTime(selectedEvent.start_time || selectedEvent.time)}
                {selectedEvent.end_time && ` - ${formatTime(selectedEvent.end_time)}`}
              </Text>
            </View>
            
            {selectedEvent.location && (
              <View style={styles.eventCardRow}>
                <MaterialCommunityIcons name="map-marker" size={16} color="#ccc" />
                <Text style={styles.eventCardText}>{selectedEvent.location}</Text>
              </View>
            )}
            
            {selectedEvent.description && (
              <View style={styles.eventCardRow}>
                <MaterialCommunityIcons name="text" size={16} color="#ccc" />
                <Text style={styles.eventCardText}>{selectedEvent.description}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Module Creation Modal */}
      <Modal
        visible={showModuleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModuleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add {moduleType} Module</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowModuleModal(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ModuleForm 
              moduleType={moduleType}
              onSave={handleSaveModule}
              onCancel={() => setShowModuleModal(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Module Management Modal */}
      <Modal
        visible={showModuleManagement}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModuleManagement(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Module Management</Text>
            <ModuleManagement 
              modules={timelineModules}
              onClose={() => setShowModuleManagement(false)}
              eventId={eventId}
            />
          </View>
        </View>
      </Modal>

      {/* Custom Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModalContent}>
            <View style={styles.errorModalHeader}>
              <View style={styles.errorIconContainer}>
                <MaterialCommunityIcons name="alert-circle" size={32} color="#ef4444" />
              </View>
              <Text style={styles.errorModalTitle}>Error</Text>
            </View>
            
            <Text style={styles.errorModalText}>
              {errorMessage}
            </Text>
            
            <TouchableOpacity 
              style={styles.errorModalButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.errorModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Module Form Component
function ModuleForm({ moduleType, onSave, onCancel }: any) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  }); // Default to today in DD/MM/YYYY format
  const [options, setOptions] = useState(['', '']); // For multiple choice
  const [link, setLink] = useState(''); // For QR code
  const [file, setFile] = useState(''); // For QR code
  const [prompt, setPrompt] = useState(''); // For photo/video

  // Convert DD/MM/YYYY to YYYY-MM-DD for database
  const convertDateForDatabase = (dateString: string) => {
    if (!dateString || !dateString.includes('/')) return dateString;
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month}-${day}`;
    }
    return dateString;
  };

  const handleSave = () => {
    // Check required fields based on module type
    const requiredField = moduleType === 'photo_video' ? prompt : title;
    
    if (!requiredField.trim() || !time.trim() || !date.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const moduleData: any = { time, date: convertDateForDatabase(date) };

    // Add module-specific data
    switch (moduleType) {
      case 'question':
      case 'feedback':
        moduleData.title = title;
        break;
      case 'multiple_choice':
        if (options.filter(opt => opt.trim()).length < 2) {
          Alert.alert('Error', 'Please add at least 2 options');
          return;
        }
        moduleData.title = title;
        moduleData.options = options.filter(opt => opt.trim());
        break;
      case 'photo_video':
        moduleData.title = prompt;
        break;
    }

    onSave(moduleData);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  return (
    <View style={styles.moduleForm}>
      {/* Question/Title/Prompt Field */}
      <TextInput
        style={styles.textInput}
        placeholder={
          moduleType === 'question' ? 'Enter question...' :
          moduleType === 'multiple_choice' ? 'Enter question...' :
          moduleType === 'photo_video' ? 'Enter prompt...' :
          'Enter title...'
        }
        placeholderTextColor="#666"
        value={moduleType === 'photo_video' ? prompt : title}
        onChangeText={(value) => {
          if (moduleType === 'photo_video') {
            setPrompt(value);
          } else {
            setTitle(value);
          }
        }}
      />
      
      <View style={styles.dateTimeContainer}>
        <View style={styles.dateTimeField}>
          <Text style={styles.fieldLabel}>Date</Text>
          <TextInput
            style={styles.textInput}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#666"
            value={date}
            onChangeText={setDate}
          />
        </View>
        
        <View style={styles.dateTimeField}>
          <Text style={styles.fieldLabel}>Time</Text>
          <TextInput
            style={styles.textInput}
            placeholder="HH:MM"
            placeholderTextColor="#666"
            value={time}
            onChangeText={setTime}
          />
        </View>
      </View>

      {/* Module-specific fields */}
      {moduleType === 'multiple_choice' && (
        <View style={styles.optionsContainer}>
          <Text style={styles.optionsTitle}>Options:</Text>
          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <TextInput
                style={styles.optionInput}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor="#666"
                value={option}
                onChangeText={(value) => updateOption(index, value)}
              />
              {options.length > 2 && (
                <TouchableOpacity
                  style={styles.removeOptionButton}
                  onPress={() => removeOption(index)}
                >
                  <MaterialCommunityIcons name="close" size={16} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addOptionButton} onPress={addOption}>
            <MaterialCommunityIcons name="plus" size={16} color="#10b981" />
            <Text style={styles.addOptionText}>Add Option</Text>
          </TouchableOpacity>
        </View>
      )}



      <View style={styles.formButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Module Management Component
function ModuleManagement({ modules, onClose, eventId }: any) {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const handleDeleteModules = async () => {
    if (selectedModules.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('timeline_modules')
        .delete()
        .in('id', selectedModules);

      if (error) {
        Alert.alert('Error', 'Failed to delete modules');
      } else {
        setSelectedModules([]);
        onClose();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete modules');
    }
  };

  return (
    <View style={styles.moduleManagement}>
      <FlatList
        data={modules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.moduleItem}>
            <Text style={styles.moduleItemTitle}>{item.title}</Text>
            <Text style={styles.moduleItemTime}>{item.time}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setSelectedModules([...selectedModules, item.id])}
            >
              <MaterialCommunityIcons name="delete" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  menuButton: {
    padding: 8,
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  navButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dateDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 140,
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  phoneFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  phoneScreen: {
    width: 260,
    height: 520,
    backgroundColor: '#1a1a1a',
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#333',
    overflow: 'hidden',
    position: 'relative',
  },

  timelineScrollView: {
    flex: 1,
  },
  timelineScrollContent: {
    minHeight: 2000, // Full 24-hour timeline height
  },
  timelineContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 20,
    minHeight: 2000,
    width: '100%',
  },
  timeScale: {
    width: 60,
    position: 'relative',
    minHeight: 2000,
  },
  timeLabel: {
    color: '#666',
    fontSize: 10,
    textAlign: 'left',
    position: 'absolute',
    left: 0,
    paddingLeft: 8,
  },
  timelineContent: {
    flex: 1,
    position: 'relative',
    marginLeft: 16,
    minHeight: 2000,
  },
  timelineLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#374151',
    borderRadius: 2,
    zIndex: 1,
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: -16, // Extend beyond the timeline content to reach the time scale
    right: -20, // Extend to the right edge
    height: 2,
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 10,
  },
  eventDot: {
    position: 'absolute',
    left: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    zIndex: 15,
  },
  eventDotInner: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#fff',
    position: 'absolute',
    top: 2.5,
    left: 2.5,
  },

  moduleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 8,
  },
  moduleButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 50,
  },
  moduleButtonText: {
    color: '#fff',
    fontSize: 8,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  eventCard: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 100,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventCardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  eventCardContent: {
    gap: 12,
  },
  eventCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventCardText: {
    color: '#ccc',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  moduleForm: {
    gap: 16,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionsContainer: {
    gap: 12,
  },
  optionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  removeOptionButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 6,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  addOptionText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  qrContainer: {
    gap: 12,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  moduleManagement: {
    flex: 1,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  moduleItemTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  moduleItemTime: {
    color: '#ccc',
    fontSize: 14,
    marginRight: 12,
  },
  deleteButton: {
    padding: 8,
  },
  closeButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemContainer: {
    position: 'absolute',
    left: 0,
    transform: [{ translateX: -8 }], // Center the milestone on the timeline line
    zIndex: 10,
  },
  milestoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  milestone: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  currentMilestone: {
    backgroundColor: '#3b82f6',
    borderColor: '#fff',
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  pastMilestone: {
    backgroundColor: '#10b981',
    borderColor: '#fff',
  },
  milestoneTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 150,
    opacity: 0.8,
  },
  selectedItemContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  selectedMilestone: {
    backgroundColor: '#3b82f6',
    borderColor: '#fff',
    transform: [{ scale: 1.2 }],
  },
  selectedMilestoneTitle: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeField: {
    flex: 1,
  },
  fieldLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 350,
    alignItems: 'center',
  },
  errorModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIconContainer: {
    marginBottom: 12,
  },
  errorModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  errorModalText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorModalButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  errorModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 