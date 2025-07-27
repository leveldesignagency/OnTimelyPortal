-- Test manual edit of a message
-- First, let's see the current state of messages
SELECT 
  message_id,
  sender_email,
  message_text,
  created_at,
  is_edited,
  edited_at
FROM guests_chat_messages 
ORDER BY created_at DESC 
LIMIT 3;

-- Now let's manually update a message to test if the columns work
-- Replace 'YOUR_MESSAGE_ID' with an actual message_id from above
UPDATE guests_chat_messages 
SET 
  message_text = 'This message was manually edited for testing',
  is_edited = true,
  edited_at = NOW(),
  updated_at = NOW()
WHERE message_id = 'YOUR_MESSAGE_ID'::UUID;

-- Check if the update worked
SELECT 
  message_id,
  sender_email,
  message_text,
  created_at,
  is_edited,
  edited_at
FROM guests_chat_messages 
WHERE message_id = 'YOUR_MESSAGE_ID'::UUID;

-- Test the edit function directly
-- Replace 'YOUR_MESSAGE_ID' and 'YOUR_EMAIL' with actual values
SELECT edit_guests_chat_message(
  'YOUR_MESSAGE_ID'::UUID,
  'This message was edited via the function',
  'YOUR_EMAIL'
);

-- Check the result
SELECT 
  message_id,
  sender_email,
  message_text,
  created_at,
  is_edited,
  edited_at
FROM guests_chat_messages 
WHERE message_id = 'YOUR_MESSAGE_ID'::UUID; 