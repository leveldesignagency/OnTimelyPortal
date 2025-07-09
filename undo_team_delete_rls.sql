-- RUN THIS IN SUPABASE SQL EDITOR
-- Undoes the team delete RLS policy changes

-- Remove the delete policy we just created
DROP POLICY IF EXISTS "Team creators can delete their own teams" ON teams;

-- Disable RLS on teams table (back to original state)
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;

-- Verify the policy was removed
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'teams' AND cmd = 'DELETE';

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'teams'; 