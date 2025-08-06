-- Update functions to properly handle reply_to_message_id
-- The column already exists in the table, we just need to update the functions

-- Update the send_guests_chat_message function to include reply_to_message_id
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
BEGIN
    -- Get current authenticated user ID
    v_current_user_id := auth.uid();
    
    -- Get event company_id with explicit table qualification
    SELECT e.company_id INTO v_company_id
    FROM events e
    WHERE e.id = p_event_id;
    
    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Event not found');
    END IF;

    -- For Supabase auth users, check if they're assigned to this event
    IF v_current_user_id IS NOT NULL THEN
        -- Check if current user is assigned to this event as admin with explicit table qualification
        SELECT u.id, u.name
        INTO v_user_id, v_sender_name
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
        END IF;
    END IF;

    -- If not an authenticated admin, check if it's a guest with explicit table qualification
    IF NOT v_can_send THEN
        SELECT g.id, COALESCE(g.first_name || ' ' || g.last_name, g.first_name, 'Guest')
        INTO v_guest_id, v_sender_name
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

    -- If still not authorized, deny
    IF NOT v_can_send THEN
        RETURN json_build_object('success', false, 'error', 'Unauthorized to send messages to this event');
    END IF;

    -- Insert the message with reply_to_message_id
    INSERT INTO guests_chat_messages (
        event_id,
        sender_email,
        sender_name,
        sender_type,
        message_text,
        message_type,
        company_id,
        reply_to_message_id
    ) VALUES (
        p_event_id,
        p_sender_email,
        v_sender_name,
        v_sender_type,
        p_message_text,
        p_message_type,
        v_company_id,
        p_reply_to_message_id
    ) RETURNING message_id INTO v_message_id;

    -- Return success with message details
    RETURN json_build_object(
        'success', true,
        'message_id', v_message_id,
        'sender_name', v_sender_name,
        'sender_type', v_sender_type,
        'reply_to_message_id', p_reply_to_message_id
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update the get_guests_chat_messages function to include reply_to_message_id
DROP FUNCTION IF EXISTS get_guests_chat_messages(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_guests_chat_messages(
  p_event_id UUID,
  p_user_email TEXT DEFAULT NULL
)
RETURNS TABLE (
    message_id UUID,
    event_id UUID,
    sender_email TEXT,
    sender_name TEXT,
    sender_type TEXT,
    message_text TEXT,
    message_type TEXT,
    attachment_url TEXT,
    attachment_filename TEXT,
    company_id UUID,
    is_edited BOOLEAN,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    reply_to_message_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gcm.message_id,
        gcm.event_id,
        gcm.sender_email,
        gcm.sender_name,
        gcm.sender_type,
        gcm.message_text,
        gcm.message_type,
        gcm.attachment_url,
        gcm.attachment_filename,
        gcm.company_id,
        gcm.is_edited,
        gcm.edited_at,
        gcm.created_at,
        gcm.updated_at,
        gcm.reply_to_message_id
    FROM guests_chat_messages gcm
    WHERE gcm.event_id = p_event_id
    ORDER BY gcm.created_at ASC;
END;
$$; 