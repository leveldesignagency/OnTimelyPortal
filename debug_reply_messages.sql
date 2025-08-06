-- Debug script to check reply_to_message_id functionality

-- 1. Check if the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'guests_chat_messages' 
AND column_name = 'reply_to_message_id';

-- 2. Check if any messages have reply_to_message_id values
SELECT message_id, message_text, reply_to_message_id, sender_name, created_at
FROM guests_chat_messages 
WHERE event_id = '4e19b264-61a1-484f-8619-4f2d515b3796' 
AND reply_to_message_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Test the get_guests_chat_messages function directly
SELECT * FROM get_guests_chat_messages(
  '4e19b264-61a1-484f-8619-4f2d515b3796'::uuid,
  'charlesmorgantravels@gmail.com',
  10,
  0
);

-- 4. Check the function definition to see if it includes reply_to_message_id
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'get_guests_chat_messages'; 