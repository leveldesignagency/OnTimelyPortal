-- Fix RLS policies for guest_module_answers table
-- Allow guests to insert their own answers

-- First, let's check if RLS is enabled and what policies exist
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'guest_module_answers';

-- Check existing policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'guest_module_answers';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow guests to insert their own answers" ON guest_module_answers;
DROP POLICY IF EXISTS "Allow guests to view their own answers" ON guest_module_answers;
DROP POLICY IF EXISTS "Allow authenticated users to manage answers" ON guest_module_answers;

-- Create new policies that allow guests to insert their own answers
CREATE POLICY "Allow guests to insert their own answers" ON guest_module_answers
FOR INSERT WITH CHECK (
    -- Allow authenticated users (for admin purposes)
    auth.role() = 'authenticated'
    OR
    -- Allow guests to insert answers for themselves
    (auth.role() = 'anon' AND 
     guest_id IN (
       SELECT id FROM guests WHERE id = guest_id
     ))
);

-- Allow guests to view their own answers
CREATE POLICY "Allow guests to view their own answers" ON guest_module_answers
FOR SELECT USING (
    -- Allow authenticated users (for admin purposes)
    auth.role() = 'authenticated'
    OR
    -- Allow guests to view their own answers
    (auth.role() = 'anon' AND 
     guest_id IN (
       SELECT id FROM guests WHERE id = guest_id
     ))
);

-- Allow guests to update their own answers
CREATE POLICY "Allow guests to update their own answers" ON guest_module_answers
FOR UPDATE USING (
    -- Allow authenticated users (for admin purposes)
    auth.role() = 'authenticated'
    OR
    -- Allow guests to update their own answers
    (auth.role() = 'anon' AND 
     guest_id IN (
       SELECT id FROM guests WHERE id = guest_id
     ))
);

-- Grant necessary permissions
GRANT ALL ON guest_module_answers TO anon;
GRANT ALL ON guest_module_answers TO authenticated;

-- Verify the policies were created
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'guest_module_answers'; 