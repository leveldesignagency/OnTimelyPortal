-- Check and fix RLS policies for guests table
-- Run this in your Supabase SQL Editor

-- 1. Check current policies on guests table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'guests';

-- 2. Drop all existing policies on guests table
DROP POLICY IF EXISTS "Allow all" ON guests;
DROP POLICY IF EXISTS "Allow all operations on guests" ON guests;
DROP POLICY IF EXISTS "Users can view company guests" ON guests;
DROP POLICY IF EXISTS "Users can create guests in their company" ON guests;
DROP POLICY IF EXISTS "Users can update company guests" ON guests;
DROP POLICY IF EXISTS "Users can delete company guests" ON guests;

-- 3. Ensure RLS is enabled
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- 4. Create a simple permissive policy for guests table
CREATE POLICY "Allow all operations on guests" ON guests FOR ALL USING (true);

-- 5. Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'guests';

-- 6. Test access to a guest record with module data
-- (Replace with an actual guest ID from your database)
SELECT id, email, module_values, modules 
FROM guests 
LIMIT 1; 