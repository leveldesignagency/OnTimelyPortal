-- Minimal fix: ONLY fix the guest avatar_url issue, don't touch working admin logic

-- Fix ONLY the send_guests_chat_message function to not access g.avatar_url
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION send_guests_chat_message(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_reply_to_message_id UUID DEFAULT NULL
)
RETURNS TABLE (
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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message_id UUID;
    v_sender_name TEXT;
    v_sender_type TEXT;
    v_avatar_url TEXT;
    v_company_id UUID;
    v_user_id UUID;
    v_guest_id UUID;
    v_created_at TIMESTAMPTZ := now();
    v_is_edited BOOLEAN := FALSE;
    v_edited_at TIMESTAMPTZ := NULL;
BEGIN
    -- Check if it's a guest first
    SELECT g.id, g.company_id INTO v_guest_id, v_company_id
    FROM guests g
    WHERE g.email = p_sender_email;
    
    IF v_guest_id IS NOT NULL THEN
        -- It's a guest - store NULL for avatar_url, not initials
        v_sender_name := (SELECT CONCAT(g.first_name, ' ', g.last_name) FROM guests g WHERE g.id = v_guest_id);
        v_sender_type := 'guest';
        v_avatar_url := NULL; -- Store NULL, not initials
    ELSE
        -- Check if it's a user (admin) - only if not found in guests
        SELECT u.id, u.company_id INTO v_user_id, v_company_id
        FROM users u
        WHERE u.email = p_sender_email;
        
        IF v_user_id IS NOT NULL THEN
            -- User is an admin - use users table
            v_sender_name := (SELECT u.name FROM users u WHERE u.id = v_user_id);
            v_sender_type := 'admin';
            v_avatar_url := (SELECT u.avatar_url FROM users u WHERE u.id = v_user_id);
        ELSE
            RAISE EXCEPTION 'User not found: %', p_sender_email;
        END IF;
    END IF;
    
    -- Insert the message
    INSERT INTO guests_chat_messages (
        event_id,
        sender_name,
        sender_type,
        sender_email,
        avatar_url,
        message_text,
        message_type,
        company_id,
        reply_to_message_id,
        created_at,
        is_edited,
        edited_at
    ) VALUES (
        p_event_id,
        v_sender_name,
        v_sender_type,
        p_sender_email,
        v_avatar_url,
        p_message_text,
        p_message_type,
        v_company_id,
        p_reply_to_message_id,
        v_created_at,
        v_is_edited,
        v_edited_at
    ) RETURNING message_id INTO v_message_id;
    
    -- Return the inserted message
    RETURN QUERY
    SELECT 
        v_message_id,
        p_event_id,
        v_sender_name,
        v_sender_type,
        p_sender_email,
        v_avatar_url,
        p_message_text,
        p_message_type,
        v_company_id,
        v_created_at,
        p_reply_to_message_id,
        v_is_edited,
        v_edited_at;
END;
$$;

GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated, anon;

-- Fix ONLY the ambiguous message_id error in get_guests_chat_messages

-- Fix the get_guests_chat_messages function to remove ambiguous column reference
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
  avatar_url TEXT,
  message_text TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ,
  company_id UUID,
  reply_to_message_id UUID,
  is_edited BOOLEAN,
  edited_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gcm.message_id,
    gcm.event_id,
    gcm.sender_email,
    gcm.sender_name,
    gcm.sender_type,
    CASE 
      WHEN gcm.sender_type = 'admin' THEN u.avatar_url
      ELSE NULL
    END AS avatar_url,
    gcm.message_text,
    gcm.message_type,
    gcm.created_at,
    gcm.company_id,
    gcm.reply_to_message_id,
    gcm.is_edited,
    gcm.edited_at
  FROM guests_chat_messages gcm
  LEFT JOIN users u ON gcm.sender_type = 'admin' AND gcm.sender_email = u.email
  WHERE gcm.event_id = p_event_id
  ORDER BY gcm.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated, anon;

SELECT 'Fixed: Removed ambiguous message_id reference.' as status;

SELECT 'Minimal fix: Only fixed guest avatar_url issue, admin logic untouched.' as status; 

-- Fix: Store NULL for guest avatar_url, not initials

-- Fix the send_guests_chat_message function to store NULL for guests
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION send_guests_chat_message(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_reply_to_message_id UUID DEFAULT NULL
)
RETURNS TABLE (
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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message_id UUID;
    v_sender_name TEXT;
    v_sender_type TEXT;
    v_avatar_url TEXT;
    v_company_id UUID;
    v_user_id UUID;
    v_guest_id UUID;
    v_created_at TIMESTAMPTZ := now();
    v_is_edited BOOLEAN := FALSE;
    v_edited_at TIMESTAMPTZ := NULL;
BEGIN
    -- Check if it's a guest first
    SELECT g.id, g.company_id INTO v_guest_id, v_company_id
    FROM guests g
    WHERE g.email = p_sender_email;
    
    IF v_guest_id IS NOT NULL THEN
        -- It's a guest - store NULL for avatar_url, not initials
        v_sender_name := (SELECT CONCAT(g.first_name, ' ', g.last_name) FROM guests g WHERE g.id = v_guest_id);
        v_sender_type := 'guest';
        v_avatar_url := NULL; -- Store NULL, not initials
    ELSE
        -- Check if it's a user (admin) - only if not found in guests
        SELECT u.id, u.company_id INTO v_user_id, v_company_id
        FROM users u
        WHERE u.email = p_sender_email;
        
        IF v_user_id IS NOT NULL THEN
            -- User is an admin - use users table
            v_sender_name := (SELECT u.name FROM users u WHERE u.id = v_user_id);
            v_sender_type := 'admin';
            v_avatar_url := (SELECT u.avatar_url FROM users u WHERE u.id = v_user_id);
        ELSE
            RAISE EXCEPTION 'User not found: %', p_sender_email;
        END IF;
    END IF;
    
    -- Insert the message
    INSERT INTO guests_chat_messages (
        event_id,
        sender_name,
        sender_type,
        sender_email,
        avatar_url,
        message_text,
        message_type,
        company_id,
        reply_to_message_id,
        created_at,
        is_edited,
        edited_at
    ) VALUES (
        p_event_id,
        v_sender_name,
        v_sender_type,
        p_sender_email,
        v_avatar_url,
        p_message_text,
        p_message_type,
        v_company_id,
        p_reply_to_message_id,
        v_created_at,
        v_is_edited,
        v_edited_at
    ) RETURNING message_id INTO v_message_id;
    
    -- Return the inserted message
    RETURN QUERY
    SELECT 
        v_message_id,
        p_event_id,
        v_sender_name,
        v_sender_type,
        p_sender_email,
        v_avatar_url,
        p_message_text,
        p_message_type,
        v_company_id,
        v_created_at,
        p_reply_to_message_id,
        v_is_edited,
        v_edited_at;
END;
$$;

GRANT EXECUTE ON FUNCTION send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated, anon;

SELECT 'Fixed: Guests now store NULL for avatar_url, not initials.' as status; 