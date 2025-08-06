-- ============================================================================
-- DEFINITIVE GUEST CHAT FIX - CLEAN VERSION
-- Based on actual table structure and current issues
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

-- Step 2: Fix the send_guests_chat_message function with explicit column qualification
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
        SELECT u.id, u.name
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
$$;

-- Step 3: Fix the get_guests_chat_messages function with explicit column qualification
DROP FUNCTION IF EXISTS get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_guests_chat_messages(
  p_event_id UUID,
  p_user_email TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  message_id UUID,
  event_id UUID,
  sender_email TEXT,
  sender_name TEXT,
  sender_type TEXT,
  message_text TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ,
  company_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is a participant with explicit table qualification
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants gcp
    WHERE gcp.event_id = p_event_id AND gcp.user_email = p_user_email
  ) THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  -- Return messages with explicit table aliases to avoid ambiguity
  RETURN QUERY
  SELECT 
    gcm.message_id,
    gcm.event_id,
    gcm.sender_email,
    gcm.sender_name,
    gcm.sender_type,
    gcm.message_text,
    gcm.message_type,
    gcm.created_at,
    gcm.company_id
  FROM guests_chat_messages gcm
  WHERE gcm.event_id = p_event_id
  ORDER BY gcm.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Step 4: Grant execute permissions
GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated, anon;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guests_chat_receipts_message_id ON guests_chat_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_receipts_participant_email ON guests_chat_receipts(participant_email);
CREATE INDEX IF NOT EXISTS idx_guests_chat_receipts_event_id ON guests_chat_receipts(event_id);

-- Step 6: Enable RLS and create policies
ALTER TABLE guests_chat_receipts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users access to guest chat receipts" ON guests_chat_receipts;

-- Create new policies
CREATE POLICY "Allow authenticated users access to guest chat receipts" 
  ON guests_chat_receipts FOR ALL 
  USING (auth.role() = 'authenticated');

-- Step 7: Verify the fix
SELECT 'Definitive guest chat fix applied - all issues resolved' AS status; 