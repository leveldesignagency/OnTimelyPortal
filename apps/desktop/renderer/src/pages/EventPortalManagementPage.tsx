import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';

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

  // Initialize collapsed cards when guests change
  useEffect(() => {
    const collapsed: {[guestId: string]: boolean} = {};
    guests.forEach((guest: any) => {
      collapsed[guest.id] = true; // Default all cards to collapsed
    });
    setCollapsedCards(collapsed);
  }, [guests]);

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

  // Helper function to generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Generate logins for all guests
  const handleGenerateLogins = async () => {
    setIsGeneratingLogins(true);
    setShowGenerateLoginsModal(false); // Close the initial modal
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newLogins: GuestLogin[] = guests.map((guest: any) => ({
      id: guest.id,
      email: guest.email,
      temporaryPassword: generatePassword(),
      loginUrl: `https://app.timely.com/guest-login/${eventId}/${guest.id}`,
      status: 'pending' as const
    }));
    
    setGuestLogins(newLogins);
    setIsGeneratingLogins(false);
    setShowSuccessModal(true);
  };

  // Regenerate logins for selected guests
  const handleRegenerateLogins = async () => {
    if (selectedGuestsForRegenerate.length === 0) return;
    
    setIsGeneratingLogins(true);
    setShowRegenerateModal(false);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update existing logins for selected guests
    setGuestLogins(prev => prev.map(login => {
      if (selectedGuestsForRegenerate.includes(login.id)) {
        return {
          ...login,
          temporaryPassword: generatePassword(),
          status: 'pending' as const
        };
      }
      return login;
    }));
    
    setIsGeneratingLogins(false);
    setShowSuccessModal(true);
    setSelectedGuestsForRegenerate([]);
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
          }}>
            <div style={{
              display: 'flex',
              background: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
              borderRadius: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              padding: 0,
              maxWidth: 1200,
              width: '90vw',
              minHeight: 600,
              maxHeight: '90vh',
              overflow: 'hidden',
            }}>
              {/* Left: Itinerary List */}
              <div style={{
                width: 320,
                background: isDark ? 'rgba(20,20,20,0.98)' : 'rgba(245,245,245,0.98)',
                borderRight: isDark ? '1.5px solid #222' : '1.5px solid #eee',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ padding: '24px 24px 12px 24px', fontWeight: 700, fontSize: 20, borderBottom: isDark ? '1.5px solid #222' : '1.5px solid #eee' }}>
                  Itinerary Items
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                  {itineraries.map((itin: any) => (
                    <div key={itin.id} style={{
                      marginBottom: 12,
                      borderRadius: 12,
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      border: isDark ? '1.5px solid #333' : '1.5px solid #ddd',
                      boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}>
                      <div
                        onClick={() => toggleItinCollapse(itin.id)}
                        style={{
                          padding: '16px 18px',
                          fontWeight: 600,
                          fontSize: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        {itin.title}
                        <span style={{ fontSize: 18, marginLeft: 8, transition: 'transform 0.2s', transform: collapsedItins[itin.id] ? 'rotate(0deg)' : 'rotate(180deg)' }}>▼</span>
                      </div>
                      {/* Collapsible content placeholder */}
                      {!collapsedItins[itin.id] && (
                        <div style={{ padding: '0 18px 12px 18px', color: isDark ? '#aaa' : '#666', fontSize: 14 }}>
                          {/* Placeholder for future editing controls */}
                          (Editing controls coming soon)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Center: iPhone Mockup */}
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isDark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
              }}>
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
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {/* Placeholder for timeline preview */}
                  <div style={{ color: isDark ? '#fff' : '#222', fontSize: 20, textAlign: 'center', opacity: 0.5 }}>
                    Timeline Preview<br/>(Wireframe coming soon)
                  </div>
                </div>
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
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes successPulse {
            0% { transform: scale(0.8); opacity: 0; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
} 