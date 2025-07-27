-- Fix the sender_type null issue in send_guests_chat_message
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

  -- First, try to find user as admin
  BEGIN
    SELECT u.name, 'admin' INTO v_sender_name, v_sender_type
    FROM users u
    INNER JOIN team_members tm ON u.id = tm.user_id
    INNER JOIN teams t ON tm.team_id = t.id
    INNER JOIN team_events te ON t.id = te.team_id
    WHERE te.event_id = p_event_id
      AND u.email = p_sender_email
      AND u.company_id = v_company_id
    LIMIT 1;
    
    IF v_sender_name IS NOT NULL THEN
      v_user_authorized := TRUE;
    END IF;
  EXCEPTION WHEN NO_DATA_FOUND THEN
    -- Continue to check guests
    NULL;
  END;

  -- If not found as admin, try to find as guest
  IF NOT v_user_authorized THEN
    BEGIN
      SELECT CONCAT(g.first_name, ' ', g.last_name), 'guest' 
      INTO v_sender_name, v_sender_type
      FROM guests g
      WHERE g.event_id = p_event_id 
        AND g.email = p_sender_email
      LIMIT 1;
      
      IF v_sender_name IS NOT NULL THEN
        v_user_authorized := TRUE;
      END IF;
    EXCEPTION WHEN NO_DATA_FOUND THEN
      -- User not found
      NULL;
    END;
  END IF;

  -- Debug logging - show what we found
  RAISE NOTICE 'Sender email: %, Found name: %, Type: %, Authorized: %', 
    p_sender_email, v_sender_name, v_sender_type, v_user_authorized;

  -- If still not authorized, return error
  IF NOT v_user_authorized OR v_sender_type IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Not authorized to send messages',
      'debug', json_build_object(
        'sender_email', p_sender_email,
        'event_id', p_event_id,
        'company_id', v_company_id,
        'found_name', v_sender_name,
        'found_type', v_sender_type
      )
    );
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
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT) TO authenticated;

SELECT 'Fixed sender_type null issue' AS status; 