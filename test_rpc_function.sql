-- Test if the get_guest_timeline_modules function exists
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'get_guest_timeline_modules';

-- Test the function with your actual data
SELECT * FROM get_guest_timeline_modules(
    '7f6a8790-cb66-476f-8a7c-b4da6c7ede09'::UUID,
    '0c054612-8c30-4b19-a009-b89400dcc461'::UUID,
    '2025-07-17'
);

-- Check if the function exists in the public schema
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'get_guest_timeline_modules' 
AND routine_schema = 'public'; 