-- Fix reaction constraint to allow only one reaction per user per message
-- This will enforce that users can only have one emoji reaction per message

-- First, check what constraint currently exists
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'guests_chat_reactions'::regclass 
AND contype = 'u';

-- Drop the existing unique constraint that allows multiple reactions per user per message
ALTER TABLE guests_chat_reactions 
DROP CONSTRAINT IF EXISTS guests_chat_reactions_message_id_user_email_emoji_key;

-- Add the new constraint: only one reaction per user per message
ALTER TABLE guests_chat_reactions 
ADD CONSTRAINT guests_chat_reactions_message_id_user_email_key 
UNIQUE (message_id, user_email);

-- Verify the new constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'guests_chat_reactions'::regclass 
AND contype = 'u';