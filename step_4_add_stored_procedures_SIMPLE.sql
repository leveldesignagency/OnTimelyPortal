-- Add avatar_url column to guests_chat_messages table
ALTER TABLE guests_chat_messages ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER);

-- Function to send a message to the chat (WITH AVATAR SUPPORT)
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
  -- Get sender details from guests table
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

-- Function to get messages for an event (WITH AVATAR SUPPORT)
CREATE OR REPLACE FUNCTION get_guests_chat_messages(
  p_event_id UUID,
  p_user_email TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  message_id UUID,
  event_id UUID,
  sender_email TEXT,
  sender_name TEXT,
  sender_type TEXT,
  message_text TEXT,
  message_type TEXT,
  company_id UUID,
  avatar_url TEXT,
  reply_to_message_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.message_id,
    m.event_id,
    m.sender_email,
    m.sender_name,
    m.sender_type,
    m.message_text,
    m.message_type,
    m.company_id,
    m.avatar_url,
    m.reply_to_message_id,
    m.created_at
  FROM guests_chat_messages m
  WHERE m.event_id = p_event_id
  ORDER BY m.created_at ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 