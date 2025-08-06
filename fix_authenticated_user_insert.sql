-- Fix RLS policies to allow authenticated users to insert messages
-- The current policies are blocking authenticated users from sending messages

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'guests_chat_messages';

-- Drop the current restrictive policy
DROP POLICY IF EXISTS "Allow all users to access guest chat messages" ON guests_chat_messages;

-- Create a new policy that allows authenticated users to insert messages
CREATE POLICY "Allow authenticated users to insert messages" ON guests_chat_messages
FOR INSERT WITH CHECK (
  -- Allow authenticated users to insert messages
  (auth.role() = 'authenticated') OR
  -- Allow anonymous users (guests) to insert messages for their events
  (auth.role() = 'anon' AND EXISTS (
    SELECT 1 FROM guests_chat_participants gcp 
    WHERE gcp.event_id = guests_chat_messages.event_id
  ))
);

-- Create a policy for reading messages
CREATE POLICY "Allow all users to read guest chat messages" ON guests_chat_messages
FOR SELECT USING (true);

-- Create a policy for updating messages (for editing)
CREATE POLICY "Allow message sender to update messages" ON guests_chat_messages
FOR UPDATE USING (
  (auth.role() = 'authenticated' AND sender_email = auth.jwt() ->> 'email') OR
  (auth.role() = 'anon' AND sender_email = auth.jwt() ->> 'email')
);

-- Create a policy for deleting messages (for message deletion)
CREATE POLICY "Allow message sender to delete messages" ON guests_chat_messages
FOR DELETE USING (
  (auth.role() = 'authenticated' AND sender_email = auth.jwt() ->> 'email') OR
  (auth.role() = 'anon' AND sender_email = auth.jwt() ->> 'email')
);

-- Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'guests_chat_messages'; 