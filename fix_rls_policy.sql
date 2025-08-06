-- Fix RLS policy to allow both authenticated users and RPC functions to access guest chat messages

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow authenticated users access to guest chat messages" ON public.guests_chat_messages;

-- Create a new policy that allows both authenticated users and RPC functions
CREATE POLICY "Allow authenticated users and RPC access to guest chat messages" ON public.guests_chat_messages
FOR ALL
TO public
USING (
  auth.role() = 'authenticated'::text OR 
  auth.role() = 'service_role'::text OR
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Also ensure the RPC functions have proper permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.guests_chat_messages TO anon;
GRANT ALL ON public.guests_chat_messages TO authenticated; 