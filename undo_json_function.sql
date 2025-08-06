-- Undo the JSON function change and restore the original TABLE format
-- This matches what GuestChatAdminScreen expects and uses

-- Drop the JSON version
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);

-- Restore the original TABLE format function (this is what GuestChatAdminScreen uses)
CREATE OR REPLACE FUNCTION send_guests_chat_message(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_reply_to_message_id UUID DEFAULT NULL
) RETURNS TABLE (
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
) AS $$
DECLARE
    v_message_id UUID;
    v_sender_name TEXT;
    v_sender_type TEXT;
    v_company_id UUID;
    v_avatar_url TEXT;
    v_final_message_text TEXT;
BEGIN
    -- First check if it's an admin user (company user)
    SELECT 
        name,
        'admin',
        company_id,
        avatar_url
    INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
    FROM users 
    WHERE email = p_sender_email;
    
    -- If not found in users, it's a guest user
    IF v_sender_name IS NULL THEN
        SELECT 
            first_name || ' ' || last_name,
            'guest',
            company_id,
            NULL as avatar_url
        INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
        FROM guests 
        WHERE email = p_sender_email AND event_id = p_event_id;
    END IF;
    
    -- Debug logging
    RAISE NOTICE 'Sender: %, Name: %, Type: %, Avatar: %', p_sender_email, v_sender_name, v_sender_type, v_avatar_url;
    
    -- For attachment messages, store the file URL in the message_text field
    v_final_message_text := p_message_text;
    
    -- Insert the message
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
        v_final_message_text,
        p_message_type,
        v_company_id,
        p_reply_to_message_id
    ) RETURNING message_id INTO v_message_id;
    
    -- Return the result as TABLE (matching GuestChatAdminScreen expectations)
    RETURN QUERY
    SELECT 
        v_message_id,
        p_event_id,
        v_sender_name,
        v_sender_type,
        p_sender_email,
        v_avatar_url,
        v_final_message_text,
        p_message_type,
        v_company_id,
        now(),
        p_reply_to_message_id,
        false,
        null;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT 'Testing send function:' as info;
SELECT * FROM send_guests_chat_message(
    '4e19b264-61a1-484f-8619-4f2d515b3796'::uuid,
    'charlesmorgantravels@gmail.com',
    'test message from undo',
    'text',
    NULL
); 