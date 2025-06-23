-- Simple fix: Just disable RLS entirely for testing
-- This bypasses the infinite recursion issue

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions DISABLE ROW LEVEL SECURITY;

-- Verify users exist
SELECT 'RLS disabled. Users in database:' as status;
SELECT email, name, role, id FROM users; 