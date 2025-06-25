-- FIX CHAT CREATION RLS POLICIES
-- This script fixes the RLS policies that are blocking chat creation
-- while maintaining proper multi-tenant security

-- First, let's check what policies exist
-- You can see them in Supabase Dashboard > Authentication > Policies

-- TEMPORARY FIX: Disable RLS to test (ONLY FOR TESTING)
-- Run this first to confirm the issue is RLS:
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable with proper policies:
-- ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- PROPER FIX: Create working RLS policies for your custom auth
-- (Only run these after confirming the disable RLS test works)

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can access company chats" ON chats;
DROP POLICY IF EXISTS "Users can access company chat participants" ON chat_participants;

-- Create new policies that work with your custom auth
-- These policies check company_id directly instead of using auth.uid()

CREATE POLICY "Allow chat operations for company users" ON chats
  FOR ALL 
  USING (
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = current_setting('app.current_user_id', true)::uuid
    )
  );

CREATE POLICY "Allow chat participant operations for company users" ON chat_participants
  FOR ALL 
  USING (
    chat_id IN (
      SELECT c.id 
      FROM chats c
      JOIN users u ON u.company_id = c.company_id
      WHERE u.id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- NOTE: You'll also need to set the current_user_id in your app
-- Add this to your login function in auth.ts:
-- await supabase.rpc('set_config', {
--   setting_name: 'app.current_user_id',
--   setting_value: user.id
-- }); 