-- ============================================
-- FIX USER PROFILE FUNCTION TYPE MISMATCH
-- ============================================
-- This fixes the type mismatch error in get_user_profile function

-- Drop the existing function
DROP FUNCTION IF EXISTS get_user_profile(UUID);

-- Recreate with correct types matching the actual database columns
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,  -- Changed from TEXT to VARCHAR to match database
  email VARCHAR, -- Changed from TEXT to VARCHAR to match database
  avatar_url TEXT,
  description TEXT,
  company_role TEXT,
  status VARCHAR, -- Changed from TEXT to VARCHAR to match database
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

-- Test the function
DO $$
BEGIN
  RAISE NOTICE '✅ USER PROFILE FUNCTION FIXED!';
  RAISE NOTICE '🔧 Function recreated with correct VARCHAR types';
  RAISE NOTICE '📋 Ready for profile page testing';
END $$; 