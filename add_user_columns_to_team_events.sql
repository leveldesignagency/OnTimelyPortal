-- ============================================
-- ADD USER COLUMNS TO TEAM_EVENTS TABLE
-- Adds columns to store user emails and IDs directly in team_events
-- ============================================

-- Add user_emails column (array of emails for users in the team)
ALTER TABLE team_events 
ADD COLUMN IF NOT EXISTS user_emails TEXT[];

-- Add user_ids column (array of user IDs for users in the team)
ALTER TABLE team_events 
ADD COLUMN IF NOT EXISTS user_ids UUID[];

-- Optional: Add a comment to document these columns
COMMENT ON COLUMN team_events.user_emails IS 'Array of email addresses for all users in the team linked to this event';
COMMENT ON COLUMN team_events.user_ids IS 'Array of user IDs for all users in the team linked to this event';

-- Show the updated table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'team_events' 
ORDER BY ordinal_position; 