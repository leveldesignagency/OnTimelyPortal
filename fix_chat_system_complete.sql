-- COMPREHENSIVE CHAT SYSTEM FIX
-- This fixes all RLS policies and ensures proper access for guests and users

-- 1. CLEAN UP EXISTING POLICIES
-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow all operations for all users" ON guests_chat_messages;
DROP POLICY IF EXISTS "guests_can_view_messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "guests_can_insert_messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "guests_can_update_messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "guests_can_delete_messages" ON guests_chat_messages;

DROP POLICY IF EXISTS "authenticated_users_can_add_reactions" ON guests_chat_reactions;
DROP POLICY IF EXISTS "authenticated_users_can_remove_own_reactions" ON guests_chat_reactions;
DROP POLICY IF EXISTS "authenticated_users_can_view_reactions" ON guests_chat_reactions;
DROP POLICY IF EXISTS "guests_can_add_reactions" ON guests_chat_reactions;
DROP POLICY IF EXISTS "guests_can_delete_reactions" ON guests_chat_reactions;
DROP POLICY IF EXISTS "guests_can_insert_reactions" ON guests_chat_reactions;
DROP POLICY IF EXISTS "guests_can_remove_own_reactions" ON guests_chat_reactions;
DROP POLICY IF EXISTS "guests_can_view_reactions" ON guests_chat_reactions;

-- 2. CREATE SIMPLE, WORKING POLICIES FOR MESSAGES
-- Allow anyone to view messages for events they're part of
CREATE POLICY "messages_select_policy" ON guests_chat_messages
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email'
  ) OR EXISTS (
    SELECT 1 FROM guests 
    WHERE guests.event_id = guests_chat_messages.event_id 
    AND guests.email = auth.jwt() ->> 'email'
  )
);

-- Allow users and guests to insert messages
CREATE POLICY "messages_insert_policy" ON guests_chat_messages
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email'
  ) OR EXISTS (
    SELECT 1 FROM guests 
    WHERE guests.event_id = guests_chat_messages.event_id 
    AND guests.email = auth.jwt() ->> 'email'
  )
);

-- Allow users and guests to update their own messages
CREATE POLICY "messages_update_policy" ON guests_chat_messages
FOR UPDATE TO public
USING (
  sender_email = auth.jwt() ->> 'email'
)
WITH CHECK (
  sender_email = auth.jwt() ->> 'email'
);

-- Allow users and guests to delete their own messages
CREATE POLICY "messages_delete_policy" ON guests_chat_messages
FOR DELETE TO public
USING (
  sender_email = auth.jwt() ->> 'email'
);

-- 3. CREATE SIMPLE, WORKING POLICIES FOR REACTIONS
-- Allow anyone to view reactions for events they're part of
CREATE POLICY "reactions_select_policy" ON guests_chat_reactions
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email'
  ) OR EXISTS (
    SELECT 1 FROM guests 
    WHERE guests.event_id = guests_chat_reactions.event_id 
    AND guests.email = auth.jwt() ->> 'email'
  )
);

-- Allow users and guests to insert reactions
CREATE POLICY "reactions_insert_policy" ON guests_chat_reactions
FOR INSERT TO public
WITH CHECK (
  user_email = auth.jwt() ->> 'email'
  AND (
    EXISTS (
      SELECT 1 FROM users WHERE email = auth.jwt() ->> 'email'
    ) OR EXISTS (
      SELECT 1 FROM guests 
      WHERE guests.event_id = guests_chat_reactions.event_id 
      AND guests.email = auth.jwt() ->> 'email'
    )
  )
);

-- Allow users and guests to delete their own reactions
CREATE POLICY "reactions_delete_policy" ON guests_chat_reactions
FOR DELETE TO public
USING (
  user_email = auth.jwt() ->> 'email'
);

-- 4. FIX REACTION FUNCTIONS TO WORK PROPERLY
-- Drop existing functions
DROP FUNCTION IF EXISTS add_guests_chat_reaction_auth(uuid, uuid, text);
DROP FUNCTION IF EXISTS add_guests_chat_reaction_guest(uuid, uuid, text, text);

-- Create proper reaction functions that work like WhatsApp
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
  v_existing_reaction record;
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
  SELECT * INTO v_existing_reaction
  FROM guests_chat_reactions 
  WHERE message_id = p_message_id 
  AND user_email = v_user_email;
  
  IF v_existing_reaction IS NOT NULL THEN
    -- User already has a reaction
    IF v_existing_reaction.emoji = p_emoji THEN
      -- Same emoji, remove it (toggle off)
      DELETE FROM guests_chat_reactions
      WHERE message_id = p_message_id
      AND user_email = v_user_email;
      
      RETURN NULL;
    ELSE
      -- Different emoji, replace it
      UPDATE guests_chat_reactions
      SET emoji = p_emoji, created_at = NOW()
      WHERE message_id = p_message_id
      AND user_email = v_user_email
      RETURNING id INTO v_reaction_id;
      
      RETURN v_reaction_id;
    END IF;
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
  v_existing_reaction record;
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
  SELECT * INTO v_existing_reaction
  FROM guests_chat_reactions 
  WHERE message_id = p_message_id 
  AND user_email = p_guest_email;
  
  IF v_existing_reaction IS NOT NULL THEN
    -- Guest already has a reaction
    IF v_existing_reaction.emoji = p_emoji THEN
      -- Same emoji, remove it (toggle off)
      DELETE FROM guests_chat_reactions
      WHERE message_id = p_message_id
      AND user_email = p_guest_email;
      
      RETURN NULL;
    ELSE
      -- Different emoji, replace it
      UPDATE guests_chat_reactions
      SET emoji = p_emoji, created_at = NOW()
      WHERE message_id = p_message_id
      AND user_email = p_guest_email
      RETURNING id INTO v_reaction_id;
      
      RETURN v_reaction_id;
    END IF;
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

-- 5. ENABLE RLS ON TABLES
ALTER TABLE guests_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests_chat_reactions ENABLE ROW LEVEL SECURITY; 