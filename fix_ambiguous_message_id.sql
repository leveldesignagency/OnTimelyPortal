-- Fix the ambiguous message_id column reference in send_guests_chat_message function
-- This resolves the error: "column reference "message_id" is ambiguous"

-- Drop all existing versions of the function to avoid conflicts
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, VARCHAR, UUID);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, VARCHAR, UUID, TEXT, TEXT);

-- Create the correct version of send_guests_chat_message function
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

    -- Insert the message into guests_chat_messages table
    INSERT INTO guests_chat_messages (
        message_id,  -- Use explicit column name to avoid ambiguity
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
        v_message_id,
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated, anon;

-- Verify the function was created successfully
SELECT 'send_guests_chat_message function fixed successfully - ambiguous message_id resolved' AS status; 