-- ============================================
-- SETUP TEST USERS IN SUPABASE AUTH
-- ============================================
-- This script creates test users in Supabase's auth system
-- and links them to your custom users table

-- First, clear any existing test data
DELETE FROM team_members WHERE team_id = '55555555-5555-5555-5555-555555555555';
DELETE FROM teams WHERE id = '55555555-5555-5555-5555-555555555555';
DELETE FROM users WHERE email IN ('admin@testcompany.com', 'user@testcompany.com');
DELETE FROM companies WHERE id = '11111111-1111-1111-1111-111111111111';

-- Create test company
INSERT INTO companies (id, name, subscription_plan, max_users, created_at, updated_at) 
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'Test Company Ltd', 
  'premium', 
  10,
  NOW(),
  NOW()
);

-- ============================================
-- CREATE USERS IN SUPABASE AUTH
-- ============================================
-- These need to be created through Supabase Auth, not direct SQL
-- You'll need to run these commands in your Supabase dashboard or via API

-- IMPORTANT: Execute these in your Supabase SQL Editor or Auth Dashboard:

-- 1. Create Admin User in Auth
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token,
  aud,
  role
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'admin@testcompany.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  'authenticated',
  'authenticated'
);

-- 2. Create Regular User in Auth  
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token,
  aud,
  role
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'user@testcompany.com',
  crypt('user123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  'authenticated',
  'authenticated'
);

-- ============================================
-- CREATE CORRESPONDING PROFILE RECORDS
-- ============================================
-- Now create the profile records in your custom users table

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
) VALUES 
(
  '22222222-2222-2222-2222-222222222222', 
  '11111111-1111-1111-1111-111111111111', 
  'admin@testcompany.com', 
  'Admin User', 
  'masterAdmin', 
  'AU', 
  'online',
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333333', 
  '11111111-1111-1111-1111-111111111111', 
  'user@testcompany.com', 
  'Regular User', 
  'user', 
  'RU', 
  'online',
  NOW(),
  NOW()
);

-- ============================================
-- CREATE SAMPLE TEAM AND MEMBERSHIPS
-- ============================================

-- Insert a sample team
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
  '22222222-2222-2222-2222-222222222222',
  NOW(),
  NOW()
);

-- Add both users to the sample team
INSERT INTO team_members (team_id, user_id, role, created_at) VALUES 
('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'admin', NOW()),
('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'member', NOW());

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the setup
SELECT 'Companies' as table_name, COUNT(*) as count FROM companies WHERE id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'Users' as table_name, COUNT(*) as count FROM users WHERE company_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'Teams' as table_name, COUNT(*) as count FROM teams WHERE company_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'Team Members' as table_name, COUNT(*) as count FROM team_members WHERE team_id = '55555555-5555-5555-5555-555555555555';

-- ============================================
-- MANUAL ALTERNATIVE (RECOMMENDED)
-- ============================================

/*
If the above auth.users inserts don't work, you can create users manually:

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add User" and create:
   - Email: admin@testcompany.com
   - Password: admin123
   - Confirm the user immediately
   
4. Repeat for:
   - Email: user@testcompany.com  
   - Password: user123
   - Confirm the user immediately

5. Then run just the profile creation part:
*/

-- Alternative: Create profiles only (run after manual user creation)
-- INSERT INTO users (company_id, email, name, role, avatar, status) VALUES 
-- ((SELECT company_id FROM companies WHERE name = 'Test Company Ltd'), 'admin@testcompany.com', 'Admin User', 'masterAdmin', 'AU', 'online'),
-- ((SELECT company_id FROM companies WHERE name = 'Test Company Ltd'), 'user@testcompany.com', 'Regular User', 'user', 'RU', 'online');

-- ============================================
-- TEST CREDENTIALS SUMMARY
-- ============================================

/*
After running this script, you can login with:

Admin User:
- Email: admin@testcompany.com
- Password: admin123
- Role: masterAdmin

Regular User:
- Email: user@testcompany.com
- Password: user123  
- Role: user

Both users belong to "Test Company Ltd"
*/ 
-- SETUP TEST USERS IN SUPABASE AUTH
-- ============================================
-- This script creates test users in Supabase's auth system
-- and links them to your custom users table

-- First, clear any existing test data
DELETE FROM team_members WHERE team_id = '55555555-5555-5555-5555-555555555555';
DELETE FROM teams WHERE id = '55555555-5555-5555-5555-555555555555';
DELETE FROM users WHERE email IN ('admin@testcompany.com', 'user@testcompany.com');
DELETE FROM companies WHERE id = '11111111-1111-1111-1111-111111111111';

-- Create test company
INSERT INTO companies (id, name, subscription_plan, max_users, created_at, updated_at) 
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'Test Company Ltd', 
  'premium', 
  10,
  NOW(),
  NOW()
);

-- ============================================
-- CREATE USERS IN SUPABASE AUTH
-- ============================================
-- These need to be created through Supabase Auth, not direct SQL
-- You'll need to run these commands in your Supabase dashboard or via API

-- IMPORTANT: Execute these in your Supabase SQL Editor or Auth Dashboard:

-- 1. Create Admin User in Auth
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token,
  aud,
  role
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'admin@testcompany.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  'authenticated',
  'authenticated'
);

