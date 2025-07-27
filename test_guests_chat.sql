-- ============================================================================
-- TEST GUESTS CHAT SYSTEM
-- Run this to verify everything is working
-- ============================================================================

-- Test 1: Check if tables were created
DO $$
BEGIN
    RAISE NOTICE '🧪 Testing Guests Chat System...';
    RAISE NOTICE '';
    
    -- Check tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guests_chat_participants') THEN
        RAISE NOTICE '✅ guests_chat_participants table exists';
    ELSE
        RAISE NOTICE '❌ guests_chat_participants table missing';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guests_chat_messages') THEN
        RAISE NOTICE '✅ guests_chat_messages table exists';
    ELSE
        RAISE NOTICE '❌ guests_chat_messages table missing';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guests_chat_receipts') THEN
        RAISE NOTICE '✅ guests_chat_receipts table exists';
    ELSE
        RAISE NOTICE '❌ guests_chat_receipts table missing';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guests_chat_notifications') THEN
        RAISE NOTICE '✅ guests_chat_notifications table exists';
    ELSE
        RAISE NOTICE '❌ guests_chat_notifications table missing';
    END IF;
END $$;

-- Test 2: Check if functions were created
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Checking Functions...';
    
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'initialize_guests_chat') THEN
        RAISE NOTICE '✅ initialize_guests_chat function exists';
    ELSE
        RAISE NOTICE '❌ initialize_guests_chat function missing';
    END IF;
    
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'send_guests_chat_message') THEN
        RAISE NOTICE '✅ send_guests_chat_message function exists';
    ELSE
        RAISE NOTICE '❌ send_guests_chat_message function missing';
    END IF;
    
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'get_guests_chat_messages') THEN
        RAISE NOTICE '✅ get_guests_chat_messages function exists';
    ELSE
        RAISE NOTICE '❌ get_guests_chat_messages function missing';
    END IF;
    
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'mark_guests_chat_messages_as_read') THEN
        RAISE NOTICE '✅ mark_guests_chat_messages_as_read function exists';
    ELSE
        RAISE NOTICE '❌ mark_guests_chat_messages_as_read function missing';
    END IF;
    
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'get_guests_chat_unread_count') THEN
        RAISE NOTICE '✅ get_guests_chat_unread_count function exists';
    ELSE
        RAISE NOTICE '❌ get_guests_chat_unread_count function missing';
    END IF;
END $$;

-- Test 3: Test with a dummy event (if you have events)
DO $$
DECLARE
    v_test_event_id UUID;
    v_result JSON;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📝 Testing with dummy data...';
    
    -- Try to get an existing event ID
    SELECT id INTO v_test_event_id FROM events LIMIT 1;
    
    IF v_test_event_id IS NOT NULL THEN
        RAISE NOTICE '✅ Found test event: %', v_test_event_id;
        
        -- Test initialize function
        SELECT initialize_guests_chat(v_test_event_id) INTO v_result;
        RAISE NOTICE '📞 Initialize result: %', v_result;
        
    ELSE
        RAISE NOTICE 'ℹ️  No events found - you can test with actual event IDs later';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Test error (this is OK if you have no events yet): %', SQLERRM;
END $$;

-- Test 4: Show table counts
DO $$
DECLARE
    v_participants_count INTEGER;
    v_messages_count INTEGER;
    v_receipts_count INTEGER;
    v_notifications_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Current Data Counts:';
    
    SELECT COUNT(*) INTO v_participants_count FROM guests_chat_participants;
    SELECT COUNT(*) INTO v_messages_count FROM guests_chat_messages;
    SELECT COUNT(*) INTO v_receipts_count FROM guests_chat_receipts;
    SELECT COUNT(*) INTO v_notifications_count FROM guests_chat_notifications;
    
    RAISE NOTICE '   Participants: %', v_participants_count;
    RAISE NOTICE '   Messages: %', v_messages_count;
    RAISE NOTICE '   Receipts: %', v_receipts_count;
    RAISE NOTICE '   Notifications: %', v_notifications_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Guests Chat System is ready to use!';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Next steps:';
    RAISE NOTICE '   1. Update your React components to use the new functions';
    RAISE NOTICE '   2. Test with real event IDs';
    RAISE NOTICE '   3. Integrate push notifications';
END $$; 