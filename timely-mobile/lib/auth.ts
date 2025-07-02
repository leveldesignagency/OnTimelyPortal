import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email: string
  name: string
  company_id: string
  role: string
  avatar?: string
  status: string
  isGuest?: boolean
  eventId?: string
}

// Store guest session in memory only
let currentGuestUser: AuthUser | null = null

// Sign in with email and password
export const signIn = async (email: string, password: string) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('Auth error:', authError.message)
      return { user: null, error: { message: authError.message } }
    }

    if (!authData.user) {
      return { user: null, error: { message: 'No user returned from authentication' } }
    }

    // Get user profile from our custom users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError.message)
      return { user: null, error: { message: 'Failed to fetch user profile' } }
    }

    const user: AuthUser = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      company_id: userProfile.company_id,
      role: userProfile.role,
      avatar: userProfile.avatar,
      status: userProfile.status
    }

    return { user, error: null }
  } catch (error) {
    console.error('Sign in error:', error)
    return { user: null, error: { message: 'An unexpected error occurred' } }
  }
}

// Sign in as guest
export const signInAsGuest = async (email: string, password: string) => {
  try {
    console.log('Attempting guest login for:', email);
    console.log('Password length:', password.length);
    
    // Use the database function to validate guest login
    const { data, error } = await supabase.rpc('validate_guest_login', {
      p_email: email,
      p_password: password
    });

    console.log('Supabase RPC response:', { data, error });

    if (error) {
      console.error('Guest login validation error:', error);
      return { error: { message: `Database error: ${error.message}` } };
    }

    if (!data || data.length === 0) {
      console.error('No guest login found for credentials');
      return { error: { message: 'No login record found for these credentials' } };
    }

    const guestLogin = data[0];
    console.log('Guest login result:', guestLogin);
    
    // Check if login is valid (not expired)
    if (!guestLogin.is_valid) {
      console.error('Guest login expired or inactive:', guestLogin.message);
      return { error: { message: guestLogin.message || 'Login credentials have expired' } };
    }

    console.log('Guest login validated successfully:', guestLogin);

    // Mark the login as accessed
    const { error: markError } = await supabase.rpc('mark_guest_login_accessed', {
      p_email: email,
      p_password: password
    });
    
    if (markError) {
      console.warn('Failed to mark login as accessed:', markError);
    }

    // Get guest details
    const { data: guestData, error: guestError } = await supabase
      .from('guests')
      .select('*, events(name, company_id)')
      .eq('id', guestLogin.guest_id)
      .single();

    console.log('Guest data fetch result:', { guestData, guestError });

    if (guestError || !guestData) {
      console.error('Error fetching guest details:', guestError);
      return { error: { message: `Failed to load guest information: ${guestError?.message || 'Unknown error'}` } };
    }

    // Construct the guest's full name from first_name and last_name
    const guestFullName = `${guestData.first_name} ${guestData.last_name}`.trim();
    console.log('Constructed guest name:', guestFullName);

    // Create a mock auth user for the guest session
    const mockAuthUser: AuthUser = {
      id: guestLogin.guest_id,
      email: guestLogin.email,
      name: guestFullName,
      role: 'guest',
      company_id: guestData.events?.company_id || '',
      avatar: guestFullName.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
      status: 'online',
      isGuest: true,
      eventId: guestLogin.event_id
    };

    // Store in memory for this session
    currentGuestUser = mockAuthUser;

    console.log('Guest login successful:', mockAuthUser);
    return { user: mockAuthUser, error: null };
  } catch (error) {
    console.error('Guest login error:', error);
    return { error: { message: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}` } };
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    // Clear guest session
    currentGuestUser = null
    
    // Sign out from Supabase (will only work if there's an active session)
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

// Get current user
export const getCurrentUser = async (): Promise<{ user: AuthUser | null; error: Error | null }> => {
  try {
    // Check if there's a guest session first
    if (currentGuestUser && currentGuestUser.role === 'guest') {
      // Validate guest session is still active
      const { data: guestLogin } = await supabase
        .from('guest_logins')
        .select('expires_at')
        .eq('guest_id', currentGuestUser.id)
        .eq('is_active', true)
        .single()
      
      if (guestLogin) {
        const now = new Date()
        const expiresAt = new Date(guestLogin.expires_at)
        
        if (now <= expiresAt) {
          return { user: currentGuestUser, error: null }
        }
      }
      
      // Guest session expired, clear it
      currentGuestUser = null
      return { user: null, error: new Error('Guest session expired') }
    }

    // Regular user authentication
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { user: null, error: error || new Error('No user found') }
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { user: null, error: profileError || new Error('Profile not found') }
    }

    const authUser: AuthUser = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      company_id: profile.company_id,
      status: 'online'
    }

    return { user: authUser, error: null }
  } catch (error) {
    console.error('Get current user error:', error)
    return { user: null, error: error as Error }
  }
}

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    // Check guest session first
    if (currentGuestUser) {
      return true
    }
    
    // Check Supabase session
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch (error) {
    console.error('Check auth error:', error)
    return false
  }
}

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      // Get user profile when signed in
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .single()

      if (userProfile) {
        const user: AuthUser = {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          company_id: userProfile.company_id,
          role: userProfile.role,
          avatar: userProfile.avatar,
          status: userProfile.status
        }
        callback(user)
      }
    } else if (event === 'SIGNED_OUT') {
      currentGuestUser = null
      callback(null)
    }
  })
} 
 

export interface AuthUser {
  id: string
  email: string
  name: string
  company_id: string
  role: string
  avatar?: string
  status: string
  isGuest?: boolean
  eventId?: string
}

// Store guest session in memory only
let currentGuestUser: AuthUser | null = null

// Sign in with email and password
export const signIn = async (email: string, password: string) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('Auth error:', authError.message)
      return { user: null, error: { message: authError.message } }
    }

    if (!authData.user) {
      return { user: null, error: { message: 'No user returned from authentication' } }
    }

    // Get user profile from our custom users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError.message)
      return { user: null, error: { message: 'Failed to fetch user profile' } }
    }

    const user: AuthUser = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      company_id: userProfile.company_id,
      role: userProfile.role,
      avatar: userProfile.avatar,
      status: userProfile.status
    }

    return { user, error: null }
  } catch (error) {
    console.error('Sign in error:', error)
    return { user: null, error: { message: 'An unexpected error occurred' } }
  }
}

// Sign in as guest
export const signInAsGuest = async (email: string, password: string) => {
  try {
    console.log('Attempting guest login for:', email);
    console.log('Password length:', password.length);
    
    // Use the database function to validate guest login
    const { data, error } = await supabase.rpc('validate_guest_login', {
      p_email: email,
      p_password: password
    });

    console.log('Supabase RPC response:', { data, error });

    if (error) {
      console.error('Guest login validation error:', error);
      return { error: { message: `Database error: ${error.message}` } };
    }

    if (!data || data.length === 0) {
      console.error('No guest login found for credentials');
      return { error: { message: 'No login record found for these credentials' } };
    }

    const guestLogin = data[0];
    console.log('Guest login result:', guestLogin);
    
    // Check if login is valid (not expired)
    if (!guestLogin.is_valid) {
      console.error('Guest login expired or inactive:', guestLogin.message);
      return { error: { message: guestLogin.message || 'Login credentials have expired' } };
    }

    console.log('Guest login validated successfully:', guestLogin);

    // Mark the login as accessed
    const { error: markError } = await supabase.rpc('mark_guest_login_accessed', {
      p_email: email,
      p_password: password
    });
    
    if (markError) {
      console.warn('Failed to mark login as accessed:', markError);
    }

    // Get guest details
    const { data: guestData, error: guestError } = await supabase
      .from('guests')
      .select('*, events(name, company_id)')
      .eq('id', guestLogin.guest_id)
      .single();

    console.log('Guest data fetch result:', { guestData, guestError });

    if (guestError || !guestData) {
      console.error('Error fetching guest details:', guestError);
      return { error: { message: `Failed to load guest information: ${guestError?.message || 'Unknown error'}` } };
    }

    // Construct the guest's full name from first_name and last_name
    const guestFullName = `${guestData.first_name} ${guestData.last_name}`.trim();
    console.log('Constructed guest name:', guestFullName);

    // Create a mock auth user for the guest session
    const mockAuthUser: AuthUser = {
      id: guestLogin.guest_id,
      email: guestLogin.email,
      name: guestFullName,
      role: 'guest',
      company_id: guestData.events?.company_id || '',
      avatar: guestFullName.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
      status: 'online',
      isGuest: true,
      eventId: guestLogin.event_id
    };

    // Store in memory for this session
    currentGuestUser = mockAuthUser;

    console.log('Guest login successful:', mockAuthUser);
    return { user: mockAuthUser, error: null };
  } catch (error) {
    console.error('Guest login error:', error);
    return { error: { message: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}` } };
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    // Clear guest session
    currentGuestUser = null
    
    // Sign out from Supabase (will only work if there's an active session)
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

// Get current user
export const getCurrentUser = async (): Promise<{ user: AuthUser | null; error: Error | null }> => {
  try {
    // Check if there's a guest session first
    if (currentGuestUser && currentGuestUser.role === 'guest') {
      // Validate guest session is still active
      const { data: guestLogin } = await supabase
        .from('guest_logins')
        .select('expires_at')
        .eq('guest_id', currentGuestUser.id)
        .eq('is_active', true)
        .single()
      
      if (guestLogin) {
        const now = new Date()
        const expiresAt = new Date(guestLogin.expires_at)
        
        if (now <= expiresAt) {
          return { user: currentGuestUser, error: null }
        }
      }
      
      // Guest session expired, clear it
      currentGuestUser = null
      return { user: null, error: new Error('Guest session expired') }
    }

    // Regular user authentication
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { user: null, error: error || new Error('No user found') }
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { user: null, error: profileError || new Error('Profile not found') }
    }

    const authUser: AuthUser = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      company_id: profile.company_id,
      status: 'online'
    }

    return { user: authUser, error: null }
  } catch (error) {
    console.error('Get current user error:', error)
    return { user: null, error: error as Error }
  }
}

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    // Check guest session first
    if (currentGuestUser) {
      return true
    }
    
    // Check Supabase session
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch (error) {
    console.error('Check auth error:', error)
    return false
  }
}

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      // Get user profile when signed in
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .single()

      if (userProfile) {
        const user: AuthUser = {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          company_id: userProfile.company_id,
          role: userProfile.role,
          avatar: userProfile.avatar,
          status: userProfile.status
        }
        callback(user)
      }
    } else if (event === 'SIGNED_OUT') {
      currentGuestUser = null
      callback(null)
    }
  })
} 
 