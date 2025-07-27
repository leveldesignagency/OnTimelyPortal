-- Debug guest chat authorization (Simple version for Supabase)
-- REPLACE the values in the WHERE clauses below with your actual event ID and email

-- 1. Check if the event exists
SELECT 'EVENT CHECK:' as debug_section, 'Replace event_id below' as instruction;
SELECT 
  id, 
  name, 
  created_by,
  (SELECT company_id FROM users WHERE id = events.created_by) as event_company_id
FROM events 
WHERE id = '4e19b264-61a1-484f-8619-4f2d515b3796';

-- 2. Check what teams are assigned to this event
SELECT 'TEAMS ASSIGNED TO EVENT:' as debug_section;
SELECT 
  te.id as team_event_id,
  t.name as team_name,
  t.id as team_id,
  t.company_id as team_company_id,
  te.access_level,
  te.assigned_at
FROM team_events te
JOIN teams t ON te.team_id = t.id
WHERE te.event_id = '4e19b264-61a1-484f-8619-4f2d515b3796';

-- 3. Check what users are in those teams
SELECT 'USERS IN EVENT TEAMS:' as debug_section;
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.company_id as user_company_id,
  t.name as team_name,
  tm.role as team_role
FROM users u
INNER JOIN team_members tm ON u.id = tm.user_id
INNER JOIN teams t ON tm.team_id = t.id
INNER JOIN team_events te ON t.id = te.team_id
WHERE te.event_id = '4e19b264-61a1-484f-8619-4f2d515b3796';

-- 4. Check what guests exist for this event
SELECT 'GUESTS FOR EVENT:' as debug_section;
SELECT 
  id,
  email,
  first_name,
  last_name,
  event_id,
  company_id
FROM guests 
WHERE event_id = '4e19b264-61a1-484f-8619-4f2d515b3796';

-- 5. Check ALL users in the system (to see what emails exist)
SELECT 'ALL USERS IN SYSTEM:' as debug_section;
SELECT 
  id,
  email,
  name,
  company_id,
  role
FROM users 
ORDER BY email;

-- 6. Manual authorization test - REPLACE 'your_email@example.com' with your actual email
SELECT 'MANUAL AUTHORIZATION TEST:' as debug_section, 'Replace your_email below' as instruction;

-- Test admin authorization
SELECT 'ADMIN CHECK:' as check_type, COUNT(*) as found_count
FROM users u
INNER JOIN team_members tm ON u.id = tm.user_id
INNER JOIN teams t ON tm.team_id = t.id
INNER JOIN team_events te ON t.id = te.team_id
WHERE te.event_id = '4e19b264-61a1-484f-8619-4f2d515b3796'
  AND u.email = 'your_email@example.com'  -- REPLACE THIS
  AND u.company_id = (
    SELECT company_id FROM users WHERE id = (
      SELECT created_by FROM events WHERE id = '4e19b264-61a1-484f-8619-4f2d515b3796'
    )
  );

-- Test guest authorization
SELECT 'GUEST CHECK:' as check_type, COUNT(*) as found_count
FROM guests g
WHERE g.event_id = '4e19b264-61a1-484f-8619-4f2d515b3796'
  AND g.email = 'your_email@example.com';  -- REPLACE THIS

-- Instructions
SELECT 'INSTRUCTIONS:' as info;
SELECT '1. Replace 4e19b264-61a1-484f-8619-4f2d515b3796 with your actual event ID' as step_1;
SELECT '2. Replace your_email@example.com with your actual email address' as step_2;
SELECT '3. Look at the counts in ADMIN CHECK and GUEST CHECK - one should be > 0' as step_3; 