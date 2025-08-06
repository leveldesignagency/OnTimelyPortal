-- Remove the conflicting RLS policy that blocks guests
-- The "Allow authenticated users access to guest chat messages" policy is too restrictive

-- Drop the restrictive policy that only allows authenticated users
DROP POLICY IF EXISTS "Allow authenticated users access to guest chat messages" ON guests_chat_messages;

-- Verify the remaining policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'guests_chat_messages';

-- Test that guests can now read messages
-- This should return data for guests
SELECT COUNT(*) FROM guests_chat_messages WHERE event_id = '4e19b264-61a1-484f-8619-4f2d515b3796'; 