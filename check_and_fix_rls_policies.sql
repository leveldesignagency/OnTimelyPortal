-- Check current RLS policies on guests_chat_messages table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'guests_chat_messages';

-- Check if RLS is enabled on the table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'guests_chat_messages';

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated users access to guest chat messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Enable read access for guests and authenticated users" ON guests_chat_messages;
DROP POLICY IF EXISTS "Enable insert for guests and authenticated users" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow all users to access guest chat messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow all users to read guest chat messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow message sender to update messages" ON guests_chat_messages;
DROP POLICY IF EXISTS "Allow message sender to delete messages" ON guests_chat_messages;

-- Create simple, permissive policies that allow all operations
CREATE POLICY "Allow all operations for all users" ON guests_chat_messages
FOR ALL USING (true) WITH CHECK (true);

-- Verify the new policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'guests_chat_messages'; 