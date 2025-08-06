-- Drop the existing functions first, then recreate them
DROP FUNCTION IF EXISTS add_guests_chat_reaction(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS remove_guests_chat_reaction(UUID, TEXT, TEXT);

-- Fix the add_guests_chat_reaction function to work with mobile app
CREATE OR REPLACE FUNCTION add_guests_chat_reaction(
    p_message_id UUID,
    p_user_email TEXT,
    p_emoji TEXT
)
RETURNS VOID
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
    RAISE EXCEPTION 'Message not found';
  END IF;
  
  -- Check if user already has a reaction on this message
  SELECT * INTO v_existing_reaction
  FROM guests_chat_reactions
  WHERE message_id = p_message_id AND user_email = p_user_email AND emoji = p_emoji;
  
  -- If user already has this exact reaction, do nothing
  IF v_existing_reaction IS NOT NULL THEN
    RETURN;
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
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error adding reaction: %', SQLERRM;
END;
$$;

-- Fix the remove_guests_chat_reaction function to work with mobile app
CREATE OR REPLACE FUNCTION remove_guests_chat_reaction(
    p_message_id UUID,
    p_user_email TEXT,
    p_emoji TEXT
)
RETURNS VOID
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
    RAISE EXCEPTION 'Message not found';
  END IF;
  
  -- Delete the specific reaction
  DELETE FROM guests_chat_reactions
  WHERE message_id = p_message_id 
    AND user_email = p_user_email
    AND emoji = p_emoji;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error removing reaction: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_guests_chat_reaction(UUID, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION remove_guests_chat_reaction(UUID, TEXT, TEXT) TO authenticated, anon;

SELECT 'Reaction functions fixed successfully' AS status; 