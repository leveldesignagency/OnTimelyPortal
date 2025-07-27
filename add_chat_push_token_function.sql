-- Add missing RPC function for getting guest push tokens
-- This function is referenced in the chat push notification system

CREATE OR REPLACE FUNCTION get_guest_push_tokens(guest_email TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    guest_id UUID,
    expo_push_token TEXT,
    device_id TEXT,
    platform TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        upt.id,
        upt.user_id,
        upt.guest_id,
        upt.expo_push_token,
        upt.device_id,
        upt.platform,
        upt.created_at,
        upt.updated_at
    FROM user_push_tokens upt
    LEFT JOIN guests g ON upt.guest_id = g.id
    LEFT JOIN users u ON upt.user_id = u.id
    WHERE (g.email = guest_email OR u.email = guest_email)
    AND upt.expo_push_token IS NOT NULL
    AND LENGTH(upt.expo_push_token) > 0;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_guest_push_tokens TO authenticated, anon;

-- Add helper function to update push token for guest
CREATE OR REPLACE FUNCTION update_guest_push_token(
    guest_email TEXT,
    new_push_token TEXT,
    device_identifier TEXT,
    device_platform TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    guest_id_var UUID;
    existing_token_id UUID;
BEGIN
    -- Find guest by email
    SELECT id INTO guest_id_var
    FROM guests 
    WHERE email = guest_email;
    
    IF guest_id_var IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if token already exists for this device
    SELECT id INTO existing_token_id
    FROM user_push_tokens
    WHERE guest_id = guest_id_var
    AND device_id = device_identifier;
    
    IF existing_token_id IS NOT NULL THEN
        -- Update existing token
        UPDATE user_push_tokens
        SET expo_push_token = new_push_token,
            platform = device_platform,
            updated_at = NOW()
        WHERE id = existing_token_id;
    ELSE
        -- Insert new token
        INSERT INTO user_push_tokens (
            guest_id,
            expo_push_token,
            device_id,
            platform,
            created_at,
            updated_at
        )
        VALUES (
            guest_id_var,
            new_push_token,
            device_identifier,
            device_platform,
            NOW(),
            NOW()
        );
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_guest_push_token TO authenticated, anon; 
 
 
 