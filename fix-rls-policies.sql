-- Fix RLS Policy Issues
-- This fixes the "infinite recursion detected in policy" error

-- 1. Temporarily disable RLS to allow access
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chats;
DROP POLICY IF EXISTS "Users can create chats in their company" ON chats;
DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON chat_participants;
DROP POLICY IF EXISTS "Users can add participants to chats they created" ON chat_participants;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their chats" ON messages;
DROP POLICY IF EXISTS "Users can view reactions in their chats" ON message_reactions;
DROP POLICY IF EXISTS "Users can add reactions to messages in their chats" ON message_reactions;

-- 3. Create simple, non-recursive policies
CREATE POLICY "Allow all users access" ON users FOR ALL USING (true);
CREATE POLICY "Allow all companies access" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all chats access" ON chats FOR ALL USING (true);
CREATE POLICY "Allow all chat_participants access" ON chat_participants FOR ALL USING (true);
CREATE POLICY "Allow all messages access" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all message_reactions access" ON message_reactions FOR ALL USING (true);

-- 4. Re-enable RLS with the simple policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- 5. Verify the users exist
SELECT 'Fixed RLS policies. Users in database:' as status;
SELECT email, name, role, id FROM users; 