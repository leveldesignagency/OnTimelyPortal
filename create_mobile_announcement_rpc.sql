-- Create RPC function for mobile announcement creation
CREATE OR REPLACE FUNCTION create_mobile_announcement(
  p_event_id UUID,
  p_company_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_image_url TEXT,
  p_link_url TEXT,
  p_scheduled_for TIMESTAMP WITH TIME ZONE,
  p_sent_at TIMESTAMP WITH TIME ZONE,
  p_created_by UUID
)
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
DECLARE
  v_announcement_id UUID;
BEGIN
  -- Insert the announcement
  INSERT INTO announcements (
    event_id,
    company_id,
    title,
    description,
    image_url,
    link_url,
    scheduled_for,
    sent_at,
    created_by
  ) VALUES (
    p_event_id,
    p_company_id,
    p_title,
    p_description,
    p_image_url,
    p_link_url,
    p_scheduled_for,
    p_sent_at,
    p_created_by
  ) RETURNING id INTO v_announcement_id;

  -- Return the created announcement
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
  WHERE a.id = v_announcement_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_mobile_announcement(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID) TO authenticated; 