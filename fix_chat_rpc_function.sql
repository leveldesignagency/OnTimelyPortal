-- Fix the send_guests_chat_message function to match the current working signature
-- This function should work with the existing table structure

DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION send_guests_chat_message(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_reply_to_message_id UUID DEFAULT NULL,
  p_attachment_url TEXT DEFAULT NULL,
  p_attachment_filename TEXT DEFAULT NULL
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
    attachment_url TEXT,
    attachment_filename TEXT,
    company_id UUID,
    created_at TIMESTAMPTZ,
    reply_to_message_id UUID,
    is_edited BOOLEAN,
    edited_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    is_read BOOLEAN,
    read_at TIMESTAMPTZ,
    reactions JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_name TEXT;
    v_sender_type TEXT;
    v_company_id UUID;
    v_avatar_url TEXT;
    v_new_message_id UUID;
BEGIN
    -- Get sender info from users table (admin)
    SELECT 
        name,
        'admin',
        company_id,
        avatar
    INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
    FROM users 
    WHERE email = p_sender_email;
    
    -- If not found in users, check guests table
    IF v_sender_name IS NULL THEN
        SELECT 
            COALESCE(first_name || ' ' || last_name, first_name, 'Guest'),
            'guest',
            company_id,
            NULL
        INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
        FROM guests 
        WHERE email = p_sender_email AND event_id = p_event_id;
    END IF;
    
    IF v_sender_name IS NULL THEN
        RAISE EXCEPTION 'Sender not found';
    END IF;
    
    -- Insert the message
    INSERT INTO guests_chat_messages (
        event_id,
        sender_email,
        sender_name,
        sender_type,
        message_text,
        message_type,
        attachment_url,
        attachment_filename,
        company_id,
        reply_to_message_id
    ) VALUES (
        p_event_id,
        p_sender_email,
        v_sender_name,
        v_sender_type,
        p_message_text,
        p_message_type,
        p_attachment_url,
        p_attachment_filename,
        v_company_id,
        p_reply_to_message_id
    ) RETURNING message_id INTO v_new_message_id;
    
    -- Return the message with all details
    RETURN QUERY
    SELECT 
        gcm.message_id,
        gcm.event_id,
        gcm.sender_name,
        gcm.sender_type::VARCHAR(20),
        gcm.sender_email,
        v_avatar_url as avatar_url,
        gcm.message_text,
        gcm.message_type::VARCHAR(20),
        gcm.attachment_url,
        gcm.attachment_filename,
        gcm.company_id,
        gcm.created_at,
        gcm.reply_to_message_id,
        gcm.is_edited,
        gcm.edited_at,
        gcm.created_at as sent_at,
        false as is_read,
        NULL as read_at,
        '[]'::json as reactions
    FROM guests_chat_messages gcm
    WHERE gcm.message_id = v_new_message_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated, anon;

-- Update the get_guests_chat_messages function to include attachment fields
CREATE OR REPLACE FUNCTION get_guests_chat_messages(
    p_event_id UUID,
    p_user_email TEXT,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
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
    attachment_url TEXT,
    attachment_filename TEXT,
    company_id UUID,
    created_at TIMESTAMPTZ,
    reply_to_message_id UUID,
    is_edited BOOLEAN,
    edited_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    is_read BOOLEAN,
    read_at TIMESTAMPTZ,
    reactions JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_company_id UUID;
BEGIN
    -- Get user's company_id
    SELECT company_id INTO v_user_company_id
    FROM users 
    WHERE email = p_user_email
    UNION ALL
    SELECT company_id 
    FROM guests 
    WHERE email = p_user_email AND event_id = p_event_id
    LIMIT 1;
    
    IF v_user_company_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    RETURN QUERY
    SELECT 
        gcm.message_id,
        gcm.event_id,
        gcm.sender_name,
        gcm.sender_type::VARCHAR(20),
        gcm.sender_email,
        CASE 
            WHEN gcm.sender_type = 'admin' THEN u.avatar
            ELSE NULL
        END as avatar_url,
        gcm.message_text,
        gcm.message_type::VARCHAR(20),
        gcm.attachment_url,
        gcm.attachment_filename,
        gcm.company_id,
        gcm.created_at,
        gcm.reply_to_message_id,
        gcm.is_edited,
        gcm.edited_at,
        gcm.created_at as sent_at,
        COALESCE(gcr.read_at IS NOT NULL, false) as is_read,
        gcr.read_at,
        COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'emoji', gcr2.emoji,
                    'user_email', gcr2.user_email
                )
            ) FROM guests_chat_reactions gcr2 
            WHERE gcr2.message_id = gcm.message_id), 
            '[]'::json
        ) as reactions
    FROM guests_chat_messages gcm
    LEFT JOIN users u ON gcm.sender_email = u.email
    LEFT JOIN guests_chat_receipts gcr ON gcm.message_id = gcr.message_id 
        AND gcr.participant_email = p_user_email
    WHERE gcm.event_id = p_event_id
    AND gcm.company_id = v_user_company_id
    ORDER BY gcm.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated, anon;

SELECT 'Chat RPC functions fixed successfully' AS status; 