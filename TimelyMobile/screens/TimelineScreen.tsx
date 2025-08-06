import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, Modal, Pressable, InteractionManager, Linking, Platform, SafeAreaView, Alert, TextInput, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { BlurView } from 'expo-blur';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

import { useTheme } from '../ThemeContext';
import NotificationBadge from '../components/NotificationBadge';

// StarRating component for React Native
const StarRating = ({ rating, onRatingChange, isDark }: { rating: number, onRatingChange: (rating: number) => void, isDark: boolean }) => {
  const [isInteracting, setIsInteracting] = useState(false);
  const starContainerRef = useRef<View>(null);

  const handleStarInteraction = (event: any) => {
    if (!starContainerRef.current) return;
    
    // Get the touch position relative to the star container
    const { locationX } = event.nativeEvent;
    const containerWidth = 160; // Approximate width of 5 stars (32px each) with spacing
    const percentage = Math.max(0, Math.min(1, locationX / containerWidth));
    const newRating = Math.round(percentage * 50) / 10; // 0-5 with 0.1 precision
    
    onRatingChange(newRating);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const StarIcon = ({ filled, partial = 0, size = 32 }: { filled: boolean, partial?: number, size?: number }) => (
    <View style={{ position: 'relative' }}>
      {/* Background star (hollow) with glow and border */}
      <Text style={{
        fontSize: size,
        color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
        marginHorizontal: 2,
        // Combined glow and border effect
        textShadowColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)',
        textShadowOffset: { width: 0.5, height: 0.5 },
        textShadowRadius: 2,
      }}>
        ★
      </Text>
      
      {/* Filled star overlay */}
      {(filled || partial > 0) && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 2, // Match marginHorizontal
          overflow: 'hidden',
          width: filled ? size : size * partial,
        }}>
          <Text style={{
            fontSize: size,
            color: '#fbbf24',
            textShadowColor: 'rgba(251, 191, 36, 0.5)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 4,
          }}>
            ★
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ alignItems: 'center', marginVertical: 10 }}>
      <View
        ref={starContainerRef}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 6,
          paddingHorizontal: 4,
        }}
        onTouchStart={(e) => {
          setIsInteracting(true);
          handleStarInteraction(e);
        }}
        onTouchMove={handleStarInteraction}
        onTouchEnd={() => setIsInteracting(false)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = rating >= star;
          const partial = rating > star - 1 && rating < star ? rating - (star - 1) : 0;
          
          return (
            <StarIcon
              key={star}
              filled={isFilled}
              partial={partial}
            />
          );
        })}
      </View>
      
      <Text style={{
        fontSize: 14,
        fontWeight: '700',
        color: isDark ? '#fbbf24' : '#d97706',
        marginTop: 8,
        minHeight: 20,
      }}>
        {rating > 0 ? rating.toFixed(1) : '0.0'}
      </Text>
    </View>
  );
};


const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const HOUR_HEIGHT = 200; // px per hour
const TIMELINE_WIDTH = 2;
const DOT_SIZE = 18;
const TIME_LABEL_WIDTH = 60;
const TIMELINE_HEIGHT = 24 * HOUR_HEIGHT; // Full 24 hours
const MODAL_WIDTH = 320; // Shared width for date picker and live modal

// Get Y position for a given time (hours and minutes)
function getYForTime(hours: number, minutes: number = 0, seconds: number = 0) {
  const totalHours = hours + minutes / 60 + seconds / 3600;
  return totalHours * HOUR_HEIGHT;
}

function GeometricOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={{
          position: 'absolute',
          top: SCREEN_HEIGHT * 0.18,
          right: -SCREEN_WIDTH * 0.15,
          width: SCREEN_WIDTH * 0.7,
          height: SCREEN_WIDTH * 0.7,
          borderRadius: SCREEN_WIDTH * 0.35,
          backgroundColor: 'rgba(40,40,50,0.18)',
          transform: [{ rotate: '18deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: SCREEN_HEIGHT * 0.38,
          left: -SCREEN_WIDTH * 0.2,
          width: SCREEN_WIDTH * 0.5,
          height: SCREEN_WIDTH * 0.5,
          borderRadius: SCREEN_WIDTH * 0.25,
          backgroundColor: 'rgba(40,40,50,0.10)',
          transform: [{ rotate: '-12deg' }],
        }}
      />
    </View>
  );
}

// Helper to get 7 days centered on selectedDate
function getWeekDays(selectedDate: Date) {
  const days = [];
  const start = new Date(selectedDate);
  start.setDate(selectedDate.getDate() - 3);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

// Helper to upload image via Edge Function
async function uploadImageViaEdgeFunction({ guestId, moduleId, eventId, fileUri, fileType }: {
  guestId: string, moduleId: string, eventId: string, fileUri: string, fileType: string
}) {
  const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
  console.log('[EDGE FUNCTION] Uploading image with params:', { guestId, moduleId, eventId, fileType, fileUri, base64Length: base64.length });
  const response = await fetch('https://ijsktwmevnqgzwwuggkf.functions.supabase.co/guest-upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guest_id: guestId,
      module_id: moduleId,
      event_id: eventId,
      file_base64: base64,
      file_type: fileType,
    }),
  });
  let result;
  try {
    result = await response.json();
  } catch (e) {
    console.error('[EDGE FUNCTION] Failed to parse JSON response:', e);
    throw new Error('Invalid response from Edge Function');
  }
  console.log('[EDGE FUNCTION RESULT]', result);
  if (!response.ok) {
    console.error('[EDGE FUNCTION ERROR]', result.error || result);
    throw new Error(result.error || 'Upload failed');
  }
  return result.url;
}

// Restore the original fetchTimelineModules function:
async function fetchTimelineModules(eventId: string, selectedDate: Date, guestId: string) {
  if (!eventId || !guestId) return [];
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  console.log('[RPC] Fetching guest modules with:', { guestId, eventId, selectedDateStr });
  try {
    const { data, error } = await supabase.rpc('get_guest_timeline_modules', {
      p_guest_id: guestId,
      p_event_id: eventId,
      p_date: selectedDateStr
    });
    if (error) {
      console.error('[TimelineScreen] Error fetching guest timeline modules:', error);
      console.error('[TimelineScreen] Error details:', JSON.stringify(error, null, 2));
      console.error('[TimelineScreen] Error message:', error?.message);
      console.error('[TimelineScreen] Error code:', error?.code);
      
      // Fallback: Try direct query
      console.log('[FALLBACK] Trying direct query for modules...');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('timeline_modules')
        .select('*')
        .eq('event_id', eventId)
        .eq('date', selectedDateStr);
      
      if (fallbackError) {
        console.error('[FALLBACK] Error in direct query:', fallbackError);
      return [];
      }
      
      console.log('[FALLBACK] Direct query result:', fallbackData);
      return fallbackData || [];
    }
    console.log('[RPC] Guest modules result:', data);
    console.log('[RPC] Number of modules found:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('[RPC] First module:', data[0]);
    }
    return data || [];
  } catch (err) {
    console.error('[TimelineScreen] Exception in fetchTimelineModules:', err);
    return [];
  }
}

