import React, { useState, useContext, useEffect } from 'react';
import { CustomTimePicker as SharedTimePicker } from '../components/CustomPickers';
import { useParams, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import { getCurrentUser } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface NotificationSettings {
  // Event Notifications
  eventAnnouncements: boolean;
  emergencyAlerts: boolean;
  eventUpdates: boolean;
  itineraryChanges: boolean;
  
  // Chat Notifications
  teamChatMessages: boolean;
  guestChatMessages: boolean;
  chatMentions: boolean;
  
  // System Notifications
  appUpdates: boolean;
  successMessages: boolean;
  errorMessages: boolean;
  dataExportComplete: boolean;
  
  // Email Notifications
  guestInvites: boolean;
  itinerarySharing: boolean;
  eventReminders: boolean;
  
  // Calendar Notifications
  meetingReminders: boolean;
  calendarSync: boolean;
  scheduleChanges: boolean;
  
  // Activity Notifications
  dashboardActivity: boolean;
  userActivity: boolean;
  systemActivity: boolean;
  
  // Push Notifications (Mobile)
  pushAnnouncements: boolean;
  pushChat: boolean;
  pushReminders: boolean;
  
  // Advanced Settings
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export default function NotificationSettingsPage() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    // Event Notifications
    eventAnnouncements: true,
    emergencyAlerts: true,
    eventUpdates: true,
    itineraryChanges: true,
    
    // Chat Notifications
    teamChatMessages: true,
    guestChatMessages: true,
    chatMentions: true,
    
    // System Notifications
    appUpdates: true,
    successMessages: true,
    errorMessages: true,
    dataExportComplete: true,
    
    // Email Notifications
    guestInvites: true,
    itinerarySharing: true,
    eventReminders: true,
    
    // Calendar Notifications
    meetingReminders: true,
    calendarSync: true,
    scheduleChanges: true,
    
    // Activity Notifications
    dashboardActivity: true,
    userActivity: true,
    systemActivity: true,
    
    // Push Notifications
    pushAnnouncements: true,
    pushChat: true,
    pushReminders: true,
    
    // Advanced Settings
    soundEnabled: true,
    vibrationEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUserAndSettings = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate('/login');
          return;
        }
        setCurrentUser(user);
        
        // Load saved notification settings from database
        const { data: savedSettings } = await supabase
          .from('user_notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .eq('event_id', eventId)
          .single();
        
        if (savedSettings) {
          setSettings(prev => ({ ...prev, ...savedSettings.settings }));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading notification settings:', error);
        setLoading(false);
      }
    };

    loadUserAndSettings();
  }, [eventId, navigate]);

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    if (!currentUser || !eventId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: currentUser.id,
          event_id: eventId,
          settings: settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      // Show success message
      showSuccessMessage('Notification settings saved successfully!');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      showErrorMessage('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const showSuccessMessage = (message: string) => {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  const showErrorMessage = (message: string) => {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  const ToggleButton = ({ 
    enabled, 
    onToggle, 
    label, 
    description 
  }: { 
    enabled: boolean; 
    onToggle: () => void; 
    label: string; 
    description?: string;
  }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
      borderRadius: 12,
      marginBottom: 8,
      transition: 'all 0.2s ease'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: isDark ? '#fff' : '#1a1a1a',
          marginBottom: description ? 4 : 0
        }}>
          {label}
        </div>
        {description && (
          <div style={{
            fontSize: 14,
            color: isDark ? '#a0a0a0' : '#6b7280'
          }}>
            {description}
          </div>
        )}
      </div>
      <button
        onClick={onToggle}
        style={{
          width: '40px',
          height: '20px',
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s ease',
          background: enabled 
            ? '#10b981' 
            : (isDark ? '#404040' : '#dee2e6'),
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          padding: '0',
          margin: '0',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none'
        }}
      >
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#ffffff',
          position: 'absolute',
          top: '2px',
          left: enabled ? '22px' : '2px',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </button>
    </div>
  );

  const SectionHeader = ({ title, description }: { title: string; description?: string }) => (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{
        fontSize: 20,
        fontWeight: 700,
        color: isDark ? '#fff' : '#1a1a1a',
        marginBottom: description ? 8 : 0
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: 14,
          color: isDark ? '#a0a0a0' : '#6b7280',
          margin: 0
        }}>
          {description}
        </p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: isDark 
          ? 'radial-gradient(1200px 800px at 20% -10%, rgba(34,197,94,0.12), transparent 40%), radial-gradient(1000px 700px at 120% 10%, rgba(34,197,94,0.08), transparent 45%), #0f1115'
          : '#f7f8fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: isDark ? '#fff' : '#1a1a1a', fontSize: 18 }}>
          Loading notification settings...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark 
        ? 'radial-gradient(1200px 800px at 20% -10%, rgba(34,197,94,0.12), transparent 40%), radial-gradient(1000px 700px at 120% 10%, rgba(34,197,94,0.08), transparent 45%), #0f1115'
        : '#f7f8fa',
      padding: 0
    }}>
      <div style={{
        maxWidth: '100%',
        margin: '0 auto',
        padding: '40px 40px 0 40px',
        position: 'relative'
      }}>
        {/* Header with Back and Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
          paddingRight: 40
        }}>
          <button
            onClick={() => navigate(`/event/${eventId}`)}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? '#fff' : '#1a1a1a',
              fontSize: 16,
              cursor: 'pointer',
              padding: '8px 0',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              fontFamily: 'inherit',
            }}
          >
            ← Back
          </button>
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => navigate(`/event/${eventId}`)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.2)',
                borderRadius: 8,
                color: isDark ? '#fff' : '#1a1a1a',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 32px',
                background: saving 
                  ? (isDark ? '#374151' : '#9ca3af') 
                  : (isDark ? '#10b981' : '#059669'),
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: saving ? 0.6 : 1
              }}
              onMouseEnter={e => {
                if (!saving) {
                  e.currentTarget.style.background = isDark ? '#059669' : '#047857';
                }
              }}
              onMouseLeave={e => {
                if (!saving) {
                  e.currentTarget.style.background = isDark ? '#10b981' : '#059669';
                }
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 32,
          paddingRight: 40,
          color: isDark ? '#fff' : '#1a1a1a'
        }}>
          Notification Settings
        </h1>

        {/* Settings Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          
          {/* Event Notifications */}
          <div style={{
            background: isDark ? 'rgba(30, 30, 30, 0.55)' : 'rgba(255, 255, 255, 0.9)',
            borderRadius: 18,
            padding: 24,
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isDark 
              ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)'
              : '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <SectionHeader 
              title="Event Notifications" 
              description="Notifications related to event activities and updates"
            />
            <ToggleButton
              enabled={settings.eventAnnouncements}
              onToggle={() => handleToggle('eventAnnouncements')}
              label="Event Announcements"
              description="Receive notifications when new announcements are posted"
            />
            <ToggleButton
              enabled={settings.emergencyAlerts}
              onToggle={() => handleToggle('emergencyAlerts')}
              label="Emergency Alerts"
              description="Critical safety and emergency notifications"
            />
            <ToggleButton
              enabled={settings.eventUpdates}
              onToggle={() => handleToggle('eventUpdates')}
              label="Event Updates"
              description="Changes to event details, timing, or location"
            />
            <ToggleButton
              enabled={settings.itineraryChanges}
              onToggle={() => handleToggle('itineraryChanges')}
              label="Itinerary Changes"
              description="Updates to event schedule and activities"
            />
          </div>

          {/* Chat Notifications */}
          <div style={{
            background: isDark ? 'rgba(30, 30, 30, 0.55)' : 'rgba(255, 255, 255, 0.9)',
            borderRadius: 18,
            padding: 24,
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isDark 
              ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)'
              : '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <SectionHeader 
              title="Chat Notifications" 
              description="Notifications for team and guest chat messages"
            />
            <ToggleButton
              enabled={settings.teamChatMessages}
              onToggle={() => handleToggle('teamChatMessages')}
              label="Team Chat Messages"
              description="New messages in team chat channels"
            />
            <ToggleButton
              enabled={settings.guestChatMessages}
              onToggle={() => handleToggle('guestChatMessages')}
              label="Guest Chat Messages"
              description="Messages from guests and support requests"
            />
            <ToggleButton
              enabled={settings.chatMentions}
              onToggle={() => handleToggle('chatMentions')}
              label="Chat Mentions"
              description="When someone mentions you in a chat"
            />
          </div>

          {/* System Notifications */}
          <div style={{
            background: isDark ? 'rgba(30, 30, 30, 0.55)' : 'rgba(255, 255, 255, 0.9)',
            borderRadius: 18,
            padding: 24,
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isDark 
              ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)'
              : '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <SectionHeader 
              title="System Notifications" 
              description="App updates and system messages"
            />
            <ToggleButton
              enabled={settings.appUpdates}
              onToggle={() => handleToggle('appUpdates')}
              label="App Updates"
              description="New features and app improvements"
            />
            <ToggleButton
              enabled={settings.successMessages}
              onToggle={() => handleToggle('successMessages')}
              label="Success Messages"
              description="Confirmation of completed actions"
            />
            <ToggleButton
              enabled={settings.errorMessages}
              onToggle={() => handleToggle('errorMessages')}
              label="Error Messages"
              description="Important error notifications"
            />
            <ToggleButton
              enabled={settings.dataExportComplete}
              onToggle={() => handleToggle('dataExportComplete')}
              label="Data Export Complete"
              description="When CSV exports and reports are ready"
            />
          </div>

          {/* Email Notifications */}
          <div style={{
            background: isDark ? 'rgba(30, 30, 30, 0.55)' : 'rgba(255, 255, 255, 0.9)',
            borderRadius: 18,
            padding: 24,
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isDark 
              ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)'
              : '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <SectionHeader 
              title="Email Notifications" 
              description="Email-based notifications and updates"
            />
            <ToggleButton
              enabled={settings.guestInvites}
              onToggle={() => handleToggle('guestInvites')}
              label="Guest Invites"
              description="When guest invitations are sent"
            />
            <ToggleButton
              enabled={settings.itinerarySharing}
              onToggle={() => handleToggle('itinerarySharing')}
              label="Itinerary Sharing"
              description="When itineraries are shared with guests"
            />
            <ToggleButton
              enabled={settings.eventReminders}
              onToggle={() => handleToggle('eventReminders')}
              label="Event Reminders"
              description="Upcoming event reminders and notifications"
            />
          </div>

          {/* Calendar Notifications */}
          <div style={{
            background: isDark ? 'rgba(30, 30, 30, 0.55)' : 'rgba(255, 255, 255, 0.9)',
            borderRadius: 18,
            padding: 24,
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isDark 
              ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)'
              : '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <SectionHeader 
              title="Calendar Notifications" 
              description="Calendar and scheduling notifications"
            />
            <ToggleButton
              enabled={settings.meetingReminders}
              onToggle={() => handleToggle('meetingReminders')}
              label="Meeting Reminders"
              description="Reminders for scheduled meetings and calls"
            />
            <ToggleButton
              enabled={settings.calendarSync}
              onToggle={() => handleToggle('calendarSync')}
              label="Calendar Sync"
              description="Calendar synchronization status"
            />
            <ToggleButton
              enabled={settings.scheduleChanges}
              onToggle={() => handleToggle('scheduleChanges')}
              label="Schedule Changes"
              description="Updates to meeting times and schedules"
            />
          </div>

          {/* Activity Notifications */}
          <div style={{
            background: isDark ? 'rgba(30, 30, 30, 0.55)' : 'rgba(255, 255, 255, 0.9)',
            borderRadius: 18,
            padding: 24,
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isDark 
              ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)'
              : '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <SectionHeader 
              title="Activity Notifications" 
              description="Dashboard and activity feed notifications"
            />
            <ToggleButton
              enabled={settings.dashboardActivity}
              onToggle={() => handleToggle('dashboardActivity')}
              label="Dashboard Activity"
              description="Updates to event dashboard and metrics"
            />
            <ToggleButton
              enabled={settings.userActivity}
              onToggle={() => handleToggle('userActivity')}
              label="User Activity"
              description="Team member actions and updates"
            />
            <ToggleButton
              enabled={settings.systemActivity}
              onToggle={() => handleToggle('systemActivity')}
              label="System Activity"
              description="System-generated activity notifications"
            />
          </div>

          {/* Push Notifications */}
          <div style={{
            background: isDark ? 'rgba(30, 30, 30, 0.55)' : 'rgba(255, 255, 255, 0.9)',
            borderRadius: 18,
            padding: 24,
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isDark 
              ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)'
              : '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <SectionHeader 
              title="Push Notifications" 
              description="Mobile push notifications (if using mobile app)"
            />
            <ToggleButton
              enabled={settings.pushAnnouncements}
              onToggle={() => handleToggle('pushAnnouncements')}
              label="Push Announcements"
              description="Event announcements on mobile device"
            />
            <ToggleButton
              enabled={settings.pushChat}
              onToggle={() => handleToggle('pushChat')}
              label="Push Chat"
              description="Chat messages on mobile device"
            />
            <ToggleButton
              enabled={settings.pushReminders}
              onToggle={() => handleToggle('pushReminders')}
              label="Push Reminders"
              description="Event reminders on mobile device"
            />
          </div>

          {/* Advanced Settings */}
          <div style={{
            background: isDark ? 'rgba(30, 30, 30, 0.55)' : 'rgba(255, 255, 255, 0.9)',
            borderRadius: 18,
            padding: 24,
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isDark 
              ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)'
              : '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <SectionHeader 
              title="Advanced Settings" 
              description="Additional notification preferences"
            />
            <ToggleButton
              enabled={settings.soundEnabled}
              onToggle={() => handleToggle('soundEnabled')}
              label="Sound Notifications"
              description="Play sounds for notifications"
            />
            <ToggleButton
              enabled={settings.vibrationEnabled}
              onToggle={() => handleToggle('vibrationEnabled')}
              label="Vibration"
              description="Vibrate device for notifications"
            />
            <ToggleButton
              enabled={settings.quietHoursEnabled}
              onToggle={() => handleToggle('quietHoursEnabled')}
              label="Quiet Hours"
              description="Silence notifications during specified hours"
            />
            
            {settings.quietHoursEnabled && (
              <div style={{
                display: 'flex',
                gap: 16,
                marginTop: 16,
                padding: '16px 20px',
                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                borderRadius: 8
              }}>
                <div style={{ flex: 1 }}>
                  <label style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: isDark ? '#fff' : '#1a1a1a',
                    marginBottom: 8,
                    display: 'block'
                  }}>
                    Start Time
                  </label>
                  <SharedTimePicker
                    value={settings.quietHoursStart}
                    onChange={(v) => setSettings(prev => ({ ...prev, quietHoursStart: v }))}
                    placeholder="HH:MM"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: isDark ? '#fff' : '#1a1a1a',
                    marginBottom: 8,
                    display: 'block'
                  }}>
                    End Time
                  </label>
                  <SharedTimePicker
                    value={settings.quietHoursEnd}
                    onChange={(v) => setSettings(prev => ({ ...prev, quietHoursEnd: v }))}
                    placeholder="HH:MM"
                  />
                </div>
              </div>
            )}
          </div>
        </div>


      </div>

      {/* CSS for toast animations */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
} 