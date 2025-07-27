-- ============================================================================
-- GUESTS CHAT SYSTEM - COMPLETE SETUP
-- Simple event-based chat between admins and guests
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- Guests Chat Participants (who can chat in each event)
CREATE TABLE IF NOT EXISTS guests_chat_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL,
    user_id UUID, -- Admin user (from users table)
    guest_id UUID, -- Guest user (from guests table)
    participant_type VARCHAR(20) NOT NULL CHECK (participant_type IN ('admin', 'guest')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure one of user_id or guest_id is set, not both
    CONSTRAINT check_participant_exclusive CHECK (
        (user_id IS NOT NULL AND guest_id IS NULL) OR 
        (user_id IS NULL AND guest_id IS NOT NULL)
    )
);

-- Guests Chat Messages
CREATE TABLE IF NOT EXISTS guests_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL,
    sender_id UUID NOT NULL, -- References guests_chat_participants.id
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    attachment_url TEXT,
    attachment_filename TEXT,
    attachment_size INTEGER,
    reply_to_message_id UUID, -- References guests_chat_messages.id
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guests Chat Read Receipts
CREATE TABLE IF NOT EXISTS guests_chat_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL, -- References guests_chat_messages.id
    participant_id UUID NOT NULL, -- References guests_chat_participants.id
    delivered_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT false,
    
    -- Unique constraint to prevent duplicate receipts
    UNIQUE(message_id, participant_id)
);

-- Guests Chat Push Notifications
CREATE TABLE IF NOT EXISTS guests_chat_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL, -- References guests_chat_messages.id
    recipient_id UUID NOT NULL, -- References guests_chat_participants.id
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
-- 2. ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Guests Chat Participants constraints
ALTER TABLE guests_chat_participants 
ADD CONSTRAINT fk_guests_chat_participants_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE guests_chat_participants 
ADD CONSTRAINT fk_guests_chat_participants_guest_id 
FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE;

-- Guests Chat Messages constraints  
ALTER TABLE guests_chat_messages 
ADD CONSTRAINT fk_guests_chat_messages_sender_id 
FOREIGN KEY (sender_id) REFERENCES guests_chat_participants(id) ON DELETE CASCADE;

ALTER TABLE guests_chat_messages 
ADD CONSTRAINT fk_guests_chat_messages_reply_to 
FOREIGN KEY (reply_to_message_id) REFERENCES guests_chat_messages(id) ON DELETE SET NULL;

-- Guests Chat Receipts constraints
ALTER TABLE guests_chat_receipts 
ADD CONSTRAINT fk_guests_chat_receipts_message_id 
FOREIGN KEY (message_id) REFERENCES guests_chat_messages(id) ON DELETE CASCADE;

ALTER TABLE guests_chat_receipts 
ADD CONSTRAINT fk_guests_chat_receipts_participant_id 
FOREIGN KEY (participant_id) REFERENCES guests_chat_participants(id) ON DELETE CASCADE;

-- Guests Chat Notifications constraints
ALTER TABLE guests_chat_notifications 
ADD CONSTRAINT fk_guests_chat_notifications_message_id 
FOREIGN KEY (message_id) REFERENCES guests_chat_messages(id) ON DELETE CASCADE;

