-- Check Users Table Structure
-- This script checks the exact column names in the users table

-- 1. Check all columns in users table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. Check if there are any avatar-related columns
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE '%avatar%';

-- 3. Check a sample user record to see what avatar data exists
SELECT 
  id,
  name,
  email,
  avatar_url,
  -- Check if there are other avatar-related columns
  (SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE '%avatar%' LIMIT 1) as avatar_columns
FROM users 
LIMIT 5; 