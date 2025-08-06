-- Simple fix for the chat function - restore the working version
-- This matches the exact signature that was working before

DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);

-- Restore the simple working version
CREATE OR REPLACE FUNCTION send_guests_chat_message(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_reply_to_message_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_message_id UUID;
  v_sender_name TEXT;
  v_sender_type TEXT;
  v_company_id UUID;
  v_avatar_url TEXT;
  v_final_message_text TEXT;
BEGIN
  -- First check if it's an admin user (company user) - use the 'avatar' column that Teams chat uses
  SELECT 
    name,
    'admin',
    company_id,
    avatar  -- Use 'avatar' column, not 'avatar_url'
  INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
  FROM users 
  WHERE email = p_sender_email;
  
  -- If not found in users, it's a guest user
  IF v_sender_name IS NULL THEN
    SELECT 
      first_name || ' ' || last_name,
      'guest',
      company_id,
      NULL as avatar_url  -- Guests don't have profile photos
    INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
    FROM guests 
    WHERE email = p_sender_email AND event_id = p_event_id;
  END IF;
  
  -- Debug logging
  RAISE NOTICE 'Sender: %, Name: %, Type: %, Avatar: %', p_sender_email, v_sender_name, v_sender_type, v_avatar_url;
  
  -- For attachment messages, store the file URL in the message_text field
  -- The mobile app will send the file URL as the message_text for attachments
  v_final_message_text := p_message_text;
  
  -- Insert the message
  INSERT INTO guests_chat_messages (
    event_id,
    sender_email,
    sender_name,
    sender_type,
    message_text,
    message_type,
    company_id,
    reply_to_message_id
  ) VALUES (
    p_event_id,
    p_sender_email,
    v_sender_name,
    v_sender_type,
    v_final_message_text,
    p_message_type,
    v_company_id,
    p_reply_to_message_id
  ) RETURNING message_id INTO v_message_id;
  
  -- Return the created message
  RETURN json_build_object(
    'message_id', v_message_id,
    'event_id', p_event_id,
    'sender_name', v_sender_name,
    'sender_type', v_sender_type,
    'sender_email', p_sender_email,
    'avatar_url', v_avatar_url,
    'message_text', v_final_message_text,
    'message_type', p_message_type,
    'company_id', v_company_id,
    'created_at', NOW(),
    'reply_to_message_id', p_reply_to_message_id,
    'is_edited', false,
    'edited_at', NULL,
    'sent_at', NOW(),
    'is_read', false,
    'read_at', NULL,
    'reactions', '[]'::json
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated, anon;

SELECT 'Simple chat function restored successfully' AS status; 