import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useTheme } from '../ThemeContext';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

interface Guest {
  id: string;
  event_id: string;
  email: string;
  dob?: string;
  gender?: string;
  modules?: Record<string, any>;
  created_at: string;
  updated_at: string;
  company_id: string;
  created_by: string;
  status: string;
  dietary?: string[];
  medical?: string[];
  module_values?: Record<string, any>;
  first_name: string;
  middle_name?: string;
  last_name: string;
  contact_number?: string;
  country_code?: string;
  id_type?: string;
  id_number?: string;
  id_country?: string;
  group_id?: string;
  group_name?: string;
  next_of_kin_name?: string;
  next_of_kin_email?: string;
  next_of_kin_phone_country?: string;
  next_of_kin_phone?: string;
  prefix?: string;
  event_title?: string;
  event_location?: string;
  event_start_date?: string;
  event_end_date?: string;
  auth_guest_user_id?: string;
  password?: string;
}

interface GuestsProfileProps {
  guest?: any;
}

const SECTION_CONFIG = [
  {
    title: 'Profile',
    fields: [
      { label: 'Prefix', key: 'prefix' },
      { label: 'Full Name', key: 'full_name' },
      { label: 'Gender', key: 'gender' },
      { label: 'Date of Birth', key: 'dob' },
    ],
  },
  {
    title: 'Contact Details',
    fields: [
      { label: 'Email', key: 'email' },
      { label: 'Phone', key: 'contact_number' },
      { label: 'Password', key: 'password' },
    ],
  },
  {
    title: 'Travel Credentials',
    fields: [
      { label: 'ID Type', key: 'id_type' },
      { label: 'ID Number', key: 'id_number' },
      { label: 'ID Country', key: 'id_country' },
      // ID Upload will be added later from modules
    ],
  },
  {
    title: 'Event Information',
    fields: [
      // Event Reference will be added later from modules
      { label: 'Event Title', key: 'event_title' },
      { label: 'Event Location', key: 'event_location' },
      { label: 'Event Start Date', key: 'event_start_date' },
      { label: 'Event End Date', key: 'event_end_date' },
      { label: 'Group Name', key: 'group_name' },
    ],
  },
  {
    title: 'Next of Kin',
    fields: [
      { label: 'Next of Kin Name', key: 'next_of_kin_name' },
      { label: 'Next of Kin Email', key: 'next_of_kin_email' },
      { label: 'Next of Kin Contact Number', key: 'next_of_kin_phone' },
    ],
  },
  {
    title: 'Flight Information',
    fields: [
      // Flight Number, Flight Status, Seat Number will be added from modules
    ],
  },
  {
    title: 'Hotel Information',
    fields: [
      // Hotel Location, Hotel Booking Number will be added from modules
    ],
  },
  {
    title: 'Train Booking Number',
    fields: [
      // Train Booking Number from modules
    ],
  },
  {
    title: 'Coach Booking Number',
    fields: [
      // Coach Booking Number from modules
    ],
  },
];

function getFullName(guest: Guest) {
  return [guest.first_name, guest.middle_name, guest.last_name].filter(Boolean).join(' ');
}

function GeometricOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={{
          position: 'absolute',
          top: height * 0.18,
          right: -width * 0.15,
          width: width * 0.7,
          height: width * 0.7,
          borderRadius: width * 0.35,
          backgroundColor: 'rgba(40,40,50,0.18)',
          transform: [{ rotate: '18deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: height * 0.38,
          left: -width * 0.2,
          width: width * 0.5,
          height: width * 0.5,
          borderRadius: width * 0.25,
          backgroundColor: 'rgba(40,40,50,0.10)',
          transform: [{ rotate: '-12deg' }],
        }}
      />
    </View>
  );
}

