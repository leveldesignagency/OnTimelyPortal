-- Create announcement_media storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'announcement_media',
  'announcement_media',
  true,
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for announcement_media bucket
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'announcement_media');

CREATE POLICY "Authenticated users can upload announcement images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'announcement_media' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own announcement images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'announcement_media' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own announcement images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'announcement_media' 
    AND auth.role() = 'authenticated'
  ); 