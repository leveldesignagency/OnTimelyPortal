-- ============================================
-- ENHANCED GUEST CHAT WITH PROPER ADMIN ASSIGNMENT
-- Ensures only assigned company users can access event chats
-- ============================================

-- Function to get users assigned to a specific event via teams
CREATE OR REPLACE FUNCTION get_event_assigned_users(p_event_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  team_name TEXT,
  access_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email as user_email,
    u.name as user_name,
    t.name as team_name,
    te.access_level as access_level
  FROM users u
  INNER JOIN team_members tm ON u.id = tm.user_id
  INNER JOIN teams t ON tm.team_id = t.id
  INNER JOIN team_events te ON t.id = te.team_id
  INNER JOIN events e ON te.event_id = e.id
  WHERE e.id = p_event_id
    AND e.company_id = u.company_id  -- Ensure same company
  ORDER BY u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to initialize guests chat with proper admin assignment
CREATE OR REPLACE FUNCTION initialize_guests_chat_enhanced(p_event_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_event_exists BOOLEAN := FALSE;
  v_company_id UUID;
  v_admin_count INTEGER := 0;
  v_guest_count INTEGER := 0;
BEGIN
  -- Check if event exists and get company_id
  SELECT EXISTS(SELECT 1 FROM events WHERE id = p_event_id), company_id
  INTO v_event_exists, v_company_id
  FROM events 
  WHERE id = p_event_id;
  
  IF NOT v_event_exists THEN
    RETURN json_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- Get count of assigned admin users for this event
  SELECT COUNT(DISTINCT u.id)
  INTO v_admin_count
  FROM users u
  INNER JOIN team_members tm ON u.id = tm.user_id
  INNER JOIN teams t ON tm.team_id = t.id
  INNER JOIN team_events te ON t.id = te.team_id
  WHERE te.event_id = p_event_id
    AND u.company_id = v_company_id;

  -- Get count of guests for this event
  SELECT COUNT(*)
  INTO v_guest_count
  FROM guests
  WHERE event_id = p_event_id
    AND company_id = v_company_id;

  -- Add all assigned admin users to chat participants
  INSERT INTO guests_chat_participants (event_id, user_email, user_type, company_id)
  SELECT 
    p_event_id,
    u.email,
    'admin',
    v_company_id
  FROM users u
  INNER JOIN team_members tm ON u.id = tm.user_id
  INNER JOIN teams t ON tm.team_id = t.id
  INNER JOIN team_events te ON t.id = te.team_id
  WHERE te.event_id = p_event_id
    AND u.company_id = v_company_id
  ON CONFLICT (event_id, user_email) DO NOTHING;

  -- Add all event guests to chat participants
  INSERT INTO guests_chat_participants (event_id, user_email, user_type, company_id)
  SELECT 
    p_event_id,
    g.email,
    'guest',
    v_company_id
  FROM guests g
  WHERE g.event_id = p_event_id
    AND g.company_id = v_company_id
  ON CONFLICT (event_id, user_email) DO NOTHING;

  v_result := json_build_object(
    'success', true,
    'event_id', p_event_id,
    'company_id', v_company_id,
    'admin_count', v_admin_count,
    'guest_count', v_guest_count,
    'total_participants', v_admin_count + v_guest_count
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to send guest chat messages with proper permission checks
CREATE OR REPLACE FUNCTION send_guests_chat_message_enhanced(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text'
)
RETURNS JSON AS $$
DECLARE
  v_message_id UUID;
  v_sender_name TEXT;
  v_sender_type TEXT;
  v_company_id UUID;
  v_can_send BOOLEAN := FALSE;
  v_result JSON;
BEGIN
  -- Get event company_id
  SELECT company_id INTO v_company_id
  FROM events 
  WHERE id = p_event_id;
  
  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- Check if sender is an assigned admin for this event
  SELECT TRUE, u.name, 'admin'
  INTO v_can_send, v_sender_name, v_sender_type
  FROM users u
  INNER JOIN team_members tm ON u.id = tm.user_id
  INNER JOIN teams t ON tm.team_id = t.id
  INNER JOIN team_events te ON t.id = te.team_id
  WHERE te.event_id = p_event_id
    AND u.email = p_sender_email
    AND u.company_id = v_company_id
  LIMIT 1;

  -- If not an admin, check if sender is a guest for this event
  IF NOT v_can_send THEN
    SELECT TRUE, COALESCE(g.first_name || ' ' || g.last_name, g.first_name, 'Guest'), 'guest'
    INTO v_can_send, v_sender_name, v_sender_type
    FROM guests g
    WHERE g.event_id = p_event_id
      AND g.email = p_sender_email
      AND g.company_id = v_company_id
    LIMIT 1;
  END IF;

  IF NOT v_can_send THEN
    RETURN json_build_object('success', false, 'error', 'You are not authorized to send messages in this chat');
  END IF;

  -- Generate message ID
  v_message_id := gen_random_uuid();

  -- Insert the message
  INSERT INTO guests_chat_messages (
    message_id,
    event_id,
    sender_email,
    sender_name,
    sender_type,
    message_text,
    message_type,
    company_id
  ) VALUES (
    v_message_id,
    p_event_id,
    p_sender_email,
    v_sender_name,
    v_sender_type,
    p_message_text,
    p_message_type,
    v_company_id
  );

  -- Create read receipts for all participants except sender
  INSERT INTO guests_chat_receipts (event_id, message_id, user_email, company_id)
  SELECT 
    p_event_id,
    v_message_id,
    gcp.user_email,
    v_company_id
  FROM guests_chat_participants gcp
  WHERE gcp.event_id = p_event_id
    AND gcp.user_email != p_sender_email
    AND gcp.company_id = v_company_id;

  v_result := json_build_object(
    'success', true,
    'message_id', v_message_id,
    'sender_type', v_sender_type,
    'sender_name', v_sender_name
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to get guest chat messages with proper filtering
CREATE OR REPLACE FUNCTION get_guests_chat_messages_enhanced(
  p_event_id UUID,
  p_user_email TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  message_id UUID,
  sender_name TEXT,
  sender_type TEXT,
  sender_email TEXT,
  message_text TEXT,
  message_type TEXT,
  attachment_url TEXT,
  attachment_filename TEXT,
  is_edited BOOLEAN,
  sent_at TIMESTAMPTZ,
  is_read BOOLEAN,
  read_at TIMESTAMPTZ
) AS $$
DECLARE
  v_company_id UUID;
  v_can_access BOOLEAN := FALSE;
BEGIN
  -- Get event company_id
  SELECT company_id INTO v_company_id
  FROM events 
  WHERE id = p_event_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Check if user is an assigned admin for this event
  SELECT TRUE INTO v_can_access
  FROM users u
  INNER JOIN team_members tm ON u.id = tm.user_id
  INNER JOIN teams t ON tm.team_id = t.id
  INNER JOIN team_events te ON t.id = te.team_id
  WHERE te.event_id = p_event_id
    AND u.email = p_user_email
    AND u.company_id = v_company_id
  LIMIT 1;

  -- If not an admin, check if user is a guest for this event
  IF NOT v_can_access THEN
    SELECT TRUE INTO v_can_access
    FROM guests g
    WHERE g.event_id = p_event_id
      AND g.email = p_user_email
      AND g.company_id = v_company_id
    LIMIT 1;
  END IF;

  IF NOT v_can_access THEN
    RAISE EXCEPTION 'You are not authorized to view messages in this chat';
  END IF;

  -- Return messages with read status
  RETURN QUERY
  SELECT 
    gcm.message_id,
    gcm.sender_name,
    gcm.sender_type,
    gcm.sender_email,
    gcm.message_text,
    gcm.message_type,
    gcm.attachment_url,
    gcm.attachment_filename,
    gcm.is_edited,
    gcm.sent_at,
    COALESCE(gcr.is_read, FALSE) as is_read,
    gcr.read_at
  FROM guests_chat_messages gcm
  LEFT JOIN guests_chat_receipts gcr ON gcm.message_id = gcr.message_id 
    AND gcr.user_email = p_user_email
  WHERE gcm.event_id = p_event_id
    AND gcm.company_id = v_company_id
  ORDER BY gcm.sent_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get events that a user can access via team assignments
CREATE OR REPLACE FUNCTION get_user_accessible_events(p_user_email TEXT)
RETURNS TABLE (
  event_id UUID,
  event_name TEXT,
  event_from DATE,
  event_to DATE,
  event_location TEXT,
  access_level TEXT,
  team_name TEXT,
  guest_count BIGINT
) AS $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
BEGIN
  -- Get user info
  SELECT id, company_id INTO v_user_id, v_company_id
  FROM users 
  WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Return events accessible via team assignments
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.name as event_name,
    e."from" as event_from,
    e."to" as event_to,
    e.location as event_location,
    te.access_level,
    t.name as team_name,
    (SELECT COUNT(*) FROM guests g WHERE g.event_id = e.id) as guest_count
  FROM events e
  INNER JOIN team_events te ON e.id = te.event_id
  INNER JOIN teams t ON te.team_id = t.id
  INNER JOIN team_members tm ON t.id = tm.team_id
  WHERE tm.user_id = v_user_id
    AND e.company_id = v_company_id
    AND t.company_id = v_company_id
  ORDER BY e."from" DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_event_assigned_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_guests_chat_enhanced(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_guests_chat_message_enhanced(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guests_chat_messages_enhanced(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_events(TEXT) TO authenticated;

-- Enable real-time on guests_chat_messages for proper broadcasting
ALTER PUBLICATION supabase_realtime ADD TABLE guests_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE guests_chat_participants; 