import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your app.json or app.config.js');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const getEventAddOns = async (eventId: string, email: string): Promise<any[]> => {
  const { data, error } = await supabase.rpc('get_guest_event_addons', {
    p_event_id: eventId,
    p_email: email,
  });
  if (error) throw error;
  return data || [];
};

// Delete an event
export const deleteEvent = async (id: string) => {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
    
    console.log('Event deleted successfully:', id);
    return true;
  } catch (error) {
    console.error('Exception deleting event:', error);
    throw error;
  }
};

// Update an event
export const updateEvent = async (id: string, updates: Partial<Event>) => {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) throw error
  return data[0]
};

// Types for your database tables
export type Event = {
  id: string;
  company_id: string;
  name: string;
  from: string;
  to: string;
  status: string;
  description?: string;
  location?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type Guest = {
  id: string;
  company_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  contact_number: string;
  country_code: string;
  id_type: string;
  id_number: string;
  id_country?: string;
  dob?: string;
  gender?: string;
  group_id?: string;
  group_name?: string;
  next_of_kin_name?: string;
  next_of_kin_email?: string;
  next_of_kin_phone_country?: string;
  next_of_kin_phone?: string;
  dietary?: string[];
  medical?: string[];
  modules?: Record<string, any>;
  module_values?: Record<string, any>;
  prefix?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
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
};

export type ItineraryItem = {
  id: string;
  event_id: string;
  guest_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  created_at: string;
  updated_at: string;
};

export type TimelineModule = {
  id: string;
  event_id: string;
  type: 'feedback' | 'survey' | 'photo' | 'video' | 'question';
  title: string;
  description: string;
  content: any;
  created_at: string;
  updated_at: string;
}; 