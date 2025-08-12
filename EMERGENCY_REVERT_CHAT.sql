-- EMERGENCY REVERT - Restore original working send_guests_chat_message function
-- This completely removes all the broken versions and restores the working JSON version

-- Drop ALL versions of the function to clear conflicts
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, VARCHAR, UUID);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, VARCHAR, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, INTEGER);

-- Create the original working version that returns JSON
CREATE OR REPLACE FUNCTION send_guests_chat_message(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_reply_to_message_id UUID DEFAULT NULL
  ) RETURNS JSON 
LANGUAGE plpgsql
AS $$
DECLARE
  v_message_id UUID;
  v_sender_name TEXT;
  v_sender_type TEXT;
  v_company_id UUID;
  v_avatar_url TEXT;
  v_result JSON;
BEGIN
  -- First check if it's an admin user (company user)
  SELECT 
    name,
    'admin',
    company_id,
    avatar_url
  INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
  FROM users 
  WHERE email = p_sender_email;
  
  -- If not found in users, it's a guest user
  IF v_sender_name IS NULL THEN
    SELECT 
      first_name || ' ' || last_name,
      'guest',
      company_id,
      NULL as avatar_url
    INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
    FROM guests 
    WHERE email = p_sender_email AND event_id = p_event_id;
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
  
  -- Return the result as JSON
  v_result := json_build_object(
    'success', true,
    'message_id', v_message_id,
    'sender_name', v_sender_name,
    'sender_type', v_sender_type,
    'avatar_url', v_avatar_url,
    'created_at', now()
  );
  
  RETURN v_result;
END;
$$; 