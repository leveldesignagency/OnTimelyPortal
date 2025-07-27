-- Update get_guests_chat_messages to return avatar_url for admin messages
DROP FUNCTION IF EXISTS get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_guests_chat_messages(
  p_event_id UUID,
  p_user_email TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  message_id UUID,
  event_id UUID,
  sender_email TEXT,
  sender_name TEXT,
  sender_type TEXT,
  avatar_url TEXT,
  message_text TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ,
  company_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT user_can_access_event(p_event_id, p_user_email) THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  RETURN QUERY
  SELECT 
    gcm.message_id,
    gcm.event_id,
    gcm.sender_email,
    gcm.sender_name,
    gcm.sender_type,
    CASE 
      WHEN gcm.sender_type = 'admin' THEN u.avatar_url
      ELSE NULL
    END AS avatar_url,
    gcm.message_text,
    gcm.message_type,
    gcm.created_at,
    gcm.company_id
  FROM guests_chat_messages gcm
  LEFT JOIN users u ON gcm.sender_type = 'admin' AND gcm.sender_email = u.email
  WHERE gcm.event_id = p_event_id
  ORDER BY gcm.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

SELECT 'get_guests_chat_messages now returns avatar_url for admins' AS status; 