import React, { useState, useMemo, useEffect, useImperativeHandle, forwardRef, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface ItineraryItem {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  arrival_time?: string;
  location?: string;
  description?: string;
  // Module support
  module?: string;
  link?: string;
  file?: string;
  survey?: any;
  feedback?: any;
}

interface TimelinePreviewProps {
  itineraries: ItineraryItem[];
  isDark: boolean;
  eventId?: string; // Add eventId prop
}

interface TimelinePreviewRef {
  goToPrevious: () => void;
  goToNext: () => void;
  goToItem: (index: number) => void;
  openModuleManagement: () => void;
}

// Define a type for question modules
interface QuestionModule {
  type: 'question';
  question: string;
  time: string;
  createdAt?: string;
}

const formatTime = (timeString: string) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};

// StarRating component definition
const StarRating = ({ rating, onRatingChange, isDark }: { rating: number, onRatingChange: (rating: number) => void, isDark: boolean }) => {
  const [isInteracting, setIsInteracting] = useState(false);
  const starContainerRef = useRef<HTMLDivElement>(null);

  const handleStarInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!starContainerRef.current) return;
    
    const rect = starContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newRating = Math.round(percentage * 50) / 10; // 0-5 with 0.1 precision
    
    onRatingChange(newRating);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isInteracting) {
      handleStarInteraction(e);
    }
  };

  const StarIcon = ({ filled, partial = 0 }: { filled: boolean, partial?: number }) => (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Background star (hollow) */}
      <svg width="20" height="20" viewBox="0 0 24 24" style={{ display: 'block' }}>
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
          strokeWidth="1"
        />
      </svg>
      
      {/* Filled star overlay */}
      {(filled || partial > 0) && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'hidden',
          width: filled ? '100%' : `${partial * 100}%`,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="#fbbf24"
            />
          </svg>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={starContainerRef}
        style={{
          display: 'flex',
          gap: 3,
          cursor: 'pointer',
          userSelect: 'none',
          padding: '6px 0',
        }}
        onMouseDown={(e) => {
          setIsInteracting(true);
          handleStarInteraction(e);
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsInteracting(false)}
        onMouseLeave={() => setIsInteracting(false)}
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
      </div>
      
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: isDark ? '#fbbf24' : '#d97706',
        minHeight: 20,
      }}>
        {rating > 0 ? rating.toFixed(1) : '0.0'}
      </div>
    </div>
  );
};

