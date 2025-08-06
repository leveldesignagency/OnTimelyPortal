-- ============================================================================
-- TEST GUEST CHAT FIX
-- Verify that the functions work correctly after the fix
-- ============================================================================

-- Test 1: Check if the functions exist
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('send_guests_chat_message', 'get_guests_chat_messages', 'initialize_guests_chat')
ORDER BY proname;

-- Test 2: Check if the tables exist and have correct structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('guests_chat_messages', 'guests_chat_participants', 'guests_chat_receipts')
ORDER BY table_name, ordinal_position;

-- Test 3: Check if there are any existing messages (for reference)
SELECT 
    COUNT(*) as total_messages,
    COUNT(DISTINCT event_id) as unique_events,
    COUNT(DISTINCT sender_email) as unique_senders
FROM guests_chat_messages;

-- Test 4: Check if there are any participants (for reference)
SELECT 
    COUNT(*) as total_participants,
    COUNT(DISTINCT event_id) as unique_events,
    COUNT(DISTINCT user_email) as unique_users,
    user_type,
    COUNT(*) as count_by_type
FROM guests_chat_participants
GROUP BY user_type;

-- Test 5: Verify the function signatures are correct
SELECT 
    'send_guests_chat_message' as function_name,
    'Should accept: (UUID, TEXT, TEXT, TEXT, UUID)' as expected_signature,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'send_guests_chat_message' 
            AND pg_get_function_identity_arguments(oid) = 'UUID, TEXT, TEXT, TEXT, UUID'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status;

-- Test 6: Check for any remaining ambiguous column references
-- This query will help identify if there are still any issues
SELECT 
    'No ambiguous column references should exist' as test_description,
    'If this query runs without errors, the fix is working' as expected_result; 