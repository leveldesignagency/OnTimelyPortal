-- Setup Attachment System with Separate Table
-- This approach keeps your existing chat logic completely untouched

-- 1. Create the attachment table
CREATE TABLE IF NOT EXISTS guests_chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES guests_chat_messages(message_id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_guests_chat_attachments_message_id ON guests_chat_attachments(message_id);

-- 3. Set up RLS policies for the attachment table
ALTER TABLE guests_chat_attachments ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read attachments
CREATE POLICY "Allow authenticated users to read attachments" ON guests_chat_attachments
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for authenticated users to insert attachments
CREATE POLICY "Allow authenticated users to insert attachments" ON guests_chat_attachments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for public to read attachments (for guests)
CREATE POLICY "Allow public to read attachments" ON guests_chat_attachments
  FOR SELECT USING (true);

-- 4. Set up storage bucket for attachments
-- Delete existing buckets if they exist
DELETE FROM storage.buckets WHERE id IN ('chat-attachements', 'chat-attachments');

-- Create new bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/*', 'video/*', 'audio/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- 5. Set up storage policies
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-attachments' AND 
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to download
CREATE POLICY "Allow authenticated users to download attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-attachments' AND 
    auth.role() = 'authenticated'
  );

-- Allow public to download (for guests)
CREATE POLICY "Allow public to download attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-attachments'
  );

-- 6. Create function to get attachments for a message
CREATE OR REPLACE FUNCTION get_message_attachments(p_message_id UUID)
RETURNS TABLE (
  id UUID,
  file_url TEXT,
  filename TEXT,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gca.id,
    gca.file_url,
    gca.filename,
    gca.file_type,
    gca.file_size,
    gca.created_at
  FROM guests_chat_attachments gca
  WHERE gca.message_id = p_message_id
  ORDER BY gca.created_at ASC;
END;
$$;

-- 7. Create function to add attachment to a message
CREATE OR REPLACE FUNCTION add_message_attachment(
  p_message_id UUID,
  p_file_url TEXT,
  p_filename TEXT,
  p_file_type TEXT,
  p_file_size INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attachment_id UUID;
BEGIN
  INSERT INTO guests_chat_attachments (
    message_id,
    file_url,
    filename,
    file_type,
    file_size
  ) VALUES (
    p_message_id,
    p_file_url,
    p_filename,
    p_file_type,
    p_file_size
  ) RETURNING id INTO v_attachment_id;
  
  RETURN v_attachment_id;
END;
$$;

SELECT 'Attachment system setup completed successfully' as status; 