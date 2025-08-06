-- Check if there are any reactions for the last message
SELECT 
  message_id,
  user_email,
  emoji,
  created_at
FROM guests_chat_reactions 
WHERE message_id = 'e9df747a-f3b8-436d-8c70-9fc798f3a2ce'
ORDER BY created_at DESC; 