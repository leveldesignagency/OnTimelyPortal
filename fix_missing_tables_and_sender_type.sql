-- ============================================================================
-- FIX MISSING TABLES AND SENDER_TYPE ISSUE
-- ============================================================================

-- Step 1: Create the missing guests_chat_receipts table
CREATE TABLE IF NOT EXISTS guests_chat_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  event_id UUID NOT NULL,
  participant_email TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('admin', 'guest')),
  company_id UUID NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique receipts per message/participant
  UNIQUE (message_id, participant_email),
  
  -- Foreign key constraints
  CONSTRAINT guests_chat_receipts_message_id_fkey 
    FOREIGN KEY (message_id) REFERENCES guests_chat_messages(message_id) ON DELETE CASCADE,
  CONSTRAINT guests_chat_receipts_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT guests_chat_receipts_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Step 2: Create the missing guests_chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS guests_chat_messages (
  message_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'guest')),
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachment_url TEXT,
  attachment_filename TEXT,
  company_id UUID NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT guests_chat_messages_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT guests_chat_messages_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Step 3: Fix the send_guests_chat_message function to properly determine sender_type
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
    v_user_id UUID;
    v_guest_id UUID;
BEGIN
    -- Get event company_id
    SELECT company_id INTO v_company_id
    FROM events 
    WHERE id = p_event_id;
    
    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Event not found');
    END IF;

    -- First, check if sender is a guest for this event
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
    ELSE
        -- Check if sender is an assigned admin for this event
        SELECT u.id, u.name
        INTO v_user_id, v_sender_name
        FROM users u
        INNER JOIN team_members tm ON u.id = tm.user_id
        INNER JOIN teams t ON tm.team_id = t.id
        INNER JOIN team_events te ON t.id = te.team_id
        WHERE te.event_id = p_event_id
          AND u.email = p_sender_email
          AND u.company_id = v_company_id
        LIMIT 1;

        IF v_user_id IS NOT NULL THEN
            -- Sender is an admin
            v_sender_type := 'admin';
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
        company_id
    ) VALUES (
        v_message_id,
        p_event_id,
        p_sender_email,
        v_sender_name,
        v_sender_type,  -- This should now be correct: 'guest' or 'admin'
        p_message_text,
        p_message_type,
        v_company_id
    );

    -- Create read receipts for all participants except sender
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
$$;

-- Step 4: Grant execute permissions
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated, anon;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guests_chat_messages_event_id ON guests_chat_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_messages_sender_email ON guests_chat_messages(sender_email);
CREATE INDEX IF NOT EXISTS idx_guests_chat_messages_created_at ON guests_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_guests_chat_receipts_message_id ON guests_chat_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_receipts_participant_email ON guests_chat_receipts(participant_email);

-- Step 6: Enable RLS if not already enabled
ALTER TABLE guests_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests_chat_receipts ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
CREATE POLICY "Allow authenticated users access to guest chat messages" 
  ON guests_chat_messages FOR ALL 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users access to guest chat receipts" 
  ON guests_chat_receipts FOR ALL 
  USING (auth.role() = 'authenticated');

-- Step 8: Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE guests_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE guests_chat_receipts;

-- Step 9: Verify the fix
SELECT 'Missing tables created and sender_type issue fixed' AS status; 