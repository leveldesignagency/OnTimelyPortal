-- Fix ambiguous company_id column reference in get_guests_chat_messages
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
DECLARE
  v_user_authorized BOOLEAN := FALSE;
  v_event_company_id UUID;
BEGIN
  -- Get the event's company_id with explicit alias
  SELECT 
    (SELECT u.company_id FROM users u WHERE u.id = e.created_by) INTO v_event_company_id
  FROM events e 
  WHERE e.id = p_event_id;

  -- Check authorization with explicit table aliases to avoid ambiguity
  -- Check if user is admin assigned to event via teams
  IF EXISTS (
    SELECT 1 FROM users u
    INNER JOIN team_members tm ON u.id = tm.user_id
    INNER JOIN teams t ON tm.team_id = t.id
    INNER JOIN team_events te ON t.id = te.team_id
    WHERE te.event_id = p_event_id
      AND u.email = p_user_email
      AND u.company_id = v_event_company_id
  ) THEN
    v_user_authorized := TRUE;
  -- Check if user is a guest for this event
  ELSIF EXISTS (
    SELECT 1 FROM guests g
    WHERE g.event_id = p_event_id 
      AND g.email = p_user_email
  ) THEN
    v_user_authorized := TRUE;
  END IF;

  -- If not authorized, raise exception
  IF NOT v_user_authorized THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  -- Return messages with explicit table alias to avoid ambiguity
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
    gcm.company_id  -- Explicitly reference table alias
  FROM guests_chat_messages gcm
  WHERE gcm.event_id = p_event_id
  ORDER BY gcm.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

SELECT 'Fixed ambiguous company_id column reference' AS status; 