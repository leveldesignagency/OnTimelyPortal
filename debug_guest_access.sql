-- Debug guest access issues
-- Let's see what's currently happening

-- Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'guests_chat_messages';

-- Check if RLS is enabled on the table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'guests_chat_messages';

-- Test if we can read messages as anonymous user
-- This simulates what a guest would see
SELECT COUNT(*) as message_count FROM guests_chat_messages WHERE event_id = '4e19b264-61a1-484f-8619-4f2d515b3796';

-- If the above returns 0, let's temporarily disable RLS to test
-- ALTER TABLE guests_chat_messages DISABLE ROW LEVEL SECURITY;

-- Then test again
-- SELECT COUNT(*) as message_count FROM guests_chat_messages WHERE event_id = '4e19b264-61a1-484f-8619-4f2d515b3796';

-- If that works, we know RLS is the issue and we need to fix the policies
-- If it doesn't work, there's a different issue 