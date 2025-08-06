-- Drop ALL versions of the send_guests_chat_message function
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, VARCHAR, UUID);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, VARCHAR, UUID, TEXT, TEXT);

-- Create a completely simplified version that avoids any ambiguous references
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
    sender_type TEXT,
    sender_email TEXT,
    avatar_url TEXT,
    message_text TEXT,
    message_type TEXT,
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
    v_sender_type TEXT;
    v_avatar_url TEXT;
    v_company_id UUID;
    v_user_id UUID;
    v_guest_id UUID;
    v_guest_first_name TEXT;
    v_guest_last_name TEXT;
    v_created_at TIMESTAMPTZ := now();
    v_is_edited BOOLEAN := FALSE;
    v_edited_at TIMESTAMPTZ := NULL;
    v_inserted_message RECORD;
BEGIN
    -- Get user information with explicit table aliases
    SELECT u.id, u.company_id INTO v_user_id, v_company_id
    FROM users u
    WHERE u.email = p_sender_email;
    
    IF v_user_id IS NOT NULL THEN
        -- User is an admin
        SELECT u.name, u.avatar INTO v_sender_name, v_avatar_url
        FROM users u
        WHERE u.id = v_user_id;
        v_sender_type := 'admin';
    ELSE
        -- Check if it's a guest
        SELECT g.id, g.company_id, g.first_name, g.last_name, g.avatar_url INTO v_guest_id, v_company_id, v_guest_first_name, v_guest_last_name, v_avatar_url
        FROM guests g
        WHERE g.email = p_sender_email;
        
        IF v_guest_id IS NOT NULL THEN
            v_sender_name := CONCAT(v_guest_first_name, ' ', v_guest_last_name);
            v_sender_type := 'guest';
        ELSE
            RAISE EXCEPTION 'User not found: %', p_sender_email;
        END IF;
    END IF;
    
    -- Insert the message with explicit column names
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
    ) RETURNING * INTO v_inserted_message;
    
    -- Return the inserted message using the record
    RETURN QUERY
    SELECT 
        v_inserted_message.message_id,
        v_inserted_message.event_id,
        v_inserted_message.sender_name,
        v_inserted_message.sender_type,
        v_inserted_message.sender_email,
        v_inserted_message.avatar_url,
        v_inserted_message.message_text,
        v_inserted_message.message_type,
        v_inserted_message.company_id,
        v_inserted_message.created_at,
        v_inserted_message.reply_to_message_id,
        v_inserted_message.is_edited,
        v_inserted_message.edited_at;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated, anon;

SELECT 'send_guests_chat_message function fixed with simplified approach' AS status; 