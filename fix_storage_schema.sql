-- Fix the guest_upload_chat_attachment_complete function to use correct storage schema
-- The issue is that the function is trying to use 'media_type' column which doesn't exist

CREATE OR REPLACE FUNCTION guest_upload_chat_attachment_complete(
  p_event_id UUID,
  p_file_base64 TEXT,
  p_file_type TEXT,
  p_filename TEXT,
  p_message_id UUID
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
  v_file_name TEXT;
  v_timestamp BIGINT;
  v_file_ext TEXT;
  v_binary_data BYTEA;
  v_public_url TEXT;
  v_attachment_id UUID;
BEGIN
  -- Validate inputs
  IF p_event_id IS NULL OR p_file_base64 IS NULL OR p_file_type IS NULL OR p_filename IS NULL OR p_message_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL, 'Missing required parameters'::TEXT;
    RETURN;
  END IF;

  -- Validate that the message exists and belongs to a guest
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_messages 
    WHERE message_id = p_message_id 
    AND sender_type = 'guest'
  ) THEN
    RETURN QUERY SELECT FALSE, NULL, 'Message not found or not a guest message'::TEXT;
    RETURN;
  END IF;

  -- Generate unique filename
  v_timestamp := EXTRACT(EPOCH FROM NOW()) * 1000;
  v_file_ext := SPLIT_PART(p_file_type, '/', 2);
  IF v_file_ext = '' THEN
    v_file_ext := 'jpg';
  END IF;
  v_file_name := v_timestamp || '_' || MD5(RANDOM()::TEXT) || '.' || v_file_ext;

  -- Decode base64 to binary
  v_binary_data := DECODE(p_file_base64, 'base64');

  -- Insert into storage.objects with correct schema
  INSERT INTO storage.objects (
    bucket_id,
    name,
    owner,
    metadata,
    data
  ) VALUES (
    'chat-attachments',
    v_file_name,
    'anon',
    jsonb_build_object(
      'filename', p_filename,
      'mimetype', p_file_type,
      'size', LENGTH(v_binary_data),
      'event_id', p_event_id::TEXT,
      'message_id', p_message_id::TEXT
    ),
    v_binary_data
  );

  -- Construct public URL
  v_public_url := 'https://ijsktwmevnqgzwwuggkf.supabase.co/storage/v1/object/public/chat-attachments/' || v_file_name;

  -- Insert into attachments table
  INSERT INTO guests_chat_attachments (
    message_id,
    file_url,
    filename,
    file_type,
    file_size
  ) VALUES (
    p_message_id,
    v_public_url,
    p_filename,
    p_file_type,
    LENGTH(v_binary_data)
  ) RETURNING id INTO v_attachment_id;

  -- Return success
  RETURN QUERY SELECT TRUE, v_public_url, NULL::TEXT;
    
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, NULL, SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION guest_upload_chat_attachment_complete(UUID, TEXT, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION guest_upload_chat_attachment_complete(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;

SELECT 'Storage schema fix applied successfully' as status; 