-- Check reactions data grouped by event_id
SELECT 
  event_id, 
  COUNT(*) as reaction_count,
  COUNT(DISTINCT message_id) as unique_messages,
  COUNT(DISTINCT user_email) as unique_users
FROM guests_chat_reactions 
GROUP BY event_id 
ORDER BY reaction_count DESC 
LIMIT 10;

-- Check a few sample reactions to see the data structure
SELECT 
  message_id,
  event_id,
  user_email,
  emoji,
  created_at
FROM guests_chat_reactions 
ORDER BY created_at DESC 
LIMIT 5; 