const TimelinePreview = forwardRef<TimelinePreviewRef, TimelinePreviewProps>(({ itineraries, isDark, eventId }, ref) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
  const [showEventCard, setShowEventCard] = useState(false);
  const [animatingCard, setAnimatingCard] = useState(false);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const eventRefs = useRef<(HTMLDivElement | null)[]>([]);

  // State for animated viewport center position (timelinePosition, 0-100)
  const [animatedViewportCenter, setAnimatedViewportCenter] = useState<number | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('TimelinePreview received itineraries:', itineraries);
  }, [itineraries]);

  // Update current time every minute to simulate real-time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Process and sort itineraries by date and time
  const sortedItineraries = useMemo(() => {
    if (!itineraries || itineraries.length === 0) {
      console.log('No itineraries available');
      return [];
    }
    
    console.log('Processing itineraries:', itineraries);
    
    // Parse actual times from itinerary data
    const processed = itineraries.map((item) => {
      // Parse the date and time properly
      let dateTime: Date;
      let endDateTime: Date;
      
      try {
        // Handle different date formats
        const dateStr = item.date;
        const startTimeStr = item.start_time;
        const endTimeStr = item.end_time;
        
        // Create date objects from the actual data
        if (dateStr && startTimeStr) {
          const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
          const [endHours, endMinutes] = endTimeStr ? endTimeStr.split(':').map(Number) : [startHours + 1, startMinutes];
          
          // Use today's date if the date parsing fails, for demo purposes
          const baseDate = new Date(dateStr) || new Date();
          
          dateTime = new Date(baseDate);
          dateTime.setHours(startHours, startMinutes, 0, 0);
          
          endDateTime = new Date(baseDate);
          endDateTime.setHours(endHours, endMinutes, 0, 0);
        } else {
          // Fallback to current time if parsing fails
          dateTime = new Date();
          endDateTime = new Date(dateTime.getTime() + 60 * 60 * 1000); // 1 hour later
        }
        
        return {
          ...item,
          dateTime,
          endDateTime,
          timestamp: dateTime.getTime(),
          endTimestamp: endDateTime.getTime()
        };
      } catch (error) {
        console.error('Error parsing date/time for item:', item, error);
        // Fallback
        const now = new Date();
        return {
          ...item,
          dateTime: now,
          endDateTime: new Date(now.getTime() + 60 * 60 * 1000),
          timestamp: now.getTime(),
          endTimestamp: now.getTime() + 60 * 60 * 1000
        };
      }
    });
    
    // Sort by actual time
    const sorted = processed.sort((a, b) => a.timestamp - b.timestamp);
    console.log('Processed and sorted itineraries:', sorted);
    return sorted;
  }, [itineraries]);

  // --- QR Code Module State ---
  const [qrModules, setQrModules] = useState<any[]>([]);
  // --- Survey Module State ---
  const [surveyModules, setSurveyModules] = useState<any[]>([]);
  // --- Question Module State ---
  const [questionModules, setQuestionModules] = useState<QuestionModule[]>([]);
  // --- Feedback Module State ---
  const [feedbackModules, setFeedbackModules] = useState<any[]>([]);

  // Add refresh trigger state
  const [moduleRefreshTrigger, setModuleRefreshTrigger] = useState(0);

  // Function to load all modules from database instead of localStorage
  const loadModulesFromDatabase = useCallback(async () => {
    if (!eventId) {
      console.log('No eventId provided, clearing modules');
      setQrModules([]);
      setSurveyModules([]);
      setQuestionModules([]);
      setFeedbackModules([]);
      return;
    }

    try {
      console.log('Loading timeline modules for event:', eventId);
      
      const { data, error } = await supabase.rpc('get_event_timeline_modules', {
        p_event_id: eventId
      });

      if (error) {
        console.error('Error loading timeline modules:', error);
        return;
      }

      console.log('Loaded timeline modules from database:', data);

      // Separate modules by type
      const qrData = data?.filter((m: any) => m.module_type === 'qrcode').map((m: any) => ({
        id: m.id,
        time: m.time,
        label: m.label || m.title,
        link: m.link,
        file: m.file,
        type: 'qrcode'
      })) || [];

      const surveyData = data?.filter((m: any) => m.module_type === 'survey').map((m: any) => ({
        id: m.id,
        time: m.time,
        title: m.title,
        survey_data: m.survey_data,
        type: 'survey'
      })) || [];

      const questionData = data?.filter((m: any) => m.module_type === 'question').map((m: any) => ({
        id: m.id,
        time: m.time,
        question: m.question || m.title,
        type: 'question',
        createdAt: m.created_at
      })) || [];

      const feedbackData = data?.filter((m: any) => m.module_type === 'feedback').map((m: any) => ({
        id: m.id,
        time: m.time,
        question: m.question || m.title,
        feedback_data: m.feedback_data,
        type: 'feedback'
      })) || [];

      setQrModules(qrData);
      setSurveyModules(surveyData);
      setQuestionModules(questionData);
      setFeedbackModules(feedbackData);

      console.log('Modules loaded successfully:', {
        qr: qrData.length,
        survey: surveyData.length,
        question: questionData.length,
        feedback: feedbackData.length
      });

    } catch (error) {
      console.error('Error loading timeline modules:', error);
    }
  }, [eventId]);

  // Load modules on mount and when eventId changes
  useEffect(() => {
    loadModulesFromDatabase();
  }, [loadModulesFromDatabase, eventId]);

  // Listen for custom refresh events (for same-tab updates)
  useEffect(() => {
    const handleCustomRefresh = () => {
      loadModulesFromDatabase();
    };

    window.addEventListener('refreshTimelineModules', handleCustomRefresh);
    return () => window.removeEventListener('refreshTimelineModules', handleCustomRefresh);
  }, [loadModulesFromDatabase]);

  // --- Merge all modules into timeline events ---
  const mergedItineraries = useMemo(() => {
    const base = [...sortedItineraries];
    // Add QR modules
    qrModules.forEach((q: any, idx: number) => {
      const today = new Date();
      const [h, m] = q.time.split(':').map(Number);
      const dateTime = new Date(today);
      dateTime.setHours(h, m, 0, 0);
      base.push({
        id: `qrcode-${idx}`,
        title: q.label || 'QR Code',
        date: today.toISOString().split('T')[0],
        start_time: q.time,
        end_time: q.time,
        dateTime: dateTime,
        endDateTime: dateTime,
        timestamp: dateTime.getTime(),
        endTimestamp: dateTime.getTime(),
        module: 'qrcode',
        link: q.link,
        file: q.file,
      });
    });
    // Add Survey modules
    surveyModules.forEach((s: any, idx: number) => {
      const today = new Date();
      const [h, m] = s.time.split(':').map(Number);
      const dateTime = new Date(today);
      dateTime.setHours(h, m, 0, 0);
      base.push({
        id: `survey-${idx}`,
        title: s.title || 'Survey',
        date: today.toISOString().split('T')[0],
        start_time: s.time,
        end_time: s.time,
        dateTime: dateTime,
        endDateTime: dateTime,
        timestamp: dateTime.getTime(),
        endTimestamp: dateTime.getTime(),
        module: 'survey',
        survey: s,
      });
    });
    // Add Question modules
    questionModules.forEach((q: any, idx: number) => {
      if (!base.some(e => e.timestamp && formatTime(e.start_time) === q.time && e.title === q.question)) {
        const today = new Date();
        const [h, m] = q.time.split(':').map(Number);
        const dateTime = new Date(today);
        dateTime.setHours(h, m, 0, 0);
        base.push({
          id: `question-${idx}`,
          title: q.question,
          date: today.toISOString().split('T')[0],
          start_time: q.time,
          end_time: q.time,
          dateTime: dateTime,
          endDateTime: dateTime,
          timestamp: dateTime.getTime(),
          endTimestamp: dateTime.getTime(),
          module: 'question',
        });
      }
    });
    // Add Feedback modules
    feedbackModules.forEach((f: any, idx: number) => {
      const today = new Date();
      const [h, m] = f.time.split(':').map(Number);
      const dateTime = new Date(today);
      dateTime.setHours(h, m, 0, 0);
      base.push({
        id: `feedback-${idx}`,
        title: f.question || 'Feedback',
        date: today.toISOString().split('T')[0],
        start_time: f.time,
        end_time: f.time,
        dateTime: dateTime,
        endDateTime: dateTime,
        timestamp: dateTime.getTime(),
        endTimestamp: dateTime.getTime(),
        module: 'feedback',
        feedback: f,
      });
    });
    return base.sort((a, b) => a.timestamp - b.timestamp);
  }, [sortedItineraries, qrModules, surveyModules, questionModules, feedbackModules]);

  // For timeline display, show events in a reasonable time window
  const visibleEvents = useMemo(() => {
    if (mergedItineraries.length === 0) return [];
    
    const now = currentTime.getTime();
    const fourHoursAgo = now - (4 * 60 * 60 * 1000);
    const eightHoursAhead = now + (8 * 60 * 60 * 1000);
    
    // For demo purposes, show all events but in a reasonable time window
    // If events are outside the window, we'll still show them for demo
    return mergedItineraries;
  }, [mergedItineraries, currentTime]);

  // Add collision detection for text labels
  const shouldHideEventText = (eventIndex: number) => {
    const currentEvent = visibleEvents[eventIndex];
    if (!currentEvent) return false;
    
    // Only hide text for module events (not regular itinerary items)
    if (!currentEvent.module) return false;
    
    // Always show text if this event is selected
    if (selectedEventIndex === eventIndex) return false;
    
    const threeMinutes = 3 * 60 * 1000; // 3 minutes in milliseconds
    
    // Check if there's a regular itinerary item within 3 minutes
    const hasNearbyItinerary = visibleEvents.some((otherEvent, otherIndex) => {
      if (otherIndex === eventIndex) return false; // Don't compare with self
      if (otherEvent.module) return false; // Don't hide based on other modules
      
      // Compare using start_time strings for more reliable comparison
      const currentTime = currentEvent.start_time;
      const otherTime = otherEvent.start_time;
      
      // Convert time strings to minutes for easier comparison
      const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
      const [otherHours, otherMinutes] = otherTime.split(':').map(Number);
      
      const currentTotalMinutes = currentHours * 60 + currentMinutes;
      const otherTotalMinutes = otherHours * 60 + otherMinutes;
      
      const timeDiffMinutes = Math.abs(currentTotalMinutes - otherTotalMinutes);
      
      // Debug logging
      if (currentEvent.title.includes('rate')) {
        console.log(`Collision check: ${currentEvent.title} (${currentTime}) vs ${otherEvent.title} (${otherTime}) = ${timeDiffMinutes} minutes`);
      }
      
      // Hide if within 10 minutes
      return timeDiffMinutes <= 10;
    });
    
    if (hasNearbyItinerary && currentEvent.title.includes('rate')) {
      console.log(`HIDING TEXT for: ${currentEvent.title}`);
    }
    
    return hasNearbyItinerary;
  };

  // Calculate timeline bounds based on actual event times
  const timelineBounds = useMemo(() => {
    // Create a full 24-hour timeline canvas (like 2400cm behind the phone)
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    return {
      startTime: startOfDay.getTime(),
      endTime: endOfDay.getTime(),
      totalDuration: 24 * 60 * 60 * 1000 // Full 24 hours in milliseconds
    };
  }, [currentTime]);

  // Generate time scale for left side - 15 minute intervals for full 24 hours
  const timeScale = useMemo(() => {
    const { startTime, endTime } = timelineBounds;
    const times = [];
    const interval = 15 * 60 * 1000; // 15 minute intervals
    
    for (let time = startTime; time <= endTime; time += interval) {
      times.push(new Date(time));
    }
    
    return times;
  }, [timelineBounds]);

  // Calculate position on the 24-hour timeline canvas (0-100% of the full day)
  const getTimelinePosition = (timestamp: number) => {
    const { startTime, totalDuration } = timelineBounds;
    const eventDate = new Date(timestamp);
    
    // Create a time today with the same hours/minutes as the event
    const todayWithEventTime = new Date();
    todayWithEventTime.setHours(eventDate.getHours(), eventDate.getMinutes(), 0, 0);
    
    const positionInDay = ((todayWithEventTime.getTime() - startTime) / totalDuration) * 100;
    return Math.max(0, Math.min(100, positionInDay));
  };

  // On mount, start at the first itinerary item
  useEffect(() => {
    if (mergedItineraries.length > 0) {
      setSelectedEventIndex(0);
    }
  }, [mergedItineraries.length]);

  // Helper: get timeline position for a given event index
  const getEventTimelinePosition = (eventIndex: number) => {
    if (!visibleEvents[eventIndex]) return 0;
    return getTimelinePosition(visibleEvents[eventIndex].timestamp);
  };

  // Animate viewport center when selectedEventIndex changes
  useEffect(() => {
    if (selectedEventIndex === null || visibleEvents.length === 0) return;
    const target = getEventTimelinePosition(selectedEventIndex);
    if (animatedViewportCenter === null) {
      setAnimatedViewportCenter(target);
      return;
    }
    const start = animatedViewportCenter;
    const change = target - start;
    const duration = 600;
    const startTime = performance.now();
    function easeInOutQuad(t: number) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutQuad(progress);
      setAnimatedViewportCenter(start + change * ease);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimatedViewportCenter(target);
      }
    }
    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventIndex]);

  // Calculate the viewport window (centered on animatedViewportCenter if set, else selected event)
  const getViewportWindow = () => {
    if (visibleEvents.length === 0) {
      // fallback to current time if no events
      const now = new Date();
      const currentTimePosition = getTimelinePosition(now.getTime());
      const windowSizePercent = (4 * 60 * 60 * 1000) / timelineBounds.totalDuration * 100;
      let windowStart = currentTimePosition - (windowSizePercent / 2);
      let windowEnd = currentTimePosition + (windowSizePercent / 2);
      if (windowStart < 0) {
        windowEnd += Math.abs(windowStart);
        windowStart = 0;
      }
      if (windowEnd > 100) {
        windowStart -= (windowEnd - 100);
        windowEnd = 100;
      }
      return { start: Math.max(0, windowStart), end: Math.min(100, windowEnd) };
    }
    // Center on animatedViewportCenter if set, else selected event
    const eventIndex = selectedEventIndex ?? 0;
    const eventPosition = animatedViewportCenter !== null ? animatedViewportCenter : getEventTimelinePosition(eventIndex);
    const windowSizePercent = (4 * 60 * 60 * 1000) / timelineBounds.totalDuration * 100;
    let windowStart = eventPosition - (windowSizePercent / 2);
    let windowEnd = eventPosition + (windowSizePercent / 2);
    if (windowStart < 0) {
      windowEnd += Math.abs(windowStart);
      windowStart = 0;
    }
    if (windowEnd > 100) {
      windowStart -= (windowEnd - 100);
      windowEnd = 100;
    }
    return { start: Math.max(0, windowStart), end: Math.min(100, windowEnd) };
  };

  // Convert timeline position to screen position within the iPhone viewport
  const getScreenPosition = (timelinePosition: number) => {
    const viewport = getViewportWindow();
    const viewportSize = viewport.end - viewport.start;
    
    if (timelinePosition < viewport.start || timelinePosition > viewport.end) {
      return -1; // Outside viewport, don't show
    }
    
    const relativePosition = (timelinePosition - viewport.start) / viewportSize;
    return relativePosition * 100; // 0-100% of screen
  };

  // Navigation functions for external controls
  // Up arrow: move to previous (earlier) event
  const goToPrevious = () => {
    if (visibleEvents.length === 0) return;
    const currentIndex = selectedEventIndex ?? 0;
    const newIndex = Math.max(0, currentIndex - 1); // earlier event
    setSelectedEventIndex(newIndex);
  };

  // Down arrow: move to next (later) event
  const goToNext = () => {
    if (visibleEvents.length === 0) return;
    const currentIndex = selectedEventIndex ?? -1;
    const newIndex = Math.min(visibleEvents.length - 1, currentIndex + 1); // later event
    setSelectedEventIndex(newIndex);
  };

  const goToItem = (index: number) => {
    setSelectedEventIndex(index);
    // Do NOT triggerCardAnimation here
  };

  // Only show event card when user clicks milestone circle
  const handleMilestoneClick = (index: number) => {
    const event = visibleEvents[index];
    setSelectedEventIndex(index);
    
    // Handle different module types
    if (event.module === 'qrcode') {
      setSelectedQrModule(event);
      setShowQrPopup(true);
    } else if (event.module === 'survey') {
      setSurveyModule(event);
      setShowSurveyPopup(true);
    } else if (event.module === 'feedback') {
      setSelectedFeedbackModule(event);
      setShowFeedbackPopup(true);
    } else if (event.module === 'question') {
      // Question modules show the current behavior
      triggerCardAnimation();
    } else {
      // Regular itinerary items
      triggerCardAnimation();
    }
  };

  const triggerCardAnimation = () => {
    setAnimatingCard(true);
    setShowEventCard(true);
    setTimeout(() => setAnimatingCard(false), 300);
    setTimeout(() => setShowEventCard(false), 4000);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Determine event status
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

  // Add state for map popup
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [mapLocation, setMapLocation] = useState('');

  // Handler for location click
  const handleLocationClick = (location: string) => {
    setMapLocation(location);
    setShowMapPopup(true);
  };

  // Handler for map choice
  const handleMapChoice = (type: 'google' | 'apple') => {
    const query = encodeURIComponent(mapLocation);
    let url = '';
    if (type === 'google') {
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    } else {
      url = `http://maps.apple.com/?q=${query}`;
    }
    window.open(url, '_blank');
    setShowMapPopup(false);
  };

  // Add state for delete success message
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  // Add state for QR Code popup
  const [showQrPopup, setShowQrPopup] = useState(false);
  const [selectedQrModule, setSelectedQrModule] = useState<any>(null);

  // Add state for Survey popup  
  const [showSurveyPopup, setShowSurveyPopup] = useState(false);
  const [selectedSurveyModule, setSurveyModule] = useState<any>(null);
  const [surveyRating, setSurveyRating] = useState(0);
  const [surveyComment, setSurveyComment] = useState('');

  // Add state for Feedback popup
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [selectedFeedbackModule, setSelectedFeedbackModule] = useState<any>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Add state for module management popup
  const [showModuleManagementPopup, setShowModuleManagementPopup] = useState(false);
  const [selectedModulesForDeletion, setSelectedModulesForDeletion] = useState<Set<string>>(new Set());
  
  // Add state for confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Get all modules for management
  const allModules = useMemo(() => {
    const modules: Array<{
      id: string;
      type: string;
      title: string;
      time: string;
      data: any;
      moduleType: string;
    }> = [];
    
    // Add QR modules
    qrModules.forEach((module, index) => {
      modules.push({
        id: `qrcode-${index}`,
        type: 'QR Code',
        title: module.label || 'QR Code',
        time: module.time,
        data: module,
        moduleType: 'qrcode'
      });
    });
    
    // Add Survey modules
    surveyModules.forEach((module, index) => {
      modules.push({
        id: `survey-${index}`,
        type: 'Survey',
        title: module.title || 'Survey',
        time: module.time,
        data: module,
        moduleType: 'survey'
      });
    });
    
    // Add Question modules
    questionModules.forEach((module, index) => {
      modules.push({
        id: `question-${index}`,
        type: 'Question',
        title: module.question,
        time: module.time,
        data: module,
        moduleType: 'question'
      });
    });
    
    // Add Feedback modules
    feedbackModules.forEach((module, index) => {
      modules.push({
        id: `feedback-${index}`,
        type: 'Feedback',
        title: module.question || 'Feedback',
        time: module.time,
        data: module,
        moduleType: 'feedback'
      });
    });
    
    return modules.sort((a, b) => a.time.localeCompare(b.time));
  }, [qrModules, surveyModules, questionModules, feedbackModules]);

  // Toggle module selection for deletion
  const toggleModuleSelection = (moduleId: string) => {
    const newSelection = new Set(selectedModulesForDeletion);
    if (newSelection.has(moduleId)) {
      newSelection.delete(moduleId);
    } else {
      newSelection.add(moduleId);
    }
    setSelectedModulesForDeletion(newSelection);
  };

  // Delete selected modules
  const handleDeleteSelectedModules = () => {
    if (selectedModulesForDeletion.size === 0) {
      alert('Please select modules to delete');
      return;
    }

    setShowConfirmDialog(true);
  };

  // Confirm deletion
  const confirmDeletion = () => {
    // Get current modules from localStorage
    const modules = JSON.parse(localStorage.getItem('timelineModules') || '[]');
    
    // Filter out selected modules
    const selectedModuleData = Array.from(selectedModulesForDeletion).map(id => {
      return allModules.find(m => m.id === id);
    });
    
    const updatedModules = modules.filter((module: any) => {
      return !selectedModuleData.some(selected => {
        if (!selected) return false;
        return (
          module.type === selected.moduleType &&
          module.time === selected.time &&
          (module.question === selected.data.question || 
           module.title === selected.data.title ||
           module.label === selected.data.label)
        );
      });
    });
    
    localStorage.setItem('timelineModules', JSON.stringify(updatedModules));
    
    // Trigger refresh
    window.dispatchEvent(new CustomEvent('refreshTimelineModules'));
    
    // Close popups and reset selection
    setShowConfirmDialog(false);
    setShowModuleManagementPopup(false);
    setSelectedModulesForDeletion(new Set());
    
    // Show success message
    setShowDeleteSuccess(true);
    setTimeout(() => setShowDeleteSuccess(false), 2000);
  };

  if (visibleEvents.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: isDark ? '#666' : '#999',
        fontSize: 16,
        textAlign: 'center',
        padding: 20,
      }}>
        <div style={{ marginBottom: 12, fontSize: 24 }}>⏰</div>
        <div style={{ marginBottom: 8 }}>No upcoming events</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {formatTime(currentTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit'
          }))}
        </div>
      </div>
    );
  }

  const selectedEvent = selectedEventIndex !== null ? visibleEvents[selectedEventIndex] : null;

  // When finding activeQuestion, type it as QuestionModule | undefined
  const nowStr = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
  const activeQuestion: QuestionModule | undefined = questionModules.find((q) => q.time === nowStr);

  // Delete handler for question modules
  const handleDeleteQuestionModule = (q: any) => {
    // TODO: SUPABASE - Replace this localStorage logic with a DELETE call to the supabase table 'timeline_modules' where id = q.id
    const modules = JSON.parse(localStorage.getItem('timelineModules') || '[]');
    const updated = modules.filter((m: any) => !(m.type === 'question' && m.time === q.time && m.question === q.question));
    localStorage.setItem('timelineModules', JSON.stringify(updated));
    // Optionally, force update state
    setQuestionModules(updated.filter((m: any) => m.type === 'question'));
  };

  // In the event detail card/modal (showEventCard && selectedEvent):
  // If selectedEvent matches a question module (by time and title), show a Delete button
  const isQuestionEvent = questionModules.some(
    (q) => q.time === selectedEvent?.start_time && q.question === selectedEvent?.title
  );

  // Handler for QR code actions
  const handleQrAction = (action: 'link' | 'file') => {
    if (action === 'link' && selectedQrModule?.link) {
      window.open(selectedQrModule.link, '_blank');
    } else if (action === 'file' && selectedQrModule?.file) {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = selectedQrModule.file;
      link.download = selectedQrModule.file.split('/').pop() || 'qr-code';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setShowQrPopup(false);
  };

  // Handler for survey submission
  const handleSurveySubmit = () => {
    if (surveyRating === 0) {
      alert('Please provide a rating');
      return;
    }

    // TODO: SUPABASE - Replace localStorage with INSERT to 'survey_responses' table
    // Schema: { id, survey_id, rating, comment, created_at }
    const responses = JSON.parse(localStorage.getItem('surveyResponses') || '[]');
    const newResponse = {
      id: Date.now().toString(),
      survey_id: selectedSurveyModule?.id,
      survey_title: selectedSurveyModule?.title,
      rating: surveyRating,
      comment: surveyComment,
      created_at: new Date().toISOString(),
    };
    responses.push(newResponse);
    localStorage.setItem('surveyResponses', JSON.stringify(responses));
    
    setShowSurveyPopup(false);
    setSurveyRating(0);
    setSurveyComment('');
    
    // Show success message
    setShowDeleteSuccess(true);
    setTimeout(() => setShowDeleteSuccess(false), 2000);
  };

  // Handler for feedback submission
  const handleFeedbackSubmit = () => {
    if (feedbackRating === 0) {
      alert('Please provide a rating');
      return;
    }

    // TODO: SUPABASE - Replace localStorage with INSERT to 'feedback_responses' table
    // Schema: { id, feedback_id, rating, comment, created_at }
    const responses = JSON.parse(localStorage.getItem('feedbackResponses') || '[]');
    const newResponse = {
      id: Date.now().toString(),
      feedback_id: selectedFeedbackModule?.id,
      feedback_question: selectedFeedbackModule?.feedback?.question,
      rating: feedbackRating,
      comment: feedbackComment,
      created_at: new Date().toISOString(),
    };
    responses.push(newResponse);
    localStorage.setItem('feedbackResponses', JSON.stringify(responses));
    
    setShowFeedbackPopup(false);
    setFeedbackRating(0);
    setFeedbackComment('');
    
    // Show success message
    setShowDeleteSuccess(true);
    setTimeout(() => setShowDeleteSuccess(false), 2000);
  };

  // Expose methods to parent component with new delete function
  useImperativeHandle(ref, () => ({
    goToPrevious,
    goToNext,
    goToItem,
    openModuleManagement: () => setShowModuleManagementPopup(true),
  }));

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Time Scale - Left Side */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 60,
        zIndex: 5,
      }}>
        {timeScale.map((time, index) => {
          const timelinePosition = getTimelinePosition(time.getTime());
          const screenPosition = getScreenPosition(timelinePosition);
          if (screenPosition < 0) return null;
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                top: `${screenPosition}%`,
                left: 0,
                right: 0,
                transform: 'translateY(-50%)',
                fontSize: 10,
                color: isDark ? '#666' : '#999',
                textAlign: 'right',
                paddingRight: 8,
                fontWeight: 500,
              }}
            >
              {formatTime(time.getHours().toString().padStart(2, '0') + ':' + time.getMinutes().toString().padStart(2, '0'))}
            </div>
          );
        })}
      </div>

      {/* Timeline Container */}
      <div
        ref={timelineContainerRef}
        style={{
          flex: 1,
          position: 'relative',
          marginLeft: 60,
          paddingLeft: 8, // Reduced from 20px to 8px to hug closer to time scale
          paddingRight: 20,
          height: '100%',
          overflow: 'auto', // Make it scrollable
        }}
      >
        {/* Vertical timeline line */}
        <div style={{
          position: 'absolute',
          left: 16, // Reduced from 50% to a fixed position closer to the left
          top: 0,
          bottom: 0,
          width: 3,
          background: `linear-gradient(to bottom, 
            transparent 0%, 
            ${isDark ? '#374151' : '#d1d5db'} 10%, 
            ${isDark ? '#374151' : '#d1d5db'} 90%, 
            transparent 100%)`,
          borderRadius: 2,
          transform: 'translateX(-50%)', // Keep the line centered on its position
          zIndex: 1,
        }} />

        {/* Timeline events - only show those visible in viewport */}
        {visibleEvents.map((event, index) => {
          const timelinePosition = getTimelinePosition(event.timestamp);
          const screenPosition = getScreenPosition(timelinePosition);
          if (screenPosition < 0) return null;
          const status = getEventStatus(event);
          const isSelected = selectedEventIndex === index;
          const hideText = shouldHideEventText(index);
          return (
            <div
              key={event.id}
              ref={el => (eventRefs.current[index] = el)}
              onClick={() => handleMilestoneClick(index)}
              style={{
                position: 'absolute',
                left: 16, // Changed from 50% to match the timeline line position
                top: `${screenPosition}%`,
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                zIndex: isSelected ? 15 : 10,
              }}
            >
              {/* Timeline dot */}
              <div style={{
                width: status === 'current' ? 20 : isSelected ? 16 : 12,
                height: status === 'current' ? 20 : isSelected ? 16 : 12,
                borderRadius: '50%',
                background: status === 'current' 
                  ? '#3b82f6' 
                  : status === 'past' 
                    ? '#10b981' 
                    : isDark ? '#6b7280' : '#9ca3af',
                border: `2px solid ${
                  status === 'current' ? '#ffffff' : 
                  isSelected ? '#ffffff' : 
                  'transparent'
                }`,
                boxShadow: status === 'current' 
                  ? '0 0 0 2px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0,0,0,0.15)' 
                  : isSelected
                    ? '0 0 0 2px rgba(255, 255, 255, 0.5), 0 4px 12px rgba(0,0,0,0.15)'
                    : '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                position: 'relative',
              }} />

              {/* Event label - conditionally hidden for modules near itinerary items */}
              {!hideText && (
                <div style={{
                  position: 'absolute',
                  left: status === 'current' ? '35px' : isSelected ? '30px' : '25px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  whiteSpace: 'nowrap',
                  opacity: status === 'past' ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{
                    fontSize: status === 'current' ? 13 : isSelected ? 12 : 11,
                    fontWeight: status === 'current' ? 700 : isSelected ? 600 : 500,
                    color: isDark ? '#fff' : '#000',
                    marginBottom: 2,
                  }}>
                    {event.title}
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: isDark ? '#888' : '#666',
                  }}>
                    {formatTime(event.start_time)}
                  </div>
                </div>
              )}

              {/* Current event pulse animation */}
              {status === 'current' && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.2)',
                  animation: 'pulse 2s infinite',
                  zIndex: -1,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Event Detail Card - Animated expansion from milestone */}
      {showEventCard && selectedEvent && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) ${animatingCard ? 'scale(0.8)' : 'scale(1)'}`,
          background: isDark 
            ? 'rgba(30, 30, 30, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 16,
          padding: 20,
          minWidth: 260,
          maxWidth: 280,
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          boxShadow: isDark 
            ? '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
            : '0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          zIndex: 100,
          animation: animatingCard ? 'milestoneExpand 0.3s ease-out' : 'eventCardSlideIn 0.3s ease-out',
          transformOrigin: 'center center',
        }}>
          {/* Close button */}
          <button
            onClick={() => setShowEventCard(false)}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'none',
              border: 'none',
              color: isDark ? '#888' : '#666',
              fontSize: 18,
              cursor: 'pointer',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            ×
          </button>

          {/* Event header */}
          <div style={{
            textAlign: 'center',
            marginBottom: 16,
            paddingRight: 20,
          }}>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: isDark ? '#fff' : '#000',
              marginBottom: 6,
              lineHeight: 1.2,
            }}>
              {selectedEvent.title}
            </div>
            <div style={{
              fontSize: 13,
              color: isDark ? '#3b82f6' : '#2563eb',
              fontWeight: 600,
              marginBottom: 4,
            }}>
              {formatDate(selectedEvent.date)}
            </div>
            <div style={{
              fontSize: 14,
              color: isDark ? '#aaa' : '#555',
            }}>
              {formatTime(selectedEvent.start_time)} - {formatTime(selectedEvent.end_time)}
            </div>
          </div>

          {/* Event details */}
          <div style={{ marginBottom: 12 }}>
            {selectedEvent.arrival_time && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 8,
                fontSize: 13,
                color: isDark ? '#ccc' : '#555',
              }}>
                <span style={{ color: isDark ? '#3b82f6' : '#2563eb', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => handleLocationClick(selectedEvent.arrival_time!)}>{selectedEvent.arrival_time}</span>
              </div>
            )}
            
            {selectedEvent.location && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 8,
                fontSize: 13,
                color: isDark ? '#ccc' : '#555',
              }}>
                <span style={{ color: isDark ? '#3b82f6' : '#2563eb', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => handleLocationClick(selectedEvent.location!)}>{selectedEvent.location}</span>
              </div>
            )}
          </div>

          {/* Event description */}
          {selectedEvent.description && (
            <div style={{
              marginTop: 12,
              padding: 12,
              background: isDark 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(0, 0, 0, 0.05)',
              borderRadius: 8,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            }}>
              <div style={{
                fontSize: 11,
                color: isDark ? '#888' : '#666',
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontWeight: 600,
              }}>
                Details
              </div>
              <div style={{
                fontSize: 13,
                color: isDark ? '#ccc' : '#555',
                lineHeight: 1.4,
              }}>
                {selectedEvent.description}
              </div>
            </div>
          )}

          {/* Event status indicator */}
          <div style={{
            marginTop: 16,
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              background: getEventStatus(selectedEvent) === 'current'
                ? '#3b82f6'
                : getEventStatus(selectedEvent) === 'past'
                  ? '#10b981'
                  : isDark ? '#555' : '#e5e7eb',
              color: getEventStatus(selectedEvent) === 'current' || getEventStatus(selectedEvent) === 'past'
                ? '#ffffff' 
                : isDark ? '#ccc' : '#666',
            }}>
              {getEventStatus(selectedEvent) === 'current' ? (
                <>🔵 Happening Now</>
              ) : getEventStatus(selectedEvent) === 'past' ? (
                <>✅ Completed</>
              ) : (
                <>⏳ Upcoming</>
              )}
            </div>
          </div>

          {isQuestionEvent && (
            <button
              style={{
                marginTop: 14,
                padding: '8px 18px',
                borderRadius: 12,
                background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(36,36,40,0.10)',
                color: isDark ? '#fff' : '#222',
                fontWeight: 700,
                fontSize: 14,
                border: '1.5px solid #fff',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onClick={() => {
                // TODO: SUPABASE - Replace this localStorage logic with a DELETE call to the supabase table 'timeline_modules' where time and question match
                const modules = JSON.parse(localStorage.getItem('timelineModules') || '[]');
                const updated = modules.filter((m: any) => !(m.type === 'question' && m.time === selectedEvent.start_time && m.question === selectedEvent.title));
                localStorage.setItem('timelineModules', JSON.stringify(updated));
                setShowEventCard(false);
                setShowDeleteSuccess(true);
                setTimeout(() => setShowDeleteSuccess(false), 2000);
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes milestoneExpand {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.1);
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes eventCardSlideIn {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.3;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.7;
          }
        }
      `}</style>

      {/* Active question popup */}
      {activeQuestion && typeof activeQuestion === 'object' && 'question' in activeQuestion && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 4000,
          background: isDark ? 'rgba(36,36,40,0.92)' : 'rgba(255,255,255,0.92)',
          borderRadius: 32,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.10)',
          border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(16px)',
          padding: '48px 40px 40px 40px',
          minWidth: 420,
          maxWidth: 520,
          width: '95vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ fontWeight: 800, fontSize: 26, marginBottom: 28, color: isDark ? '#fff' : '#222', letterSpacing: 0.2, textAlign: 'center' }}>
            {activeQuestion.question}
          </div>
          <button
            style={{
              marginTop: 12,
              padding: '12px 32px',
              borderRadius: 14,
              background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(36,36,40,0.10)',
              color: isDark ? '#fff' : '#222',
              fontWeight: 700,
              fontSize: 16,
              border: '1.5px solid #fff',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onClick={() => handleDeleteQuestionModule(activeQuestion)}
          >
            Delete
          </button>
        </div>
      )}

      {/* Map popup */}
      {showMapPopup && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 5000,
          background: isDark ? 'rgba(36,36,40,0.97)' : 'rgba(255,255,255,0.97)',
          borderRadius: 16,
          boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.25)' : '0 4px 16px rgba(0,0,0,0.08)',
          border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(12px)',
          padding: '20px 24px',
          fontWeight: 700,
          fontSize: 16,
          color: isDark ? '#fff' : '#222',
          textAlign: 'center',
          minWidth: 260,
        }}>
          <div style={{ marginBottom: 16 }}>Open location in:</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #fff', background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(36,36,40,0.10)', color: isDark ? '#fff' : '#222', fontWeight: 700, fontSize: 14, cursor: 'pointer' }} onClick={() => handleMapChoice('google')}>Google Maps</button>
            <button style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #fff', background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(36,36,40,0.10)', color: isDark ? '#fff' : '#222', fontWeight: 700, fontSize: 14, cursor: 'pointer' }} onClick={() => handleMapChoice('apple')}>Apple Maps</button>
          </div>
          <button style={{ marginTop: 16, border: 'none', background: 'none', color: isDark ? '#fff' : '#222', fontSize: 20, borderRadius: 10, cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowMapPopup(false)}>×</button>
        </div>
      )}

      {/* QR Code Popup */}
      {showQrPopup && selectedQrModule && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 5000,
          background: isDark ? 'rgba(36,36,40,0.97)' : 'rgba(255,255,255,0.97)',
          borderRadius: 20,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.10)',
          border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(16px)',
          padding: '24px',
          minWidth: 280,
          maxWidth: 320,
          width: '85%',
          maxHeight: '80%',
          overflowY: 'auto',
        }}>
          {/* Close button */}
          <button
            onClick={() => setShowQrPopup(false)}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'none',
              border: 'none',
              color: isDark ? '#888' : '#666',
              fontSize: 20,
              cursor: 'pointer',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
            }}
          >
            ×
          </button>

          {/* QR Code header */}
          <div style={{
            fontWeight: 800,
            fontSize: 20,
            marginBottom: 6,
            color: isDark ? '#fff' : '#222',
            textAlign: 'center',
          }}>
            {selectedQrModule.title || selectedQrModule.label || 'QR Code'}
          </div>

          {/* QR Code time */}
          <div style={{
            fontSize: 12,
            color: isDark ? '#aaa' : '#666',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            {formatTime(selectedQrModule.start_time)}
          </div>

          {/* QR Code actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedQrModule.link && (
              <button
                onClick={() => handleQrAction('link')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6',
                  fontWeight: 600,
                  fontSize: 14,
                  border: '1.5px solid #3b82f6',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                🔗 Open Link
              </button>
            )}
            
            {selectedQrModule.file && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%',
                  maxWidth: 200,
                  aspectRatio: '1',
                  background: '#fff',
                  borderRadius: 12,
                  padding: 8,
                  border: '2px solid #e5e7eb',
                }}>
                  <img
                    src={selectedQrModule.file}
                    alt="QR Code"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: 8,
                    }}
                    onError={(e) => {
                      // Fallback to file name if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div style="
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100%;
                            color: #666;
                            text-align: center;
                            padding: 16px;
                          ">
                            <div style="font-size: 24px; margin-bottom: 8px;">📄</div>
                            <div style="font-size: 12px; word-break: break-all;">
                              ${selectedQrModule.file.split('/').pop() || 'QR Code File'}
                            </div>
                          </div>
                        `;
                      }
                    }}
                  />
                </div>
                <button
                  onClick={() => handleQrAction('file')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 10,
                    background: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    fontWeight: 600,
                    fontSize: 14,
                    border: '1.5px solid #10b981',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  💾 Download
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Survey Popup */}
      {showSurveyPopup && selectedSurveyModule && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 5000,
          background: isDark ? 'rgba(36,36,40,0.97)' : 'rgba(255,255,255,0.97)',
          borderRadius: 20,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.10)',
          border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(16px)',
          padding: '24px',
          minWidth: 280,
          maxWidth: 320,
          width: '85%',
          maxHeight: '80%',
          overflowY: 'auto',
        }}>
          {/* Close button */}
          <button
            onClick={() => {
              setShowSurveyPopup(false);
              setSurveyRating(0);
              setSurveyComment('');
            }}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'none',
              border: 'none',
              color: isDark ? '#888' : '#666',
              fontSize: 20,
              cursor: 'pointer',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
            }}
          >
            ×
          </button>

          {/* Survey header */}
          <div style={{
            fontWeight: 800,
            fontSize: 20,
            marginBottom: 6,
            color: isDark ? '#fff' : '#222',
            textAlign: 'center',
          }}>
            {selectedSurveyModule.title}
          </div>

          {/* Survey time */}
          <div style={{
            fontSize: 12,
            color: isDark ? '#aaa' : '#666',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            {formatTime(selectedSurveyModule.start_time)}
          </div>

          {/* Survey question */}
          {selectedSurveyModule.question && (
            <div style={{
              fontSize: 14,
              color: isDark ? '#ccc' : '#555',
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 1.3,
            }}>
              {selectedSurveyModule.question}
            </div>
          )}

          {/* Star rating */}
          <div style={{
            textAlign: 'center',
            marginBottom: 20,
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: isDark ? '#fff' : '#222',
              marginBottom: 10,
            }}>
              Rate your experience *
            </div>
            
            <StarRating
              rating={surveyRating}
              onRatingChange={setSurveyRating}
              isDark={isDark}
            />
          </div>

          {/* Comment input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontWeight: 600,
              fontSize: 12,
              color: isDark ? '#fff' : '#222',
            }}>
              Comments (optional)
            </label>
            <textarea
              value={surveyComment}
              onChange={(e) => setSurveyComment(e.target.value.slice(0, 500))}
              placeholder="Tell us more..."
              maxLength={500}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                color: isDark ? '#fff' : '#222',
                fontSize: 12,
                fontWeight: 500,
                resize: 'vertical',
                outline: 'none',
              }}
            />
            <div style={{
              textAlign: 'right',
              fontSize: 10,
              color: isDark ? '#888' : '#666',
              marginTop: 3,
            }}>
              {surveyComment.length}/500
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSurveySubmit}
            disabled={surveyRating === 0}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              background: surveyRating === 0 
                ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)')
                : (isDark ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.9)'),
              color: surveyRating === 0 
                ? (isDark ? '#666' : '#999')
                : (isDark ? '#000' : '#000'),
              fontWeight: 600,
              fontSize: 14,
              border: surveyRating === 0
                ? `1.5px solid ${isDark ? '#666' : '#999'}`
                : '1.5px solid rgba(255,255,255,0.9)',
              cursor: surveyRating === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Submit Feedback
          </button>
        </div>
      )}

      {/* Feedback Popup */}
      {showFeedbackPopup && selectedFeedbackModule && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 5000,
          background: isDark ? 'rgba(36,36,40,0.97)' : 'rgba(255,255,255,0.97)',
          borderRadius: 20,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.10)',
          border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(16px)',
          padding: '24px',
          minWidth: 280,
          maxWidth: 320,
          width: '85%',
          maxHeight: '80%',
          overflowY: 'auto',
        }}>
          {/* Close button */}
          <button
            onClick={() => {
              setShowFeedbackPopup(false);
              setFeedbackRating(0);
              setFeedbackComment('');
            }}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'none',
              border: 'none',
              color: isDark ? '#888' : '#666',
              fontSize: 20,
              cursor: 'pointer',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
            }}
          >
            ×
          </button>

          {/* Feedback header */}
          <div style={{
            fontWeight: 800,
            fontSize: 20,
            marginBottom: 6,
            color: isDark ? '#fff' : '#222',
            textAlign: 'center',
          }}>
            Feedback
          </div>

          {/* Feedback time */}
          <div style={{
            fontSize: 12,
            color: isDark ? '#aaa' : '#666',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            {formatTime(selectedFeedbackModule.start_time)}
          </div>

          {/* Feedback question */}
          {selectedFeedbackModule.feedback?.question && (
            <div style={{
              fontSize: 14,
              color: isDark ? '#ccc' : '#555',
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 1.3,
            }}>
              {selectedFeedbackModule.feedback.question}
            </div>
          )}

          {/* Star rating with precise decimal selection */}
          <div style={{
            textAlign: 'center',
            marginBottom: 20,
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: isDark ? '#fff' : '#222',
              marginBottom: 10,
            }}>
              Rate your experience *
            </div>
            
            <StarRating
              rating={feedbackRating}
              onRatingChange={setFeedbackRating}
              isDark={isDark}
            />
          </div>

          {/* Comment input */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontWeight: 600,
              fontSize: 12,
              color: isDark ? '#fff' : '#222',
            }}>
              Comments (optional)
            </label>
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value.slice(0, 500))}
              placeholder="Share your feedback..."
              maxLength={500}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                color: isDark ? '#fff' : '#222',
                fontSize: 12,
                fontWeight: 500,
                resize: 'vertical',
                outline: 'none',
              }}
            />
            <div style={{
              textAlign: 'right',
              fontSize: 10,
              color: isDark ? '#888' : '#666',
              marginTop: 3,
            }}>
              {feedbackComment.length}/500
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleFeedbackSubmit}
            disabled={feedbackRating === 0}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 10,
              background: feedbackRating === 0 
                ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)')
                : (isDark ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.9)'),
              color: feedbackRating === 0 
                ? (isDark ? '#666' : '#999')
                : (isDark ? '#000' : '#000'),
              fontWeight: 600,
              fontSize: 14,
              border: feedbackRating === 0
                ? `1.5px solid ${isDark ? '#666' : '#999'}`
                : '1.5px solid rgba(255,255,255,0.9)',
              cursor: feedbackRating === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Submit Feedback
          </button>
        </div>
      )}

      {/* Module Management Popup */}
      {showModuleManagementPopup && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 6000,
          background: isDark ? 'rgba(36,36,40,0.97)' : 'rgba(255,255,255,0.97)',
          borderRadius: 20,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.10)',
          border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(16px)',
          padding: '24px',
          minWidth: 320,
          maxWidth: 400,
          width: '90%',
          maxHeight: '80%',
          overflowY: 'auto',
        }}>
          {/* Close button */}
          <button
            onClick={() => {
              setShowModuleManagementPopup(false);
              setSelectedModulesForDeletion(new Set());
            }}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'none',
              border: 'none',
              color: isDark ? '#888' : '#666',
              fontSize: 20,
              cursor: 'pointer',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
            }}
          >
            ×
          </button>

          {/* Header */}
          <div style={{
            fontWeight: 800,
            fontSize: 20,
            marginBottom: 6,
            color: isDark ? '#fff' : '#222',
            textAlign: 'center',
          }}>
            Manage Modules
          </div>

          <div style={{
            fontSize: 12,
            color: isDark ? '#aaa' : '#666',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            Select and delete modules from your timeline
          </div>

          {/* Module list */}
          {allModules.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: isDark ? '#666' : '#999',
              fontSize: 14,
              padding: '40px 20px',
            }}>
              <div style={{ marginBottom: 8, fontSize: 24 }}>📋</div>
              <div>No modules added yet</div>
            </div>
          ) : (
            <>
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                marginBottom: 20,
              }}>
                {allModules.map((module) => (
                  <div
                    key={module.id}
                    onClick={() => toggleModuleSelection(module.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      marginBottom: '8px',
                      borderRadius: 10,
                      border: `1.5px solid ${
                        selectedModulesForDeletion.has(module.id)
                          ? '#ef4444'
                          : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                      }`,
                      background: selectedModulesForDeletion.has(module.id)
                        ? (isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)')
                        : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `2px solid ${
                        selectedModulesForDeletion.has(module.id) ? '#ef4444' : (isDark ? '#666' : '#ccc')
                      }`,
                      background: selectedModulesForDeletion.has(module.id) ? '#ef4444' : 'transparent',
                      marginRight: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: '#fff',
                    }}>
                      {selectedModulesForDeletion.has(module.id) && '✓'}
                    </div>

                    {/* Module info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: isDark ? '#fff' : '#222',
                        marginBottom: 2,
                      }}>
                        {module.title}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: isDark ? '#aaa' : '#666',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
                          color: '#3b82f6',
                          fontSize: 10,
                          fontWeight: 600,
                        }}>
                          {module.type}
                        </span>
                        <span>{formatTime(module.time)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setSelectedModulesForDeletion(
                    selectedModulesForDeletion.size === allModules.length 
                      ? new Set() 
                      : new Set(allModules.map(m => m.id))
                  )}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 8,
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    color: isDark ? '#fff' : '#222',
                    fontWeight: 600,
                    fontSize: 12,
                    border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {selectedModulesForDeletion.size === allModules.length ? 'Deselect All' : 'Select All'}
                </button>

                <button
                  onClick={handleDeleteSelectedModules}
                  disabled={selectedModulesForDeletion.size === 0}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 8,
                    background: selectedModulesForDeletion.size === 0
                      ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)')
                      : '#ef4444',
                    color: selectedModulesForDeletion.size === 0
                      ? (isDark ? '#666' : '#999')
                      : '#fff',
                    fontWeight: 600,
                    fontSize: 12,
                    border: selectedModulesForDeletion.size === 0
                      ? `1.5px solid ${isDark ? '#666' : '#ccc'}`
                      : '1.5px solid #ef4444',
                    cursor: selectedModulesForDeletion.size === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Delete Selected ({selectedModulesForDeletion.size})
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 7000,
          background: isDark ? 'rgba(36,36,40,0.97)' : 'rgba(255,255,255,0.97)',
          borderRadius: 20,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.10)',
          border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(16px)',
          padding: '32px 28px',
          minWidth: 300,
          maxWidth: 380,
          width: '85%',
          textAlign: 'center',
        }}>
          {/* Close button */}
          <button
            onClick={() => setShowConfirmDialog(false)}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'none',
              border: 'none',
              color: isDark ? '#888' : '#666',
              fontSize: 20,
              cursor: 'pointer',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
            }}
          >
            ×
          </button>

          {/* Confirmation message */}
          <div style={{
            fontWeight: 800,
            fontSize: 18,
            marginBottom: 12,
            color: isDark ? '#fff' : '#222',
          }}>
            Confirm Deletion
          </div>

          <div style={{
            fontSize: 14,
            color: isDark ? '#ccc' : '#555',
            marginBottom: 24,
            lineHeight: 1.4,
          }}>
            Are you sure you want to delete {selectedModulesForDeletion.size} module{selectedModulesForDeletion.size !== 1 ? 's' : ''}?
            <br />
            <span style={{ fontSize: 12, opacity: 0.8 }}>This action cannot be undone.</span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setShowConfirmDialog(false)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 10,
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: isDark ? '#fff' : '#222',
                fontWeight: 600,
                fontSize: 14,
                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Cancel
            </button>

            <button
              onClick={confirmDeletion}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 10,
                background: '#ef4444',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                border: '1.5px solid #ef4444',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Delete success message */}
      {showDeleteSuccess && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '15%',
          transform: 'translate(-50%, 0)',
          zIndex: 5000,
          background: isDark ? 'rgba(36,36,40,0.92)' : 'rgba(255,255,255,0.92)',
          borderRadius: 14,
          boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.25)' : '0 4px 16px rgba(0,0,0,0.08)',
          border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(12px)',
          padding: '12px 20px',
          fontWeight: 700,
          fontSize: 14,
          color: isDark ? '#fff' : '#222',
          textAlign: 'center',
        }}>
          {selectedSurveyModule || selectedFeedbackModule ? 'Feedback submitted!' : 'Modules deleted successfully!'}
        </div>
      )}
    </div>
  );
});

TimelinePreview.displayName = 'TimelinePreview';

export default TimelinePreview; 