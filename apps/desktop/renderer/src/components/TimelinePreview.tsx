import React, { useState, useMemo, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';

interface ItineraryItem {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  arrival_time?: string;
  location?: string;
  description?: string;
}

interface TimelinePreviewProps {
  itineraries: ItineraryItem[];
  isDark: boolean;
}

interface TimelinePreviewRef {
  goToPrevious: () => void;
  goToNext: () => void;
  goToItem: (index: number) => void;
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

const TimelinePreview = forwardRef<TimelinePreviewRef, TimelinePreviewProps>(({ itineraries, isDark }, ref) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
  const [showEventCard, setShowEventCard] = useState(false);
  const [animatingCard, setAnimatingCard] = useState(false);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const eventRefs = useRef<(HTMLDivElement | null)[]>([]);

  // State for animated viewport center position (timelinePosition, 0-100)
  const [animatedViewportCenter, setAnimatedViewportCenter] = useState<number | null>(null);

  // Use this type for questionModules state
  const [questionModules, setQuestionModules] = useState<QuestionModule[]>([]);
  useEffect(() => {
    const modules = JSON.parse(localStorage.getItem('timelineModules') || '[]');
    setQuestionModules(modules.filter((m: any) => m.type === 'question'));
  }, [currentTime]);

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

  // In sortedItineraries, merge questionModules as pseudo-itinerary items
  const mergedItineraries = useMemo(() => {
    const base = [...sortedItineraries];
    questionModules.forEach((q: any, idx: number) => {
      // Only add if not already in base (by time and question)
      if (!base.some(e => e.timestamp && formatTime(e.start_time) === q.time && e.title === q.question)) {
        // Create a pseudo-itinerary item for the question
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
        });
      }
    });
    return base.sort((a, b) => a.timestamp - b.timestamp);
  }, [sortedItineraries, questionModules]);

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
    setSelectedEventIndex(index);
    triggerCardAnimation();
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

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    goToPrevious,
    goToNext,
    goToItem,
  }));

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
          paddingLeft: 20,
          paddingRight: 20,
          height: '100%',
          overflow: 'auto', // Make it scrollable
        }}
      >
        {/* Vertical timeline line */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 3,
          background: `linear-gradient(to bottom, 
            transparent 0%, 
            ${isDark ? '#374151' : '#d1d5db'} 10%, 
            ${isDark ? '#374151' : '#d1d5db'} 90%, 
            transparent 100%)`,
          borderRadius: 2,
          transform: 'translateX(-50%)',
          zIndex: 1,
        }} />

        {/* Timeline events - only show those visible in viewport */}
        {visibleEvents.map((event, index) => {
          const timelinePosition = getTimelinePosition(event.timestamp);
          const screenPosition = getScreenPosition(timelinePosition);
          if (screenPosition < 0) return null;
          const status = getEventStatus(event);
          const isSelected = selectedEventIndex === index;
          return (
            <div
              key={event.id}
              ref={el => (eventRefs.current[index] = el)}
              onClick={() => handleMilestoneClick(index)}
              style={{
                position: 'absolute',
                left: '50%',
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

              {/* Event label */}
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
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 5000,
          background: isDark ? 'rgba(36,36,40,0.97)' : 'rgba(255,255,255,0.97)',
          borderRadius: 20,
          boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.25)' : '0 4px 16px rgba(0,0,0,0.08)',
          border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(12px)',
          padding: '28px 32px',
          fontWeight: 700,
          fontSize: 18,
          color: isDark ? '#fff' : '#222',
          textAlign: 'center',
          minWidth: 320,
        }}>
          <div style={{ marginBottom: 18 }}>Open location in:</div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button style={{ padding: '10px 18px', borderRadius: 12, border: '1.5px solid #fff', background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(36,36,40,0.10)', color: isDark ? '#fff' : '#222', fontWeight: 700, fontSize: 16, cursor: 'pointer' }} onClick={() => handleMapChoice('google')}>Google Maps</button>
            <button style={{ padding: '10px 18px', borderRadius: 12, border: '1.5px solid #fff', background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(36,36,40,0.10)', color: isDark ? '#fff' : '#222', fontWeight: 700, fontSize: 16, cursor: 'pointer' }} onClick={() => handleMapChoice('apple')}>Apple Maps</button>
          </div>
          <button style={{ marginTop: 18, border: 'none', background: 'none', color: isDark ? '#fff' : '#222', fontSize: 22, borderRadius: 12, cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowMapPopup(false)}>×</button>
        </div>
      )}

      {/* Delete success message */}
      {showDeleteSuccess && (
        <div style={{
          position: 'fixed',
          left: '50%',
          top: '10%',
          transform: 'translate(-50%, 0)',
          zIndex: 5000,
          background: isDark ? 'rgba(36,36,40,0.92)' : 'rgba(255,255,255,0.92)',
          borderRadius: 18,
          boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.25)' : '0 4px 16px rgba(0,0,0,0.08)',
          border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
          backdropFilter: 'blur(12px)',
          padding: '14px 28px',
          fontWeight: 700,
          fontSize: 16,
          color: isDark ? '#fff' : '#222',
          textAlign: 'center',
        }}>
          Question deleted!
        </div>
      )}
    </div>
  );
});

TimelinePreview.displayName = 'TimelinePreview';

export default TimelinePreview; 