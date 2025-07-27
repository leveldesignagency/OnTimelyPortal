-- Check Charles Morgan's Avatar
-- This script checks what's in the avatar_url column for Charles Morgan

-- 1. Check Charles Morgan's user record
SELECT 
  id,
  name,
  email,
  avatar,  -- This is for initials
  avatar_url,  -- This should be the profile photo URL
  company_id
FROM users 
WHERE name LIKE '%Charles%' OR email LIKE '%charles%';

-- 2. Check if there are any profile photos in the user-profiles storage bucket
SELECT 
  name,
  bucket_id,
  owner,
  created_at
FROM storage.objects 
WHERE bucket_id = 'user-profiles'
AND name LIKE '%charles%';

-- 3. Test the function with the correct avatar_url column
-- Let's see what the function returns when using avatar_url
SELECT 'Charles Morgan avatar check complete!' as status; 