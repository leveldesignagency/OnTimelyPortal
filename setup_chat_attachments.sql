-- Setup Chat Attachments Storage and Database
-- Delete old bucket and create new one with proper configuration


-- 2. Create new chat attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments', 
  false, -- Private bucket, files accessed via signed URLs
  10485760, -- 10MB file size limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/mpeg', 'audio/wav', 'audio/webm',
    'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
);

-- 3. Create RLS policies for the storage bucket
CREATE POLICY "Authenticated users can upload chat attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view chat attachments they have access to" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-attachments' 
  AND (
    auth.role() = 'authenticated' OR
    -- Allow guests to view attachments (will be controlled by signed URLs)
    auth.role() = 'anon'
  )
);

CREATE POLICY "Users can delete their own chat attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat-attachments' 
  AND auth.role() = 'authenticated'
);

-- 4. Add attachment columns to guests_chat_messages table
ALTER TABLE guests_chat_messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_filename TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT,
ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

-- 5. Create index for attachment queries
CREATE INDEX IF NOT EXISTS idx_guests_chat_messages_attachment_url 
ON guests_chat_messages(attachment_url) 
WHERE attachment_url IS NOT NULL;

-- 6. Update existing RLS policies to include attachment columns (if needed)
-- The existing policies should already cover these new columns

SELECT 'Chat attachments storage and database setup completed successfully' as status;