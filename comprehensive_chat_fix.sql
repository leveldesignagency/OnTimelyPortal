-- Comprehensive fix for guest chat issues
-- 1. Fix RLS policies to allow all operations
-- 2. Fix send_guests_chat_message function to return proper format
-- 3. Ensure real-time updates work correctly

-- First, check current state
SELECT 'Current RLS policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'guests_chat_messages';

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated users access to guest chat messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Enable read access for guests and authenticated users" ON guests_chat_messages;
DROP POLICY IF EXISTS "Enable insert for guests and authenticated users" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow all users to access guest chat messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow all users to read guest chat messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow message sender to update messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow message sender to delete messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow all operations for all users" ON guests_chat_messages;

-- Create a single, permissive policy that allows all operations
CREATE POLICY "Allow all operations for all users" ON guests_chat_messages
FOR ALL USING (true) WITH CHECK (true);

-- Now fix the send_guests_chat_message function
-- Drop all versions of the function
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, VARCHAR, UUID);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS send_guests_chat_message(UUID, TEXT, TEXT, VARCHAR, UUID, TEXT, TEXT);

-- Create the function that returns JSON (matching what the frontend expects)
CREATE OR REPLACE FUNCTION send_guests_chat_message(
  p_event_id UUID,
  p_sender_email TEXT,
  p_message_text TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_reply_to_message_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_message_id UUID;
  v_sender_name TEXT;
  v_sender_type TEXT;
  v_company_id UUID;
  v_avatar_url TEXT;
  v_final_message_text TEXT;
  v_result JSON;
BEGIN
  -- First check if it's an admin user (company user)
  SELECT 
    name,
    'admin',
    company_id,
    avatar_url  -- Use avatar_url column
  INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
  FROM users 
  WHERE email = p_sender_email;
  
  -- If not found in users, it's a guest user
  IF v_sender_name IS NULL THEN
    SELECT 
      first_name || ' ' || last_name,
      'guest',
      company_id,
      NULL as avatar_url  -- Guests don't have profile photos
    INTO v_sender_name, v_sender_type, v_company_id, v_avatar_url
    FROM guests 
    WHERE email = p_sender_email AND event_id = p_event_id;
  END IF;
  
  -- Debug logging
  RAISE NOTICE 'Sender: %, Name: %, Type: %, Avatar: %', p_sender_email, v_sender_name, v_sender_type, v_avatar_url;
  
  -- For attachment messages, store the file URL in the message_text field
  v_final_message_text := p_message_text;
  
  -- Insert the message
  INSERT INTO guests_chat_messages (
    event_id,
    sender_email,
    sender_name,
    sender_type,
    message_text,
    message_type,
    company_id,
    reply_to_message_id
  ) VALUES (
    p_event_id,
    p_sender_email,
    v_sender_name,
    v_sender_type,
    v_final_message_text,
    p_message_type,
    v_company_id,
    p_reply_to_message_id
  ) RETURNING message_id INTO v_message_id;
  
  -- Return the result as JSON
  v_result := json_build_object(
    'success', true,
    'message_id', v_message_id,
    'sender_name', v_sender_name,
    'sender_type', v_sender_type,
    'avatar_url', v_avatar_url,
    'created_at', now()
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error as JSON
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the new policies
SELECT 'New RLS policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'guests_chat_messages';

-- Test the function
SELECT 'Testing send function:' as info;
SELECT send_guests_chat_message(
  '4e19b264-61a1-484f-8619-4f2d515b3796'::uuid,
  'charlesmorgantravels@gmail.com',
  'test message from fix',
  'text',
  NULL
); 