-- Check if guests_chat_attachments table exists and its structure
SELECT 
  'Table exists' as status,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'guests_chat_attachments'
ORDER BY ordinal_position;

-- Check table constraints
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'guests_chat_attachments';

-- Check if table exists at all
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'guests_chat_attachments'
) as table_exists;

-- Show any existing data
SELECT * FROM guests_chat_attachments LIMIT 5; 