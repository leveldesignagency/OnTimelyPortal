import 'react-native-get-random-values';

// TextEncoder polyfill for React Native
if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = class TextEncoder {
    encoding = 'utf-8';
    encode(str: string) {
      const utf8: number[] = [];
      for (let i = 0; i < str.length; i++) {
        let charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
        } else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
        } else {
          i++;
          charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
        }
      }
      return new Uint8Array(utf8);
    }
    encodeInto() {
      throw new Error('encodeInto not implemented');
    }
  };
}

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, Button } from 'react-native';
import { useTheme } from '../ThemeContext';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

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
  // Travel module fields
  flight_number?: string;
  arrival_airport?: string;
  departure_date?: string;
  arrival_date?: string;
  departure_time?: string;
  arrival_time?: string;
  hotel_location?: string;
  check_in_date?: string;
  hotel_departure_date?: string;
  check_in_time?: string;
  train_booking_number?: string;
  train_station?: string;
  train_departure_date?: string;
  train_arrival_date?: string;
  train_departure_time?: string;
  train_arrival_time?: string;
  coach_booking_number?: string;
  coach_station?: string;
  coach_departure_date?: string;
  coach_arrival_date?: string;
  coach_departure_time?: string;
  coach_arrival_time?: string;
  event_reference?: string;
  id_upload_url?: string;
  id_upload_filename?: string;
  id_upload_uploaded_at?: string;
}

