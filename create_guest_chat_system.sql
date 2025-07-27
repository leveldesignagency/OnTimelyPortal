-- ============================================================================
-- GUEST CHAT SYSTEM - Complete SQL Schema
-- WhatsApp-style chat between Event Admins and Guests with Push Notifications
-- ============================================================================

-- 1. Chat Channels Table
-- Represents individual chat channels for each event
CREATE TABLE IF NOT EXISTS chat_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Guest Chat',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Chat Participants Table  
-- Links guests and admins to chat channels
CREATE TABLE IF NOT EXISTS chat_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- For admin users
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE, -- For guest users
    participant_type VARCHAR(20) NOT NULL CHECK (participant_type IN ('admin', 'guest')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure either user_id or guest_id is set, but not both
    CONSTRAINT check_participant_exclusive CHECK (
        (user_id IS NOT NULL AND guest_id IS NULL) OR 
        (user_id IS NULL AND guest_id IS NOT NULL)
    ),
    
    -- Unique constraint to prevent duplicate participants
    UNIQUE(channel_id, user_id),
    UNIQUE(channel_id, guest_id)
);

-- 3. Chat Messages Table
-- Stores all chat messages with comprehensive metadata
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES chat_participants(id) ON DELETE CASCADE,
    message_text TEXT,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    attachment_url TEXT,
    attachment_filename TEXT,
    attachment_size INTEGER,
    reply_to_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure message has content or attachment
    CONSTRAINT check_message_content CHECK (
        message_text IS NOT NULL OR attachment_url IS NOT NULL
    )
);

-- 4. Chat Message Recipients Table
-- Tracks read receipts for each message per participant
CREATE TABLE IF NOT EXISTS chat_message_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES chat_participants(id) ON DELETE CASCADE,
    delivered_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT false,
    
    UNIQUE(message_id, participant_id)
);

-- 5. Chat Notifications Table
-- Tracks push notifications sent for chat messages
CREATE TABLE IF NOT EXISTS chat_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES chat_participants(id) ON DELETE CASCADE,
    notification_title TEXT NOT NULL,
    notification_body TEXT NOT NULL,
    push_token TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    is_sent BOOLEAN DEFAULT false,
    is_delivered BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Chat Channels Indexes
