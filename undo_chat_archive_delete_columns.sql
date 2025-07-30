-- ============================================
-- UNDO CHAT ARCHIVE/DELETE FUNCTIONALITY FROM CHAT_PARTICIPANTS
-- ============================================
-- This removes the user-specific archive and delete functionality from chat_participants table

-- Step 1: Drop the functions we created
DROP FUNCTION IF EXISTS archive_chat_for_user(UUID, UUID);
DROP FUNCTION IF EXISTS delete_chat_for_user(UUID, UUID);
DROP FUNCTION IF EXISTS unarchive_chat_for_user(UUID, UUID);
DROP FUNCTION IF EXISTS restore_chat_for_user(UUID, UUID);

-- Step 2: Drop the indexes we created
DROP INDEX IF EXISTS idx_chat_participants_archived;
DROP INDEX IF EXISTS idx_chat_participants_deleted;
DROP INDEX IF EXISTS idx_chat_participants_user_archived;
DROP INDEX IF EXISTS idx_chat_participants_user_deleted;

-- Step 3: Remove the columns we added
ALTER TABLE chat_participants 
DROP COLUMN IF EXISTS is_archived;

ALTER TABLE chat_participants 
DROP COLUMN IF EXISTS is_deleted;

ALTER TABLE chat_participants 
DROP COLUMN IF EXISTS archived_at;

ALTER TABLE chat_participants 
DROP COLUMN IF EXISTS deleted_at;

-- Step 4: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'chat_participants' 
ORDER BY column_name;

-- Step 5: Check that functions were removed
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name IN ('archive_chat_for_user', 'delete_chat_for_user', 'unarchive_chat_for_user', 'restore_chat_for_user')
ORDER BY routine_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ CHAT ARCHIVE/DELETE FUNCTIONALITY REMOVED!';
  RAISE NOTICE '📋 Removed columns: is_archived, is_deleted, archived_at, deleted_at';
  RAISE NOTICE '⚡ Removed performance indexes';
  RAISE NOTICE '🔧 Removed archive/delete functions';
  RAISE NOTICE '📱 Ready to use desktop app approach!';
END $$; 