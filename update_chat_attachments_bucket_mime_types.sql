-- Update chat-attachments bucket to allow specific MIME types
-- This script updates the bucket configuration to allow the file types we're supporting

-- First, let's check the current bucket configuration
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'chat-attachments';

-- Update the bucket to allow our specific MIME types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
    -- Images
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    
    -- Videos
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/webm',
    'video/ogg',
    
    -- Audio
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/m4a',
    'audio/aac',
    'audio/flac',
    'audio/webm',
    
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/csv',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    'text/xml',
    
    -- Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar',
    
    -- Other common formats
    'application/rtf',
    'application/x-tex',
    'text/markdown',
    'application/x-yaml',
    'application/x-www-form-urlencoded',
    'multipart/form-data'
]
WHERE name = 'chat-attachments';

-- Verify the update
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'chat-attachments';

-- Also update the RLS policies to ensure they work with the new MIME types
-- Drop existing policies
DROP POLICY IF EXISTS "Public download access for chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload access for chat-attachments" ON storage.objects;

-- Create updated policies
CREATE POLICY "Public download access for chat-attachments" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-attachments');

CREATE POLICY "Authenticated upload access for chat-attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat-attachments' 
        AND auth.role() = 'authenticated'
    );

-- Verify policies
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
AND policyname LIKE '%chat-attachments%'; 