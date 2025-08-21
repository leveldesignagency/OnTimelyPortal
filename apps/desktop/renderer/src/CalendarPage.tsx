import React, { useState, useEffect, useContext, useMemo, FC, FormEvent, Dispatch, SetStateAction } from 'react';
import { ThemeContext } from './ThemeContext';
import ThemedIcon from './components/ThemedIcon';
import { googleCalendarService } from './services/googleCalendar';
import { outlookCalendarService } from './services/outlookCalendar';
import { calendarConnectionService } from './services/calendarConnectionService';
import { getCurrentUser } from './lib/auth';
import { CalendarEvent as ExternalCalendarEvent } from './types/calendar';
import { supabase } from './lib/supabase';

// --- Types & Mock Data ---
type CalendarEvent = {
  id: string;
  title: string;
  type: 'Meeting' | 'Call Back' | 'Task' | 'Project' | 'Event';
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  attendees?: string[];
  status: string;
  color: string;
};

// --- Glass Theme ---
const getGlassStyles = (isDark: boolean) => ({
  background: isDark 
    ? 'rgba(30, 30, 30, 0.8)' 
    : 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(20px)',
  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  borderRadius: '16px',
  boxShadow: isDark 
    ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
    : '0 8px 32px rgba(0, 0, 0, 0.1)',
});

const getColors = (isDark: boolean) => ({
  bg: isDark ? '#0a0a0a' : '#f5f7fa',
  text: isDark ? '#ffffff' : '#1a1a1a',
  textSecondary: isDark ? '#a0a0a0' : '#6b7280',
  accent: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  hover: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
});

