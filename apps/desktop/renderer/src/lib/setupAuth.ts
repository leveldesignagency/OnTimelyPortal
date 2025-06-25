import { supabase } from './supabase'
import { User } from './auth'

// Setup function to create Supabase Auth users for existing profiles
export const setupSupabaseAuth = async (): Promise<void> => {
  try {
    console.log('🔧 Setting up Supabase Auth users...')
    
    // Test users to create in Supabase Auth
    const testUsers = [
      { email: 'admin@testcompany.com', password: 'admin123' },
      { email: 'user@testcompany.com', password: 'admin123' }
    ]

    for (const testUser of testUsers) {
      const { data, error } = await supabase.auth.signUp({
        email: testUser.email,
        password: testUser.password,
        options: {
          emailRedirectTo: undefined // Skip email confirmation for development
        }
      })

      if (error && !error.message.includes('already registered')) {
        console.error(`❌ Failed to create auth user for ${testUser.email}:`, error)
      } else {
        console.log(`✅ Auth user created/exists for ${testUser.email}`)
      }
    }
    
    console.log('✅ Supabase Auth setup complete!')
  } catch (error) {
    console.error('❌ Failed to setup Supabase Auth:', error)
  }
}

// Function to get current authenticated user with profile
export const getCurrentAuthenticatedUser = async (): Promise<User | null> => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) return null

    const { data: userProfile, error } = await supabase
      .from('users')
      .select(`
        *,
        companies(id, name)
      `)
      .eq('email', authUser.email)
      .single()

    if (error || !userProfile) {
      console.error('Failed to fetch user profile:', error)
      return null
    }

    return userProfile
  } catch (error) {
    console.error('Failed to get authenticated user:', error)
    return null
  }
}

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event, session?.user?.email)
    
    if (event === 'SIGNED_IN' && session?.user) {
      // User signed in, fetch their profile
      const userProfile = await getCurrentAuthenticatedUser()
      if (userProfile) {
        // Store in localStorage for backward compatibility
        localStorage.setItem('currentUser', JSON.stringify(userProfile))
      }
      callback(userProfile)
    } else if (event === 'SIGNED_OUT') {
      // User signed out
      localStorage.removeItem('currentUser')
      callback(null)
    }
  })
} 