-- Update get_guests_chat_messages function to include avatar_url
CREATE OR REPLACE FUNCTION get_guests_chat_messages(
  p_event_id UUID,
  p_user_email TEXT,
  p_limit INTEGER DEFAULT 50,
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
  created_at TIMESTAMPTZ,
  company_id UUID,
  reply_to_message_id UUID,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants
    WHERE event_id = p_event_id AND user_email = p_user_email
  ) THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  -- Return messages with avatar_url
  RETURN QUERY
  SELECT 
    gcm.message_id,
    gcm.event_id,
    gcm.sender_email,
    gcm.sender_name,
    gcm.sender_type,
    gcm.message_text,
    gcm.message_type,
    gcm.created_at,
    gcm.company_id,
    gcm.reply_to_message_id,
    CASE 
      WHEN gcm.sender_type = 'admin' THEN u.avatar
      WHEN gcm.sender_type = 'guest' THEN g.avatar_url
      ELSE NULL
    END as avatar_url
  FROM guests_chat_messages gcm
  LEFT JOIN users u ON gcm.sender_email = u.email AND gcm.sender_type = 'admin'
  LEFT JOIN guests g ON gcm.sender_email = g.email AND gcm.sender_type = 'guest'
  WHERE gcm.event_id = p_event_id
  ORDER BY gcm.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

SELECT 'get_guests_chat_messages function updated with avatar_url' AS status; 