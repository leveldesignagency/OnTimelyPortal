-- Check the current function definition
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'add_message_attachment'
AND routine_schema = 'public';

-- Drop and recreate the function to ensure it's correct
DROP FUNCTION IF EXISTS add_message_attachment(UUID, TEXT, TEXT, TEXT, INTEGER);

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

SELECT 'add_message_attachment function updated successfully' as status; 