// --- Helper Functions ---
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
const toYYYYMMDD = (date: Date) => date.toISOString().split('T')[0];

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Custom Glass Time Picker Component (from CreateItinerary)
function CustomGlassTimePicker({ value, onChange, placeholder, isDark, colors }) {
  const [open, setOpen] = React.useState(false);
  const [hour, setHour] = React.useState('');
  const [minute, setMinute] = React.useState('');
  React.useEffect(() => {
    if (value && /^\d{2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(':');
      setHour(h);
      setMinute(m);
    }
  }, [value]);
  const handleSelect = (h, m) => {
    setHour(h);
    setMinute(m);
    onChange(`${h}:${m}`);
    setOpen(false);
  };
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={e => {
          const val = e.target.value;
          if (/^\d{2}:\d{2}$/.test(val)) {
            const [h, m] = val.split(':');
            setHour(h);
            setMinute(m);
            onChange(val);
          } else {
            setHour('');
            setMinute('');
            onChange(val);
          }
        }}
        placeholder={placeholder}
        style={{
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          color: colors.text,
          width: '100%',
          fontSize: '14px',
          height: '44px',
          padding: '12px',
          outline: 'none',
          transition: 'all 0.2s',
        }}
        maxLength={5}
      />
      {open && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: '100%',
          marginTop: 4,
          width: '100%',
          display: 'flex',
          gap: 8,
          background: colors.hover,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 8px 32px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxHeight: 220,
          overflow: 'hidden',
        }}>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 220 }}>
            {hours.map(h => (
              <div
                key={h}
                onMouseDown={() => handleSelect(h, minute || '00')}
                style={{
                  padding: '8px 0',
                  textAlign: 'center',
                  background: h === hour ? colors.text : 'transparent',
                  color: h === hour ? (isDark ? '#000' : '#fff') : colors.text,
                  fontWeight: h === hour ? 700 : 400,
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
              >
                {h}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 220 }}>
            {minutes.map(m => (
              <div
                key={m}
                onMouseDown={() => handleSelect(hour || '00', m)}
                style={{
                  padding: '8px 0',
                  textAlign: 'center',
                  background: m === minute ? colors.text : 'transparent',
                  color: m === minute ? (isDark ? '#000' : '#fff') : colors.text,
                  fontWeight: m === minute ? 700 : 400,
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const colors = getColors(isDark);
  const glassStyle = getGlassStyles(isDark);

  // Add CSS animation styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0px) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'Week' | 'Month'>('Month');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);
  const [databaseEvents, setDatabaseEvents] = useState<CalendarEvent[]>([]);
  const [activeFilter, setActiveFilter] = useState('Calendar');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState('Meeting');
  const [newEventDate, setNewEventDate] = useState<Date | null>(null);
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isOutlookConnected, setIsOutlookConnected] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<'google' | 'outlook' | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState<{
    show: boolean;
    provider: 'google' | 'outlook' | null;
    message: string;
  }>({ show: false, provider: null, message: '' });
  const [showDayEventsPopup, setShowDayEventsPopup] = useState<{
    show: boolean;
    date: Date | null;
    events: CalendarEvent[];
  }>({ show: false, date: null, events: [] });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const filterButtons = [
    { label: 'Calendar', value: 'Calendar' },
    { label: 'Meetings', value: 'Meeting' },
    { label: 'Call Back', value: 'Call Back' },
    { label: 'Task', value: 'Task' },
    { label: 'Projects', value: 'Project' },
  ];

  const eventTypes = [
    { label: 'Meeting', value: 'Meeting' },
    { label: 'Call Back', value: 'Call Back' },
    { label: 'Task', value: 'Task' },
    { label: 'Project', value: 'Project' },
    { label: 'Event', value: 'Event' },
  ];

  useEffect(() => {
    loadExternalEvents();
    loadDatabaseEvents();
  }, []);

  useEffect(() => {
    // Check authentication status on mount and periodically
    const checkAuthStatus = () => {
      const googleAuth = googleCalendarService.isAuthenticated();
      const outlookAuth = outlookCalendarService.isAuthenticated();
      
      setIsGoogleConnected(googleAuth);
      setIsOutlookConnected(outlookAuth);
      
      // If connection was lost, clear events from that provider
      if (!googleAuth) {
        setExternalEvents(prev => prev.filter(event => !event.id.startsWith('google_')));
      }
      if (!outlookAuth) {
        setExternalEvents(prev => prev.filter(event => !event.id.startsWith('outlook_')));
      }
    };

    checkAuthStatus();

    // Check auth status periodically to handle token expiration
    const authCheckInterval = setInterval(checkAuthStatus, 30000); // Check every 30 seconds

    return () => clearInterval(authCheckInterval);
  }, []);

  const loadExternalEvents = async () => {
    try {
      let allEvents: CalendarEvent[] = [];
      
      // Load events for a wider date range (3 months back, 6 months forward)
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);
      
      // Load Google Calendar events if authenticated
      if (googleCalendarService.isAuthenticated()) {
        try {
          const googleEvents = await googleCalendarService.getEvents(startDate, endDate);
          console.log(`Loaded ${googleEvents.length} events from Google Calendar`);
          const convertedGoogleEvents = googleEvents.map(event => convertGoogleEvent(event));
          allEvents = [...allEvents, ...convertedGoogleEvents];
        } catch (error) {
          console.error('Failed to load Google Calendar events:', error);
        }
      }
      
      // Load Outlook Calendar events if authenticated
      if (outlookCalendarService.isAuthenticated()) {
        try {
          const outlookEvents = await outlookCalendarService.getEvents(startDate, endDate);
          console.log(`Loaded ${outlookEvents.length} events from Outlook Calendar`);
          const convertedOutlookEvents = outlookEvents.map(event => convertOutlookEvent(event));
          allEvents = [...allEvents, ...convertedOutlookEvents];
        } catch (error) {
          console.error('Failed to load Outlook Calendar events:', error);
        }
      }
      
      // Fallback: Get cached events from calendar service (only works in Electron)
      if (allEvents.length === 0) {
        try {
          const cachedEvents = await calendarConnectionService.getCachedEvents();
          
          // Convert cached events to CalendarEvent format
          cachedEvents.forEach(event => {
            const calendarEvent: CalendarEvent = {
              id: event.eventId || event.id,
              title: event.title,
              type: 'Event',
              startDate: new Date(event.startTime),
              endDate: new Date(event.endTime),
              status: event.status === 'confirmed' ? 'Live' : 'Upcoming',
              color: colors.accent,
              attendees: event.attendees || []
            };
            allEvents.push(calendarEvent);
          });

          // Try to fetch fresh events if connections are active
          const connections = await calendarConnectionService.getUserConnections();
          
          for (const connection of connections) {
            if (!connection.isConnected) continue;
            
            try {
              if (connection.provider === 'google') {
                const googleEvents = await googleCalendarService.getEvents();
                googleEvents.forEach(event => {
                  const converted = convertGoogleEvent(event);
                  const existingIndex = allEvents.findIndex(e => e.id === converted.id);
                  if (existingIndex >= 0) {
                    allEvents[existingIndex] = converted;
                  } else {
                    allEvents.push(converted);
                  }
                });
              }
            } catch (error) {
              console.error(`Failed to load events from ${connection.provider}:`, error);
            }
          }
        } catch (ipcError) {
          console.log('IPC calendar service not available (running in browser mode)');
        }
      }

      setExternalEvents(allEvents);
      console.log(`Total external events loaded: ${allEvents.length}`);
    } catch (error) {
      console.error('Failed to load external events:', error);
    }
  };

  const loadDatabaseEvents = async () => {
    try {
      console.log('Loading database events...');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        return;
      }

      // Get user profile to get company_id
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userProfile?.company_id) {
        console.log('No company_id found for user');
        return;
      }

      // Load events from the events table
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          id,
          name,
          from,
          to,
          start_time,
          end_time,
          status,
          description,
          location,
          created_at
        `)
        .eq('company_id', userProfile.company_id)
        .gte('from', new Date().toISOString().split('T')[0]) // Only future events
        .order('from', { ascending: true });

      if (error) {
        console.error('Error loading database events:', error);
        return;
      }

      console.log(`Loaded ${eventsData.length} database events`);

      // Convert database events to CalendarEvent format
      const convertedEvents: CalendarEvent[] = eventsData.map(event => ({
        id: `db_${event.id}`,
        title: event.name,
        type: 'Event',
        startDate: new Date(event.from),
        endDate: new Date(event.to),
        startTime: event.start_time,
        endTime: event.end_time,
        status: event.status,
        color: '#10b981', // Green color for database events
        attendees: []
      }));

      setDatabaseEvents(convertedEvents);
      console.log(`Converted ${convertedEvents.length} database events`);
    } catch (error) {
      console.error('Failed to load database events:', error);
    }
  };

  const loadGoogleCalendarEvents = async () => {
    try {
      console.log('Loading Google Calendar events...');
      
      if (!googleCalendarService.isAuthenticated()) {
        console.warn('Google Calendar not authenticated');
        setIsGoogleConnected(false);
        return;
      }

      // Load events for a wider date range (3 months back, 6 months forward)
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);

      const googleEvents = await googleCalendarService.getEvents(startDate, endDate);
      console.log(`Loaded ${googleEvents.length} events from Google Calendar`);
      
      const convertedEvents = googleEvents.map(event => convertGoogleEvent(event));
      
      // Preserve events from other providers and update Google events
      setExternalEvents(prev => [
        ...prev.filter(event => !event.id.startsWith('google_')),
        ...convertedEvents
      ]);
      
      setIsGoogleConnected(true);
      console.log('Google Calendar events loaded successfully');
    } catch (error) {
      console.error('Failed to load Google Calendar events:', error);
      setIsGoogleConnected(false);
    }
  };

  const loadOutlookCalendarEvents = async () => {
    try {
      console.log('Loading Outlook Calendar events...');
      
      if (!outlookCalendarService.isAuthenticated()) {
        console.warn('Outlook Calendar not authenticated');
        setIsOutlookConnected(false);
        return;
      }

      // Load events for a wider date range (3 months back, 6 months forward)
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);

      const outlookEvents = await outlookCalendarService.getEvents(startDate, endDate);
      console.log(`Loaded ${outlookEvents.length} events from Outlook Calendar`);
      
      const convertedEvents = outlookEvents.map(event => convertOutlookEvent(event));
      setExternalEvents(prev => [
        ...prev.filter(event => !event.id.startsWith('outlook_')),
        ...convertedEvents
      ]);
      
      setIsOutlookConnected(true);
      console.log('Outlook Calendar events loaded successfully');
    } catch (error) {
      console.error('Failed to load Outlook Calendar events:', error);
      setIsOutlookConnected(false);
    }
  };

  const handleGoogleCalendarConnect = async () => {
    if (isGoogleConnected) {
      // Show confirmation popup instead of immediate disconnect
      setShowDisconnectConfirm('google');
      return;
    }

    try {
      console.log('=== GOOGLE CALENDAR CONNECTION ATTEMPT ===');
      console.log('Attempting to connect to Google Calendar...');
      
      // Check if the service is available
      if (!googleCalendarService) {
        console.error('Google Calendar service not available');
        alert('Google Calendar service not available. Please check the console for details.');
        return;
      }

      // Run diagnostic to help identify issues
      if (typeof googleCalendarService.diagnose === 'function') {
        await googleCalendarService.diagnose();
      }

      // Add a small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const success = await googleCalendarService.signIn();
      console.log('Sign in result:', success);
      
      if (success) {
        console.log('Google Calendar connected successfully');
        setIsGoogleConnected(true);
        setShowSuccessPopup({
          show: true,
          provider: 'google',
          message: 'Google Calendar connected successfully! Your events are now syncing.'
        });
        // Load events directly from Google Calendar service
        await loadGoogleCalendarEvents();
      } else {
        console.warn('Google Calendar connection failed');
        setIsGoogleConnected(false);
        
        // Enhanced error handling for common issues
        alert(`Google Calendar connection failed. Common solutions:

1. **Third-party cookies**: Enable third-party cookies in your browser
2. **Popup blocker**: Allow popups for localhost:3000
3. **OAuth configuration**: Ensure your Google Cloud Console has:
   - http://localhost:3000 in "Authorized JavaScript origins"
   - Google Calendar API enabled and restricted

Check the browser console for detailed diagnostic information.`);
      }
      
      console.log('=== END GOOGLE CALENDAR CONNECTION ATTEMPT ===');
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('redirect_uri_mismatch')) {
          alert(`OAuth Configuration Error:

The redirect URI is not configured correctly in your Google Cloud Console.

Please add these URIs to "Authorized JavaScript origins":
• http://localhost:3000
• http://localhost

Go to: https://console.cloud.google.com/apis/credentials`);
        } else if (error.message.includes('different options')) {
          const shouldReset = confirm(`Google API Reinitialization Error:

The Google API was already initialized with different options.

Would you like to:
• Click "OK" to reset the API state
• Click "Cancel" to refresh the page`);
          
          if (shouldReset && typeof googleCalendarService.reset === 'function') {
            await googleCalendarService.reset();
            alert('API state reset. Please try connecting again.');
          } else {
            window.location.reload();
          }
        } else {
          alert(`Connection failed: ${error.message}\n\nCheck the console for more details.`);
        }
      }
    }
  };

  const handleOutlookCalendarConnect = async () => {
    if (isOutlookConnected) {
      // Show confirmation popup instead of immediate disconnect
      setShowDisconnectConfirm('outlook');
      return;
    }

    try {
      console.log('=== OUTLOOK CALENDAR CONNECTION ATTEMPT ===');
      console.log('Attempting to connect to Outlook Calendar...');
      
      // Check if the service is available
      if (!outlookCalendarService) {
        console.error('Outlook Calendar service not available');
        alert('Outlook Calendar service not available. Please check the console for details.');
        return;
      }

      // Run diagnostic to help identify issues
      if (typeof outlookCalendarService.diagnose === 'function') {
        await outlookCalendarService.diagnose();
      }

      // Add a small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const success = await outlookCalendarService.signIn();
      console.log('Outlook sign in result:', success);
      
      if (success) {
        console.log('Outlook Calendar connected successfully');
        setIsOutlookConnected(true);
        setShowSuccessPopup({
          show: true,
          provider: 'outlook',
          message: 'Outlook Calendar connected successfully! Your events are now syncing.'
        });
        // Load events from Outlook Calendar
        await loadOutlookCalendarEvents();
      } else {
        console.warn('Outlook Calendar connection failed');
        setIsOutlookConnected(false);
        
        alert(`Outlook Calendar connection failed. Common solutions:

1. **Popup blocker**: Allow popups for localhost:3000
2. **Azure App Registration**: Ensure your Azure App Registration has:
   - http://localhost:3000 in "Redirect URIs"
   - Microsoft Graph API permissions (Calendars.Read)
   - Client ID configured correctly

Check the browser console for detailed diagnostic information.`);
      }
      
      console.log('=== END OUTLOOK CALENDAR CONNECTION ATTEMPT ===');
    } catch (error) {
      console.error('Error connecting to Outlook Calendar:', error);
      
      if (error instanceof Error) {
        alert(`Outlook connection failed: ${error.message}\n\nCheck the console for more details.`);
      }
    }
  };

  const confirmDisconnect = async (provider: 'google' | 'outlook') => {
    try {
      if (provider === 'google') {
        await googleCalendarService.signOut();
        setIsGoogleConnected(false);
        setExternalEvents(prev => prev.filter(event => !event.id.startsWith('google_')));
        setShowSuccessPopup({
          show: true,
          provider: 'google',
          message: 'Google Calendar disconnected successfully!'
        });
      } else {
        await outlookCalendarService.signOut();
        setIsOutlookConnected(false);
        setExternalEvents(prev => prev.filter(event => !event.id.startsWith('outlook_')));
        setShowSuccessPopup({
          show: true,
          provider: 'outlook',
          message: 'Outlook Calendar disconnected successfully!'
        });
      }
      setShowDisconnectConfirm(null);
    } catch (error) {
      console.error(`Error disconnecting ${provider} Calendar:`, error);
      setShowDisconnectConfirm(null);
    }
  };

  const convertGoogleEvent = (googleEvent: ExternalCalendarEvent): CalendarEvent => {
    const startDate = googleEvent.start || new Date();
    const endDate = googleEvent.end || new Date();

    return {
      id: `google_${googleEvent.id}`,
      title: googleEvent.title || 'Untitled Event',
      type: 'Event',
      startDate,
      endDate,
      startTime: startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      endTime: endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      attendees: googleEvent.attendees?.map(a => a.email) || [],
      status: googleEvent.status === 'confirmed' ? 'Live' : 'Upcoming',
      color: '#4285f4'
    };
  };

  const convertOutlookEvent = (outlookEvent: ExternalCalendarEvent): CalendarEvent => {
    const startDate = outlookEvent.start || new Date();
    const endDate = outlookEvent.end || new Date();

    return {
      id: `outlook_${outlookEvent.id}`,
      title: outlookEvent.title || 'Untitled Event',
      type: 'Event',
      startDate,
      endDate,
      startTime: startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      endTime: endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      attendees: outlookEvent.attendees?.map(a => a.email) || [],
      status: outlookEvent.status === 'confirmed' ? 'Live' : 'Upcoming',
      color: '#0078d4'
    };
  };

  // Calendar Generation
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewMode === 'Week') {
      // Generate current week view
      const currentDay = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const days = [];
      
      // Calculate the start of the week (Sunday)
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDay);
      
      // Generate 7 days starting from Sunday
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        days.push(day);
      }
      
      return days;
    } else {
      // Generate full month view (existing logic)
      const daysInMonth = getDaysInMonth(year, month);
      const firstDay = getFirstDayOfMonth(year, month);
      
      const days = [];
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < firstDay; i++) {
        days.push(null);
      }
      
      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(new Date(year, month, day));
      }
      
      return days;
    }
  };

  const getEventsForDate = (date: Date) => {
    if (!date) return [];
    const dateStr = toYYYYMMDD(date);
    return [...events, ...externalEvents, ...databaseEvents].filter(event => 
      toYYYYMMDD(event.startDate) === dateStr
    );
  };

  const filteredEvents = useMemo(() => {
    const allEvents = [...events, ...externalEvents, ...databaseEvents];
    if (activeFilter === 'Calendar') return allEvents;
    return allEvents.filter(event => event.type === activeFilter);
  }, [events, externalEvents, databaseEvents, activeFilter]);

  const todaysEvents = getEventsForDate(new Date());
  const upcomingEvents = [...events, ...externalEvents, ...databaseEvents]
    .filter(event => event.startDate > new Date())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .slice(0, 5);

  return (
    <div style={{ 
      background: isDark 
        ? 'radial-gradient(1200px 800px at 20% -10%, rgba(34,197,94,0.12), transparent 40%), radial-gradient(1000px 700px at 120% 10%, rgba(34,197,94,0.08), transparent 45%), #0f1115'
        : '#f7f8fa',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        width: '100%'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            margin: '0 40px 0 0', 
            color: colors.text,
            minWidth: 'fit-content'
          }}>
            Calendar
          </h1>
          
          {/* Filter Buttons - Equal Sizes */}
          <div style={{ 
            display: 'flex', 
            gap: '12px',
            flex: 1,
            justifyContent: 'flex-start'
          }}>
            {filterButtons.map(item => (
              <button 
                key={item.label} 
                onClick={() => setActiveFilter(item.value)} 
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: `1px solid ${activeFilter === item.value ? colors.text : colors.border}`,
                  borderRadius: '8px',
                  background: activeFilter === item.value ? colors.text : colors.hover,
                  color: activeFilter === item.value ? (isDark ? '#000' : '#fff') : colors.text,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: activeFilter === item.value ? '600' : '500',
                  backdropFilter: 'blur(10px)',
                  width: '110px',
                  height: '44px',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={() => {
            setShowAddEvent(true);
            setNewEventDate(null); // Clear date so date pickers are shown
          }}
          style={{
            background: '#10b981',
            padding: '12px 16px',
            border: 'none',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            marginLeft: '20px',
            width: '110px',
            height: '44px',
            whiteSpace: 'nowrap',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
          }}
        >
          <span style={{ fontSize: '16px' }}>+</span>
          Add New
        </button>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)' }}>
        
        {/* Left Panel */}
        <div style={{ 
          width: '320px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px' 
        }}>
          
          {/* Today's Date Display */}
          <div style={{ ...glassStyle, padding: '24px', textAlign: 'center' }}>
            <div style={{ 
              fontSize: '48px', 
              fontWeight: '700', 
              color: colors.text,
              lineHeight: '1'
            }}>
              {selectedDate.getDate()}
            </div>
            <div style={{ 
              fontSize: '16px', 
              color: colors.textSecondary,
              marginTop: '4px'
            }}>
              {dayNames[selectedDate.getDay()]}, {monthNames[selectedDate.getMonth()]}
            </div>
          </div>

          {/* Today's Events */}
          <div style={{ ...glassStyle, padding: '20px', flex: '1' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              margin: '0 0 16px 0', 
              color: colors.text 
            }}>
              Today's Events
            </h3>
            
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {todaysEvents.length === 0 ? (
                <div style={{ 
                  color: colors.textSecondary, 
                  fontSize: '14px',
                  textAlign: 'center',
                  padding: '20px 0'
                }}>
                  No events today
                </div>
              ) : (
                todaysEvents.map(event => (
                  <div key={event.id} style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: colors.hover,
                    border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: colors.text,
                      marginBottom: '4px'
                    }}>
                      {event.title}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: colors.textSecondary 
                    }}>
                      {event.startTime} - {event.endTime}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Calendar Connections - Combined Section */}
          <div style={{ ...glassStyle, padding: '20px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              margin: '0 0 16px 0', 
              color: colors.text 
            }}>
              Calendar Connections
            </h3>
            
            {/* Google Calendar Button */}
            <button 
              onClick={handleGoogleCalendarConnect}
              style={{ 
                width: '100%', 
                padding: '12px', 
                marginBottom: '8px',
                borderRadius: '8px', 
                border: 'none', 
                background: isGoogleConnected ? '#10b981' : '#4285f4', 
                color: '#fff', 
                cursor: 'pointer', 
                fontWeight: '500',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              {isGoogleConnected ? '✓ Google Calendar Connected' : 'Connect Google Calendar'}
            </button>
            
            {isGoogleConnected && (
              <>
                <div style={{ 
                  fontSize: '12px', 
                  color: colors.textSecondary, 
                  textAlign: 'center',
                  marginBottom: '8px'
                }}>
                  {externalEvents.filter(event => event.id.startsWith('google_')).length} events loaded
                </div>
                
                <button 
                  onClick={loadGoogleCalendarEvents}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    marginBottom: '12px',
                    borderRadius: '6px', 
                    border: `1px solid ${colors.border}`, 
                    background: colors.hover, 
                    color: colors.text, 
                    cursor: 'pointer', 
                    fontWeight: '400',
                    fontSize: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🔄 Refresh Google Events
                </button>
              </>
            )}

            {/* Outlook Calendar Button */}
            <button 
              onClick={handleOutlookCalendarConnect}
              style={{ 
                width: '100%', 
                padding: '12px', 
                marginBottom: '8px',
                borderRadius: '8px', 
                border: 'none', 
                background: isOutlookConnected ? '#10b981' : '#0078d4', 
                color: '#fff', 
                cursor: 'pointer', 
                fontWeight: '500',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              {isOutlookConnected ? '✓ Outlook Calendar Connected' : 'Connect Outlook Calendar'}
            </button>
            
            {isOutlookConnected && (
              <>
                <div style={{ 
                  fontSize: '12px', 
                  color: colors.textSecondary, 
                  textAlign: 'center',
                  marginBottom: '8px'
                }}>
                  {externalEvents.filter(event => event.id.startsWith('outlook_')).length} events loaded
                </div>
                
                <button 
                  onClick={loadOutlookCalendarEvents}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '6px', 
                    border: `1px solid ${colors.border}`, 
                    background: colors.hover, 
                    color: colors.text, 
                    cursor: 'pointer', 
                    fontWeight: '400',
                    fontSize: '12px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  🔄 Refresh Outlook Events
                </button>
              </>
            )}
          </div>

          {/* Upcoming */}
          <div style={{ ...glassStyle, padding: '20px', flex: '1' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              margin: '0 0 16px 0', 
              color: colors.text 
            }}>
              Upcoming
            </h3>
            
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {upcomingEvents.length === 0 ? (
                <div style={{ 
                  color: colors.textSecondary, 
                  fontSize: '14px',
                  textAlign: 'center',
                  padding: '20px 0'
                }}>
                  No upcoming events
                </div>
              ) : (
                upcomingEvents.map(event => (
                  <div key={event.id} style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: colors.hover,
                    border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: colors.text,
                      marginBottom: '4px'
                    }}>
                      {event.title}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: colors.textSecondary 
                    }}>
                      {event.startDate.toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Calendar Panel */}
        <div style={{ 
          flex: '1', 
          ...glassStyle, 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* Calendar Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '24px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => {
                  if (viewMode === 'Week') {
                    // Navigate to previous week
                    const newDate = new Date(currentDate);
                    newDate.setDate(currentDate.getDate() - 7);
                    setCurrentDate(newDate);
                  } else {
                    // Navigate to previous month
                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
                  }
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.hover,
                  color: colors.text,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ←
              </button>
              
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                margin: 0, 
                color: colors.text,
                whiteSpace: 'nowrap'
              }}>
                {viewMode === 'Week' ? (
                  (() => {
                    const currentDay = currentDate.getDay();
                    const startOfWeek = new Date(currentDate);
                    startOfWeek.setDate(currentDate.getDate() - currentDay);
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    
                    const startMonth = startOfWeek.getMonth();
                    const endMonth = endOfWeek.getMonth();
                    const startYear = startOfWeek.getFullYear();
                    const endYear = endOfWeek.getFullYear();
                    
                    if (startMonth === endMonth && startYear === endYear) {
                      return `${monthNames[startMonth]} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${startYear}`;
                    } else if (startYear === endYear) {
                      return `${monthNames[startMonth]} ${startOfWeek.getDate()} - ${monthNames[endMonth]} ${endOfWeek.getDate()}, ${startYear}`;
                    } else {
                      return `${monthNames[startMonth]} ${startOfWeek.getDate()}, ${startYear} - ${monthNames[endMonth]} ${endOfWeek.getDate()}, ${endYear}`;
                    }
                  })()
                ) : (
                  `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                )}
              </h2>
              
              <button
                onClick={() => {
                  if (viewMode === 'Week') {
                    // Navigate to next week
                    const newDate = new Date(currentDate);
                    newDate.setDate(currentDate.getDate() + 7);
                    setCurrentDate(newDate);
                  } else {
                    // Navigate to next month
                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
                  }
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.hover,
                  color: colors.text,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                →
              </button>
            </div>
            
            {/* View Toggle */}
            <div style={{ 
              display: 'flex', 
              background: colors.hover, 
              borderRadius: '8px', 
              padding: '4px',
              border: `1px solid ${colors.border}`
            }}>
              {['Week', 'Month'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as 'Week' | 'Month')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: viewMode === mode ? colors.text : 'transparent',
                    color: viewMode === mode ? (isDark ? '#000' : '#fff') : colors.text,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Grid */}
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
            
            {/* Days of Week Header */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, 1fr)', 
              marginBottom: '16px',
              padding: '16px 20px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
            }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{
                  padding: '8px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, 1fr)', 
              gap: '8px',
              flex: '1',
              padding: '20px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              {generateCalendarDays().map((date, index) => {
                const dayEvents = date ? getEventsForDate(date) : [];
                const isToday = date && toYYYYMMDD(date) === toYYYYMMDD(new Date());
                const isSelected = date && toYYYYMMDD(date) === toYYYYMMDD(selectedDate);
                
                return (
                  <div
                    key={index}
                    onClick={() => date && setSelectedDate(date)}
                    onDoubleClick={() => {
                      if (date) {
                        setSelectedDate(date);
                        setNewEventDate(date);
                        setShowAddEvent(true);
                      }
                    }}
                    onMouseDown={() => {
                      if (date && dayEvents.length > 0) {
                        const timer = setTimeout(() => {
                          setShowDayEventsPopup({
                            show: true,
                            date: date,
                            events: dayEvents
                          });
                        }, 500) as unknown as NodeJS.Timeout;
                        setLongPressTimer(timer);
                      }
                    }}
                    onMouseUp={() => {
                      if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        setLongPressTimer(null);
                      }
                    }}
                    onMouseLeave={() => {
                      if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        setLongPressTimer(null);
                      }
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: '12px',
                      background: date ? (isSelected ? '#10b981' : 'rgba(255, 255, 255, 0.05)') : 'transparent',
                      border: isToday ? `2px solid #10b981` : `1px solid rgba(255, 255, 255, 0.1)`,
                      cursor: date ? 'pointer' : 'default',
                      minHeight: '100px',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s ease',
                      overflow: 'hidden',
                      margin: '2px'
                    }}
                  >
                    {date && (
                      <>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: isToday ? '700' : '500',
                          color: isSelected ? '#fff' : (isToday ? '#10b981' : colors.text),
                          marginBottom: '6px',
                          flexShrink: 0
                        }}>
                          {date.getDate()}
                        </div>
                        
                        {/* Event List */}
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          gap: '2px',
                          flex: 1,
                          overflow: 'hidden'
                        }}>
                          {dayEvents.slice(0, 3).map((event, i) => (
                            <div
                              key={i}
                              style={{
                                fontSize: '10px',
                                padding: '2px 4px',
                                borderRadius: '3px',
                                background: event.color || '#ffffff',
                                color: event.color === '#ffffff' || event.color === colors.text ? (isDark ? '#000' : '#000') : '#fff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontWeight: '500',
                                border: event.color === '#ffffff' ? `1px solid ${colors.border}` : 'none'
                              }}
                              title={event.title} // Tooltip for full title
                            >
                              {event.title}
                            </div>
                          ))}
                          
                          {/* Show remaining count if more than 3 events */}
                          {dayEvents.length > 3 && (
                            <div style={{
                              fontSize: '9px',
                              color: colors.textSecondary,
                              textAlign: 'center',
                              marginTop: '2px',
                              fontWeight: '500'
                            }}>
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                          
                          {/* Show small white dots at bottom as visual indicator */}
                          {dayEvents.length > 0 && (
                            <div style={{ 
                              display: 'flex', 
                              flexWrap: 'wrap', 
                              gap: '2px',
                              marginTop: 'auto',
                              justifyContent: 'center',
                              paddingTop: '2px'
                            }}>
                              {dayEvents.slice(0, 4).map((event, i) => (
                                <div
                                  key={`dot-${i}`}
                                  style={{
                                    width: '3px',
                                    height: '3px',
                                    borderRadius: '50%',
                                    background: '#ffffff',
                                    opacity: 0.8
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal - Proper Form */}
      {showAddEvent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            ...glassStyle,
            padding: '32px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              margin: '0 0 24px 0', 
              color: colors.text 
            }}>
              Add New Event
            </h3>
            
            {/* Event Title */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500',
                color: colors.text 
              }}>
                Event Title
              </label>
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="Enter event title..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.hover,
                  color: colors.text,
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Event Date Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500',
                color: colors.text 
              }}>
                Event Date
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="date"
                  value={newEventDate ? newEventDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null;
                    setNewEventDate(date);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: colors.hover,
                    color: colors.text,
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setNewEventDate(new Date())}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: colors.hover,
                    color: colors.text,
                    fontSize: '14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Today
                </button>
              </div>
            </div>

            {/* Event Type */}
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500',
                color: colors.text 
              }}>
                Event Type
              </label>
              
              {/* Custom Dropdown */}
              <div
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.hover,
                  color: colors.text,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'relative'
                }}
              >
                <span>{eventTypes.find(type => type.value === newEventType)?.label || 'Select Type'}</span>
                <span style={{ 
                  transform: showTypeDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}>
                  ▼
                </span>
              </div>

              {/* Dropdown Options */}
              {showTypeDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  background: isDark ? '#2a2a2a' : '#ffffff',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  marginTop: '4px',
                  boxShadow: isDark 
                    ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
                    : '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                  {eventTypes.map(type => (
                    <div
                      key={type.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewEventType(type.value);
                        setShowTypeDropdown(false);
                      }}
                      style={{
                        padding: '12px',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: '14px',
                        borderBottom: type.value !== eventTypes[eventTypes.length - 1].value ? `1px solid ${colors.border}` : 'none',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDark ? '#3a3a3a' : '#f0f0f0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {type.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Time Selection */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: colors.text 
                }}>
                  Start Time
                </label>
                <CustomGlassTimePicker
                  value={newEventTime}
                  onChange={setNewEventTime}
                  placeholder="Start Time"
                  isDark={isDark}
                  colors={colors}
                />
              </div>
              
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: colors.text 
                }}>
                  End Time
                </label>
                <CustomGlassTimePicker
                  value={newEventEndTime}
                  onChange={setNewEventEndTime}
                  placeholder="End Time"
                  isDark={isDark}
                  colors={colors}
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddEvent(false);
                  setNewEventTitle('');
                  setNewEventType('Meeting');
                  setNewEventDate(null);
                  setNewEventTime('');
                  setNewEventEndTime('');
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.hover,
                  color: colors.text,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  if (newEventTitle && newEventTime && newEventEndTime && (newEventDate || selectedDate)) {
                    const eventDate = newEventDate || selectedDate;
                    const newEvent: CalendarEvent = {
                      id: `local_${Date.now()}`,
                      title: newEventTitle,
                      type: newEventType as any,
                      startDate: eventDate,
                      endDate: eventDate,
                      startTime: newEventTime,
                      endTime: newEventEndTime,
                      status: 'Upcoming',
                      color: colors.text
                    };
                    setEvents([...events, newEvent]);
                    setShowAddEvent(false);
                    setNewEventTitle('');
                    setNewEventType('Meeting');
                    setNewEventDate(null);
                    setNewEventTime('');
                    setNewEventEndTime('');
                  }
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.text,
                  color: isDark ? '#000' : '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup Modal */}
      {showSuccessPopup.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            ...glassStyle,
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            animation: 'slideIn 0.3s ease-out'
          }}>
            {/* Success Icon */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: colors.success,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              fontSize: '24px',
              color: '#fff'
            }}>
              ✓
            </div>
            
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              margin: '0 0 16px 0', 
              color: colors.text 
            }}>
              {showSuccessPopup.provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'}
            </h3>
            
            <p style={{ 
              fontSize: '14px', 
              color: colors.textSecondary, 
              margin: '0 0 24px 0',
              lineHeight: '1.5'
            }}>
              {showSuccessPopup.message}
            </p>
            
            <button
              onClick={() => setShowSuccessPopup({ show: false, provider: null, message: '' })}
              style={{
                padding: '12px 32px',
                borderRadius: '8px',
                border: 'none',
                background: colors.success,
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            ...glassStyle,
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              margin: '0 0 16px 0', 
              color: colors.text 
            }}>
              Disconnect {showDisconnectConfirm === 'google' ? 'Google' : 'Outlook'} Calendar?
            </h3>
            
            <p style={{ 
              fontSize: '14px', 
              color: colors.textSecondary, 
              margin: '0 0 24px 0',
              lineHeight: '1.5'
            }}>
              Are you sure you want to disconnect your {showDisconnectConfirm === 'google' ? 'Google' : 'Outlook'} Calendar? 
              This will remove all imported events from your calendar view and you'll need to reconnect to sync again.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowDisconnectConfirm(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.hover,
                  color: colors.text,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={() => confirmDisconnect(showDisconnectConfirm)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.danger,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Events Popup */}
      {showDayEventsPopup.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1002
        }}>
          <div style={{
            ...glassStyle,
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '70vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              margin: '0 0 16px 0', 
              color: colors.text,
              textAlign: 'center'
            }}>
              {showDayEventsPopup.date && (
                `${dayNames[showDayEventsPopup.date.getDay()]}, ${monthNames[showDayEventsPopup.date.getMonth()]} ${showDayEventsPopup.date.getDate()}`
              )}
            </h3>
            
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {showDayEventsPopup.events.map((event, index) => (
                <div
                  key={event.id}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: colors.hover,
                    border: `1px solid ${colors.border}`,
                    borderLeft: `4px solid ${event.color || '#ffffff'}`
                  }}
                >
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: '8px'
                  }}>
                    {event.title}
                  </div>
                  
                  <div style={{
                    fontSize: '14px',
                    color: colors.textSecondary,
                    marginBottom: '4px'
                  }}>
                    🕒 {event.startTime} - {event.endTime}
                  </div>
                  
                  <div style={{
                    fontSize: '12px',
                    color: colors.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: event.color || '#ffffff',
                      color: event.color === '#ffffff' || event.color === colors.text ? '#000' : '#fff',
                      fontSize: '10px',
                      fontWeight: '500'
                    }}>
                      {event.type}
                    </span>
                    
                    {event.attendees && event.attendees.length > 0 && (
                      <span>
                        👥 {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setShowDayEventsPopup({ show: false, date: null, events: [] })}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                background: colors.hover,
                color: colors.text,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                alignSelf: 'center'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 