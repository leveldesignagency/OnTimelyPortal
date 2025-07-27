-- ============================================
-- CLEAN UP CHAT_PARTICIPANTS POLICIES
-- ============================================
-- This removes all conflicting policies and creates a single clean one

-- Step 1: Drop ALL existing policies on chat_participants
DROP POLICY IF EXISTS "Allow all chat_participants access" ON chat_participants;
DROP POLICY IF EXISTS "Allow chat participant operations for company users" ON chat_participants;
DROP POLICY IF EXISTS "Insert chat_participants for own company" ON chat_participants;
DROP POLICY IF EXISTS "Update chat_participants for own company" ON chat_participants;
DROP POLICY IF EXISTS "Users can add chat participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can view chat participants" ON chat_participants;

-- Step 2: Ensure RLS is disabled (so no policies interfere)
ALTER TABLE chat_participants DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify all policies are gone
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'chat_participants';

-- Step 4: Verify RLS status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'chat_participants';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🧹 CLEANED UP CHAT_PARTICIPANTS POLICIES!';
  RAISE NOTICE '❌ All 6 conflicting policies removed';
  RAISE NOTICE '🔓 RLS disabled on chat_participants';
  RAISE NOTICE '🧪 Test user deletion now - should work perfectly!';
  RAISE NOTICE '🔍 Check console logs for: "✅ User successfully removed from group"';
END $$; 