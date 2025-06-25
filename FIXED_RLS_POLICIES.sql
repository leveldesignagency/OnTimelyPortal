-- ============================================
-- FIXED RLS POLICIES FOR CUSTOM AUTHENTICATION
-- ============================================
-- These policies work with custom authentication systems

-- First, drop existing policies
DROP POLICY IF EXISTS "Users can only access their own company" ON companies;
DROP POLICY IF EXISTS "Users can only see users from their company" ON users;
DROP POLICY IF EXISTS "Users can only see teams from their company" ON teams;
DROP POLICY IF EXISTS "Users can only see team members from their company" ON team_members;
DROP POLICY IF EXISTS "Users can only see chats they participate in" ON chats;
DROP POLICY IF EXISTS "Users can only see participants of their chats" ON chat_participants;
DROP POLICY IF EXISTS "Users can only see messages from their chats" ON messages;
DROP POLICY IF EXISTS "Users can only see reactions on accessible messages" ON message_reactions;

-- Option 1: Disable RLS completely (simplest for custom auth)
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions DISABLE ROW LEVEL SECURITY;

-- Option 2: Alternative - Create permissive policies (if you want to keep RLS enabled)
-- Uncomment these if you prefer to keep RLS but make it permissive:

-- CREATE POLICY "Allow all access to companies" ON companies FOR ALL USING (true);
-- CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true);
-- CREATE POLICY "Allow all access to teams" ON teams FOR ALL USING (true);
-- CREATE POLICY "Allow all access to team_members" ON team_members FOR ALL USING (true);
-- CREATE POLICY "Allow all access to chats" ON chats FOR ALL USING (true);
-- CREATE POLICY "Allow all access to chat_participants" ON chat_participants FOR ALL USING (true);
-- CREATE POLICY "Allow all access to messages" ON messages FOR ALL USING (true);
-- CREATE POLICY "Allow all access to message_reactions" ON message_reactions FOR ALL USING (true);

-- Note: In a production environment with custom auth, you would typically:
-- 1. Use service role key for backend operations, or
-- 2. Implement custom RLS policies that check against your auth system, or
-- 3. Handle security at the application level instead of database level 
 
-- FIXED RLS POLICIES FOR CUSTOM AUTHENTICATION
-- ============================================
-- These policies work with custom authentication systems

-- First, drop existing policies
DROP POLICY IF EXISTS "Users can only access their own company" ON companies;
DROP POLICY IF EXISTS "Users can only see users from their company" ON users;
DROP POLICY IF EXISTS "Users can only see teams from their company" ON teams;
DROP POLICY IF EXISTS "Users can only see team members from their company" ON team_members;
DROP POLICY IF EXISTS "Users can only see chats they participate in" ON chats;
DROP POLICY IF EXISTS "Users can only see participants of their chats" ON chat_participants;
DROP POLICY IF EXISTS "Users can only see messages from their chats" ON messages;
DROP POLICY IF EXISTS "Users can only see reactions on accessible messages" ON message_reactions;

-- Option 1: Disable RLS completely (simplest for custom auth)
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions DISABLE ROW LEVEL SECURITY;

-- Option 2: Alternative - Create permissive policies (if you want to keep RLS enabled)
-- Uncomment these if you prefer to keep RLS but make it permissive:

-- CREATE POLICY "Allow all access to companies" ON companies FOR ALL USING (true);
-- CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true);
-- CREATE POLICY "Allow all access to teams" ON teams FOR ALL USING (true);
-- CREATE POLICY "Allow all access to team_members" ON team_members FOR ALL USING (true);
-- CREATE POLICY "Allow all access to chats" ON chats FOR ALL USING (true);
-- CREATE POLICY "Allow all access to chat_participants" ON chat_participants FOR ALL USING (true);
-- CREATE POLICY "Allow all access to messages" ON messages FOR ALL USING (true);
-- CREATE POLICY "Allow all access to message_reactions" ON message_reactions FOR ALL USING (true);

-- Note: In a production environment with custom auth, you would typically:
-- 1. Use service role key for backend operations, or
-- 2. Implement custom RLS policies that check against your auth system, or
-- 3. Handle security at the application level instead of database level 
 