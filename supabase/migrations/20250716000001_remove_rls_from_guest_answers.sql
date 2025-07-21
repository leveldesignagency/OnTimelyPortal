-- Remove RLS from guest_module_answers table
-- Since we're using SECURITY DEFINER functions, we don't need RLS on the table

-- Disable RLS on the table
ALTER TABLE guest_module_answers DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies
DROP POLICY IF EXISTS "Guests can insert their own answers" ON guest_module_answers;
DROP POLICY IF EXISTS "Guests can view their own answers" ON guest_module_answers;
DROP POLICY IF EXISTS "Event organizers can view event answers" ON guest_module_answers;
DROP POLICY IF EXISTS "Allow authenticated users to insert answers" ON guest_module_answers;
DROP POLICY IF EXISTS "Allow users to view their own answers" ON guest_module_answers;
DROP POLICY IF EXISTS "Allow event organizers to view event answers" ON guest_module_answers;
DROP POLICY IF EXISTS "Allow guests to view answers by email" ON guest_module_answers; 