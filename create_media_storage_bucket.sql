-- Create storage bucket for guest event module responses (photos and videos)
-- This bucket will store user-uploaded photos and videos from timeline modules

-- Create the media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guest_event_module_responses',
  'guest_event_module_responses',
  true, -- Public bucket so media can be accessed
  52428800, -- 50MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'video/mp4', 'video/mov', 'video/avi', 'video/quicktime']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the media bucket

-- Allow authenticated users to upload media
CREATE POLICY "Allow authenticated users to upload media" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'guest_event_module_responses' 
  AND auth.role() = 'authenticated'
);

-- Allow users to view media (public access)
CREATE POLICY "Allow public access to media" ON storage.objects
FOR SELECT USING (bucket_id = 'guest_event_module_responses');

-- Allow users to update their own media
CREATE POLICY "Allow users to update their own media" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'guest_event_module_responses' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own media
CREATE POLICY "Allow users to delete their own media" ON storage.objects
FOR DELETE USING (
  bucket_id = 'guest_event_module_responses' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated; 