-- Check the current send_guests_chat_message function definition
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'send_guests_chat_message'
AND n.nspname = 'public';

-- Test the function with sample data to see what it returns
SELECT * FROM send_guests_chat_message(
    '4e19b264-61a1-484f-8619-4f2d515b3796'::uuid,
    'charlesmorgantravels@gmail.com',
    'test message',
    'text',
    NULL
) LIMIT 1; 