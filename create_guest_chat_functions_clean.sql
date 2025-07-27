-- Create guest chat functions from scratch
-- Run this AFTER the nuclear drop script

-- Recreate initialize_guests_chat
CREATE OR REPLACE FUNCTION initialize_guests_chat(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_admin RECORD;
  v_guest RECORD;
  v_participants_added INTEGER := 0;
BEGIN
  -- Get company_id from event
  SELECT 
    (SELECT company_id FROM users WHERE id = e.created_by) INTO v_company_id
  FROM events e 
  WHERE e.id = p_event_id;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Event company not found');
  END IF;

  -- Add admins from team_events
  FOR v_admin IN 
    SELECT DISTINCT u.id, u.email, u.name
    FROM team_events te
    JOIN team_members tm ON te.team_id = tm.team_id
    JOIN users u ON tm.user_id = u.id
    WHERE te.event_id = p_event_id
  LOOP
    INSERT INTO guests_chat_participants (
      event_id, user_id, user_email, user_name, user_type, company_id, is_active
    ) VALUES (
      p_event_id, 
      v_admin.id, 
      v_admin.email,
      v_admin.name,
      'admin',
      v_company_id,
      true
    ) ON CONFLICT (event_id, user_id) DO NOTHING;
    
    v_participants_added := v_participants_added + 1;
  END LOOP;

  -- Add guests
  FOR v_guest IN 
    SELECT id, email, first_name, last_name
    FROM guests 
    WHERE event_id = p_event_id
  LOOP
    INSERT INTO guests_chat_participants (
      event_id, guest_id, user_email, user_name, user_type, company_id, is_active
    ) VALUES (
      p_event_id, 
      v_guest.id, 
      v_guest.email,
      CONCAT(v_guest.first_name, ' ', v_guest.last_name),
      'guest',
      v_company_id,
      true
    ) ON CONFLICT (event_id, guest_id) DO NOTHING;
    
    v_participants_added := v_participants_added + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true, 
    'participants_added', v_participants_added,
    'company_id', v_company_id
  );
END;
$$;

-- Recreate send_guests_chat_message
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
  v_participant guests_chat_participants%ROWTYPE;
  v_message_id UUID;
  v_sender_name TEXT;
  v_sender_type TEXT;
  v_company_id UUID;
BEGIN
  -- Check if sender is a participant
  SELECT * INTO v_participant
  FROM guests_chat_participants
  WHERE event_id = p_event_id
    AND user_email = p_sender_email;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Not a participant');
  END IF;

  -- Get company_id and sender type
  v_company_id := v_participant.company_id;
  v_sender_type := v_participant.user_type;
  v_sender_name := v_participant.user_name;

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

-- Recreate get_guests_chat_messages
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
  -- Check if user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants
    WHERE event_id = p_event_id AND user_email = p_user_email
  ) THEN
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

-- Recreate create_guests_chat_notifications_for_message
CREATE OR REPLACE FUNCTION create_guests_chat_notifications_for_message(
  p_message_id UUID,
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant RECORD;
  v_notifications_created INTEGER := 0;
  v_company_id UUID;
BEGIN
  -- Get company_id from message
  SELECT company_id INTO v_company_id
  FROM guests_chat_messages
  WHERE message_id = p_message_id;

  -- Create notifications for all participants except sender
  FOR v_participant IN 
    SELECT user_email, user_name, user_type
    FROM guests_chat_participants
    WHERE event_id = p_event_id 
      AND user_email != p_sender_email
      AND is_active = true
  LOOP
    INSERT INTO guests_chat_notifications (
      event_id,
      company_id,
      message_id,
      recipient_email,
      recipient_name,
      recipient_type,
      sender_email,
      message_preview,
      notification_type,
      is_read,
      created_at
    ) VALUES (
      p_event_id,
      v_company_id,
      p_message_id,
      v_participant.user_email,
      v_participant.user_name,
      v_participant.user_type,
      p_sender_email,
      LEFT(p_message_text, 100),
      'guest_chat_message',
      false,
      NOW()
    );
    
    v_notifications_created := v_notifications_created + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'notifications_created', v_notifications_created
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION initialize_guests_chat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_guests_chat_notifications_for_message(UUID, UUID, TEXT, TEXT) TO authenticated;

SELECT 'All guest chat functions recreated successfully' AS status; 