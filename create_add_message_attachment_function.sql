-- Create the add_message_attachment RPC function
CREATE OR REPLACE FUNCTION add_message_attachment(
  p_message_id UUID,
  p_file_url TEXT,
  p_filename TEXT,
  p_file_type TEXT,
  p_file_size INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attachment_id UUID;
BEGIN
  -- Insert attachment record
  INSERT INTO guests_chat_attachments (
    message_id,
    file_url,
    filename,
    file_type,
    file_size
  ) VALUES (
    p_message_id,
    p_file_url,
    p_filename,
    p_file_type,
    p_file_size
  ) RETURNING id INTO v_attachment_id;

  RETURN json_build_object(
    'success', true,
    'attachment_id', v_attachment_id,
    'message_id', p_message_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_message_attachment(UUID, TEXT, TEXT, TEXT, INTEGER) TO authenticated, anon;

SELECT 'add_message_attachment function created successfully' as status; 