ALTER TABLE guests_chat_notifications 
ADD CONSTRAINT fk_guests_chat_notifications_recipient_id 
FOREIGN KEY (recipient_id) REFERENCES guests_chat_participants(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Guests Chat Participants indexes
CREATE INDEX IF NOT EXISTS idx_guests_chat_participants_event_id ON guests_chat_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_participants_user_id ON guests_chat_participants(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guests_chat_participants_guest_id ON guests_chat_participants(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guests_chat_participants_type ON guests_chat_participants(participant_type);

-- Guests Chat Messages indexes
CREATE INDEX IF NOT EXISTS idx_guests_chat_messages_event_id ON guests_chat_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_messages_sender_id ON guests_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_messages_sent_at ON guests_chat_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_guests_chat_messages_event_sent ON guests_chat_messages(event_id, sent_at DESC) WHERE is_deleted = false;

-- Guests Chat Receipts indexes
CREATE INDEX IF NOT EXISTS idx_guests_chat_receipts_message_id ON guests_chat_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_receipts_participant_id ON guests_chat_receipts(participant_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_receipts_unread ON guests_chat_receipts(participant_id, is_read) WHERE is_read = false;

-- Guests Chat Notifications indexes
CREATE INDEX IF NOT EXISTS idx_guests_chat_notifications_message_id ON guests_chat_notifications(message_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_notifications_recipient_id ON guests_chat_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_notifications_unsent ON guests_chat_notifications(is_sent) WHERE is_sent = false;

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE guests_chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests_chat_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests_chat_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. ADD RLS POLICIES
-- ============================================================================

-- Guests Chat Participants Policies
CREATE POLICY "Event participants can view participants" ON guests_chat_participants
    FOR SELECT TO authenticated, anon
    USING (
        -- Admin can see participants for events in their company
        (EXISTS (
            SELECT 1 FROM events e 
            JOIN users u ON e.company_id = u.company_id
            WHERE e.id = event_id AND u.id = auth.uid()
        ))
        OR 
        -- Guest can see participants for their event
        (EXISTS (
            SELECT 1 FROM guests g 
            WHERE g.event_id = event_id AND g.email = auth.email()
        ))
    );

CREATE POLICY "Event participants can join chat" ON guests_chat_participants
    FOR INSERT TO authenticated, anon
    WITH CHECK (
        -- Admin can join chat for events in their company
        (EXISTS (
            SELECT 1 FROM events e 
            JOIN users u ON e.company_id = u.company_id
            WHERE e.id = event_id AND u.id = auth.uid()
        ))
        OR 
        -- Guest can join chat for their event
        (EXISTS (
            SELECT 1 FROM guests g 
            WHERE g.event_id = event_id AND g.email = auth.email()
        ))
    );

-- Guests Chat Messages Policies
CREATE POLICY "Event participants can view messages" ON guests_chat_messages
    FOR SELECT TO authenticated, anon
    USING (
        -- Admin can see messages for events in their company
        (EXISTS (
            SELECT 1 FROM events e 
            JOIN users u ON e.company_id = u.company_id
            WHERE e.id = event_id AND u.id = auth.uid()
        ))
        OR 
        -- Guest can see messages for their event
        (EXISTS (
            SELECT 1 FROM guests g 
            WHERE g.event_id = event_id AND g.email = auth.email()
        ))
    );

CREATE POLICY "Event participants can send messages" ON guests_chat_messages
    FOR INSERT TO authenticated, anon
    WITH CHECK (
        -- Admin can send messages for events in their company
        (EXISTS (
            SELECT 1 FROM events e 
            JOIN users u ON e.company_id = u.company_id
            WHERE e.id = event_id AND u.id = auth.uid()
        ))
        OR 
        -- Guest can send messages for their event
        (EXISTS (
            SELECT 1 FROM guests g 
            WHERE g.event_id = event_id AND g.email = auth.email()
        ))
    );

-- Guests Chat Receipts Policies
CREATE POLICY "Event participants can view receipts" ON guests_chat_receipts
    FOR SELECT TO authenticated, anon
    USING (
        -- Can view receipts if you're part of the event
        EXISTS (
            SELECT 1 FROM guests_chat_messages gcm
            WHERE gcm.id = message_id AND (
                -- Admin can see receipts for events in their company
                (EXISTS (
                    SELECT 1 FROM events e 
                    JOIN users u ON e.company_id = u.company_id
                    WHERE e.id = gcm.event_id AND u.id = auth.uid()
                ))
                OR 
                -- Guest can see receipts for their event
                (EXISTS (
                    SELECT 1 FROM guests g 
                    WHERE g.event_id = gcm.event_id AND g.email = auth.email()
                ))
            )
        )
    );

CREATE POLICY "Event participants can update read status" ON guests_chat_receipts
    FOR UPDATE TO authenticated, anon
    USING (
        -- Can update read status for your own receipts
        participant_id IN (
            SELECT gcp.id FROM guests_chat_participants gcp
            LEFT JOIN users u ON gcp.user_id = u.id
            LEFT JOIN guests g ON gcp.guest_id = g.id
            WHERE (u.id = auth.uid() OR g.email = auth.email())
        )
    );

-- Allow system to manage receipts
CREATE POLICY "System can manage receipts" ON guests_chat_receipts
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

-- Guests Chat Notifications Policies
CREATE POLICY "Users can view their notifications" ON guests_chat_notifications
    FOR SELECT TO authenticated, anon
    USING (
        -- Can view your own notifications
        recipient_id IN (
            SELECT gcp.id FROM guests_chat_participants gcp
            LEFT JOIN users u ON gcp.user_id = u.id
            LEFT JOIN guests g ON gcp.guest_id = g.id
            WHERE (u.id = auth.uid() OR g.email = auth.email())
        )
    );

-- Allow system to manage notifications
CREATE POLICY "System can manage notifications" ON guests_chat_notifications
    FOR ALL TO authenticated, anon
    USING (true);

-- ============================================================================
-- 6. CREATE STORED PROCEDURES
-- ============================================================================

-- Function: Update timestamp on table changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp trigger
CREATE TRIGGER update_guests_chat_messages_updated_at 
    BEFORE UPDATE ON guests_chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Initialize Event Chat
CREATE OR REPLACE FUNCTION initialize_guests_chat(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_guest_count INTEGER := 0;
    v_admin_count INTEGER := 0;
    v_guest RECORD;
    v_admin RECORD;
BEGIN
    -- Add all guests for this event to the chat
    FOR v_guest IN 
        SELECT id, email, first_name, last_name 
        FROM guests 
        WHERE event_id = p_event_id
    LOOP
        -- Check if guest is already a participant
        IF NOT EXISTS (
            SELECT 1 FROM guests_chat_participants 
            WHERE event_id = p_event_id AND guest_id = v_guest.id
        ) THEN
            INSERT INTO guests_chat_participants (event_id, guest_id, participant_type)
            VALUES (p_event_id, v_guest.id, 'guest');
            v_guest_count := v_guest_count + 1;
        END IF;
    END LOOP;
    
    -- Add all admins (users) for this event's company to the chat
    FOR v_admin IN 
        SELECT u.id, u.email, u.first_name, u.last_name 
        FROM users u
        JOIN events e ON u.company_id = e.company_id
        WHERE e.id = p_event_id
    LOOP
        -- Check if admin is already a participant
        IF NOT EXISTS (
            SELECT 1 FROM guests_chat_participants 
            WHERE event_id = p_event_id AND user_id = v_admin.id
        ) THEN
            INSERT INTO guests_chat_participants (event_id, user_id, participant_type)
            VALUES (p_event_id, v_admin.id, 'admin');
            v_admin_count := v_admin_count + 1;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'guests_added', v_guest_count,
        'admins_added', v_admin_count,
        'message', 'Guests chat initialized successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to initialize guests chat'
    );
END;
$$;

-- Function: Send Message to Guests Chat
CREATE OR REPLACE FUNCTION send_guests_chat_message(
    p_event_id UUID,
    p_sender_email TEXT,
    p_message_text TEXT,
    p_message_type VARCHAR(20) DEFAULT 'text',
    p_attachment_url TEXT DEFAULT NULL,
    p_attachment_filename TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_participant_id UUID;
    v_message_id UUID;
    v_recipient_participant RECORD;
    v_sender_name TEXT;
    v_event_name TEXT DEFAULT 'Event Chat';
    v_recipients_count INTEGER := 0;
BEGIN
    -- Find sender participant
    SELECT gcp.id INTO v_sender_participant_id
    FROM guests_chat_participants gcp
    LEFT JOIN users u ON gcp.user_id = u.id
    LEFT JOIN guests g ON gcp.guest_id = g.id
    WHERE gcp.event_id = p_event_id
    AND gcp.is_active = true
    AND (u.email = p_sender_email OR g.email = p_sender_email);
    
    IF v_sender_participant_id IS NULL THEN
        -- Try to initialize chat first
        PERFORM initialize_guests_chat(p_event_id);
        
        -- Try to find sender again
        SELECT gcp.id INTO v_sender_participant_id
        FROM guests_chat_participants gcp
        LEFT JOIN users u ON gcp.user_id = u.id
        LEFT JOIN guests g ON gcp.guest_id = g.id
        WHERE gcp.event_id = p_event_id
        AND gcp.is_active = true
        AND (u.email = p_sender_email OR g.email = p_sender_email);
        
        IF v_sender_participant_id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Sender not found in guests chat'
            );
        END IF;
    END IF;
    
    -- Get sender name and event name
    BEGIN
        SELECT 
            COALESCE(
                u.first_name || ' ' || u.last_name, 
                g.first_name || ' ' || g.last_name, 
                split_part(p_sender_email, '@', 1)
            ) INTO v_sender_name
        FROM guests_chat_participants gcp
        LEFT JOIN users u ON gcp.user_id = u.id
        LEFT JOIN guests g ON gcp.guest_id = g.id
        WHERE gcp.id = v_sender_participant_id;
        
        -- Get event name
        SELECT e.name INTO v_event_name
        FROM events e
        WHERE e.id = p_event_id;
        
        IF v_event_name IS NULL THEN
            v_event_name := 'Event Chat';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        v_sender_name := split_part(p_sender_email, '@', 1);
        v_event_name := 'Event Chat';
    END;
    
    -- Insert message
    INSERT INTO guests_chat_messages (
        event_id, sender_id, message_text, message_type, 
        attachment_url, attachment_filename
    )
    VALUES (
        p_event_id, v_sender_participant_id, p_message_text, p_message_type,
        p_attachment_url, p_attachment_filename
    )
    RETURNING id INTO v_message_id;
    
    -- Create recipient records and notifications for all other participants
    FOR v_recipient_participant IN 
        SELECT gcp.id, gcp.user_id, gcp.guest_id, gcp.participant_type
        FROM guests_chat_participants gcp
        WHERE gcp.event_id = p_event_id
        AND gcp.is_active = true
        AND gcp.id != v_sender_participant_id
    LOOP
        -- Insert recipient record
        INSERT INTO guests_chat_receipts (message_id, participant_id)
        VALUES (v_message_id, v_recipient_participant.id);
        
        -- Create notification record
        INSERT INTO guests_chat_notifications (
            message_id, recipient_id, notification_title, notification_body
        )
        VALUES (
            v_message_id, 
            v_recipient_participant.id,
            v_event_name || ' - ' || v_sender_name,
            SUBSTRING(p_message_text, 1, 100) || CASE WHEN LENGTH(p_message_text) > 100 THEN '...' ELSE '' END
        );
        
        v_recipients_count := v_recipients_count + 1;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message_id', v_message_id,
        'recipients_notified', v_recipients_count,
        'sent_at', NOW()
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Function: Get Messages for Guests Chat
CREATE OR REPLACE FUNCTION get_guests_chat_messages(
    p_event_id UUID,
    p_user_email TEXT,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    message_id UUID,
    sender_name TEXT,
    sender_type VARCHAR(20),
    sender_email TEXT,
    message_text TEXT,
    message_type VARCHAR(20),
    attachment_url TEXT,
    attachment_filename TEXT,
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
        COALESCE(
            u.first_name || ' ' || u.last_name, 
            g.first_name || ' ' || g.last_name, 
            split_part(COALESCE(u.email, g.email), '@', 1)
        ) as sender_name,
        gcp.participant_type as sender_type,
        COALESCE(u.email, g.email) as sender_email,
        gcm.message_text,
        gcm.message_type,
        gcm.attachment_url,
        gcm.attachment_filename,
        gcm.is_edited,
        gcm.sent_at,
        COALESCE(gcr.is_read, false) as is_read,
        gcr.read_at
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

-- Function: Mark Guests Chat Messages as Read
CREATE OR REPLACE FUNCTION mark_guests_chat_messages_as_read(
    p_event_id UUID,
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
    SELECT gcp.id INTO v_user_participant_id
    FROM guests_chat_participants gcp
    LEFT JOIN users u ON gcp.user_id = u.id
    LEFT JOIN guests g ON gcp.guest_id = g.id
    WHERE gcp.event_id = p_event_id
    AND gcp.is_active = true
    AND (u.email = p_user_email OR g.email = p_user_email);
    
    IF v_user_participant_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Mark messages as read
    IF p_message_ids IS NULL THEN
        -- Mark all unread messages as read
        UPDATE guests_chat_receipts 
        SET is_read = true, read_at = NOW()
        WHERE participant_id = v_user_participant_id
        AND is_read = false;
    ELSE
        -- Mark specific messages as read
        UPDATE guests_chat_receipts 
        SET is_read = true, read_at = NOW()
        WHERE participant_id = v_user_participant_id
        AND message_id = ANY(p_message_ids)
        AND is_read = false;
    END IF;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    -- Update participant's last read timestamp
    UPDATE guests_chat_participants 
    SET last_read_at = NOW()
    WHERE id = v_user_participant_id;
    
    RETURN v_updated_count;
END;
$$;

-- Function: Get Unread Message Count for Guests Chat
CREATE OR REPLACE FUNCTION get_guests_chat_unread_count(
    p_event_id UUID,
    p_user_email TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_participant_id UUID;
    v_unread_count INTEGER;
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
        RETURN 0;
    END IF;
    
    SELECT COUNT(gcr.id) INTO v_unread_count
    FROM guests_chat_receipts gcr
    JOIN guests_chat_messages gcm ON gcr.message_id = gcm.id
    WHERE gcr.participant_id = v_user_participant_id
    AND gcr.is_read = false
    AND gcm.is_deleted = false;
    
    RETURN COALESCE(v_unread_count, 0);
END;
$$;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION initialize_guests_chat TO authenticated, anon;
GRANT EXECUTE ON FUNCTION send_guests_chat_message TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_guests_chat_messages TO authenticated, anon;
GRANT EXECUTE ON FUNCTION mark_guests_chat_messages_as_read TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_guests_chat_unread_count TO authenticated, anon;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON guests_chat_participants TO authenticated, anon;
GRANT SELECT, INSERT ON guests_chat_messages TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON guests_chat_receipts TO authenticated, anon;
GRANT SELECT, INSERT ON guests_chat_notifications TO authenticated, anon;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 GUESTS CHAT SYSTEM SETUP COMPLETED!';
    RAISE NOTICE '📋 Tables created:';
    RAISE NOTICE '   • guests_chat_participants';
    RAISE NOTICE '   • guests_chat_messages';
    RAISE NOTICE '   • guests_chat_receipts';
    RAISE NOTICE '   • guests_chat_notifications';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Functions available:';
    RAISE NOTICE '   • initialize_guests_chat(event_id)';
    RAISE NOTICE '   • send_guests_chat_message(event_id, email, message)';
    RAISE NOTICE '   • get_guests_chat_messages(event_id, email)';
    RAISE NOTICE '   • mark_guests_chat_messages_as_read(event_id, email)';
    RAISE NOTICE '   • get_guests_chat_unread_count(event_id, email)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready to use! Just run this one file and you''re done.';
END $$; 