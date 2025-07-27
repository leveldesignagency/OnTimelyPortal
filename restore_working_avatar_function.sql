-- Restore Working Avatar Function
-- This restores the original working logic for avatar display

-- Update the send_guests_chat_message function to the original working logic
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);

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
BEGIN
  -- Get sender details from guests table FIRST (original working logic)
  SELECT 
    first_name || ' ' || last_name,
    'guest',
    company_id,
    COALESCE(avatar_url, NULL) as avatar_url
  INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
  FROM guests 
  WHERE email = p_sender_email AND event_id = p_event_id;
  
  -- If not found in guests, check if it's an admin (company user)
  IF v_sender_name IS NULL THEN
    SELECT 
      name,
      'admin',
      company_id,
      COALESCE(avatar_url, NULL) as avatar_url
    INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
    FROM users 
    WHERE email = p_sender_email;
  END IF;
  
  -- Debug logging
  RAISE NOTICE 'Sender: %, Name: %, Type: %, Avatar: %', p_sender_email, v_sender_name, v_sender_type, v_avatar_url;
  
  -- Insert the message
  INSERT INTO guests_chat_messages (
    event_id,
    sender_email,
    sender_name,
    sender_type,
    message_text,
    message_type,
    company_id,
    avatar_url,
    reply_to_message_id
  ) VALUES (
    p_event_id,
    p_sender_email,
    v_sender_name,
    v_sender_type,
    p_message_text,
    p_message_type,
    v_company_id,
    v_avatar_url,
    p_reply_to_message_id
  ) RETURNING message_id INTO v_message_id;
  
  -- Return the created message
  RETURN json_build_object(
    'message_id', v_message_id,
    'event_id', p_event_id,
    'sender_email', p_sender_email,
    'sender_name', v_sender_name,
    'sender_type', v_sender_type,
    'message_text', p_message_text,
    'message_type', p_message_type,
    'company_id', v_company_id,
    'avatar_url', v_avatar_url,
    'reply_to_message_id', p_reply_to_message_id,
    'created_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the setup
SELECT 'Original working avatar function restored!' as status; 