export default function GuestsProfile({ guest: propGuest }: GuestsProfileProps) {
  const { theme } = useTheme();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});

  // Fetch guest data from Supabase
  useEffect(() => {
    async function fetchGuestData() {
      try {
        setLoading(true);
        setError(null);

        // If we have a guest prop with an ID, fetch the full guest data
        if (propGuest?.id) {
          console.log('[GuestsProfile] Fetching guest data for ID:', propGuest.id);
          
          const { data, error } = await supabase
            .from('guests')
            .select('*')
            .eq('id', propGuest.id)
            .single();

          if (error) {
            console.error('[GuestsProfile] Error fetching guest data:', error);
            setError('Failed to load guest data');
            return;
          }

          if (data) {
            console.log('[GuestsProfile] Guest data loaded:', data);
            console.log('[GuestsProfile] module_values:', data.module_values);
            console.log('[GuestsProfile] modules:', data.modules);
            setGuest(data);
            
            // Fetch event data if we have an event_id
            if (data.event_id) {
              await fetchEventData(data.event_id);
            }
          }
        } else {
          // Fallback: try to get current user from auth session
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            console.log('[GuestsProfile] Fetching guest data for email:', user.email);
            
            const { data, error } = await supabase
              .from('guests')
              .select('*')
              .eq('email', user.email)
              .single();

            if (error) {
              console.error('[GuestsProfile] Error fetching guest data by email:', error);
              setError('Failed to load guest data');
              return;
            }

            if (data) {
              console.log('[GuestsProfile] Guest data loaded by email:', data);
              console.log('[GuestsProfile] module_values:', data.module_values);
              console.log('[GuestsProfile] modules:', data.modules);
              setGuest(data);
              
              // Fetch event data if we have an event_id
              if (data.event_id) {
                await fetchEventData(data.event_id);
              }
            }
          } else {
            setError('No guest data available');
          }
        }
      } catch (err) {
        console.error('[GuestsProfile] Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    async function fetchEventData(eventId: string) {
      try {
        console.log('[GuestsProfile] Fetching event data for event_id:', eventId);
        
        // Try to fetch event data using RPC function
        const { data, error } = await supabase.rpc('get_event_homepage_data', { 
          p_event_id: eventId 
        });
        
        if (error) {
          console.error('[GuestsProfile] Error fetching event data:', error);
          // Fallback: try direct query
          const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('name, location, from, to')
            .eq('id', eventId)
            .single();
            
          if (!eventError && eventData) {
            setEventData({
              event_title: eventData.name,
              event_location: eventData.location,
              event_start_date: eventData.from,
              event_end_date: eventData.to,
            });
          }
        } else if (data && Array.isArray(data) && data.length > 0) {
          const eventInfo = data[0];
          setEventData({
            event_title: eventInfo.event_title || eventInfo.welcome_title,
            event_location: eventInfo.event_location,
            event_start_date: eventInfo.event_start_date,
            event_end_date: eventInfo.event_end_date,
          });
        }
      } catch (err) {
        console.error('[GuestsProfile] Error fetching event data:', err);
      }
    }

    fetchGuestData();
  }, [propGuest]);

  const handleToggle = (title: string) => {
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // Process module values and create dynamic sections
  const processModuleValues = (moduleValues: Record<string, any> | null) => {
    if (!moduleValues) return {};

    const MODULE_KEY_MAP: Record<string, { section: string; label: string }> = {
      flightNumber: { section: 'Flight Information', label: 'Flight Number' },
      seatNumber: { section: 'Flight Information', label: 'Seat Number' },
      eventReference: { section: 'Event Information', label: 'Event Reference' },
      hotelReservation: { section: 'Hotel Information', label: 'Hotel Reservation' },
      hotelTracker: { section: 'Hotel Information', label: 'Hotel Tracker' },
      trainBookingNumber: { section: 'Train Booking Number', label: 'Train Booking Number' },
      coachBookingNumber: { section: 'Coach Booking Number', label: 'Coach Booking Number' },
      idUpload: { section: 'Travel Credentials', label: 'ID Upload' },
      stage1TravelCompanion: { section: 'Travel Credentials', label: 'Stage 1: Travel Companion' },
    };

    const processedModules: { [key: string]: any[] } = {};

    Object.entries(moduleValues).forEach(([moduleKey, moduleDataArray]) => {
      const mapping = MODULE_KEY_MAP[moduleKey];
      if (!mapping) return;
      const { section, label } = mapping;
      const fields: any[] = [];

      if (Array.isArray(moduleDataArray)) {
        moduleDataArray.forEach((moduleData, idx) => {
          if (moduleData && typeof moduleData === 'object') {
            // For Flight Information, ensure Flight Number comes before Seat Number
            if (section === 'Flight Information') {
              if (moduleKey === 'flightNumber' && moduleData) {
                fields.push({ label: `${label}${moduleDataArray.length > 1 ? ' ' + (idx + 1) : ''}`, value: String(moduleData.flightNumber || moduleData) });
              }
            }
            // Add all other keys
            Object.entries(moduleData).forEach(([k, v]) => {
              if (v !== undefined && v !== null && v !== '') {
                // Skip flightNumber if already added
                if (section === 'Flight Information' && moduleKey === 'flightNumber' && k === 'flightNumber') return;
                fields.push({ label: `${label}${moduleDataArray.length > 1 ? ' ' + (idx + 1) : ''} - ${k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`, value: String(v) });
              }
            });
          } else if (moduleData !== undefined && moduleData !== null && moduleData !== '') {
            fields.push({ label: `${label}${moduleDataArray.length > 1 ? ' ' + (idx + 1) : ''}`, value: String(moduleData) });
          }
        });
      } else if (moduleDataArray && typeof moduleDataArray === 'object') {
        if (section === 'Flight Information' && moduleKey === 'flightNumber' && moduleDataArray) {
          fields.push({ label, value: String(moduleDataArray.flightNumber || moduleDataArray) });
        }
        Object.entries(moduleDataArray).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            if (section === 'Flight Information' && moduleKey === 'flightNumber' && k === 'flightNumber') return;
            fields.push({ label: `${label} - ${k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`, value: String(v) });
          }
        });
      } else if (moduleDataArray !== undefined && moduleDataArray !== null && moduleDataArray !== '') {
        fields.push({ label, value: String(moduleDataArray) });
      }

      if (fields.length > 0) {
        if (!processedModules[section]) processedModules[section] = [];
        // For Flight Information, always merge flightNumber fields first, then others
        if (section === 'Flight Information') {
          if (moduleKey === 'flightNumber') {
            processedModules[section] = [...fields, ...(processedModules[section] || [])];
          } else if (moduleKey === 'seatNumber') {
            processedModules[section] = [...(processedModules[section] || []), ...fields];
          } else {
            processedModules[section].push(...fields);
          }
        } else {
          processedModules[section].push(...fields);
        }
      }
    });

    return processedModules;
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={["#18181b", "#23272F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <GeometricOverlay />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (error || !guest) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={["#18181b", "#23272F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <GeometricOverlay />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'No guest data available'}</Text>
        </View>
      </View>
    );
  }

  const qrValue = guest.id;
  
  // Process module values
  const processedModules = processModuleValues(guest.module_values || null);
  
  // Merge event data with guest data
  const guestWithEventData = {
    ...guest,
    ...eventData,
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#18181b", "#23272F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GeometricOverlay />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.qrRow}>
          <QRCode value={qrValue} size={120} backgroundColor="transparent" color="#fff" />
        </View>
        <View style={styles.tableView}>
          {SECTION_CONFIG.map(section => {
            // Get base fields for this section
            let sectionFields = section.fields.map(field => {
              if (field.key === 'full_name') {
                const value = getFullName(guestWithEventData);
                return value ? { ...field, value } : null;
              }
              const value = guestWithEventData[field.key as keyof Guest];
              if (value == null || value === '') return null;
              return { ...field, value: field.key === 'password' ? '********' : String(value) };
            }).filter(Boolean);
            
            // Add module fields to the appropriate sections
            if (processedModules[section.title]) {
              sectionFields = [...sectionFields, ...processedModules[section.title]];
            }
            
            if (sectionFields.length === 0) return null;
            return (
              <View key={section.title} style={{ marginBottom: 18 }}>
                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#23272F',
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: 'rgba(255,255,255,0.13)',
                    paddingVertical: 12,
                    paddingHorizontal: 22,
                    justifyContent: 'center',
                    // Rectangle, not pill
                    borderRadius: 0,
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: 16,
                      letterSpacing: 0.2,
                    }}
                    onPress={() => handleToggle(section.title)}
                  >
                    {section.title}
                  </Text>
                </View>
                {expanded[section.title] && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 0, paddingHorizontal: 22, paddingVertical: 14, marginTop: 0 }}>
                    {sectionFields.map((field, idx) => {
                      if (!field) return null;
                      return (
                        <View key={field.key || idx} style={{ marginBottom: 10 }}>
                          <Text style={{ color: '#aaa', fontSize: 13, fontWeight: '500', marginBottom: 2, opacity: 0.7 }}>{field.label}</Text>
                          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{field.value}</Text>
                          {idx !== sectionFields.length - 1 && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 6 }} />}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#18181b',
  },
  container: {
    paddingTop: 64,
    paddingBottom: 48,
    paddingHorizontal: 0,
  },
  qrRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  tableView: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  row: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    minHeight: 48,
    position: 'relative',
    marginBottom: 8,
  },
  label: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  value: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 0,
    letterSpacing: 0.1,
  },
  divider: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
}); 