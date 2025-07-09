-- RUN THIS IN SUPABASE SQL EDITOR
-- Adds policy so only team creators can delete teams (not other team members)

-- First, check if RLS is enabled on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Drop any existing delete policies to avoid conflicts
DROP POLICY IF EXISTS "Users can delete teams in their company" ON teams;
DROP POLICY IF EXISTS "Team creators can delete their own teams" ON teams;

-- Add the correct delete policy: only team creators can delete their teams
CREATE POLICY "Team creators can delete their own teams" ON teams
  FOR DELETE USING (
    created_by = auth.uid() 
    AND 
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Verify the policy was created
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