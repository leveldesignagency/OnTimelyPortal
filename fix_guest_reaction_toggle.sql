-- Fix add_guests_chat_reaction_guest to properly handle toggle/replace logic
DROP FUNCTION IF EXISTS add_guests_chat_reaction_guest(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION add_guests_chat_reaction_guest(
  p_message_id uuid,
  p_event_id uuid,
  p_guest_email text,
  p_emoji text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_emoji text;
BEGIN
  -- Check if user is authorized (guest in guests table)
  IF NOT EXISTS (
    SELECT 1 FROM guests g
    WHERE g.event_id = p_event_id 
    AND g.email = p_guest_email
  ) THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  -- Check if user already has a reaction on this message
  SELECT emoji INTO existing_emoji
  FROM guests_chat_reactions
  WHERE message_id = p_message_id 
  AND user_email = p_guest_email;

  IF existing_emoji IS NOT NULL THEN
    -- User already has a reaction
    IF existing_emoji = p_emoji THEN
      -- Same emoji = toggle off (delete)
      DELETE FROM guests_chat_reactions
      WHERE message_id = p_message_id 
      AND user_email = p_guest_email;
    ELSE
      -- Different emoji = replace
      UPDATE guests_chat_reactions
      SET emoji = p_emoji, created_at = now()
      WHERE message_id = p_message_id 
      AND user_email = p_guest_email;
    END IF;
  ELSE
    -- No existing reaction = add new one
    INSERT INTO guests_chat_reactions (message_id, user_email, emoji, event_id)
    VALUES (p_message_id, p_guest_email, p_emoji, p_event_id);
  END IF;
END;
$$;