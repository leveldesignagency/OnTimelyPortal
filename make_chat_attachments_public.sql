-- Make chat-attachments bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-attachments';

-- Ensure proper RLS policies for public access
DROP POLICY IF EXISTS "Public download access" ON storage.objects;
CREATE POLICY "Public download access" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-attachments');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated upload access" ON storage.objects;
CREATE POLICY "Authenticated upload access" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat-attachments' 
        AND auth.role() = 'authenticated'
    );

-- Allow authenticated users to update their own files
DROP POLICY IF EXISTS "Authenticated update access" ON storage.objects;
CREATE POLICY "Authenticated update access" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'chat-attachments' 
        AND auth.role() = 'authenticated'
    );

SELECT 'chat-attachments bucket is now public' as status; 