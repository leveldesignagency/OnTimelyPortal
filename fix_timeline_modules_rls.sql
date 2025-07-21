-- Fix RLS policies for timeline_modules table
-- This allows authenticated users to perform all operations on timeline_modules

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'timeline_modules';

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "timeline_modules_policy" ON timeline_modules;

-- Create a new permissive policy for authenticated users
CREATE POLICY "timeline_modules_policy" ON timeline_modules
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Also create a policy for the timeline_module_guests table
DROP POLICY IF EXISTS "timeline_module_guests_policy" ON timeline_module_guests;

CREATE POLICY "timeline_module_guests_policy" ON timeline_module_guests
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('timeline_modules', 'timeline_module_guests'); 