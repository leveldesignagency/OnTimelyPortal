import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface Company {
  id: string
  name: string
  domain: string
  plan: 'Basic' | 'Professional' | 'Enterprise'
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
  admin_email: string
  phone?: string
  address?: string
  max_users: number
}

export interface User {
  id: string
  email: string
  full_name: string
  company_id: string
  role: 'admin' | 'user' | 'moderator'
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
  last_active?: string
  avatar_url?: string
}

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

export interface SystemMetric {
  id: string
  metric_name: string
  metric_value: string
  status: 'excellent' | 'good' | 'warning' | 'critical'
  target: string
  created_at: string
}
