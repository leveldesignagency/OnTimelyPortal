import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ijsktwmevnqgzwwuggkf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc2t0d21ldm5xZ3p3d3VnZ2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDU4MTYsImV4cCI6MjA2NjI4MTgxNn0.w4eBL4hOZoAOo33ZXX-lSqQmIuSoP3fBEO1lBlpIRNw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for your database tables
export type Event = {
  id: string
  name: string
  from: string
  to: string
  status: string
  created_at?: string
  updated_at?: string
}

export type Guest = {
  id: string
  event_id: string
  firstName: string
  middleName?: string
  lastName: string
  email: string
  contactNumber: string
  countryCode: string
  idType: string
  idNumber: string
  dob?: string
  gender?: string
  groupId?: string
  groupName?: string
  modules?: Record<string, boolean>
  created_at?: string
  updated_at?: string
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

// Database operations
export const getEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

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