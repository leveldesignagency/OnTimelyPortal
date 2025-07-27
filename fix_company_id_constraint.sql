-- ============================================
-- FIX COMPANY_ID CONSTRAINT ERROR
-- ============================================
-- This fixes the subquery error in check constraint

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

-- Step 5: Create a trigger function to ensure data consistency
-- This replaces the problematic CHECK constraint
CREATE OR REPLACE FUNCTION check_chat_participant_company_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id != (SELECT company_id FROM chats WHERE id = NEW.chat_id) THEN
    RAISE EXCEPTION 'chat_participants.company_id must match the company_id of the associated chat';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create the trigger
DROP TRIGGER IF EXISTS trigger_check_chat_participant_company_consistency ON chat_participants;
CREATE TRIGGER trigger_check_chat_participant_company_consistency
  BEFORE INSERT OR UPDATE ON chat_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_chat_participant_company_consistency();

-- Step 7: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'chat_participants' 
AND column_name = 'company_id';

-- Step 8: Check if trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'chat_participants'
AND trigger_name = 'trigger_check_chat_participant_company_consistency';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🔒 COMPANY_ID ADDED TO CHAT_PARTICIPANTS (FIXED)!';
  RAISE NOTICE '✅ Enhanced security: All chat participants now have company_id';
  RAISE NOTICE '🏢 Data isolation: company_id matches parent chat';
  RAISE NOTICE '⚡ Performance: Added index for fast lookups';
  RAISE NOTICE '🛡️ Trigger: Ensures data consistency between chats and participants';
  RAISE NOTICE '🔧 Fixed: Removed problematic CHECK constraint, using trigger instead';
END $$; 
 
 
 