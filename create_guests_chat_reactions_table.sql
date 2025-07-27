-- ============================================================================
-- GUESTS CHAT REACTIONS TABLE AND FUNCTIONS
-- Add missing reactions table for guest chat emoji reactions
-- ============================================================================

-- Create guests_chat_reactions table
CREATE TABLE IF NOT EXISTS guests_chat_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES guests_chat_messages(message_id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique reactions per message/user/emoji
  UNIQUE(message_id, user_email, emoji)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guests_chat_reactions_message_id ON guests_chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_reactions_event_id ON guests_chat_reactions(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_reactions_user_email ON guests_chat_reactions(user_email);
CREATE INDEX IF NOT EXISTS idx_guests_chat_reactions_company_id ON guests_chat_reactions(company_id);

-- Enable RLS
ALTER TABLE guests_chat_reactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users access to guest chat reactions" 
  ON guests_chat_reactions FOR ALL 
  USING (auth.role() = 'authenticated');

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE guests_chat_reactions;

-- ============================================================================
-- REACTION FUNCTIONS
-- ============================================================================

-- Function to add a reaction
CREATE OR REPLACE FUNCTION add_guests_chat_reaction(
  p_message_id UUID,
  p_user_email TEXT,
  p_emoji TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_company_id UUID;
BEGIN
  -- Get event_id and company_id from the message
  SELECT event_id, company_id INTO v_event_id, v_company_id
  FROM guests_chat_messages
  WHERE message_id = p_message_id;
  
  IF v_event_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Message not found');
  END IF;
  
  -- Check if user is a participant in this event
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants
    WHERE event_id = v_event_id AND user_email = p_user_email
  ) THEN
    RETURN json_build_object('success', false, 'error', 'User not authorized for this event');
  END IF;
  
  -- Insert the reaction
  INSERT INTO guests_chat_reactions (
    message_id, event_id, user_email, emoji, company_id
  ) VALUES (
    p_message_id, v_event_id, p_user_email, p_emoji, v_company_id
  ) ON CONFLICT (message_id, user_email, emoji) DO NOTHING;
  
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to remove a reaction
CREATE OR REPLACE FUNCTION remove_guests_chat_reaction(
  p_message_id UUID,
  p_user_email TEXT,
  p_emoji TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Get event_id from the message
  SELECT event_id INTO v_event_id
  FROM guests_chat_messages
  WHERE message_id = p_message_id;
  
  IF v_event_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Message not found');
  END IF;
  
  -- Check if user is a participant in this event
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants
    WHERE event_id = v_event_id AND user_email = p_user_email
  ) THEN
    RETURN json_build_object('success', false, 'error', 'User not authorized for this event');
  END IF;
  
  -- Delete the reaction
  DELETE FROM guests_chat_reactions
  WHERE message_id = p_message_id 
    AND user_email = p_user_email 
    AND emoji = p_emoji;
  
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to get reactions for a message
CREATE OR REPLACE FUNCTION get_guests_chat_reactions(p_message_id UUID)
RETURNS TABLE (
  emoji TEXT,
  user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return all reactions for the message
  RETURN QUERY
  SELECT 
    gcr.emoji,
    gcr.user_email
  FROM guests_chat_reactions gcr
  WHERE gcr.message_id = p_message_id
  ORDER BY gcr.created_at;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_guests_chat_reaction(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_guests_chat_reaction(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guests_chat_reactions(UUID) TO authenticated;

SELECT 'Guests chat reactions table and functions created successfully' AS status; 