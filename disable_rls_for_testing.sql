-- Temporarily disable RLS for testing guest_module_answers
-- This will allow any authenticated user to insert and select from the table

-- Disable RLS
ALTER TABLE guest_module_answers DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'guest_module_answers'; 