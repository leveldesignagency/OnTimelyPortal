-- Check current SQL functions to see what's being used
-- This will show us the current implementation before making changes

-- Check if the functions exist
SELECT 
    'send_guests_chat_message function exists' as status,
    proname,
    proargtypes,
    proargnames
FROM pg_proc 
WHERE proname = 'send_guests_chat_message';

SELECT 
    'get_guests_chat_messages function exists' as status,
    proname,
    proargtypes,
    proargnames
FROM pg_proc 
WHERE proname = 'get_guests_chat_messages';

-- Show the current function definitions
SELECT 
    'send_guests_chat_message definition' as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'send_guests_chat_message'
LIMIT 1;

SELECT 
    'get_guests_chat_messages definition' as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'get_guests_chat_messages'
LIMIT 1;

-- Check what sender_name values are currently in the database
SELECT 
    'Current sender_name values in guests_chat_messages' as info,
    sender_type,
    sender_name,
    sender_email,
    COUNT(*) as count
FROM guests_chat_messages 
GROUP BY sender_type, sender_name, sender_email
ORDER BY sender_type, count DESC
LIMIT 20;

-- Check users table to see what names are stored
SELECT 
    'Users table name/email check' as info,
    name,
    email,
    CASE 
        WHEN name = email THEN 'name is email'
        WHEN name IS NULL OR name = '' THEN 'name is empty'
        ELSE 'name is different from email'
    END as name_status
FROM users 
LIMIT 10;

-- Check guests table to see what names are stored
SELECT 
    'Guests table name check' as info,
    first_name,
    last_name,
    email,
    CASE 
        WHEN first_name IS NULL AND last_name IS NULL THEN 'no names'
        WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN 'both names'
        WHEN first_name IS NOT NULL THEN 'first name only'
        WHEN last_name IS NOT NULL THEN 'last name only'
        ELSE 'unknown'
    END as name_status
FROM guests 
LIMIT 10; 