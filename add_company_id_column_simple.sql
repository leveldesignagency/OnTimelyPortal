-- ============================================
-- ADD COMPANY_ID COLUMN TO CHAT_PARTICIPANTS (SIMPLE VERSION)
-- ============================================
-- This adds company_id column without problematic CHECK constraints

-- Step 1: Add company_id column (nullable first)
ALTER TABLE chat_participants 
ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Step 2: Populate company_id for existing records
-- Get company_id from the associated chat
UPDATE chat_participants 
SET company_id = (
  SELECT c.company_id 
  FROM chats c 
  WHERE c.id = chat_participants.chat_id
);

-- Step 3: Make company_id NOT NULL (after populating)
ALTER TABLE chat_participants 
ALTER COLUMN company_id SET NOT NULL;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_chat_participants_company_id ON chat_participants(company_id);

-- Step 5: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'chat_participants' 
AND column_name = 'company_id';

-- Step 6: Check a few sample records
SELECT 
  id,
  chat_id,
  user_id,
  company_id
FROM chat_participants 
LIMIT 3;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ COMPANY_ID COLUMN ADDED SUCCESSFULLY!';
  RAISE NOTICE '🏢 All chat participants now have company_id';
  RAISE NOTICE '⚡ Index added for performance';
  RAISE NOTICE '🔧 Ready to create new chats!';
END $$; 