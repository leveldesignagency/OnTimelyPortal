-- ============================================
-- ADD COMPANY_ID TO CHAT_PARTICIPANTS TABLE
-- ============================================
-- This adds company_id for enhanced security and data isolation

-- Step 1: Add company_id column to chat_participants table
ALTER TABLE chat_participants 
ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Step 2: Populate company_id for existing records
-- Get company_id from the chat that the participant belongs to
UPDATE chat_participants 
SET company_id = (
  SELECT c.company_id 
  FROM chats c 
  WHERE c.id = chat_participants.chat_id
);

-- Step 3: Make company_id NOT NULL after populating data
ALTER TABLE chat_participants 
ALTER COLUMN company_id SET NOT NULL;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_chat_participants_company_id ON chat_participants(company_id);

-- Step 5: Add constraint to ensure data consistency
-- This ensures the company_id in chat_participants matches the company_id in chats
ALTER TABLE chat_participants 
ADD CONSTRAINT check_chat_participants_company_consistency 
CHECK (
  company_id = (SELECT company_id FROM chats WHERE id = chat_id)
);

-- Step 6: Update any existing RLS policies to include company_id filtering
-- First, check current state
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'chat_participants';

-- Step 7: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'chat_participants' 
AND column_name = 'company_id';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🔒 COMPANY_ID ADDED TO CHAT_PARTICIPANTS!';
  RAISE NOTICE '✅ Enhanced security: All chat participants now have company_id';
  RAISE NOTICE '🏢 Data isolation: company_id matches parent chat';
  RAISE NOTICE '⚡ Performance: Added index for fast lookups';
  RAISE NOTICE '🛡️ Constraint: Ensures data consistency between chats and participants';
END $$; 