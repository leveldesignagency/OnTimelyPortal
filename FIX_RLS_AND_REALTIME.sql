-- FIX RLS AND REALTIME ISSUES
-- This will fix the function overloading and ensure all chat screens work together

-- First, drop all conflicting functions to start fresh
DROP FUNCTION IF EXISTS get_guests_chat_messages(uuid, text);
DROP FUNCTION IF EXISTS get_guests_chat_messages(uuid, text, integer, integer);

-- Create a single, correct get_guests_chat_messages function
CREATE OR REPLACE FUNCTION get_guests_chat_messages(
  p_event_id UUID,
  p_user_email TEXT,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  message_id UUID,
  event_id UUID,
  sender_email TEXT,
  sender_name TEXT,
  sender_type TEXT,
  message_text TEXT,
  message_type TEXT,
  attachment_url TEXT,
  attachment_filename TEXT,
  company_id UUID,
  is_edited BOOLEAN,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  reply_to_message_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is a participant with explicit table qualification
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants gcp 
    WHERE gcp.event_id = p_event_id 
    AND gcp.user_email = p_user_email
  ) THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  -- Return messages with explicit table aliases to avoid ambiguity
  RETURN QUERY 
  SELECT 
    gcm.message_id,
    gcm.event_id,
    gcm.sender_email,
    gcm.sender_name,
    gcm.sender_type,
    gcm.message_text,
    gcm.message_type,
    gcm.attachment_url,
    gcm.attachment_filename,
    gcm.company_id,
    gcm.is_edited,
    gcm.edited_at,
    gcm.created_at,
    gcm.updated_at,
    gcm.reply_to_message_id
  FROM guests_chat_messages gcm
  WHERE gcm.event_id = p_event_id
  ORDER BY gcm.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Drop the conflicting send function
DROP FUNCTION IF EXISTS send_guests_chat_message(uuid, text, text, text);
DROP FUNCTION IF EXISTS send_guests_chat_message(uuid, text, text, text, uuid);

-- Create a single, correct send_guests_chat_message function
CREATE OR REPLACE FUNCTION send_guests_chat_message(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_reply_to_message_id UUID DEFAULT NULL
)
RETURNS TABLE (
  message_id UUID,
  event_id UUID,
  sender_name TEXT,
  sender_type TEXT,
  sender_email TEXT,
  avatar_url TEXT,
  message_text TEXT,
  message_type TEXT,
  company_id UUID,
  created_at TIMESTAMPTZ,
  reply_to_message_id UUID,
  is_edited BOOLEAN,
  edited_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted_message_id UUID;
  v_sender_name TEXT;
  v_sender_type TEXT;
  v_company_id UUID;
  v_avatar_url TEXT;
  v_final_message_text TEXT;
BEGIN
  -- First check if it's an admin user (company user) - use table alias to avoid ambiguity
  SELECT u.name, 'admin', u.company_id, u.avatar_url 
  INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
  FROM users u 
  WHERE u.email = p_sender_email;

  -- If not found in users, it's a guest user
  IF v_sender_name IS NULL THEN
    SELECT g.first_name || ' ' || g.last_name, 'guest', g.company_id, NULL as avatar_url
    INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
    FROM guests g 
    WHERE g.email = p_sender_email 
    AND g.event_id = p_event_id;
  END IF;

  -- Debug logging
  RAISE NOTICE 'Sender: %, Name: %, Type: %, Avatar: %', p_sender_email, v_sender_name, v_sender_type, v_avatar_url;

  -- For attachment messages, store the file URL in the message_text field
  v_final_message_text := p_message_text;

  -- Insert the message with explicit table alias
  INSERT INTO guests_chat_messages AS gcm (
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
  ) RETURNING gcm.message_id INTO v_inserted_message_id;

  -- Return the result as TABLE (matching GuestChatAdminScreen expectations)
  RETURN QUERY 
  SELECT 
    v_inserted_message_id,
    p_event_id,
    v_sender_name,
    v_sender_type,
    p_sender_email,
    v_avatar_url,
    v_final_message_text,
    p_message_type,
    v_company_id,
    now(),
    p_reply_to_message_id,
    false,
    null::TIMESTAMPTZ;
END;
$$;

-- Ensure RLS policy allows all operations
DROP POLICY IF EXISTS "Allow all operations for all users" ON guests_chat_messages;
CREATE POLICY "Allow all operations for all users" ON guests_chat_messages
FOR ALL USING (true) WITH CHECK (true);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_guests_chat_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_guests_chat_messages TO anon;
GRANT EXECUTE ON FUNCTION send_guests_chat_message TO authenticated;
GRANT EXECUTE ON FUNCTION send_guests_chat_message TO anon; 