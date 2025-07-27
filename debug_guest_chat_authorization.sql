-- Debug guest chat authorization
-- Replace 'YOUR_EVENT_ID' and 'YOUR_USER_EMAIL' with actual values

-- Set your actual values here:
-- REPLACE THESE WITH YOUR ACTUAL VALUES
\set event_id '4e19b264-61a1-484f-8619-4f2d515b3796'
\set user_email 'your_email@example.com'

-- 1. Check if the event exists
SELECT 'EVENT CHECK:' as debug_section;
SELECT 
  id, 
  name, 
  created_by,
  (SELECT company_id FROM users WHERE id = events.created_by) as event_company_id
FROM events 
WHERE id = :'event_id';

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
WHERE te.event_id = :'event_id';

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
WHERE te.event_id = :'event_id';

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
WHERE event_id = :'event_id';

-- 5. Check the current user's details (replace with your actual email)
SELECT 'YOUR USER DETAILS:' as debug_section;
SELECT 
  id,
  email,
  name,
  company_id,
  role
FROM users 
WHERE email = :'user_email';

-- 6. Check if your user is in any teams for this event
SELECT 'YOUR TEAM MEMBERSHIPS FOR THIS EVENT:' as debug_section;
SELECT 
  u.email as your_email,
  t.name as team_name,
  tm.role as your_team_role,
  te.access_level as event_access_level
FROM users u
INNER JOIN team_members tm ON u.id = tm.user_id
INNER JOIN teams t ON tm.team_id = t.id
INNER JOIN team_events te ON t.id = te.team_id
WHERE te.event_id = :'event_id'
  AND u.email = :'user_email';

-- 7. Check if you're a guest for this event
SELECT 'ARE YOU A GUEST FOR THIS EVENT:' as debug_section;
SELECT 
  id,
  email,
  first_name,
  last_name
FROM guests
WHERE event_id = :'event_id'
  AND email = :'user_email';

-- Instructions for running this debug script:
SELECT 'TO USE THIS DEBUG SCRIPT:' as instructions;
SELECT '1. Replace the event_id value above with your actual event ID' as step_1;
SELECT '2. Replace the user_email value above with your actual email' as step_2;
SELECT '3. Run this script to see authorization debug info' as step_3; 