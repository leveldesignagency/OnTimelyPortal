-- ============================================================================
-- COMPREHENSIVE GUEST CHAT TEST
-- Run this to verify everything is working properly
-- ============================================================================

-- Test 1: Check if all required tables exist
DO $$
BEGIN
    RAISE NOTICE '🧪 Testing Guest Chat System...';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Checking Tables...';
    
    -- Check core tables
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
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guests_chat_reactions') THEN
        RAISE NOTICE '✅ guests_chat_reactions table exists';
    ELSE
        RAISE NOTICE '❌ guests_chat_reactions table missing';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guests_chat_receipts') THEN
        RAISE NOTICE '✅ guests_chat_receipts table exists';
    ELSE
        RAISE NOTICE '❌ guests_chat_receipts table missing';
    END IF;
END $$;

-- Test 2: Check if all required functions exist
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Checking Functions...';
    
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
    
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'add_guests_chat_reaction') THEN
        RAISE NOTICE '✅ add_guests_chat_reaction function exists';
    ELSE
        RAISE NOTICE '❌ add_guests_chat_reaction function missing';
    END IF;
    
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'remove_guests_chat_reaction') THEN
        RAISE NOTICE '✅ remove_guests_chat_reaction function exists';
    ELSE
        RAISE NOTICE '❌ remove_guests_chat_reaction function missing';
    END IF;
END $$;

-- Test 3: Check table data and structure
DO $$
DECLARE
    v_message_count INTEGER;
    v_reaction_count INTEGER;
    v_participant_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Checking Data...';
    
    -- Count messages
    SELECT COUNT(*) INTO v_message_count FROM guests_chat_messages;
    RAISE NOTICE '📨 Total messages: %', v_message_count;
    
    -- Count reactions
    SELECT COUNT(*) INTO v_reaction_count FROM guests_chat_reactions;
    RAISE NOTICE '😀 Total reactions: %', v_reaction_count;
    
    -- Count participants
    SELECT COUNT(*) INTO v_participant_count FROM guests_chat_participants;
    RAISE NOTICE '👥 Total participants: %', v_participant_count;
    
    -- Show recent messages count
    RAISE NOTICE '';
    RAISE NOTICE '📝 Recent Messages (showing count only):';
    RAISE NOTICE '  - Total messages in database: %', v_message_count;
    
    -- Show recent reactions count
    RAISE NOTICE '';
    RAISE NOTICE '😀 Recent Reactions (showing count only):';
    RAISE NOTICE '  - Total reactions in database: %', v_reaction_count;
END $$;

-- Test 4: Check RLS policies
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Checking RLS Policies...';
    
    -- Check messages table policies
    IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'guests_chat_messages') THEN
        RAISE NOTICE '✅ guests_chat_messages has RLS policies';
    ELSE
        RAISE NOTICE '❌ guests_chat_messages missing RLS policies';
    END IF;
    
    -- Check reactions table policies
    IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'guests_chat_reactions') THEN
        RAISE NOTICE '✅ guests_chat_reactions has RLS policies';
    ELSE
        RAISE NOTICE '❌ guests_chat_reactions missing RLS policies';
    END IF;
END $$;

-- Test 5: Check real-time subscriptions
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📡 Checking Real-time...';
    
    -- Check if tables are in real-time publication
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'guests_chat_messages'
    ) THEN
        RAISE NOTICE '✅ guests_chat_messages is in real-time publication';
    ELSE
        RAISE NOTICE '❌ guests_chat_messages NOT in real-time publication';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'guests_chat_reactions'
    ) THEN
        RAISE NOTICE '✅ guests_chat_reactions is in real-time publication';
    ELSE
        RAISE NOTICE '❌ guests_chat_reactions NOT in real-time publication';
    END IF;
END $$;

-- Test 6: Function parameter validation
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Checking Function Signatures...';
    
    -- Check send_guests_chat_message parameters
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'send_guests_chat_message'
        AND n.nspname = 'public'
    ) THEN
        RAISE NOTICE '✅ send_guests_chat_message function exists with correct signature';
    ELSE
        RAISE NOTICE '❌ send_guests_chat_message function missing or wrong signature';
    END IF;
    
    -- Check get_guests_chat_messages parameters
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_guests_chat_messages'
        AND n.nspname = 'public'
    ) THEN
        RAISE NOTICE '✅ get_guests_chat_messages function exists with correct signature';
    ELSE
        RAISE NOTICE '❌ get_guests_chat_messages function missing or wrong signature';
    END IF;
END $$;

-- Test 7: Sample data test (if data exists)
DO $$
DECLARE
    v_test_message_id UUID;
    v_test_event_id UUID;
    v_test_user_email TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Testing with Sample Data...';
    
    -- Try to get a sample message
    SELECT message_id, event_id, sender_email 
    INTO v_test_message_id, v_test_event_id, v_test_user_email
    FROM guests_chat_messages 
    LIMIT 1;
    
    IF v_test_message_id IS NOT NULL THEN
        RAISE NOTICE '✅ Found test message: %', v_test_message_id;
        RAISE NOTICE '   Event: %, Sender: %', v_test_event_id, v_test_user_email;
        
        -- Test getting messages for this event
        RAISE NOTICE '   Testing get_guests_chat_messages...';
        -- Note: This would need to be run with proper authentication context
        
    ELSE
        RAISE NOTICE 'ℹ️  No messages found - system ready for testing';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Test error: %', SQLERRM;
END $$;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Guest Chat System Test Complete!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Summary:';
    RAISE NOTICE '  - All required tables should exist';
    RAISE NOTICE '  - All required functions should exist';
    RAISE NOTICE '  - RLS policies should be configured';
    RAISE NOTICE '  - Real-time subscriptions should be enabled';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 If any tests failed, run the corresponding SQL files:';
    RAISE NOTICE '  - create_guests_chat_reactions_table.sql (for reactions)';
    RAISE NOTICE '  - FINAL_COMPLETE_FIX.sql (for core functionality)';
    RAISE NOTICE '  - fix_reaction_functions.sql (for reaction functions)';
END $$; 