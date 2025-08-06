-- Fix sender_name to use proper names instead of emails in send_guests_chat_message function
-- This ensures that reply displays show proper names instead of email addresses

-- Drop the existing function
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);

-- Create the fixed function
CREATE OR REPLACE FUNCTION send_guests_chat_message(
    p_event_id UUID,
    p_sender_email TEXT,
    p_message_text TEXT,
    p_message_type TEXT DEFAULT 'text',
    p_reply_to_message_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_message_id UUID;
    v_sender_type TEXT;
    v_sender_name TEXT;
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
        SELECT u.id, 
               -- Use proper name formatting, fallback to email if name is null/empty
               CASE 
                   WHEN u.name IS NOT NULL AND u.name != '' AND u.name != u.email THEN u.name
                   WHEN u.name IS NOT NULL AND u.name != '' THEN u.name
                   ELSE split_part(u.email, '@', 1) -- Use email prefix as name
               END
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
        SELECT g.id, 
               -- Use proper guest name formatting
               CASE 
                   WHEN g.first_name IS NOT NULL AND g.last_name IS NOT NULL 
                        AND g.first_name != '' AND g.last_name != '' 
                   THEN g.first_name || ' ' || g.last_name
                   WHEN g.first_name IS NOT NULL AND g.first_name != '' 
                   THEN g.first_name
                   WHEN g.last_name IS NOT NULL AND g.last_name != '' 
                   THEN g.last_name
                   ELSE 'Guest'
               END
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

    IF NOT v_can_send THEN
        RETURN json_build_object('success', false, 'error', 'You are not authorized to send messages in this chat');
    END IF;

    -- Generate message ID
    v_message_id := gen_random_uuid();

    -- Insert the message into guests_chat_messages table
    INSERT INTO guests_chat_messages (
        message_id,
        event_id,
        sender_email,
        sender_name,
        sender_type,
        message_text,
        message_type,
        company_id,
        reply_to_message_id
    ) VALUES (
        v_message_id,
        p_event_id,
        p_sender_email,
        v_sender_name,
        v_sender_type,
        p_message_text,
        p_message_type,
        v_company_id,
        p_reply_to_message_id
    );

    -- Create read receipts for all participants except sender with explicit table qualification
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated, anon;

-- Also fix the get_guests_chat_messages function to ensure proper names are returned
DROP FUNCTION IF EXISTS get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_guests_chat_messages(
    p_event_id UUID,
    p_user_email TEXT,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    message_id UUID,
    event_id UUID,
    sender_name VARCHAR,
    sender_type VARCHAR,
    sender_email VARCHAR,
    message_text TEXT,
    message_type VARCHAR,
    company_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    reply_to_message_id UUID,
    is_edited BOOLEAN,
    edited_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gcm.message_id,
        gcm.event_id,
        -- Ensure proper name formatting for display
        CASE 
            WHEN gcm.sender_type = 'admin' THEN
                CASE 
                    WHEN gcm.sender_name IS NOT NULL AND gcm.sender_name != '' 
                         AND gcm.sender_name != gcm.sender_email 
                    THEN gcm.sender_name
                    WHEN gcm.sender_name IS NOT NULL AND gcm.sender_name != '' 
                    THEN gcm.sender_name
                    ELSE split_part(gcm.sender_email, '@', 1)
                END
            WHEN gcm.sender_type = 'guest' THEN
                CASE 
                    WHEN gcm.sender_name IS NOT NULL AND gcm.sender_name != '' 
                    THEN gcm.sender_name
                    ELSE 'Guest'
                END
            ELSE gcm.sender_name
        END as sender_name,
        gcm.sender_type,
        gcm.sender_email,
        gcm.message_text,
        gcm.message_type,
        gcm.company_id,
        gcm.created_at,
        gcm.reply_to_message_id,
        gcm.is_edited,
        gcm.edited_at
    FROM guests_chat_messages gcm
    WHERE gcm.event_id = p_event_id
      AND gcm.company_id = (
          SELECT e.company_id 
          FROM events e 
          WHERE e.id = p_event_id
      )
    ORDER BY gcm.created_at ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated, anon;

SELECT 'Sender names fixed - now using proper names instead of emails in replies' AS status; 