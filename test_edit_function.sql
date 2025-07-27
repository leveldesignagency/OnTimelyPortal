-- Test the edit function to see if it's working
-- First, let's see what messages exist
SELECT 
  message_id,
  sender_email,
  message_text,
  created_at,
  is_edited,
  edited_at
FROM guests_chat_messages 
ORDER BY created_at DESC 
LIMIT 5;

-- Now let's test the edit function with a specific message
-- Replace 'YOUR_MESSAGE_ID' with an actual message_id from above
-- Replace 'YOUR_EMAIL' with the actual sender email

-- Example test (uncomment and modify):
/*
SELECT edit_guests_chat_message(
  'YOUR_MESSAGE_ID'::UUID,
  'This is an edited message for testing',
  'YOUR_EMAIL'
);
*/

-- Check if the function exists and has correct permissions
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'edit_guests_chat_message';

-- Check function permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name = 'edit_guests_chat_message'; 