// Supabase client configuration
// Updated: 2024-08-21 - Fixed authentication flow and client initialization
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from './auth'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Config:');
console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '***SET***' : '***MISSING***');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('🔧 Creating Supabase client...');
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

console.log('🔧 Supabase client created:', supabase);
console.log('🔧 Supabase auth methods:', Object.keys(supabase.auth || {}));
console.log('🔧 Supabase auth object:', supabase.auth);

// Expose supabase to window for debugging
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
  console.log('🔧 Supabase exposed to window:', (window as any).supabase);
  console.log('🔧 Window supabase auth methods:', Object.keys((window as any).supabase?.auth || {}));
}

// Types for your database tables
export type Event = {
  id: string
  company_id: string
  name: string
  from: string
  to: string
  start_time?: string
  end_time?: string
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
    .single();
  
  if (error) throw error;
  
  // Log activity for event updates
  try {
    const event = await supabase
      .from('events')
      .select('company_id, name, created_by')
      .eq('id', id)
      .single();
    
    if (event.data) {
      await insertActivityLog({
        company_id: event.data.company_id,
        user_id: event.data.created_by || 'unknown',
        action_type: 'event_updated',
        details: {
          event_id: id,
          event_title: event.data.name,
          changes: Object.keys(updates)
        },
        event_id: id
      });
    }
  } catch (e) {
    console.warn('Failed to log event update activity:', e);
  }
  
  return data;
};

export const deleteEvent = async (id: string) => {
  // Get event details before deletion for activity logging
  const { data: event } = await supabase
    .from('events')
    .select('company_id, name, created_by')
    .eq('id', id)
    .single();
  
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  
  // Log activity for event deletion
  if (event) {
    try {
      await insertActivityLog({
        company_id: event.company_id,
        user_id: event.created_by || 'unknown',
        action_type: 'event_deleted',
        details: {
          event_title: event.name
        }
        // No event_id since event is deleted
      });
    } catch (e) {
      console.warn('Failed to log event deletion activity:', e);
    }
  }
  
  return { success: true };
};

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
  try {
    // 1. First, clean up all guest data using our comprehensive function
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc('delete_guest_completely', {
      p_guest_id: id
    });
    
    if (cleanupError) {
      console.error('Error cleaning up guest data:', cleanupError);
      throw new Error(`Failed to clean up guest data: ${cleanupError.message}`);
    }
    
    console.log('Guest data cleanup result:', cleanupResult);
    
    // 2. Then delete the guest record itself
    const { error: deleteError } = await supabase
      .from('guests')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Error deleting guest record:', deleteError);
      throw new Error(`Failed to delete guest record: ${deleteError.message}`);
    }
    
    console.log('Guest deleted successfully with complete cleanup');
    
  } catch (error) {
    console.error('Error in deleteGuest function:', error);
    throw error;
  }
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
  console.log('[addItinerary] Attempting to insert:', itinerary);
  const { data, error } = await supabase
    .from('itineraries')
    .insert(itinerary)
    .select()
    .single();
  if (error) {
    console.error('[addItinerary] Supabase insert error:', error);
    throw error;
  }
  console.log('[addItinerary] Supabase insert result:', data);
  
  // Log activity for new itineraries
  try {
    await insertActivityLog({
      company_id: itinerary.company_id,
      user_id: itinerary.created_by || 'unknown',
      action_type: 'itinerary_created',
      details: {
        event_id: itinerary.event_id,
        title: itinerary.title,
        is_draft: itinerary.is_draft
      },
      event_id: itinerary.event_id
    });
  } catch (e) {
    console.warn('Failed to log itinerary creation activity:', e);
  }
  
  return data;
};

