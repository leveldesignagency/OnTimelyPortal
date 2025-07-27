-- Fix existing guests_chat_reactions table
-- The table exists but has RLS enabled with no policies, blocking all access

-- Option 1: Disable RLS (simplest fix)
ALTER TABLE guests_chat_reactions DISABLE ROW LEVEL SECURITY;

-- Option 2: If you prefer to keep RLS enabled, uncomment the lines below:
-- DROP POLICY IF EXISTS "Allow all reactions operations" ON guests_chat_reactions;
-- CREATE POLICY "Allow all reactions operations" ON guests_chat_reactions FOR ALL USING (true);

-- Also update the table to add missing columns if they don't exist
DO $$
BEGIN
    -- Add event_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guests_chat_reactions' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE guests_chat_reactions ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;
        
        -- Update existing rows with event_id from the message
        UPDATE guests_chat_reactions 
        SET event_id = gcm.event_id
        FROM guests_chat_messages gcm
        WHERE guests_chat_reactions.message_id = gcm.message_id;
    END IF;
    
    -- Add company_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guests_chat_reactions' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE guests_chat_reactions ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
        
        -- Update existing rows with company_id from the message
        UPDATE guests_chat_reactions 
        SET company_id = gcm.company_id
        FROM guests_chat_messages gcm
        WHERE guests_chat_reactions.message_id = gcm.message_id;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_guests_chat_reactions_message_id ON guests_chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_reactions_event_id ON guests_chat_reactions(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_chat_reactions_user_email ON guests_chat_reactions(user_email);
CREATE INDEX IF NOT EXISTS idx_guests_chat_reactions_company_id ON guests_chat_reactions(company_id);

-- Enable real-time if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'guests_chat_reactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE guests_chat_reactions;
    END IF;
END $$;

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS add_guests_chat_reaction(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS remove_guests_chat_reaction(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_guests_chat_reactions(UUID);

-- Create proper RPC functions that work with the existing system
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
  v_existing_reaction RECORD;
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
  
  -- Check if user already has a reaction on this message
  SELECT * INTO v_existing_reaction
  FROM guests_chat_reactions
  WHERE message_id = p_message_id AND user_email = p_user_email
  LIMIT 1;
  
  -- If user already has a reaction, delete it first (overwrite behavior)
  IF v_existing_reaction IS NOT NULL THEN
    DELETE FROM guests_chat_reactions
    WHERE message_id = p_message_id AND user_email = p_user_email;
  END IF;
  
  -- Insert the new reaction
  INSERT INTO guests_chat_reactions (
    message_id, 
    user_email, 
    emoji,
    event_id,
    company_id
  ) VALUES (
    p_message_id, 
    p_user_email, 
    p_emoji,
    v_event_id,
    v_company_id
  );
  
  RETURN json_build_object(
    'success', true, 
    'overwrote_existing', v_existing_reaction IS NOT NULL,
    'previous_emoji', CASE WHEN v_existing_reaction IS NOT NULL THEN v_existing_reaction.emoji ELSE NULL END
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

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
  
  -- Delete the reaction (any emoji for this user on this message)
  DELETE FROM guests_chat_reactions
  WHERE message_id = p_message_id 
    AND user_email = p_user_email;
  
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

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

SELECT 'Existing guests_chat_reactions table fixed successfully with one-reaction-per-user policy' AS status; 