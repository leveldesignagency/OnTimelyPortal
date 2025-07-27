-- Create a simplified version of get_guests_chat_messages without authorization check
-- This will help us determine if the authorization is causing the issue

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
  company_id UUID,
  is_edited BOOLEAN,
  edited_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove authorization check for now to test if that's the issue
  -- IF NOT user_can_access_event(p_event_id, p_user_email) THEN
  --   RAISE EXCEPTION 'User not authorized for this chat';
  -- END IF;

  RETURN QUERY
  SELECT 
    gcm.message_id,
    gcm.event_id,
    gcm.sender_email,
    gcm.sender_name,
    gcm.sender_type,
    CASE 
      WHEN gcm.sender_type = 'admin' THEN COALESCE(u.avatar_url, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face')
      ELSE NULL
    END AS avatar_url,
    gcm.message_text,
    gcm.message_type,
    gcm.created_at,
    gcm.company_id,
    gcm.is_edited,
    gcm.edited_at
  FROM guests_chat_messages gcm
  LEFT JOIN users u ON gcm.sender_type = 'admin' AND gcm.sender_email = u.email
  WHERE gcm.event_id = p_event_id
  ORDER BY gcm.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

SELECT 'Simplified get_guests_chat_messages function created (no auth check)' AS status; 