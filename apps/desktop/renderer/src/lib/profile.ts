import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  description?: string;
  company_role?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  name?: string;
  avatar_url?: string;
  description?: string;
  company_role?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

// Get current user's profile
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    console.log('📋 Fetching user profile for:', userId);
    
    const { data, error } = await supabase
      .rpc('get_user_profile', { user_id: userId });

    if (error) {
      console.error('❌ Error fetching user profile:', error);
      console.error('💥 Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return null;
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No profile found for user:', userId);
      return null;
    }

    console.log('✅ User profile fetched:', data[0]);
    return data[0] as UserProfile;
  } catch (error) {
    console.error('💥 Failed to fetch user profile:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (
  userId: string, 
  updates: UpdateProfileData
): Promise<boolean> => {
  try {
    console.log('🔄 Updating user profile:', { userId, updates });

    const { data, error } = await supabase
      .rpc('update_user_profile', {
        user_id_param: userId,
        new_name: updates.name || null,
        new_avatar_url: updates.avatar_url || null,
        new_description: updates.description || null,
        new_company_role: updates.company_role || null,
        new_status: updates.status || null
      });

    if (error) {
      console.error('❌ Error updating user profile:', error);
      return false;
    }

    console.log('✅ User profile updated successfully');
    return true;
  } catch (error) {
    console.error('💥 Failed to update user profile:', error);
    return false;
  }
};

// Upload profile photo
export const uploadProfilePhoto = async (userEmail: string, file: File): Promise<string | null> => {
  try {
    console.log('📸 Uploading profile photo for user email:', userEmail);

    // Get user ID from email first
    const { data: userData, error: userError } = await supabase
      .rpc('get_user_profile_by_email', { user_email: userEmail });

    if (userError || !userData || userData.length === 0) {
      console.error('❌ Could not find user by email:', userEmail);
      return null;
    }

    const userId = userData[0].id;
    console.log('👤 Found user ID:', userId);

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    console.log('📁 Uploading file:', fileName);

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('user-profiles')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Error uploading profile photo:', error);
      return null;
    }

    console.log('✅ Profile photo uploaded:', data.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('user-profiles')
      .getPublicUrl(data.path);

    const publicUrl = urlData.publicUrl;
    console.log('🔗 Profile photo public URL:', publicUrl);

    // Update user profile with new avatar URL
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_user_profile_by_email', { 
        user_email: userEmail,
        new_avatar_url: publicUrl
      });

    if (updateError || !updateResult) {
      console.error('❌ Failed to update profile with new avatar URL');
      return null;
    }

    return publicUrl;
  } catch (error) {
    console.error('💥 Failed to upload profile photo:', error);
    return null;
  }
};

// Delete profile photo
export const deleteProfilePhoto = async (userEmail: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting profile photo for user email:', userEmail);

    // Get current profile to find avatar URL
    const { data: profileData, error: profileError } = await supabase
      .rpc('get_user_profile_by_email', { user_email: userEmail });

    if (profileError || !profileData || profileData.length === 0) {
      console.log('ℹ️ No profile found for email:', userEmail);
      return true;
    }

    const profile = profileData[0];
    if (!profile.avatar_url) {
      console.log('ℹ️ No profile photo to delete');
      return true;
    }

    // Extract file path from URL
    const urlParts = profile.avatar_url.split('/');
    const fileName = `${profile.id}/${urlParts[urlParts.length - 1]}`;

    console.log('🗑️ Deleting storage file:', fileName);

    // Delete from storage
    const { error } = await supabase.storage
      .from('user-profiles')
      .remove([fileName]);

    if (error) {
      console.error('❌ Error deleting profile photo from storage:', error);
      // Continue to update profile even if storage deletion fails
    }

    // Update profile to remove avatar URL
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_user_profile_by_email', { 
        user_email: userEmail,
        new_avatar_url: null
      });

    if (updateError || !updateResult) {
      console.error('❌ Failed to update profile to remove avatar URL');
      return false;
    }

    console.log('✅ Profile photo deleted successfully');
    return true;
  } catch (error) {
    console.error('💥 Failed to delete profile photo:', error);
    return false;
  }
};

// Get avatar URL or generate initials
export const getUserAvatar = (user: { name?: string; avatar_url?: string }): string => {
  if (user.avatar_url) {
    return user.avatar_url;
  }
  
  // Generate initials as fallback
  if (!user.name) return 'U';
  const nameParts = user.name.trim().split(' ');
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
};

// Check if avatar is a URL or initials
export const isAvatarUrl = (avatar: string | null | undefined): boolean => {
  if (!avatar) return false;
  return avatar.startsWith('http') || avatar.startsWith('/') || avatar.includes('.');
}; 
 
 
 