export const updateItinerary = async (id: number, updates: Partial<Itinerary>) => {
  console.log('[updateItinerary] Called with id:', id, 'updates:', updates);
  const { data, error } = await supabase
    .from('itineraries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateItinerary] Supabase update error:', error);
    throw error;
  }
  console.log('[updateItinerary] Supabase update result:', data);
  
  // Log activity for itinerary updates
  try {
    const itinerary = await supabase
      .from('itineraries')
      .select('company_id, event_id, title, created_by')
      .eq('id', id)
      .single();
    
    if (itinerary.data) {
      await insertActivityLog({
        company_id: itinerary.data.company_id,
        user_id: itinerary.data.created_by || 'unknown',
        action_type: 'itinerary_updated',
        details: {
          event_id: itinerary.data.event_id,
          title: itinerary.data.title,
          changes: Object.keys(updates)
        },
        event_id: itinerary.data.event_id
      });
    }
  } catch (e) {
    console.warn('Failed to log itinerary update activity:', e);
  }
  
  return data;
};

export const deleteItinerary = async (id: string) => {
  // Get itinerary details before deletion for activity logging
  const { data: itinerary } = await supabase
    .from('itineraries')
    .select('company_id, event_id, title, created_by')
    .eq('id', id)
    .single();
  
  const { error } = await supabase
    .from('itineraries')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  
  // Log activity for itinerary deletion
  if (itinerary) {
    try {
      await insertActivityLog({
        company_id: itinerary.company_id,
        user_id: itinerary.created_by || 'unknown',
        action_type: 'itinerary_deleted',
        details: {
          event_id: itinerary.event_id,
          title: itinerary.title
        },
        event_id: itinerary.event_id
      });
    } catch (e) {
      console.warn('Failed to log itinerary deletion activity:', e);
    }
  }
  
  return { success: true };
};

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