-- 2. Create Regular User in Auth  
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token,
  aud,
  role
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'user@testcompany.com',
  crypt('user123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  'authenticated',
  'authenticated'
);

-- ============================================
-- CREATE CORRESPONDING PROFILE RECORDS
-- ============================================
-- Now create the profile records in your custom users table

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
) VALUES 
(
  '22222222-2222-2222-2222-222222222222', 
  '11111111-1111-1111-1111-111111111111', 
  'admin@testcompany.com', 
  'Admin User', 
  'masterAdmin', 
  'AU', 
  'online',
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333333', 
  '11111111-1111-1111-1111-111111111111', 
  'user@testcompany.com', 
  'Regular User', 
  'user', 
  'RU', 
  'online',
  NOW(),
  NOW()
);

-- ============================================
-- CREATE SAMPLE TEAM AND MEMBERSHIPS
-- ============================================

-- Insert a sample team
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
  '22222222-2222-2222-2222-222222222222',
  NOW(),
  NOW()
);

-- Add both users to the sample team
INSERT INTO team_members (team_id, user_id, role, created_at) VALUES 
('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'admin', NOW()),
('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'member', NOW());

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the setup
SELECT 'Companies' as table_name, COUNT(*) as count FROM companies WHERE id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'Users' as table_name, COUNT(*) as count FROM users WHERE company_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'Teams' as table_name, COUNT(*) as count FROM teams WHERE company_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'Team Members' as table_name, COUNT(*) as count FROM team_members WHERE team_id = '55555555-5555-5555-5555-555555555555';

-- ============================================
-- MANUAL ALTERNATIVE (RECOMMENDED)
-- ============================================

/*
If the above auth.users inserts don't work, you can create users manually:

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add User" and create:
   - Email: admin@testcompany.com
   - Password: admin123
   - Confirm the user immediately
   
4. Repeat for:
   - Email: user@testcompany.com  
   - Password: user123
   - Confirm the user immediately

5. Then run just the profile creation part:
*/

-- Alternative: Create profiles only (run after manual user creation)
-- INSERT INTO users (company_id, email, name, role, avatar, status) VALUES 
-- ((SELECT company_id FROM companies WHERE name = 'Test Company Ltd'), 'admin@testcompany.com', 'Admin User', 'masterAdmin', 'AU', 'online'),
-- ((SELECT company_id FROM companies WHERE name = 'Test Company Ltd'), 'user@testcompany.com', 'Regular User', 'user', 'RU', 'online');

-- ============================================
-- TEST CREDENTIALS SUMMARY
-- ============================================

/*
After running this script, you can login with:

Admin User:
- Email: admin@testcompany.com
- Password: admin123
- Role: masterAdmin

Regular User:
- Email: user@testcompany.com
- Password: user123  
- Role: user

Both users belong to "Test Company Ltd"
*/ 
 
-- SETUP TEST USERS IN SUPABASE AUTH
-- ============================================
-- This script creates test users in Supabase's auth system
-- and links them to your custom users table

-- First, clear any existing test data
DELETE FROM team_members WHERE team_id = '55555555-5555-5555-5555-555555555555';
DELETE FROM teams WHERE id = '55555555-5555-5555-5555-555555555555';
DELETE FROM users WHERE email IN ('admin@testcompany.com', 'user@testcompany.com');
DELETE FROM companies WHERE id = '11111111-1111-1111-1111-111111111111';

-- Create test company
INSERT INTO companies (id, name, subscription_plan, max_users, created_at, updated_at) 
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'Test Company Ltd', 
  'premium', 
  10,
  NOW(),
  NOW()
);

-- ============================================
-- CREATE USERS IN SUPABASE AUTH
-- ============================================
-- These need to be created through Supabase Auth, not direct SQL
-- You'll need to run these commands in your Supabase dashboard or via API

-- IMPORTANT: Execute these in your Supabase SQL Editor or Auth Dashboard:

-- 1. Create Admin User in Auth
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token,
  aud,
  role
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'admin@testcompany.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  'authenticated',
  'authenticated'
);

