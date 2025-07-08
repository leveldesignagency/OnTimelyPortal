-- ============================================
-- FIX USER COMPANY_ID ISSUE
-- ============================================
-- This script updates the test user to use the correct company_id
-- instead of the old hardcoded value

-- First, let's see what companies exist
SELECT 'Current companies:' as info;
SELECT id, name, created_at FROM companies ORDER BY created_at;

-- Find the correct company_id for the new company
SELECT 'New company (most recent):' as info;
SELECT id, name, created_at 
FROM companies 
WHERE name != 'Test Company Ltd' 
ORDER BY created_at DESC 
LIMIT 1;

-- Update the test user to use the correct company_id
-- Replace 'NEW_COMPANY_ID_HERE' with the actual company_id from above query
UPDATE users 
SET company_id = (
  SELECT id 
  FROM companies 
  WHERE name != 'Test Company Ltd' 
  ORDER BY created_at DESC 
  LIMIT 1
),
updated_at = NOW()
WHERE email = 'admin@testcompany.com';

-- Verify the update
SELECT 'Updated user:' as info;
SELECT 
  u.email,
  u.name,
  u.company_id,
  c.name as company_name
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.email = 'admin@testcompany.com';

-- Also update any other test users that might have the old company_id
UPDATE users 
SET company_id = (
  SELECT id 
  FROM companies 
  WHERE name != 'Test Company Ltd' 
  ORDER BY created_at DESC 
  LIMIT 1
),
updated_at = NOW()
WHERE company_id = '11111111-1111-1111-1111-111111111111';

-- Verify all users are now using the correct company
SELECT 'All users with their companies:' as info;
SELECT 
  u.email,
  u.name,
  u.company_id,
  c.name as company_name
FROM users u
JOIN companies c ON u.company_id = c.id
ORDER BY u.email;

-- ============================================
-- MANUAL ALTERNATIVE (if the above doesn't work)
-- ============================================
-- If the automatic update doesn't work, you can manually update:

-- 1. First, get the correct company_id:
-- SELECT id, name FROM companies WHERE name != 'Test Company Ltd' ORDER BY created_at DESC LIMIT 1;

-- 2. Then manually update (replace 'ACTUAL_COMPANY_ID' with the real ID):
-- UPDATE users SET company_id = 'ACTUAL_COMPANY_ID' WHERE email = 'admin@testcompany.com';

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this script, the user should no longer show the old hardcoded company_id
-- in the console logs. The app should now use the correct company_id for all operations. 