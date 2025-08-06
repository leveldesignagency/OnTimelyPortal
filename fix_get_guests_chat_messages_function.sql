-- Fix the get_guests_chat_messages function to include reply_to_message_id in return type

DROP FUNCTION IF EXISTS get_guests_chat_messages(uuid, text, integer, integer);

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
  company_id UUID,
  created_at TIMESTAMPTZ,
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
    gcm.company_id,
    gcm.created_at,
    gcm.reply_to_message_id
  FROM guests_chat_messages gcm
  WHERE gcm.event_id = p_event_id
  ORDER BY gcm.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$; 