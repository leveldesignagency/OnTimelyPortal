-- Fix guest chat authorization logic
-- Update get_guests_chat_messages to properly authorize users

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
  v_company_id UUID;
BEGIN
  -- Get the event's company_id
  SELECT 
    (SELECT company_id FROM users WHERE id = e.created_by) INTO v_company_id
  FROM events e 
  WHERE e.id = p_event_id;

  -- Check if user is authorized in multiple ways:
  -- 1. User is in guests_chat_participants for this event
  -- 2. User is a company admin assigned to this event via teams
  -- 3. User is a guest for this event
  
  -- Check if already in participants table
  IF EXISTS (
    SELECT 1 FROM guests_chat_participants gcp
    WHERE gcp.event_id = p_event_id AND gcp.user_email = p_user_email
  ) THEN
    v_user_authorized := TRUE;
  
  -- Check if user is a company admin assigned to event via teams
  ELSIF EXISTS (
    SELECT 1 FROM users u
    INNER JOIN team_members tm ON u.id = tm.user_id
    INNER JOIN teams t ON tm.team_id = t.id
    INNER JOIN team_events te ON t.id = te.team_id
    WHERE te.event_id = p_event_id
      AND u.email = p_user_email
      AND u.company_id = v_company_id
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

  -- Return messages with explicit table aliases
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
  ORDER BY gcm.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Also update send_guests_chat_message to use the same authorization logic
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION send_guests_chat_message(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
  v_sender_name TEXT;
  v_sender_type TEXT;
  v_company_id UUID;
  v_user_authorized BOOLEAN := FALSE;
BEGIN
  -- Get the event's company_id
  SELECT 
    (SELECT company_id FROM users WHERE id = e.created_by) INTO v_company_id
  FROM events e 
  WHERE e.id = p_event_id;

  -- Check authorization and get sender info
  -- 1. Check if user is a company admin assigned to event via teams
  SELECT TRUE, u.name, 'admin' INTO v_user_authorized, v_sender_name, v_sender_type
  FROM users u
  INNER JOIN team_members tm ON u.id = tm.user_id
  INNER JOIN teams t ON tm.team_id = t.id
  INNER JOIN team_events te ON t.id = te.team_id
  WHERE te.event_id = p_event_id
    AND u.email = p_sender_email
    AND u.company_id = v_company_id
  LIMIT 1;

  -- 2. If not admin, check if user is a guest for this event
  IF NOT v_user_authorized THEN
    SELECT TRUE, CONCAT(g.first_name, ' ', g.last_name), 'guest' 
    INTO v_user_authorized, v_sender_name, v_sender_type
    FROM guests g
    WHERE g.event_id = p_event_id 
      AND g.email = p_sender_email
    LIMIT 1;
  END IF;

  -- If not authorized, return error
  IF NOT v_user_authorized THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to send messages');
  END IF;

  -- Insert the message
  v_message_id := gen_random_uuid();
  INSERT INTO guests_chat_messages (
    message_id, event_id, sender_email, sender_name, sender_type, message_text, message_type, company_id
  ) VALUES (
    v_message_id, p_event_id, p_sender_email, v_sender_name, v_sender_type, p_message_text, p_message_type, v_company_id
  );

  RETURN json_build_object('success', true, 'message_id', v_message_id);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT) TO authenticated;

SELECT 'Fixed guest chat authorization logic' AS status; 