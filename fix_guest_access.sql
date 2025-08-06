-- Give guests full access to chat messages and reactions
-- This ensures guests can send, receive, and react to messages

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS guests_can_view_messages ON guests_chat_messages;
DROP POLICY IF EXISTS guests_can_insert_messages ON guests_chat_messages;
DROP POLICY IF EXISTS guests_can_update_messages ON guests_chat_messages;
DROP POLICY IF EXISTS guests_can_delete_messages ON guests_chat_messages;

DROP POLICY IF EXISTS guests_can_view_reactions ON guests_chat_reactions;
DROP POLICY IF EXISTS guests_can_insert_reactions ON guests_chat_reactions;
DROP POLICY IF EXISTS guests_can_delete_reactions ON guests_chat_reactions;

-- Create new policies that give guests full access
CREATE POLICY guests_can_view_messages ON guests_chat_messages
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_messages.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY guests_can_insert_messages ON guests_chat_messages
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_messages.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY guests_can_update_messages ON guests_chat_messages
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_messages.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_messages.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY guests_can_delete_messages ON guests_chat_messages
FOR DELETE TO public
USING (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_messages.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
);

-- Reaction policies
CREATE POLICY guests_can_view_reactions ON guests_chat_reactions
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_reactions.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY guests_can_insert_reactions ON guests_chat_reactions
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_reactions.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY guests_can_delete_reactions ON guests_chat_reactions
FOR DELETE TO public
USING (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_reactions.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
);

-- Fix the reaction functions to work properly
-- Drop existing functions
DROP FUNCTION IF EXISTS add_guests_chat_reaction_auth(uuid, uuid, text);
DROP FUNCTION IF EXISTS add_guests_chat_reaction_guest(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS add_guests_chat_reaction(uuid, text, text);

-- Create proper reaction functions
CREATE OR REPLACE FUNCTION add_guests_chat_reaction_auth(
  p_message_id uuid,
  p_event_id uuid,
  p_emoji text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email text;
  v_reaction_id uuid;
BEGIN
  -- Get current user email
  v_user_email := auth.jwt() ->> 'email';
  
  -- Check if user is authorized (either admin user or guest)
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
  
  -- Check if user already has a reaction on this message
  IF EXISTS (
    SELECT 1 FROM guests_chat_reactions 
    WHERE message_id = p_message_id 
    AND user_email = v_user_email
  ) THEN
    -- User already has a reaction, remove it (toggle off)
    DELETE FROM guests_chat_reactions
    WHERE message_id = p_message_id
    AND user_email = v_user_email;
    
    RETURN NULL;
  ELSE
    -- User doesn't have a reaction, add it
    INSERT INTO guests_chat_reactions (message_id, event_id, user_email, emoji)
    VALUES (p_message_id, p_event_id, v_user_email, p_emoji)
    RETURNING id INTO v_reaction_id;
    
    RETURN v_reaction_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION add_guests_chat_reaction_guest(
  p_message_id uuid,
  p_event_id uuid,
  p_emoji text,
  p_guest_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reaction_id uuid;
BEGIN
  -- Check if guest is authorized for this event
  IF NOT EXISTS (
    SELECT 1 FROM guests
    WHERE event_id = p_event_id
    AND email = p_guest_email
  ) THEN
    RAISE EXCEPTION 'Guest not authorized to add reactions for this event';
  END IF;
  
  -- Check if guest already has a reaction on this message
  IF EXISTS (
    SELECT 1 FROM guests_chat_reactions 
    WHERE message_id = p_message_id 
    AND user_email = p_guest_email
  ) THEN
    -- Guest already has a reaction, remove it (toggle off)
    DELETE FROM guests_chat_reactions
    WHERE message_id = p_message_id
    AND user_email = p_guest_email;
    
    RETURN NULL;
  ELSE
    -- Guest doesn't have a reaction, add it
    INSERT INTO guests_chat_reactions (message_id, event_id, user_email, emoji)
    VALUES (p_message_id, p_event_id, p_guest_email, p_emoji)
    RETURNING id INTO v_reaction_id;
    
    RETURN v_reaction_id;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_guests_chat_reaction_auth(uuid, uuid, text) TO public;
GRANT EXECUTE ON FUNCTION add_guests_chat_reaction_guest(uuid, uuid, text, text) TO public; 