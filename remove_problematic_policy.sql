-- Remove the problematic RLS policy causing infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles for realtime" ON users;
DROP POLICY IF EXISTS "Users can view company users via realtime" ON users;

-- List existing policies to see what's left
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- Success message
SELECT 'Removed problematic RLS policies - login should work now' AS status; 
 
 
 