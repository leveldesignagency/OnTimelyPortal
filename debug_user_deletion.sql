-- ============================================
-- DEBUG USER DELETION ISSUE
-- ============================================
-- This script helps debug what's happening during user deletion

-- Step 1: Check current chat_participants
SELECT 
  cp.id,
  cp.chat_id,
  cp.user_id,
  c.name as chat_name,
  c.type as chat_type,
  c.created_by,
  u.name as user_name,
  u.email as user_email
FROM chat_participants cp
JOIN chats c ON cp.chat_id = c.id
JOIN users u ON cp.user_id = u.id
WHERE c.type = 'group'
ORDER BY c.name, u.name;

-- Step 2: Check if there are any triggers that might be re-adding users
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'chat_participants';

-- Step 3: Check if there are any stored procedures that might interfere
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%chat%' OR routine_name LIKE '%participant%';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🔍 DEBUGGING USER DELETION ISSUE';
  RAISE NOTICE '📋 Check the results above to see:';
  RAISE NOTICE '1️⃣ Current chat_participants state';
  RAISE NOTICE '2️⃣ Any triggers on chat_participants table';
  RAISE NOTICE '3️⃣ Any stored procedures that might interfere';
  RAISE NOTICE '🧪 Now try deleting a user and run this again!';
END $$; 
 
 
 