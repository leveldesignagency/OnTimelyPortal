-- Deploy User Profile Functions
-- This ensures the get_user_profile function exists

-- Create or replace the get_user_profile function
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

-- Create or replace the update_user_profile function
CREATE OR REPLACE FUNCTION update_user_profile(
  user_id UUID,
  new_name VARCHAR(255) DEFAULT NULL,
  new_avatar_url TEXT DEFAULT NULL,
  new_description TEXT DEFAULT NULL,
  new_company_role TEXT DEFAULT NULL,
  new_status VARCHAR(20) DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users 
  SET 
    name = COALESCE(new_name, name),
    avatar_url = CASE 
      WHEN new_avatar_url IS NOT NULL THEN new_avatar_url
      ELSE avatar_url
    END,
    description = CASE 
      WHEN new_description IS NOT NULL THEN new_description
      ELSE description
    END,
    company_role = CASE 
      WHEN new_company_role IS NOT NULL THEN new_company_role
      ELSE company_role
    END,
    status = COALESCE(new_status, status),
    updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, VARCHAR(255), TEXT, TEXT, TEXT, VARCHAR(20)) TO authenticated; 