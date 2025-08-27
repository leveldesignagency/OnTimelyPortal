import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service role client for staff operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase // Fallback to regular client if no service key

// Database types matching your existing OnTimely schema
export interface Company {
  id: string
  name: string
  subscription_plan?: string  // Optional, defaults to 'basic'
  max_users?: number          // Optional, defaults to 5
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  company_id?: string        // Optional, can be null
  email: string
  password_hash?: string     // Optional, can be null
  name: string
  role?: string              // Optional, defaults to 'user'
  avatar?: string            // Optional, defaults to ''
  status?: string            // Optional, defaults to 'offline'
  last_seen?: string         // Optional, can be null
  created_at: string
  updated_at: string
  company_name?: string      // Optional, can be null
  avatar_url?: string        // Optional, can be null
  description?: string       // Optional, can be null
  company_role?: string      // Optional, can be null
}

export interface Team {
  id: string
  company_id: string
  name: string
  description?: string
  avatar?: string
  created_by?: string
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface Chat {
  id: string
  company_id: string
  name?: string
  type: 'direct' | 'group' | 'team'
  avatar?: string
  created_by?: string
  team_id?: string
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'file' | 'image' | 'audio' | 'location'
  file_url?: string
  file_name?: string
  file_size?: number
  reply_to_id?: string
  is_edited: boolean
  edited_at?: string
  created_at: string
  updated_at: string
}

// Support ticket interface for the staff portal
export interface SupportTicket {
  id: string
  title: string
  description: string
  user_id: string
  company_id: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
  assigned_to?: string
  created_at: string
  updated_at: string
  resolved_at?: string
}

// System metrics for monitoring
export interface SystemMetric {
  id: string
  metric_name: string
  metric_value: string
  status: 'excellent' | 'good' | 'warning' | 'critical'
  target: string
  created_at: string
}
