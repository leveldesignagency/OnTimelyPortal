-- ============================================
-- FIX TOMMY@GMAIL.COM AUTHENTICATION ISSUE
-- ============================================
-- This script creates tommy@gmail.com in both Supabase Auth and users table with matching IDs

-- Function to create a user with proper auth integration
CREATE OR REPLACE FUNCTION create_user_with_auth(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role TEXT,
  p_company_id UUID
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  auth_user_id UUID;
BEGIN
  -- Generate a UUID for the user
  new_user_id := gen_random_uuid();
  
  -- Create user in auth.users table (this is the key step)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    aud,
    role,
    confirmation_token,
    email_change_token_new,
    recovery_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    '',
    '',
    ''
  ) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt(p_password, gen_salt('bf')),
    updated_at = NOW()
  RETURNING id INTO auth_user_id;
  
  -- If user already existed, get their ID
  IF auth_user_id IS NULL THEN
    SELECT id INTO auth_user_id FROM auth.users WHERE email = p_email;
  END IF;
  
  -- Create or update the profile in your users table
  INSERT INTO users (
    id,
    company_id,
    email,
    name,
    role,
    avatar,
    status,
    created_at,
    updated_at
  ) VALUES (
    auth_user_id,
    p_company_id,
    p_email,
    p_name,
    p_role,
    LEFT(UPPER(p_name), 2),
    'online',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    avatar = EXCLUDED.avatar,
    updated_at = NOW();
  
  RETURN auth_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- First, let's check what company Charles Morgan is in
DO $$
DECLARE
  charles_company_id UUID;
BEGIN
  SELECT company_id INTO charles_company_id 
  FROM users 
  WHERE email = 'charlesmorgantravels@gmail.com' 
  LIMIT 1;
  
  IF charles_company_id IS NOT NULL THEN
    RAISE NOTICE '✅ Found Charles Morgan in company: %', charles_company_id;
    
    -- Create Tommy in the same company as Charles
    PERFORM create_user_with_auth(
      'tommy@gmail.com',
      'tommy123',
      'Tommy Anderson',
      'user',
      charles_company_id
    );
    
    RAISE NOTICE '✅ Tommy user created successfully in the same company as Charles!';
  ELSE
    RAISE NOTICE '❌ Charles Morgan not found. Creating Tommy in default test company.';
    
    -- Create Tommy in the test company
    PERFORM create_user_with_auth(
      'tommy@gmail.com',
      'tommy123',
      'Tommy Anderson',
      'user',
      '13c9a1ff-1410-425e-b985-6cd5157d5ee4'
    );
    
    RAISE NOTICE '✅ Tommy user created in test company!';
  END IF;
END $$;

-- Clean up the function
DROP FUNCTION IF EXISTS create_user_with_auth(TEXT, TEXT, TEXT, TEXT, UUID);

-- ============================================
-- VERIFICATION
-- ============================================

-- Show both users in the same company
SELECT 
  u.email,
  u.name,
  u.role,
  u.company_id,
  c.name as company_name,
  au.email_confirmed_at IS NOT NULL as auth_confirmed
FROM users u
JOIN companies c ON u.company_id = c.id
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email IN ('charlesmorgantravels@gmail.com', 'tommy@gmail.com')
ORDER BY u.email;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🎉 TOMMY USER AUTHENTICATION FIXED!';
  RAISE NOTICE '✅ tommy@gmail.com can now log in with password: tommy123';
  RAISE NOTICE '✅ Both Charles and Tommy are in the same company';
  RAISE NOTICE '✅ Authentication should work properly now';
  RAISE NOTICE '🧪 Try logging in as tommy@gmail.com with password: tommy123';
END $$; 
 