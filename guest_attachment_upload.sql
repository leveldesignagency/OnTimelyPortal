-- Guest Attachment Upload Functions
-- These functions allow guests (non-authenticated users) to upload attachments

-- 1. Function for guests to upload files to chat-attachments bucket
CREATE OR REPLACE FUNCTION guest_upload_chat_attachment(
  p_event_id UUID,
  p_file_base64 TEXT,
  p_file_type TEXT,
  p_filename TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  file_url TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_file_path TEXT;
  v_file_name TEXT;
  v_timestamp BIGINT;
  v_file_ext TEXT;
  v_binary_data BYTEA;
BEGIN
  -- Validate inputs
  IF p_event_id IS NULL OR p_file_base64 IS NULL OR p_file_type IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL, 'Missing required parameters'::TEXT;
    RETURN;
  END IF;

  -- Generate unique filename
  v_timestamp := EXTRACT(EPOCH FROM NOW()) * 1000;
  v_file_ext := SPLIT_PART(p_file_type, '/', 2);
  IF v_file_ext = '' THEN
    v_file_ext := 'jpg';
  END IF;
  v_file_name := v_timestamp || '_' || MD5(RANDOM()::TEXT) || '.' || v_file_ext;
  v_file_path := 'chat-attachments/' || v_file_name;

  -- Decode base64 to binary
  v_binary_data := DECODE(p_file_base64, 'base64');

  -- Insert into storage.objects (this bypasses RLS since we're using SECURITY DEFINER)
  INSERT INTO storage.objects (
    bucket_id,
    name,
    owner,
    metadata,
    media_type,
    data
  ) VALUES (
    'chat-attachments',
    v_file_name,
    'anon',
    jsonb_build_object(
      'filename', p_filename,
      'file_type', p_file_type,
      'size', LENGTH(v_binary_data),
      'event_id', p_event_id::TEXT
    ),
    p_file_type,
    v_binary_data
  );

  -- Return success with public URL
  RETURN QUERY SELECT 
    TRUE, 
    'https://' || (SELECT value FROM config WHERE key = 'supabase_url') || '/storage/v1/object/public/chat-attachments/' || v_file_name,
    NULL::TEXT;
    
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, NULL, SQLERRM;
END;
$$;

-- 2. Function for guests to add attachment to message
CREATE OR REPLACE FUNCTION guest_add_message_attachment(
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
  -- Validate that the message exists and belongs to a guest
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_messages 
    WHERE message_id = p_message_id 
    AND sender_type = 'guest'
  ) THEN
    RAISE EXCEPTION 'Message not found or not a guest message';
  END IF;

  -- Insert attachment
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

-- 3. Function for guests to get attachments for a message
CREATE OR REPLACE FUNCTION guest_get_message_attachments(p_message_id UUID)
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
  -- Validate that the message exists
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_messages 
    WHERE message_id = p_message_id
  ) THEN
    RETURN;
  END IF;

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

-- 4. Grant permissions to anon users (guests)
GRANT EXECUTE ON FUNCTION guest_upload_chat_attachment(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION guest_add_message_attachment(UUID, TEXT, TEXT, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION guest_get_message_attachments(UUID) TO anon;

-- 5. Also grant to authenticated users for consistency
GRANT EXECUTE ON FUNCTION guest_upload_chat_attachment(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION guest_add_message_attachment(UUID, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION guest_get_message_attachments(UUID) TO authenticated;

-- 6. Test the functions
SELECT 'Guest attachment functions created successfully' as status; 