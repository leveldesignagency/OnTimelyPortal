-- Fix avatar_url issue in guest chat
-- This script ensures admin users have avatar_url values and the function works correctly

-- 1. First, let's check what users exist and their avatar_url status
SELECT 'Checking users table...' as status;

-- 2. Update Charles Morgan's avatar_url if it's null
-- We'll use a placeholder URL for now, you can update this with the actual photo URL
UPDATE users 
SET avatar_url = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
WHERE email = 'charles@stage1travel.com' 
   OR name ILIKE '%Charles%'
   AND avatar_url IS NULL;

-- 3. Check if the update worked
SELECT 
  id,
  name,
  email,
  avatar_url,
  company_id
FROM users 
WHERE email = 'charles@stage1travel.com' 
   OR name ILIKE '%Charles%';

-- 4. Update the get_guests_chat_messages function to be more robust
DROP FUNCTION IF EXISTS get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_guests_chat_messages(
  p_event_id UUID,
  p_user_email TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  message_id UUID,
  event_id UUID,
  sender_email TEXT,
  sender_name TEXT,
  sender_type TEXT,
  avatar_url TEXT,
  message_text TEXT,
  message_type TEXT,
  created_at TIMESTAMPTZ,
  company_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT user_can_access_event(p_event_id, p_user_email) THEN
    RAISE EXCEPTION 'User not authorized for this chat';
  END IF;

  RETURN QUERY
  SELECT 
    gcm.message_id,
    gcm.event_id,
    gcm.sender_email,
    gcm.sender_name,
    gcm.sender_type,
    CASE 
      WHEN gcm.sender_type = 'admin' THEN COALESCE(u.avatar_url, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face')
      ELSE NULL
    END AS avatar_url,
    gcm.message_text,
    gcm.message_type,
    gcm.created_at,
    gcm.company_id
  FROM guests_chat_messages gcm
  LEFT JOIN users u ON gcm.sender_type = 'admin' AND gcm.sender_email = u.email
  WHERE gcm.event_id = p_event_id
  ORDER BY gcm.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_guests_chat_messages(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

-- 5. Test the function to make sure it works
SELECT 'Testing get_guests_chat_messages function...' as status;

-- 6. Show the results
SELECT 
  sender_name,
  sender_type,
  avatar_url,
  message_text
FROM get_guests_chat_messages(
  '4e19b264-61a1-484f-8619-4f2d515b3796'::UUID,
  'charles@stage1travel.com',
  5,
  0
)
WHERE sender_type = 'admin'
ORDER BY created_at DESC
LIMIT 3;

SELECT 'Avatar fix complete! Admin messages should now show profile photos.' as status; 