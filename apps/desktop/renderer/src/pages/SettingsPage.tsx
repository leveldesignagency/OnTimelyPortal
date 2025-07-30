import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import { getCurrentUser } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface UserSettings {
  // Profile Settings
  name: string;
  email: string;
  avatar: string;
  role: string;
  status: string;
  
  // Theme & Appearance
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  showAnimations: boolean;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  soundEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  
  // Privacy & Security
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  dataRetentionDays: number;
  allowAnalytics: boolean;
  allowMarketing: boolean;
  
  // Calendar & Sync
  autoSyncCalendar: boolean;
  syncInterval: number;
  defaultCalendarProvider: 'google' | 'outlook' | 'none';
  
  // Data & Export
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  exportFormat: 'csv' | 'json' | 'xlsx';
  includeModuleResponses: boolean;
  
  // Team & Collaboration
  teamNotifications: boolean;
  showOnlineStatus: boolean;
  allowTeamInvites: boolean;
  defaultTeamRole: string;
  
  // Event Settings
  defaultEventDuration: number;
  autoPublishEvents: boolean;
  guestApprovalRequired: boolean;
  emergencyAlertsEnabled: boolean;
  
  // Mobile Settings
  mobilePushEnabled: boolean;
  locationSharing: boolean;
  offlineModeEnabled: boolean;
  
  // Advanced Settings
  debugMode: boolean;
  performanceMode: boolean;
  customCSS: string;
  apiEndpoint: string;
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
    
    // Theme & Appearance
    theme: 'auto',
    fontSize: 'medium',
    compactMode: false,
    showAnimations: true,
    
    // Notification Settings
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    soundEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    
    // Privacy & Security
    twoFactorEnabled: false,
    sessionTimeout: 30,
    dataRetentionDays: 365,
    allowAnalytics: true,
    allowMarketing: false,
    
    // Calendar & Sync
    autoSyncCalendar: true,
    syncInterval: 15,
    defaultCalendarProvider: 'google',
    
    // Data & Export
    autoBackupEnabled: false,
    backupFrequency: 'weekly',
    exportFormat: 'csv',
    includeModuleResponses: true,
    
    // Team & Collaboration
    teamNotifications: true,
    showOnlineStatus: true,
    allowTeamInvites: true,
    defaultTeamRole: 'member',
    
    // Event Settings
    defaultEventDuration: 60,
    autoPublishEvents: false,
    guestApprovalRequired: true,
    emergencyAlertsEnabled: true,
    
    // Mobile Settings
    mobilePushEnabled: true,
    locationSharing: false,
    offlineModeEnabled: true,
    
    // Advanced Settings
    debugMode: false,
    performanceMode: false,
    customCSS: '',
    apiEndpoint: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

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
      padding: '16px 20px',
      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
      borderRadius: 12,
      marginBottom: 12,
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
          width: 52,
          height: 28,
          borderRadius: 14,
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.3s ease',
          background: enabled 
            ? (isDark ? '#10b981' : '#059669') 
            : (isDark ? '#ef4444' : '#dc2626'),
          boxShadow: enabled 
            ? '0 2px 8px rgba(16, 185, 129, 0.4)' 
            : '0 2px 8px rgba(239, 68, 68, 0.4)'
        }}
      >
        <div style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#ffffff',
          position: 'absolute',
          top: 4,
          left: enabled ? 28 : 4,
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
        }} />
      </button>
    </div>
  );

  const SectionHeader = ({ title, description }: { title: string; description?: string }) => (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{
        fontSize: 20,
        fontWeight: 600,
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

  const TabButton = ({ id, label, icon }: { id: string; label: string; icon: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '12px 20px',
        background: activeTab === id 
          ? (isDark ? '#10b981' : '#059669') 
          : 'transparent',
        color: activeTab === id ? '#fff' : (isDark ? '#a0a0a0' : '#6b7280'),
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: isDark ? '#121212' : '#f8f9fa',
        color: isDark ? '#fff' : '#1a1a1a'
      }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: 48, 
      background: isDark ? '#121212' : '#f8f9fa', 
      color: isDark ? '#fff' : '#1a1a1a' 
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ 
            width: 140, 
            fontSize: 16, 
            background: 'none', 
            color: '#fff', 
            border: '1.5px solid #bbb', 
            borderRadius: 8, 
            cursor: 'pointer', 
            fontWeight: 600, 
            padding: '10px 0' 
          }}
        >
          Back
        </button>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: 1 }}>
          Settings
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: 140,
            fontSize: 16,
            background: saving ? '#666' : '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            padding: '10px 0'
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 32 }}>
        {/* Sidebar Navigation */}
        <div style={{ 
          width: 280,
          background: isDark ? '#1e1e1e' : '#fff',
          borderRadius: 16,
          padding: 24,
          height: 'fit-content',
          border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TabButton id="profile" label="Profile" icon="👤" />
            <TabButton id="appearance" label="Appearance" icon="🎨" />
            <TabButton id="notifications" label="Notifications" icon="🔔" />
            <TabButton id="privacy" label="Privacy & Security" icon="🔒" />
            <TabButton id="calendar" label="Calendar & Sync" icon="📅" />
            <TabButton id="data" label="Data & Export" icon="📊" />
            <TabButton id="team" label="Team & Collaboration" icon="👥" />
            <TabButton id="events" label="Event Settings" icon="🎪" />
            <TabButton id="mobile" label="Mobile Settings" icon="📱" />
            <TabButton id="advanced" label="Advanced" icon="⚙️" />
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {activeTab === 'profile' && (
            <div style={{
              background: isDark ? '#1e1e1e' : '#fff',
              borderRadius: 16,
              padding: 32,
              border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
            }}>
              <SectionHeader 
                title="Profile Settings" 
                description="Manage your account information and preferences"
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 16
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#1a1a1a' : '#f3f4f6',
                      color: isDark ? '#666' : '#9ca3af',
                      fontSize: 16
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Status
                  </label>
                  <select
                    value={settings.status}
                    onChange={(e) => setSettings(prev => ({ ...prev, status: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 16
                    }}
                  >
                    <option value="online">Online</option>
                    <option value="away">Away</option>
                    <option value="busy">Busy</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div style={{
              background: isDark ? '#1e1e1e' : '#fff',
              borderRadius: 16,
              padding: 32,
              border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
            }}>
              <SectionHeader 
                title="Appearance Settings" 
                description="Customize the look and feel of the application"
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Theme
                  </label>
                  <select
                    value={settings.theme}
                    onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value as any }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 16
                    }}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Font Size
                  </label>
                  <select
                    value={settings.fontSize}
                    onChange={(e) => setSettings(prev => ({ ...prev, fontSize: e.target.value as any }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 16
                    }}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <ToggleButton
                  enabled={settings.compactMode}
                  onToggle={() => handleToggle('compactMode')}
                  label="Compact Mode"
                  description="Reduce spacing and padding for a more compact layout"
                />

                <ToggleButton
                  enabled={settings.showAnimations}
                  onToggle={() => handleToggle('showAnimations')}
                  label="Show Animations"
                  description="Enable smooth transitions and animations"
                />
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div style={{
              background: isDark ? '#1e1e1e' : '#fff',
              borderRadius: 16,
              padding: 32,
              border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
            }}>
              <SectionHeader 
                title="Notification Settings" 
                description="Configure how and when you receive notifications"
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ToggleButton
                  enabled={settings.emailNotifications}
                  onToggle={() => handleToggle('emailNotifications')}
                  label="Email Notifications"
                  description="Receive notifications via email"
                />

                <ToggleButton
                  enabled={settings.pushNotifications}
                  onToggle={() => handleToggle('pushNotifications')}
                  label="Push Notifications"
                  description="Receive browser push notifications"
                />

                <ToggleButton
                  enabled={settings.inAppNotifications}
                  onToggle={() => handleToggle('inAppNotifications')}
                  label="In-App Notifications"
                  description="Show notifications within the application"
                />

                <ToggleButton
                  enabled={settings.soundEnabled}
                  onToggle={() => handleToggle('soundEnabled')}
                  label="Sound Notifications"
                  description="Play sounds for notifications"
                />

                <ToggleButton
                  enabled={settings.quietHoursEnabled}
                  onToggle={() => handleToggle('quietHoursEnabled')}
                  label="Quiet Hours"
                  description="Silence notifications during specified hours"
                />

                {settings.quietHoursEnabled && (
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={settings.quietHoursStart}
                        onChange={(e) => setSettings(prev => ({ ...prev, quietHoursStart: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: 8,
                          border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                          background: isDark ? '#2a2a2a' : '#fff',
                          color: isDark ? '#fff' : '#1a1a1a',
                          fontSize: 16
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                        End Time
                      </label>
                      <input
                        type="time"
                        value={settings.quietHoursEnd}
                        onChange={(e) => setSettings(prev => ({ ...prev, quietHoursEnd: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: 8,
                          border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                          background: isDark ? '#2a2a2a' : '#fff',
                          color: isDark ? '#fff' : '#1a1a1a',
                          fontSize: 16
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div style={{
              background: isDark ? '#1e1e1e' : '#fff',
              borderRadius: 16,
              padding: 32,
              border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
            }}>
              <SectionHeader 
                title="Privacy & Security" 
                description="Manage your privacy and security preferences"
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ToggleButton
                  enabled={settings.twoFactorEnabled}
                  onToggle={() => handleToggle('twoFactorEnabled')}
                  label="Two-Factor Authentication"
                  description="Add an extra layer of security to your account"
                />

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                    min="5"
                    max="480"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 16
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Data Retention (days)
                  </label>
                  <input
                    type="number"
                    value={settings.dataRetentionDays}
                    onChange={(e) => setSettings(prev => ({ ...prev, dataRetentionDays: parseInt(e.target.value) }))}
                    min="30"
                    max="2555"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 16
                    }}
                  />
                </div>

                <ToggleButton
                  enabled={settings.allowAnalytics}
                  onToggle={() => handleToggle('allowAnalytics')}
                  label="Allow Analytics"
                  description="Help improve the app by sharing usage data"
                />

                <ToggleButton
                  enabled={settings.allowMarketing}
                  onToggle={() => handleToggle('allowMarketing')}
                  label="Marketing Communications"
                  description="Receive promotional emails and updates"
                />
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div style={{
              background: isDark ? '#1e1e1e' : '#fff',
              borderRadius: 16,
              padding: 32,
              border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
            }}>
              <SectionHeader 
                title="Calendar & Sync Settings" 
                description="Configure calendar integrations and synchronization"
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ToggleButton
                  enabled={settings.autoSyncCalendar}
                  onToggle={() => handleToggle('autoSyncCalendar')}
                  label="Auto Sync Calendar"
                  description="Automatically sync events with external calendars"
                />

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Sync Interval (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.syncInterval}
                    onChange={(e) => setSettings(prev => ({ ...prev, syncInterval: parseInt(e.target.value) }))}
                    min="5"
                    max="1440"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 16
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Default Calendar Provider
                  </label>
                  <select
                    value={settings.defaultCalendarProvider}
                    onChange={(e) => setSettings(prev => ({ ...prev, defaultCalendarProvider: e.target.value as any }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 16
                    }}
                  >
                    <option value="google">Google Calendar</option>
                    <option value="outlook">Outlook Calendar</option>
                    <option value="none">No Default</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div style={{
              background: isDark ? '#1e1e1e' : '#fff',
              borderRadius: 16,
              padding: 32,
              border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
            }}>
              <SectionHeader 
                title="Data & Export Settings" 
                description="Configure data backup and export preferences"
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ToggleButton
                  enabled={settings.autoBackupEnabled}
                  onToggle={() => handleToggle('autoBackupEnabled')}
                  label="Auto Backup"
                  description="Automatically backup your data"
                />

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Backup Frequency
                  </label>
                  <select
                    value={settings.backupFrequency}
                    onChange={(e) => setSettings(prev => ({ ...prev, backupFrequency: e.target.value as any }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 16
                    }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Export Format
                  </label>
                  <select
                    value={settings.exportFormat}
                    onChange={(e) => setSettings(prev => ({ ...prev, exportFormat: e.target.value as any }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 16
                    }}
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                    <option value="xlsx">Excel (XLSX)</option>
                  </select>
                </div>

                <ToggleButton
                  enabled={settings.includeModuleResponses}
                  onToggle={() => handleToggle('includeModuleResponses')}
                  label="Include Module Responses"
                  description="Include guest responses in data exports"
                />
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div style={{
              background: isDark ? '#1e1e1e' : '#fff',
              borderRadius: 16,
              padding: 32,
              border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
            }}>
              <SectionHeader 
                title="Team & Collaboration Settings" 
                description="Configure team collaboration preferences"
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ToggleButton
                  enabled={settings.teamNotifications}
                  onToggle={() => handleToggle('teamNotifications')}
                  label="Team Notifications"
                  description="Receive notifications about team activities"
                />

                <ToggleButton
                  enabled={settings.showOnlineStatus}
                  onToggle={() => handleToggle('showOnlineStatus')}
                  label="Show Online Status"
                  description="Display your online status to team members"
                />

                <ToggleButton
                  enabled={settings.allowTeamInvites}
                  onToggle={() => handleToggle('allowTeamInvites')}
                  label="Allow Team Invites"
                  description="Allow team members to invite you to new teams"
                />

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Default Team Role
                  </label>
                  <select
                    value={settings.defaultTeamRole}
                    onChange={(e) => setSettings(prev => ({ ...prev, defaultTeamRole: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 16
                    }}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div style={{
              background: isDark ? '#1e1e1e' : '#fff',
              borderRadius: 16,
              padding: 32,
              border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
            }}>
              <SectionHeader 
                title="Event Settings" 
                description="Configure default event preferences"
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Default Event Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.defaultEventDuration}
                    onChange={(e) => setSettings(prev => ({ ...prev, defaultEventDuration: parseInt(e.target.value) }))}
                    min="15"
                    max="480"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 16
                    }}
                  />
                </div>

                <ToggleButton
                  enabled={settings.autoPublishEvents}
                  onToggle={() => handleToggle('autoPublishEvents')}
                  label="Auto Publish Events"
                  description="Automatically publish events when created"
                />

                <ToggleButton
                  enabled={settings.guestApprovalRequired}
                  onToggle={() => handleToggle('guestApprovalRequired')}
                  label="Guest Approval Required"
                  description="Require approval for guest registrations"
                />

                <ToggleButton
                  enabled={settings.emergencyAlertsEnabled}
                  onToggle={() => handleToggle('emergencyAlertsEnabled')}
                  label="Emergency Alerts"
                  description="Enable emergency alert system for events"
                />
              </div>
            </div>
          )}

          {activeTab === 'mobile' && (
            <div style={{
              background: isDark ? '#1e1e1e' : '#fff',
              borderRadius: 16,
              padding: 32,
              border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
            }}>
              <SectionHeader 
                title="Mobile Settings" 
                description="Configure mobile app preferences"
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ToggleButton
                  enabled={settings.mobilePushEnabled}
                  onToggle={() => handleToggle('mobilePushEnabled')}
                  label="Mobile Push Notifications"
                  description="Receive push notifications on mobile devices"
                />

                <ToggleButton
                  enabled={settings.locationSharing}
                  onToggle={() => handleToggle('locationSharing')}
                  label="Location Sharing"
                  description="Share your location with event organizers"
                />

                <ToggleButton
                  enabled={settings.offlineModeEnabled}
                  onToggle={() => handleToggle('offlineModeEnabled')}
                  label="Offline Mode"
                  description="Allow the app to work without internet connection"
                />
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div style={{
              background: isDark ? '#1e1e1e' : '#fff',
              borderRadius: 16,
              padding: 32,
              border: isDark ? '1px solid #333' : '1px solid #e5e7eb'
            }}>
              <SectionHeader 
                title="Advanced Settings" 
                description="Advanced configuration options for power users"
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ToggleButton
                  enabled={settings.debugMode}
                  onToggle={() => handleToggle('debugMode')}
                  label="Debug Mode"
                  description="Enable debug logging and developer tools"
                />

                <ToggleButton
                  enabled={settings.performanceMode}
                  onToggle={() => handleToggle('performanceMode')}
                  label="Performance Mode"
                  description="Optimize for performance over visual effects"
                />

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Custom CSS
                  </label>
                  <textarea
                    value={settings.customCSS}
                    onChange={(e) => setSettings(prev => ({ ...prev, customCSS: e.target.value }))}
                    placeholder="Enter custom CSS styles..."
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    API Endpoint
                  </label>
                  <input
                    type="text"
                    value={settings.apiEndpoint}
                    onChange={(e) => setSettings(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                    placeholder="https://api.example.com"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: isDark ? '1px solid #333' : '1px solid #d1d5db',
                      background: isDark ? '#2a2a2a' : '#fff',
                      color: isDark ? '#fff' : '#1a1a1a',
                      fontSize: 16
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 