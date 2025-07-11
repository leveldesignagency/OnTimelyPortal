import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import TimelinePreview from '../components/TimelinePreview';
import { supabase, getEvent, getGuests, getItineraries, getEventAssignments, type Event } from '../lib/supabase';
import FeedbackModuleModal from '../components/FeedbackModuleModal';
import FeedbackGuestSelectionModal from '../components/FeedbackGuestSelectionModal';
import MultipleChoiceModuleModal from '../components/MultipleChoiceModuleModal';
import PhotoVideoModuleModal from '../components/PhotoVideoModuleModal';
import QuestionModal from '../components/QuestionModuleModal';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = import.meta.env.VITE_SERVICE_ROLE_KEY || '';

// Debug logging
console.log('🔧 Admin Supabase Config:');
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? `${SERVICE_ROLE_KEY.substring(0, 20)}...` : 'NOT SET');

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY); // Use your service role key

// Add email validation helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const hasInternationalChars = (email: string): boolean => {
  // Check for non-ASCII characters that might cause issues
  return /[^\x00-\x7F]/.test(email);
};

const sanitizeEmail = (email: string): string => {
  // Basic sanitization - remove leading/trailing spaces
  return email.trim().toLowerCase();
};

interface GuestLogin {
  id: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  status: 'pending' | 'invite_sent' | 'credentials_set' | 'accessed';
}

