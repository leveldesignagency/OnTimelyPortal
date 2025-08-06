-- Updated RPC Function: Add reaction for authenticated users (replaces existing)
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
  v_existing_reaction_id UUID;
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

  -- Check if user already has a reaction on this message
  SELECT id INTO v_existing_reaction_id
  FROM guests_chat_reactions 
  WHERE message_id = p_message_id 
  AND user_email = v_user_email;
  
  -- If user already has a reaction, remove it first
  IF v_existing_reaction_id IS NOT NULL THEN
    DELETE FROM guests_chat_reactions 
    WHERE id = v_existing_reaction_id;
  END IF;

  -- Insert the new reaction
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

-- Updated RPC Function: Add reaction for guests (replaces existing)
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
  v_existing_reaction_id UUID;
BEGIN
  -- Check if guest exists and has access to this event
  IF NOT EXISTS (
    SELECT 1 FROM guests 
    WHERE event_id = p_event_id 
    AND email = p_guest_email
  ) THEN
    RAISE EXCEPTION 'Guest not authorized to add reactions for this event';
  END IF;

  -- Check if guest already has a reaction on this message
  SELECT id INTO v_existing_reaction_id
  FROM guests_chat_reactions 
  WHERE message_id = p_message_id 
  AND user_email = p_guest_email;
  
  -- If guest already has a reaction, remove it first
  IF v_existing_reaction_id IS NOT NULL THEN
    DELETE FROM guests_chat_reactions 
    WHERE id = v_existing_reaction_id;
  END IF;

  -- Insert the new reaction
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

-- Updated RPC Function: Remove reaction for authenticated users
CREATE OR REPLACE FUNCTION remove_guests_chat_reaction_auth(
  p_message_id UUID,
  p_emoji TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_deleted_count INTEGER;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  
  -- Delete the reaction (only if it matches the emoji)
  DELETE FROM guests_chat_reactions 
  WHERE message_id = p_message_id 
  AND user_email = v_user_email 
  AND emoji = p_emoji;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count > 0;
END;
$$;

-- Updated RPC Function: Remove reaction for guests
CREATE OR REPLACE FUNCTION remove_guests_chat_reaction_guest(
  p_message_id UUID,
  p_guest_email TEXT,
  p_emoji TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete the reaction (only if it matches the emoji)
  DELETE FROM guests_chat_reactions 
  WHERE message_id = p_message_id 
  AND user_email = p_guest_email 
  AND emoji = p_emoji;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count > 0;
END;
$$; 