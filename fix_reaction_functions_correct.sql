-- Fix the reaction functions to handle ONE reaction per user per message (replace, don't toggle)

-- Drop existing functions first
DROP FUNCTION IF EXISTS add_guests_chat_reaction_auth(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS add_guests_chat_reaction_guest(UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS add_guests_chat_reaction(UUID, TEXT, TEXT);

-- Fix add_guests_chat_reaction_auth to REPLACE existing reaction
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
  
  -- Check if user is authorized for this event (either as admin user or guest)
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE email = v_user_email
  ) AND NOT EXISTS (
    SELECT 1 FROM guests 
    WHERE event_id = p_event_id 
    AND email = v_user_email
  ) THEN
    RAISE EXCEPTION 'User not authorized to add reactions for this event';
  END IF;

  -- DELETE any existing reaction from this user on this message
  DELETE FROM guests_chat_reactions 
  WHERE message_id = p_message_id 
  AND user_email = v_user_email;

  -- INSERT the new reaction
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

-- Fix add_guests_chat_reaction_guest to REPLACE existing reaction
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

  -- DELETE any existing reaction from this guest on this message
  DELETE FROM guests_chat_reactions 
  WHERE message_id = p_message_id 
  AND user_email = p_guest_email;

  -- INSERT the new reaction
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

-- Fix add_guests_chat_reaction to REPLACE existing reaction (legacy function)
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

  -- DELETE any existing reaction from this user on this message
  DELETE FROM guests_chat_reactions 
  WHERE message_id = p_message_id 
  AND user_email = p_user_email;

  -- INSERT the new reaction
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

-- Fix RLS policy for guests to see all reactions in their event
DROP POLICY IF EXISTS guests_can_view_reactions ON guests_chat_reactions;

CREATE POLICY guests_can_view_reactions ON guests_chat_reactions
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM guests 
    WHERE guests.event_id = guests_chat_reactions.event_id 
    AND guests.email = auth.jwt() ->> 'email'
  )
);

-- Grant execute permissions on reaction functions
GRANT EXECUTE ON FUNCTION add_guests_chat_reaction_auth(UUID, UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION add_guests_chat_reaction_guest(UUID, UUID, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION add_guests_chat_reaction(UUID, TEXT, TEXT) TO authenticated, anon; 