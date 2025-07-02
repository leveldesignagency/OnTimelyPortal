-- ============================================
-- ADD CHARLES MORGAN TO SUPABASE
-- ============================================
-- Run this in your Supabase SQL editor to add Charles Morgan

-- Function to create a user with proper auth integration
CREATE OR REPLACE FUNCTION create_charles_morgan(
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
  new_user_id := uuid_generate_v4();
  
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

-- Create Charles Morgan
SELECT create_charles_morgan(
  'charles.morgan@testcompany.com',
  'charles123',
  'Charles Morgan',
  'masterAdmin',
  '11111111-1111-1111-1111-111111111111'
) AS charles_user_id;

-- Clean up the function
DROP FUNCTION IF EXISTS create_charles_morgan(TEXT, TEXT, TEXT, TEXT, UUID);

-- ============================================
-- VERIFICATION
-- ============================================

-- Show Charles Morgan's account
SELECT 
  u.email,
  u.name,
  u.role,
  c.name as company_name,
  au.email_confirmed_at IS NOT NULL as auth_confirmed
FROM users u
JOIN companies c ON u.company_id = c.id
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'charles.morgan@testcompany.com';

-- ============================================
-- LOGIN CREDENTIALS FOR CHARLES MORGAN
-- ============================================

/*
🔐 Charles Morgan Login:
   Email: charles.morgan@testcompany.com
   Password: charles123
   Role: masterAdmin
   Company: Test Company Ltd
*/ 