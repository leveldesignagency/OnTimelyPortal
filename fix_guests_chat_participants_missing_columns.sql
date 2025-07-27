-- Fix missing columns in guests_chat_participants table
-- Step 1: Add missing columns one by one

-- Add company_id column
ALTER TABLE guests_chat_participants 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add user_type column
ALTER TABLE guests_chat_participants 
ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'guest' 
CHECK (user_type IN ('admin', 'guest'));

-- Add user_email column
ALTER TABLE guests_chat_participants 
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Add user_name column
ALTER TABLE guests_chat_participants 
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Update existing rows to have proper user_type
UPDATE guests_chat_participants 
SET user_type = CASE 
  WHEN user_id IS NOT NULL THEN 'admin'
  WHEN guest_id IS NOT NULL THEN 'guest'
  ELSE 'guest'
END
WHERE user_type IS NULL OR user_type = '';

-- Update user_email for existing rows
UPDATE guests_chat_participants 
SET user_email = COALESCE(
  (SELECT email FROM users WHERE id = guests_chat_participants.user_id),
  (SELECT email FROM guests WHERE id = guests_chat_participants.guest_id)
)
WHERE user_email IS NULL;

-- Update user_name for existing rows
UPDATE guests_chat_participants 
SET user_name = COALESCE(
  (SELECT name FROM users WHERE id = guests_chat_participants.user_id),
  (SELECT CONCAT(first_name, ' ', last_name) FROM guests WHERE id = guests_chat_participants.guest_id)
)
WHERE user_name IS NULL;

-- Update company_id for existing rows
UPDATE guests_chat_participants 
SET company_id = COALESCE(
  (SELECT company_id FROM users WHERE id = guests_chat_participants.user_id),
  (SELECT 
    (SELECT company_id FROM users WHERE id = e.created_by) 
    FROM events e WHERE e.id = guests_chat_participants.event_id
  )
)
WHERE company_id IS NULL;

SELECT 'All missing columns added to guests_chat_participants' AS status; 