export const getEventActivityFeed = async (eventId: string, companyId: string, limit = 50, offset = 0) => {
  const { data, error } = await supabase.rpc('get_event_activity_feed', {
    p_event_id: eventId,
    p_company_id: companyId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return data as Array<{
    item_type: string;
    title: string | null;
    description: string | null;
    created_at: string;
    actor_name: string | null;
    actor_email: string | null;
    source_id: string;
  }>;
};

export const exportEventData = async (eventId: string) => {
  const [messages, guests, itineraries, modules, answers, announcements, activity] = await Promise.all([
    supabase.from('guests_chat_messages').select('*').eq('event_id', eventId),
    supabase.from('guests').select('*').eq('event_id', eventId),
    supabase.from('itineraries').select('*').eq('event_id', eventId),
    supabase.from('timeline_modules').select('*').eq('event_id', eventId),
    supabase.from('guest_module_answers').select('*').eq('event_id', eventId),
    supabase.from('announcements').select('*').eq('event_id', eventId),
    supabase.from('activity_log').select('*').eq('event_id', eventId),
  ]);
  return {
    messages: messages.data || [],
    guests: guests.data || [],
    itineraries: itineraries.data || [],
    modules: modules.data || [],
    module_answers: answers.data || [],
    announcements: announcements.data || [],
    activity_log: activity.data || [],
  };
};

export const purgeEvent = async (eventId: string) => {
  // Delete DB rows in dependency-safe order
  const tasks = [
    supabase.from('guest_module_answers').delete().eq('event_id', eventId),
    supabase.from('timeline_modules').delete().eq('event_id', eventId),
    supabase.from('guests_chat_reactions').delete().in('message_id', (await supabase.from('guests_chat_messages').select('message_id').eq('event_id', eventId)).data?.map((m:any)=>m.message_id) || []),
    supabase.from('guests_chat_messages').delete().eq('event_id', eventId),
    supabase.from('announcements').delete().eq('event_id', eventId),
    supabase.from('itineraries').delete().eq('event_id', eventId),
    supabase.from('draft_itineraries').delete().eq('event_id', eventId),
    supabase.from('team_events').delete().eq('event_id', eventId),
  ];
  for (const t of tasks) { const { error } = await t; if (error) console.warn('Purge warning:', error.message); }

  // Storage buckets cleanup (best-effort)
  const buckets = ['event-images','itinerary-documents','guest-files','chat-attachments','guest_event_module_responses'];
  for (const bucket of buckets) {
    try {
      const { data: list } = await supabase.storage.from(bucket).list(undefined, { limit: 1000, search: eventId });
      const paths = (list || []).map((f:any) => f.name).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from(bucket).remove(paths);
      }
    } catch (e) {
      console.warn('Storage purge warning for bucket', bucket, e);
    }
  }

  // Finally delete the event
  const { error: delErr } = await supabase.from('events').delete().eq('id', eventId);
  if (delErr) throw delErr;
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

// Add a timeline module to the timeline_modules table
export const addTimelineModule = async (module: {
  event_id: string,
  module_type: string,
  title?: string,
  question?: string,
  time: string,
  date: string, // YYYY-MM-DD format
  label?: string,
  link?: string,
  file?: string,
  survey_data?: any,
  feedback_data?: any,
  created_by?: string
}) => {
  const { data, error } = await supabase
    .from('timeline_modules')
    .insert([module])
    .select()
    .single();
  if (error) throw error;
  return data;
}; 

// Event Add-Ons types and functions
export type EventAddon = {
  id: string;
  event_id: string;
  addon_key: string;
  enabled: boolean;
  created_at?: string;
  is_active?: boolean;
  addon_label?: string;
  addon_type?: string;
  addon_description?: string;
  addon_icon?: string;
  updated_at?: string;
};

// Fetch all add-ons for an event
export const getEventAddOns = async (eventId: string): Promise<EventAddon[]> => {
  const { data, error } = await supabase
    .from('event_addons')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as EventAddon[];
};

// Upsert (enable/disable) an add-on for an event
export const upsertEventAddon = async (addon: Omit<EventAddon, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('event_addons')
    .upsert([addon], { onConflict: 'event_id,addon_key' })
    .select()
    .single();
  if (error) throw error;
  return data as EventAddon;
}; 

export const sendGuestsChatMessage = async (messageData: {
  event_id: string;
  sender_email: string;
  sender_name: string;
  sender_type: 'guest' | 'admin';
  message_text: string;
  message_type?: string;
  attachment_url?: string;
  attachment_filename?: string;
  reply_to_message_id?: string;
  company_id: string;
}) => {
  const { data, error } = await supabase.rpc('send_guests_chat_message', messageData);
  if (error) throw error;
  
  // Log activity for chat messages
  try {
    await insertActivityLog({
      company_id: messageData.company_id,
      user_id: messageData.sender_type === 'admin' ? 
        (await supabase.auth.getUser()).data.user?.id || 'unknown' : 'guest',
      action_type: 'chat_message_sent',
      details: {
        event_id: messageData.event_id,
        message_text: messageData.message_text.substring(0, 100),
        sender_type: messageData.sender_type,
        has_attachment: !!messageData.attachment_url
      },
      event_id: messageData.event_id
    });
  } catch (e) {
    console.warn('Failed to log chat message activity:', e);
  }
  
  return data;
};

export const addGuestsChatReaction = async (reactionData: {
  message_id: string;
  user_email: string;
  emoji: string;
  company_id: string;
  event_id: string;
}) => {
  const { data, error } = await supabase.rpc('add_guests_chat_reaction_unified', reactionData);
  if (error) throw error;
  
  // Log activity for reactions
  try {
    await insertActivityLog({
      company_id: reactionData.company_id,
      user_id: 'guest', // Reactions are usually from guests
      action_type: 'chat_reaction_added',
      details: {
        event_id: reactionData.event_id,
        emoji: reactionData.emoji,
        message_id: reactionData.message_id
      },
      event_id: reactionData.event_id
    });
  } catch (e) {
    console.warn('Failed to log reaction activity:', e);
  }
  
  return data;
}; 