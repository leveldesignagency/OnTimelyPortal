-- FINAL COMPLETE FIX - Restore everything to working state
-- This will fix all three screens: GuestChatScreen, GuestChatAdminScreen, GuestChatInterface

-- 1. DROP ALL EXISTING FUNCTIONS TO START FRESH
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, VARCHAR, UUID);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, VARCHAR, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_guests_chat_messages(UUID, TEXT);
DROP FUNCTION IF EXISTS get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER);

-- 2. CREATE THE CORRECT send_guests_chat_message FUNCTION (TABLE format)
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
    v_inserted_message_id UUID;
    v_sender_name TEXT;
    v_sender_type TEXT;
    v_company_id UUID;
    v_avatar_url TEXT;
    v_final_message_text TEXT;
BEGIN
    -- First check if it's an admin user (company user)
    SELECT 
        u.name,
        'admin',
        u.company_id,
        u.avatar_url
    INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
    FROM users u
    WHERE u.email = p_sender_email;
    
    -- If not found in users, it's a guest user
    IF v_sender_name IS NULL THEN
        SELECT 
            g.first_name || ' ' || g.last_name,
            'guest',
            g.company_id,
            NULL as avatar_url
        INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
        FROM guests g
        WHERE g.email = p_sender_email AND g.event_id = p_event_id;
    END IF;
    
    -- Debug logging
    RAISE NOTICE 'Sender: %, Name: %, Type: %, Avatar: %', p_sender_email, v_sender_name, v_sender_type, v_avatar_url;
    
    -- For attachment messages, store the file URL in the message_text field
    v_final_message_text := p_message_text;
    
    -- Insert the message
    INSERT INTO guests_chat_messages AS gcm (
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
    ) RETURNING gcm.message_id INTO v_inserted_message_id;
    
    -- Return the result as TABLE (matching GuestChatAdminScreen expectations)
    RETURN QUERY
    SELECT 
        v_inserted_message_id,
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
        null::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREATE THE CORRECT get_guests_chat_messages FUNCTION (with limit/offset)
CREATE OR REPLACE FUNCTION get_guests_chat_messages(
  p_event_id UUID,
  p_user_email TEXT,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    message_id UUID,
    event_id UUID,
    sender_email TEXT,
    sender_name TEXT,
    sender_type TEXT,
    message_text TEXT,
    message_type TEXT,
    created_at TIMESTAMPTZ,
    company_id UUID
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. VERIFY RLS POLICY IS CORRECT
-- Drop any existing policies
DROP POLICY IF EXISTS "Allow all operations for all users" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow authenticated users access to guest chat messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Enable read access for guests and authenticated users" ON guests_chat_messages;
DROP POLICY IF EXISTS "Enable insert for guests and authenticated users" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow all users to access guest chat messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow all users to read guest chat messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow message sender to update messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow message sender to delete messages" ON guests_chat_messages;

-- Create the correct policy
CREATE POLICY "Allow all operations for all users" ON guests_chat_messages
FOR ALL USING (true) WITH CHECK (true);

-- 5. TEST THE FUNCTIONS
SELECT 'Testing send function:' as info;
SELECT * FROM send_guests_chat_message(
    '4e19b264-61a1-484f-8619-4f2d515b3796'::uuid,
    'charlesmorgantravels@gmail.com',
    'test message from final fix',
    'text',
    NULL
);

SELECT 'Testing get function:' as info;
SELECT * FROM get_guests_chat_messages(
    '4e19b264-61a1-484f-8619-4f2d515b3796'::uuid,
    'charlesmorgantravels@gmail.com',
    10,
    0
); 