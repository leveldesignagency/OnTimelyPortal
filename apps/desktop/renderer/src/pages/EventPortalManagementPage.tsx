import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import TimelinePreview from '../components/TimelinePreview';
import { supabase } from '../lib/supabase';

interface GuestLogin {
  id: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  status: 'pending' | 'sent' | 'accessed';
}

export default function EventPortalManagementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const timelineRef = useRef<any>(null);
  
  // Get data from navigation state
  const { 
    guestAssignments = {}, 
    guests = [], 
    itineraries = [], 
    eventAddOns = [],
    eventId 
  } = location.state || {};

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

  // Initialize collapsed cards when guests change
  useEffect(() => {
    const collapsed: {[guestId: string]: boolean} = {};
    guests.forEach((guest: any) => {
      collapsed[guest.id] = true; // Default all cards to collapsed
    });
    setCollapsedCards(collapsed);
  }, [guests]);

  // Load existing guest logins from database
  useEffect(() => {
    // Only run if eventId is available
    if (!eventId) return;

    async function loadExistingGuestLogins() {
      try {
        console.log('Loading existing guest logins for event:', eventId);
        
        // Call the backend function to get all guest logins for this event
        const { data, error } = await supabase.rpc('get_guest_login_status', {
          p_event_id: eventId,
        });

        if (error) {
          console.error('Error loading guest logins:', error);
          return;
        }

        if (data && Array.isArray(data) && data.length > 0) {
          console.log('Found existing guest logins:', data);
          
          // Map the backend data to your GuestLogin type
          const existingLogins = data.map((row: any) => ({
            id: row.guest_id,
            email: row.email,
            temporaryPassword: row.password,
            loginUrl: `timely://guest-login?email=${row.email}&password=${row.password}`,
            status: row.status as 'pending' | 'sent' | 'accessed',
          }));
          
          setGuestLogins(existingLogins);
          console.log('Loaded guest logins into UI:', existingLogins);
        } else {
          console.log('No existing guest logins found for this event');
        }
      } catch (error) {
        console.error('Error loading guest logins:', error);
      }
    }

    loadExistingGuestLogins();
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

  // Generate logins for all guests
  const handleGenerateLogins = async () => {
    setIsGeneratingLogins(true);
    setShowGenerateLoginsModal(false); // Close the initial modal
    
    try {
      // First, check if we have guests
      if (!guests || guests.length === 0) {
        throw new Error('No guests found for this event');
      }

      console.log('Generating logins for guests:', guests);

      // Use the database function to create guest logins
      const newLogins: GuestLogin[] = [];
      
      for (const guest of guests) {
        console.log(`Creating login for guest: ${guest.email} (ID: ${guest.id})`);
        
        // Call the database function to create guest login
        const { data, error } = await supabase.rpc('create_guest_login', {
          p_guest_id: guest.id,
          p_event_id: eventId,
          p_email: guest.email
        });

        if (error) {
          console.error(`Error creating login for ${guest.email}:`, error);
          throw new Error(`Failed to create login for ${guest.email}: ${error.message}`);
        }

        if (!data || data.length === 0) {
          throw new Error(`No login data returned for ${guest.email}`);
        }

        // The function returns a single row with the login details
        const loginData = data[0];
        
        newLogins.push({
          id: guest.id,
          email: loginData.email,
          temporaryPassword: loginData.password,
          loginUrl: loginData.login_url,
          status: 'pending' as const
        });
      }
      
      setGuestLogins(newLogins);
      setIsGeneratingLogins(false);
      setShowSuccessModal(true);
      
      console.log('Successfully created guest logins:', newLogins);
    } catch (error) {
      console.error('Failed to generate guest logins:', error);
      setIsGeneratingLogins(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to generate guest logins: ${errorMessage}`);
    }
  };

  // Regenerate logins for selected guests
  const handleRegenerateLogins = async () => {
    if (selectedGuestsForRegenerate.length === 0) return;
    
    setIsGeneratingLogins(true);
    setShowRegenerateModal(false);
    
    try {
      // Get selected guests
      const selectedGuests = guests.filter((guest: any) => 
        selectedGuestsForRegenerate.includes(guest.id)
      );

      console.log('Regenerating logins for guests:', selectedGuests);

      // Use the database function to create new guest logins
      const updatedLogins: GuestLogin[] = [];
      
      for (const guest of selectedGuests) {
        console.log(`Regenerating login for guest: ${guest.email} (ID: ${guest.id})`);
        
        // Call the database function to create new guest login
        const { data, error } = await supabase.rpc('create_guest_login', {
          p_guest_id: guest.id,
          p_event_id: eventId,
          p_email: guest.email
        });

        if (error) {
          console.error(`Error regenerating login for ${guest.email}:`, error);
          throw new Error(`Failed to regenerate login for ${guest.email}: ${error.message}`);
        }

        if (!data || data.length === 0) {
          throw new Error(`No login data returned for ${guest.email}`);
        }

        // The function returns a single row with the login details
        const loginData = data[0];
        
        updatedLogins.push({
          id: guest.id,
          email: loginData.email,
          temporaryPassword: loginData.password,
          loginUrl: loginData.login_url,
          status: 'pending' as const
        });
      }
      
      // Update existing logins with new ones
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
      setShowSuccessModal(true);
      setSelectedGuestsForRegenerate([]);
      
      console.log('Successfully regenerated guest logins:', updatedLogins);
    } catch (error) {
      console.error('Failed to regenerate guest logins:', error);
      setIsGeneratingLogins(false);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to regenerate guest logins: ${errorMessage}`);
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
    const details = `Login Details for ${login.email}:\nURL: ${login.loginUrl}\nPassword: ${login.temporaryPassword}`;
    navigator.clipboard.writeText(details);
  };

  // Send login details via email (placeholder)
  const handleSendLoginDetails = async (login: GuestLogin) => {
    // TODO: Implement actual email sending
    console.log('Sending login details to:', login.email);
    
    // Update status to sent
    setGuestLogins(prev => prev.map(l => 
      l.id === login.id ? { ...l, status: 'sent' } : l
    ));
  };

  // Send all login details
  const handleSendAllLogins = async () => {
    // Send to all guests who haven't been sent yet
    const pendingLogins = guestLogins.filter(login => login.status === 'pending');
    
    for (const login of pendingLogins) {
      await handleSendLoginDetails(login);
    }
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

        {/* Guest Access Management */}
        <div style={getSectionStyles(isDark)}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, borderBottom: `2px solid ${isDark ? '#333' : '#e5e7eb'}`, paddingBottom: 12 }}>
            Generate Guest Accounts
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <p style={{ fontSize: 16, color: isDark ? '#ccc' : '#666', margin: 0 }}>
              Generate temporary login credentials for guests to access their personalized mobile experience.
            </p>
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
                  📧 Send All
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
                    padding: 16
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                      {login.email}
                    </div>
                    <div style={{ fontSize: 12, color: isDark ? '#aaa' : '#666', marginBottom: 8 }}>
                      Password: <code style={{ background: isDark ? '#333' : '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
                        {login.temporaryPassword}
                      </code>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => handleCopyLoginDetails(login)}
                        style={{
                          ...getButtonStyles('secondary', isDark),
                          fontSize: 12,
                          padding: '6px 12px',
                        }}
                      >
                        📋 Copy
                      </button>
                      <button
                        onClick={() => handleSendLoginDetails(login)}
                        disabled={login.status === 'sent'}
                        style={{
                          ...getButtonStyles('primary', isDark),
                          fontSize: 12,
                          padding: '6px 12px',
                          opacity: login.status === 'sent' ? 0.6 : 1,
                        }}
                      >
                        {login.status === 'sent' ? '✓ Sent' : '📧 Send'}
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
                itineraries.find((itin: any) => itin.id === itinId)
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
                This will create temporary login credentials for all {guests.length} guests. Each guest will receive:
              </p>
              <ul style={{ marginBottom: 24, paddingLeft: 20, color: isDark ? '#ccc' : '#666' }}>
                <li>A unique login URL for the mobile app</li>
                <li>A temporary password (8 characters)</li>
                <li>Access to their personalized itinerary and add-ons</li>
              </ul>
              
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Guest Emails:</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {guests.map((guest: any) => (
                    <span key={guest.id} style={{
                      padding: '4px 8px',
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      borderRadius: 4,
                      fontSize: 13
                    }}>
                      {guest.email}
                    </span>
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
                  onClick={handleGenerateLogins}
                  style={{
                    ...getButtonStyles('primary', isDark),
                    justifyContent: 'center'
                  }}
                  disabled={isGeneratingLogins}
                >
                  {isGeneratingLogins ? 'Generating...' : 'Generate Logins'}
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
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setSelectedGuestsForRegenerate(guests.map((g: any) => g.id))}
                      style={{
                        padding: '4px 8px',
                        fontSize: 12,
                        background: 'transparent',
                        border: `1px solid ${isDark ? '#666' : '#ccc'}`,
                        borderRadius: 4,
                        color: isDark ? '#ccc' : '#666',
                        cursor: 'pointer'
                      }}
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedGuestsForRegenerate([])}
                      style={{
                        padding: '4px 8px',
                        fontSize: 12,
                        background: 'transparent',
                        border: `1px solid ${isDark ? '#666' : '#ccc'}`,
                        borderRadius: 4,
                        color: isDark ? '#ccc' : '#666',
                        cursor: 'pointer'
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
                      {guestLogins.find(login => login.id === guest.id)?.status === 'sent' && (
                        <div style={{
                          padding: '2px 6px',
                          background: '#22c55e',
                          color: 'white',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          Sent
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setShowRegenerateModal(false);
                    setSelectedGuestsForRegenerate([]);
                  }}
                  style={{
                    ...getButtonStyles('secondary', isDark),
                    justifyContent: 'center'
                  }}
                  disabled={isGeneratingLogins}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegenerateLogins}
                  style={{
                    ...getButtonStyles('primary', isDark),
                    justifyContent: 'center',
                    opacity: selectedGuestsForRegenerate.length === 0 ? 0.6 : 1
                  }}
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

            {/* Draggable Modules - Each in its own container */}
            <div style={{
              position: 'absolute',
              right: 48,
              top: 100,
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}>
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
                + Question Field
              </div>
            </div>

            {/* Itinerary List - Left side, in a container */}
            <div style={{
              position: 'absolute',
              left: 48,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 260,
              minHeight: 400,
              maxHeight: 600,
              background: isDark ? 'rgba(24,24,27,0.95)' : 'rgba(255,255,255,0.95)',
              borderRadius: 24,
              boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
              border: isDark ? '1.5px solid #222' : '1.5px solid #eee',
              padding: 24,
              overflowY: 'auto',
              zIndex: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: isDark ? '#fff' : '#222', letterSpacing: 0.5 }}>
                Itinerary Items
              </div>
              {sortedItinerariesForList.map((itin: any, index: number) => (
                <div key={itin.id} style={{
                  borderRadius: 12,
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  padding: '12px 14px',
                  marginBottom: 4,
                  fontSize: 15,
                  fontWeight: 600,
                  color: isDark ? '#fff' : '#222',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
                onClick={() => {
                  if (timelineRef.current && timelineRef.current.goToItem) {
                    timelineRef.current.goToItem(index);
                  }
                }}
                >
                  <span>{itin.title}</span>
                  <span style={{ fontSize: 12, color: isDark ? '#aaa' : '#666', fontWeight: 400 }}>
                    {itin.start_time} - {itin.end_time} {itin.location ? `• ${itin.location}` : ''}
                  </span>
                </div>
              ))}
            </div>

            {/* Center: iPhone Mockup, dead center */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onDragOver={e => {
                e.preventDefault();
              }}
              onDrop={e => {
                const moduleType = e.dataTransfer.getData('moduleType');
                if (moduleType === 'question') {
                  // Use current time as drop time for now
                  handleShowQuestionModal(new Date());
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
                  ref={timelineRef}
                  itineraries={itineraries} 
                  isDark={isDark}
                  eventId={eventId}
                />
              </div>
            </div>

            {/* Timeline Navigation Controls - Right of iPhone */}
            <div style={{
              position: 'absolute',
              left: 'calc(50% + 200px)', // 10px right of iPhone (iPhone width 340px / 2 + 10px)
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              zIndex: 3,
            }}>
              {/* Previous Button */}
              <button
                onClick={handleTimelinePrevious}
                style={{
                  width: 50,
                  height: 50,
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)';
                }}
              >
                ↑
              </button>

              {/* Next Button */}
              <button
                onClick={handleTimelineNext}
                style={{
                  width: 50,
                  height: 50,
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)';
                }}
              >
                ↓
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowPreviewModal(false)}
              style={{
                position: 'absolute',
                top: 24,
                right: 32,
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                border: 'none',
                borderRadius: 24,
                width: 40,
                height: 40,
                fontSize: 22,
                cursor: 'pointer',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>

            {/* Question Field Modal */}
            {showQuestionModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.25)',
                zIndex: 3000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  background: isDark ? 'rgba(36,36,40,0.85)' : 'rgba(255,255,255,0.85)',
                  borderRadius: 24,
                  boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.10)',
                  border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
                  backdropFilter: 'blur(16px)',
                  padding: '40px 32px 32px 32px',
                  minWidth: 340,
                  maxWidth: 400,
                  width: '90vw',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}>
                  {/* Close Modal */}
                  <button
                    onClick={() => setShowQuestionModal(false)}
                    style={{
                      position: 'absolute',
                      top: 18,
                      right: 18,
                      background: 'none',
                      border: 'none',
                      color: isDark ? '#fff' : '#222',
                      fontSize: 22,
                      cursor: 'pointer',
                      borderRadius: 16,
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(36,36,40,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    ×
                  </button>
                  {questionStep === 1 && (
                    <>
                      <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 18, color: isDark ? '#fff' : '#222', letterSpacing: 0.2, textAlign: 'center' }}>
                        What question do you want to ask your guests?
                      </div>
                      <textarea
                        value={questionText}
                        onChange={e => setQuestionText(e.target.value.slice(0, 1000))}
                        maxLength={1000}
                        placeholder="Type your question here..."
                        style={{
                          width: '100%',
                          minHeight: 90,
                          maxHeight: 180,
                          borderRadius: 14,
                          border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
                          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(36,36,40,0.04)',
                          color: isDark ? '#fff' : '#222',
                          fontSize: 16,
                          padding: '14px 16px',
                          marginBottom: 16,
                          resize: 'vertical',
                          outline: 'none',
                          boxShadow: 'none',
                          fontWeight: 500,
                          letterSpacing: 0.1,
                        }}
                      />
                      <div style={{ width: '100%', textAlign: 'right', fontSize: 12, color: isDark ? '#aaa' : '#666', marginBottom: 18 }}>
                        {questionText.length}/1000
                      </div>
                      <button
                        style={{
                          width: '100%',
                          padding: '12px 0',
                          borderRadius: 14,
                          background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(36,36,40,0.10)',
                          color: isDark ? '#fff' : '#222',
                          fontWeight: 700,
                          fontSize: 16,
                          border: 'none',
                          cursor: questionText.trim().length === 0 ? 'not-allowed' : 'pointer',
                          opacity: questionText.trim().length === 0 ? 0.5 : 1,
                          marginTop: 4,
                          marginBottom: 2,
                          transition: 'background 0.2s',
                        }}
                        disabled={questionText.trim().length === 0}
                        onClick={() => setQuestionStep(2)}
                      >
                        Next
                      </button>
                    </>
                  )}
                  {questionStep === 2 && (
                    <>
                      <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 18, color: isDark ? '#fff' : '#222', letterSpacing: 0.2, textAlign: 'center' }}>
                        When should this question show?
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 18, width: '100%' }}>
                        <button
                          style={{
                            flex: 1,
                            padding: '12px 0',
                            borderRadius: 12,
                            background: questionTimeMode === 'now' ? (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(36,36,40,0.18)') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(36,36,40,0.08)'),
                            color: isDark ? '#fff' : '#222',
                            fontWeight: 700,
                            fontSize: 15,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onClick={() => setQuestionTimeMode('now')}
                        >
                          Now
                        </button>
                        <button
                          style={{
                            flex: 1,
                            padding: '12px 0',
                            borderRadius: 12,
                            background: questionTimeMode === 'later' ? (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(36,36,40,0.18)') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(36,36,40,0.08)'),
                            color: isDark ? '#fff' : '#222',
                            fontWeight: 700,
                            fontSize: 15,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onClick={() => setQuestionTimeMode('later')}
                        >
                          Later
                        </button>
                      </div>
                      {questionTimeMode === 'later' && (
                        <div style={{ width: '100%', marginBottom: 18, display: 'flex', gap: 12, justifyContent: 'center' }}>
                          {/* Custom time picker: hour and minute columns */}
                          <div style={{ flex: 1, display: 'flex', gap: 8, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(36,36,40,0.04)', borderRadius: 12, border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)', padding: '8px 0', justifyContent: 'center' }}>
                            {/* Hour column */}
                            <div style={{ flex: 1, maxHeight: 120, overflowY: 'auto', textAlign: 'center' }}>
                              {Array.from({ length: 24 }).map((_, h) => (
                                <div
                                  key={h}
                                  style={{
                                    padding: '6px 0',
                                    fontWeight: questionTime.split(':')[0] === String(h).padStart(2, '0') ? 700 : 500,
                                    color: isDark ? '#fff' : '#222',
                                    background: questionTime.split(':')[0] === String(h).padStart(2, '0') ? (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(36,36,40,0.10)') : 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    fontSize: 16,
                                  }}
                                  onClick={() => setQuestionTime(String(h).padStart(2, '0') + ':' + (questionTime.split(':')[1] || '00'))}
                                >
                                  {String(h).padStart(2, '0')}
                                </div>
                              ))}
                            </div>
                            <div style={{ width: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(36,36,40,0.08)' }} />
                            {/* Minute column */}
                            <div style={{ flex: 1, maxHeight: 120, overflowY: 'auto', textAlign: 'center' }}>
                              {Array.from({ length: 60 }).map((_, m) => (
                                <div
                                  key={m}
                                  style={{
                                    padding: '6px 0',
                                    fontWeight: questionTime.split(':')[1] === String(m).padStart(2, '0') ? 700 : 500,
                                    color: isDark ? '#fff' : '#222',
                                    background: questionTime.split(':')[1] === String(m).padStart(2, '0') ? (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(36,36,40,0.10)') : 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    fontSize: 16,
                                  }}
                                  onClick={() => setQuestionTime((questionTime.split(':')[0] || '00') + ':' + String(m).padStart(2, '0'))}
                                >
                                  {String(m).padStart(2, '0')}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                        <button
                          style={{
                            flex: 1,
                            padding: '12px 0',
                            borderRadius: 12,
                            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(36,36,40,0.08)',
                            color: isDark ? '#fff' : '#222',
                            fontWeight: 700,
                            fontSize: 15,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onClick={() => setQuestionStep(1)}
                        >
                          Back
                        </button>
                        <button
                          style={{
                            flex: 2,
                            padding: '12px 0',
                            borderRadius: 12,
                            background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(36,36,40,0.18)',
                            color: isDark ? '#fff' : '#222',
                            fontWeight: 700,
                            fontSize: 15,
                            border: 'none',
                            cursor: (questionTimeMode === 'later' && !questionTime) ? 'not-allowed' : 'pointer',
                            opacity: (questionTimeMode === 'later' && !questionTime) ? 0.5 : 1,
                            transition: 'background 0.2s',
                          }}
                          disabled={questionTimeMode === 'later' && !questionTime}
                          onClick={async () => {
                            // Add to database instead of localStorage
                            if (!eventId) {
                              console.error('No eventId available');
                              return;
                            }

                            try {
                              const time = questionTimeMode === 'now' && questionDropTime
                                ? `${questionDropTime.getHours().toString().padStart(2, '0')}:${questionDropTime.getMinutes().toString().padStart(2, '0')}`
                                : questionTime;

                              const { data, error } = await supabase.rpc('add_timeline_module', {
                                p_event_id: eventId,
                                p_module_type: 'question',
                                p_time: time,
                                p_question: questionText
                              });

                              if (error) {
                                console.error('Error adding question module:', error);
                                setConfirmationMessage('Error adding question!');
                              } else {
                                console.log('Question module added successfully:', data);
                                setConfirmationMessage('Question added to timeline!');
                                
                                // Trigger refresh of timeline modules
                                window.dispatchEvent(new CustomEvent('refreshTimelineModules'));
                              }

                              setShowQuestionModal(false);
                              setShowConfirmation(true);
                              setTimeout(() => setShowConfirmation(false), 2000);
                            } catch (error) {
                              console.error('Error adding question module:', error);
                              setConfirmationMessage('Error adding question!');
                              setShowQuestionModal(false);
                              setShowConfirmation(true);
                              setTimeout(() => setShowConfirmation(false), 2000);
                            }
                          }}
                        >
                          Add to Timeline
                        </button>
                      </div>
                    </>
                  )}
                  {/* Add border to all modal buttons */}
                  <style>{`
                    .modal-btn {
                      border: 1.5px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(36,36,40,0.18)'} !important;
                    }
                  `}</style>
                </div>
              </div>
            )}

            {/* Question Field Popup on Timeline - Commented out for now, needs proper state management for database */}
            {false && (() => {
              // Check if a question module should be shown now
              const modules = JSON.parse(localStorage.getItem('timelineModules') || '[]');
              const now = new Date();
              const nowStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
              const activeModule = modules.find((m: any) => m.type === 'question' && m.time === nowStr);
              if (activeModule) {
                return (
                  <div style={{
                    position: 'fixed',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 4000,
                    background: isDark ? 'rgba(36,36,40,0.92)' : 'rgba(255,255,255,0.92)',
                    borderRadius: 24,
                    boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.10)',
                    border: isDark ? '1.5px solid rgba(255,255,255,0.10)' : '1.5px solid rgba(0,0,0,0.08)',
                    backdropFilter: 'blur(16px)',
                    padding: '40px 32px 32px 32px',
                    minWidth: 340,
                    maxWidth: 400,
                    width: '90vw',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 18, color: isDark ? '#fff' : '#222', letterSpacing: 0.2, textAlign: 'center' }}>
                      {activeModule.question}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

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
          </div>
        )}
      </div>
    </div>
  );
}