-- Create RPC function for authenticated users to get reactions
CREATE OR REPLACE FUNCTION get_guests_chat_reactions_auth(
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
  -- Check if user is authorized (admin user in participants)
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants 
    WHERE event_id = p_event_id 
    AND user_email = p_user_email
  ) THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  -- Return reactions for the specified messages
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