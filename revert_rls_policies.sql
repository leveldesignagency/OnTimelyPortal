-- REVERT RLS POLICIES BACK TO ORIGINAL WORKING STATE
-- This reverts the policies back to how they were working before

-- 1. DROP THE POLICIES I CREATED
DROP POLICY IF EXISTS "messages_select_policy" ON guests_chat_messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON guests_chat_messages;
DROP POLICY IF EXISTS "messages_update_policy" ON guests_chat_messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON guests_chat_messages;

DROP POLICY IF EXISTS "reactions_select_policy" ON guests_chat_reactions;
DROP POLICY IF EXISTS "reactions_insert_policy" ON guests_chat_reactions;
DROP POLICY IF EXISTS "reactions_delete_policy" ON guests_chat_reactions;

-- 2. RESTORE THE ORIGINAL POLICIES
-- Messages policies
CREATE POLICY "Allow all operations for all users" ON guests_chat_messages
FOR ALL TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "guests_can_view_messages" ON guests_chat_messages
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_messages.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "guests_can_insert_messages" ON guests_chat_messages
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_messages.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "guests_can_update_messages" ON guests_chat_messages
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_messages.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_messages.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "guests_can_delete_messages" ON guests_chat_messages
FOR DELETE TO public
USING (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_messages.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
);

-- Reactions policies
CREATE POLICY "authenticated_users_can_add_reactions" ON guests_chat_reactions
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guests_chat_participants
    WHERE guests_chat_participants.event_id = guests_chat_reactions.event_id
    AND guests_chat_participants.user_email = auth.jwt() ->> 'email'
  ) AND user_email = auth.jwt() ->> 'email'
);

CREATE POLICY "authenticated_users_can_remove_own_reactions" ON guests_chat_reactions
FOR DELETE TO public
USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "authenticated_users_can_view_reactions" ON guests_chat_reactions
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM guests_chat_participants
    WHERE guests_chat_participants.event_id = guests_chat_reactions.event_id
    AND guests_chat_participants.user_email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "guests_can_add_reactions" ON guests_chat_reactions
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_reactions.event_id
    AND guests.email = guests_chat_reactions.user_email
  )
);

CREATE POLICY "guests_can_delete_reactions" ON guests_chat_reactions
FOR DELETE TO public
USING (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_reactions.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "guests_can_insert_reactions" ON guests_chat_reactions
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_reactions.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "guests_can_remove_own_reactions" ON guests_chat_reactions
FOR DELETE TO public
USING (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_reactions.event_id
    AND guests.email = guests_chat_reactions.user_email
  )
);

CREATE POLICY "guests_can_view_reactions" ON guests_chat_reactions
FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM guests
    WHERE guests.event_id = guests_chat_reactions.event_id
    AND guests.email = auth.jwt() ->> 'email'
  )
); 