-- ============================================
-- FIX PASSWORD HASHES FOR EXISTING USERS
-- ============================================
-- This script updates the dummy password hashes with real bcrypt hashes

-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the admin user password hash
UPDATE users 
SET password_hash = crypt('admin123', gen_salt('bf'))
WHERE email = 'admin@testcompany.com';

-- Update the regular user password hash  
UPDATE users 
SET password_hash = crypt('user123', gen_salt('bf'))
WHERE email = 'user@testcompany.com';

-- Verify the updates
SELECT 
  email, 
  name, 
  role,
  CASE 
    WHEN password_hash LIKE '$2b$%' THEN '✅ Valid bcrypt hash'
    ELSE '❌ Invalid hash: ' || password_hash
  END as password_status
FROM users 
WHERE email IN ('admin@testcompany.com', 'user@testcompany.com');

-- Test the login function with the updated hashes
SELECT 'Testing admin login...' as test;
SELECT * FROM login_user('admin@testcompany.com', 'admin123');

SELECT 'Testing user login...' as test;  
SELECT * FROM login_user('user@testcompany.com', 'user123');

/*
After running this script, you should be able to login with:

🔐 Admin User:
   Email: admin@testcompany.com
   Password: admin123
   Role: masterAdmin

🔐 Regular User:
   Email: user@testcompany.com
   Password: user123
   Role: user
*/ 