-- Fix update_user_profile function conflict
-- Drop all existing versions of the function

DROP FUNCTION IF EXISTS public.update_user_profile(uuid, character varying, text, text, text, character varying);
DROP FUNCTION IF EXISTS public.update_user_profile(uuid, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.update_user_profile(uuid, varchar(255), text, text, text, varchar(20));

-- Create a single, correct version
CREATE OR REPLACE FUNCTION public.update_user_profile(
  user_id_param UUID,
  new_name TEXT DEFAULT NULL,
  new_avatar_url TEXT DEFAULT NULL,
  new_description TEXT DEFAULT NULL,
  new_company_role TEXT DEFAULT NULL,
  new_status TEXT DEFAULT NULL
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
  WHERE id = user_id_param;
  
  RETURN FOUND;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated; 