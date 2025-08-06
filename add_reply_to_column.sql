-- Add reply_to column to messages table
-- This will allow messages to reference other messages they're replying to

-- Add the reply_to column
ALTER TABLE messages 
ADD COLUMN reply_to UUID REFERENCES messages(id) ON DELETE CASCADE;

-- Add an index for better performance when querying replies
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);

-- Add RLS policy for reply_to column if RLS is enabled
-- (This will be handled by existing policies, but we can add specific ones if needed) 
-- This will allow messages to reference other messages they're replying to

-- Add the reply_to column
ALTER TABLE messages 
ADD COLUMN reply_to UUID REFERENCES messages(id) ON DELETE CASCADE;

-- Add an index for better performance when querying replies
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);

-- Add RLS policy for reply_to column if RLS is enabled
-- (This will be handled by existing policies, but we can add specific ones if needed) 
 
 
 
 