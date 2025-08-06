-- Check RLS status and permissions for guests_chat_reactions table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'guests_chat_reactions';

-- Check if there are any RLS policies on the table
SELECT 
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

-- Check table permissions for the current user
SELECT 
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'guests_chat_reactions';

-- Check if the table exists and is accessible
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'guests_chat_reactions'; 