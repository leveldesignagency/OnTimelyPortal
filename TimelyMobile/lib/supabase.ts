import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://ijsktwmevnqgzwwuggkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc2t0d21ldm5xZ3p3d3VnZ2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDU4MTYsImV4cCI6MjA2NjI4MTgxNn0.w4eBL4hOZoAOo33ZXX-lSqQmIuSoP3fBEO1lBlpIRNw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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
  event_id: string;
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