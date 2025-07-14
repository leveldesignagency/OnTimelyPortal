import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from './auth'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ijsktwmevnqgzwwuggkf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc2t0d21ldm5xZ3p3d3VnZ2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDU4MTYsImV4cCI6MjA2NjI4MTgxNn0.w4eBL4hOZoAOo33ZXX-lSqQmIuSoP3fBEO1lBlpIRNw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Expose supabase to window for debugging
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}

// Types for your database tables
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
  time_zone?: string
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
  status?: string
  created_at?: string
  updated_at?: string
  created_by?: string
}

export type TeamEvent = {
  id: string
  team_id: string
  event_id: string
  access_level: 'full' | 'read_only' | 'limited'
  assigned_at: string
  assigned_by?: string
}

// Real-time subscription helpers
export const subscribeToEvents = (callback: (payload: any) => void) => {
  return supabase
    .channel('events')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'events' 
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

export const subscribeToItineraries = (eventId: string, callback: (payload: any) => void) => {
  return supabase
    .channel('itineraries')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'itineraries',
      filter: `event_id=eq.${eventId}`
    }, callback)
    .subscribe()
}

// ============================================
// EVENT OPERATIONS
// ============================================

// Get all events for user's company
export const getEvents = async (companyId: string) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

// Create a new event
export const createEvent = async (event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('events')
    .insert([event])
    .select()
  
  if (error) throw error
  return data[0]
}

// Update an event
export const updateEvent = async (id: string, updates: Partial<Event>) => {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) throw error
  return data[0]
}

// Delete an event
export const deleteEvent = async (id: string) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Get single event by ID
export const getEvent = async (id: string) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

// ============================================
// TEAM-EVENT OPERATIONS
// ============================================

// Assign team to event
export const assignTeamToEvent = async (teamId: string, eventId: string, assignedBy: string, accessLevel: 'full' | 'read_only' | 'limited' = 'full') => {
  const { data, error } = await supabase
    .from('team_events')
    .insert([{
      team_id: teamId,
      event_id: eventId,
      assigned_by: assignedBy,
      access_level: accessLevel
    }])
    .select()
  
  if (error) throw error
  return data[0]
}

// Get events assigned to a team
export const getTeamEvents = async (teamId: string) => {
  const { data, error } = await supabase
    .from('team_events')
    .select(`
      *,
      events (*)
    `)
    .eq('team_id', teamId)
  
  if (error) throw error
  return data
}

// Get teams assigned to an event
export const getEventTeams = async (eventId: string) => {
  const { data, error } = await supabase
    .from('team_events')
    .select(`
      *,
      teams (*)
    `)
    .eq('event_id', eventId)
  
  if (error) throw error
  return data
}

// Remove team from event
export const removeTeamFromEvent = async (teamId: string, eventId: string) => {
  const { error } = await supabase
    .from('team_events')
    .delete()
    .eq('team_id', teamId)
    .eq('event_id', eventId)
  
  if (error) throw error
}

// ============================================
// GUEST OPERATIONS (Updated)
// ============================================

