-- Create RPC function for guests to get announcements
CREATE OR REPLACE FUNCTION get_guest_announcements(p_event_id UUID)
RETURNS TABLE (
    id UUID,
    event_id UUID,
    company_id UUID,
    title TEXT,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return announcements for the specified event
    RETURN QUERY
    SELECT 
        a.id,
        a.event_id,
        a.company_id,
        a.title,
        a.description,
        a.image_url,
        a.link_url,
        a.scheduled_for,
        a.sent_at,
        a.created_by,
        a.created_at,
        a.updated_at
    FROM announcements a
    WHERE a.event_id = p_event_id
    ORDER BY a.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_guest_announcements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_guest_announcements(UUID) TO anon;

-- Create RPC function for real-time announcements subscription
CREATE OR REPLACE FUNCTION subscribe_guest_announcements(p_event_id UUID)
RETURNS TABLE (
    id UUID,
    event_id UUID,
    company_id UUID,
    title TEXT,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return announcements for the specified event (for real-time subscriptions)
    RETURN QUERY
    SELECT 
        a.id,
        a.event_id,
        a.company_id,
        a.title,
        a.description,
        a.image_url,
        a.link_url,
        a.scheduled_for,
        a.sent_at,
        a.created_by,
        a.created_at,
        a.updated_at
    FROM announcements a
    WHERE a.event_id = p_event_id
    ORDER BY a.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION subscribe_guest_announcements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION subscribe_guest_announcements(UUID) TO anon; 