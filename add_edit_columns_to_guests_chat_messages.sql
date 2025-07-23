-- Add missing edit columns to guests_chat_messages table
-- These columns are needed for the edit functionality to work properly

-- Add is_edited column
ALTER TABLE guests_chat_messages 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

-- Add edited_at column  
ALTER TABLE guests_chat_messages 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Update existing messages to have is_edited = false
UPDATE guests_chat_messages 
SET is_edited = false 
WHERE is_edited IS NULL;

-- Create index on is_edited for better performance
CREATE INDEX IF NOT EXISTS idx_guests_chat_messages_is_edited 
ON guests_chat_messages(is_edited);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'guests_chat_messages' 
AND column_name IN ('is_edited', 'edited_at')
ORDER BY column_name;

SELECT 'Edit columns added successfully' AS status; 