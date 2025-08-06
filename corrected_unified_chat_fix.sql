-- CORRECTED UNIFIED CHAT FIX - Properly handles guests (no JWT) and admins (JWT)

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
-- 2. CREATE POLICIES THAT WORK FOR AUTHENTICATED USERS ONLY
-- (Guests will use RPC functions which bypass RLS entirely)
-- ============================================================================

-- Reactions policy - ONLY for authenticated users (real-time subscriptions)
CREATE POLICY "authenticated_users_reactions_access" ON guests_chat_reactions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM guests_chat_participants gcp
            WHERE gcp.event_id = guests_chat_reactions.event_id 
            AND gcp.user_email = auth.jwt() ->> 'email'
        )
    );

-- Messages policy - ONLY for authenticated users (real-time subscriptions)  
CREATE POLICY "authenticated_users_messages_access" ON guests_chat_messages
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM guests_chat_participants gcp
            WHERE gcp.event_id = guests_chat_messages.event_id 
            AND gcp.user_email = auth.jwt() ->> 'email'
        )
    );

-- ============================================================================
-- 3. CREATE UNIFIED FUNCTIONS (SECURITY DEFINER bypasses RLS for guests)
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