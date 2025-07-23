-- Create the missing edit_guests_chat_message function
-- This function allows users to edit their own messages within a time limit

CREATE OR REPLACE FUNCTION edit_guests_chat_message(
  p_message_id UUID,
  p_new_text TEXT,
  p_user_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message RECORD;
  v_event_id UUID;
  v_edit_time_limit INTERVAL := INTERVAL '15 minutes'; -- 15 minute edit window
BEGIN
  -- Get the message details
  SELECT * INTO v_message
  FROM guests_chat_messages
  WHERE message_id = p_message_id;
  
  IF v_message IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Message not found');
  END IF;
  
  -- Check if user is the sender of the message
  IF v_message.sender_email != p_user_email THEN
    RETURN json_build_object('success', false, 'error', 'You can only edit your own messages');
  END IF;
  
  -- Check if message is within edit time limit
  IF NOW() - v_message.created_at > v_edit_time_limit THEN
    RETURN json_build_object('success', false, 'error', 'Message is too old to edit (15 minute limit)');
  END IF;
  
  -- Check if user is a participant in this event
  SELECT event_id INTO v_event_id
  FROM guests_chat_messages
  WHERE message_id = p_message_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants
    WHERE event_id = v_event_id AND user_email = p_user_email
  ) THEN
    RETURN json_build_object('success', false, 'error', 'User not authorized for this event');
  END IF;
  
  -- Update the message
  UPDATE guests_chat_messages
  SET 
    message_text = p_new_text,
    is_edited = true,
    edited_at = NOW(),
    updated_at = NOW()
  WHERE message_id = p_message_id;
  
  RETURN json_build_object(
    'success', true,
    'message_id', p_message_id,
    'new_text', p_new_text,
    'edited_at', NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION edit_guests_chat_message(UUID, TEXT, TEXT) TO authenticated;

SELECT 'edit_guests_chat_message function created successfully' AS status; 