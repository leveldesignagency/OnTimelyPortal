import { getCurrentUser } from './auth'

// Environment variables for Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

// For web builds, we'll use the CDN approach
// For Electron builds, we'll use the bundled package
let supabaseInstance: any = null;

const initializeSupabase = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Check if we're in Electron
  const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;

  if (isElectron) {
    // In Electron, we need to dynamically import
    // This will be handled by the build process
    throw new Error('Electron builds should use the bundled Supabase package');
  } else {
    // In web browser, check if CDN is loaded
    if (typeof window === 'undefined') {
      throw new Error('Supabase client can only be used in browser environment');
    }

    if (!(window as any).supabase || !(window as any).supabase.createClient) {
      throw new Error('Supabase CDN not loaded. Please ensure the CDN script is loaded before using Supabase.');
    }

    supabaseInstance = (window as any).supabase.createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: window.localStorage,
        storageKey: 'timely-auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      global: {
        headers: {
          'X-Client-Info': 'timely-web-app'
        }
      }
    });

    // Expose supabase to window for debugging
    (window as any).supabase = supabaseInstance;
  }
  
  return supabaseInstance;
};

// Export the supabase client
export const supabase = initializeSupabase();

// Keep the getSupabase function for cases where we need async initialization
export async function getSupabase() {
  return supabase;
}

// Types for your database tables
export type SupabaseEvent = {
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
export const subscribeToEvents = async (callback: (payload: any) => void) => {
  const client = await getSupabase();
  return client
    .channel('events')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'events' 
    }, callback)
    .subscribe()
}

export const subscribeToGuests = async (eventId: string, callback: (payload: any) => void) => {
  const client = await getSupabase();
  return client
    .channel('guests')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'guests',
      filter: `event_id=eq.${eventId}`
    }, callback)
    .subscribe()
}

export const subscribeToItineraries = async (eventId: string, callback: (payload: any) => void) => {
  const client = await getSupabase();
  return client
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
export const getEvents = async (companyId: string): Promise<SupabaseEvent[]> => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('events')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

// Create a new event
export const createEvent = async (event: Omit<SupabaseEvent, 'id' | 'created_at' | 'updated_at'>) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('events')
    .insert([event])
    .select()
  
  if (error) throw error
  return data[0]
}

// Update an event
export const updateEvent = async (id: string, updates: Partial<SupabaseEvent>) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  
  // Log activity for event updates
  try {
    const event = await client
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
  const client = await getSupabase();
  const { data: event } = await client
    .from('events')
    .select('company_id, name, created_by')
    .eq('id', id)
    .single();
  
  const { error } = await client
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
  const client = await getSupabase();
  const { data, error } = await client
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
  const client = await getSupabase();
  const { data, error } = await client
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
  const client = await getSupabase();
  const { data, error } = await client
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
  const client = await getSupabase();
  const { data, error } = await client
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
  const client = await getSupabase();
  const { error } = await client
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
  const client = await getSupabase();
  const { data, error } = await client
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const addGuest = async (guest: Omit<Guest, 'id' | 'created_at' | 'updated_at'>) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('guests')
    .insert([guest])
    .select()
  
  if (error) throw error
  return data[0]
}

export const addMultipleGuests = async (guests: Omit<Guest, 'id' | 'created_at' | 'updated_at'>[]) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('guests')
    .upsert(guests, { onConflict: 'event_id,email' })
    .select()
  
  if (error) throw error
  return data
}

