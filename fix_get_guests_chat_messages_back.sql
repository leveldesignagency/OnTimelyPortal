-- REVERT get_guests_chat_messages function back to original working state
CREATE OR REPLACE FUNCTION get_guests_chat_messages(p_event_id uuid, p_user_email text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
RETURNS TABLE(message_id uuid, event_id uuid, sender_email text, sender_name text, sender_type text, message_text text, message_type text, company_id uuid, created_at timestamp with time zone, reply_to_message_id uuid)
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