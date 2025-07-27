-- Debug guests chat tables structure
-- Check what columns actually exist

-- Check guests_chat_participants table structure
SELECT 
  'GUESTS_CHAT_PARTICIPANTS COLUMNS:' as table_info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'guests_chat_participants'
ORDER BY ordinal_position;

-- Check guests_chat_messages table structure  
SELECT 
  'GUESTS_CHAT_MESSAGES COLUMNS:' as table_info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'guests_chat_messages'
ORDER BY ordinal_position;

-- Check guests_chat_receipts table structure
SELECT 
  'GUESTS_CHAT_RECEIPTS COLUMNS:' as table_info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'guests_chat_receipts'
ORDER BY ordinal_position;

-- Check guests_chat_notifications table structure
SELECT 
  'GUESTS_CHAT_NOTIFICATIONS COLUMNS:' as table_info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'guests_chat_notifications'
ORDER BY ordinal_position;

-- Check if tables exist
SELECT 
  'TABLE EXISTS CHECK:' as info,
  table_name,
  CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.tables 
WHERE table_name IN ('guests_chat_participants', 'guests_chat_messages', 'guests_chat_receipts', 'guests_chat_notifications')
ORDER BY table_name; 
 
 
 