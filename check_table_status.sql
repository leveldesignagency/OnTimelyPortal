-- Check the current state of guests_chat_reactions table

-- Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'guests_chat_reactions';

-- Check if there are any policies
SELECT COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'guests_chat_reactions';

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'guests_chat_reactions'
ORDER BY ordinal_position;

-- Check permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'guests_chat_reactions';

-- Test a simple query
SELECT COUNT(*) as total_reactions FROM guests_chat_reactions;

-- Check a few sample reactions
SELECT 
    message_id,
    event_id,
    user_email,
    emoji,
    created_at
FROM guests_chat_reactions 
ORDER BY created_at DESC 
LIMIT 5; 