interface GuestsProfileProps {
  guest?: any;
  onLogout?: () => void;
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

export default function GuestsProfile({ guest: propGuest, onLogout }: GuestsProfileProps) {
  const { theme } = useTheme();
  const navigation = useNavigation();
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
            console.log('[GuestsProfile] OLD module_values (IGNORED):', data.module_values);
            console.log('[GuestsProfile] OLD modules (IGNORED):', data.modules);
            console.log('[GuestsProfile] NEW Flight data from DB columns:', {
              flight_number: data.flight_number,
              arrival_airport: data.arrival_airport,
              departure_date: data.departure_date,
              arrival_date: data.arrival_date,
              departure_time: data.departure_time,
              arrival_time: data.arrival_time
            });
            console.log('[GuestsProfile] NEW Hotel data from DB columns:', {
              hotel_location: data.hotel_location,
              check_in_date: data.check_in_date,
              hotel_departure_date: data.hotel_departure_date,
              check_in_time: data.check_in_time
            });
            console.log('[GuestsProfile] NEW Train data from DB columns:', {
              train_booking_number: data.train_booking_number,
              train_station: data.train_station,
              train_departure_date: data.train_departure_date,
              train_arrival_date: data.train_arrival_date,
              train_departure_time: data.train_departure_time,
              train_arrival_time: data.train_arrival_time
            });
            console.log('[GuestsProfile] NEW Coach data from DB columns:', {
              coach_booking_number: data.coach_booking_number,
              coach_station: data.coach_station,
              coach_departure_date: data.coach_departure_date,
              coach_arrival_date: data.coach_arrival_date,
              coach_departure_time: data.coach_departure_time,
              coach_arrival_time: data.coach_arrival_time
            });
            console.log('[GuestsProfile] NEW Event reference from DB column:', data.event_reference);
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
              console.log('[GuestsProfile] OLD module_values (IGNORED):', data.module_values);
              console.log('[GuestsProfile] OLD modules (IGNORED):', data.modules);
              console.log('[GuestsProfile] NEW Travel module fields from DB columns:', {
                flight_number: data.flight_number,
                hotel_location: data.hotel_location,
                train_booking_number: data.train_booking_number,
                coach_booking_number: data.coach_booking_number,
                event_reference: data.event_reference
              });
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

  const handleLogout = async () => {
    console.log('[GuestsProfile] Logout button pressed');
    if (onLogout) {
      console.log('[GuestsProfile] Calling onLogout prop');
      onLogout();
    } else {
      console.log('[GuestsProfile] No onLogout prop provided');
    }
  };

  // Helper function to format time from HH:MM:SS to HH:MM
  const formatTime = (timeString: string): string => {
    if (!timeString) return timeString;
    // If the time includes seconds (HH:MM:SS), strip them to get HH:MM
    if (timeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
      return timeString.substring(0, 5); // Get first 5 characters (HH:MM)
    }
    return timeString; // Already in HH:MM format or invalid format
  };

  // Helper function to format date for display
  const formatDate = (dateString: string): string => {
    if (!dateString) return dateString;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Process module values and create dynamic sections - Updated to handle travel modules properly
  const processModuleValues = (guest: Guest) => {
    const processedModules: { [key: string]: any[] } = {};

    // Flight Information
    const flightFields: any[] = [];
    if (guest.flight_number) {
      flightFields.push({ label: 'Flight Number', value: guest.flight_number });
    }
    if (guest.arrival_airport) {
      flightFields.push({ label: 'Arrival Airport', value: guest.arrival_airport });
    }
    if (guest.departure_date) {
      flightFields.push({ label: 'Departure Date', value: formatDate(guest.departure_date) });
    }
    if (guest.arrival_date) {
      flightFields.push({ label: 'Arrival Date', value: formatDate(guest.arrival_date) });
    }
    if (guest.departure_time) {
      flightFields.push({ label: 'Departure Time', value: formatTime(guest.departure_time) });
    }
    if (guest.arrival_time) {
      flightFields.push({ label: 'Arrival Time', value: formatTime(guest.arrival_time) });
    }

    if (flightFields.length > 0) {
      processedModules['Flight Information'] = flightFields;
    }

    // Hotel Information  
    const hotelFields: any[] = [];
    if (guest.hotel_location) {
      hotelFields.push({ label: 'Hotel Location', value: guest.hotel_location });
    }
    if (guest.check_in_date) {
      hotelFields.push({ label: 'Check-in Date', value: formatDate(guest.check_in_date) });
              }
    if (guest.hotel_departure_date) {
      hotelFields.push({ label: 'Departure Date', value: formatDate(guest.hotel_departure_date) });
    }
    if (guest.check_in_time) {
      hotelFields.push({ label: 'Check-in Time', value: formatTime(guest.check_in_time) });
    }
    if (hotelFields.length > 0) {
      processedModules['Hotel Information'] = hotelFields;
    }

    // Train Information
    const trainFields: any[] = [];
    if (guest.train_booking_number) {
      trainFields.push({ label: 'Booking Number', value: guest.train_booking_number });
    }
    if (guest.train_station) {
      trainFields.push({ label: 'Station', value: guest.train_station });
              }
    if (guest.train_departure_date) {
      trainFields.push({ label: 'Departure Date', value: formatDate(guest.train_departure_date) });
          }
    if (guest.train_arrival_date) {
      trainFields.push({ label: 'Arrival Date', value: formatDate(guest.train_arrival_date) });
    }
    if (guest.train_departure_time) {
      trainFields.push({ label: 'Departure Time', value: formatTime(guest.train_departure_time) });
    }
    if (guest.train_arrival_time) {
      trainFields.push({ label: 'Arrival Time', value: formatTime(guest.train_arrival_time) });
        }
    if (trainFields.length > 0) {
      processedModules['Train Booking Number'] = trainFields;
    }

    // Coach Information
    const coachFields: any[] = [];
    if (guest.coach_booking_number) {
      coachFields.push({ label: 'Booking Number', value: guest.coach_booking_number });
    }
    if (guest.coach_station) {
      coachFields.push({ label: 'Station', value: guest.coach_station });
    }
    if (guest.coach_departure_date) {
      coachFields.push({ label: 'Departure Date', value: formatDate(guest.coach_departure_date) });
    }
    if (guest.coach_arrival_date) {
      coachFields.push({ label: 'Arrival Date', value: formatDate(guest.coach_arrival_date) });
          }
    if (guest.coach_departure_time) {
      coachFields.push({ label: 'Departure Time', value: formatTime(guest.coach_departure_time) });
    }
    if (guest.coach_arrival_time) {
      coachFields.push({ label: 'Arrival Time', value: formatTime(guest.coach_arrival_time) });
      }
    if (coachFields.length > 0) {
      processedModules['Coach Booking Number'] = coachFields;
    }

    // Event Reference
    if (guest.event_reference) {
      processedModules['Event Information'] = [
        ...(processedModules['Event Information'] || []),
        { label: 'Event Reference', value: guest.event_reference }
      ];
    }

    // ID Upload information
    if (guest.id_upload_url || guest.id_upload_filename) {
      const idFields: any[] = [];
      if (guest.id_upload_filename) {
        idFields.push({ label: 'ID Document', value: guest.id_upload_filename });
      }
      if (guest.id_upload_uploaded_at) {
        idFields.push({ label: 'Uploaded At', value: formatDate(guest.id_upload_uploaded_at) });
      }
      if (idFields.length > 0) {
        processedModules['Travel Credentials'] = [
          ...(processedModules['Travel Credentials'] || []),
          ...idFields
        ];
        }
      }

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
  const processedModules = processModuleValues(guest);
  console.log('[GuestsProfile] Processed modules:', processedModules);
  console.log('[GuestsProfile] Number of processed module sections:', Object.keys(processedModules).length);
  
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
              console.log(`[GuestsProfile] Added ${processedModules[section.title].length} module fields to section: ${section.title}`);
            }
            
            console.log(`[GuestsProfile] Section "${section.title}" has ${sectionFields.length} total fields`);
            if (sectionFields.length === 0) {
              console.log(`[GuestsProfile] Skipping empty section: ${section.title}`);
              return null;
            }
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
        <Button title="Log Out" onPress={handleLogout} color="#ef4444" />
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