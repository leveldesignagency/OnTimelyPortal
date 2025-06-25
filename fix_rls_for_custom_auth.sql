-- ============================================
-- FIX RLS POLICIES FOR CUSTOM AUTHENTICATION
-- ============================================

-- Since we're using custom authentication instead of Supabase Auth,
-- we need to either disable RLS or create more permissive policies

-- Option 1: Disable RLS temporarily for development
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Option 2: Create more permissive policies that work without auth.uid()
-- First, drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can only see users from their company" ON users;

-- Create a more permissive policy for development
-- In production, you'd want to implement proper RLS with Supabase Auth
CREATE POLICY "Allow all users access for development" ON users
  FOR ALL USING (true);

-- Similarly for other tables that might be affected
DROP POLICY IF EXISTS "Users can only see teams from their company" ON teams;
CREATE POLICY "Allow all teams access for development" ON teams
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can only see team members from their company" ON team_members;
CREATE POLICY "Allow all team members access for development" ON team_members
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can only see chats they participate in" ON chats;
CREATE POLICY "Allow all chats access for development" ON chats
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can only see participants of their chats" ON chat_participants;
CREATE POLICY "Allow all chat participants access for development" ON chat_participants
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can only see messages from their chats" ON messages;
CREATE POLICY "Allow all messages access for development" ON messages
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Users can only see reactions on accessible messages" ON message_reactions;
CREATE POLICY "Allow all message reactions access for development" ON message_reactions
  FOR ALL USING (true);

-- Note: In production, you should implement proper RLS policies
-- that work with your authentication system 