-- 2. Create Regular User in Auth  
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token,
  aud,
  role
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'user@testcompany.com',
  crypt('user123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  'authenticated',
  'authenticated'
);

-- ============================================
-- CREATE CORRESPONDING PROFILE RECORDS
-- ============================================
-- Now create the profile records in your custom users table

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
) VALUES 
(
  '22222222-2222-2222-2222-222222222222', 
  '11111111-1111-1111-1111-111111111111', 
  'admin@testcompany.com', 
  'Admin User', 
  'masterAdmin', 
  'AU', 
  'online',
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333333', 
  '11111111-1111-1111-1111-111111111111', 
  'user@testcompany.com', 
  'Regular User', 
  'user', 
  'RU', 
  'online',
  NOW(),
  NOW()
);

-- ============================================
-- CREATE SAMPLE TEAM AND MEMBERSHIPS
-- ============================================

-- Insert a sample team
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
  '22222222-2222-2222-2222-222222222222',
  NOW(),
  NOW()
);

-- Add both users to the sample team
INSERT INTO team_members (team_id, user_id, role, created_at) VALUES 
('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'admin', NOW()),
('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'member', NOW());

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the setup
SELECT 'Companies' as table_name, COUNT(*) as count FROM companies WHERE id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'Users' as table_name, COUNT(*) as count FROM users WHERE company_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'Teams' as table_name, COUNT(*) as count FROM teams WHERE company_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'Team Members' as table_name, COUNT(*) as count FROM team_members WHERE team_id = '55555555-5555-5555-5555-555555555555';

-- ============================================
-- MANUAL ALTERNATIVE (RECOMMENDED)
-- ============================================

/*
If the above auth.users inserts don't work, you can create users manually:

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add User" and create:
   - Email: admin@testcompany.com
   - Password: admin123
   - Confirm the user immediately
   
4. Repeat for:
   - Email: user@testcompany.com  
   - Password: user123
   - Confirm the user immediately

5. Then run just the profile creation part:
*/

-- Alternative: Create profiles only (run after manual user creation)
-- INSERT INTO users (company_id, email, name, role, avatar, status) VALUES 
-- ((SELECT company_id FROM companies WHERE name = 'Test Company Ltd'), 'admin@testcompany.com', 'Admin User', 'masterAdmin', 'AU', 'online'),
-- ((SELECT company_id FROM companies WHERE name = 'Test Company Ltd'), 'user@testcompany.com', 'Regular User', 'user', 'RU', 'online');

-- ============================================
-- TEST CREDENTIALS SUMMARY
-- ============================================

/*
After running this script, you can login with:

Admin User:
- Email: admin@testcompany.com
- Password: admin123
- Role: masterAdmin

Regular User:
- Email: user@testcompany.com
- Password: user123  
- Role: user

Both users belong to "Test Company Ltd"
*/ 
-- SETUP TEST USERS IN SUPABASE AUTH
-- ============================================
-- This script creates test users in Supabase's auth system
-- and links them to your custom users table

-- First, clear any existing test data
DELETE FROM team_members WHERE team_id = '55555555-5555-5555-5555-555555555555';
DELETE FROM teams WHERE id = '55555555-5555-5555-5555-555555555555';
DELETE FROM users WHERE email IN ('admin@testcompany.com', 'user@testcompany.com');
DELETE FROM companies WHERE id = '11111111-1111-1111-1111-111111111111';

-- Create test company
INSERT INTO companies (id, name, subscription_plan, max_users, created_at, updated_at) 
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'Test Company Ltd', 
  'premium', 
  10,
  NOW(),
  NOW()
);

-- ============================================
-- CREATE USERS IN SUPABASE AUTH
-- ============================================
-- These need to be created through Supabase Auth, not direct SQL
-- You'll need to run these commands in your Supabase dashboard or via API

-- IMPORTANT: Execute these in your Supabase SQL Editor or Auth Dashboard:

-- 1. Create Admin User in Auth
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token,
  aud,
  role
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'admin@testcompany.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  'authenticated',
  'authenticated'
);

