-- Fix the realtime policy that's blocking user profile fetches

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view company users via realtime" ON users;

-- Create a more permissive policy that allows:
-- 1. Users to always see their own profile
-- 2. Users to see other users in their company
CREATE POLICY "Users can view profiles for realtime" ON users
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      -- Always allow users to see their own profile
      id = auth.uid() OR
      -- Allow users to see other users in their company
      (company_id IS NOT NULL AND company_id = (
        SELECT company_id 
        FROM users 
        WHERE id = auth.uid()
      ))
    )
  );

-- Ensure the policy doesn't interfere with existing auth flows
-- by making it specifically for SELECT operations only
COMMENT ON POLICY "Users can view profiles for realtime" ON users IS 
'Allows users to view their own profile and company users for realtime updates';

-- Success message
SELECT 'Fixed realtime policy - login should work now' AS status; 