import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  vibrationEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  
  // Privacy & Security
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  dataRetentionDays: number;
  allowAnalytics: boolean;
  allowMarketing: boolean;
  locationSharing: boolean;
  
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
  offlineModeEnabled: boolean;
  hapticFeedback: boolean;
  autoLockEnabled: boolean;
  
  // Advanced Settings
  debugMode: boolean;
  performanceMode: boolean;
  customCSS: string;
  apiEndpoint: string;
}

interface SettingsPageProps {
  onNavigate: (route: string) => void;
  onMenuPress?: () => void;
}

export default function SettingsPage({ onNavigate, onMenuPress }: SettingsPageProps) {
  const insets = useSafeAreaInsets();
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
    vibrationEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    
    // Privacy & Security
    twoFactorEnabled: false,
    sessionTimeout: 30,
    dataRetentionDays: 365,
    allowAnalytics: true,
    allowMarketing: false,
    locationSharing: false,
    
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
    offlineModeEnabled: true,
    hapticFeedback: true,
    autoLockEnabled: true,
    
    // Advanced Settings
    debugMode: false,
    performanceMode: false,
    customCSS: '',
    apiEndpoint: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'start' | 'end'>('start');

  useEffect(() => {
    const loadUserAndSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          onNavigate('login');
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
  }, [onNavigate]);

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
      
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Settings</Text>
        <Text style={styles.sectionDescription}>Manage your account information and preferences</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Full Name</Text>
          <TextInput
            style={styles.textInput}
            value={settings.name}
            onChangeText={(text) => setSettings(prev => ({ ...prev, name: text }))}
            placeholder="Enter your full name"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Email Address</Text>
          <TextInput
            style={[styles.textInput, styles.disabledInput]}
            value={settings.email}
            editable={false}
            placeholder="Email address"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Status</Text>
          <View style={styles.pickerContainer}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                Alert.alert(
                  'Select Status',
                  'Choose your online status',
                  [
                    { text: 'Online', onPress: () => setSettings(prev => ({ ...prev, status: 'online' })) },
                    { text: 'Away', onPress: () => setSettings(prev => ({ ...prev, status: 'away' })) },
                    { text: 'Busy', onPress: () => setSettings(prev => ({ ...prev, status: 'busy' })) },
                    { text: 'Offline', onPress: () => setSettings(prev => ({ ...prev, status: 'offline' })) },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
            >
              <Text style={styles.pickerButtonText}>{settings.status}</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderAppearanceTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance Settings</Text>
        <Text style={styles.sectionDescription}>Customize the look and feel of the application</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Theme</Text>
          <View style={styles.pickerContainer}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                Alert.alert(
                  'Select Theme',
                  'Choose your preferred theme',
                  [
                    { text: 'Light', onPress: () => setSettings(prev => ({ ...prev, theme: 'light' })) },
                    { text: 'Dark', onPress: () => setSettings(prev => ({ ...prev, theme: 'dark' })) },
                    { text: 'Auto (System)', onPress: () => setSettings(prev => ({ ...prev, theme: 'auto' })) },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
            >
              <Text style={styles.pickerButtonText}>{settings.theme}</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Font Size</Text>
          <View style={styles.pickerContainer}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                Alert.alert(
                  'Select Font Size',
                  'Choose your preferred font size',
                  [
                    { text: 'Small', onPress: () => setSettings(prev => ({ ...prev, fontSize: 'small' })) },
                    { text: 'Medium', onPress: () => setSettings(prev => ({ ...prev, fontSize: 'medium' })) },
                    { text: 'Large', onPress: () => setSettings(prev => ({ ...prev, fontSize: 'large' })) },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
            >
              <Text style={styles.pickerButtonText}>{settings.fontSize}</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Compact Mode</Text>
              <Text style={styles.settingDescription}>Reduce spacing and padding for a more compact layout</Text>
            </View>
            <Switch
              value={settings.compactMode}
              onValueChange={() => handleToggle('compactMode')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.compactMode ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Show Animations</Text>
              <Text style={styles.settingDescription}>Enable smooth transitions and animations</Text>
            </View>
            <Switch
              value={settings.showAnimations}
              onValueChange={() => handleToggle('showAnimations')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.showAnimations ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>
    </View>
  );

  const renderNotificationsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        <Text style={styles.sectionDescription}>Configure how and when you receive notifications</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDescription}>Receive notifications via email</Text>
            </View>
            <Switch
              value={settings.emailNotifications}
              onValueChange={() => handleToggle('emailNotifications')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.emailNotifications ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive push notifications on mobile devices</Text>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={() => handleToggle('pushNotifications')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.pushNotifications ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>In-App Notifications</Text>
              <Text style={styles.settingDescription}>Show notifications within the application</Text>
            </View>
            <Switch
              value={settings.inAppNotifications}
              onValueChange={() => handleToggle('inAppNotifications')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.inAppNotifications ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sound Notifications</Text>
              <Text style={styles.settingDescription}>Play sounds for notifications</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={() => handleToggle('soundEnabled')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.soundEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Vibration</Text>
              <Text style={styles.settingDescription}>Vibrate device for notifications</Text>
            </View>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={() => handleToggle('vibrationEnabled')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.vibrationEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Quiet Hours</Text>
              <Text style={styles.settingDescription}>Silence notifications during specified hours</Text>
            </View>
            <Switch
              value={settings.quietHoursEnabled}
              onValueChange={() => handleToggle('quietHoursEnabled')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.quietHoursEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {settings.quietHoursEnabled && (
          <View style={styles.quietHoursContainer}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Start Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => {
                  setTimePickerType('start');
                  setShowTimePicker(true);
                }}
              >
                <Text style={styles.timeButtonText}>{settings.quietHoursStart}</Text>
                <MaterialCommunityIcons name="clock" size={20} color="#10b981" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>End Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => {
                  setTimePickerType('end');
                  setShowTimePicker(true);
                }}
              >
                <Text style={styles.timeButtonText}>{settings.quietHoursEnd}</Text>
                <MaterialCommunityIcons name="clock" size={20} color="#10b981" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderPrivacyTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        <Text style={styles.sectionDescription}>Manage your privacy and security preferences</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
              <Text style={styles.settingDescription}>Add an extra layer of security to your account</Text>
            </View>
            <Switch
              value={settings.twoFactorEnabled}
              onValueChange={() => handleToggle('twoFactorEnabled')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.twoFactorEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Session Timeout (minutes)</Text>
          <TextInput
            style={styles.textInput}
            value={settings.sessionTimeout.toString()}
            onChangeText={(text) => setSettings(prev => ({ ...prev, sessionTimeout: parseInt(text) || 30 }))}
            keyboardType="numeric"
            placeholder="30"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Data Retention (days)</Text>
          <TextInput
            style={styles.textInput}
            value={settings.dataRetentionDays.toString()}
            onChangeText={(text) => setSettings(prev => ({ ...prev, dataRetentionDays: parseInt(text) || 365 }))}
            keyboardType="numeric"
            placeholder="365"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Allow Analytics</Text>
              <Text style={styles.settingDescription}>Help improve the app by sharing usage data</Text>
            </View>
            <Switch
              value={settings.allowAnalytics}
              onValueChange={() => handleToggle('allowAnalytics')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.allowAnalytics ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Marketing Communications</Text>
              <Text style={styles.settingDescription}>Receive promotional emails and updates</Text>
            </View>
            <Switch
              value={settings.allowMarketing}
              onValueChange={() => handleToggle('allowMarketing')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.allowMarketing ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Location Sharing</Text>
              <Text style={styles.settingDescription}>Share your location with event organizers</Text>
            </View>
            <Switch
              value={settings.locationSharing}
              onValueChange={() => handleToggle('locationSharing')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.locationSharing ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>
    </View>
  );

  const renderMobileTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mobile Settings</Text>
        <Text style={styles.sectionDescription}>Configure mobile app preferences</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Mobile Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive push notifications on mobile devices</Text>
            </View>
            <Switch
              value={settings.mobilePushEnabled}
              onValueChange={() => handleToggle('mobilePushEnabled')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.mobilePushEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Offline Mode</Text>
              <Text style={styles.settingDescription}>Allow the app to work without internet connection</Text>
            </View>
            <Switch
              value={settings.offlineModeEnabled}
              onValueChange={() => handleToggle('offlineModeEnabled')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.offlineModeEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>Provide tactile feedback for interactions</Text>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={() => handleToggle('hapticFeedback')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.hapticFeedback ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto Lock</Text>
              <Text style={styles.settingDescription}>Automatically lock the app after inactivity</Text>
            </View>
            <Switch
              value={settings.autoLockEnabled}
              onValueChange={() => handleToggle('autoLockEnabled')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.autoLockEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>
    </View>
  );

  const renderAdvancedTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advanced Settings</Text>
        <Text style={styles.sectionDescription}>Advanced configuration options for power users</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Debug Mode</Text>
              <Text style={styles.settingDescription}>Enable debug logging and developer tools</Text>
            </View>
            <Switch
              value={settings.debugMode}
              onValueChange={() => handleToggle('debugMode')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.debugMode ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Performance Mode</Text>
              <Text style={styles.settingDescription}>Optimize for performance over visual effects</Text>
            </View>
            <Switch
              value={settings.performanceMode}
              onValueChange={() => handleToggle('performanceMode')}
              trackColor={{ false: '#767577', true: '#10b981' }}
              thumbColor={settings.performanceMode ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>API Endpoint</Text>
          <TextInput
            style={styles.textInput}
            value={settings.apiEndpoint}
            onChangeText={(text) => setSettings(prev => ({ ...prev, apiEndpoint: text }))}
            placeholder="https://api.example.com"
            placeholderTextColor="#666"
          />
        </View>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'appearance':
        return renderAppearanceTab();
      case 'notifications':
        return renderNotificationsTab();
      case 'privacy':
        return renderPrivacyTab();
      case 'mobile':
        return renderMobileTab();
      case 'advanced':
        return renderAdvancedTab();
      default:
        return renderProfileTab();
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('dashboard')}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Settings</Text>
        
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}
        contentContainerStyle={styles.tabContainer}
      >
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'profile' && styles.activeTabButton]}
          onPress={() => setActiveTab('profile')}
        >
          <MaterialCommunityIcons 
            name="account" 
            size={20} 
            color={activeTab === 'profile' ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'profile' && styles.activeTabButtonText]}>
            Profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'appearance' && styles.activeTabButton]}
          onPress={() => setActiveTab('appearance')}
        >
          <MaterialCommunityIcons 
            name="palette" 
            size={20} 
            color={activeTab === 'appearance' ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'appearance' && styles.activeTabButtonText]}>
            Appearance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'notifications' && styles.activeTabButton]}
          onPress={() => setActiveTab('notifications')}
        >
          <MaterialCommunityIcons 
            name="bell" 
            size={20} 
            color={activeTab === 'notifications' ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'notifications' && styles.activeTabButtonText]}>
            Notifications
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'privacy' && styles.activeTabButton]}
          onPress={() => setActiveTab('privacy')}
        >
          <MaterialCommunityIcons 
            name="shield" 
            size={20} 
            color={activeTab === 'privacy' ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'privacy' && styles.activeTabButtonText]}>
            Privacy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'mobile' && styles.activeTabButton]}
          onPress={() => setActiveTab('mobile')}
        >
          <MaterialCommunityIcons 
            name="cellphone" 
            size={20} 
            color={activeTab === 'mobile' ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'mobile' && styles.activeTabButtonText]}>
            Mobile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'advanced' && styles.activeTabButton]}
          onPress={() => setActiveTab('advanced')}
        >
          <MaterialCommunityIcons 
            name="cog" 
            size={20} 
            color={activeTab === 'advanced' ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'advanced' && styles.activeTabButtonText]}>
            Advanced
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tab Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Select {timePickerType === 'start' ? 'Start' : 'End'} Time
            </Text>
            
            <View style={styles.timePickerContainer}>
              {/* Simple time picker using buttons */}
              {Array.from({ length: 24 }, (_, hour) => (
                <TouchableOpacity
                  key={hour}
                  style={styles.timeOption}
                  onPress={() => {
                    const time = `${hour.toString().padStart(2, '0')}:00`;
                    if (timePickerType === 'start') {
                      setSettings(prev => ({ ...prev, quietHoursStart: time }));
                    } else {
                      setSettings(prev => ({ ...prev, quietHoursEnd: time }));
                    }
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={styles.timeOptionText}>
                    {hour.toString().padStart(2, '0')}:00
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181A20',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#181A20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  tabScrollView: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tabContainer: {
    paddingHorizontal: 20,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  activeTabButton: {
    backgroundColor: '#10b981',
  },
  tabButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  activeTabButtonText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabContent: {
    paddingVertical: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 24,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  textInput: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  disabledInput: {
    backgroundColor: '#1a1a1a',
    color: '#666',
  },
  pickerContainer: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timeButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  quietHoursContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  timePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    maxHeight: 300,
  },
  timeOption: {
    width: '30%',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  timeOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 