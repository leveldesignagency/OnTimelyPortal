-- Fix storage policies for guest_event_module_responses bucket
-- Allow guests to upload media to their own folder

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to upload media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to media" ON storage.objects;

-- Create new policy that allows guests to upload to their own folder
CREATE POLICY "Allow guests to upload media to their folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'guest_event_module_responses' 
  AND (
    -- Allow authenticated users (for testing/admin purposes)
    auth.role() = 'authenticated'
    OR
    -- Allow guests to upload to their own folder
    (auth.role() = 'anon' AND 
     (storage.foldername(name))[1]::uuid IN (
       SELECT id FROM guests WHERE id = (storage.foldername(name))[1]::uuid
     ))
  )
);

-- Allow public access to view media
CREATE POLICY "Allow public access to media" ON storage.objects
FOR SELECT USING (bucket_id = 'guest_event_module_responses');

-- Allow guests to update their own media
CREATE POLICY "Allow guests to update their own media" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'guest_event_module_responses' 
  AND (
    auth.role() = 'authenticated'
    OR
    (auth.role() = 'anon' AND 
     (storage.foldername(name))[1]::uuid IN (
       SELECT id FROM guests WHERE id = (storage.foldername(name))[1]::uuid
     ))
  )
);

-- Allow guests to delete their own media
CREATE POLICY "Allow guests to delete their own media" ON storage.objects
FOR DELETE USING (
  bucket_id = 'guest_event_module_responses' 
  AND (
    auth.role() = 'authenticated'
    OR
    (auth.role() = 'anon' AND 
     (storage.foldername(name))[1]::uuid IN (
       SELECT id FROM guests WHERE id = (storage.foldername(name))[1]::uuid
     ))
  )
);

-- Grant necessary permissions to anon users as well
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO anon; 