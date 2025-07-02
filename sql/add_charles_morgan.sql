-- Add Charles Morgan as a user
-- This script adds Charles Morgan to the system with proper authentication

-- Function to create Charles Morgan user
CREATE OR REPLACE FUNCTION create_charles_morgan(
  p_email TEXT DEFAULT 'charles@timely.com',
  p_password TEXT DEFAULT 'timelytest123',
  p_name TEXT DEFAULT 'Charles Morgan',
  p_role TEXT DEFAULT 'admin',
  p_company_id UUID DEFAULT (SELECT id FROM companies WHERE name = 'Timely' LIMIT 1)
)
RETURNS VOID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Generate a UUID for the user
  user_id := gen_random_uuid();
  
  -- Insert into auth.users table (Supabase authentication)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt(p_password, gen_salt('bf')),
    updated_at = NOW();
  
  -- Insert or update in users table (our custom table)
  INSERT INTO users (
    id,
    email,
    name,
    role,
    company_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    p_email,
    p_name,
    p_role,
    p_company_id,
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    name = p_name,
    role = p_role,
    company_id = p_company_id,
    updated_at = NOW();
  
  RAISE NOTICE 'Charles Morgan user created/updated successfully';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create Charles Morgan
SELECT create_charles_morgan();

-- Verify the user was created
SELECT 
  u.email,
  u.name,
  u.role,
  c.name as company_name,
  u.status,
  u.created_at
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email = 'charles@timely.com';

-- Clean up the function (optional)
DROP FUNCTION IF EXISTS create_charles_morgan; 
 
-- This script adds Charles Morgan to the system with proper authentication

-- Function to create Charles Morgan user
CREATE OR REPLACE FUNCTION create_charles_morgan(
  p_email TEXT DEFAULT 'charles@timely.com',
  p_password TEXT DEFAULT 'timelytest123',
  p_name TEXT DEFAULT 'Charles Morgan',
  p_role TEXT DEFAULT 'admin',
  p_company_id UUID DEFAULT (SELECT id FROM companies WHERE name = 'Timely' LIMIT 1)
)
RETURNS VOID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Generate a UUID for the user
  user_id := gen_random_uuid();
  
  -- Insert into auth.users table (Supabase authentication)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    user_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO UPDATE SET
    encrypted_password = crypt(p_password, gen_salt('bf')),
    updated_at = NOW();
  
  -- Insert or update in users table (our custom table)
  INSERT INTO users (
    id,
    email,
    name,
    role,
    company_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    p_email,
    p_name,
    p_role,
    p_company_id,
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    name = p_name,
    role = p_role,
    company_id = p_company_id,
    updated_at = NOW();
  
  RAISE NOTICE 'Charles Morgan user created/updated successfully';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create Charles Morgan
SELECT create_charles_morgan();

-- Verify the user was created
SELECT 
  u.email,
  u.name,
  u.role,
  c.name as company_name,
  u.status,
  u.created_at
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email = 'charles@timely.com';

-- Clean up the function (optional)
DROP FUNCTION IF EXISTS create_charles_morgan; 
 