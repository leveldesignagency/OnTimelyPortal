import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import { getCurrentUser } from '../lib/auth';
import { supabase } from '../lib/supabase';

// Custom Dropdown Component (same styling as CalendarPage)
function CustomDropdown({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  isDark, 
  colors 
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  isDark: boolean;
  colors: any;
}) {
  const [show, setShow] = useState(false);
  
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setShow(!show)}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          background: isDark ? 'rgba(42, 42, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          color: colors.text,
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          height: '36px',
          boxSizing: 'border-box'
        }}
      >
        <span>{options.find(option => option.value === value)?.label || placeholder}</span>
        <span style={{ 
          transform: show ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▼
        </span>
      </div>

      {/* Dropdown Options */}
      {show && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          background: isDark ? 'rgba(42, 42, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          marginTop: '4px',
          boxShadow: isDark 
            ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
            : '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          {options.map((option, index) => (
            <div
              key={option.value}
              onClick={(e) => {
                e.stopPropagation();
                onChange(option.value);
                setShow(false);
              }}
              style={{
                padding: '8px 10px',
                cursor: 'pointer',
                color: colors.text,
                fontSize: '13px',
                borderBottom: index !== options.length - 1 ? `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` : 'none',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface UserSettings {
  // Profile Settings
  name: string;
  email: string;
  avatar: string;
  role: string;
  status: string;
  company: string;
  
  // Theme & Appearance
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  showAnimations: boolean;
  sidebarCollapsed: boolean;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  soundEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  announcementNotifications: boolean;
  chatNotifications: boolean;
  emergencyAlerts: boolean;
  
  // Privacy & Security
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  dataRetentionDays: number;
  allowAnalytics: boolean;
  allowMarketing: boolean;
  locationSharing: boolean;
  autoLogout: boolean;
  
  // Calendar & Sync
  autoSyncCalendar: boolean;
  syncInterval: number;
  defaultCalendarProvider: 'google' | 'outlook' | 'none';
  googleCalendarEnabled: boolean;
  outlookCalendarEnabled: boolean;
  
  // Data & Export
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  exportFormat: 'csv' | 'json' | 'xlsx';
  includeModuleResponses: boolean;
  dataExportEnabled: boolean;
  
  // Team & Collaboration
  teamNotifications: boolean;
  showOnlineStatus: boolean;
  allowTeamInvites: boolean;
  defaultTeamRole: string;
  teamChatEnabled: boolean;
  
  // Event Settings
  defaultEventDuration: number;
  autoPublishEvents: boolean;
  guestApprovalRequired: boolean;
  emergencyAlertsEnabled: boolean;
  guestChatEnabled: boolean;
  itineraryAutoSave: boolean;
  guestTimelineEnabled: boolean;
  
  // Guest Management
  guestRegistrationEnabled: boolean;
  guestApprovalWorkflow: boolean;
  guestDataRetention: number;
  guestPrivacySettings: boolean;
  
  // Mobile Settings
  mobilePushEnabled: boolean;
  offlineModeEnabled: boolean;
  hapticFeedback: boolean;
  autoLockEnabled: boolean;
  
  // Advanced Settings
  debugMode: boolean;
  performanceMode: boolean;
  customCSS: string;
  apiEndpoint: string;
  realtimeEnabled: boolean;
  cacheEnabled: boolean;
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [settings, setSettings] = useState<UserSettings>({
    // Profile Settings
    name: '',
    email: '',
    avatar: '',
    role: '',
    status: 'online',
    company: '',
    
    // Theme & Appearance
    theme: 'auto',
    fontSize: 'medium',
    compactMode: false,
    showAnimations: true,
    sidebarCollapsed: false,
    
    // Notification Settings
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    soundEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    announcementNotifications: true,
    chatNotifications: true,
    emergencyAlerts: true,
    
    // Privacy & Security
    twoFactorEnabled: false,
    sessionTimeout: 30,
    dataRetentionDays: 365,
    allowAnalytics: true,
    allowMarketing: false,
    locationSharing: false,
    autoLogout: false,
    
    // Calendar & Sync
    autoSyncCalendar: true,
    syncInterval: 15,
    defaultCalendarProvider: 'google',
    googleCalendarEnabled: false,
    outlookCalendarEnabled: false,
    
    // Data & Export
    autoBackupEnabled: false,
    backupFrequency: 'weekly',
    exportFormat: 'csv',
    includeModuleResponses: true,
    dataExportEnabled: true,
    
    // Team & Collaboration
    teamNotifications: true,
    showOnlineStatus: true,
    allowTeamInvites: true,
    defaultTeamRole: 'member',
    teamChatEnabled: true,
    
    // Event Settings
    defaultEventDuration: 60,
    autoPublishEvents: false,
    guestApprovalRequired: true,
    emergencyAlertsEnabled: true,
    guestChatEnabled: true,
    itineraryAutoSave: true,
    guestTimelineEnabled: true,
    
    // Guest Management
    guestRegistrationEnabled: true,
    guestApprovalWorkflow: true,
    guestDataRetention: 365,
    guestPrivacySettings: true,
    
    // Mobile Settings
    mobilePushEnabled: true,
    offlineModeEnabled: true,
    hapticFeedback: true,
    autoLockEnabled: true,
    
    // Advanced Settings
    debugMode: false,
    performanceMode: false,
    customCSS: '',
    apiEndpoint: '',
    realtimeEnabled: true,
    cacheEnabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [startMinutes, setStartMinutes] = useState(22 * 60); // 22:00 in minutes
  const [endMinutes, setEndMinutes] = useState(8 * 60); // 8:00 in minutes
  
  const tabs = [
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    },
    { 
      id: 'appearance', 
      label: 'Appearance', 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6"/>
          <path d="M1 12h6m6 0h6"/>
        </svg>
      )
    },
    { 
      id: 'notifications', 
      label: 'Notifications', 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
      )
    },
    { 
      id: 'security', 
      label: 'Security', 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <circle cx="12" cy="16" r="1"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      )
    },
    { 
      id: 'calendar', 
      label: 'Calendar', 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      )
    },
    { 
      id: 'data', 
      label: 'Data & Export', 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      )
    },
    { 
      id: 'team', 
      label: 'Team & Chat', 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    },
    { 
      id: 'events', 
      label: 'Event Settings', 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )
    },
    { 
      id: 'guests', 
      label: 'Guest Management', 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
        </svg>
      )
    },
  ];

  useEffect(() => {
    const loadUserAndSettings = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate('/login');
          return;
        }
        setCurrentUser(user);
        
        // Load saved settings from database
        const { data: savedSettings } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (savedSettings) {
          setSettings(prev => ({ ...prev, ...savedSettings.settings }));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading settings:', error);
        setLoading(false);
      }
    };

    loadUserAndSettings();
  }, [navigate]);

  const handleToggle = (key: keyof UserSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: currentUser.id,
          settings: settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      showSuccessMessage('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      showErrorMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const showSuccessMessage = (message: string) => {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-weight: 500;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  const showErrorMessage = (message: string) => {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-weight: 500;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  const renderQuietHoursSlider = () => {
    const formatMinutes = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHour}:${mins.toString().padStart(2, '0')} ${period}`;
    };

    const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>, isStartSlider: boolean) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      // Use precise calculation for click positioning
      const newMinutes = Math.max(0, Math.min(1439, Math.round(percentage * 1440)));
      
      if (isStartSlider) {
        setStartMinutes(newMinutes);
      } else {
        setEndMinutes(newMinutes);
      }
    };

    const handleDrag = (e: React.MouseEvent, isStartSlider: boolean) => {
      e.stopPropagation();
      e.preventDefault();
      
      const sliderContainer = e.currentTarget.closest('.slider-container') as HTMLElement;
      if (!sliderContainer) return;
      
      const handleMouseMove = (e: MouseEvent) => {
        const rect = sliderContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        // Use floating-point precision for smoother movement, then round to nearest minute
        const newMinutes = Math.max(0, Math.min(1439, Math.round(percentage * 1440)));
        
        // Only update if the change is significant enough to avoid micro-jumps
        if (isStartSlider) {
          setStartMinutes(prev => Math.abs(prev - newMinutes) >= 1 ? newMinutes : prev);
        } else {
          setEndMinutes(prev => Math.abs(prev - newMinutes) >= 1 ? newMinutes : prev);
        }
      };
      
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    return (
      <div style={{ padding: '10px 0', borderBottom: `1px solid ${isDark ? '#333' : '#e5e7eb'}` }}>
    <div style={{
          fontWeight: '500', 
          marginBottom: '6px',
          fontSize: '13px',
          color: isDark ? '#fff' : '#000'
        }}>
          Quiet Hours
        </div>
      <div style={{ flex: 1 }}>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '10px'
          }}>
            <span style={{ fontSize: '12px', color: isDark ? '#ccc' : '#666' }}>
              {formatMinutes(startMinutes)} - {formatMinutes(endMinutes)}
            </span>
        </div>
          <div style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '10px'
          }}>
            {/* Start Time Slider */}
            <div style={{ width: '240px' }}>
              <div style={{ fontSize: '11px', color: isDark ? '#ccc' : '#666', marginBottom: '5px' }}>
                Start Time: {formatMinutes(startMinutes)}
          </div>
              <div 
                className="slider-container"
        style={{
          position: 'relative',
                  height: '6px',
                  width: '240px',
                  background: isDark ? '#444' : '#e5e7eb',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
                onClick={(e) => handleSliderClick(e, true)}
              >
                <div 
                  style={{
          position: 'absolute',
                    left: `${(startMinutes / 1440) * 100}%`,
                    top: '-3px',
                    width: '12px',
                    height: '12px',
                    background: '#fff',
                    borderRadius: '50%',
                    border: '2px solid #00bfa5',
                    cursor: 'grab',
                    transform: 'translateX(-50%)',
                    zIndex: 2
                  }}
                  onMouseDown={(e) => handleDrag(e, true)}
                />
    </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '9px',
                color: isDark ? '#999' : '#666',
                marginTop: '5px'
              }}>
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>12 AM</span>
    </div>
            </div>

            {/* End Time Slider */}
            <div style={{ width: '240px' }}>
              <div style={{ fontSize: '11px', color: isDark ? '#ccc' : '#666', marginBottom: '5px' }}>
                End Time: {formatMinutes(endMinutes)}
              </div>
              <div 
                className="slider-container"
      style={{
                  position: 'relative',
                  height: '6px',
                  width: '240px',
                  background: isDark ? '#444' : '#e5e7eb',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
                onClick={(e) => handleSliderClick(e, false)}
              >
                <div 
                  style={{
                    position: 'absolute',
                    left: `${(endMinutes / 1440) * 100}%`,
                    top: '-3px',
                    width: '12px',
                    height: '12px',
                    background: '#fff',
                    borderRadius: '50%',
                    border: '2px solid #00bfa5',
                    cursor: 'grab',
                    transform: 'translateX(-50%)',
                    zIndex: 2
                  }}
                  onMouseDown={(e) => handleDrag(e, false)}
                />
              </div>
      <div style={{ 
        display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '9px',
                color: isDark ? '#999' : '#666',
                marginTop: '5px'
              }}>
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>12 AM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettingItem = (
    label: string,
    key: keyof UserSettings,
    type: 'toggle' | 'select' | 'input' | 'number' = 'toggle',
    options?: { value: string; label: string }[]
  ) => (
    <div style={{ 
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 0',
      borderBottom: `1px solid ${isDark ? '#333' : '#e5e7eb'}`
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontWeight: '500', 
          marginBottom: '2px',
          fontSize: '13px',
          color: isDark ? '#fff' : '#000'
        }}>
          {label}
        </div>
        {type === 'select' && (
          <div style={{ width: '200px' }}>
            <CustomDropdown
              value={settings[key] as string}
              onChange={(value) => setSettings(prev => ({ ...prev, [key]: value }))}
              options={options || []}
              placeholder="Select option"
              isDark={isDark}
              colors={{
                text: isDark ? '#ffffff' : '#000000',
                border: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                hover: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)'
              }}
            />
          </div>
        )}
        {type === 'input' && (
                  <input
                    type="text"
            value={settings[key] as string}
            onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{
              padding: '8px 10px',
              borderRadius: '4px',
              border: `1px solid ${isDark ? '#444' : '#d1d5db'}`,
              background: isDark ? '#333' : '#ffffff',
              color: isDark ? '#ffffff' : '#000000',
              fontSize: '13px',
              width: '200px'
            }}
          />
        )}
        {type === 'number' && (
                  <input
            type="number"
            value={settings[key] as number}
            onChange={(e) => setSettings(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                    style={{
              padding: '8px 10px',
              borderRadius: '4px',
              border: `1px solid ${isDark ? '#444' : '#d1d5db'}`,
              background: isDark ? '#333' : '#ffffff',
              color: isDark ? '#ffffff' : '#000000',
              fontSize: '13px',
              width: '80px'
            }}
          />
        )}
                </div>
              {type === 'toggle' && (
          <button
            onClick={() => handleToggle(key)}
            style={{
              width: '40px',
              height: '20px',
              borderRadius: '12px',
              background: settings[key] ? '#10b981' : (isDark ? '#404040' : '#dee2e6'),
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
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
                left: settings[key] ? '22px' : '2px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
          </button>
        )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: isDark ? '#fff' : '#000' }}>Profile Information</h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxWidth: '400px'
            }}>
                <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '500', 
                  marginBottom: '6px',
                  color: isDark ? '#ccc' : '#666'
                }}>
                  Name
                  </label>
                <div style={{
                  padding: '10px 12px',
                  background: isDark ? '#333' : '#f5f5f5',
                  border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                  borderRadius: '6px',
                  color: isDark ? '#ccc' : '#666',
                  fontSize: '14px'
                }}>
                  {currentUser?.name || 'Not set'}
                </div>
                </div>

                <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '500', 
                  marginBottom: '6px',
                  color: isDark ? '#ccc' : '#666'
                }}>
                  Email
                  </label>
                <div style={{
                  padding: '10px 12px',
                  background: isDark ? '#333' : '#f5f5f5',
                  border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                  borderRadius: '6px',
                  color: isDark ? '#ccc' : '#666',
                  fontSize: '14px'
                }}>
                  {currentUser?.email || 'Not set'}
                </div>
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '500', 
                  marginBottom: '6px',
                  color: isDark ? '#ccc' : '#666'
                }}>
                  Company
                </label>
            <div style={{
                  padding: '10px 12px',
                  background: isDark ? '#333' : '#f5f5f5',
                  border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                  borderRadius: '6px',
                  color: isDark ? '#ccc' : '#666',
                  fontSize: '14px'
                }}>
                  {currentUser?.company_name || 'Not set'}
                </div>
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '500', 
                  marginBottom: '6px',
                  color: isDark ? '#ccc' : '#666'
                }}>
                  Role
                      </label>
                <div style={{
                  padding: '10px 12px',
                  background: isDark ? '#333' : '#f5f5f5',
                  border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                  borderRadius: '6px',
                  color: isDark ? '#ccc' : '#666',
                  fontSize: '14px'
                }}>
                  {currentUser?.role || 'Not set'}
                    </div>
                    </div>
                  </div>
              </div>
        );

      case 'appearance':
        return (
                <div>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: isDark ? '#fff' : '#000' }}>Appearance Settings</h3>
            {renderSettingItem('Theme', 'theme', 'select', [
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'Auto' }
            ])}
            {renderSettingItem('Font Size', 'fontSize', 'select', [
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' }
            ])}
            {renderSettingItem('Custom Styling', 'customCSS', 'select', [
              { value: 'default', label: 'Default' },
              { value: 'compact', label: 'Compact' },
              { value: 'spacious', label: 'Spacious' },
              { value: 'minimal', label: 'Minimal' },
              { value: 'professional', label: 'Professional' }
            ])}
                </div>
        );

      case 'notifications':
        return (
                <div>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Notification Settings</h3>
            {renderSettingItem('Email Notifications', 'emailNotifications')}
            {renderSettingItem('Push Notifications', 'pushNotifications')}
            {renderSettingItem('In-App Notifications', 'inAppNotifications')}
            {renderSettingItem('Sound Enabled', 'soundEnabled')}
            {renderSettingItem('Announcement Notifications', 'announcementNotifications')}
            {renderSettingItem('Chat Notifications', 'chatNotifications')}
            {renderSettingItem('Emergency Alerts', 'emergencyAlerts')}
            {renderSettingItem('Quiet Hours Enabled', 'quietHoursEnabled')}
            {renderQuietHoursSlider()}
            {renderSettingItem('Session Timeout (minutes)', 'sessionTimeout', 'number')}
                </div>
        );

      case 'security':
        return (
          <div>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Security Settings</h3>
            {renderSettingItem('Two-Factor Authentication', 'twoFactorEnabled')}
            {renderSettingItem('Auto Logout', 'autoLogout')}
            {renderSettingItem('Location Sharing', 'locationSharing')}
            {renderSettingItem('Allow Analytics', 'allowAnalytics')}
            {renderSettingItem('Allow Marketing', 'allowMarketing')}
              </div>
        );

      case 'calendar':
        return (
                <div>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Calendar Settings</h3>
            {renderSettingItem('Auto Sync Calendar', 'autoSyncCalendar')}
            {renderSettingItem('Google Calendar', 'googleCalendarEnabled')}
            {renderSettingItem('Outlook Calendar', 'outlookCalendarEnabled')}
                </div>
        );

      case 'data':
        return (
                <div>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Data & Export Settings</h3>
            {renderSettingItem('Auto Backup', 'autoBackupEnabled')}
            {renderSettingItem('Data Export Enabled', 'dataExportEnabled')}
            {renderSettingItem('Include Module Responses', 'includeModuleResponses')}
            {renderSettingItem('Backup Frequency', 'backupFrequency', 'select', [
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' }
            ])}
            {renderSettingItem('Export Format', 'exportFormat', 'select', [
              { value: 'csv', label: 'CSV' },
              { value: 'json', label: 'JSON' },
              { value: 'xlsx', label: 'Excel' }
            ])}
                </div>
        );

      case 'team':
        return (
                <div>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Team & Collaboration</h3>
            {renderSettingItem('Team Notifications', 'teamNotifications')}
            {renderSettingItem('Show Online Status', 'showOnlineStatus')}
            {renderSettingItem('Allow Team Invites', 'allowTeamInvites')}
            {renderSettingItem('Team Chat Enabled', 'teamChatEnabled')}
            {renderSettingItem('Default Team Role', 'defaultTeamRole', 'select', [
              { value: 'admin', label: 'Administrator' },
              { value: 'manager', label: 'Manager' },
              { value: 'member', label: 'Member' },
              { value: 'viewer', label: 'Viewer' }
            ])}
                </div>
        );

      case 'events':
        return (
                <div>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Event Settings</h3>
            {renderSettingItem('Default Event Duration (minutes)', 'defaultEventDuration', 'number')}
            {renderSettingItem('Auto Publish Events', 'autoPublishEvents')}
            {renderSettingItem('Guest Approval Required', 'guestApprovalRequired')}
            {renderSettingItem('Emergency Alerts Enabled', 'emergencyAlertsEnabled')}
            {renderSettingItem('Guest Chat Enabled', 'guestChatEnabled')}
            {renderSettingItem('Itinerary Auto Save', 'itineraryAutoSave')}
            {renderSettingItem('Guest Timeline Enabled', 'guestTimelineEnabled')}
                </div>
        );

      case 'guests':
        return (
          <div>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Guest Management</h3>
            {renderSettingItem('Guest Registration Enabled', 'guestRegistrationEnabled')}
            {renderSettingItem('Guest Approval Workflow', 'guestApprovalWorkflow')}
            {renderSettingItem('Guest Privacy Settings', 'guestPrivacySettings')}
            {renderSettingItem('Guest Data Retention (days)', 'guestDataRetention', 'number')}
              </div>
        );

      default:
        return <div>Select a tab to view settings</div>;
    }
  };

  if (loading) {
    return (
            <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: isDark ? '#1f2937' : '#ffffff',
        color: isDark ? '#ffffff' : '#000000'
      }}>
        Loading settings...
                </div>
    );
  }

      return (
            <div style={{
        minHeight: '100vh',
        background: isDark 
          ? 'radial-gradient(1200px 800px at 20% -10%, rgba(34,197,94,0.12), transparent 40%), radial-gradient(1000px 700px at 120% 10%, rgba(34,197,94,0.08), transparent 45%), #0f1115'
          : '#f7f8fa',
        color: isDark ? '#ffffff' : '#000000',
        padding: '2%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          display: 'flex',
          height: '90vh',
          width: '95%',
          maxWidth: '1400px',
          background: isDark ? 'rgba(30, 30, 30, 0.55)' : 'rgba(255, 255, 255, 0.9)',
          borderRadius: '18px',
          boxShadow: isDark 
            ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)'
            : '0 4px 20px rgba(0,0,0,0.1)',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          {/* Sidebar */}
          <div style={{
            width: '250px',
            background: isDark ? 'rgba(30, 30, 30, 0.55)' : 'rgba(255, 255, 255, 0.9)',
            borderRight: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
            padding: '20px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}>
          <h2 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600', color: isDark ? '#fff' : '#000' }}>Settings</h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden',
            margin: '0 -20px'
          }}>
            {tabs.map((tab, index) => (
                              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                    style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 16px',
                      width: '100%',
                    border: 'none',
                    borderRadius: '0',
                    borderTop: index > 0 ? `0.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` : 'none',
                    borderBottom: index < tabs.length - 1 ? `0.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` : 'none',
                    background: activeTab === tab.id 
                      ? (isDark ? '#fff' : '#000') 
                      : 'transparent',
                    color: activeTab === tab.id 
                      ? (isDark ? '#000' : '#fff') 
                      : (isDark ? '#fff' : '#000'),
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: activeTab === tab.id ? '500' : '400',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    color: activeTab === tab.id 
                      ? (isDark ? '#000' : '#fff') 
                      : (isDark ? '#fff' : '#000')
                  }}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
            ))}
                </div>
              </div>

                  {/* Main Content */}
            <div style={{
            flex: 1,
            background: isDark ? 'rgba(30, 30, 30, 0.55)' : 'rgba(255, 255, 255, 0.9)',
            padding: '20px 40px',
            overflowY: 'auto',
            marginLeft: '20px',
            position: 'relative',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}>
            <div style={{
            marginBottom: '20px'
          }}>
            <h1 style={{ fontSize: '20px', fontWeight: '600', color: isDark ? '#fff' : '#000' }}>
              {tabs.find(tab => tab.id === activeTab)?.label} Settings
            </h1>
          </div>

          {renderTabContent()}

          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '40px'
          }}>
            <button
              onClick={handleSave}
              disabled={saving}
                    style={{
                padding: '8px 16px',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                maxWidth: '140px',
                width: '100%'
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
                </div>
        </div>
      </div>
    </div>
  );
}