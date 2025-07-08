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

// Enhanced login with custom authentication (matching existing database structure)
export const login = async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
  try {
    // Use a custom function to verify password against password_hash
    const { data: loginResult, error: loginError } = await supabase.rpc('login_user', {
      user_email: email,
      user_password: password
    })

    if (loginError) {
      console.error('Login error:', loginError)
      return { user: null, error: 'Invalid login credentials' }
    }

    if (!loginResult || loginResult.length === 0) {
      return { user: null, error: 'Invalid login credentials' }
    }

    const userProfile = loginResult[0]

    // Update user status to online
    await updateUserStatus(userProfile.id, 'online')

    // Store user in localStorage for session management
    localStorage.setItem('currentUser', JSON.stringify(userProfile))

    console.log(`✅ User logged in successfully to company: ${userProfile.company_name}`)

    // Log the Supabase session after login
    supabase.auth.getSession().then(console.log)

    return { user: userProfile, error: null }

  } catch (error) {
    console.error('Login failed:', error)
    return { user: null, error: 'Login failed. Please try again.' }
  }
}

export const logout = async (): Promise<void> => {
  try {
    const currentUser = await getCurrentUser()
    if (currentUser) {
      // Update status to offline before logout
      await updateUserStatus(currentUser.id, 'offline')
    }
    
    // Clear localStorage session
    localStorage.removeItem('currentUser')
    
    console.log('✅ User logged out successfully')
  } catch (error) {
    console.error('Logout error:', error)
    // Still clear session even if status update fails
    localStorage.removeItem('currentUser')
  }
}

// New async getCurrentUser implementation
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    if (error || !userProfile) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
    return userProfile;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

// New function to get current Supabase user
export const getCurrentSupabaseUser = async (): Promise<User | null> => {
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
    console.error('Failed to get current Supabase user:', error)
    return null
  }
}

// Function to create Supabase auth users for existing profiles
export const createSupabaseAuthUsers = async (): Promise<void> => {
  try {
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
        console.error(`Failed to create auth user for ${testUser.email}:`, error)
      } else {
        console.log(`✅ Auth user created/exists for ${testUser.email}`)
      }
    }
  } catch (error) {
    console.error('Failed to create Supabase auth users:', error)
  }
}

export const updateUserStatus = async (userId: string, status: User['status']): Promise<void> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ status, last_seen: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error
  } catch (error) {
    console.error('Failed to update user status:', error)
  }
}

// Enhanced company users function with strict isolation
export const getCompanyUsers = async (companyId: string): Promise<User[]> => {
  try {
    console.log(`🔍 Loading company users for company: ${companyId}`)
    
    // Validate current user has access to this company
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      throw new Error('No authenticated user')
    }

    if (currentUser.company_id !== companyId) {
      throw new Error('Access denied: You can only access users from your own company')
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .order('name')

    if (error) {
      console.error('Database error fetching company users:', error)
      throw error
    }

    console.log(`👥 Raw company users from database:`, data)
    
    const users = data || []
    console.log(`👥 Converted company users:`, users)
    
    return users
  } catch (error) {
    console.error('Failed to fetch company users:', error)
    return []
  }
}

// New function to validate company access
export const validateCompanyAccess = async (targetCompanyId: string): Promise<boolean> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    console.error('❌ No authenticated user for company access validation');
    return false;
  }
  const hasAccess = currentUser.company_id === targetCompanyId;
  if (!hasAccess) {
    console.error(`❌ Access denied: User company ${currentUser.company_id} cannot access ${targetCompanyId}`);
  }
  return hasAccess;
};

// New function to get current user's company ID
export const getCurrentUserCompanyId = async (): Promise<string | null> => {
  const currentUser = await getCurrentUser();
  return currentUser?.company_id || null;
};

// New function to search users within company only
export const searchCompanyUsers = async (companyId: string, searchQuery: string): Promise<User[]> => {
  try {
    // Validate company access
    if (!await validateCompanyAccess(companyId)) {
      return []
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .order('name')
      .limit(10)

    if (error) throw error

    console.log(`🔍 User search results for "${searchQuery}":`, data)
    return data || []
  } catch (error) {
    console.error('Failed to search company users:', error)
    return []
  }
}

// New function to create a new company (for onboarding)
export const createNewCompany = async (
  companyName: string,
  adminEmail: string,
  adminPassword: string,
  adminName: string,
  subscriptionPlan: string = 'basic',
  maxUsers: number = 5
): Promise<{ success: boolean; companyId?: string; adminUserId?: string; error?: string }> => {
  try {
    // In production, hash the password properly
    const passwordHash = `$2b$10$dummy_hash_${Date.now()}`

    // Use the secure function from the database
    const { data, error } = await supabase
      .rpc('create_new_company', {
        p_company_name: companyName,
        p_admin_email: adminEmail,
        p_admin_password_hash: passwordHash,
        p_admin_name: adminName,
        p_subscription_plan: subscriptionPlan,
        p_max_users: maxUsers
      })

    if (error) throw error

    const result = data[0]
    return {
      success: true,
      companyId: result.company_id,
      adminUserId: result.admin_user_id
    }
  } catch (error) {
    console.error('Failed to create new company:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create company'
    }
  }
}

// Enhanced function to validate team member access
export const validateTeamMemberAccess = async (teamId: string, userId: string): Promise<boolean> => {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return false

    // Check if the team belongs to the current user's company
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('company_id')
      .eq('id', teamId)
      .single()

    if (teamError || !team) return false

    // Validate company access
    if (team.company_id !== currentUser.company_id) {
      console.error('❌ Team access denied: Team not in user\'s company')
      return false
    }

    // Check if the user belongs to the same company
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (userError || !user) return false

    return user.company_id === currentUser.company_id
  } catch (error) {
    console.error('Failed to validate team member access:', error)
    return false
  }
}

// New function to get company events
export interface Event {
  id: string
  company_id: string
  name: string
  from: string
  to: string
  status: string
  description?: string
  location?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export const getCompanyEvents = async (companyId: string): Promise<Event[]> => {
  try {
    console.log(`📅 Loading events for company: ${companyId}`)
    
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      console.error('❌ No authenticated user found')
      return []
    }

    // Validate company access
    if (!await validateCompanyAccess(companyId)) {
      console.error('❌ Access denied: User does not belong to specified company')
      return []
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('company_id', companyId)
      .order('from', { ascending: true })

    if (error) {
      console.error('❌ Failed to fetch company events:', error)
      return []
    }

    console.log(`✅ Successfully loaded ${data?.length || 0} events for company ${companyId}`)
    console.log(`📅 Events data:`, data)
    return data || []
  } catch (error) {
    console.error('Failed to load company events:', error)
    return []
  }
} 