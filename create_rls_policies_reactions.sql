-- First, enable RLS on the table
ALTER TABLE guests_chat_reactions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to view reactions for events they participate in
CREATE POLICY "authenticated_users_can_view_reactions" ON guests_chat_reactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM guests_chat_participants 
    WHERE event_id = guests_chat_reactions.event_id 
    AND user_email = auth.jwt() ->> 'email'
  )
);

-- Policy 2: Allow authenticated users to add reactions for events they participate in
CREATE POLICY "authenticated_users_can_add_reactions" ON guests_chat_reactions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM guests_chat_participants 
    WHERE event_id = guests_chat_reactions.event_id 
    AND user_email = auth.jwt() ->> 'email'
  )
  AND user_email = auth.jwt() ->> 'email'
);

-- Policy 3: Allow authenticated users to remove their own reactions
CREATE POLICY "authenticated_users_can_remove_own_reactions" ON guests_chat_reactions
FOR DELETE USING (
  user_email = auth.jwt() ->> 'email'
);

-- Policy 4: Allow guests to view reactions (for guest access without auth)
CREATE POLICY "guests_can_view_reactions" ON guests_chat_reactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM guests 
    WHERE event_id = guests_chat_reactions.event_id 
    AND email = guests_chat_reactions.user_email
  )
);

-- Policy 5: Allow guests to add reactions (for guest access without auth)
CREATE POLICY "guests_can_add_reactions" ON guests_chat_reactions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM guests 
    WHERE event_id = guests_chat_reactions.event_id 
    AND email = guests_chat_reactions.user_email
  )
);

-- Policy 6: Allow guests to remove their own reactions (for guest access without auth)
CREATE POLICY "guests_can_remove_own_reactions" ON guests_chat_reactions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM guests 
    WHERE event_id = guests_chat_reactions.event_id 
    AND email = guests_chat_reactions.user_email
  )
);

-- RPC Function 1: Get reactions for authenticated users
CREATE OR REPLACE FUNCTION get_guests_chat_reactions_auth(
  p_event_id UUID,
  p_message_ids UUID[]
)
RETURNS TABLE (
  message_id UUID,
  user_email TEXT,
  emoji TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is a participant in this event
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants 
    WHERE event_id = p_event_id 
    AND user_email = auth.jwt() ->> 'email'
  ) THEN
    RAISE EXCEPTION 'User not authorized to view reactions for this event';
  END IF;

  RETURN QUERY
  SELECT 
    gcr.message_id,
    gcr.user_email,
    gcr.emoji,
    gcr.created_at
  FROM guests_chat_reactions gcr
  WHERE gcr.event_id = p_event_id
  AND gcr.message_id = ANY(p_message_ids);
END;
$$;

-- RPC Function 2: Get reactions for guests (no auth required)
CREATE OR REPLACE FUNCTION get_guests_chat_reactions_guest(
  p_event_id UUID,
  p_guest_email TEXT,
  p_message_ids UUID[]
)
RETURNS TABLE (
  message_id UUID,
  user_email TEXT,
  emoji TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if guest exists and has access to this event
  IF NOT EXISTS (
    SELECT 1 FROM guests 
    WHERE event_id = p_event_id 
    AND email = p_guest_email
  ) THEN
    RAISE EXCEPTION 'Guest not authorized to view reactions for this event';
  END IF;

  RETURN QUERY
  SELECT 
    gcr.message_id,
    gcr.user_email,
    gcr.emoji,
    gcr.created_at
  FROM guests_chat_reactions gcr
  WHERE gcr.event_id = p_event_id
  AND gcr.message_id = ANY(p_message_ids);
END;
$$;

-- RPC Function 3: Add reaction for authenticated users
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

-- RPC Function 4: Add reaction for guests (no auth required)
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

-- RPC Function 5: Remove reaction for authenticated users
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
  
  -- Delete the reaction
  DELETE FROM guests_chat_reactions 
  WHERE message_id = p_message_id 
  AND user_email = v_user_email 
  AND emoji = p_emoji;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count > 0;
END;
$$;

-- RPC Function 6: Remove reaction for guests (no auth required)
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
  -- Delete the reaction
  DELETE FROM guests_chat_reactions 
  WHERE message_id = p_message_id 
  AND user_email = p_guest_email 
  AND emoji = p_emoji;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count > 0;
END;
$$;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION get_guests_chat_reactions_auth(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guests_chat_reactions_guest(UUID, TEXT, UUID[]) TO anon;
GRANT EXECUTE ON FUNCTION add_guests_chat_reaction_auth(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_guests_chat_reaction_guest(UUID, UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION remove_guests_chat_reaction_auth(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_guests_chat_reaction_guest(UUID, TEXT, TEXT) TO anon; 