import { supabase } from './supabase'

export interface User {
  id: string
  company_id: string
  email: string
  name: string
  role: 'masterAdmin' | 'user'
  avatar: string
  status: 'online' | 'offline' | 'away' | 'busy'
  last_seen: string
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

// Login with email and password
export const login = async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
  try {
    // For demo purposes, we'll use simple credential matching
    // In production, you'd use proper password hashing
    const credentials = [
      { email: 'admin@testcompany.com', password: 'admin123', userId: '22222222-2222-2222-2222-222222222222' },
      { email: 'user@testcompany.com', password: 'user123', userId: '33333333-3333-3333-3333-333333333333' }
    ]

    const credential = credentials.find(c => c.email === email && c.password === password)
    
    if (!credential) {
      return { user: null, error: 'Invalid email or password' }
    }

    // Fetch user data from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', credential.userId)
      .single()

    if (userError) {
      return { user: null, error: 'Failed to fetch user data' }
    }

    // Update user status to online
    await supabase
      .from('users')
      .update({ status: 'online', last_seen: new Date().toISOString() })
      .eq('id', credential.userId)

    // Store user in localStorage for session persistence
    localStorage.setItem('timely_user', JSON.stringify(userData))

    return { user: userData, error: null }
  } catch (error) {
    return { user: null, error: 'Login failed' }
  }
}

// Logout
export const logout = async (): Promise<void> => {
  try {
    const userStr = localStorage.getItem('timely_user')
    if (userStr) {
      const user = JSON.parse(userStr)
      // Update user status to offline
      await supabase
        .from('users')
        .update({ status: 'offline', last_seen: new Date().toISOString() })
        .eq('id', user.id)
    }
    
    localStorage.removeItem('timely_user')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

// Get current user from localStorage
export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('timely_user')
    return userStr ? JSON.parse(userStr) : null
  } catch (error) {
    return null
  }
}

// Update user status
export const updateUserStatus = async (userId: string, status: User['status']): Promise<void> => {
  try {
    await supabase
      .from('users')
      .update({ status, last_seen: new Date().toISOString() })
      .eq('id', userId)
  } catch (error) {
    console.error('Failed to update user status:', error)
  }
}

// Get all users in the same company
export const getCompanyUsers = async (companyId: string): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .order('name')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch company users:', error)
    return []
  }
} 