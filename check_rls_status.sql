-- Check RLS status and policies for guests_chat_reactions table

-- Check if RLS is enabled on the table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'guests_chat_reactions';

-- Check existing policies on the table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'guests_chat_reactions';

-- Check if the table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'guests_chat_reactions'
ORDER BY ordinal_position;

-- Test a simple query to see what happens
SELECT COUNT(*) as total_reactions FROM guests_chat_reactions;

-- Test query with event_id filter
SELECT COUNT(*) as reactions_for_event 
FROM guests_chat_reactions 
WHERE event_id = '4e19b264-61a1-484f-8619-4f2d515b3796'; 