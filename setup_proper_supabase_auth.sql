-- SETUP PROPER SUPABASE AUTH WITH MULTI-TENANT RLS
-- This script fixes the authentication to work with Supabase Auth instead of custom auth

-- Step 1: Create auth users for existing profiles
-- You'll need to run the createSupabaseAuthUsers() function from your app first

-- Step 2: Create a function to get user's company_id from auth
CREATE OR REPLACE FUNCTION auth.get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT company_id 
  FROM public.users 
  WHERE email = auth.jwt() ->> 'email'
  LIMIT 1;
$$;

-- Step 3: Update RLS policies to use proper Supabase Auth with company isolation

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on companies" ON companies;
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Allow all operations on teams" ON teams;
DROP POLICY IF EXISTS "Allow all operations on team_members" ON team_members;
DROP POLICY IF EXISTS "Allow all operations on team_invitations" ON team_invitations;
DROP POLICY IF EXISTS "Allow all operations on chats" ON chats;
DROP POLICY IF EXISTS "Allow all operations on chat_participants" ON chat_participants;
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;
DROP POLICY IF EXISTS "Allow all operations on message_reactions" ON message_reactions;

-- Create proper multi-tenant RLS policies using Supabase Auth

-- Companies: Users can only access their own company
CREATE POLICY "Users can access their own company" ON companies
  FOR ALL 
  USING (id = auth.get_user_company_id());

-- Users: Users can only see users from their company
CREATE POLICY "Users can see company users" ON users
  FOR ALL 
  USING (company_id = auth.get_user_company_id());

-- Teams: Users can only see teams from their company
CREATE POLICY "Users can access company teams" ON teams
  FOR ALL 
  USING (company_id = auth.get_user_company_id());

-- Team members: Users can only see team members from their company teams
CREATE POLICY "Users can access company team members" ON team_members
  FOR ALL 
  USING (
    team_id IN (
      SELECT id FROM teams WHERE company_id = auth.get_user_company_id()
    )
  );

-- Team invitations: Users can only see invitations for their company teams
CREATE POLICY "Users can access company team invitations" ON team_invitations
  FOR ALL 
  USING (
    team_id IN (
      SELECT id FROM teams WHERE company_id = auth.get_user_company_id()
    )
  );

-- Chats: Users can only access chats from their company
CREATE POLICY "Users can access company chats" ON chats
  FOR ALL 
  USING (company_id = auth.get_user_company_id());

-- Chat participants: Users can only see participants in their company chats
CREATE POLICY "Users can access company chat participants" ON chat_participants
  FOR ALL 
  USING (
    chat_id IN (
      SELECT id FROM chats WHERE company_id = auth.get_user_company_id()
    )
  );

-- Messages: Users can only see messages in their company chats
CREATE POLICY "Users can access company chat messages" ON messages
  FOR ALL 
  USING (
    chat_id IN (
      SELECT id FROM chats WHERE company_id = auth.get_user_company_id()
    )
  );

-- Message reactions: Users can only see reactions on their company messages
CREATE POLICY "Users can access company message reactions" ON message_reactions
  FOR ALL 
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE c.company_id = auth.get_user_company_id()
    )
  );

-- Note: After running this script, you need to:
-- 1. Run the createSupabaseAuthUsers() function in your app
-- 2. Update your login page to use the new Supabase Auth login
-- 3. Test that multi-tenancy is working correctly 