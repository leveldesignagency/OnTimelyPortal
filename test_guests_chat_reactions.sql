-- Test guests chat reactions functionality
-- Run this to verify reactions are working properly

-- Check if the reactions table exists and has data
SELECT 
  'REACTIONS TABLE CHECK:' as test_type,
  COUNT(*) as total_reactions,
  COUNT(DISTINCT message_id) as unique_messages,
  COUNT(DISTINCT user_email) as unique_users,
  COUNT(DISTINCT emoji) as unique_emojis
FROM guests_chat_reactions;

-- Check recent reactions
SELECT 
  'RECENT REACTIONS:' as test_type,
  message_id,
  user_email,
  emoji,
  created_at
FROM guests_chat_reactions
ORDER BY created_at DESC
LIMIT 10;

-- Check if RLS policies are working by testing access
-- This should return reactions if the user is properly authorized
SELECT 
  'RLS TEST - Current user reactions:' as test_type,
  COUNT(*) as accessible_reactions
FROM guests_chat_reactions
WHERE message_id IN (
  SELECT message_id FROM guests_chat_messages 
  WHERE event_id IN (
    SELECT event_id FROM guests_chat_participants 
    WHERE user_email = auth.email()
  )
);

-- Test the get_guests_chat_reactions function
-- Replace 'your-message-id-here' with an actual message ID from your database
SELECT 
  'FUNCTION TEST:' as test_type,
  'Run this manually with a real message_id:' as note,
  'SELECT * FROM get_guests_chat_reactions(''your-message-id-here'');' as command;

-- Check if the table structure is correct
SELECT 
  'TABLE STRUCTURE:' as test_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'guests_chat_reactions'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
  'RLS POLICIES:' as test_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'guests_chat_reactions';

SELECT 'Reactions test completed. Check the results above.' AS status; 