-- NUCLEAR OPTION: Drop ALL possible versions of guest chat functions
-- This will aggressively remove every possible signature

-- Drop by specific signatures we know exist
DROP FUNCTION IF EXISTS send_guests_chat_message(uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS send_guests_chat_message(uuid, text, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS send_guests_chat_message(p_event_id uuid, p_sender_email text, p_message_text text, p_message_type text) CASCADE;
DROP FUNCTION IF EXISTS send_guests_chat_message(p_event_id uuid, p_sender_email text, p_message_text text, p_message_type text, p_attachment_url text, p_attachment_filename text) CASCADE;

-- Drop any other possible signatures
DROP FUNCTION IF EXISTS send_guests_chat_message CASCADE;

-- Drop all other guest chat functions
DROP FUNCTION IF EXISTS initialize_guests_chat CASCADE;
DROP FUNCTION IF EXISTS initialize_guests_chat(uuid) CASCADE;

DROP FUNCTION IF EXISTS get_guests_chat_messages CASCADE;
DROP FUNCTION IF EXISTS get_guests_chat_messages(uuid, text, integer, integer) CASCADE;

DROP FUNCTION IF EXISTS create_guests_chat_notifications_for_message CASCADE;
DROP FUNCTION IF EXISTS create_guests_chat_notifications_for_message(uuid, uuid, text, text) CASCADE;

-- Check what functions still exist
SELECT 
  routine_name,
  specific_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%guests_chat%' 
  AND routine_type = 'FUNCTION';

SELECT 'All guest chat functions should be gone now' AS status; 