-- Test if announcements exist for any event
SELECT COUNT(*) as total_announcements FROM announcements;

-- Check if there are any announcements with event_id
SELECT DISTINCT event_id, COUNT(*) as announcement_count 
FROM announcements 
GROUP BY event_id 
ORDER BY announcement_count DESC;

-- Test the RPC function with a specific event_id (replace with actual event_id)
-- SELECT * FROM get_guest_announcements('your-event-id-here');

-- Check if the RPC function exists
SELECT routine_name, routine_type, data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_guest_announcements';

-- Check recent announcements with their event_ids
SELECT id, title, event_id, created_at 
FROM announcements 
ORDER BY created_at DESC 
LIMIT 10; 