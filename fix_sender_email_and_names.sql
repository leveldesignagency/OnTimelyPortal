-- ============================================================================
-- FIX SENDER EMAIL AND NAMES ISSUES
-- Fixes the wrong side messages and undefined names
-- ============================================================================

-- Step 1: Fix the send_guests_chat_message function to use correct sender email
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);

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
    v_current_user_id UUID;
    v_user_id UUID;
    v_guest_id UUID;
    v_actual_sender_email TEXT;
BEGIN
    -- Get current authenticated user ID
    v_current_user_id := auth.uid();
    
    -- Get event company_id
    SELECT company_id INTO v_company_id
    FROM events 
    WHERE id = p_event_id;
    
    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Event not found');
    END IF;

    -- For Supabase auth users, check if they're assigned to this event
    IF v_current_user_id IS NOT NULL THEN
        -- Check if current user is assigned to this event as admin
        SELECT u.id, u.name, u.email
        INTO v_user_id, v_sender_name, v_actual_sender_email
        FROM users u
        INNER JOIN team_members tm ON u.id = tm.user_id
        INNER JOIN teams t ON tm.team_id = t.id
        INNER JOIN team_events te ON t.id = te.team_id
        WHERE te.event_id = p_event_id
          AND u.id = v_current_user_id
          AND u.company_id = v_company_id
        LIMIT 1;

        IF v_user_id IS NOT NULL THEN
            -- Current authenticated user is an admin for this event
            v_sender_type := 'admin';
            v_can_send := TRUE;
            -- Use the actual user's email, not the passed parameter
            v_actual_sender_email := (SELECT email FROM users WHERE id = v_current_user_id);
        END IF;
    END IF;

    -- If not an authenticated admin, check if it's a guest
    IF NOT v_can_send THEN
        SELECT g.id, COALESCE(g.first_name || ' ' || g.last_name, g.first_name, 'Guest'), g.email
        INTO v_guest_id, v_sender_name, v_actual_sender_email
        FROM guests g
        WHERE g.event_id = p_event_id
          AND g.email = p_sender_email
          AND g.company_id = v_company_id
        LIMIT 1;

        IF v_guest_id IS NOT NULL THEN
            -- Sender is a guest
            v_sender_type := 'guest';
            v_can_send := TRUE;
        END IF;
    END IF;

    IF NOT v_can_send THEN
        RETURN json_build_object('success', false, 'error', 'You are not authorized to send messages in this chat');
    END IF;

    -- Generate message ID
    v_message_id := gen_random_uuid();

    -- Insert the message into guests_chat_messages table with CORRECT sender email
    INSERT INTO guests_chat_messages (
        message_id,
        event_id,
        sender_email,  -- This will be the actual user's email
        sender_name,
        sender_type,
        message_text,
        message_type,
        company_id,
        reply_to_message_id
    ) VALUES (
        v_message_id,
        p_event_id,
        v_actual_sender_email,  -- Use the actual sender email
        v_sender_name,
        v_sender_type,
        p_message_text,
        p_message_type,
        v_company_id,
        p_reply_to_message_id
    );

    -- Create read receipts for all participants except sender
    INSERT INTO guests_chat_receipts (event_id, message_id, participant_email, participant_type, company_id)
    SELECT 
        p_event_id,
        v_message_id,
        gcp.user_email,
        gcp.user_type,
        v_company_id
    FROM guests_chat_participants gcp
    WHERE gcp.event_id = p_event_id
      AND gcp.user_email != v_actual_sender_email  -- Use actual sender email
      AND gcp.company_id = v_company_id;

    RETURN json_build_object(
        'success', true,
        'message_id', v_message_id,
        'sender_type', v_sender_type,
        'sender_name', v_sender_name,
        'sender_email', v_actual_sender_email  -- Return the actual sender email
    );
END;
$$;

-- Step 2: Fix the get_guests_chat_messages function to handle names properly
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
    SELECT 1 FROM guests_chat_participants gcp
    WHERE gcp.event_id = p_event_id AND gcp.user_email = p_user_email
  ) THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  -- Return messages with proper name handling
  RETURN QUERY
  SELECT 
    gcm.message_id,
    gcm.event_id,
    gcm.sender_email,
    CASE 
      -- For admin users, get the name from users table
      WHEN gcm.sender_type = 'admin' THEN 
        COALESCE(u.name, gcm.sender_name)
      -- For guests, get the name from guests table or use stored name
      WHEN gcm.sender_type = 'guest' THEN 
        COALESCE(
          g.first_name || ' ' || g.last_name,
          g.first_name,
          gcm.sender_name,
          'Guest'
        )
      -- Fallback
      ELSE COALESCE(gcm.sender_name, 'Unknown User')
    END as sender_name,
    gcm.sender_type,
    gcm.message_text,
    gcm.message_type,
    gcm.created_at,
    gcm.company_id
  FROM guests_chat_messages gcm
  LEFT JOIN users u ON gcm.sender_email = u.email AND gcm.sender_type = 'admin'
  LEFT JOIN guests g ON gcm.sender_email = g.email AND gcm.sender_type = 'guest' AND g.event_id = gcm.event_id
  WHERE gcm.event_id = p_event_id
  ORDER BY gcm.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated, anon;

-- Step 4: Verify the fix
SELECT 'Sender email and names issues fixed' AS status; 