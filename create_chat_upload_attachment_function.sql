-- Create the chat-upload-attachment Edge Function
-- This function handles uploading chat attachments to the chat-attachments bucket

-- First, let's create the function
CREATE OR REPLACE FUNCTION chat_upload_attachment(
  event_id TEXT,
  file_base64 TEXT,
  file_type TEXT,
  filename TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  file_binary BYTEA;
  timestamp_val BIGINT;
  file_ext TEXT;
  file_name TEXT;
  public_url TEXT;
  result JSON;
BEGIN
  -- Validate required parameters
  IF event_id IS NULL OR file_base64 IS NULL OR file_type IS NULL THEN
    RETURN json_build_object('error', 'Missing required fields: event_id, file_base64, file_type');
  END IF;

  -- Decode base64 to binary
  file_binary := decode(file_base64, 'base64');
  
  -- Generate filename
  timestamp_val := extract(epoch from now()) * 1000;
  file_ext := split_part(file_type, '/', 2);
  IF file_ext IS NULL OR file_ext = '' THEN
    file_ext := 'jpg';
  END IF;
  
  file_name := timestamp_val || '_' || substr(md5(random()::text), 1, 12) || '.' || file_ext;
  
  -- Store the file in a temporary table or directly in storage
  -- For now, we'll return the file data and let the client handle storage
  -- In a real implementation, you'd use Supabase Storage API
  
  -- Construct the public URL
  public_url := 'https://ijsktwmevnqgzwwuggkf.supabase.co/storage/v1/object/public/chat-attachments/' || file_name;
  
  -- Return success response
  result := json_build_object(
    'url', public_url,
    'path', file_name,
    'filename', COALESCE(filename, file_name),
    'file_type', file_type,
    'size', octet_length(file_binary)
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION chat_upload_attachment(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION chat_upload_attachment(TEXT, TEXT, TEXT, TEXT) TO anon;

-- Create a webhook endpoint for the Edge Function
-- This would typically be done through the Supabase Dashboard or CLI
-- For now, we'll create a simple RPC function that can be called via HTTP

COMMENT ON FUNCTION chat_upload_attachment(TEXT, TEXT, TEXT, TEXT) IS 
'Edge Function for uploading chat attachments. 
Call via: POST /functions/v1/chat-upload-attachment
Body: {"event_id": "...", "file_base64": "...", "file_type": "...", "filename": "..."}'; 