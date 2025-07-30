-- ============================================
-- ADD ARCHIVE AND DELETE FUNCTIONALITY TO CHAT_PARTICIPANTS
-- ============================================
-- This adds user-specific archive and delete functionality to chat_participants table

-- Step 1: Add archive and delete columns to chat_participants table
ALTER TABLE chat_participants 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

ALTER TABLE chat_participants 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE chat_participants 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE chat_participants 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_participants_archived ON chat_participants(is_archived) WHERE is_archived = true;
CREATE INDEX IF NOT EXISTS idx_chat_participants_deleted ON chat_participants(is_deleted) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_archived ON chat_participants(user_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_deleted ON chat_participants(user_id, is_deleted);

-- Step 3: Create functions for archive and delete operations
CREATE OR REPLACE FUNCTION archive_chat_for_user(
    p_chat_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE chat_participants 
    SET is_archived = true, archived_at = NOW()
    WHERE chat_id = p_chat_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION delete_chat_for_user(
    p_chat_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE chat_participants 
    SET is_deleted = true, deleted_at = NOW()
    WHERE chat_id = p_chat_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION unarchive_chat_for_user(
    p_chat_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE chat_participants 
    SET is_archived = false, archived_at = NULL
    WHERE chat_id = p_chat_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION restore_chat_for_user(
    p_chat_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE chat_participants 
    SET is_deleted = false, deleted_at = NULL
    WHERE chat_id = p_chat_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- Step 4: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'chat_participants' 
AND column_name IN ('is_archived', 'is_deleted', 'archived_at', 'deleted_at')
ORDER BY column_name;

-- Step 5: Check if functions were created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name IN ('archive_chat_for_user', 'delete_chat_for_user', 'unarchive_chat_for_user', 'restore_chat_for_user')
ORDER BY routine_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ CHAT ARCHIVE/DELETE FUNCTIONALITY ADDED!';
  RAISE NOTICE '📋 New columns: is_archived, is_deleted, archived_at, deleted_at';
  RAISE NOTICE '⚡ Performance indexes added';
  RAISE NOTICE '🔧 Functions created for archive/delete operations';
  RAISE NOTICE '📱 Ready for swipe functionality in ChatListPage!';
END $$; 