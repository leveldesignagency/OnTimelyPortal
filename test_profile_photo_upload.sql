-- Test Profile Photo Upload System
-- This script tests if the user profile photo upload system is working

-- 1. Check if user-profiles storage bucket exists
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'user-profiles';

-- 2. Check if storage policies exist for user-profiles
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%user-profiles%';

-- 3. Check if users table has avatar_url column
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'avatar_url';

-- 4. Check if get_user_profile function exists
SELECT 
  proname,
  proargtypes,
  prorettype
FROM pg_proc 
WHERE proname = 'get_user_profile';

-- 5. Check if update_user_profile function exists
SELECT 
  proname,
  proargtypes,
  prorettype
FROM pg_proc 
WHERE proname = 'update_user_profile';

-- 6. Test get_user_profile function with a sample user
-- Replace 'your-user-id-here' with an actual user ID from your users table
SELECT * FROM get_user_profile('your-user-id-here');

-- 7. Check current users and their avatar_url values
SELECT 
  id,
  name,
  email,
  avatar_url,
  status,
  company_role
FROM users 
LIMIT 10; 