-- Fix RLS policies for guests_chat_reactions table
-- This will allow proper read access to reactions for event participants

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow authenticated users access to guest chat reactions" ON guests_chat_reactions;

-- Create proper RLS policies for guests_chat_reactions
CREATE POLICY "Event participants can view reactions" ON guests_chat_reactions
    FOR SELECT TO authenticated, anon
    USING (
        -- Admin can see reactions for events in their company
        (EXISTS (
            SELECT 1 FROM events e 
            JOIN users u ON e.company_id = u.company_id
            WHERE e.id = event_id AND u.id = auth.uid()
        ))
        OR 
        -- Guest can see reactions for their event
        (EXISTS (
            SELECT 1 FROM guests g 
            WHERE g.event_id = event_id AND g.email = auth.email()
        ))
        OR
        -- User is a participant in this event
        (EXISTS (
            SELECT 1 FROM guests_chat_participants gcp
            WHERE gcp.event_id = event_id AND gcp.user_email = auth.email()
        ))
    );

CREATE POLICY "Event participants can add reactions" ON guests_chat_reactions
    FOR INSERT TO authenticated, anon
    WITH CHECK (
        -- Admin can add reactions for events in their company
        (EXISTS (
            SELECT 1 FROM events e 
            JOIN users u ON e.company_id = u.company_id
            WHERE e.id = event_id AND u.id = auth.uid()
        ))
        OR 
        -- Guest can add reactions for their event
        (EXISTS (
            SELECT 1 FROM guests g 
            WHERE g.event_id = event_id AND g.email = auth.email()
        ))
        OR
        -- User is a participant in this event
        (EXISTS (
            SELECT 1 FROM guests_chat_participants gcp
            WHERE gcp.event_id = event_id AND gcp.user_email = auth.email()
        ))
    );

CREATE POLICY "Event participants can remove reactions" ON guests_chat_reactions
    FOR DELETE TO authenticated, anon
    USING (
        -- User can only remove their own reactions
        user_email = auth.email()
        AND (
            -- Admin can remove reactions for events in their company
            (EXISTS (
                SELECT 1 FROM events e 
                JOIN users u ON e.company_id = u.company_id
                WHERE e.id = event_id AND u.id = auth.uid()
            ))
            OR 
            -- Guest can remove reactions for their event
            (EXISTS (
                SELECT 1 FROM guests g 
                WHERE g.event_id = event_id AND g.email = auth.email()
            ))
            OR
            -- User is a participant in this event
            (EXISTS (
                SELECT 1 FROM guests_chat_participants gcp
                WHERE gcp.event_id = event_id AND gcp.user_email = auth.email()
            ))
        )
    );

-- Also fix the get_guests_chat_reactions function to be more permissive
CREATE OR REPLACE FUNCTION get_guests_chat_reactions(p_message_id UUID)
RETURNS TABLE (
  emoji TEXT,
  user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Get the event_id from the message
  SELECT event_id INTO v_event_id
  FROM guests_chat_messages
  WHERE message_id = p_message_id;
  
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;
  
  -- Return all reactions for the message (no additional filtering needed since RLS handles it)
  RETURN QUERY
  SELECT 
    gcr.emoji,
    gcr.user_email
  FROM guests_chat_reactions gcr
  WHERE gcr.message_id = p_message_id
  ORDER BY gcr.created_at;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_guests_chat_reactions(UUID) TO authenticated;

SELECT 'Guests chat reactions RLS policies fixed successfully' AS status; 