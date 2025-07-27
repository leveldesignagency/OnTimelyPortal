-- Fix get_user_profile to work with email instead of ID
-- This fixes the issue where auth users don't have company_id

-- Create a new function that gets user profile by email
CREATE OR REPLACE FUNCTION get_user_profile_by_email(user_email TEXT)
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
  WHERE u.email = user_email;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_profile_by_email(TEXT) TO authenticated;

-- Test the setup
SELECT 'get_user_profile_by_email function created!' as status; 