export default function EventPortalManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const timelineRef = useRef<any>(null);
  
  // Get eventId from location.state or fallback
  const eventId = location.state?.eventId;

  // Add state for guests, itineraries, assignments, and loading
  const [guests, setGuests] = useState<any[]>([]);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [guestAssignments, setGuestAssignments] = useState<{ [guestId: string]: string[] }>({});
  const [eventAddOns, setEventAddOns] = useState<any[]>(location.state?.eventAddOns || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!eventId) return;
      setLoading(true);
      try {
        const [guestsData, itinerariesData, assignmentsData] = await Promise.all([
          getGuests(eventId),
          getItineraries(eventId),
          getEventAssignments(eventId)
        ]);
        setGuests(guestsData);
        setItineraries(itinerariesData);
        setGuestAssignments(assignmentsData);
      } catch (e) {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [eventId]);

  // Add state for event and selected date
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [eventDates, setEventDates] = useState<Date[]>([]);

  const [showGenerateLoginsModal, setShowGenerateLoginsModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [selectedGuestsForRegenerate, setSelectedGuestsForRegenerate] = useState<string[]>([]);
  const [guestLogins, setGuestLogins] = useState<GuestLogin[]>([]);
  const [isGeneratingLogins, setIsGeneratingLogins] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [collapsedCards, setCollapsedCards] = useState<{[guestId: string]: boolean}>({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [collapsedItins, setCollapsedItins] = useState<{[itinId: string]: boolean}>({});
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionStep, setQuestionStep] = useState(1);
  const [questionText, setQuestionText] = useState('');
  const [questionTimeMode, setQuestionTimeMode] = useState<'now' | 'later'>('now');
  const [questionTime, setQuestionTime] = useState<string>('');
  const [questionDropTime, setQuestionDropTime] = useState<Date | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackModalTime, setFeedbackModalTime] = useState<Date>(new Date());
  const [feedbackStep2, setFeedbackStep2] = useState<{ title: string; defaultRating: number; time: Date } | null>(null);
  const [showMultipleChoiceModal, setShowMultipleChoiceModal] = useState(false);
  const [showPhotoVideoModal, setShowPhotoVideoModal] = useState(false);
  // Add state for toast
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [selectedGuestsForGenerate, setSelectedGuestsForGenerate] = useState<string[]>([]);
  const [customModal, setCustomModal] = useState<{ title: string; message: string; onClose?: () => void } | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const fetchGuestLogins = async () => {
      try {
        const { data, error } = await supabase
          .from('guest_logins')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Failed to fetch guest logins:', error);
          return;
        }
        if (data && Array.isArray(data)) {
          // Map to GuestLogin type
          const logins = data.map((row: any) => ({
            id: row.guest_id,
            email: row.email,
            temporaryPassword: row.password,
            loginUrl: row.login_url,
            status: 'pending' as const, // Fix linter error
          }));
          setGuestLogins(logins);
        }
      } catch (err) {
        console.error('Error fetching guest logins:', err);
      }
    };
    fetchGuestLogins();
  }, [eventId]);

  // Initialize collapsed cards when guests change
  useEffect(() => {
    const collapsed: {[guestId: string]: boolean} = {};
    guests.forEach((guest: any) => {
      collapsed[guest.id] = true; // Default all cards to collapsed
    });
    setCollapsedCards(collapsed);
  }, [guests]);

  // Note: Guest logins are generated on-demand, not loaded from database
  // They exist only in the UI state during the session
  
  // Add debug logging for guests
  useEffect(() => {
    console.log('🔍 Guests state updated:', {
      count: guests.length,
      guests: guests.map((g: any) => ({ id: g.id, email: g.email, name: `${g.first_name} ${g.last_name}` }))
    });
  }, [guests]);

  // Load event information
  useEffect(() => {
    const loadEvent = async () => {
      if (!eventId) {
        console.log('No eventId provided to loadEvent');
        return;
      }
      
      try {
        console.log('Loading event data for eventId:', eventId);
        const eventData = await getEvent(eventId);
        console.log('Loaded event data:', eventData);
        setEvent(eventData);
        
        // Generate array of dates between event start and end
        const startDate = new Date(eventData.from);
        const endDate = new Date(eventData.to);
        console.log('Event date range:', { from: eventData.from, to: eventData.to, startDate, endDate });
        
        const dates: Date[] = [];
        
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          dates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log('Generated event dates:', dates);
        setEventDates(dates);
        // Set selected date to today if within event range, otherwise to event start
        const today = new Date();
        today.setHours(0,0,0,0);
        const inRange = today >= startDate && today <= endDate;
        setSelectedDate(inRange ? today : startDate);
        console.log('Selected date set to:', inRange ? today : startDate);
      } catch (error) {
        console.error('Error loading event:', error);
      }
    };

    loadEvent();
  }, [eventId]);

  // Toggle card collapse state
  const toggleCardCollapse = (guestId: string) => {
    setCollapsedCards(prev => ({
      ...prev,
      [guestId]: !prev[guestId]
    }));
  };

  // Toggle itinerary collapse
  const toggleItinCollapse = (itinId: string) => {
    setCollapsedItins(prev => ({
      ...prev,
      [itinId]: !prev[itinId]
    }));
  };

  // Simplify the handleGenerateLogins function to use guest_logins table:
  const handleGenerateLogins = async (guestsToGenerate?: any[]) => {
    setIsGeneratingLogins(true);
    setShowGenerateLoginsModal(false);
    try {
      console.log('🔍 Generate logins called with:', {
        guestsToGenerateCount: guestsToGenerate?.length || 0,
        allGuestsCount: guests.length,
        guestsToGenerateList: guestsToGenerate?.map(g => ({ id: g.id, email: g.email })) || 'none provided',
        allGuestsEmails: guests.map(g => g.email)
      });
      
      const guestsList = guestsToGenerate || guests;
      console.log('🔍 Final guests list to process:', guestsList.length, 'guests');
      
      if (!guestsList || guestsList.length === 0) {
        throw new Error('No guests found for this event');
      }
      
      console.log('Creating guest logins for guests:', guestsList);
      const newLogins: GuestLogin[] = [];
      const errors: string[] = [];
      
      for (const guest of guestsList) {
        try {
          const guestEmail = sanitizeEmail(guest.email);
          
          // Validate email format
          if (!isValidEmail(guestEmail)) {
            errors.push(`Invalid email format: ${guest.email}`);
            continue;
          }
          
          // Check for international characters that might cause issues
          if (hasInternationalChars(guestEmail)) {
            errors.push(`Email contains international characters that may not be supported: ${guest.email}`);
            continue;
          }
          
          if (!guestEmail) {
            errors.push(`Guest email is missing for: ${guest.first_name} ${guest.last_name}`);
            continue;
          }
          
          // Call the create_guest_login RPC function
          console.log('🔧 Creating guest login for:', guestEmail);
          const { data: loginData, error: loginError } = await supabase.rpc('create_guest_login', {
            p_guest_id: guest.id,
            p_event_id: eventId,
            p_email: guestEmail
          });
          
          console.log('🔧 Guest login creation result:', { loginData, loginError });
          
          if (loginError) {
            console.error('🚨 Failed to create guest login:', loginError);
            errors.push(`Failed to create login for ${guestEmail}: ${loginError.message}`);
            continue;
          }
          
          if (!loginData || loginData.length === 0) {
            errors.push(`No login data returned for ${guestEmail}`);
            continue;
          }
          
          const loginRecord = loginData[0];
          const newLogin: GuestLogin = {
            id: guest.id,
            email: guestEmail,
            temporaryPassword: loginRecord.password,
            loginUrl: loginRecord.login_url,
            status: 'pending'
          };
          newLogins.push(newLogin);
          
        } catch (error) {
          console.error(`Error processing guest ${guest.email}:`, error);
          errors.push(`Failed to process ${guest.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      setGuestLogins(newLogins);
      setIsGeneratingLogins(false);
      
      if (errors.length > 0) {
        setCustomModal({
          title: 'Some guests could not be processed',
          message: `Successfully created ${newLogins.length} guest accounts.\n\nErrors:\n${errors.join('\n')}`,
        });
      } else {
        setShowSuccessModal(true);
      }
      
      console.log('Successfully created guest logins:', newLogins);
    } catch (error) {
      console.error('Failed to generate guest logins:', error);
      setIsGeneratingLogins(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setCustomModal({
        title: 'Failed to create guest logins',
        message: errorMessage,
      });
    }
  };

  // Regenerate logins for selected guests
  const handleRegenerateLogins = async () => {
    if (selectedGuestsForRegenerate.length === 0) return;
    setIsGeneratingLogins(true);
    setShowRegenerateModal(false);
    try {
      const selectedGuests = guests.filter((guest: any) => selectedGuestsForRegenerate.includes(guest.id));
      console.log('Regenerating guest logins for guests:', selectedGuests);
      const updatedLogins: GuestLogin[] = [];
      const errors: string[] = [];
      
      for (const guest of selectedGuests) {
        try {
          const guestEmail = sanitizeEmail(guest.email);
          
          if (!guestEmail) {
            errors.push(`Guest email is missing for: ${guest.first_name} ${guest.last_name}`);
            continue;
          }
          
          // Call the create_guest_login RPC function (this will deactivate existing logins)
          console.log('🔧 Regenerating guest login for:', guestEmail);
          const { data: loginData, error: loginError } = await supabase.rpc('create_guest_login', {
            p_guest_id: guest.id,
            p_event_id: eventId,
            p_email: guestEmail
          });
          
          console.log('🔧 Guest login regeneration result:', { loginData, loginError });
          
          if (loginError) {
            console.error('🚨 Failed to regenerate guest login:', loginError);
            errors.push(`Failed to regenerate login for ${guestEmail}: ${loginError.message}`);
            continue;
          }
          
          if (!loginData || loginData.length === 0) {
            errors.push(`No login data returned for ${guestEmail}`);
            continue;
          }
          
          const loginRecord = loginData[0];
          const updatedLogin: GuestLogin = {
            id: guest.id,
            email: guestEmail,
            temporaryPassword: loginRecord.password,
            loginUrl: loginRecord.login_url,
            status: 'pending'
          };
          updatedLogins.push(updatedLogin);
          
        } catch (error) {
          console.error(`Error regenerating login for guest ${guest.email}:`, error);
          errors.push(`Failed to regenerate login for ${guest.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Update the UI state
      setGuestLogins(prev => {
        const updated = [...prev];
        updatedLogins.forEach(newLogin => {
          const index = updated.findIndex(login => login.id === newLogin.id);
          if (index >= 0) {
            updated[index] = newLogin;
          } else {
            updated.push(newLogin);
          }
        });
        return updated;
      });
      
      setIsGeneratingLogins(false);
      setSelectedGuestsForRegenerate([]);
      
      if (errors.length > 0) {
        setCustomModal({
          title: 'Some guest logins could not be regenerated',
          message: `Successfully regenerated ${updatedLogins.length} guest logins.\n\nErrors:\n${errors.join('\n')}`,
        });
      } else {
        setShowSuccessModal(true);
      }
      
      console.log('Successfully regenerated guest logins:', updatedLogins);
    } catch (error) {
      console.error('Failed to regenerate guest logins:', error);
      setIsGeneratingLogins(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setCustomModal({
        title: 'Failed to regenerate guest logins',
        message: errorMessage,
      });
    }
  };

  // Toggle guest selection for regeneration
  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuestsForRegenerate(prev => 
      prev.includes(guestId) 
        ? prev.filter(id => id !== guestId)
        : [...prev, guestId]
    );
  };

  // Copy login details to clipboard
  const handleCopyLoginDetails = (login: GuestLogin) => {
    const details = `Email: ${login.email}\nPassword: ${login.temporaryPassword}`;
    navigator.clipboard.writeText(details);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  // Send login details via email
  const handleSendLoginDetails = async (login: GuestLogin) => {
    try {
      console.log('Sending login details to:', login.email);
      
      // For now, just update the status to invite_sent
      // TODO: Add actual email sending logic here if needed
      
      // Update status to invite_sent
      setGuestLogins(prev => prev.map(l => 
        l.id === login.id ? { ...l, status: 'invite_sent' } : l
      ));
      
      console.log('Successfully marked invite as sent for:', login.email);
      
      // TODO: Implement actual email sending here
      // You can use your existing email service or add a new one
      // For now, we'll just log the login details
      console.log('Login details for', login.email, ':', {
        email: login.email,
        password: login.temporaryPassword,
        loginUrl: login.loginUrl
      });
      
    } catch (error) {
      console.error('Error sending login details:', error);
      setCustomModal({
        title: 'Failed to send invite',
        message: `Failed to send invite to ${login.email}`,
      });
    }
  };

  // Send all login details
  const handleSendAllLogins = async () => {
    // Send to all guests who haven't been sent yet
    const pendingLogins = guestLogins.filter(login => login.status === 'pending');
    
    if (pendingLogins.length === 0) {
      alert('No pending invites to send.');
      return;
    }
    
    console.log(`Sending ${pendingLogins.length} invite emails...`);
    
    for (const login of pendingLogins) {
      await handleSendLoginDetails(login);
      // Add a small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Finished sending all invite emails');
  };

  // Helper to open modal after drop
  const handleShowQuestionModal = (dropTime: Date) => {
    setShowQuestionModal(true);
    setQuestionStep(1);
    setQuestionText('');
    setQuestionTimeMode('now');
    setQuestionTime('');
    setQuestionDropTime(dropTime);
  };

  const getCardStyles = (isDark: boolean) => ({
    background: isDark 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(12px)',
    border: isDark 
      ? '1px solid rgba(255, 255, 255, 0.1)' 
      : '1px solid rgba(0, 0, 0, 0.1)',
    borderRadius: 16,
    boxShadow: isDark 
      ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
      : '0 8px 32px rgba(0, 0, 0, 0.1)',
  });

  const getSectionStyles = (isDark: boolean) => ({
    marginBottom: 48,
    padding: 32,
    ...getCardStyles(isDark),
  });

  const getButtonStyles = (variant: 'primary' | 'secondary' | 'danger', isDark: boolean) => {
    const baseStyles = {
      border: 'none',
      borderRadius: 12,
      padding: '12px 24px',
      fontSize: 16,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          background: isDark ? '#ffffff' : '#000000',
          color: isDark ? '#000000' : '#ffffff',
        };
      case 'secondary':
        return {
          ...baseStyles,
          background: 'transparent',
          color: isDark ? '#ffffff' : '#000000',
          border: `2px solid ${isDark ? '#ffffff' : '#000000'}`,
        };
      case 'danger':
        return {
          ...baseStyles,
          background: '#ef4444',
          color: '#ffffff',
        };
    }
  };

  // Timeline navigation functions
  const handleTimelinePrevious = () => {
    if (timelineRef.current && timelineRef.current.goToPrevious) {
      timelineRef.current.goToPrevious();
    }
  };

  const handleTimelineNext = () => {
    if (timelineRef.current && timelineRef.current.goToNext) {
      timelineRef.current.goToNext();
    }
  };

  // For itinerary list, sort itineraries by start_time ascending
  const sortedItinerariesForList = useMemo(() => {
    return [...itineraries].sort((a, b) => {
      const [ah, am] = a.start_time.split(':').map(Number);
      const [bh, bm] = b.start_time.split(':').map(Number);
      return ah !== bh ? ah - bh : am - bm;
    });
  }, [itineraries]);

  // Date slider component
  const DateSlider = () => {
    if (eventDates.length === 0) return null;

    const currentIndex = eventDates.findIndex(date => 
      date.toDateString() === selectedDate.toDateString()
    );
    
    const canGoPrev = currentIndex > 0;
    const canGoNext = currentIndex < eventDates.length - 1;
    
    const goToPrevDate = () => {
      if (canGoPrev) {
        setSelectedDate(eventDates[currentIndex - 1]);
      }
    };
    
    const goToNextDate = () => {
      if (canGoNext) {
        setSelectedDate(eventDates[currentIndex + 1]);
      }
    };

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '12px 20px',
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        borderRadius: 12,
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        width: '100%',
        minWidth: 0,
      }}>
        {/* Previous Date Button */}
        <button
          onClick={goToPrevDate}
          disabled={!canGoPrev}
          style={{
            width: 28,
            height: 28,
            background: 'none',
            border: 'none',
            borderRadius: 0,
            boxShadow: 'none',
            outline: 'none',
            color: canGoPrev ? (isDark ? '#fff' : '#000') : (isDark ? '#666' : '#ccc'),
            fontSize: 16,
            cursor: canGoPrev ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            marginRight: 4,
          }}
        >
          ←
        </button>

        {/* Current Date Display */}
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: isDark ? '#fff' : '#000',
          minWidth: 80,
          textAlign: 'center',
        }}>
          {selectedDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            weekday: 'short' 
          })}
        </div>

        {/* Next Date Button */}
        <button
          onClick={goToNextDate}
          disabled={!canGoNext}
          style={{
            width: 28,
            height: 28,
            background: 'none',
            border: 'none',
            borderRadius: 0,
            boxShadow: 'none',
            outline: 'none',
            color: canGoNext ? (isDark ? '#fff' : '#000') : (isDark ? '#666' : '#ccc'),
            fontSize: 16,
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            marginLeft: 4,
          }}
        >
          →
        </button>
      </div>
    );
  };

  if (loading) return <div style={{ color: isDark ? '#fff' : '#222', padding: 48 }}>Loading...</div>;

  if (!guests.length) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: isDark ? '#121212' : '#f8f9fa',
        color: isDark ? '#ffffff' : '#000000',
        padding: 48 
      }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ width: 140, fontSize: 16, background: 'none', color: isDark ? '#fff' : '#000', border: '1.5px solid', borderColor: isDark ? '#444' : '#bbb', borderRadius: 8, cursor: 'pointer', padding: '10px 0', fontWeight: 600 }}
        >
          Back
        </button>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginTop: 32, marginBottom: 40, letterSpacing: 1 }}>Event Portal Management</h1>
        <div style={{ textAlign: 'center', marginTop: 100 }}>
          <p style={{ fontSize: 18, color: isDark ? '#aaa' : '#666' }}>
            No guest data available. Please go back and select guests first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: isDark ? '#121212' : '#f8f9fa',
      color: isDark ? '#ffffff' : '#000000',
      padding: '48px 24px'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header - matching other pages */}
        <button 
          onClick={() => navigate(-1)} 
          style={{ width: 140, marginBottom: 32, fontSize: 16, background: 'none', color: isDark ? '#fff' : '#000', border: '1.5px solid', borderColor: isDark ? '#444' : '#bbb', borderRadius: 8, cursor: 'pointer', fontWeight: 600, padding: '10px 0' }}
        >
          Back
        </button>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 40, letterSpacing: 1 }}>Event Portal Management</h1>

        {/* Overview Stats */}
        <div style={getSectionStyles(isDark)}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, borderBottom: `2px solid ${isDark ? '#333' : '#e5e7eb'}`, paddingBottom: 12 }}>
            Event Overview
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: isDark ? '#60a5fa' : '#3b82f6' }}>
                {guests.length}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#aaa' : '#666' }}>
                Total Guests
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: isDark ? '#34d399' : '#10b981' }}>
                {Object.values(guestAssignments).filter((assignments: any) => assignments && assignments.length > 0).length}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#aaa' : '#666' }}>
                Guests with Assignments
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: isDark ? '#f59e0b' : '#d97706' }}>
                {itineraries.length}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#aaa' : '#666' }}>
                Itinerary Items
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: isDark ? '#ec4899' : '#db2777' }}>
                {eventAddOns.length}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#aaa' : '#666' }}>
                Active Add-ons
              </div>
            </div>
          </div>
        </div>

        {/* Launch Event & Preview Timeline - Two Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 48, alignItems: 'stretch' }}>
          {/* Launch Event Section */}
          <div style={{ ...getSectionStyles(isDark), marginBottom: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, borderBottom: `2px solid ${isDark ? '#333' : '#e5e7eb'}`, paddingBottom: 12 }}>
              Launch Event
            </h2>
            <p style={{ fontSize: 16, color: isDark ? '#ccc' : '#666', marginBottom: 0, marginRight: 0 }}>
              Launch your event to begin the timeline. Stage 1 will automatically be picked up if you have added it via the Guests Modules.
            </p>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                style={{
                  borderRadius: 8,
                  padding: '10px 0',
                  width: 140,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.2)' 
                    : '1px solid rgba(0, 0, 0, 0.1)',
                  color: isDark ? '#ffffff' : '#000000',
                }}
              >
                Launch
              </button>
            </div>
          </div>

          {/* Preview Timeline Section */}
          <div style={{ ...getSectionStyles(isDark), display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, borderBottom: `2px solid ${isDark ? '#333' : '#e5e7eb'}`, paddingBottom: 12 }}>
              Preview Timeline
            </h2>
            <p style={{ fontSize: 16, color: isDark ? '#ccc' : '#666', marginBottom: 0, marginRight: 0 }}>
              Preview how the timeline will look, and add messages, updates and more in this user friendly experience builder.
            </p>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                style={{
                  borderRadius: 8,
                  padding: '10px 0',
                  width: 140,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.2)' 
                    : '1px solid rgba(0, 0, 0, 0.1)',
                  color: isDark ? '#ffffff' : '#000000',
                }}
                onClick={() => setShowPreviewModal(true)}
              >
                Preview
              </button>
            </div>
          </div>
        </div>

        {/* Event Information & Placeholder - Two Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 48, alignItems: 'stretch' }}>
          {/* Event Information Section */}
          <div style={{ ...getSectionStyles(isDark), marginBottom: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, borderBottom: `2px solid ${isDark ? '#333' : '#e5e7eb'}`, paddingBottom: 12 }}>
              Event Information
            </h2>
            <p style={{ fontSize: 16, color: isDark ? '#ccc' : '#666', marginBottom: 0, marginRight: 0 }}>
              Create a custom homepage for your guests with all the need to knows about the event.
            </p>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                style={{
                  borderRadius: 8,
                  padding: '10px 0',
                  width: 140,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.2)' 
                    : '1px solid rgba(0, 0, 0, 0.1)',
                  color: isDark ? '#ffffff' : '#000000',
                }}
                onClick={() => navigate('/event-homepage-builder', { state: { eventId } })}
              >
                Create
              </button>
            </div>
          </div>

          {/* Placeholder Section */}
          <div style={{ ...getSectionStyles(isDark), display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, borderBottom: `2px solid ${isDark ? '#333' : '#e5e7eb'}`, paddingBottom: 12 }}>
              Coming Soon
            </h2>
            <p style={{ fontSize: 16, color: isDark ? '#ccc' : '#666', marginBottom: 0, marginRight: 0 }}>
              More powerful features are coming to enhance your event management experience.
            </p>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                style={{
                  borderRadius: 8,
                  padding: '10px 0',
                  width: 140,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'not-allowed',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.1)' 
                    : '1px solid rgba(0, 0, 0, 0.05)',
                  color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                }}
                disabled
              >
                Disabled
              </button>
            </div>
          </div>
        </div>

        {/* Guest Access Management */}
        <div style={getSectionStyles(isDark)}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, borderBottom: `2px solid ${isDark ? '#333' : '#e5e7eb'}`, paddingBottom: 12 }}>
            Generate Guest Accounts
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <p style={{ fontSize: 16, color: isDark ? '#ccc' : '#666', margin: 0 }}>
              Generate temporary login credentials for guests to access their personalized mobile experience.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => guestLogins.length > 0 ? setShowRegenerateModal(true) : setShowGenerateLoginsModal(true)}
                style={{
                  borderRadius: 8,
                  padding: '10px 8px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  width: 100,
                  height: 36,
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.2)' 
                    : '1px solid rgba(0, 0, 0, 0.1)',
                  color: isDark ? '#ffffff' : '#000000',
                }}
              >
                {guestLogins.length > 0 ? 'Regenerate' : 'Generate'}
              </button>
            </div>
          </div>
          
          {guestLogins.length > 0 && (
            <div style={{ 
              borderRadius: 12,
              padding: 20,
              marginBottom: 24
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: isDark ? '#22c55e' : '#16a34a' }}>
                  ✅ Login Credentials Generated
                </h3>
                <button
                  onClick={handleSendAllLogins}
                  style={{
                    borderRadius: 8,
                    padding: '10px 8px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    width: 100,
                    height: 36,
                    background: isDark 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(8px)',
                    border: isDark 
                      ? '1px solid rgba(255, 255, 255, 0.2)' 
                      : '1px solid rgba(0, 0, 0, 0.1)',
                    color: isDark ? '#ffffff' : '#000000',
                  }}
                  disabled={guestLogins.filter(login => login.status === 'pending').length === 0}
                >
                  Send All
                </button>
              </div>
              <p style={{ fontSize: 14, color: isDark ? '#ccc' : '#666', marginBottom: 16 }}>
                {guestLogins.length} login credentials have been generated. You can now copy or send these to your guests.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {guestLogins.map((login) => (
                  <div key={login.id} style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    borderRadius: 8,
                    padding: 10,
                    position: 'relative'
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                      {login.email}
                    </div>
                    <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666', marginBottom: 8 }}>
                      Password: <span style={{ 
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: isDark ? '#22c55e' : '#16a34a',
                        background: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 13
                      }}>
                        {login.temporaryPassword}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666', marginBottom: 8 }}>
                      Status: <span style={{ 
                        color: login.status === 'invite_sent' ? '#22c55e' : 
                               login.status === 'credentials_set' ? '#3b82f6' : 
                               login.status === 'accessed' ? '#10b981' : '#f59e0b'
                      }}>
                        {login.status === 'pending' ? 'Ready to Send' :
                         login.status === 'invite_sent' ? 'Invite Sent' :
                         login.status === 'credentials_set' ? 'Credentials Set' :
                         login.status === 'accessed' ? 'Accessed' : 'Unknown'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        style={{
                          justifyContent: 'center',
                          textAlign: 'center',
                          ...getButtonStyles('secondary', isDark),
                          fontSize: 12,
                          padding: '6px 12px',
                        }}
                        onClick={() => handleCopyLoginDetails(login)}
                      >
                        Copy
                      </button>
                      <button
                        style={{
                          justifyContent: 'center',
                          textAlign: 'center',
                          ...getButtonStyles('primary', isDark),
                          fontSize: 12,
                          padding: '12px 12px',
                          opacity: login.status === 'invite_sent' || login.status === 'credentials_set' || login.status === 'accessed' ? 0.6 : 1,
                        }}
                        onClick={() => handleSendLoginDetails(login)}
                        disabled={login.status === 'invite_sent' || login.status === 'credentials_set' || login.status === 'accessed'}
                      >
                        {login.status === 'invite_sent' ? '✓ Invite Sent' : 
                         login.status === 'credentials_set' ? '✓ Credentials Set' :
                         login.status === 'accessed' ? '✓ Accessed' : 'Send Invite'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Guest Assignments - Collapsible Cards */}
        <div style={getSectionStyles(isDark)}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, borderBottom: `2px solid ${isDark ? '#333' : '#e5e7eb'}`, paddingBottom: 12 }}>
            Guest Assignments
          </h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {guests.map((guest: any) => {
              const assignedItins = (guestAssignments[guest.id] || []).map((itinId: string) =>
                itineraries.find((itin: any) => String(itin.id) === String(itinId))
              ).filter(Boolean);
              const isCollapsed = collapsedCards[guest.id];
              
              return (
                <div key={guest.id} style={{
                  ...getCardStyles(isDark),
                  padding: 0,
                  overflow: 'hidden'
                }}>
                  {/* Card Header - Always Visible */}
                  <div 
                    onClick={() => toggleCardCollapse(guest.id)}
                    style={{
                      padding: 20,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: isCollapsed ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>
                        {`${guest.first_name || ''} ${guest.last_name || ''}`.trim() || guest.email}
                      </div>
                      <div style={{ fontSize: 14, color: isDark ? '#aaa' : '#666' }}>
                        {guest.email} • {assignedItins.length} assignments
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: 20, 
                      transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                      transition: 'transform 0.2s ease'
                    }}>
                      ▼
                    </div>
                  </div>
                  
                  {/* Card Content - Collapsible */}
                  {!isCollapsed && (
                    <div style={{ padding: 20, paddingTop: 0 }}>
                      {/* Assigned Itineraries */}
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: isDark ? '#60a5fa' : '#3b82f6' }}>
                          Assigned Itineraries ({assignedItins.length})
                        </h4>
                        {assignedItins.length > 0 ? (
                          <div style={{ display: 'grid', gap: 8 }}>
                            {assignedItins.map((itin: any) => (
                              <div key={itin.id} style={{
                                padding: 12,
                                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                borderRadius: 8,
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
                              }}>
                                <div style={{ fontWeight: 600, fontSize: 15 }}>{itin.title}</div>
                                {(itin.start_time || itin.end_time) && (
                                  <div style={{ fontSize: 13, color: isDark ? '#aaa' : '#666' }}>
                                    Time: {itin.start_time || 'TBD'} - {itin.end_time || 'TBD'}
                                  </div>
                                )}
                                {itin.date && (
                                  <div style={{ fontSize: 13, color: isDark ? '#aaa' : '#666' }}>
                                    Date: {itin.date}
                                  </div>
                                )}
                                {itin.location && (
                                  <div style={{ fontSize: 13, color: isDark ? '#aaa' : '#666' }}>
                                    Location: {itin.location}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: isDark ? '#666' : '#999', fontSize: 14, fontStyle: 'italic' }}>
                            No itineraries assigned
                          </div>
                        )}
                      </div>
                      {/* Available Add-ons */}
                      {eventAddOns.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: isDark ? '#ec4899' : '#db2777' }}>
                            Available Add-ons ({eventAddOns.length})
                          </h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {eventAddOns.map((addon: any, index: number) => (
                              <span key={addon.id || addon.name || index} style={{
                                padding: '6px 12px',
                                background: isDark ? 'rgba(236,72,153,0.2)' : 'rgba(219,39,119,0.1)',
                                color: isDark ? '#ec4899' : '#db2777',
                                borderRadius: 16,
                                fontSize: 13,
                                fontWeight: 500,
                                border: `1px solid ${isDark ? 'rgba(236,72,153,0.3)' : 'rgba(219,39,119,0.2)'}`
                              }}>
                                {addon.name || addon.type || addon.key || 'Unknown Add-on'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Active Modules for Guest */}
                      {guest.modules && Object.entries(guest.modules).map(([key, isActive]) => (
                        isActive && (
                          <div key={key} style={{ marginTop: 8, color: '#22c55e', fontWeight: 600 }}>
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Module Active
                            {/* Optionally show module values */}
                            {guest.module_values && guest.module_values[key] && (
                              <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                                {JSON.stringify(guest.module_values[key])}
                              </div>
                            )}
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Generate Logins Modal */}
        {showGenerateLoginsModal && (
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
              ...getCardStyles(isDark),
              padding: 32,
              maxWidth: 600,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Generate Guest Logins</h3>
              <p style={{ marginBottom: 24, color: isDark ? '#ccc' : '#666' }}>
                This will create temporary login credentials for the selected guests. Each guest will receive:
              </p>
              <ul style={{ marginBottom: 24, paddingLeft: 20, color: isDark ? '#ccc' : '#666' }}>
                <li>A unique login URL for the mobile app</li>
                <li>A temporary password (8 characters)</li>
                <li>Access to their personalized itinerary and add-ons</li>
              </ul>
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Guest Emails:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={selectedGuestsForGenerate.length === guests.length}
                      onChange={e => setSelectedGuestsForGenerate(e.target.checked ? guests.map(g => g.id) : [])}
                      style={{ marginRight: 8 }}
                    />
                    <span style={{ fontWeight: 600 }}>Select All</span>
                  </label>
                  {guests.map((guest: any) => (
                    <label key={guest.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                      <input
                        type="checkbox"
                        checked={selectedGuestsForGenerate.includes(guest.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedGuestsForGenerate(prev => [...prev, guest.id]);
                          } else {
                            setSelectedGuestsForGenerate(prev => prev.filter(id => id !== guest.id));
                          }
                        }}
                        style={{ marginRight: 8 }}
                      />
                      <span>{guest.email}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={() => setShowGenerateLoginsModal(false)}
                  style={{
                    ...getButtonStyles('secondary', isDark),
                    justifyContent: 'center'
                  }}
                  disabled={isGeneratingLogins}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowGenerateLoginsModal(false);
                    // Only generate logins for selected guests
                    const selected = guests.filter(g => selectedGuestsForGenerate.includes(g.id));
                    await handleGenerateLogins(selected);
                  }}
                  style={{
                    ...getButtonStyles('primary', isDark),
                    justifyContent: 'center'
                  }}
                  disabled={isGeneratingLogins || selectedGuestsForGenerate.length === 0}
                >
                  {isGeneratingLogins ? 'Generating...' : `Generate Logins${selectedGuestsForGenerate.length > 0 ? ` (${selectedGuestsForGenerate.length})` : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Regenerate Logins Modal */}
        {showRegenerateModal && (
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
              ...getCardStyles(isDark),
              padding: 32,
              maxWidth: 600,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Regenerate Guest Logins</h3>
              <p style={{ marginBottom: 24, color: isDark ? '#ccc' : '#666' }}>
                Select the guests you want to regenerate login credentials for. This will create new passwords and reset their access status.
              </p>
              
              <div style={{ marginBottom: 24 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: 16 
                }}>
                  <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Select Guests:</h4>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setSelectedGuestsForRegenerate(guests.map((g: any) => g.id))}
                      style={{
                        padding: '12px 24px',
                        fontSize: 14,
                        background: 'transparent',
                        border: `1px solid ${isDark ? '#666' : '#ccc'}`,
                        borderRadius: 4,
                        color: isDark ? '#ccc' : '#666',
                        cursor: 'pointer',
                        minWidth: 140,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedGuestsForRegenerate([])}
                      style={{
                        padding: '12px 24px',
                        fontSize: 14,
                        background: 'transparent',
                        border: `1px solid ${isDark ? '#666' : '#ccc'}`,
                        borderRadius: 4,
                        color: isDark ? '#ccc' : '#666',
                        cursor: 'pointer',
                        minWidth: 140,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gap: 8 }}>
                  {guests.map((guest: any) => (
                    <label key={guest.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 12,
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      borderRadius: 8,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedGuestsForRegenerate.includes(guest.id)}
                        onChange={() => toggleGuestSelection(guest.id)}
                        style={{
                          marginRight: 12,
                          width: 16,
                          height: 16,
                          cursor: 'pointer'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {`${guest.first_name || ''} ${guest.last_name || ''}`.trim() || guest.email}
                        </div>
                        <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>
                          {guest.email}
                        </div>
                      </div>
                      {guestLogins.find(login => login.id === guest.id)?.status === 'invite_sent' && (
                        <div style={{
                          padding: '2px 6px',
                          background: '#22c55e',
                          color: 'white',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          Invite Sent
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>
              
              
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  style={{
                    ...getButtonStyles('secondary', isDark),
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    minWidth: 140,
                    padding: '12px 24px',
                  }}
                  onClick={() => setShowRegenerateModal(false)}
                  disabled={isGeneratingLogins}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...getButtonStyles('primary', isDark),
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    minWidth: 140,
                    padding: '12px 24px',
                    opacity: selectedGuestsForRegenerate.length === 0 ? 0.6 : 1
                  }}
                  onClick={handleRegenerateLogins}
                  disabled={isGeneratingLogins || selectedGuestsForRegenerate.length === 0}
                >
                  {isGeneratingLogins ? 'Regenerating...' : `Regenerate ${selectedGuestsForRegenerate.length} Login${selectedGuestsForRegenerate.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generating Logins Modal */}
        {isGeneratingLogins && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              ...getCardStyles(isDark),
              padding: 48,
              maxWidth: 400,
              width: '90%',
              textAlign: 'center'
            }}>
              <div style={{
                width: 60,
                height: 60,
                border: `4px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                borderTop: `4px solid ${isDark ? '#ffffff' : '#000000'}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 24px'
              }}></div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
                Generating Logins...
              </h3>
              <p style={{ color: isDark ? '#ccc' : '#666', margin: 0 }}>
                Creating temporary credentials for {guests.length} guests
              </p>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              ...getCardStyles(isDark),
              padding: 48,
              maxWidth: 500,
              width: '90%',
              textAlign: 'center'
            }}>
              <div style={{
                width: 80,
                height: 80,
                background: '#22c55e',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                animation: 'successPulse 0.6s ease-out'
              }}>
                <div style={{
                  fontSize: 40,
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  ✓
                </div>
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: '#22c55e' }}>
                Success!
              </h3>
              <p style={{ color: isDark ? '#ccc' : '#666', marginBottom: 32, fontSize: 16 }}>
                {guestLogins.length} login credentials have been generated successfully. 
                You can now manage and send them to your guests.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  ...getButtonStyles('primary', isDark),
                  margin: '0 auto',
                  display: 'block',
                  padding: '12px 32px',
                  textAlign: 'center',
                  minWidth: 'auto',
                  width: 'auto'
                }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100vw',
            height: '100vh',
          }}>
            {/* Close (X) Button - Top Right */}
            <button
              onClick={() => setShowPreviewModal(false)}
              style={{
                position: 'absolute',
                top: 32,
                right: 40,
                zIndex: 2100,
                background: isDark ? 'rgba(36,36,40,0.85)' : 'rgba(255,255,255,0.95)',
                color: isDark ? '#fff' : '#222',
                border: isDark ? '1.5px solid #222' : '1.5px solid #eee',
                borderRadius: '50%',
                width: 44,
                height: 44,
                fontSize: 26,
                fontWeight: 700,
                boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
                outline: 'none',
              }}
              aria-label="Close Preview Timeline"
            >
              ×
            </button>

            {/* Update Timeline Button - Center Top */}
            <button
              style={{
                position: 'absolute',
                top: 32,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1001,
                background: isDark ? 'rgba(36,36,40,0.7)' : 'rgba(255,255,255,0.7)',
                color: isDark ? '#fff' : '#222',
                border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid rgba(0,0,0,0.08)',
                borderRadius: 16,
                padding: '10px 0',
                fontWeight: 700,
                fontSize: 15,
                boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.08)',
                backdropFilter: 'blur(12px)',
                cursor: 'pointer',
                transition: 'background 0.2s',
                minWidth: 0,
                letterSpacing: 0.2,
                width: 140,
              }}
              onClick={() => {/* TODO: implement update timeline logic */}}
            >
              Update Timeline
            </button>

            {/* Timeline Controller: draggable container for date picker and navigation arrows */}
            <DraggableTimelineController isDark={isDark} DateSlider={DateSlider} handleTimelinePrevious={handleTimelinePrevious} handleTimelineNext={handleTimelineNext} />

            {/* Draggable Modules - Only show when Preview Timeline modal is open */}
            {showPreviewModal && (
              <div style={{
                position: 'absolute',
                right: 48,
                top: 100,
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                minWidth: 220,
              }}>
                {/* Title and subtitle above modules */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: isDark ? '#fff' : '#222', letterSpacing: 0.5 }}>Modules</div>
                  <div style={{ fontSize: 13, color: isDark ? '#aaa' : '#666', fontWeight: 500, marginTop: 2 }}>Drag the modules onto the mobile to create.</div>
                </div>
                {/* Draggable Module Buttons (restored) */}
                {/* Question Field Module */}
                <div
                  draggable
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(36,36,40,0.08)',
                    border: `2px dashed ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(36,36,40,0.18)'}`,
                    borderRadius: 18,
                    padding: '20px 28px',
                    minWidth: 160,
                    fontWeight: 700,
                    fontSize: 15,
                    color: isDark ? '#fff' : '#222',
                    boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.10)' : '0 2px 8px rgba(36,36,40,0.08)',
                    cursor: 'grab',
                    userSelect: 'none',
                    textAlign: 'center',
                    marginBottom: 8,
                    backdropFilter: 'blur(8px)',
                  }}
                  onDragStart={e => {
                    e.dataTransfer.setData('moduleType', 'question');
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    + Question
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 400 }}>
                    Drag to phone to ask guests
                  </div>
                </div>
                {/* Feedback Module */}
                <div
                  draggable
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(36,36,40,0.08)',
                    border: `2px dashed ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(36,36,40,0.18)'}`,
                    borderRadius: 18,
                    padding: '20px 28px',
                    minWidth: 160,
                    fontWeight: 700,
                    fontSize: 15,
                    color: isDark ? '#fff' : '#222',
                    boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.10)' : '0 2px 8px rgba(36,36,40,0.08)',
                    cursor: 'grab',
                    userSelect: 'none',
                    textAlign: 'center',
                    marginBottom: 8,
                    backdropFilter: 'blur(8px)',
                  }}
                  onDragStart={e => {
                    e.dataTransfer.setData('moduleType', 'feedback');
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    + Feedback Module
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 400 }}>
                    Drag to phone for ratings
                  </div>
                </div>
                {/* Multiple Choice Module */}
                <div
                  draggable
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(36,36,40,0.08)',
                    border: `2px dashed ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(36,36,40,0.18)'}`,
                    borderRadius: 18,
                    padding: '20px 28px',
                    minWidth: 160,
                    fontWeight: 700,
                    fontSize: 15,
                    color: isDark ? '#fff' : '#222',
                    boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.10)' : '0 2px 8px rgba(36,36,40,0.08)',
                    cursor: 'grab',
                    userSelect: 'none',
                    textAlign: 'center',
                    marginBottom: 8,
                    backdropFilter: 'blur(8px)',
                  }}
                  onDragStart={e => {
                    e.dataTransfer.setData('moduleType', 'multiple-choice');
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    + Multiple Choice Module
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 400 }}>
                    Drag to phone for polls
                  </div>
                </div>
                {/* Photo/Video Module */}
                <div
                  draggable
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(36,36,40,0.08)',
                    border: `2px dashed ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(36,36,40,0.18)'}`,
                    borderRadius: 18,
                    padding: '20px 28px',
                    minWidth: 160,
                    fontWeight: 700,
                    fontSize: 15,
                    color: isDark ? '#fff' : '#222',
                    boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.10)' : '0 2px 8px rgba(36,36,40,0.08)',
                    cursor: 'grab',
                    userSelect: 'none',
                    textAlign: 'center',
                    marginBottom: 8,
                    backdropFilter: 'blur(8px)',
                  }}
                  onDragStart={e => {
                    e.dataTransfer.setData('moduleType', 'photo-video');
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    + Photo/Video Module
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 400 }}>
                    Drag to phone for media
                  </div>
                </div>
              </div>
            )}

            {/* View Modules button at bottom right of Preview Modal (fixed width and style) */}
            <button
              style={{
                position: 'fixed',
                right: 48,
                bottom: 48,
                zIndex: 3000,
                background: isDark ? 'rgba(36,36,40,0.85)' : 'rgba(255,255,255,0.95)',
                color: isDark ? '#fff' : '#222',
                border: isDark ? '1.5px solid #222' : '1.5px solid #eee',
                borderRadius: 16,
                padding: '10px 0',
                fontWeight: 700,
                fontSize: 15,
                boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                letterSpacing: 0.2,
                transition: 'background 0.2s',
                width: 140,
                textAlign: 'center',
              }}
              onClick={() => alert('View Modules clicked!')}
            >
              View Modules
            </button>

            {/* Center: iPhone Mockup, dead center */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 'calc(50% + 10px)', // push down 10px
                transform: 'translate(-50%, -50%)',
                zIndex: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
              }}
              onDragOver={e => {
                e.preventDefault();
              }}
              onDrop={e => {
                const moduleType = e.dataTransfer.getData('moduleType');
                if (moduleType === 'question') {
                  // Use selectedDate as drop time
                  handleShowQuestionModal(selectedDate);
                } else if (moduleType === 'feedback') {
                  setFeedbackModalTime(selectedDate);
                  setShowFeedbackModal(true);
                } else if (moduleType === 'multiple-choice') {
                  setShowMultipleChoiceModal(true);
                } else if (moduleType === 'photo-video') {
                  setShowPhotoVideoModal(true);
                }
              }}
            >
              <div style={{
                width: 340,
                height: 700,
                borderRadius: 40,
                background: isDark ? '#18181b' : '#fff',
                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                border: isDark ? '4px solid #222' : '4px solid #eee',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}>
                {/* Timeline Container - Full Screen */}
                <TimelinePreview 
                  itineraries={itineraries} 
                  isDark={isDark}
                  eventId={eventId}
                  selectedDate={selectedDate}
                  ref={timelineRef}
                />
              </div>
            </div>
          </div>
        )}

        {/* Question Field Modal */}
        {showQuestionModal && (
          <QuestionModal
            open={showQuestionModal}
            onClose={() => setShowQuestionModal(false)}
            onNext={(data: any) => {
              setShowQuestionModal(false);
              // TODO: handle saving the question (call supabase, refresh timeline, etc.)
            }}
            guests={guests}
          />
        )}

        {/* Confirmation Message */}
        {showConfirmation && (
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
            padding: '18px 32px',
            fontWeight: 700,
            fontSize: 18,
            color: isDark ? '#fff' : '#222',
            textAlign: 'center',
          }}>
            {confirmationMessage}
          </div>
        )}

        {/* Feedback Guest Selection Modal */}
        {feedbackStep2 && (
          <FeedbackGuestSelectionModal
            open={!!feedbackStep2}
            onClose={() => setFeedbackStep2(null)}
            guests={guests}
            onSave={(selectedGuests: string[]) => {
              // --- SUPABASE: Insert feedback module with guest assignments
              // Table: timeline_modules, Fields: event_id, module_type: 'feedback', time, title, default_rating, assigned_guests
              // Use Supabase function 'add_timeline_module'
              // TODO: Implement Supabase save logic here
              setFeedbackStep2(null);
              // TODO: refresh modules after save
            }}
            moduleData={feedbackStep2}
          />
        )}

        {showFeedbackModal && (
          <FeedbackModuleModal
            open={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
            onNext={(data: { title: string; defaultRating: number }) => {
              setShowFeedbackModal(false);
              setFeedbackStep2({
                title: data.title,
                defaultRating: data.defaultRating,
                time: feedbackModalTime,
              });
            }}
            guests={guests}
          />
        )}

        {showMultipleChoiceModal && (
          <MultipleChoiceModuleModal
            open={showMultipleChoiceModal}
            onClose={() => setShowMultipleChoiceModal(false)}
            onNext={(data: any) => {
              setShowMultipleChoiceModal(false);
              // TODO: handle step 2 for multiple choice
            }}
            guests={guests}
          />
        )}

        {showPhotoVideoModal && (
          <PhotoVideoModuleModal
            open={showPhotoVideoModal}
            onClose={() => setShowPhotoVideoModal(false)}
            onNext={(data: any) => {
              setShowPhotoVideoModal(false);
              // TODO: handle step 2 for photo/video
            }}
            guests={guests}
          />
        )}

        {/* 2. Timeline Controller: draggable container for date picker and navigation arrows */}
        {/* Find the date picker and navigation arrows, and wrap them in a new absolutely positioned, draggable container called Timeline Controller. Do not change their logic or handlers. */}

        {showCopyToast && (
          <div style={{
            position: 'fixed',
            top: 24,
            right: 24,
            background: 'rgba(40,40,40,0.95)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 16,
            zIndex: 2000,
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)'
          }}>
            Copied to clipboard!
          </div>
        )}

        {customModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000
          }}>
            <div style={{
              background: isDark ? '#222' : '#fff',
              color: isDark ? '#fff' : '#222',
              borderRadius: 16,
              padding: 40,
              maxWidth: 400,
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
            }}>
              <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>{customModal.title}</h3>
              <p style={{ fontSize: 16, marginBottom: 28 }}>{customModal.message}</p>
              <button
                onClick={() => {
                  setCustomModal(null);
                  if (customModal.onClose) customModal.onClose();
                }}
                style={{
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  background: isDark ? '#444' : '#eee',
                  color: isDark ? '#fff' : '#222',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: 12
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Add this component above the main export
function DraggableTimelineController({ isDark, DateSlider, handleTimelinePrevious, handleTimelineNext }: { isDark: boolean, DateSlider: React.FC, handleTimelinePrevious: () => void, handleTimelineNext: () => void }) {
  // Start position on the left side (negative x to move left from center)
  const [position, setPosition] = React.useState({ x: -400, y: 0 });
  const dragging = React.useRef(false);
  const dragStart = React.useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Only allow drag when handle is pressed
  const onHandleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
    document.body.style.userSelect = 'none';
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.mouseX;
    const dy = e.clientY - dragStart.current.mouseY;
    setPosition({
      x: dragStart.current.startX + dx,
      y: dragStart.current.startY + dy,
    });
  };
  const onMouseUp = () => {
    dragging.current = false;
    document.body.style.userSelect = '';
  };
  React.useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [position]);
  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 90 + position.y,
        left: `calc(50% + ${position.x}px)`,
        transform: 'translateX(-50%)',
        zIndex: 1002,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: isDark ? 'rgba(36,36,40,0.85)' : 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.08)',
        border: isDark ? '1.5px solid #222' : '1.5px solid #eee',
        padding: 12,
        minWidth: 180,
        userSelect: 'none',
      }}
    >
      {/* Grab handle */}
      <div
        onMouseDown={onHandleMouseDown}
        style={{
          width: 48,
          height: 10,
          borderRadius: 5,
          background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(36,36,40,0.18)',
          marginBottom: 10,
          cursor: 'grab',
          alignSelf: 'center',
        }}
        title="Drag to move"
      />
      <DateSlider />
      <div style={{ display: 'flex', flexDirection: 'row', gap: 16, marginTop: 12 }}>
        <button
          onClick={handleTimelinePrevious}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
            background: isDark 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            color: isDark ? '#fff' : '#000',
            fontSize: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: isDark 
              ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
              : '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          ↑
        </button>
        <button
          onClick={handleTimelineNext}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
            background: isDark 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            color: isDark ? '#fff' : '#000',
            fontSize: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: isDark 
              ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
              : '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          ↓
        </button>
      </div>
    </div>
  );
}

