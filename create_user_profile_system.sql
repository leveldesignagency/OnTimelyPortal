-- ============================================
-- USER PROFILE SYSTEM SETUP
-- ============================================
-- This script creates the complete user profile system with photo storage

-- Step 1: Create storage bucket for user profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-profiles',
  'user-profiles', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Step 2: Create storage policies for user profiles bucket
CREATE POLICY "Users can upload their own profile photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-profiles' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-profiles' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-profiles' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Everyone can view profile photos" ON storage.objects
FOR SELECT USING (bucket_id = 'user-profiles');

-- Step 3: Add new columns to users table for profile data
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS company_role TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy', 'offline'));

-- Step 4: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Step 5: Create function to get user profile with avatar URL
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  description TEXT,
  company_role TEXT,
  status TEXT,
  company_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.email,
    u.avatar_url,
    u.description,
    u.company_role,
    u.status,
    u.company_id,
    u.created_at,
    u.updated_at
  FROM users u
  WHERE u.id = user_id;
END;
$$;

-- Step 6: Create function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
  user_id UUID,
  new_name TEXT DEFAULT NULL,
  new_avatar_url TEXT DEFAULT NULL,
  new_description TEXT DEFAULT NULL,
  new_company_role TEXT DEFAULT NULL,
  new_status TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users 
  SET 
    name = COALESCE(new_name, name),
    avatar_url = COALESCE(new_avatar_url, avatar_url),
    description = COALESCE(new_description, description),
    company_role = COALESCE(new_company_role, company_role),
    status = COALESCE(new_status, status),
    updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;

-- Step 7: Create trigger to update chat participants when user profile changes
CREATE OR REPLACE FUNCTION update_chat_participants_on_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- This trigger ensures chat participant data stays in sync when user profile changes
  -- We don't need to update chat_participants directly since we'll fetch fresh data
  -- But we can add notification logic here if needed
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_chat_participants_on_profile_change ON users;
CREATE TRIGGER trigger_update_chat_participants_on_profile_change
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_participants_on_profile_change();

-- Step 8: Test the setup
DO $$
DECLARE
  test_bucket_exists BOOLEAN;
  test_columns_exist BOOLEAN;
BEGIN
  -- Check if bucket exists
  SELECT EXISTS(
    SELECT 1 FROM storage.buckets WHERE id = 'user-profiles'
  ) INTO test_bucket_exists;
  
  -- Check if new columns exist
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) INTO test_columns_exist;
  
  IF test_bucket_exists AND test_columns_exist THEN
    RAISE NOTICE '✅ USER PROFILE SYSTEM SETUP COMPLETE!';
    RAISE NOTICE '📷 Storage bucket: user-profiles created';
    RAISE NOTICE '🗃️ Database columns: avatar_url, description, company_role, status added';
    RAISE NOTICE '🔧 Functions: get_user_profile, update_user_profile created';
    RAISE NOTICE '🛡️ RLS policies: profile photo access configured';
  ELSE
    RAISE WARNING '❌ Setup incomplete - check logs above';
  END IF;
END $$; 