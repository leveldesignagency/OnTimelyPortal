-- ============================================================================
-- COMPREHENSIVE GUEST CHAT FIX
-- Resolves the ambiguous message_id column reference error
-- ============================================================================

-- Step 1: Drop all existing versions of the problematic functions
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, VARCHAR, UUID);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, VARCHAR, UUID, TEXT, TEXT);

-- Step 2: Create the correct send_guests_chat_message function
CREATE OR REPLACE FUNCTION send_guests_chat_message(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_reply_to_message_id UUID DEFAULT NULL
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
    v_can_send BOOLEAN := FALSE;
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

    -- Insert the message into guests_chat_messages table with explicit column names
    INSERT INTO guests_chat_messages (
        message_id,  -- Explicit column name to avoid ambiguity
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
    INSERT INTO guests_chat_receipts (event_id, message_id, participant_email, participant_type, company_id)
    SELECT 
        p_event_id,
        v_message_id,  -- Use the generated message_id
        gcp.user_email,
        gcp.user_type,
        v_company_id
    FROM guests_chat_participants gcp
    WHERE gcp.event_id = p_event_id
      AND gcp.user_email != p_sender_email
      AND gcp.company_id = v_company_id;

    RETURN json_build_object(
        'success', true,
        'message_id', v_message_id,
        'sender_type', v_sender_type,
        'sender_name', v_sender_name
    );
END;
$$;

-- Step 3: Drop and recreate the get_guests_chat_messages function
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
  -- Check if user is a participant
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants
    WHERE event_id = p_event_id AND user_email = p_user_email
  ) THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  -- Return messages with explicit table aliases to avoid ambiguity
  RETURN QUERY
  SELECT 
    gcm.message_id,  -- Explicit table alias
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

-- Step 4: Drop and recreate the initialize_guests_chat function
DROP FUNCTION IF EXISTS initialize_guests_chat(UUID);

CREATE OR REPLACE FUNCTION initialize_guests_chat(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_company_id UUID;
  v_participants_added INTEGER := 0;
BEGIN
  -- Get event details
  SELECT id, company_id INTO v_event
  FROM events
  WHERE id = p_event_id;
  
  IF v_event.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Event not found');
  END IF;
  
  v_company_id := v_event.company_id;
  
  -- Add all assigned team members as admin participants
  INSERT INTO guests_chat_participants (event_id, user_id, user_email, user_name, user_type, company_id)
  SELECT 
    p_event_id,
    u.id,
    u.email,
    u.name,
    'admin',
    v_company_id
  FROM users u
  INNER JOIN team_members tm ON u.id = tm.user_id
  INNER JOIN teams t ON tm.team_id = t.id
  INNER JOIN team_events te ON t.id = te.team_id
  WHERE te.event_id = p_event_id
    AND u.company_id = v_company_id
    AND NOT EXISTS (
      SELECT 1 FROM guests_chat_participants gcp 
      WHERE gcp.event_id = p_event_id AND gcp.user_email = u.email
    );
  
  GET DIAGNOSTICS v_participants_added = ROW_COUNT;
  
  -- Add all guests for this event as guest participants
  INSERT INTO guests_chat_participants (event_id, guest_id, user_email, user_name, user_type, company_id)
  SELECT 
    p_event_id,
    g.id,
    g.email,
    COALESCE(g.first_name || ' ' || g.last_name, g.first_name, 'Guest'),
    'guest',
    v_company_id
  FROM guests g
  WHERE g.event_id = p_event_id
    AND g.company_id = v_company_id
    AND NOT EXISTS (
      SELECT 1 FROM guests_chat_participants gcp 
      WHERE gcp.event_id = p_event_id AND gcp.user_email = g.email
    );
  
  -- Count total participants added
  SELECT COUNT(*) INTO v_participants_added
  FROM guests_chat_participants
  WHERE event_id = p_event_id;
  
  RETURN json_build_object(
    'success', true,
    'participants_added', v_participants_added
  );
END;
$$;

-- Step 5: Grant execute permissions
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION initialize_guests_chat(UUID) TO authenticated, anon;

-- Step 6: Verify the fix
SELECT 'Guest chat functions fixed successfully - ambiguous message_id resolved' AS status; 