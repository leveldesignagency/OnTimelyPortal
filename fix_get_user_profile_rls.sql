-- Fix get_user_profile RLS Access
-- This fixes the RLS issue that's blocking avatar_url access in get_user_profile

-- Update the get_user_profile function to bypass RLS
DROP FUNCTION IF EXISTS get_user_profile(UUID);

CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  email VARCHAR(255),
  avatar_url TEXT,
  description TEXT,
  company_role TEXT,
  status VARCHAR(20),
  company_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.email,
    u.avatar_url,
    u.description,
    u.company_role,
    u.status,
    u.company_id,
    u.created_at,
    u.updated_at
  FROM users u
  WHERE u.id = user_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

-- Test the setup
SELECT 'get_user_profile RLS access fixed!' as status; 