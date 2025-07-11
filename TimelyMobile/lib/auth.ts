import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
  event_id?: string;
}

export interface AuthResponse {
  user: AuthUser | null;
  error: Error | null;
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Sign in error:', error.message);
      return { user: null, error };
    }

    if (!data.user) {
      return { user: null, error: new Error('No user returned from sign in') };
    }

    // Get additional user data from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', data.user.email)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return { user: null, error: userError };
    }

    return { 
      user: {
        id: data.user.id,
        email: data.user.email!,
        role: userData.role,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at!
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Unexpected error during sign in:', error);
    return { user: null, error: error as Error };
  }
}

export async function signInAsGuest(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.rpc('validate_guest_login', {
      p_email: email,
      p_password: password,
    });

    if (error) {
      console.error('Guest sign in error:', error.message);
      return { user: null, error };
    }

    if (!data || !data[0]?.is_valid) {
      return { user: null, error: new Error('Invalid login credentials') };
    }

    // Success: data[0] contains guest_id, event_id, email, etc.
    return {
      user: {
        id: data[0].guest_id,
        email: data[0].email,
        role: 'guest',
        created_at: '',
        updated_at: '',
        event_id: data[0].event_id,
      },
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error during guest sign in:', error);
    return { user: null, error: error as Error };
  }
}

export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error.message);
      return { error };
    }
    return { error: null };
  } catch (error) {
    console.error('Unexpected error during sign out:', error);
    return { error: error as Error };
  }
}

export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Get current user error:', error.message);
      return { user: null, error };
    }

    if (!user) {
      return { user: null, error: null };
    }

    // Get additional user data from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (userError && !userError.message.includes('not found')) {
      console.error('Error fetching user data:', userError);
      return { user: null, error: userError };
    }

    // If not found in users table, check guests table
    if (!userData) {
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .select('*')
        .eq('email', user.email)
        .single();

      if (guestError) {
        console.error('Error fetching guest data:', guestError);
        return { user: null, error: guestError };
      }

      return {
        user: {
          id: user.id,
          email: user.email!,
          role: 'guest',
          created_at: user.created_at,
          updated_at: user.updated_at!
        },
        error: null
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email!,
        role: userData.role,
        created_at: user.created_at,
        updated_at: user.updated_at!
      },
      error: null
    };
  } catch (error) {
    console.error('Unexpected error getting current user:', error);
    return { user: null, error: error as Error };
  }
}

export async function guestLogin(email: string, password: string) {
  // Log credentials being sent
  console.log('[guestLogin] Attempting login with:', email, password);

  // 1. Authenticate with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  console.log('[guestLogin] signInWithPassword result:', authData, authError);
  if (authError) {
    return { error: authError, loginResult: null, guest: null };
  }

  // TEMPORARY BYPASS: Skip RPC for now
  return { error: null, loginResult: null, guest: null };

  // 2. (Optional) Validate guest login in your own table
  const { data: loginResult, error: loginError } = await supabase.rpc('validate_guest_login', {
    p_email: email,
    p_password: password,
  });
  console.log('[guestLogin] validate_guest_login result:', loginResult, loginError);
  if (loginError || !loginResult || !loginResult[0]?.is_valid) {
    return { error: loginError || new Error('Invalid login'), loginResult: null, guest: null };
  }

  // 3. Fetch guest profile if needed
  const guest_id = loginResult[0].guest_id;
  const { data: guest, error: guestError } = await supabase
    .from('guests')
    .select('*')
    .eq('id', guest_id)
    .single();
  if (guestError) {
    return { error: guestError, loginResult, guest: null };
  }
  return { error: null, loginResult: loginResult[0], guest };
} 