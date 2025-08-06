-- Fix the reaction functions to handle toggling instead of throwing exceptions

-- Drop existing functions first
DROP FUNCTION IF EXISTS add_guests_chat_reaction_auth(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS add_guests_chat_reaction_guest(UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS add_guests_chat_reaction(UUID, TEXT, TEXT);

-- Fix add_guests_chat_reaction_auth to handle toggling
CREATE OR REPLACE FUNCTION add_guests_chat_reaction_auth(
  p_message_id UUID,
  p_event_id UUID,
  p_emoji TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reaction_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  
  -- Check if user is a participant in this event
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants 
    WHERE event_id = p_event_id 
    AND user_email = v_user_email
  ) THEN
    RAISE EXCEPTION 'User not authorized to add reactions for this event';
  END IF;

  -- Check if reaction already exists - if it does, remove it (toggle behavior)
  IF EXISTS (
    SELECT 1 FROM guests_chat_reactions 
    WHERE message_id = p_message_id 
    AND user_email = v_user_email 
    AND emoji = p_emoji
  ) THEN
    -- Remove the existing reaction (toggle off)
    DELETE FROM guests_chat_reactions 
    WHERE message_id = p_message_id 
    AND user_email = v_user_email 
    AND emoji = p_emoji;
    RETURN NULL;
  END IF;

  -- Insert the reaction
  INSERT INTO guests_chat_reactions (
    message_id, 
    event_id, 
    user_email, 
    emoji
  ) VALUES (
    p_message_id, 
    p_event_id, 
    v_user_email, 
    p_emoji
  ) RETURNING id INTO v_reaction_id;

  RETURN v_reaction_id;
END;
$$;

-- Fix add_guests_chat_reaction_guest to handle toggling
CREATE OR REPLACE FUNCTION add_guests_chat_reaction_guest(
  p_message_id UUID,
  p_event_id UUID,
  p_guest_email TEXT,
  p_emoji TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reaction_id UUID;
BEGIN
  -- Check if guest exists and has access to this event
  IF NOT EXISTS (
    SELECT 1 FROM guests 
    WHERE event_id = p_event_id 
    AND email = p_guest_email
  ) THEN
    RAISE EXCEPTION 'Guest not authorized to add reactions for this event';
  END IF;

  -- Check if reaction already exists - if it does, remove it (toggle behavior)
  IF EXISTS (
    SELECT 1 FROM guests_chat_reactions 
    WHERE message_id = p_message_id 
    AND user_email = p_guest_email 
    AND emoji = p_emoji
  ) THEN
    -- Remove the existing reaction (toggle off)
    DELETE FROM guests_chat_reactions 
    WHERE message_id = p_message_id 
    AND user_email = p_guest_email 
    AND emoji = p_emoji;
    RETURN NULL;
  END IF;

  -- Insert the reaction
  INSERT INTO guests_chat_reactions (
    message_id, 
    event_id, 
    user_email, 
    emoji
  ) VALUES (
    p_message_id, 
    p_event_id, 
    p_guest_email, 
    p_emoji
  ) RETURNING id INTO v_reaction_id;

  RETURN v_reaction_id;
END;
$$;

-- Fix add_guests_chat_reaction to handle toggling (legacy function)
CREATE OR REPLACE FUNCTION add_guests_chat_reaction(
  p_message_id UUID,
  p_user_email TEXT,
  p_emoji TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reaction_id UUID;
  v_event_id UUID;
BEGIN
  -- Get the event_id from the message
  SELECT event_id INTO v_event_id 
  FROM guests_chat_messages 
  WHERE message_id = p_message_id;
  
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Check if reaction already exists - if it does, remove it (toggle behavior)
  IF EXISTS (
    SELECT 1 FROM guests_chat_reactions 
    WHERE message_id = p_message_id 
    AND user_email = p_user_email 
    AND emoji = p_emoji
  ) THEN
    -- Remove the existing reaction (toggle off)
    DELETE FROM guests_chat_reactions 
    WHERE message_id = p_message_id 
    AND user_email = p_user_email 
    AND emoji = p_emoji;
    RETURN NULL;
  END IF;

  -- Insert the reaction
  INSERT INTO guests_chat_reactions (
    message_id, 
    event_id, 
    user_email, 
    emoji
  ) VALUES (
    p_message_id, 
    v_event_id, 
    p_user_email, 
    p_emoji
  ) RETURNING id INTO v_reaction_id;

  RETURN v_reaction_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_guests_chat_reaction_auth(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_guests_chat_reaction_guest(UUID, UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION add_guests_chat_reaction(UUID, TEXT, TEXT) TO authenticated, anon; 