-- 2. Create Regular User in Auth  
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_new,
  recovery_token,
  aud,
  role
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'user@testcompany.com',
  crypt('user123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  'authenticated',
  'authenticated'
);

-- ============================================
-- CREATE CORRESPONDING PROFILE RECORDS
-- ============================================
-- Now create the profile records in your custom users table

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
) VALUES 
(
  '22222222-2222-2222-2222-222222222222', 
  '11111111-1111-1111-1111-111111111111', 
  'admin@testcompany.com', 
  'Admin User', 
  'masterAdmin', 
  'AU', 
  'online',
  NOW(),
  NOW()
),
(
  '33333333-3333-3333-3333-333333333333', 
  '11111111-1111-1111-1111-111111111111', 
  'user@testcompany.com', 
  'Regular User', 
  'user', 
  'RU', 
  'online',
  NOW(),
  NOW()
);

-- ============================================
-- CREATE SAMPLE TEAM AND MEMBERSHIPS
-- ============================================

-- Insert a sample team
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
  '22222222-2222-2222-2222-222222222222',
  NOW(),
  NOW()
);

-- Add both users to the sample team
INSERT INTO team_members (team_id, user_id, role, created_at) VALUES 
('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'admin', NOW()),
('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'member', NOW());

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the setup
SELECT 'Companies' as table_name, COUNT(*) as count FROM companies WHERE id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'Users' as table_name, COUNT(*) as count FROM users WHERE company_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'Teams' as table_name, COUNT(*) as count FROM teams WHERE company_id = '11111111-1111-1111-1111-111111111111'
UNION ALL
SELECT 'Team Members' as table_name, COUNT(*) as count FROM team_members WHERE team_id = '55555555-5555-5555-5555-555555555555';

-- ============================================
-- MANUAL ALTERNATIVE (RECOMMENDED)
-- ============================================

/*
If the above auth.users inserts don't work, you can create users manually:

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Click "Add User" and create:
   - Email: admin@testcompany.com
   - Password: admin123
   - Confirm the user immediately
   
4. Repeat for:
   - Email: user@testcompany.com  
   - Password: user123
   - Confirm the user immediately

5. Then run just the profile creation part:
*/

-- Alternative: Create profiles only (run after manual user creation)
-- INSERT INTO users (company_id, email, name, role, avatar, status) VALUES 
-- ((SELECT company_id FROM companies WHERE name = 'Test Company Ltd'), 'admin@testcompany.com', 'Admin User', 'masterAdmin', 'AU', 'online'),
-- ((SELECT company_id FROM companies WHERE name = 'Test Company Ltd'), 'user@testcompany.com', 'Regular User', 'user', 'RU', 'online');

-- ============================================
-- TEST CREDENTIALS SUMMARY
-- ============================================

/*
After running this script, you can login with:

Admin User:
- Email: admin@testcompany.com
- Password: admin123
- Role: masterAdmin

Regular User:
- Email: user@testcompany.com
- Password: user123  
- Role: user

Both users belong to "Test Company Ltd"
*/ 