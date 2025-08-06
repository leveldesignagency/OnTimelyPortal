-- Drop the existing function first, then recreate it
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);

-- Fix the send_guests_chat_message function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION send_guests_chat_message(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_reply_to_message_id UUID DEFAULT NULL
)
RETURNS TABLE (
    message_id UUID,
    event_id UUID,
    sender_name TEXT,
    sender_type VARCHAR(20),
    sender_email TEXT,
    avatar_url TEXT,
    message_text TEXT,
    message_type VARCHAR(20),
    company_id UUID,
    created_at TIMESTAMPTZ,
    reply_to_message_id UUID,
    is_edited BOOLEAN,
    edited_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message_id UUID;
    v_sender_name TEXT;
    v_sender_type VARCHAR(20);
    v_avatar_url TEXT;
    v_company_id UUID;
    v_user_id UUID;
    v_guest_id UUID;
    v_created_at TIMESTAMPTZ := now();
    v_is_edited BOOLEAN := FALSE;
    v_edited_at TIMESTAMPTZ := NULL;
BEGIN
    -- Get user information with CORRECT column names
    SELECT u.id, u.company_id INTO v_user_id, v_company_id
    FROM users u
    WHERE u.email = p_sender_email;
    
    IF v_user_id IS NOT NULL THEN
        -- User is an admin - use 'name' column (not first_name/last_name)
        v_sender_name := (SELECT u.name FROM users u WHERE u.id = v_user_id);
        v_sender_type := 'admin';
        v_avatar_url := (SELECT u.avatar FROM users u WHERE u.id = v_user_id);
    ELSE
        -- Check if it's a guest - guests have first_name and last_name
        SELECT g.id, g.company_id INTO v_guest_id, v_company_id
        FROM guests g
        WHERE g.email = p_sender_email;
        
        IF v_guest_id IS NOT NULL THEN
            v_sender_name := (SELECT CONCAT(g.first_name, ' ', g.last_name) FROM guests g WHERE g.id = v_guest_id);
            v_sender_type := 'guest';
            v_avatar_url := (SELECT g.avatar_url FROM guests g WHERE g.id = v_guest_id);
        ELSE
            RAISE EXCEPTION 'User not found: %', p_sender_email;
        END IF;
    END IF;
    
    -- Insert the message
    INSERT INTO guests_chat_messages (
        event_id,
        sender_name,
        sender_type,
        sender_email,
        avatar_url,
        message_text,
        message_type,
        company_id,
        reply_to_message_id,
        created_at,
        is_edited,
        edited_at
    ) VALUES (
        p_event_id,
        v_sender_name,
        v_sender_type,
        p_sender_email,
        v_avatar_url,
        p_message_text,
        p_message_type,
        v_company_id,
        p_reply_to_message_id,
        v_created_at,
        v_is_edited,
        v_edited_at
    ) RETURNING message_id INTO v_message_id;
    
    -- Return the inserted message using variables directly - NO AMBIGUITY
    RETURN QUERY
    SELECT 
        v_message_id AS message_id,
        p_event_id AS event_id,
        v_sender_name AS sender_name,
        v_sender_type AS sender_type,
        p_sender_email AS sender_email,
        v_avatar_url AS avatar_url,
        p_message_text AS message_text,
        p_message_type AS message_type,
        v_company_id AS company_id,
        v_created_at AS created_at,
        p_reply_to_message_id AS reply_to_message_id,
        v_is_edited AS is_edited,
        v_edited_at AS edited_at;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated, anon;

SELECT 'send_guests_chat_message function fixed successfully' AS status; 