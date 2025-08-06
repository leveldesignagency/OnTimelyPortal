-- ============================================================================
-- FIX SUPABASE AUTH USERS CHAT
-- Focus on getting authenticated users to send messages properly
-- ============================================================================

-- Step 1: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users access to guest chat messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow authenticated users access to guest chat receipts" ON guests_chat_receipts;

-- Step 2: Create proper policies for authenticated users
CREATE POLICY "Allow authenticated users access to guest chat messages" 
  ON guests_chat_messages FOR ALL 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users access to guest chat receipts" 
  ON guests_chat_receipts FOR ALL 
  USING (auth.role() = 'authenticated');

-- Step 3: Fix the send_guests_chat_message function to properly handle Supabase auth users
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
    v_current_user_id UUID;
BEGIN
    -- Get current authenticated user ID
    v_current_user_id := auth.uid();
    
    -- Get event company_id
    SELECT company_id INTO v_company_id
    FROM events 
    WHERE id = p_event_id;
    
    IF v_company_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Event not found');
    END IF;

    -- For Supabase auth users, check if they're assigned to this event
    IF v_current_user_id IS NOT NULL THEN
        -- Check if current user is assigned to this event as admin
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

    -- If not an authenticated admin, check if it's a guest
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
        company_id
    ) VALUES (
        v_message_id,
        p_event_id,
        p_sender_email,
        v_sender_name,
        v_sender_type,
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

-- Step 5: Create a simple test function to verify Supabase auth users can send messages
CREATE OR REPLACE FUNCTION test_auth_user_can_send_message(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
    v_company_id UUID;
    v_is_assigned BOOLEAN := FALSE;
BEGIN
    -- Get current authenticated user
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No authenticated user');
    END IF;
    
    -- Get user details
    SELECT email, name, company_id INTO v_user_email, v_user_name, v_company_id
    FROM users
    WHERE id = v_current_user_id;
    
    -- Check if user is assigned to this event
    SELECT TRUE INTO v_is_assigned
    FROM users u
    INNER JOIN team_members tm ON u.id = tm.user_id
    INNER JOIN teams t ON tm.team_id = t.id
    INNER JOIN team_events te ON t.id = te.team_id
    WHERE te.event_id = p_event_id
      AND u.id = v_current_user_id
      AND u.company_id = v_company_id
    LIMIT 1;
    
    RETURN json_build_object(
        'success', true,
        'user_id', v_current_user_id,
        'user_email', v_user_email,
        'user_name', v_user_name,
        'company_id', v_company_id,
        'is_assigned_to_event', v_is_assigned
    );
END;
$$;

GRANT EXECUTE ON FUNCTION test_auth_user_can_send_message(UUID) TO authenticated;

-- Step 6: Verify the fix
SELECT 'Supabase auth users chat fix applied' AS status; 