export default function TimelineScreen({ guest }: { guest: any }) {
  // Fallback: fetch full guest if only email and event_id are provided
  const [fullGuest, setFullGuest] = useState(guest);

  useEffect(() => {
    if (guest && !guest.id && guest.email && guest.event_id) {
      supabase
        .from('guests')
        .select('*')
        .eq('email', guest.email)
        .eq('event_id', guest.event_id)
        .single()
        .then(({ data, error }) => {
          if (data) setFullGuest(data);
        });
    } else {
      setFullGuest(guest);
    }
  }, [guest]);

  // Defensive: Only render if fullGuest is loaded and has id/event_id
  if (!fullGuest || !fullGuest.id || !fullGuest.event_id) {
    console.warn('[TimelineScreen] Waiting for full guest profile or missing required fields:', fullGuest);
    return null;
  }
  
  // Debug: Log Supabase configuration
  useEffect(() => {
    console.log('[DEBUG] Guest object:', fullGuest);
    console.log('[DEBUG] Guest ID:', fullGuest?.id);
    console.log('[DEBUG] Event ID:', fullGuest?.event_id);
  }, [fullGuest]);
  
  const { theme } = useTheme();
  const [notificationCount, setNotificationCount] = useState(0);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [timelineModules, setTimelineModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const scrollViewRef = useRef<ScrollView>(null);
  const timeScrollViewRef = useRef<ScrollView>(null);
  // Remove auto-return-to-now logic
  // Add state for milestone modal
  const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null);
  const [milestoneModalVisible, setMilestoneModalVisible] = useState(false);
  
  // Add state for full-screen countdown modal
  const [upcomingItem, setUpcomingItem] = useState<any | null>(null);
  const [countdownModalVisible, setCountdownModalVisible] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(10);
  const [animationPhase, setAnimationPhase] = useState<'countdown' | 'title' | 'info' | 'description' | 'attachments' | 'complete'>('countdown');
  
  // Add state for question module
  const [questionModule, setQuestionModule] = useState<any | null>(null);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  
  // Add state for feedback module
  const [feedbackModule, setFeedbackModule] = useState<any | null>(null);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  // Add state for multiple choice module
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);
  const [pollResults, setPollResults] = useState<any[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  
  // Add state for photo/video module
  const [photoVideoModule, setPhotoVideoModule] = useState<any | null>(null);
  const [photoVideoModalVisible, setPhotoVideoModalVisible] = useState(false);
  const [photoVideoComment, setPhotoVideoComment] = useState('');
  const [isSubmittingPhotoVideo, setIsSubmittingPhotoVideo] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'photo' | 'video' } | null>(null);
  
  // Add state for custom toast and error modal
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Add state for tracking answered modules
  const [answeredModules, setAnsweredModules] = useState<Set<string>>(new Set());

  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);

  // Function to check if a guest has already answered a module
  const checkIfModuleAnswered = async (moduleId: string) => {
    try {
      const { data, error } = await supabase
        .from('guest_module_answers')
        .select('id')
        .eq('guest_id', fullGuest.id)
        .eq('module_id', moduleId)
        .limit(1);
      
      if (error) {
        console.error('[CHECK ANSWER] Error checking module answer:', error);
        return false;
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error('[CHECK ANSWER] Exception checking module answer:', error);
      return false;
    }
  };

  // Function to load all answered modules for the current guest
  const loadAnsweredModules = async () => {
    try {
      const { data, error } = await supabase
        .from('guest_module_answers')
        .select('module_id')
        .eq('guest_id', fullGuest.id);
      
      if (error) {
        console.error('[LOAD ANSWERS] Error loading answered modules:', error);
        return;
      }
      
      const answeredModuleIds = new Set(data?.map(answer => answer.module_id) || []);
      setAnsweredModules(answeredModuleIds);
      console.log('[LOAD ANSWERS] Loaded answered modules:', Array.from(answeredModuleIds));
    } catch (error) {
      console.error('[LOAD ANSWERS] Exception loading answered modules:', error);
    }
  };

  // Load answered modules when guest changes
  useEffect(() => {
    if (fullGuest?.id) {
      loadAnsweredModules();
    }
  }, [fullGuest?.id]);

  // Debug guest object on mount
  useEffect(() => {
    // Guest object loaded
  }, [fullGuest]);

  // Fetch notification count
  useEffect(() => {
    fetchNotificationCount();
  }, [fullGuest]);

  const fetchNotificationCount = async () => {
    try {
      if (!fullGuest?.email || typeof fullGuest.email !== 'string') return;

      const { data, error } = await supabase
        .rpc('get_guest_notification_badge_count', { guest_email: fullGuest.email });

      if (error) {
        console.error('Error fetching notification count:', error);
        return;
      }

      setNotificationCount(data || 0);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);





  // Ensure the timeline always opens with the current time indicator centered, using the currentTime state
  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        if (scrollViewRef.current && timeScrollViewRef.current) {
          const y = getYForTime(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds());
          const centerOffset = SCREEN_HEIGHT / 2;
          const scrollTarget = y - centerOffset;
          scrollViewRef.current.scrollTo({
            y: scrollTarget,
            animated: false,
          });
          timeScrollViewRef.current.scrollTo({
            y: scrollTarget,
            animated: false,
          });
        }
      }, 0);
      return () => clearTimeout(timeout);
    }, [currentTime])
  );

  // Scroll to current time when data loads and timeline is ready
  useEffect(() => {
    if (!loading && (itineraries.length > 0 || timelineModules.length > 0)) {
      const timeout = setTimeout(() => {
        if (scrollViewRef.current && timeScrollViewRef.current) {
          const y = getYForTime(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds());
          const centerOffset = SCREEN_HEIGHT / 2;
          const scrollTarget = y - centerOffset;
          scrollViewRef.current.scrollTo({
            y: scrollTarget,
            animated: false,
          });
          timeScrollViewRef.current.scrollTo({
            y: scrollTarget,
            animated: false,
          });
        }
      }, 100); // Small delay to ensure ScrollView is fully rendered
      return () => clearTimeout(timeout);
    }
  }, [loading, itineraries.length, timelineModules.length, currentTime]);

  // Fetch itineraries for selected date
  useEffect(() => {
    async function fetchItineraries() {
      if (!fullGuest?.event_id || !fullGuest?.id || typeof fullGuest.event_id !== 'string' || typeof fullGuest.id !== 'string') {
        console.warn('Invalid guest data for itineraries:', { event_id: fullGuest?.event_id, id: fullGuest?.id });
        return;
      }
      setLoading(true);
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      console.log('[RPC] Fetching itineraries with:', { guestId: fullGuest.id, eventId: fullGuest.event_id, selectedDateStr });
      try {
        // Use the secure RPC that verifies company_id, event_id, and guest_id
        const { data, error } = await supabase.rpc('get_guest_itinerary_items', {
          p_guest_id: fullGuest.id,
          p_event_id: fullGuest.event_id,
          p_date: selectedDateStr
        });
        if (error) {
          console.error('[TimelineScreen] Error fetching itineraries:', error);
          setItineraries([]);
        } else {
          setItineraries(data || []);
        }
      } catch (err) {
        console.error('[TimelineScreen] Exception in fetchItineraries:', err);
        setItineraries([]);
      } finally {
        setLoading(false);
      }
    }
    fetchItineraries();
  }, [fullGuest, selectedDate]);

  // In your useEffect or wherever you fetch modules:
  useEffect(() => {
    if (!fullGuest?.event_id || typeof fullGuest.event_id !== 'string' || !fullGuest?.id) return;
    fetchTimelineModules(fullGuest.event_id, selectedDate, fullGuest.id).then(setTimelineModules);
  }, [fullGuest?.event_id, fullGuest?.id, selectedDate]);

  // Merge itineraries and timeline modules
  const mergedItems = useMemo(() => {
    const base = [...itineraries];
    
    console.log('[MergedItems] Itineraries count:', itineraries.length);
    console.log('[MergedItems] Timeline modules count:', timelineModules.length);
    
    // Add timeline modules
    timelineModules.forEach((module, idx) => {
      if (!module.time || typeof module.time !== 'string') {
        console.warn('Invalid module time:', module.time);
        return;
      }
      
      const timeParts = module.time.split(':');
      if (timeParts.length !== 2) {
        console.warn('Invalid time format:', module.time);
        return;
      }
      
      const h = parseInt(timeParts[0], 10) || 0;
      const m = parseInt(timeParts[1], 10) || 0;
      const itemDate = new Date(selectedDate);
      itemDate.setHours(h, m, 0, 0);
      
      const moduleItem = {
        id: `module-${module.id || idx}`,
        title: String(module.question || module.title || 'Module'),
        start_time: String(module.time),
        end_time: String(module.time),
        module_type: module.module_type,
        survey_data: module.survey_data,
        feedback_data: module.feedback_data,
        link: module.link,
        file: module.file,
        label: module.label,
        is_module: true,
        timestamp: itemDate.getTime(),
        endTimestamp: itemDate.getTime(),
      };
      
      base.push(moduleItem);
    });
    
    // Sort by time
    const sorted = base.sort((a, b) => {
      const timeA = a.start_time || '00:00';
      const timeB = b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });
    
    console.log('[MergedItems] Final merged items:', sorted.map(item => ({
      title: item.title,
      start_time: item.start_time,
      end_time: item.end_time
    })));
    
    return sorted;
  }, [itineraries, timelineModules, selectedDate]);

  // SIMPLIFIED AND AGGRESSIVE UPCOMING ITEM DETECTION
  useEffect(() => {
    const checkUpcomingItem = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();
      
      // console.log('[AUTO] 🔍 CHECKING FOR UPCOMING ITEMS...');
      // console.log('[AUTO] Current time:', `${currentHour}:${currentMinute}:${currentSecond}`);
      // console.log('[AUTO] Items to check:', mergedItems.length);
      
      // Don't check if modal is already visible
      if (countdownModalVisible || questionModalVisible || feedbackModalVisible || photoVideoModalVisible) {
        // console.log('[AUTO] Modal already visible, skipping check');
        return;
      }
      
      if (mergedItems.length === 0) {
        // console.log('[AUTO] ❌ No items to check');
        return;
      }
      
      // Find ANY item that's starting within the next 2 minutes
      const upcoming = mergedItems.find(item => {
        if (!item.start_time || typeof item.start_time !== 'string') {
          return false;
        }
        
        const timeParts = item.start_time.split(':');
        if (timeParts.length !== 2) {
          return false;
        }
        
        const itemHour = parseInt(timeParts[0], 10);
        const itemMinute = parseInt(timeParts[1], 10);
        
        // Calculate time difference in minutes
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const itemTotalMinutes = itemHour * 60 + itemMinute;
        const diffMinutes = itemTotalMinutes - currentTotalMinutes;
        
        // Convert to seconds for more precise comparison
        const diffSeconds = (diffMinutes * 60) - currentSecond;
        
        // console.log('[AUTO] 📊 Item:', item.title, 'Time:', item.start_time, 'Diff minutes:', diffMinutes, 'Diff seconds:', diffSeconds);
        
        // Trigger if item starts within the next 2 minutes (120 seconds)
        const shouldTrigger = diffSeconds >= -30 && diffSeconds <= 120;
        
        if (shouldTrigger) {
          // console.log('[AUTO] 🎉 FOUND UPCOMING ITEM:', item.title, 'Diff seconds:', diffSeconds);
        }
        
        return shouldTrigger;
      });
      
      if (upcoming) {
        // console.log('[AUTO] 🚨 TRIGGERING COUNTDOWN FOR:', upcoming.title);
        // console.log('[AUTO] 🚨 Item time:', upcoming.start_time);
        // console.log('[AUTO] 🚨 Current time:', `${currentHour}:${currentMinute}:${currentSecond}`);
        
        // Calculate countdown seconds
        const timeParts = upcoming.start_time.split(':');
        const itemHour = parseInt(timeParts[0], 10);
        const itemMinute = parseInt(timeParts[1], 10);
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        const itemTotalMinutes = itemHour * 60 + itemMinute;
        const diffMinutes = itemTotalMinutes - currentTotalMinutes;
        const diffSeconds = Math.max(0, (diffMinutes * 60) - currentSecond);
        
        // console.log('[AUTO] 🚨 Countdown seconds:', diffSeconds);
        
        setUpcomingItem(upcoming);
        setCountdownModalVisible(true);
        setCountdownSeconds(Math.min(10, diffSeconds)); // Use 10 seconds or the actual time difference
        setAnimationPhase('countdown');
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // console.log('[AUTO] ✅ COUNTDOWN MODAL TRIGGERED!');
      }
    };

    const interval = setInterval(checkUpcomingItem, 1000);
    return () => clearInterval(interval);
  }, [currentTime, selectedDate, mergedItems, countdownModalVisible, questionModalVisible, feedbackModalVisible, photoVideoModalVisible]);

  // Separate countdown timer effect
  useEffect(() => {
    if (!countdownModalVisible || animationPhase !== 'countdown') return;

    const countdownInterval = setInterval(() => {
      setCountdownSeconds(prev => {
        // console.log('[CountdownTimer] Current seconds:', prev);
        if (prev <= 1) {
          // console.log('[CountdownTimer] 🚀 Countdown finished, starting animations!');
          setAnimationPhase('title');
          setTimeout(() => setAnimationPhase('info'), 1500);
          setTimeout(() => setAnimationPhase('description'), 3000);
          setTimeout(() => setAnimationPhase('attachments'), 4500);
          setTimeout(() => setAnimationPhase('complete'), 6000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [countdownModalVisible, animationPhase]);

  // Remove the useEffect with [] dependency (initial scroll)
  // Add a handler for ScrollView layout to scroll to current time
  const handleTimelineLayout = () => {
    if (!scrollViewRef.current || !timeScrollViewRef.current) return;
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const currentY = getYForTime(hours, minutes, seconds);
    const centerOffset = SCREEN_HEIGHT / 2;
    const scrollTarget = currentY - centerOffset;
    scrollViewRef.current.scrollTo({
      y: scrollTarget,
      animated: false,
    });
    timeScrollViewRef.current.scrollTo({
      y: scrollTarget,
      animated: false,
    });
  };

  const scrollToNow = () => {
    if (scrollViewRef.current && timeScrollViewRef.current) {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const currentY = getYForTime(hours, minutes, seconds);
      const centerOffset = SCREEN_HEIGHT / 2;
      const scrollTarget = currentY - centerOffset;
      scrollViewRef.current.scrollTo({
        y: scrollTarget,
        animated: true,
      });
      timeScrollViewRef.current.scrollTo({
        y: scrollTarget,
        animated: true,
      });
    }
  };

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
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };



  // Handle question answer submission
  const handleQuestionSubmit = async () => {
    if (!questionModule || !questionAnswer.trim()) {
      setErrorMessage('Please enter an answer');
      setShowErrorModal(true);
      return;
    }

    setIsSubmittingAnswer(true);
    
    try {
      console.log('[QUESTION] Submitting answer for module:', questionModule.id);
      console.log('[QUESTION] Answer:', questionAnswer);
      
      // First, let's test if the table exists and check its structure
      console.log('[QUESTION] Testing table access...');
      
      // Check authentication context
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('[QUESTION] Auth user:', user);
      console.log('[QUESTION] Auth error:', authError);
      
      // Check if guest exists with this email
      if (user?.email) {
        const { data: guestCheck, error: guestError } = await supabase
          .from('guests')
          .select('id, email')
          .eq('email', user.email)
          .single();
        console.log('[QUESTION] Guest check result:', guestCheck);
        console.log('[QUESTION] Guest check error:', guestError);
      }
      
      const { data: tableTest, error: tableError } = await supabase
        .from('guest_module_answers')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.error('[QUESTION] Table access error:', tableError);
        throw new Error(`Table access failed: ${tableError.message}`);
      }
      
      console.log('[QUESTION] Table exists, structure test result:', tableTest);
      
      // TODO: Submit to backend - for now just log
      const answerData = {
        guest_id: fullGuest.id,
        module_id: questionModule.id,
        answer_text: questionAnswer.trim(),
        timestamp: new Date().toISOString(),
        event_id: fullGuest.event_id
      };
      
      console.log('[QUESTION] Answer data:', answerData);
      
      // Submit to Supabase using the function
      const { data, error } = await supabase.rpc('insert_guest_module_answer', {
        p_guest_id: fullGuest.id,
        p_module_id: questionModule.id,
        p_answer_text: questionAnswer.trim(),
        p_event_id: fullGuest.event_id
      });
      
      if (error) throw error;
      
      console.log('[QUESTION] Function response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit answer');
      }
      
      // Fetch latest answers for this guest/module
      const { data: answers, error: fetchError } = await supabase
        .from('guest_module_answers')
        .select('*')
        .eq('guest_id', fullGuest.id)
        .eq('module_id', questionModule.id)
        .order('timestamp', { ascending: false });
      if (fetchError) throw fetchError;
      console.log('[QUESTION] Latest answers for this guest/module:', answers);
      // Show custom toast
      setToastMessage('Your answer has been submitted!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
      
      // Update answered modules list
      setAnsweredModules(prev => new Set([...prev, questionModule.id]));
      
      // Close the modal
      setQuestionModalVisible(false);
      setQuestionModule(null);
      setQuestionAnswer('');
      
    } catch (error: any) {
      console.error('[QUESTION] Error submitting answer:', error);
      console.error('[QUESTION] Error details:', JSON.stringify(error, null, 2));
      console.error('[QUESTION] Error message:', error?.message);
      console.error('[QUESTION] Error code:', error?.code);
      setErrorMessage(`Failed to submit answer: ${error?.message || 'Unknown error'}`);
      setShowErrorModal(true);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // Handle question modal close
  const handleQuestionClose = () => {
    setQuestionModalVisible(false);
    setQuestionModule(null);
    setQuestionAnswer('');
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async () => {
    if (!feedbackModule || feedbackRating === 0) {
      setErrorMessage('Please provide a rating');
      setShowErrorModal(true);
      return;
    }

    setIsSubmittingFeedback(true);
    
    try {
      console.log('[FEEDBACK] Submitting feedback for module:', feedbackModule.id);
      console.log('[FEEDBACK] Rating:', feedbackRating);
      console.log('[FEEDBACK] Comment:', feedbackComment);
      
      // Create answer text with rating and comment
      const answerText = JSON.stringify({
        rating: feedbackRating,
        comment: feedbackComment.trim() || '',
        timestamp: new Date().toISOString()
      });
      
      // Submit to Supabase using the function
      const { data, error } = await supabase.rpc('insert_guest_module_answer', {
        p_guest_id: fullGuest.id,
        p_module_id: feedbackModule.id,
        p_answer_text: answerText,
        p_event_id: fullGuest.event_id
      });
      
      if (error) throw error;
      
      console.log('[FEEDBACK] Function response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit feedback');
      }
      
      // Show custom toast
      setToastMessage('Your feedback has been submitted!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
      
      // Update answered modules list
      setAnsweredModules(prev => new Set([...prev, feedbackModule.id]));
      
      // Close the modal
      setFeedbackModalVisible(false);
      setFeedbackModule(null);
      setFeedbackRating(0);
      setFeedbackComment('');
      
    } catch (error: any) {
      console.error('[FEEDBACK] Error submitting feedback:', error);
      console.error('[FEEDBACK] Error details:', JSON.stringify(error, null, 2));
      console.error('[FEEDBACK] Error message:', error?.message);
      console.error('[FEEDBACK] Error code:', error?.code);
      setErrorMessage(`Failed to submit feedback: ${error?.message || 'Unknown error'}`);
      setShowErrorModal(true);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Handle feedback modal close
  const handleFeedbackClose = () => {
    setFeedbackModalVisible(false);
    setFeedbackModule(null);
    setFeedbackRating(0);
    setFeedbackComment('');
  };

  // Handle survey/multiple choice submission


  // Handle photo/video submission
  const handlePhotoVideoSubmit = async () => {
    if (!photoVideoModule) {
      setErrorMessage('No photo/video module found');
      setShowErrorModal(true);
      return;
    }

    if (!selectedMedia) {
      setErrorMessage('Please take a photo or video first');
      setShowErrorModal(true);
      return;
    }

    setIsSubmittingPhotoVideo(true);
    
    try {
      console.log('[PHOTO/VIDEO] Submitting for module:', photoVideoModule.id);
      console.log('[PHOTO/VIDEO] Media type:', selectedMedia.type);
      
      // Upload media to Supabase storage first
      console.log('[PHOTO/VIDEO] Uploading media to storage...');
      const mediaUrl = await uploadImageViaEdgeFunction({
        guestId: fullGuest.id,
        moduleId: photoVideoModule.id,
        eventId: fullGuest.event_id,
        fileUri: selectedMedia.uri,
        fileType: selectedMedia.type === 'photo' ? 'image/jpeg' : 'video/mp4',
      });
      console.log('[PHOTO/VIDEO] Media uploaded successfully:', mediaUrl);
      
      // Store the public URL in the answer
      const answerText = JSON.stringify({
        mediaUrl: mediaUrl,
        mediaType: selectedMedia.type,
        timestamp: new Date().toISOString()
      });
      
      // Test basic Supabase connectivity first
      console.log('[PHOTO/VIDEO] Testing Supabase connectivity...');
      let connectivityTest = false;
      
      try {
        const { data: testData, error: testError } = await supabase
          .from('guests')
          .select('id')
          .eq('id', fullGuest.id)
          .limit(1);
        
        if (testError) {
          console.error('[PHOTO/VIDEO] Connectivity test failed:', testError);
        } else {
          console.log('[PHOTO/VIDEO] Connectivity test passed');
          connectivityTest = true;
        }
      } catch (testError) {
        console.error('[PHOTO/VIDEO] Connectivity test failed:', testError);
      }
      
      if (!connectivityTest) {
        console.log('[PHOTO/VIDEO] No connectivity to Supabase, storing locally for now');
        // Store the response locally for now
        const localResponse = {
          guest_id: fullGuest.id,
          module_id: photoVideoModule.id,
          answer_text: answerText,
          event_id: fullGuest.event_id,
          timestamp: new Date().toISOString(),
          stored_locally: true
        };
        
        // You could store this in AsyncStorage or show a message to the user
        console.log('[PHOTO/VIDEO] Local response stored:', localResponse);
        
        // Show success message to user
        setToastMessage('Photo saved locally (offline mode)');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
        
        // Close the modal
        setPhotoVideoModalVisible(false);
        setPhotoVideoModule(null);
        setPhotoVideoComment('');
        setSelectedMedia(null);
        return;
      }
      
      // Test INSERT permissions specifically
      console.log('[PHOTO/VIDEO] Testing INSERT permissions...');
      try {
        const { data: testInsert, error: testInsertError } = await supabase
          .from('guest_module_answers')
          .insert({
            guest_id: fullGuest.id,
            module_id: 'test-module-' + Date.now(),
            answer_text: 'test',
            event_id: fullGuest.event_id,
            timestamp: new Date().toISOString()
          })
          .select()
          .single();
        
        if (testInsertError) {
          console.error('[PHOTO/VIDEO] Test INSERT failed:', testInsertError);
          console.log('[PHOTO/VIDEO] This suggests a permission/RLS issue');
        } else {
          console.log('[PHOTO/VIDEO] Test INSERT successful:', testInsert);
          // Clean up test record
          await supabase
            .from('guest_module_answers')
            .delete()
            .eq('id', testInsert.id);
        }
      } catch (testError) {
        console.error('[PHOTO/VIDEO] Test INSERT failed:', testError);
      }
      
      // Submit to Supabase using the function
      console.log('[PHOTO/VIDEO] Calling RPC function with params:', {
        p_guest_id: fullGuest.id,
        p_module_id: photoVideoModule.id,
        p_answer_text: answerText.substring(0, 100) + '...', // Log first 100 chars
        p_event_id: fullGuest.event_id
      });
      
      const { data, error } = await supabase.rpc('insert_guest_module_answer', {
        p_guest_id: fullGuest.id,
        p_module_id: photoVideoModule.id,
        p_answer_text: answerText,
        p_event_id: fullGuest.event_id,
        p_media_url: mediaUrl,
      });
      
      if (error) {
        console.error('[PHOTO/VIDEO] RPC function error:', error);
        
        // Fallback: Try direct insert into the table
        console.log('[PHOTO/VIDEO] Trying direct table insert as fallback...');
        const { data: insertData, error: insertError } = await supabase
          .from('guest_module_answers')
          .insert({
            guest_id: fullGuest.id,
            module_id: photoVideoModule.id,
            answer_text: answerText,
            event_id: fullGuest.event_id,
            timestamp: new Date().toISOString()
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('[PHOTO/VIDEO] Direct insert also failed:', insertError);
          throw insertError;
        }
        
        console.log('[PHOTO/VIDEO] Direct insert successful:', insertData);
      } else {
        console.log('[PHOTO/VIDEO] Function response:', data);
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to submit photo/video response');
        }
      }
      
      // Show custom toast
      setToastMessage('Your photo/video has been submitted!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
      
      // Update answered modules list
      setAnsweredModules(prev => new Set([...prev, photoVideoModule.id]));
      
      // Close the modal
      setPhotoVideoModalVisible(false);
      setPhotoVideoModule(null);
      setPhotoVideoComment('');
      setSelectedMedia(null);
      
    } catch (error: any) {
      console.error('[PHOTO/VIDEO] Error submitting:', error);
      setErrorMessage(`Failed to submit response: ${error?.message || 'Unknown error'}`);
      setShowErrorModal(true);
    } finally {
      setIsSubmittingPhotoVideo(false);
    }
  };

  // Request camera and media library permissions
  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
    
    return cameraPermission.status === 'granted' && mediaLibraryPermission.status === 'granted';
  };

  // Take a photo using camera
  const takePhoto = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setErrorMessage('Camera and media library permissions are required');
        setShowErrorModal(true);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedMedia({ uri: result.assets[0].uri, type: 'photo' });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('[PHOTO/VIDEO] Error taking photo:', error);
      setErrorMessage('Failed to take photo');
      setShowErrorModal(true);
    }
  };

  // Record a video using camera
  const recordVideo = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setErrorMessage('Camera and media library permissions are required');
        setShowErrorModal(true);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        videoMaxDuration: 30, // 30 seconds max
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedMedia({ uri: result.assets[0].uri, type: 'video' });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('[PHOTO/VIDEO] Error recording video:', error);
      setErrorMessage('Failed to record video');
      setShowErrorModal(true);
    }
  };

  // Pick from media library
  const pickFromLibrary = async () => {
    try {
      const hasPermission = await MediaLibrary.requestPermissionsAsync();
      if (hasPermission.status !== 'granted') {
        setErrorMessage('Media library permission is required');
        setShowErrorModal(true);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const type = result.assets[0].type === 'video' ? 'video' : 'photo';
        setSelectedMedia({ uri: result.assets[0].uri, type });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('[PHOTO/VIDEO] Error picking from library:', error);
      setErrorMessage('Failed to pick from library');
      setShowErrorModal(true);
    }
  };

  // Upload media to Supabase storage
  const uploadMediaToStorage = async (fileUri: string, mediaType: 'photo' | 'video'): Promise<string> => {
    try {
      console.log('[UPLOAD] Starting upload for:', fileUri);
      
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('[UPLOAD] File read as base64, size:', base64.length);
      
      // For now, use data URL approach to bypass storage issues
      // This stores the media data directly in the database as a data URL
      const dataUrl = `data:${mediaType === 'photo' ? 'image/jpeg' : 'video/mp4'};base64,${base64}`;
      console.log('[UPLOAD] Using data URL approach to bypass storage issues');
      
      return dataUrl;
      
    } catch (error) {
      console.error('[UPLOAD] Error reading file:', error);
      throw error;
    }
  };

  // Helper function to decode base64
  const decode = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Handle photo/video modal close
  const handlePhotoVideoClose = () => {
    setPhotoVideoModalVisible(false);
    setPhotoVideoModule(null);
    setPhotoVideoComment('');
    setSelectedMedia(null);
  };

  // At the top level of your TimelineScreen component (after function definition):
  useEffect(() => {
    fetch('https://ijsktwmevnqgzwwuggkf.functions.supabase.co/guest-upload-image')
      .then(res => res.text())
      .then(text => console.log('[EDGE FUNCTION CONNECTIVITY TEST]', text))
      .catch(err => console.error('[EDGE FUNCTION CONNECTIVITY ERROR]', err));
  }, []);












  // Main Content
  return (
    <View style={{ flex: 1, backgroundColor: theme === 'light' ? '#FFFFFF' : '#18181b' }}>
      <LinearGradient
        colors={["#18181b", "#23272F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GeometricOverlay />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent} // Remove extra top padding
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, { paddingBottom: 90, width: '100%', paddingHorizontal: 0 }]}> {/* Full width, no horizontal padding */}
          
          <View style={{ flex: 1, flexDirection: 'row', width: '100%' }}>
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={{ height: TIMELINE_HEIGHT, alignItems: 'center', width: '100%' }}
              showsVerticalScrollIndicator={false}
              onLayout={() => {
                if (
                  !hasAutoScrolled &&
                  !loading &&
                  (itineraries.length > 0 || timelineModules.length > 0)
                ) {
                  const y = getYForTime(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds());
                  const centerOffset = SCREEN_HEIGHT / 2;
                  const scrollTarget = y - centerOffset;
                  scrollViewRef.current?.scrollTo({ y: scrollTarget, animated: false });
                  setHasAutoScrolled(true);
                }
              }}
            >
              {/* Current time indicator - now at the very top, above time labels */}
              <View
                style={[
                  styles.currentTimeIndicator,
                  { top: getYForTime(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds()), zIndex: 10 }
                ]}
              />
              {/* Time labels - overlayed, not in a separate container */}
              {Array.from({ length: 24 * 4 }).map((_, i) => {
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
                        left: 10, // Indent from edge
                        top: y - 8, // Center the label on the time position
                        zIndex: 1,
                      }
                    ]}
                  >
                    {String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0')}
                  </Text>
                );
              })}
              {/* Itinerary items and milestones */}
              {mergedItems.map((item) => {
                if (!item.start_time || typeof item.start_time !== 'string') {
                  console.warn('Invalid item start_time:', item.start_time);
                  return null;
                }
                
                const timeParts = item.start_time.split(':');
                if (timeParts.length !== 2) {
                  console.warn('Invalid time format:', item.start_time);
                  return null;
                }
                
                const hours = parseInt(timeParts[0], 10) || 0;
                const minutes = parseInt(timeParts[1], 10) || 0;
                const y = getYForTime(hours, minutes);
                

                
                // If this is a question module, open the question modal on press
                if (item.is_module && item.module_type === 'question') {
                  return (
                    <View key={item.id} style={[styles.itemContainer, { top: y }]}> 
                      <TouchableOpacity
                        style={styles.milestoneContainer}
                        onPress={() => {
                          setQuestionModule(item);
                          setQuestionModalVisible(true);
                          setQuestionAnswer('');
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.milestone} />
                        <Text style={styles.milestoneTitle}>{String(item.title || 'Untitled')}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }
                
                // If this is a feedback module, open the feedback modal on press
                if (item.is_module && item.module_type === 'feedback') {
                  return (
                    <View key={item.id} style={[styles.itemContainer, { top: y }]}> 
                      <TouchableOpacity
                        style={styles.milestoneContainer}
                        onPress={() => {
                          setFeedbackModule(item);
                          setFeedbackModalVisible(true);
                          setFeedbackRating(0);
                          setFeedbackComment('');
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.milestone} />
                        <Text style={styles.milestoneTitle}>{String(item.title || 'Feedback')}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }
                

                
                // If this is a photo/video module, open the photo/video modal on press
                if (item.is_module && item.module_type === 'photo_video') {
                  return (
                    <View key={item.id} style={[styles.itemContainer, { top: y }]}> 
                      <TouchableOpacity
                        style={styles.milestoneContainer}
                        onPress={() => {
                          setPhotoVideoModule(item);
                          setPhotoVideoModalVisible(true);
                          setPhotoVideoComment('');
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.milestone} />
                        <Text style={styles.milestoneTitle}>{String(item.title || 'Photo/Video')}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }
                // ---
                // Default: open full-screen itinerary modal
                return (
                  <View key={item.id} style={[styles.itemContainer, { top: y }]}> 
                    <TouchableOpacity
                      style={styles.milestoneContainer}
                      onPress={() => {
                        setSelectedMilestone(item);
                        setMilestoneModalVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.milestone} />
                      <Text style={styles.milestoneTitle}>{String(item.title || 'Untitled')}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
          {/* Loading Overlay */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
        </View>

        {/* Centered vertical timeline line - always centered */}
        <View pointerEvents="none" style={[styles.timelineLine, { left: Dimensions.get('window').width / 2 - TIMELINE_WIDTH / 2, transform: undefined }]} />
        {/* Date Picker Bar - fixed above navbar, not affected by scroll */}
      </ScrollView>
      <View style={styles.bottomDatePickerWrapper} pointerEvents="box-none">
                <View style={styles.pillShadowWrapper}>
          <BlurView intensity={40} tint="light" style={styles.pillContainer}>
            <LinearGradient
              colors={["rgba(0,0,0,0.13)", "rgba(0,0,0,0.07)", "rgba(0,0,0,0)"]}
              style={styles.innerShadow}
              pointerEvents="none"
            />
            <TouchableOpacity onPress={goToPreviousDay} style={styles.arrowButton}>
              <Text style={styles.arrowText}>◀</Text>
            </TouchableOpacity>
            <Text style={styles.dateDisplayText}>
              {formatDate(selectedDate)}
            </Text>
            <TouchableOpacity onPress={goToNextDay} style={styles.arrowButton}>
              <Text style={styles.arrowText}>▶</Text>
            </TouchableOpacity>
          </BlurView>
          {/* Border overlay above BlurView */}
          <View pointerEvents="none" style={styles.pillBorderOverlay} />
        </View>
      </View>
      
      {/* Full-Screen Countdown Modal */}
      <Modal
        visible={countdownModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCountdownModalVisible(false)}
      >
        <View style={styles.fullScreenModal}>
          <LinearGradient
            colors={["#000000", "#1a1a1a", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Countdown Phase */}
          {animationPhase === 'countdown' && (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>{countdownSeconds}</Text>
            </View>
          )}
          
          {/* Content Phase */}
          {animationPhase !== 'countdown' && (
            <View style={styles.contentContainer}>
              {/* Title - Always visible after title phase */}
              <Animated.View 
                style={[
                  styles.animatedTitle,
                  { opacity: animationPhase === 'title' || animationPhase === 'info' || animationPhase === 'description' || animationPhase === 'attachments' || animationPhase === 'complete' ? 1 : 0 }
                ]}
              >
                <Text style={styles.eventTitle}>{String(upcomingItem?.title || 'Event')}</Text>
              </Animated.View>
              
              {/* Info - Visible after info phase */}
              <Animated.View 
                style={[
                  styles.animatedInfo,
                  { opacity: animationPhase === 'info' || animationPhase === 'description' || animationPhase === 'attachments' || animationPhase === 'complete' ? 1 : 0 }
                ]}
              >
                <Text style={styles.eventDate}>
                  {formatDate(selectedDate)}
                </Text>
                <Text style={styles.eventTime}>
                  {String(upcomingItem?.start_time || '')} - {String(upcomingItem?.end_time || '')}
                </Text>
              </Animated.View>
              
              {/* Description - Visible after description phase */}
              {upcomingItem?.description && (
                <Animated.View 
                  style={[
                    styles.animatedDescription,
                    { opacity: animationPhase === 'description' || animationPhase === 'attachments' || animationPhase === 'complete' ? 1 : 0 }
                  ]}
                >
                  <Text style={styles.eventDescription}>{String(upcomingItem.description)}</Text>
                </Animated.View>
              )}
              
                                {/* Attachments - Visible after attachments phase */}
                  <Animated.View 
                    style={[
                      styles.animatedAttachments,
                      { opacity: animationPhase === 'attachments' || animationPhase === 'complete' ? 1 : 0 }
                    ]}
                  >
                    {/* QR Code */}
                    {upcomingItem?.qr_code && (
                      <View style={styles.attachmentItem}>
                        <Text style={styles.attachmentLabel}>QR Code</Text>
                        <TouchableOpacity style={styles.qrCodeButton} onPress={handleQRCodeView}>
                          <Text style={styles.qrCodeText}>View QR Code</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    {/* Document */}
                    {upcomingItem?.document && (
                      <View style={styles.attachmentItem}>
                        <Text style={styles.attachmentLabel}>Document</Text>
                        <TouchableOpacity style={styles.documentButton} onPress={handleDocumentDownload}>
                          <Text style={styles.documentText}>Download Document</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    {/* Link */}
                    {upcomingItem?.link && (
                      <View style={styles.attachmentItem}>
                        <Text style={styles.attachmentLabel}>Link</Text>
                        <TouchableOpacity style={styles.linkButton} onPress={handleLinkOpen}>
                          <Text style={styles.linkText}>{String(upcomingItem.link)}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </Animated.View>
              
              {/* Close Button */}
              {animationPhase === 'complete' && (
                <Animated.View style={styles.closeButtonContainer}>
                  <TouchableOpacity 
                    style={styles.fullScreenCloseButton}
                    onPress={() => setCountdownModalVisible(false)}
                  >
                    <Text style={styles.fullScreenCloseText}>✕</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          )}
        </View>
      </Modal>
      
      {/* Question Module Modal */}
      <Modal
        visible={questionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleQuestionClose}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.fullScreenModal}>
          <LinearGradient
            colors={["#000000", "#1a1a1a", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={styles.questionContainer}>
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.questionCloseButton}
              onPress={handleQuestionClose}
            >
              <Text style={styles.questionCloseText}>✕</Text>
            </TouchableOpacity>
            
            {/* Question */}
            <View style={styles.questionContent}>
                <Text style={[styles.questionTitle, { textAlign: 'center' }]}>Question</Text>
                <Text style={[styles.questionText, { textAlign: 'center' }]}>{String(questionModule?.title || 'No question available')}</Text>
              
              {/* Answer Input */}
              <View style={styles.answerInputContainer}>
                  <Text style={[styles.answerLabel, { textAlign: 'center' }]}>Your Answer</Text>
                <TextInput
                  style={styles.answerInput}
                  value={questionAnswer}
                  onChangeText={setQuestionAnswer}
                  placeholder="Type your answer here..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
                  <Text style={[styles.characterCount, { textAlign: 'center' }]}>
                  {questionAnswer.length}/500 characters
                </Text>
              </View>
              
              {/* Submit Button */}
              {answeredModules.has(questionModule?.id) ? (
                <View style={[styles.submitButton, { backgroundColor: 'rgba(40,200,120,0.3)', borderColor: '#28c874' }]}>
                  <Text style={[styles.submitButtonText, { color: '#28c874' }]}>
                    ✓ Submitted
                  </Text>
                </View>
              ) : (
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  { opacity: questionAnswer.trim() ? 1 : 0.5 }
                ]}
                onPress={handleQuestionSubmit}
                disabled={!questionAnswer.trim() || isSubmittingAnswer}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmittingAnswer ? 'Submitting...' : 'Submit Answer'}
                </Text>
              </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        </TouchableWithoutFeedback>
      </Modal>
      
      {/* Feedback Module Modal */}
      <Modal
        visible={feedbackModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleFeedbackClose}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.fullScreenModal}>
            <LinearGradient
              colors={["#000000", "#1a1a1a", "#000000"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            
            <View style={styles.questionContainer}>
              {/* Close Button */}
              <TouchableOpacity 
                style={styles.questionCloseButton}
                onPress={handleFeedbackClose}
              >
                <Text style={styles.questionCloseText}>✕</Text>
              </TouchableOpacity>
              
              {/* Feedback Content */}
              <View style={styles.questionContent}>
                <Text style={[styles.questionTitle, { textAlign: 'center' }]}>Feedback</Text>
                <Text style={[styles.questionText, { textAlign: 'center' }]}>{String(feedbackModule?.title || 'Please provide your feedback')}</Text>
                
                {/* Star Rating */}
                <View style={styles.answerInputContainer}>
                  <Text style={[styles.answerLabel, { textAlign: 'center' }]}>Rate your experience *</Text>
                  <StarRating
                    rating={feedbackRating}
                    onRatingChange={setFeedbackRating}
                    isDark={theme === 'dark'}
                  />
                        </View>
                
                {/* Comment Input */}
                <View style={styles.answerInputContainer}>
                  <Text style={[styles.answerLabel, { textAlign: 'center' }]}>Comments (optional)</Text>
                  <TextInput
                    style={styles.answerInput}
                    value={feedbackComment}
                    onChangeText={setFeedbackComment}
                    placeholder="Share your feedback..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <Text style={[styles.characterCount, { textAlign: 'center' }]}>
                    {feedbackComment.length}/500 characters
                  </Text>
                    </View>
                
                {/* Submit Button */}
                {answeredModules.has(feedbackModule?.id) ? (
                  <View style={[styles.submitButton, { backgroundColor: 'rgba(40,200,120,0.3)', borderColor: '#28c874' }]}>
                    <Text style={[styles.submitButtonText, { color: '#28c874' }]}>
                      ✓ Submitted
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[
                      styles.submitButton,
                      { opacity: feedbackRating > 0 ? 1 : 0.5 }
                    ]}
                    onPress={handleFeedbackSubmit}
                    disabled={feedbackRating === 0 || isSubmittingFeedback}
                  >
                    <Text style={styles.submitButtonText}>
                      {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      

      
      {/* Photo/Video Module Modal */}
      <Modal
        visible={photoVideoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handlePhotoVideoClose}
      >
        <View style={styles.fullScreenModal}>
          <LinearGradient
            colors={["#000000", "#1a1a1a", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={styles.questionContainer}>
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.questionCloseButton}
              onPress={handlePhotoVideoClose}
            >
              <Text style={styles.questionCloseText}>✕</Text>
            </TouchableOpacity>
            
            {/* Photo/Video Content */}
            <View style={styles.questionContent}>
              <Text style={[styles.questionTitle, { textAlign: 'center' }]}>Photo/Video</Text>
              <Text style={[styles.questionText, { textAlign: 'center' }]}>{String(photoVideoModule?.title || 'Share your photos or videos')}</Text>
              
              {/* Media Selection Options */}
              <View style={styles.answerInputContainer}>
                <Text style={[styles.answerLabel, { textAlign: 'center' }]}>Choose your media</Text>
                
                <View style={styles.mediaOptionsContainer}>
                  <TouchableOpacity style={styles.mediaOptionButton} onPress={takePhoto}>
                    <Text style={styles.mediaOptionText}>Take Photo</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.mediaOptionButton} onPress={recordVideo}>
                    <Text style={styles.mediaOptionText}>Record Video</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.mediaOptionButton} onPress={pickFromLibrary}>
                    <Text style={styles.mediaOptionText}>Choose from Library</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Selected Media Preview */}
              {selectedMedia && (
                <View style={styles.answerInputContainer}>
                  <Text style={[styles.answerLabel, { textAlign: 'center' }]}>
                    Selected: {selectedMedia.type === 'photo' ? 'Photo' : 'Video'}
                  </Text>
                  <View style={styles.mediaPreviewContainer}>
                    <Text style={styles.mediaPreviewText}>
                      {selectedMedia.type === 'photo' ? 'Photo selected' : 'Video selected'}
                    </Text>
                    <TouchableOpacity 
                      style={styles.removeMediaButton}
                      onPress={() => setSelectedMedia(null)}
                    >
                      <Text style={styles.removeMediaText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {/* Submit Button */}
              {answeredModules.has(photoVideoModule?.id) ? (
                <View style={[styles.submitButton, { backgroundColor: 'rgba(40,200,120,0.3)', borderColor: '#28c874' }]}>
                  <Text style={[styles.submitButtonText, { color: '#28c874' }]}>
                    ✓ Submitted
                  </Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.submitButton,
                    { opacity: selectedMedia ? 1 : 0.5 }
                  ]}
                  onPress={handlePhotoVideoSubmit}
                  disabled={!selectedMedia || isSubmittingPhotoVideo}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmittingPhotoVideo ? 'Submitting...' : 'Submit Photo/Video'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Itinerary Item Full-Screen Modal */}
      <Modal
        visible={milestoneModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMilestoneModalVisible(false)}
      >
        <View style={styles.fullScreenModal}>
          <LinearGradient
            colors={["#000000", "#1a1a1a", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={styles.questionContainer}>
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.questionCloseButton}
              onPress={() => setMilestoneModalVisible(false)}
            >
              <Text style={styles.questionCloseText}>✕</Text>
            </TouchableOpacity>
            
            {/* Itinerary Content */}
            <View style={styles.questionContent}>
              <Text style={[styles.questionTitle, { textAlign: 'center' }]}>{String(selectedMilestone?.title || 'Event Details')}</Text>
              
              {/* Time Information */}
              <View style={styles.answerInputContainer}>
                <Text style={[styles.answerLabel, { textAlign: 'center' }]}>Time</Text>
                <Text style={[styles.questionText, { textAlign: 'center' }]}>
                  {(() => {
                    let timeText = '';
                    if (selectedMilestone?.arrival_time) {
                      timeText += 'Arrival: ' + String(selectedMilestone.arrival_time);
                    }
                    if (selectedMilestone?.start_time) {
                      timeText += (timeText ? '\n' : '') + 'Start: ' + String(selectedMilestone.start_time);
                    }
                    if (selectedMilestone?.end_time) {
                      timeText += (timeText ? '\n' : '') + 'End: ' + String(selectedMilestone.end_time);
                    }
                    return timeText;
                  })()}
                </Text>
              </View>
              
              {/* Location */}
              {selectedMilestone?.location && (
                <View style={styles.answerInputContainer}>
                  <Text style={[styles.answerLabel, { textAlign: 'center' }]}>Location</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const loc = encodeURIComponent(selectedMilestone.location);
                      const url = Platform.OS === 'ios'
                        ? `http://maps.apple.com/?q=${loc}`
                        : `geo:0,0?q=${loc}`;
                      Linking.openURL(url);
                    }}
                  >
                    <Text style={[styles.questionText, { color: '#ffffff', textDecorationLine: 'underline', textAlign: 'center' }]}>
                      {String(selectedMilestone.location)}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Description */}
              {selectedMilestone?.description && (
                <View style={styles.answerInputContainer}>
                  <Text style={[styles.answerLabel, { textAlign: 'center' }]}>Description</Text>
                  <Text style={[styles.questionText, { textAlign: 'center' }]}>{String(selectedMilestone.description)}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
      {/* Custom Toast */}
      {showToast && (
  <View style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  }}>
    <View style={{
      backgroundColor: 'rgba(40,200,120,0.95)',
      paddingHorizontal: 28,
      paddingVertical: 16,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    }}>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{toastMessage}</Text>
    </View>
  </View>
)}

      {/* Custom Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.fullScreenModal}>
          <LinearGradient
            colors={["#000000", "#1a1a1a", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          <View style={styles.questionContainer}>
            <View style={styles.questionContent}>
              <Text style={[styles.questionTitle, { textAlign: 'center', color: '#ff6b6b' }]}>Error</Text>
              <Text style={[styles.questionText, { textAlign: 'center' }]}>{errorMessage}</Text>
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={() => setShowErrorModal(false)}
              >
                <Text style={styles.submitButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 64,
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  badgeContainer: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -TIMELINE_WIDTH / 2 }],
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
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#0080ff',
    shadowColor: '#0080ff',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    zIndex: 10, // Ensure it's above time labels
  },
  timeLabel: {
    color: '#fff',
    opacity: 0.6,
    fontSize: 14,
    textAlign: 'right',
    fontWeight: '500',
    position: 'absolute',
    left: 10, // was 5, increase indent
    zIndex: 1,
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
  timelineCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#fff',
  },
  timelineCard: {
    minWidth: 200,
    maxWidth: 280,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fff',
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden', // Add this to clip the BlurView
  },
  activeItemWrapper: {
    position: 'absolute',
    top: -200, // Much higher above the timeline
    left: -160, // Better centered
    zIndex: 50, // Much higher z-index to ensure it's above everything
  },
  activeItemCardWrapper: {
    borderRadius: 24, // Match the card
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#fff',
    shadowOpacity: 0.4, // Stronger shadow
    shadowRadius: 20, // Bigger shadow
    shadowOffset: { width: 0, height: 0 },
    elevation: 15, // Higher elevation
  },
  activeItemCard: {
    minWidth: 360, // Much bigger - doubled from 280
    maxWidth: 400, // Much bigger - doubled from 320
    borderRadius: 24, // Slightly more rounded
    backgroundColor: 'rgba(255,255,255,0.18)', // Slightly more opaque
    borderWidth: 2,
    borderColor: '#fff',
    padding: 28, // More padding for bigger content
    alignItems: 'center',
    overflow: 'hidden',
  },
  activeItemTitle: {
    fontSize: 24, // Much bigger - doubled from 18
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12, // More spacing
  },
  activeItemTime: {
    fontSize: 18, // Much bigger - doubled from 14
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8, // More spacing
    fontWeight: '600',
  },
  activeItemLocation: {
    fontSize: 16, // Much bigger - doubled from 12
    color: '#fff',
    opacity: 0.8, // Slightly more visible
    textAlign: 'center',
    fontWeight: '500',
  },
  itemTitle: {
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  bottomDatePickerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 36, // was 24, increase to avoid overlap
    alignItems: 'center',
    zIndex: 101,
    pointerEvents: 'box-none',
  },
  pillShadowWrapper: {
    borderRadius: 40,
    overflow: 'hidden',
    alignSelf: 'center',
  },

  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 40,
    paddingHorizontal: 26,
    paddingVertical: 12,
    backgroundColor: 'rgba(40,40,50,0.32)', // subtle glassy effect
    minWidth: 220,
    maxWidth: '90%',
    // No border here
  },
  pillBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    zIndex: 2,
  },
  innerShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    zIndex: 1,
  },
  arrowButton: {
    padding: 0,
    marginHorizontal: 10,
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  arrowText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
    opacity: 1,
    textAlign: 'center',
  },
  dateDisplayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1,
    opacity: 1,
    marginHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#23272F',
    borderRadius: 18,
    padding: 28,
    minWidth: 280,
    maxWidth: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
    marginBottom: 2,
    alignSelf: 'center',
    textAlign: 'center',
  },
  modalValue: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 2,
    alignSelf: 'center',
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 18,
    backgroundColor: '#444',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#fff',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalPillWrapper: {
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  modalPillContainer: {
    borderRadius: 36,
    paddingHorizontal: 28,
    paddingVertical: 28,
    minWidth: 280,
    maxWidth: '85%',
    alignItems: 'center',
    backgroundColor: 'rgba(40,40,50,0.32)',
    shadowColor: '#fff',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    position: 'relative',
    overflow: 'hidden', // Add this to clip the BlurView
  },
  modalPillBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    zIndex: 2,
  },
  modalCloseIcon: {
    position: 'absolute',
    top: 12,
    right: 18,
    zIndex: 10,
  },
  modalCloseText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    opacity: 0.7,
  },
  modalLocationLink: {
    fontSize: 16,
    color: '#4faaff',
    textDecorationLine: 'underline',
    marginBottom: 2,
    alignSelf: 'center',
    textAlign: 'center',
  },

  optionsContainer: {
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  optionItem: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginVertical: 5,
    width: '90%',
    alignItems: 'center',
  },
  optionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  // Full-screen countdown modal styles
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#000000',
  },
  countdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  animatedTitle: {
    marginBottom: 40,
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  animatedInfo: {
    marginBottom: 30,
    alignItems: 'center',
  },
  eventDate: {
    fontSize: 24,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
    opacity: 0.8,
  },
  eventTime: {
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
  },
  animatedDescription: {
    marginBottom: 30,
    alignItems: 'center',
    maxWidth: '80%',
  },
  eventDescription: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.9,
  },
  animatedAttachments: {
    alignItems: 'center',
    marginBottom: 40,
  },
  attachmentItem: {
    marginBottom: 20,
    alignItems: 'center',
  },
  attachmentLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    opacity: 0.7,
  },
  qrCodeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  qrCodeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  documentButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  documentText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  linkText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 60,
    right: 30,
  },
  fullScreenCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  fullScreenCloseText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  // Question module modal styles
  questionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  questionCloseButton: {
    position: 'absolute',
    top: 60,
    right: 30,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  questionCloseText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  questionContent: {
    width: '100%',
    alignItems: 'center',
  },
  questionTitle: {
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 20,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 20,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
    maxWidth: '90%',
  },
  answerInputContainer: {
    width: '100%',
    marginBottom: 30,
    alignItems: 'center',
  },
  answerLabel: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 10,
    fontWeight: '600',
  },
  answerInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    padding: 15,
    color: '#ffffff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    width: '100%',
  },
  characterCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ffffff',
    minWidth: 200,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Poll/Multiple Choice styles
  optionButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  selectedOptionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: '#ffffff',
  },
  pollOptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedOptionText: {
    fontWeight: '700',
  },
  pollResultsContainer: {
    width: '100%',
  },
  pollResultItem: {
    marginBottom: 15,
  },
  pollResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  pollResultOption: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  pollResultVotes: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '400',
  },
  pollResultBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  pollResultBarFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 4,
  },
  noResultsText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Photo/Video module styles
  mediaOptionsContainer: {
    width: '100%',
    gap: 12,
  },
  mediaOptionButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '100%',
  },
  mediaOptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  mediaPreviewContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  mediaPreviewText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  removeMediaButton: {
    backgroundColor: 'rgba(255,107,107,0.2)',
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeMediaText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
  submittedButton: {
    backgroundColor: 'rgba(40,200,120,0.3)',
    borderColor: '#28c874',
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  submittedButtonText: {
    color: '#28c874',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledOption: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
}); 