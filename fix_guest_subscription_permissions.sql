-- Fix RLS policies to allow guests to subscribe to real-time changes
-- This allows anonymous users (guests) to read messages for real-time subscriptions

-- First, let's see the current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'guests_chat_messages';

-- Drop existing policies that might be blocking guests
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON guests_chat_messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON guests_chat_messages;
DROP POLICY IF EXISTS "Enable read access for guests" ON guests_chat_messages;

-- Create a new policy that allows guests to read messages for their events
CREATE POLICY "Enable read access for guests and authenticated users" ON guests_chat_messages
FOR SELECT USING (
  -- Allow authenticated users to read all messages
  (auth.role() = 'authenticated') OR
  -- Allow anonymous users (guests) to read messages for events they're part of
  (auth.role() = 'anon' AND EXISTS (
    SELECT 1 FROM guests_chat_participants gcp 
    WHERE gcp.event_id = guests_chat_messages.event_id
  ))
);

-- Also ensure INSERT policy allows guests to insert messages
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON guests_chat_messages;
DROP POLICY IF EXISTS "Enable insert for all users" ON guests_chat_messages;

CREATE POLICY "Enable insert for guests and authenticated users" ON guests_chat_messages
FOR INSERT WITH CHECK (
  -- Allow authenticated users to insert
  (auth.role() = 'authenticated') OR
  -- Allow anonymous users (guests) to insert messages for their events
  (auth.role() = 'anon' AND EXISTS (
    SELECT 1 FROM guests_chat_participants gcp 
    WHERE gcp.event_id = guests_chat_messages.event_id
  ))
);

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'guests_chat_messages'; 