-- ============================================
-- FIX EVENTS TABLE - ADD MISSING COLUMN
-- ============================================
-- This adds the missing nameastitle column to the events table

-- Add the missing column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS nameastitle VARCHAR(255);

-- Update existing records to use the name field as nameastitle
UPDATE events 
SET nameastitle = name 
WHERE nameastitle IS NULL;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name = 'nameastitle';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ EVENTS TABLE FIXED!';
  RAISE NOTICE '📋 Added nameastitle column';
  RAISE NOTICE '🔄 Updated existing records';
  RAISE NOTICE '📱 Mobile app should now work!';
END $$; 