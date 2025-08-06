-- COMPLETE UNIFIED CHAT FIX - Messages AND Reactions
-- This ensures ALL three screens see identical data in real-time

-- ============================================================================
-- 1. CLEAN UP ALL CONFLICTING POLICIES
-- ============================================================================

-- Remove conflicting reaction policies
DROP POLICY IF EXISTS "authenticated_users_can_add_reactions" ON guests_chat_reactions;
DROP POLICY IF EXISTS "authenticated_users_can_remove_own_reactions" ON guests_chat_reactions;
DROP POLICY IF EXISTS "guests_can_add_reactions" ON guests_chat_reactions;
DROP POLICY IF EXISTS "guests_can_delete_reactions" ON guests_chat_reactions;
DROP POLICY IF EXISTS "guests_can_insert_reactions" ON guests_chat_reactions;
DROP POLICY IF EXISTS "guests_can_remove_own_reactions" ON guests_chat_reactions;
DROP POLICY IF EXISTS "unified_reactions_access" ON guests_chat_reactions;

-- Remove the problematic individual message policies (keep the "Allow all" one)
DROP POLICY IF EXISTS "guests_can_view_messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "guests_can_insert_messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "guests_can_update_messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "guests_can_delete_messages" ON guests_chat_messages;

-- ============================================================================
-- 2. CREATE UNIFIED POLICIES THAT WORK FOR EVERYONE
-- ============================================================================

-- Unified reactions policy - everyone in participants can access all reactions
CREATE POLICY "unified_reactions_access" ON guests_chat_reactions
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM guests_chat_participants gcp
            WHERE gcp.event_id = guests_chat_reactions.event_id 
            AND gcp.user_email = COALESCE(
                auth.jwt() ->> 'email',           -- For authenticated users
                guests_chat_reactions.user_email  -- For current user's own reactions
            )
        )
    );

-- Unified messages policy - everyone in participants can access all messages  
CREATE POLICY "unified_messages_access" ON guests_chat_messages
    FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM guests_chat_participants gcp
            WHERE gcp.event_id = guests_chat_messages.event_id 
            AND gcp.user_email = COALESCE(
                auth.jwt() ->> 'email',            -- For authenticated users
                guests_chat_messages.sender_email  -- For message sender
            )
        )
    );

-- ============================================================================
-- 3. CREATE UNIFIED FUNCTIONS
-- ============================================================================

-- Unified reaction fetching function
DROP FUNCTION IF EXISTS get_guests_chat_reactions_unified(uuid, text, uuid[]);
CREATE OR REPLACE FUNCTION get_guests_chat_reactions_unified(
  p_event_id uuid,
  p_user_email text,
  p_message_ids uuid[]
)
RETURNS TABLE(
  message_id uuid,
  user_email text,
  emoji text,
  event_id uuid,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is in participants (works for both admin and guest)
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants gcp
    WHERE gcp.event_id = p_event_id 
    AND gcp.user_email = p_user_email
  ) THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  -- Return ALL reactions for the messages (everyone sees same data)
  RETURN QUERY 
  SELECT 
    gcr.message_id,
    gcr.user_email,
    gcr.emoji,
    gcr.event_id,
    gcr.created_at
  FROM guests_chat_reactions gcr
  WHERE gcr.event_id = p_event_id
  AND gcr.message_id = ANY(p_message_ids)
  ORDER BY gcr.created_at ASC;
END;
$$;

-- Unified reaction adding function
DROP FUNCTION IF EXISTS add_guests_chat_reaction_unified(uuid, uuid, text, text);
CREATE OR REPLACE FUNCTION add_guests_chat_reaction_unified(
  p_message_id uuid,
  p_event_id uuid,
  p_user_email text,
  p_emoji text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_emoji text;
BEGIN
  -- Check if user is in participants (works for both admin and guest)
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants gcp
    WHERE gcp.event_id = p_event_id 
    AND gcp.user_email = p_user_email
  ) THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  -- Check if user already has a reaction on this message
  SELECT emoji INTO existing_emoji
  FROM guests_chat_reactions
  WHERE message_id = p_message_id 
  AND user_email = p_user_email;

  IF existing_emoji IS NOT NULL THEN
    -- User already has a reaction
    IF existing_emoji = p_emoji THEN
      -- Same emoji = toggle off (delete)
      DELETE FROM guests_chat_reactions
      WHERE message_id = p_message_id 
      AND user_email = p_user_email;
    ELSE
      -- Different emoji = replace
      UPDATE guests_chat_reactions
      SET emoji = p_emoji, created_at = now()
      WHERE message_id = p_message_id 
      AND user_email = p_user_email;
    END IF;
  ELSE
    -- No existing reaction = add new one
    INSERT INTO guests_chat_reactions (message_id, user_email, emoji, event_id)
    VALUES (p_message_id, p_user_email, p_emoji, p_event_id);
  END IF;
END;
$$;

-- Unified message fetching function (improve the existing one)
DROP FUNCTION IF EXISTS get_guests_chat_messages_unified(uuid, text, integer, integer);
CREATE OR REPLACE FUNCTION get_guests_chat_messages_unified(
  p_event_id uuid,
  p_user_email text,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  message_id uuid,
  event_id uuid,
  sender_email text,
  sender_name text,
  sender_type text,
  message_text text,
  message_type text,
  company_id uuid,
  created_at timestamp with time zone,
  reply_to_message_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is in participants (works for both admin and guest)
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants gcp
    WHERE gcp.event_id = p_event_id 
    AND gcp.user_email = p_user_email
  ) THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  -- Return ALL messages for the event (everyone sees same data)
  RETURN QUERY 
  SELECT 
    gcm.message_id,
    gcm.event_id,
    gcm.sender_email,
    gcm.sender_name,
    gcm.sender_type,
    gcm.message_text,
    gcm.message_type,
    gcm.company_id,
    gcm.created_at,
    gcm.reply_to_message_id
  FROM guests_chat_messages gcm
  WHERE gcm.event_id = p_event_id
  ORDER BY gcm.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;