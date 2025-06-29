-- ============================================
-- LOGIN FUNCTION FOR EXISTING CUSTOM AUTH
-- ============================================
-- This function works with your existing password_hash system

CREATE OR REPLACE FUNCTION login_user(user_email TEXT, user_password TEXT)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  email VARCHAR,
  name VARCHAR,
  role VARCHAR,
  avatar VARCHAR,
  status VARCHAR,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  company_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.company_id,
    u.email,
    u.name,
    u.role,
    u.avatar,
    u.status,
    u.last_seen,
    u.created_at,
    u.updated_at,
    c.name as company_name
  FROM users u
  JOIN companies c ON u.company_id = c.id
  WHERE u.email = user_email 
    AND u.password_hash = crypt(user_password, u.password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION login_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION login_user(TEXT, TEXT) TO anon; 