export const getGuests = async (eventId: string) => {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const addGuest = async (guest: Omit<Guest, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('guests')
    .insert([guest])
    .select()
  
  if (error) throw error
  return data[0]
}

export const addMultipleGuests = async (guests: Omit<Guest, 'id' | 'created_at' | 'updated_at'>[]) => {
  const { data, error } = await supabase
    .from('guests')
    .upsert(guests, { onConflict: 'event_id,email' })
    .select()
  
  if (error) throw error
  return data
}

export const updateGuest = async (id: string, updates: Partial<Guest>) => {
  const { data, error } = await supabase
    .from('guests')
    .update(updates)
    .eq('id', id)
    .select()
  
  if (error) throw error
  return data[0]
}

export const deleteGuest = async (id: string) => {
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export const deleteGuestsByGroupId = async (groupId: string) => {
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('group_id', groupId)
  
  if (error) throw error
}

// Itinerary types and functions
export type Itinerary = {
  id: string
  event_id: string
  company_id: string
  title: string
  description?: string
  date?: string
  arrival_time?: string
  start_time?: string
  end_time?: string
  location?: string
  is_draft: boolean
  // Document Upload Module
  document_file_name?: string
  // QR Code Module
  qrcode_url?: string
  qrcode_image?: string
  // Host Contact Details Module
  contact_name?: string
  contact_country_code?: string
  contact_phone?: string
  contact_email?: string
  // Notifications Timer Module
  notification_times?: string[]
  // Grouping support
  group_id?: string
  group_name?: string
  // Legacy support
  content?: any
  created_by?: string
  created_at?: string
  updated_at?: string
}

export const getItineraries = async (eventId: string, companyId?: string, sortOrder: 'asc' | 'desc' = 'asc') => {
  let query = supabase
    .from('itineraries')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_draft', false) // Only get published itineraries
    .order('date', { ascending: sortOrder === 'asc' })
    .order('start_time', { ascending: sortOrder === 'asc' });

  // Add company filtering for extra security
  if (companyId) {
    query = query.eq('company_id', companyId)
  }

  const { data, error } = await query;

  if (error) throw error
  return data
}

export const addItinerary = async (itinerary: Omit<Itinerary, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('itineraries')
    .insert(itinerary)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateItinerary = async (id: string, updates: Partial<Itinerary>) => {
  const { data, error } = await supabase
    .from('itineraries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteItinerary = async (id: string) => {
  const { error } = await supabase
    .from('itineraries')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Bulk delete multiple itineraries
export const deleteMultipleItineraries = async (ids: string[]) => {
  const { error } = await supabase
    .from('itineraries')
    .delete()
    .in('id', ids)

  if (error) throw error
}

// Guest Drafts types and functions
export type GuestDraft = {
  id: string
  event_id: string
  company_id: string
  draft_data: any
  created_by?: string
  created_at?: string
  updated_at?: string
}

export const getGuestDrafts = async (eventId: string) => {
  const { data, error } = await supabase
    .from('guest_drafts')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const addGuestDraft = async (draft: Omit<GuestDraft, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('guest_drafts')
    .insert(draft)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateGuestDraft = async (id: string, updates: Partial<GuestDraft>) => {
  const { data, error } = await supabase
    .from('guest_drafts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteGuestDraft = async (id: string) => {
  const { error } = await supabase
    .from('guest_drafts')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Event Modules types and functions
export type EventModule = {
  id: string
  event_id: string
  company_id: string
  module_data: any
  created_by?: string
  created_at?: string
  updated_at?: string
}

export const getEventModules = async (eventId: string) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('No authenticated user found');
  }
  const { data, error } = await supabase
    .from('event_modules')
    .select('*')
    .eq('event_id', eventId)
    .eq('company_id', currentUser.company_id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
  console.log('getEventModules result:', JSON.stringify(data, null, 2));
  return data
}

export const saveEventModules = async (eventId: string, moduleData: any, createdBy?: string) => {
  // Get current user for company_id
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('No authenticated user found')
  }

  console.log('saveEventModules called with:', JSON.stringify({ eventId, companyId: currentUser.company_id, moduleData, createdBy }, null, 2));

  let upsertQuery = supabase
    .from('event_modules')
    .upsert({
      event_id: eventId,
      company_id: currentUser.company_id,
      module_data: moduleData,
      created_by: createdBy || currentUser.id
    }, { onConflict: 'event_id,company_id' })
    .select()
    .single();

  const { data, error } = await upsertQuery;

  if (error) {
    if (error instanceof Error) {
      console.error('Supabase error in saveEventModules:', error.message, error.stack, error);
    } else {
      console.error('Supabase error in saveEventModules:', error);
    }
    throw error;
  }
  console.log('saveEventModules result:', JSON.stringify(data, null, 2));
  return data
}

// Canvas Sessions types and functions
export type CanvasSession = {
  id: string
  session_id: string
  company_id: string
  session_data: any
  created_by?: string
  created_at?: string
  updated_at?: string
}

export const getCanvasSession = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('canvas_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export const saveCanvasSession = async (sessionId: string, companyId: string, sessionData: any, createdBy?: string) => {
  const { data, error } = await supabase
    .from('canvas_sessions')
    .upsert({
      session_id: sessionId,
      company_id: companyId,
      session_data: sessionData,
      created_by: createdBy
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================
// CSV CONVERSION UTILITY
// ============================================

// Convert CSV data to guest format for Supabase
export const convertCsvToGuests = (csvData: any[], eventId: string, companyId: string, createdBy: string): Omit<Guest, 'id' | 'created_at' | 'updated_at'>[] => {
  return csvData.map(row => ({
    event_id: eventId,
    company_id: companyId,
    first_name: row['First Name'] || '',
    middle_name: row['Middle Name'] || '',
    last_name: row['Last Name'] || '',
    email: row['Email'] || '',
    contact_number: row['Contact Number'] || '',
    country_code: row['Country Code'] || '+44',
    id_type: row['ID Type'] || '',
    id_number: row['ID Number'] || '',
    id_country: row['Country of Origin'] || '',
    dob: row['Date of Birth'] || undefined,
    gender: row['Gender'] || '',
    group_id: undefined,
    group_name: undefined,
    next_of_kin_name: row['Next of Kin Name'] || '',
    next_of_kin_email: row['Next of Kin Email'] || '',
    next_of_kin_phone_country: row['Next of Kin Country Code'] || '',
    next_of_kin_phone: row['Next of Kin Number'] || '',
    dietary: row['Dietary'] ? row['Dietary'].split(';').map((d: string) => d.trim()).filter(Boolean) : [],
    medical: row['Medical/Accessibility'] ? row['Medical/Accessibility'].split(';').map((m: string) => m.trim()).filter(Boolean) : [],
    modules: {},
    module_values: {},
    prefix: row['Prefix'] || '',
    status: 'pending',
    created_by: createdBy
  }));
}

// Fetch guest-itinerary assignments for an event
export const getEventAssignments = async (eventId: string) => {
  const { data, error } = await supabase.rpc('get_event_assignments', {
    event_identifier: eventId
  });
  if (error) throw error;
  // Convert to { [guestId]: string[] }
  const assignments: { [guestId: string]: string[] } = {};
  if (data && Array.isArray(data)) {
    data.forEach((row: any) => {
      const guestId = row.guest_id;
      const itineraryId = row.itinerary_id.toString();
      if (!assignments[guestId]) assignments[guestId] = [];
      assignments[guestId].push(itineraryId);
    });
  }
  return assignments;
}; 

// Validate image file before upload
export function validateImageFile(file: File): string | null {
  // Check file size (2MB = 2 * 1024 * 1024 bytes)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return 'File size must be less than 2MB';
  }
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return 'Only JPEG, PNG, and WebP images are allowed';
  }
  
  return null; // File is valid
}

// Upload an image to Supabase Storage and return the public URL
export async function uploadImageToStorage(file: File, pathPrefix: string): Promise<string> {
  // Validate file before upload
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }
  
  const fileExt = file.name.split('.').pop();
  const filePath = `${pathPrefix}/${Date.now()}.${fileExt}`;
  const { data, error } = await supabase.storage
    .from('event-images')
    .upload(filePath, file, { upsert: true });
  if (error) throw error;
  // For public buckets:
  const { publicUrl } = supabase.storage.from('event-images').getPublicUrl(filePath).data;
  return publicUrl;
} 

// Get all events for teams the user is a member of
export const getUserTeamEvents = async (userId: string) => {
  // 1. Find all team_ids where user is a member
  const { data: teamMemberships, error: teamMembershipsError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);
  if (teamMembershipsError) throw teamMembershipsError;
  const teamIds = (teamMemberships || []).map(tm => tm.team_id);
  if (teamIds.length === 0) return [];

  // 2. Find all event_ids linked to those teams
  const { data: teamEvents, error: teamEventsError } = await supabase
    .from('team_events')
    .select('event_id')
    .in('team_id', teamIds);
  if (teamEventsError) throw teamEventsError;
  const eventIds = (teamEvents || []).map(te => te.event_id);
  if (eventIds.length === 0) return [];

  // 3. Fetch all events by those IDs
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .in('id', eventIds);
  if (eventsError) throw eventsError;
  return events || [];
}; 

// Add functions for draft itineraries
export const getDraftItineraries = async (eventId: string, companyId?: string) => {
  let query = supabase
    .from('draft_itineraries')
    .select('*')
    .eq('event_id', eventId)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (companyId) {
    query = query.eq('company_id', companyId)
  }

  const { data, error } = await query;

  if (error) throw error
  return data
}

export const addDraftItinerary = async (itinerary: any) => {
  const { data, error } = await supabase
    .from('draft_itineraries')
    .insert(itinerary)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateDraftItinerary = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('draft_itineraries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteDraftItinerary = async (id: string) => {
  const { error } = await supabase
    .from('draft_itineraries')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export const publishDraftItinerary = async (draftId: string) => {
  const { data, error } = await supabase
    .rpc('publish_draft_itinerary', { draft_id: draftId })

  if (error) throw error
  return data
} 

/**
 * Insert an activity log entry for notifications/audit trail
 * @param {Object} params
 * @param {string} params.company_id - The company ID
 * @param {string} params.user_id - The user ID
 * @param {string} params.action_type - The type of action (e.g. 'event_created', 'guests_added')
 * @param {Object} [params.details] - Optional details (will be stored as JSON)
 * @param {string} [params.event_id] - Optional event ID
 */
export const insertActivityLog = async ({ company_id, user_id, action_type, details = {}, event_id }: {
  company_id: string;
  user_id: string;
  action_type: string;
  details?: Record<string, any>;
  event_id?: string;
}) => {
  const { error } = await supabase.from('activity_log').insert([
    {
      company_id,
      user_id,
      action_type,
      details,
      event_id,
    },
  ]);
  if (error) throw error;
}; 

/**
 * Subscribe to real-time changes in the activity_log table for a company
 * @param {string} companyId - The company ID to filter activity logs
 * @param {(payload: any) => void} callback - Callback for new/updated/deleted activity log entries
 * @returns {any} The Supabase channel subscription
 */
export const subscribeToActivityLog = (_companyId: string, callback: (payload: any) => void) => {
  return supabase
    .channel('activity_log')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'activity_log'
    }, callback)
    .subscribe();
}; 

export const getEventsCreatedByUser = async (userId: string, companyId: string) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('company_id', companyId)
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}; 