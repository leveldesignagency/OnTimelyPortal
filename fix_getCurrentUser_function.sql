-- This is a frontend fix, not SQL
-- Fix getCurrentUser function in auth.ts to properly use localStorage

// Replace the getCurrentUser function in apps/desktop/renderer/src/lib/auth.ts

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // First check localStorage (for custom auth system)
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      console.log('🔍 Found user in localStorage:', parsedUser);
      return parsedUser;
    }

    // Fallback to Supabase Auth if localStorage is empty
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || !authUser.email) {
      console.log('🔍 No user found in localStorage or Supabase Auth');
      return null;
    }
    
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .single();
      
    if (error || !userProfile) {
      console.error('Failed to fetch user profile from database:', error);
      return null;
    }

    console.log('🔍 Found user via Supabase Auth:', userProfile);
    return userProfile;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}; 
 
 
 