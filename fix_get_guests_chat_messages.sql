-- Drop the existing function first, then recreate it
DROP FUNCTION IF EXISTS get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER);

-- Fix the get_guests_chat_messages function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION get_guests_chat_messages(
    p_event_id UUID,
    p_user_email TEXT,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    message_id UUID,
    event_id UUID,
    sender_email TEXT,
    sender_name TEXT,
    sender_type TEXT,
    avatar_url TEXT,
    message_text TEXT,
    message_type TEXT,
    created_at TIMESTAMPTZ,
    company_id UUID,
    is_edited BOOLEAN,
    edited_at TIMESTAMPTZ,
    reply_to_message_id UUID,
    reactions JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gcm.message_id,
    gcm.event_id,
    gcm.sender_email,
    gcm.sender_name,
    gcm.sender_type,
    gcm.avatar_url,
    gcm.message_text,
    gcm.message_type,
    gcm.created_at,
    gcm.company_id,
    gcm.is_edited,
    gcm.edited_at,
    gcm.reply_to_message_id,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'emoji', gcr.emoji,
            'user_email', gcr.user_email,
            'created_at', gcr.created_at
          )
        )
        FROM guests_chat_reactions gcr
        WHERE gcr.message_id = gcm.message_id
      ),
      '[]'::json
    ) as reactions
  FROM guests_chat_messages gcm
  WHERE gcm.event_id = p_event_id
  ORDER BY gcm.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated, anon;

SELECT 'get_guests_chat_messages function fixed successfully' AS status; 