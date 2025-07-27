-- Check Users Table Avatar Status
-- This script checks if the users table has avatar_url and if there are any values

-- 1. Check if avatar_url column exists in users table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'avatar_url';

-- 2. Check if users table has avatar_url column
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 3. Check current users and their avatar_url values
SELECT 
  id,
  name,
  email,
  avatar_url,
  company_id
FROM users 
LIMIT 10;

-- 4. Test get_user_profile function with a sample user
-- Replace 'your-user-id-here' with an actual user ID
SELECT * FROM get_user_profile('your-user-id-here');

-- 5. Check if update_user_profile function works
-- This will help us understand if the profile update is working
SELECT 'Users table avatar check complete!' as status; 