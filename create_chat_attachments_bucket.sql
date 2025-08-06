-- Create chat attachments storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  52428800, -- 50MB limit
  ARRAY['image/*', 'video/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for chat attachments bucket
CREATE POLICY "Chat attachments are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'chat-attachments');

CREATE POLICY "Authenticated users can upload chat attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own chat attachments" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'chat-attachments' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own chat attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat-attachments' 
  AND auth.role() = 'authenticated'
);

-- Update the send_guests_chat_message function to handle attachments
CREATE OR REPLACE FUNCTION send_guests_chat_message(
    p_event_id UUID,
    p_sender_email TEXT,
    p_message_text TEXT,
    p_message_type VARCHAR(20) DEFAULT 'text',
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
    v_sender_id UUID;
    v_company_id UUID;
    v_sender_name TEXT;
    v_sender_type VARCHAR(20);
    v_avatar_url TEXT;
    v_new_message_id UUID;
BEGIN
    -- Find sender's participant ID
    SELECT gcp.id, gcp.company_id, gcp.participant_type
    INTO v_sender_id, v_company_id, v_sender_type
    FROM guests_chat_participants gcp
    LEFT JOIN users u ON gcp.user_id = u.id
    LEFT JOIN guests g ON gcp.guest_id = g.id
    WHERE gcp.event_id = p_event_id
    AND gcp.is_active = true
    AND (u.email = p_sender_email OR g.email = p_sender_email);
    
    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'Sender not found in guests chat';
    END IF;
    
    -- Get sender name and avatar
    SELECT 
        COALESCE(
            u.first_name || ' ' || u.last_name, 
            g.first_name || ' ' || g.last_name, 
            split_part(COALESCE(u.email, g.email), '@', 1)
        ),
        COALESCE(u.avatar_url, g.avatar_url)
    INTO v_sender_name, v_avatar_url
    FROM guests_chat_participants gcp
    LEFT JOIN users u ON gcp.user_id = u.id
    LEFT JOIN guests g ON gcp.guest_id = g.id
    WHERE gcp.id = v_sender_id;
    
    -- Insert the message
    INSERT INTO guests_chat_messages (
        event_id,
        sender_id,
        message_text,
        message_type,
        attachment_url,
        attachment_filename,
        company_id,
        reply_to_message_id,
        sent_at
    ) VALUES (
        p_event_id,
        v_sender_id,
        p_message_text,
        p_message_type,
        p_attachment_url,
        p_attachment_filename,
        v_company_id,
        p_reply_to_message_id,
        NOW()
    ) RETURNING id INTO v_new_message_id;
    
    -- Return the message with all details
    RETURN QUERY
    SELECT 
        gcm.id as message_id,
        gcm.event_id,
        v_sender_name as sender_name,
        v_sender_type as sender_type,
        p_sender_email as sender_email,
        v_avatar_url as avatar_url,
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
        false as is_read,
        NULL as read_at,
        '[]'::json as reactions
    FROM guests_chat_messages gcm
    WHERE gcm.id = v_new_message_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, VARCHAR, UUID, TEXT, TEXT) TO authenticated, anon;

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

SELECT 'Chat attachments bucket and functions created successfully' AS status; 