export const updateGuest = async (id: string, updates: Partial<Guest>) => {
  const client = await getSupabase();
  const { data, error } = await client
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
    const client = await getSupabase();
    const { data: cleanupResult, error: cleanupError } = await client.rpc('delete_guest_completely', {
      p_guest_id: id
    });
    
    if (cleanupError) {
      console.error('Error cleaning up guest data:', cleanupError);
      throw new Error(`Failed to clean up guest data: ${cleanupError.message}`);
    }
    
    console.log('Guest data cleanup result:', cleanupResult);
    
    // 2. Then delete the guest record itself
    const { error: deleteError } = await client
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
  const client = await getSupabase();
  const { error } = await client
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
  const client = await getSupabase();
  let query = client
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
  const client = await getSupabase();
  const { data, error } = await client
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
  const client = await getSupabase();
  const { data, error } = await client
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
    const itinerary = await client
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
  const client = await getSupabase();
  const { data: itinerary } = await client
    .from('itineraries')
    .select('company_id, event_id, title, created_by')
    .eq('id', id)
    .single();
  
  const { error } = await client
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
  const client = await getSupabase();
  const { error } = await client
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
  const client = await getSupabase();
  const { data, error } = await client
    .from('guest_drafts')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const addGuestDraft = async (draft: Omit<GuestDraft, 'id' | 'created_at' | 'updated_at'>) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('guest_drafts')
    .insert(draft)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateGuestDraft = async (id: string, updates: Partial<GuestDraft>) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('guest_drafts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteGuestDraft = async (id: string) => {
  const client = await getSupabase();
  const { error } = await client
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
  const client = await getSupabase();
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('No authenticated user found');
  }
  const { data, error } = await client
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
  const client = await getSupabase();
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new Error('No authenticated user found')
  }

  console.log('saveEventModules called with:', JSON.stringify({ eventId, companyId: currentUser.company_id, moduleData, createdBy }, null, 2));

  let upsertQuery = client
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
  const client = await getSupabase();
  const { data, error } = await client
    .from('canvas_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export const saveCanvasSession = async (sessionId: string, companyId: string, sessionData: any, createdBy?: string) => {
  const client = await getSupabase();
  const { data, error } = await client
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
  const client = await getSupabase();
  const { data, error } = await client.rpc('get_event_assignments', {
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
  const client = await getSupabase();
  const { data, error } = await client.storage
    .from('event-images')
    .upload(filePath, file, { upsert: true });
  if (error) throw error;
  // For public buckets:
  const { publicUrl } = client.storage.from('event-images').getPublicUrl(filePath).data;
  return publicUrl;
} 

// Get all events for teams the user is a member of
export const getUserTeamEvents = async (userId: string) => {
  // 1. Find all team_ids where user is a member
  const client = await getSupabase();
  const { data: teamMemberships, error: teamMembershipsError } = await client
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);
  if (teamMembershipsError) throw teamMembershipsError;
  const teamIds = (teamMemberships || []).map(tm => tm.team_id);
  if (teamIds.length === 0) return [];

  // 2. Find all event_ids linked to those teams
  const { data: teamEvents, error: teamEventsError } = await client
    .from('team_events')
    .select('event_id')
    .in('team_id', teamIds);
  if (teamEventsError) throw teamEventsError;
  const eventIds = (teamEvents || []).map(te => te.event_id);
  if (eventIds.length === 0) return [];

  // 3. Fetch all events by those IDs
  const { data: events, error: eventsError } = await client
    .from('events')
    .select('*')
    .in('id', eventIds);
  if (eventsError) throw eventsError;
  return events || [];
}; 

// Add functions for draft itineraries
export const getDraftItineraries = async (eventId: string, companyId?: string) => {
  const client = await getSupabase();
  let query = client
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
  const client = await getSupabase();
  const { data, error } = await client
    .from('draft_itineraries')
    .insert(itinerary)
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateDraftItinerary = async (id: string, updates: any) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('draft_itineraries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteDraftItinerary = async (id: string) => {
  const client = await getSupabase();
  const { error } = await client
    .from('draft_itineraries')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export const publishDraftItinerary = async (draftId: string) => {
  const client = await getSupabase();
  const { data, error } = await client
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
  const client = await getSupabase();
  const { error } = await client.from('activity_log').insert([
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
export const subscribeToActivityLog = async (_companyId: string, callback: (payload: any) => void) => {
  const client = await getSupabase();
  return client
    .channel('activity_log')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'activity_log'
    }, callback)
    .subscribe();
}; 

export const getEventActivityFeed = async (eventId: string, companyId: string, limit = 50, offset = 0) => {
  const client = await getSupabase();
  const { data, error } = await client.rpc('get_event_activity_feed', {
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
  const client = await getSupabase();
  const [messages, guests, itineraries, modules, answers, announcements, activity] = await Promise.all([
    client.from('guests_chat_messages').select('*').eq('event_id', eventId),
    client.from('guests').select('*').eq('event_id', eventId),
    client.from('itineraries').select('*').eq('event_id', eventId),
    client.from('timeline_modules').select('*').eq('event_id', eventId),
    client.from('guest_module_answers').select('*').eq('event_id', eventId),
    client.from('announcements').select('*').eq('event_id', eventId),
    client.from('activity_log').select('*').eq('event_id', eventId),
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
  const client = await getSupabase();
  const tasks = [
    client.from('guest_module_answers').delete().eq('event_id', eventId),
    client.from('timeline_modules').delete().eq('event_id', eventId),
    client.from('guests_chat_reactions').delete().in('message_id', (await client.from('guests_chat_messages').select('message_id').eq('event_id', eventId)).data?.map((m:any)=>m.message_id) || []),
    client.from('guests_chat_messages').delete().eq('event_id', eventId),
    client.from('announcements').delete().eq('event_id', eventId),
    client.from('itineraries').delete().eq('event_id', eventId),
    client.from('draft_itineraries').delete().eq('event_id', eventId),
    client.from('team_events').delete().eq('event_id', eventId),
  ];
  for (const t of tasks) { const { error } = await t; if (error) console.warn('Purge warning:', error.message); }

  // Storage buckets cleanup (best-effort)
  const buckets = ['event-images','itinerary-documents','guest-files','chat-attachments','guest_event_module_responses'];
  for (const bucket of buckets) {
    try {
      const { data: list } = await client.storage.from(bucket).list(undefined, { limit: 1000, search: eventId });
      const paths = (list || []).map((f:any) => f.name).filter(Boolean);
      if (paths.length > 0) {
        await client.storage.from(bucket).remove(paths);
      }
    } catch (e) {
      console.warn('Storage purge warning for bucket', bucket, e);
    }
  }

  // Finally delete the event
  const { error: delErr } = await client.from('events').delete().eq('id', eventId);
  if (delErr) throw delErr;
};

export const getEventsCreatedByUser = async (userId: string, companyId: string) => {
  const client = await getSupabase();
  const { data, error } = await client
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
  const client = await getSupabase();
  const { data, error } = await client
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
  const client = await getSupabase();
  const { data, error } = await client
    .from('event_addons')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as EventAddon[];
};

// Upsert (enable/disable) an add-on for an event
export const upsertEventAddon = async (addon: Omit<EventAddon, 'id' | 'created_at' | 'updated_at'>) => {
  const client = await getSupabase();
  const { data, error } = await client
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
  const client = await getSupabase();
  const { data, error } = await client.rpc('send_guests_chat_message', messageData);
  if (error) throw error;
  
  // Log activity for chat messages
  try {
    await insertActivityLog({
      company_id: messageData.company_id,
      user_id: messageData.sender_type === 'admin' ? 
        (await client.auth.getUser()).data.user?.id || 'unknown' : 'guest',
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
  reaction_type: string;
  reaction_value: string;
  sender_email: string;
  sender_name: string;
  sender_type: 'guest' | 'admin';
  company_id: string;
  event_id: string;
}) => {
  const client = await getSupabase();
  const { data, error } = await client.rpc('add_guests_chat_reaction_unified', reactionData);
  if (error) throw error;
  
  // Log activity for reactions
  try {
    await insertActivityLog({
      company_id: reactionData.company_id,
      user_id: reactionData.sender_type === 'admin' ? 
        (await client.auth.getUser()).data.user?.id || 'unknown' : 'guest',
      action_type: 'chat_reaction_added',
      details: {
        event_id: reactionData.event_id,
        reaction_type: reactionData.reaction_type,
        reaction_value: reactionData.reaction_value
      },
      event_id: reactionData.event_id
    });
  } catch (e) {
    console.warn('Failed to log reaction activity:', e);
  }
  
  return data;
}; 

// Get all reactions for a message
export const getMessageReactions = async (messageId: string) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('guests_chat_reactions')
    .select('*')
    .eq('message_id', messageId);
  
  if (error) throw error;
  return data;
};

// Get all messages for an event
export const getEventMessages = async (eventId: string) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('guests_chat_messages')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data;
};

// Get all announcements for an event
export const getEventAnnouncements = async (eventId: string) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('announcements')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

// Create a new announcement
export const createAnnouncement = async (announcement: {
  event_id: string;
  company_id: string;
  title: string;
  message: string;
  created_by?: string;
  scheduled_for?: string;
}) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('announcements')
    .insert([announcement])
    .select()
    .single();
  
  if (error) throw error;
  
  // Log activity for announcement creation
  try {
    await insertActivityLog({
      company_id: announcement.company_id,
      user_id: announcement.created_by || 'unknown',
      action_type: 'announcement_created',
      details: {
        event_id: announcement.event_id,
        announcement_title: announcement.title
      },
      event_id: announcement.event_id
    });
  } catch (e) {
    console.warn('Failed to log announcement activity:', e);
  }
  
  return data;
};

// Update an announcement
export const updateAnnouncement = async (id: string, updates: Partial<{
  title: string;
  message: string;
  scheduled_for?: string;
}>) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Delete an announcement
export const deleteAnnouncement = async (id: string) => {
  const client = await getSupabase();
  const { error } = await client
    .from('announcements')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Get all teams for a company
export const getTeams = async (companyId: string) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('teams')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

// Create a new team
export const createTeam = async (team: {
  name: string;
  company_id: string;
  created_by?: string;
  description?: string;
}) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('teams')
    .insert([team])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Update a team
export const updateTeam = async (id: string, updates: Partial<{
  name: string;
  description: string;
}>) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Delete a team
export const deleteTeam = async (id: string) => {
  const client = await getSupabase();
  const { error } = await client
    .from('teams')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Get team members
export const getTeamMembers = async (teamId: string) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('team_members')
    .select(`
      *,
      users:user_id (
        id,
        email,
        name,
        avatar
      )
    `)
    .eq('team_id', teamId);
  
  if (error) throw error;
  return data;
};

// Add member to team
export const addTeamMember = async (member: {
  team_id: string;
  user_id: string;
  role?: string;
  added_by?: string;
}) => {
  const client = await getSupabase();
  const { data, error } = await client
    .from('team_members')
    .insert([member])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Remove member from team
export const removeTeamMember = async (teamId: string, userId: string) => {
  const client = await getSupabase();
  const { error } = await client
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);
  
  if (error) throw error;
}; 