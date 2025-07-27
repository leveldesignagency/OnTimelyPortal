-- Fix update_user_profile to work with email instead of ID
-- This fixes the issue where auth users don't have company_id

-- Create a new function that updates user profile by email
CREATE OR REPLACE FUNCTION update_user_profile_by_email(
  user_email TEXT,
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
  WHERE email = user_email;
  
  RETURN FOUND;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_user_profile_by_email(TEXT, VARCHAR(255), TEXT, TEXT, TEXT, VARCHAR(20)) TO authenticated;

-- Test the setup
SELECT 'update_user_profile_by_email function created!' as status; 