-- Check if announcements table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'announcements'
) as table_exists;

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'announcements'
ORDER BY ordinal_position;

-- Check if there are any announcements
SELECT COUNT(*) as announcement_count FROM announcements;

-- Check recent announcements
SELECT id, title, description, event_id, created_at 
FROM announcements 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if the RPC function exists
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_guest_announcements'; 