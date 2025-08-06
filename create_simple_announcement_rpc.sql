-- Create a simpler RPC function for mobile announcement creation
CREATE OR REPLACE FUNCTION create_announcement_mobile(announcement_data JSONB)
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
  -- Insert the announcement using JSON data
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
    (announcement_data->>'event_id')::UUID,
    (announcement_data->>'company_id')::UUID,
    announcement_data->>'title',
    announcement_data->>'description',
    announcement_data->>'image_url',
    announcement_data->>'link_url',
    CASE 
      WHEN announcement_data->>'scheduled_for' IS NOT NULL 
      THEN (announcement_data->>'scheduled_for')::TIMESTAMP WITH TIME ZONE
      ELSE NULL
    END,
    CASE 
      WHEN announcement_data->>'sent_at' IS NOT NULL 
      THEN (announcement_data->>'sent_at')::TIMESTAMP WITH TIME ZONE
      ELSE NULL
    END,
    (announcement_data->>'created_by')::UUID
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
GRANT EXECUTE ON FUNCTION create_announcement_mobile(JSONB) TO authenticated; 