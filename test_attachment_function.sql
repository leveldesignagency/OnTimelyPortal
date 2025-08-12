-- Test the add_message_attachment function
-- First, let's check if the function exists
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'add_message_attachment';

-- Check if the table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'guests_chat_attachments';

-- Check the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'guests_chat_attachments'
ORDER BY ordinal_position;

-- Check if there are any existing attachments
SELECT COUNT(*) as attachment_count FROM guests_chat_attachments;

-- Check if there are any file messages
SELECT COUNT(*) as file_message_count 
FROM guests_chat_messages 
WHERE message_type = 'file'; 