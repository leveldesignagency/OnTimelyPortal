-- Check Storage Buckets for Profile Photos
-- This script checks if the user-profiles storage bucket exists and has proper policies

-- 1. Check if user-profiles storage bucket exists
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'user-profiles';

-- 2. Check storage policies for user-profiles
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

-- 3. Check if there are any files in the user-profiles bucket
SELECT 
  name,
  bucket_id,
  owner,
  created_at,
  updated_at
FROM storage.objects 
WHERE bucket_id = 'user-profiles'
LIMIT 10;

-- 4. Test if we can access the bucket
SELECT 'Storage bucket check complete!' as status; 