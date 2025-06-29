-- ============================================
-- SIMPLE TEST USER CREATION FOR SUPABASE
-- ============================================
-- This approach uses Supabase's built-in functions to create users properly

-- Enable the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- First, create the company
INSERT INTO companies (id, name, subscription_plan, max_users, created_at, updated_at) 
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'Test Company Ltd', 
  'premium', 
  10,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ============================================
-- CREATE USERS WITH PROPER AUTH INTEGRATION
-- ============================================

-- Function to create a user with proper auth integration
CREATE OR REPLACE FUNCTION create_test_user(
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

-- Create the test users
SELECT create_test_user(
  'admin@testcompany.com',
  'admin123',
  'Admin User',
  'masterAdmin',
  '11111111-1111-1111-1111-111111111111'
) AS admin_user_id;

SELECT create_test_user(
  'user@testcompany.com',
  'user123',
  'Regular User',
  'user',
  '11111111-1111-1111-1111-111111111111'
) AS regular_user_id;

-- Create the sample team
INSERT INTO teams (
  id,
  company_id,
  name,
  description,
  avatar,
  created_by,
  created_at,
  updated_at
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'Project Alpha Team',
  'Team for Project Alpha development',
  'PA',
  (SELECT id FROM users WHERE email = 'admin@testcompany.com'),
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Add team members
INSERT INTO team_members (team_id, user_id, role, created_at)
SELECT 
  '55555555-5555-5555-5555-555555555555',
  u.id,
  CASE WHEN u.email = 'admin@testcompany.com' THEN 'admin' ELSE 'member' END,
  NOW()
FROM users u 
WHERE u.email IN ('admin@testcompany.com', 'user@testcompany.com')
ON CONFLICT (team_id, user_id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verify the setup
SELECT 
  'Setup Complete' as status,
  (SELECT COUNT(*) FROM companies WHERE id = '11111111-1111-1111-1111-111111111111') as companies_created,
  (SELECT COUNT(*) FROM users WHERE company_id = '11111111-1111-1111-1111-111111111111') as users_created,
  (SELECT COUNT(*) FROM auth.users WHERE email IN ('admin@testcompany.com', 'user@testcompany.com')) as auth_users_created,
  (SELECT COUNT(*) FROM teams WHERE company_id = '11111111-1111-1111-1111-111111111111') as teams_created,
  (SELECT COUNT(*) FROM team_members WHERE team_id = '55555555-5555-5555-5555-555555555555') as team_members_created;

-- Clean up the function
DROP FUNCTION IF EXISTS create_test_user(TEXT, TEXT, TEXT, TEXT, UUID);

-- ============================================
-- VERIFICATION AND TESTING
-- ============================================

-- Show created users
SELECT 
  u.email,
  u.name,
  u.role,
  c.name as company_name,
  au.email_confirmed_at IS NOT NULL as auth_confirmed
FROM users u
JOIN companies c ON u.company_id = c.id
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.company_id = '11111111-1111-1111-1111-111111111111';

-- Show team setup
SELECT 
  t.name as team_name,
  u.name as member_name,
  u.email,
  tm.role as team_role
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
JOIN users u ON tm.user_id = u.id
WHERE t.id = '55555555-5555-5555-5555-555555555555';

-- ============================================
-- LOGIN CREDENTIALS
-- ============================================

/*
You can now login with these credentials:

🔐 Admin User:
   Email: admin@testcompany.com
   Password: admin123
   Role: masterAdmin

🔐 Regular User:
   Email: user@testcompany.com
   Password: user123
   Role: user

Both users belong to "Test Company Ltd" and are members of "Project Alpha Team"
*/ 
-- SIMPLE TEST USER CREATION FOR SUPABASE
-- ============================================
-- This approach uses Supabase's built-in functions to create users properly

-- Enable the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- First, create the company
INSERT INTO companies (id, name, subscription_plan, max_users, created_at, updated_at) 
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'Test Company Ltd', 
  'premium', 
  10,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ============================================
-- CREATE USERS WITH PROPER AUTH INTEGRATION
-- ============================================

-- Function to create a user with proper auth integration
CREATE OR REPLACE FUNCTION create_test_user(
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

-- Create the test users
SELECT create_test_user(
  'admin@testcompany.com',
  'admin123',
  'Admin User',
  'masterAdmin',
  '11111111-1111-1111-1111-111111111111'
) AS admin_user_id;

SELECT create_test_user(
  'user@testcompany.com',
  'user123',
  'Regular User',
  'user',
  '11111111-1111-1111-1111-111111111111'
) AS regular_user_id;

-- Create the sample team
INSERT INTO teams (
  id,
  company_id,
  name,
  description,
  avatar,
  created_by,
  created_at,
  updated_at
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'Project Alpha Team',
  'Team for Project Alpha development',
  'PA',
  (SELECT id FROM users WHERE email = 'admin@testcompany.com'),
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Add team members
INSERT INTO team_members (team_id, user_id, role, created_at)
SELECT 
  '55555555-5555-5555-5555-555555555555',
  u.id,
  CASE WHEN u.email = 'admin@testcompany.com' THEN 'admin' ELSE 'member' END,
  NOW()
FROM users u 
WHERE u.email IN ('admin@testcompany.com', 'user@testcompany.com')
ON CONFLICT (team_id, user_id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verify the setup
SELECT 
  'Setup Complete' as status,
  (SELECT COUNT(*) FROM companies WHERE id = '11111111-1111-1111-1111-111111111111') as companies_created,
  (SELECT COUNT(*) FROM users WHERE company_id = '11111111-1111-1111-1111-111111111111') as users_created,
  (SELECT COUNT(*) FROM auth.users WHERE email IN ('admin@testcompany.com', 'user@testcompany.com')) as auth_users_created,
  (SELECT COUNT(*) FROM teams WHERE company_id = '11111111-1111-1111-1111-111111111111') as teams_created,
  (SELECT COUNT(*) FROM team_members WHERE team_id = '55555555-5555-5555-5555-555555555555') as team_members_created;

-- Clean up the function
DROP FUNCTION IF EXISTS create_test_user(TEXT, TEXT, TEXT, TEXT, UUID);

-- ============================================
-- VERIFICATION AND TESTING
-- ============================================

-- Show created users
SELECT 
  u.email,
  u.name,
  u.role,
  c.name as company_name,
  au.email_confirmed_at IS NOT NULL as auth_confirmed
FROM users u
JOIN companies c ON u.company_id = c.id
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.company_id = '11111111-1111-1111-1111-111111111111';

-- Show team setup
SELECT 
  t.name as team_name,
  u.name as member_name,
  u.email,
  tm.role as team_role
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
JOIN users u ON tm.user_id = u.id
WHERE t.id = '55555555-5555-5555-5555-555555555555';

-- ============================================
-- LOGIN CREDENTIALS
-- ============================================

/*
You can now login with these credentials:

🔐 Admin User:
   Email: admin@testcompany.com
   Password: admin123
   Role: masterAdmin

🔐 Regular User:
   Email: user@testcompany.com
   Password: user123
   Role: user

Both users belong to "Test Company Ltd" and are members of "Project Alpha Team"
*/ 
 
-- SIMPLE TEST USER CREATION FOR SUPABASE
-- ============================================
-- This approach uses Supabase's built-in functions to create users properly

-- Enable the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- First, create the company
INSERT INTO companies (id, name, subscription_plan, max_users, created_at, updated_at) 
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'Test Company Ltd', 
  'premium', 
  10,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ============================================
-- CREATE USERS WITH PROPER AUTH INTEGRATION
-- ============================================

-- Function to create a user with proper auth integration
CREATE OR REPLACE FUNCTION create_test_user(
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

-- Create the test users
SELECT create_test_user(
  'admin@testcompany.com',
  'admin123',
  'Admin User',
  'masterAdmin',
  '11111111-1111-1111-1111-111111111111'
) AS admin_user_id;

SELECT create_test_user(
  'user@testcompany.com',
  'user123',
  'Regular User',
  'user',
  '11111111-1111-1111-1111-111111111111'
) AS regular_user_id;

-- Create the sample team
INSERT INTO teams (
  id,
  company_id,
  name,
  description,
  avatar,
  created_by,
  created_at,
  updated_at
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'Project Alpha Team',
  'Team for Project Alpha development',
  'PA',
  (SELECT id FROM users WHERE email = 'admin@testcompany.com'),
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Add team members
INSERT INTO team_members (team_id, user_id, role, created_at)
SELECT 
  '55555555-5555-5555-5555-555555555555',
  u.id,
  CASE WHEN u.email = 'admin@testcompany.com' THEN 'admin' ELSE 'member' END,
  NOW()
FROM users u 
WHERE u.email IN ('admin@testcompany.com', 'user@testcompany.com')
ON CONFLICT (team_id, user_id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verify the setup
SELECT 
  'Setup Complete' as status,
  (SELECT COUNT(*) FROM companies WHERE id = '11111111-1111-1111-1111-111111111111') as companies_created,
  (SELECT COUNT(*) FROM users WHERE company_id = '11111111-1111-1111-1111-111111111111') as users_created,
  (SELECT COUNT(*) FROM auth.users WHERE email IN ('admin@testcompany.com', 'user@testcompany.com')) as auth_users_created,
  (SELECT COUNT(*) FROM teams WHERE company_id = '11111111-1111-1111-1111-111111111111') as teams_created,
  (SELECT COUNT(*) FROM team_members WHERE team_id = '55555555-5555-5555-5555-555555555555') as team_members_created;

-- Clean up the function
DROP FUNCTION IF EXISTS create_test_user(TEXT, TEXT, TEXT, TEXT, UUID);

-- ============================================
-- VERIFICATION AND TESTING
-- ============================================

-- Show created users
SELECT 
  u.email,
  u.name,
  u.role,
  c.name as company_name,
  au.email_confirmed_at IS NOT NULL as auth_confirmed
FROM users u
JOIN companies c ON u.company_id = c.id
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.company_id = '11111111-1111-1111-1111-111111111111';

-- Show team setup
SELECT 
  t.name as team_name,
  u.name as member_name,
  u.email,
  tm.role as team_role
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
JOIN users u ON tm.user_id = u.id
WHERE t.id = '55555555-5555-5555-5555-555555555555';

-- ============================================
-- LOGIN CREDENTIALS
-- ============================================

/*
You can now login with these credentials:

🔐 Admin User:
   Email: admin@testcompany.com
   Password: admin123
   Role: masterAdmin

🔐 Regular User:
   Email: user@testcompany.com
   Password: user123
   Role: user

Both users belong to "Test Company Ltd" and are members of "Project Alpha Team"
*/ 
-- SIMPLE TEST USER CREATION FOR SUPABASE
-- ============================================
-- This approach uses Supabase's built-in functions to create users properly

-- Enable the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- First, create the company
INSERT INTO companies (id, name, subscription_plan, max_users, created_at, updated_at) 
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'Test Company Ltd', 
  'premium', 
  10,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ============================================
-- CREATE USERS WITH PROPER AUTH INTEGRATION
-- ============================================

-- Function to create a user with proper auth integration
CREATE OR REPLACE FUNCTION create_test_user(
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

-- Create the test users
SELECT create_test_user(
  'admin@testcompany.com',
  'admin123',
  'Admin User',
  'masterAdmin',
  '11111111-1111-1111-1111-111111111111'
) AS admin_user_id;

SELECT create_test_user(
  'user@testcompany.com',
  'user123',
  'Regular User',
  'user',
  '11111111-1111-1111-1111-111111111111'
) AS regular_user_id;

-- Create the sample team
INSERT INTO teams (
  id,
  company_id,
  name,
  description,
  avatar,
  created_by,
  created_at,
  updated_at
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'Project Alpha Team',
  'Team for Project Alpha development',
  'PA',
  (SELECT id FROM users WHERE email = 'admin@testcompany.com'),
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Add team members
INSERT INTO team_members (team_id, user_id, role, created_at)
SELECT 
  '55555555-5555-5555-5555-555555555555',
  u.id,
  CASE WHEN u.email = 'admin@testcompany.com' THEN 'admin' ELSE 'member' END,
  NOW()
FROM users u 
WHERE u.email IN ('admin@testcompany.com', 'user@testcompany.com')
ON CONFLICT (team_id, user_id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verify the setup
SELECT 
  'Setup Complete' as status,
  (SELECT COUNT(*) FROM companies WHERE id = '11111111-1111-1111-1111-111111111111') as companies_created,
  (SELECT COUNT(*) FROM users WHERE company_id = '11111111-1111-1111-1111-111111111111') as users_created,
  (SELECT COUNT(*) FROM auth.users WHERE email IN ('admin@testcompany.com', 'user@testcompany.com')) as auth_users_created,
  (SELECT COUNT(*) FROM teams WHERE company_id = '11111111-1111-1111-1111-111111111111') as teams_created,
  (SELECT COUNT(*) FROM team_members WHERE team_id = '55555555-5555-5555-5555-555555555555') as team_members_created;

-- Clean up the function
DROP FUNCTION IF EXISTS create_test_user(TEXT, TEXT, TEXT, TEXT, UUID);

-- ============================================
-- VERIFICATION AND TESTING
-- ============================================

-- Show created users
SELECT 
  u.email,
  u.name,
  u.role,
  c.name as company_name,
  au.email_confirmed_at IS NOT NULL as auth_confirmed
FROM users u
JOIN companies c ON u.company_id = c.id
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.company_id = '11111111-1111-1111-1111-111111111111';

-- Show team setup
SELECT 
  t.name as team_name,
  u.name as member_name,
  u.email,
  tm.role as team_role
FROM teams t
JOIN team_members tm ON t.id = tm.team_id
JOIN users u ON tm.user_id = u.id
WHERE t.id = '55555555-5555-5555-5555-555555555555';

-- ============================================
-- LOGIN CREDENTIALS
-- ============================================

/*
You can now login with these credentials:

🔐 Admin User:
   Email: admin@testcompany.com
   Password: admin123
   Role: masterAdmin

🔐 Regular User:
   Email: user@testcompany.com
   Password: user123
   Role: user

Both users belong to "Test Company Ltd" and are members of "Project Alpha Team"
*/ 