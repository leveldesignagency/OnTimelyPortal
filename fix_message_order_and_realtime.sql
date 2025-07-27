-- Fix message order and enable real-time for guest chat
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
  message_text TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ,
  company_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple check: if user can access event, they can see messages
  IF NOT user_can_access_event(p_event_id, p_user_email) THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  -- Return messages in ASCENDING order (oldest first, newest at bottom)
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
    gcm.company_id
  FROM guests_chat_messages gcm
  WHERE gcm.event_id = p_event_id
  ORDER BY gcm.created_at ASC  -- Changed from DESC to ASC for correct order
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

-- Enable real-time on guests_chat_messages (if not already done)
DO $$
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'guests_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE guests_chat_messages;
  END IF;
END $$;

SELECT 'Fixed message order and enabled real-time' AS status; 