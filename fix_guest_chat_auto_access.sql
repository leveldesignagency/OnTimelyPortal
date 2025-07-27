-- Fix guest chat to automatically give access to users who can access the event
-- This makes it simple: if you can access the EventPortalManagement page, you can access the chat

DROP FUNCTION IF EXISTS get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS initialize_guests_chat(UUID);

-- Simple function: if user can access event, they can access chat
CREATE OR REPLACE FUNCTION user_can_access_event(p_event_id UUID, p_user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_can_access BOOLEAN := FALSE;
BEGIN
  -- Check if user is admin who created the event
  IF EXISTS (
    SELECT 1 FROM events e
    INNER JOIN users u ON e.created_by = u.id
    WHERE e.id = p_event_id AND u.email = p_user_email
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is admin in same company as event creator
  IF EXISTS (
    SELECT 1 FROM events e
    INNER JOIN users creator ON e.created_by = creator.id
    INNER JOIN users u ON u.company_id = creator.company_id
    WHERE e.id = p_event_id AND u.email = p_user_email
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is a guest for this event
  IF EXISTS (
    SELECT 1 FROM guests g
    WHERE g.event_id = p_event_id AND g.email = p_user_email
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Auto-initialize chat with current user
CREATE OR REPLACE FUNCTION initialize_guests_chat(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_result JSON;
BEGIN
  -- Get company_id from event
  SELECT 
    (SELECT company_id FROM users WHERE id = e.created_by) INTO v_company_id
  FROM events e 
  WHERE e.id = p_event_id;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Event company not found');
  END IF;

  -- Add all company users who can access this event
  INSERT INTO guests_chat_participants (
    event_id, user_id, user_email, user_name, user_type, company_id, is_active
  )
  SELECT 
    p_event_id,
    u.id,
    u.email,
    u.name,
    'admin',
    v_company_id,
    true
  FROM users u
  WHERE u.company_id = v_company_id
  ON CONFLICT (event_id, user_id) DO NOTHING;

  -- Add all guests for this event
  INSERT INTO guests_chat_participants (
    event_id, guest_id, user_email, user_name, user_type, company_id, is_active
  )
  SELECT 
    p_event_id,
    g.id,
    g.email,
    CONCAT(g.first_name, ' ', g.last_name),
    'guest',
    v_company_id,
    true
  FROM guests g
  WHERE g.event_id = p_event_id
  ON CONFLICT (event_id, guest_id) DO NOTHING;

  RETURN json_build_object('success', true, 'company_id', v_company_id);
END;
$$;

-- Get messages with simple authorization
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

  -- Return messages
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

-- Send message with simple authorization
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
BEGIN
  -- Simple check: if user can access event, they can send messages
  IF NOT user_can_access_event(p_event_id, p_sender_email) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to send messages');
  END IF;

  -- Get company_id
  SELECT 
    (SELECT company_id FROM users WHERE id = e.created_by) INTO v_company_id
  FROM events e 
  WHERE e.id = p_event_id;

  -- Get sender info
  SELECT u.name, 'admin' INTO v_sender_name, v_sender_type
  FROM users u
  WHERE u.email = p_sender_email AND u.company_id = v_company_id
  LIMIT 1;

  -- If not found as admin, try guest
  IF v_sender_name IS NULL THEN
    SELECT CONCAT(g.first_name, ' ', g.last_name), 'guest' 
    INTO v_sender_name, v_sender_type
    FROM guests g
    WHERE g.event_id = p_event_id AND g.email = p_sender_email
    LIMIT 1;
  END IF;

  -- Default to email if no name found
  IF v_sender_name IS NULL THEN
    v_sender_name := p_sender_email;
    v_sender_type := 'admin';
  END IF;

  -- Insert message
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
GRANT EXECUTE ON FUNCTION user_can_access_event(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_guests_chat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT) TO authenticated;

SELECT 'Fixed guest chat to auto-authorize users who can access the event' AS status; 