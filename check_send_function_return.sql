-- Check what the send_guests_chat_message function returns
-- This will help us understand the correct return format

-- First, let's see the function definition
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'send_guests_chat_message'
AND n.nspname = 'public';

-- Test the function with sample data
SELECT * FROM send_guests_chat_message(
    '4e19b264-61a1-484f-8619-4f2d515b3796'::uuid,
    'test@example.com',
    'Test message from SQL',
    'text',
    NULL
); 