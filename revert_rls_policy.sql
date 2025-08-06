-- Revert RLS policy back to original

-- Drop the new policy
DROP POLICY IF EXISTS "Allow authenticated users and RPC access to guest chat messages" ON public.guests_chat_messages;

-- Recreate the original policy
CREATE POLICY "Allow authenticated users access to guest chat messages" ON public.guests_chat_messages
FOR ALL
TO public
USING (auth.role() = 'authenticated'::text); 