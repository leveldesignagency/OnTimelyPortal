-- ============================================
-- TEMPORARY: DISABLE RLS FOR TESTING
-- ============================================
-- Run this in your Supabase SQL editor to disable RLS temporarily
-- This allows team creation to work while we implement proper authentication

-- Disable RLS on all tables
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions DISABLE ROW LEVEL SECURITY;

-- Note: This is for testing only. In production, you need proper RLS policies
-- that work with your custom authentication system. 
 
-- TEMPORARY: DISABLE RLS FOR TESTING
-- ============================================
-- Run this in your Supabase SQL editor to disable RLS temporarily
-- This allows team creation to work while we implement proper authentication

-- Disable RLS on all tables
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions DISABLE ROW LEVEL SECURITY;

-- Note: This is for testing only. In production, you need proper RLS policies
-- that work with your custom authentication system. 
 