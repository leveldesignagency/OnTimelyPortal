-- Disable RLS on guests_chat_reactions table
ALTER TABLE guests_chat_reactions DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'guests_chat_reactions'; 