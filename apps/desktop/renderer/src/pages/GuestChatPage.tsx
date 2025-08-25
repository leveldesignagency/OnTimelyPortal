import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import GuestChatInterface from '../components/GuestChatInterface';
import { getGuests } from '../lib/supabase';
import { supabase } from '../lib/supabase';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar?: string;
}

export default function GuestChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string>('Guest Chat');
  
  // Get eventId from location state or URL params
  const eventId = location.state?.eventId || new URLSearchParams(location.search).get('eventId');

  useEffect(() => {
    if (!eventId) {
      setError('No event ID provided');
      setLoading(false);
      return;
    }

    loadGuests();
  }, [eventId]);

  const loadEventTitle = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('name')
        .eq('id', eventId)
        .single();
      
      if (error) {
        console.error('Error fetching event title:', error);
        return;
      }
      
      if (data && data.name) {
        setEventTitle(data.name);
      }
    } catch (error) {
      console.error('Error fetching event title:', error);
    }
  };

  const loadGuests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const guestsData = await getGuests(eventId);
      setGuests(guestsData || []);
      
      // Load event title
      await loadEventTitle();
      
    } catch (err) {
      console.error('Error loading guests:', err);
      setError('Failed to load guests for this event');
    } finally {
      setLoading(false);
    }
  };

  const getPageStyles = () => ({
    height: '100vh',
    background: isDark 
      ? 'radial-gradient(1200px 800px at 20% -10%, rgba(34,197,94,0.12), transparent 40%), radial-gradient(1000px 700px at 120% 10%, rgba(34,197,94,0.08), transparent 45%), #0f1115'
      : '#f7f8fa',
    color: isDark ? '#ffffff' : '#000000',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden'
  });

  if (loading) {
    return (
      <div style={getPageStyles()}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid', 
            borderColor: isDark ? '#444' : '#ddd',
            borderTopColor: isDark ? '#60a5fa' : '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: 18, color: isDark ? '#aaa' : '#666' }}>
            Loading guest chat...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={getPageStyles()}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          flexDirection: 'column',
          gap: '32px',
          padding: '40px'
        }}>
          <div style={{ 
            fontSize: 64, 
            marginBottom: 8,
            filter: isDark ? 'invert(1)' : 'none'
          }}>
            🚫
          </div>
          <h2 style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            marginBottom: 16, 
            textAlign: 'center',
            color: isDark ? '#fff' : '#000',
            letterSpacing: '-0.02em'
          }}>
            Unable to Load Chat
          </h2>
          <p style={{ 
            fontSize: 16, 
            marginBottom: 32, 
            textAlign: 'center', 
            color: isDark ? '#aaa' : '#666',
            lineHeight: 1.5,
            maxWidth: '400px'
          }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: '14px 28px',
                background: 'transparent',
                color: isDark ? '#fff' : '#000',
                border: `1.5px solid ${isDark ? '#444' : '#ccc'}`,
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '120px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Go Back
            </button>
            <button
              onClick={loadGuests}
              style={{
                padding: '14px 28px',
                background: isDark ? '#2a2a2a' : '#f0f0f0',
                color: isDark ? '#fff' : '#000',
                border: `1.5px solid ${isDark ? '#444' : '#ccc'}`,
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '120px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#3a3a3a' : '#e0e0e0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? '#2a2a2a' : '#f0f0f0';
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div style={getPageStyles()}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          flexDirection: 'column',
          gap: '32px',
          padding: '40px'
        }}>
          <div style={{ 
            fontSize: 64, 
            marginBottom: 8,
            filter: isDark ? 'invert(1)' : 'none'
          }}>
            📋
          </div>
          <h2 style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            marginBottom: 16, 
            textAlign: 'center',
            color: isDark ? '#fff' : '#000',
            letterSpacing: '-0.02em'
          }}>
            No Event Selected
          </h2>
          <p style={{ 
            fontSize: 16, 
            color: isDark ? '#aaa' : '#666', 
            textAlign: 'center',
            lineHeight: 1.5,
            maxWidth: '400px'
          }}>
            Please select an event to access the guest chat.
          </p>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '14px 28px',
              background: isDark ? '#2a2a2a' : '#f0f0f0',
              color: isDark ? '#fff' : '#000',
              border: `1.5px solid ${isDark ? '#444' : '#ccc'}`,
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '120px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#3a3a3a' : '#e0e0e0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? '#2a2a2a' : '#f0f0f0';
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={getPageStyles()}>
      {/* Header Bar */}
      <div style={{ 
        padding: '16px 24px',
        borderBottom: `1px solid ${isDark ? '#333' : '#e5e7eb'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        position: 'relative'
      }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            width: 'auto',
            padding: '4px 12px',
            fontSize: 13, 
            background: 'transparent', 
            color: isDark ? '#fff' : '#000', 
            border: `1px solid ${isDark ? '#444' : '#ccc'}`, 
            borderRadius: 5, 
            cursor: 'pointer', 
            fontWeight: 500,
            textAlign: 'left'
          }}
        >
          Back
        </button>
        
        <h1 style={{ 
          fontSize: 24, 
          fontWeight: 700, 
          margin: 0,
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          whiteSpace: 'nowrap',
          textAlign: 'center'
        }}>
          {eventTitle}
        </h1>
        
        <div style={{ 
          padding: '6px 12px', 
          background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          color: isDark ? '#aaa' : '#666',
          whiteSpace: 'nowrap'
        }}>
          {guests.length} guest{guests.length !== 1 ? 's' : ''} connected
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ 
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <GuestChatInterface 
          eventId={eventId} 
          isDark={isDark} 
          guests={guests} 
        />
      </div>
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
} 
 
 
 