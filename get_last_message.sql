-- Get the last message sent in event 4e19b264-61a1-484f-8619-4f2d515b3796
SELECT 
  message_id,
  event_id,
  sender_name,
  sender_email,
  message_text,
  created_at
FROM guests_chat_messages 
WHERE event_id = '4e19b264-61a1-484f-8619-4f2d515b3796'
ORDER BY created_at DESC
LIMIT 1; 