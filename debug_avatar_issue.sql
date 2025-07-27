-- Debug avatar issue in guest chat
-- Check what's in the users table for Charles Morgan

-- 1. Check if Charles Morgan exists in users table
SELECT 
  id,
  name,
  email,
  avatar_url,
  company_id,
  created_at
FROM users 
WHERE email = 'charles@stage1travel.com' 
   OR name ILIKE '%Charles%'
   OR name ILIKE '%Morgan%';

-- 2. Check all users with avatar_url values
SELECT 
  id,
  name,
  email,
  avatar_url,
  company_id
FROM users 
WHERE avatar_url IS NOT NULL
ORDER BY created_at DESC;

-- 3. Check the specific chat messages for Charles Morgan
SELECT 
  message_id,
  sender_email,
  sender_name,
  sender_type,
  created_at
FROM guests_chat_messages 
WHERE sender_email = 'charles@stage1travel.com'
   OR sender_name ILIKE '%Charles%'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Test the JOIN manually
SELECT 
  gcm.message_id,
  gcm.sender_email,
  gcm.sender_name,
  gcm.sender_type,
  u.avatar_url,
  u.name as user_name,
  u.email as user_email
FROM guests_chat_messages gcm
LEFT JOIN users u ON gcm.sender_type = 'admin' AND gcm.sender_email = u.email
WHERE gcm.sender_type = 'admin'
  AND (gcm.sender_email = 'charles@stage1travel.com' OR gcm.sender_name ILIKE '%Charles%')
ORDER BY gcm.created_at DESC
LIMIT 5;

-- 5. Check if there are any users with avatar_url at all
SELECT COUNT(*) as total_users,
       COUNT(avatar_url) as users_with_avatar,
       COUNT(*) - COUNT(avatar_url) as users_without_avatar
FROM users; 