-- Update send_guests_chat_message function to support attachments

CREATE OR REPLACE FUNCTION send_guests_chat_message(
  p_event_id uuid,
  p_sender_email text,
  p_message_text text,
  p_message_type text DEFAULT 'text',
  p_reply_to_message_id uuid DEFAULT NULL,
  p_attachment_url text DEFAULT NULL,
  p_attachment_filename text DEFAULT NULL,
  p_attachment_type text DEFAULT NULL,
  p_attachment_size integer DEFAULT NULL
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
  reply_to_message_id uuid,
  attachment_url text,
  attachment_filename text,
  attachment_type text,
  attachment_size integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_sender_name text;
  v_sender_type text;
  v_message_id uuid;
  v_avatar_url text;
BEGIN
  -- Check if sender is authenticated user
  IF auth.jwt() ->> 'email' = p_sender_email THEN
    -- Get authenticated user details
    SELECT 
      raw_user_meta_data ->> 'company_id',
      COALESCE(raw_user_meta_data ->> 'full_name', email),
      'admin'
    INTO v_company_id, v_sender_name, v_sender_type
    FROM auth.users 
    WHERE email = p_sender_email;
    
    v_company_id := v_company_id::uuid;
  ELSE
    -- Get guest details
    SELECT 
      company_id,
      COALESCE(first_name || ' ' || last_name, email),
      'guest'
    INTO v_company_id, v_sender_name, v_sender_type
    FROM guests 
    WHERE email = p_sender_email AND event_id = p_event_id;
  END IF;

  -- Verify user is authorized for this event
  IF NOT EXISTS (
    SELECT 1 FROM guests_chat_participants gcp
    WHERE gcp.event_id = p_event_id 
    AND gcp.user_email = p_sender_email
  ) THEN
    RAISE EXCEPTION 'User not authorized for this event';
  END IF;

  -- Insert the message
  INSERT INTO guests_chat_messages (
    event_id, 
    sender_email, 
    sender_name, 
    sender_type,
    message_text, 
    message_type, 
    company_id,
    reply_to_message_id,
    attachment_url,
    attachment_filename,
    attachment_type,
    attachment_size
  ) 
  VALUES (
    p_event_id,
    p_sender_email,
    v_sender_name,
    v_sender_type,
    p_message_text,
    p_message_type,
    v_company_id,
    p_reply_to_message_id,
    p_attachment_url,
    p_attachment_filename,
    p_attachment_type,
    p_attachment_size
  )
  RETURNING 
    guests_chat_messages.message_id,
    guests_chat_messages.event_id,
    guests_chat_messages.sender_email,
    guests_chat_messages.sender_name,
    guests_chat_messages.sender_type,
    guests_chat_messages.message_text,
    guests_chat_messages.message_type,
    guests_chat_messages.company_id,
    guests_chat_messages.created_at,
    guests_chat_messages.reply_to_message_id,
    guests_chat_messages.attachment_url,
    guests_chat_messages.attachment_filename,
    guests_chat_messages.attachment_type,
    guests_chat_messages.attachment_size
  INTO 
    v_message_id,
    message_id,
    event_id,
    sender_email,
    sender_name,
    sender_type,
    message_text,
    message_type,
    company_id,
    created_at,
    reply_to_message_id,
    attachment_url,
    attachment_filename,
    attachment_type,
    attachment_size;

  RETURN NEXT;
END;
$$;