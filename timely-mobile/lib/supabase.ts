import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ijsktwmevnqgzwwuggkf.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc2t0d21ldm5xZ3p3d3VnZ2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDU4MTYsImV4cCI6MjA2NjI4MTgxNn0.w4eBL4hOZoAOo33ZXX-lSqQmIuSoP3fBEO1lBlpIRNw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable persistence for mobile app - use session-only auth
    storage: undefined,
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

// Types for your database tables (shared with desktop)
export type Event = {
  id: string
  company_id: string
  name: string
  from: string
  to: string
  status: string
  description?: string
  location?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

export type Guest = {
  id: string
  event_id: string
  company_id: string
  first_name: string
  middle_name?: string
  last_name: string
  email: string
  contact_number: string
  country_code: string
  id_type: string
  id_number: string
  id_country?: string
  dob?: string
  gender?: string
  group_id?: string
  group_name?: string
  next_of_kin_name?: string
  next_of_kin_email?: string
  next_of_kin_phone_country?: string
  next_of_kin_phone?: string
  dietary?: string[]
  medical?: string[]
  modules?: Record<string, any>
  module_values?: Record<string, any>
  prefix?: string
  status: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

export type User = {
  id: string
  company_id: string
  email: string
  name: string
  role: string
  avatar?: string
  status: string
  last_seen?: string
  created_at?: string
  updated_at?: string
}

// API Functions (shared functionality with desktop)
export const getEvents = async (companyId: string): Promise<Event[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching events:', error)
    throw error
  }

  return data || []
}

export const getGuests = async (eventId: string): Promise<Guest[]> => {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching guests:', error)
    throw error
  }

  return data || []
}

export const addGuest = async (guest: Omit<Guest, 'id' | 'created_at' | 'updated_at'>): Promise<Guest> => {
  const { data, error } = await supabase
    .from('guests')
    .insert([guest])
    .select()
    .single()

  if (error) {
    console.error('Error adding guest:', error)
    throw error
  }

  return data
}

export const updateGuest = async (id: string, updates: Partial<Guest>): Promise<Guest> => {
  const { data, error } = await supabase
    .from('guests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating guest:', error)
    throw error
  }

  return data
}

export const deleteGuest = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting guest:', error)
    throw error
  }
}

// Real-time subscriptions
export const subscribeToEvents = (companyId: string, callback: (payload: any) => void) => {
  return supabase
    .channel('events')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'events',
      filter: `company_id=eq.${companyId}`
    }, callback)
    .subscribe()
}

export const subscribeToGuests = (eventId: string, callback: (payload: any) => void) => {
  return supabase
    .channel('guests')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'guests',
      filter: `event_id=eq.${eventId}`
    }, callback)
    .subscribe()
}

// NEW: Mobile Timeline Functions for Guest Itineraries
export const getGuestAssignedItineraries = async (guestId: string, eventId: string): Promise<ItineraryItem[]> => {
  console.log('Fetching assigned itineraries for guest:', guestId, 'event:', eventId);
  
  try {
    const { data, error } = await supabase.rpc('get_guest_itineraries', {
      guest_id: guestId,
      event_id: eventId
    });

    if (error) {
      console.error('Error fetching guest itineraries:', error);
      throw error;
    }

    console.log('Guest itineraries fetched successfully:', data);
    return data || [];
  } catch (error) {
    console.error('Failed to fetch guest itineraries:', error);
    throw error;
  }
}

export const getEventTimelineModules = async (eventId: string): Promise<TimelineModule[]> => {
  console.log('Fetching timeline modules for event:', eventId);
  
  try {
    const { data, error } = await supabase.rpc('get_event_timeline_modules', {
      event_id: eventId
    });

    if (error) {
      console.error('Error fetching timeline modules:', error);
      throw error;
    }

    console.log('Timeline modules fetched successfully:', data);
    return data || [];
  } catch (error) {
    console.error('Failed to fetch timeline modules:', error);
    throw error;
  }
}

// Types for mobile timeline
export type ItineraryItem = {
  id: string
  title: string
  description?: string
  date: string
  start_time: string
  end_time: string
  arrival_time?: string
  location?: string
  // Module support
  module?: string
  link?: string
  file?: string
  survey?: any
  feedback?: any
}

export type TimelineModule = {
  id: string
  module_type: string
  title?: string
  question?: string
  time: string
  label?: string
  link?: string
  file?: string
  survey_data?: any
  feedback_data?: any
  created_at: string
}

// Survey and feedback submission functions
export async function submitSurveyResponse(
  guestId: string, 
  eventId: string, 
  moduleId: string, 
  rating: number, 
  comment?: string
): Promise<void> {
  console.log('Submitting survey response:', { guestId, eventId, moduleId, rating, comment });
  
  try {
    const { error } = await supabase
      .from('survey_responses')
      .insert({
        guest_id: guestId,
        event_id: eventId,
        module_id: moduleId,
        rating: rating,
        comment: comment || '',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error submitting survey response:', error);
      throw error;
    }

    console.log('Survey response submitted successfully');
  } catch (error) {
    console.error('Failed to submit survey response:', error);
    throw error;
  }
}

export async function submitFeedbackResponse(
  guestId: string, 
  eventId: string, 
  moduleId: string, 
  rating: number, 
  comment?: string
): Promise<void> {
  console.log('Submitting feedback response:', { guestId, eventId, moduleId, rating, comment });
  
  try {
    const { error } = await supabase
      .from('feedback_responses')
      .insert({
        guest_id: guestId,
        event_id: eventId,
        module_id: moduleId,
        rating: rating,
        comment: comment || '',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error submitting feedback response:', error);
      throw error;
    }

    console.log('Feedback response submitted successfully');
  } catch (error) {
    console.error('Failed to submit feedback response:', error);
    throw error;
  }
} 