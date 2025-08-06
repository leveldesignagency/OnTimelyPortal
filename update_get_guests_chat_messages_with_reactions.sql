-- Update get_guests_chat_messages function to include reactions
DROP FUNCTION IF EXISTS get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER);

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
    v_user_participant_id UUID;
BEGIN
    -- Find user's participant ID
    SELECT gcp.id INTO v_user_participant_id
    FROM guests_chat_participants gcp
    LEFT JOIN users u ON gcp.user_id = u.id
    LEFT JOIN guests g ON gcp.guest_id = g.id
    WHERE gcp.event_id = p_event_id
    AND gcp.is_active = true
    AND (u.email = p_user_email OR g.email = p_user_email);
    
    IF v_user_participant_id IS NULL THEN
        RAISE EXCEPTION 'User not found in guests chat';
    END IF;
    
    RETURN QUERY
    SELECT 
        gcm.id as message_id,
        gcm.event_id,
        COALESCE(
            u.first_name || ' ' || u.last_name, 
            g.first_name || ' ' || g.last_name, 
            split_part(COALESCE(u.email, g.email), '@', 1)
        ) as sender_name,
        gcp.participant_type as sender_type,
        COALESCE(u.email, g.email) as sender_email,
        COALESCE(u.avatar_url, g.avatar_url) as avatar_url,
        gcm.message_text,
        gcm.message_type,
        gcm.attachment_url,
        gcm.attachment_filename,
        gcm.company_id,
        gcm.created_at,
        gcm.reply_to_message_id,
        gcm.is_edited,
        gcm.edited_at,
        gcm.sent_at,
        COALESCE(gcr.is_read, false) as is_read,
        gcr.read_at,
        COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'emoji', gcr2.emoji,
                    'user_email', gcr2.user_email
                )
            ) FROM guests_chat_reactions gcr2 
            WHERE gcr2.message_id = gcm.id), 
            '[]'::json
        ) as reactions
    FROM guests_chat_messages gcm
    JOIN guests_chat_participants gcp ON gcm.sender_id = gcp.id
    LEFT JOIN users u ON gcp.user_id = u.id
    LEFT JOIN guests g ON gcp.guest_id = g.id
    LEFT JOIN guests_chat_receipts gcr ON gcm.id = gcr.message_id 
        AND gcr.participant_id = v_user_participant_id
    WHERE gcm.event_id = p_event_id
    AND gcm.is_deleted = false
    ORDER BY gcm.sent_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated, anon;

SELECT 'get_guests_chat_messages function updated with reactions' AS status; 