CREATE INDEX IF NOT EXISTS idx_chat_channels_event_id ON chat_channels(event_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_active ON chat_channels(is_active) WHERE is_active = true;

-- Chat Participants Indexes  
CREATE INDEX IF NOT EXISTS idx_chat_participants_channel_id ON chat_participants(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_participants_guest_id ON chat_participants(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_participants_type ON chat_participants(participant_type);

-- Chat Messages Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sent_at ON chat_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_not_deleted ON chat_messages(channel_id, sent_at DESC) WHERE is_deleted = false;

-- Chat Message Recipients Indexes
CREATE INDEX IF NOT EXISTS idx_chat_message_recipients_message_id ON chat_message_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_recipients_participant_id ON chat_message_recipients(participant_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_recipients_unread ON chat_message_recipients(participant_id, is_read) WHERE is_read = false;

-- Chat Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_chat_notifications_message_id ON chat_notifications(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_recipient_id ON chat_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_unsent ON chat_notifications(is_sent) WHERE is_sent = false;

-- ============================================================================
-- RLS (Row Level Security) Policies
-- ============================================================================

-- Enable RLS on all chat tables
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_notifications ENABLE ROW LEVEL SECURITY;

-- Chat Channels Policies
CREATE POLICY "Users can view event chat channels" ON chat_channels
    FOR SELECT TO authenticated, anon
    USING (
        event_id IN (
            SELECT e.id FROM events e 
            WHERE e.company_id = (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
        OR 
        event_id IN (
            SELECT g.event_id FROM guests g WHERE g.email = auth.email()
        )
    );

CREATE POLICY "Admins can insert chat channels" ON chat_channels
    FOR INSERT TO authenticated
    WITH CHECK (
        event_id IN (
            SELECT e.id FROM events e 
            WHERE e.company_id = (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins can update chat channels" ON chat_channels
    FOR UPDATE TO authenticated
    USING (
        event_id IN (
            SELECT e.id FROM events e 
            WHERE e.company_id = (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Chat Participants Policies
CREATE POLICY "Users can view channel participants" ON chat_participants
    FOR SELECT TO authenticated, anon
    USING (
        channel_id IN (
            SELECT id FROM chat_channels 
            WHERE event_id IN (
                SELECT e.id FROM events e 
                WHERE e.company_id = (
                    SELECT company_id FROM users WHERE id = auth.uid()
                )
            )
            OR event_id IN (
                SELECT g.event_id FROM guests g WHERE g.email = auth.email()
            )
        )
    );

CREATE POLICY "Admins can manage participants" ON chat_participants
    FOR ALL TO authenticated
    USING (
        channel_id IN (
            SELECT id FROM chat_channels 
            WHERE event_id IN (
                SELECT e.id FROM events e 
                WHERE e.company_id = (
                    SELECT company_id FROM users WHERE id = auth.uid()
                )
            )
        )
    );

-- Chat Messages Policies
CREATE POLICY "Users can view channel messages" ON chat_messages
    FOR SELECT TO authenticated, anon
    USING (
        channel_id IN (
            SELECT cp.channel_id FROM chat_participants cp
            WHERE (cp.user_id = auth.uid() OR cp.guest_id IN (
                SELECT g.id FROM guests g WHERE g.email = auth.email()
            ))
            AND cp.is_active = true
        )
    );

CREATE POLICY "Participants can send messages" ON chat_messages
    FOR INSERT TO authenticated, anon
    WITH CHECK (
        sender_id IN (
            SELECT cp.id FROM chat_participants cp
            WHERE (cp.user_id = auth.uid() OR cp.guest_id IN (
                SELECT g.id FROM guests g WHERE g.email = auth.email()
            ))
            AND cp.channel_id = chat_messages.channel_id
            AND cp.is_active = true
        )
    );

-- Chat Message Recipients Policies
CREATE POLICY "Users can view message recipients" ON chat_message_recipients
    FOR SELECT TO authenticated, anon
    USING (
        participant_id IN (
            SELECT cp.id FROM chat_participants cp
            WHERE (cp.user_id = auth.uid() OR cp.guest_id IN (
                SELECT g.id FROM guests g WHERE g.email = auth.email()
            ))
        )
    );

CREATE POLICY "Users can update their read status" ON chat_message_recipients
    FOR UPDATE TO authenticated, anon
    USING (
        participant_id IN (
            SELECT cp.id FROM chat_participants cp
            WHERE (cp.user_id = auth.uid() OR cp.guest_id IN (
                SELECT g.id FROM guests g WHERE g.email = auth.email()
            ))
        )
    );

-- ============================================================================
-- STORED PROCEDURES (RPC Functions)
-- ============================================================================

-- Function: Get or Create Chat Channel for Event
CREATE OR REPLACE FUNCTION get_or_create_event_chat_channel(p_event_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_channel_id UUID;
    v_company_id UUID;
BEGIN
    -- Get company_id for the event
    SELECT company_id INTO v_company_id
    FROM events 
    WHERE id = p_event_id;
    
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Event not found or access denied';
    END IF;
    
    -- Check if channel already exists
    SELECT id INTO v_channel_id
    FROM chat_channels 
    WHERE event_id = p_event_id 
    AND is_active = true
    LIMIT 1;
    
    -- Create channel if it doesn't exist
    IF v_channel_id IS NULL THEN
        INSERT INTO chat_channels (event_id, name, description)
        VALUES (p_event_id, 'Guest Chat', 'Chat between event organizers and guests')
        RETURNING id INTO v_channel_id;
    END IF;
    
    RETURN v_channel_id;
END;
$$;

-- Function: Add Participant to Chat Channel
CREATE OR REPLACE FUNCTION add_chat_participant(
    p_channel_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_guest_id UUID DEFAULT NULL,
    p_participant_type VARCHAR(20)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_participant_id UUID;
BEGIN
    -- Validate input
    IF (p_user_id IS NULL AND p_guest_id IS NULL) OR 
       (p_user_id IS NOT NULL AND p_guest_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Exactly one of user_id or guest_id must be provided';
    END IF;
    
    IF p_participant_type NOT IN ('admin', 'guest') THEN
        RAISE EXCEPTION 'Invalid participant type';
    END IF;
    
    -- Insert participant (handle conflicts)
    INSERT INTO chat_participants (channel_id, user_id, guest_id, participant_type)
    VALUES (p_channel_id, p_user_id, p_guest_id, p_participant_type)
    ON CONFLICT (channel_id, user_id) DO UPDATE SET
        is_active = true,
        joined_at = NOW()
    ON CONFLICT (channel_id, guest_id) DO UPDATE SET
        is_active = true,
        joined_at = NOW()
    RETURNING id INTO v_participant_id;
    
    RETURN v_participant_id;
END;
$$;

-- Function: Send Chat Message
CREATE OR REPLACE FUNCTION send_chat_message(
    p_channel_id UUID,
    p_sender_email TEXT,
    p_message_text TEXT,
    p_message_type VARCHAR(20) DEFAULT 'text',
    p_attachment_url TEXT DEFAULT NULL,
    p_attachment_filename TEXT DEFAULT NULL,
    p_reply_to_message_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_participant_id UUID;
    v_message_id UUID;
    v_recipient_participant RECORD;
    v_notification_id UUID;
    v_sender_name TEXT;
    v_event_name TEXT;
BEGIN
    -- Find sender participant
    SELECT cp.id INTO v_sender_participant_id
    FROM chat_participants cp
    LEFT JOIN users u ON cp.user_id = u.id
    LEFT JOIN guests g ON cp.guest_id = g.id
    WHERE cp.channel_id = p_channel_id
    AND cp.is_active = true
    AND (u.email = p_sender_email OR g.email = p_sender_email);
    
    IF v_sender_participant_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Sender not found in channel'
        );
    END IF;
    
    -- Get sender name and event name for notifications
    SELECT 
        COALESCE(u.first_name || ' ' || u.last_name, g.first_name || ' ' || g.last_name, 'Unknown User') as sender_name,
        e.name as event_name
    INTO v_sender_name, v_event_name
    FROM chat_participants cp
    LEFT JOIN users u ON cp.user_id = u.id
    LEFT JOIN guests g ON cp.guest_id = g.id
    LEFT JOIN chat_channels cc ON cp.channel_id = cc.id
    LEFT JOIN events e ON cc.event_id = e.id
    WHERE cp.id = v_sender_participant_id;
    
    -- Insert message
    INSERT INTO chat_messages (
        channel_id, sender_id, message_text, message_type, 
        attachment_url, attachment_filename, reply_to_message_id
    )
    VALUES (
        p_channel_id, v_sender_participant_id, p_message_text, p_message_type,
        p_attachment_url, p_attachment_filename, p_reply_to_message_id
    )
    RETURNING id INTO v_message_id;
    
    -- Create recipient records and notifications for all other participants
    FOR v_recipient_participant IN 
        SELECT cp.id, cp.user_id, cp.guest_id, cp.participant_type,
               u.email as user_email, g.email as guest_email
        FROM chat_participants cp
        LEFT JOIN users u ON cp.user_id = u.id
        LEFT JOIN guests g ON cp.guest_id = g.id
        WHERE cp.channel_id = p_channel_id
        AND cp.is_active = true
        AND cp.id != v_sender_participant_id
    LOOP
        -- Insert recipient record
        INSERT INTO chat_message_recipients (message_id, participant_id)
        VALUES (v_message_id, v_recipient_participant.id);
        
        -- Create notification record
        INSERT INTO chat_notifications (
            message_id, recipient_id, notification_title, notification_body
        )
        VALUES (
            v_message_id, 
            v_recipient_participant.id,
            v_event_name || ' - ' || v_sender_name,
            SUBSTRING(p_message_text, 1, 100) || CASE WHEN LENGTH(p_message_text) > 100 THEN '...' ELSE '' END
        )
        RETURNING id INTO v_notification_id;
        
        -- TODO: Trigger push notification (call external function)
        -- This will be handled by a separate background job or webhook
        
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message_id', v_message_id,
        'sent_at', NOW()
    );
END;
$$;

-- Function: Get Chat Messages for Channel
CREATE OR REPLACE FUNCTION get_chat_messages(
    p_channel_id UUID,
    p_user_email TEXT,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    message_id UUID,
    sender_name TEXT,
    sender_type VARCHAR(20),
    message_text TEXT,
    message_type VARCHAR(20),
    attachment_url TEXT,
    attachment_filename TEXT,
    reply_to_message_id UUID,
    is_edited BOOLEAN,
    sent_at TIMESTAMPTZ,
    is_read BOOLEAN,
    read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_participant_id UUID;
BEGIN
    -- Find user's participant ID
    SELECT cp.id INTO v_user_participant_id
    FROM chat_participants cp
    LEFT JOIN users u ON cp.user_id = u.id
    LEFT JOIN guests g ON cp.guest_id = g.id
    WHERE cp.channel_id = p_channel_id
    AND cp.is_active = true
    AND (u.email = p_user_email OR g.email = p_user_email);
    
    IF v_user_participant_id IS NULL THEN
        RAISE EXCEPTION 'User not found in channel';
    END IF;
    
    RETURN QUERY
    SELECT 
        cm.id as message_id,
        COALESCE(
            u.first_name || ' ' || u.last_name, 
            g.first_name || ' ' || g.last_name, 
            'Unknown User'
        ) as sender_name,
        cp.participant_type as sender_type,
        cm.message_text,
        cm.message_type,
        cm.attachment_url,
        cm.attachment_filename,
        cm.reply_to_message_id,
        cm.is_edited,
        cm.sent_at,
        COALESCE(cmr.is_read, false) as is_read,
        cmr.read_at
    FROM chat_messages cm
    JOIN chat_participants cp ON cm.sender_id = cp.id
    LEFT JOIN users u ON cp.user_id = u.id
    LEFT JOIN guests g ON cp.guest_id = g.id
    LEFT JOIN chat_message_recipients cmr ON cm.id = cmr.message_id 
        AND cmr.participant_id = v_user_participant_id
    WHERE cm.channel_id = p_channel_id
    AND cm.is_deleted = false
    ORDER BY cm.sent_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function: Mark Messages as Read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_channel_id UUID,
    p_user_email TEXT,
    p_message_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_participant_id UUID;
    v_updated_count INTEGER;
BEGIN
    -- Find user's participant ID
    SELECT cp.id INTO v_user_participant_id
    FROM chat_participants cp
    LEFT JOIN users u ON cp.user_id = u.id
    LEFT JOIN guests g ON cp.guest_id = g.id
    WHERE cp.channel_id = p_channel_id
    AND cp.is_active = true
    AND (u.email = p_user_email OR g.email = p_user_email);
    
    IF v_user_participant_id IS NULL THEN
        RAISE EXCEPTION 'User not found in channel';
    END IF;
    
    -- Mark messages as read
    IF p_message_ids IS NULL THEN
        -- Mark all unread messages as read
        UPDATE chat_message_recipients 
        SET is_read = true, read_at = NOW()
        WHERE participant_id = v_user_participant_id
        AND is_read = false;
    ELSE
        -- Mark specific messages as read
        UPDATE chat_message_recipients 
        SET is_read = true, read_at = NOW()
        WHERE participant_id = v_user_participant_id
        AND message_id = ANY(p_message_ids)
        AND is_read = false;
    END IF;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    -- Update participant's last read timestamp
    UPDATE chat_participants 
    SET last_read_at = NOW()
    WHERE id = v_user_participant_id;
    
    RETURN v_updated_count;
END;
$$;

-- Function: Get Unread Message Count for User
CREATE OR REPLACE FUNCTION get_chat_unread_count(
    p_user_email TEXT,
    p_event_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_unread_count INTEGER;
BEGIN
    SELECT COUNT(cmr.id) INTO v_unread_count
    FROM chat_message_recipients cmr
    JOIN chat_participants cp ON cmr.participant_id = cp.id
    JOIN chat_channels cc ON cp.channel_id = cc.id
    LEFT JOIN users u ON cp.user_id = u.id
    LEFT JOIN guests g ON cp.guest_id = g.id
    WHERE (u.email = p_user_email OR g.email = p_user_email)
    AND cmr.is_read = false
    AND cp.is_active = true
    AND cc.is_active = true
    AND (p_event_id IS NULL OR cc.event_id = p_event_id);
    
    RETURN COALESCE(v_unread_count, 0);
END;
$$;

-- ============================================================================
-- TRIGGERS for Real-time Updates
-- ============================================================================

-- Function: Update timestamp on table changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
CREATE TRIGGER update_chat_channels_updated_at 
    BEFORE UPDATE ON chat_channels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at 
    BEFORE UPDATE ON chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION get_or_create_event_chat_channel TO authenticated, anon;
GRANT EXECUTE ON FUNCTION add_chat_participant TO authenticated, anon;
GRANT EXECUTE ON FUNCTION send_chat_message TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_chat_messages TO authenticated, anon;
GRANT EXECUTE ON FUNCTION mark_messages_as_read TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_chat_unread_count TO authenticated, anon;

-- Grant table permissions
GRANT SELECT, INSERT ON chat_channels TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON chat_participants TO authenticated, anon;
GRANT SELECT, INSERT ON chat_messages TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON chat_message_recipients TO authenticated, anon;
GRANT SELECT ON chat_notifications TO authenticated, anon;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Note: This will be created dynamically when admins access chat for the first time
-- The get_or_create_event_chat_channel function handles channel creation automatically

COMMENT ON TABLE chat_channels IS 'Chat channels for event-based communication';
COMMENT ON TABLE chat_participants IS 'Participants (admins and guests) in chat channels';
COMMENT ON TABLE chat_messages IS 'All chat messages with comprehensive metadata';
COMMENT ON TABLE chat_message_recipients IS 'Read receipts and delivery status per participant';
COMMENT ON TABLE chat_notifications IS 'Push notification tracking for chat messages'; 