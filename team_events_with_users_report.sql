-- ============================================
-- TEAM EVENTS WITH USER DETAILS REPORT
-- Shows all team-event relationships with complete user information
-- ============================================

-- 1. OVERVIEW: All team-event links with basic info
SELECT 
  'TEAM-EVENT LINKS OVERVIEW' as report_section,
  COUNT(*) as total_links
FROM team_events;

-- 2. DETAILED TEAM-EVENT RELATIONSHIPS
-- Shows teams, events, and all associated users
SELECT 
  '================================================' as separator,
  'DETAILED TEAM-EVENT RELATIONSHIPS' as report_section,
  '================================================' as separator2;

SELECT 
  -- Team Information
  t.name as team_name,
  t.id as team_id,
  t.description as team_description,
  
  -- Event Information  
  e.name as event_name,
  e.id as event_id,
  e."from" as event_start_date,
  e."to" as event_end_date,
  e.location as event_location,
  
  -- Assignment Information
  te.access_level,
  te.assigned_at,
  
  -- Assigned By User
  assigned_by_user.name as assigned_by_name,
  assigned_by_user.email as assigned_by_email,
  assigned_by_user.id as assigned_by_id,
  
  -- Company Information
  c.name as company_name,
  c.id as company_id

FROM team_events te
LEFT JOIN teams t ON te.team_id = t.id
LEFT JOIN events e ON te.event_id = e.id
LEFT JOIN users assigned_by_user ON te.assigned_by = assigned_by_user.id
LEFT JOIN companies c ON t.company_id = c.id
ORDER BY te.assigned_at DESC;

-- 3. TEAM MEMBERS FOR EACH TEAM-EVENT LINK
-- Shows all users who are part of teams linked to events
SELECT 
  '================================================' as separator,
  'TEAM MEMBERS IN LINKED EVENTS' as report_section,
  '================================================' as separator2;

WITH team_event_members AS (
  SELECT 
    te.id as team_event_link_id,
    t.name as team_name,
    t.id as team_id,
    e.name as event_name,
    e.id as event_id,
    e."from" as event_start_date,
    e."to" as event_end_date,
    
    -- Team Member Details
    u.name as member_name,
    u.email as member_email,
    u.id as member_id,
    tm.role as team_role,
    tm.joined_at as joined_team_at,
    
    -- Assignment Details
    te.access_level,
    te.assigned_at as linked_to_event_at,
    
    -- Company
    c.name as company_name
    
  FROM team_events te
  LEFT JOIN teams t ON te.team_id = t.id
  LEFT JOIN events e ON te.event_id = e.id
  LEFT JOIN team_members tm ON t.id = tm.team_id
  LEFT JOIN users u ON tm.user_id = u.id
  LEFT JOIN companies c ON t.company_id = c.id
)
SELECT * FROM team_event_members
ORDER BY team_name, event_start_date, team_role DESC, member_name;

-- 4. SUMMARY BY COMPANY
-- Count of teams, events, and users per company
SELECT 
  '================================================' as separator,
  'SUMMARY BY COMPANY' as report_section,
  '================================================' as separator2;

SELECT 
  c.name as company_name,
  c.id as company_id,
  COUNT(DISTINCT te.id) as total_team_event_links,
  COUNT(DISTINCT t.id) as teams_with_events,
  COUNT(DISTINCT e.id) as events_with_teams,
  COUNT(DISTINCT tm.user_id) as total_users_in_linked_teams,
  
  -- List of team names
  STRING_AGG(DISTINCT t.name, ', ') as team_names,
  
  -- List of event names
  STRING_AGG(DISTINCT e.name, ', ') as event_names

FROM companies c
LEFT JOIN teams t ON c.id = t.company_id
LEFT JOIN team_events te ON t.id = te.team_id
LEFT JOIN events e ON te.event_id = e.id
LEFT JOIN team_members tm ON t.id = tm.team_id
GROUP BY c.id, c.name
ORDER BY total_team_event_links DESC;

-- 5. USERS WHO CAN ACCESS SPECIFIC EVENTS VIA TEAMS
-- Shows which users have access to which events through team membership
SELECT 
  '================================================' as separator,
  'USER EVENT ACCESS VIA TEAMS' as report_section,
  '================================================' as separator2;

SELECT 
  -- User Information
  u.name as user_name,
  u.email as user_email,
  u.id as user_id,
  u.role as user_role,
  
  -- Event Information
  e.name as event_name,
  e.id as event_id,
  e."from" as event_start,
  e."to" as event_end,
  
  -- Access Information
  t.name as access_via_team,
  tm.role as team_role,
  te.access_level as event_access_level,
  
  -- Company
  c.name as company_name

FROM users u
INNER JOIN team_members tm ON u.id = tm.user_id
INNER JOIN teams t ON tm.team_id = t.id
INNER JOIN team_events te ON t.id = te.team_id
INNER JOIN events e ON te.event_id = e.id
INNER JOIN companies c ON u.company_id = c.id
ORDER BY u.name, e."from";

-- 6. RECENT ACTIVITY
-- Shows the most recent team-event assignments
SELECT 
  '================================================' as separator,
  'RECENT TEAM-EVENT ASSIGNMENTS (Last 30 days)' as report_section,
  '================================================' as separator2;

SELECT 
  te.assigned_at,
  t.name as team_name,
  e.name as event_name,
  assigned_by.name as assigned_by,
  assigned_by.email as assigned_by_email,
  te.access_level,
  
  -- Count of team members affected
  (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as team_members_count

FROM team_events te
LEFT JOIN teams t ON te.team_id = t.id
LEFT JOIN events e ON te.event_id = e.id
LEFT JOIN users assigned_by ON te.assigned_by = assigned_by.id
WHERE te.assigned_at >= NOW() - INTERVAL '30 days'
ORDER BY te.assigned_at DESC;

-- 7. VALIDATION CHECKS
-- Check for any data integrity issues
SELECT 
  '================================================' as separator,
  'DATA VALIDATION CHECKS' as report_section,
  '================================================' as separator2;

-- Check for orphaned records
SELECT 
  'Orphaned team_events (no team)' as check_type,
  COUNT(*) as count
FROM team_events te
LEFT JOIN teams t ON te.team_id = t.id
WHERE t.id IS NULL

UNION ALL

SELECT 
  'Orphaned team_events (no event)' as check_type,
  COUNT(*) as count
FROM team_events te
LEFT JOIN events e ON te.event_id = e.id
WHERE e.id IS NULL

UNION ALL

SELECT 
  'team_events with invalid assigned_by' as check_type,
  COUNT(*) as count
FROM team_events te
LEFT JOIN users u ON te.assigned_by = u.id
WHERE te.assigned_by IS NOT NULL AND u.id IS NULL;

-- 8. EXPORT READY FORMAT
-- Flat format for easy export/analysis
SELECT 
  '================================================' as separator,
  'EXPORT FORMAT - ALL USER-EVENT RELATIONSHIPS' as report_section,
  '================================================' as separator2;

SELECT 
  -- Company
  c.name as company_name,
  c.id as company_id,
  
  -- User
  u.name as user_name,
  u.email as user_email,
  u.id as user_id,
  u.role as user_company_role,
  
  -- Team
  t.name as team_name,
  t.id as team_id,
  tm.role as user_team_role,
  tm.joined_at as user_joined_team_at,
  
  -- Event
  e.name as event_name,
  e.id as event_id,
  e."from" as event_start_date,
  e."to" as event_end_date,
  e.location as event_location,
  e.description as event_description,
  
  -- Team-Event Link
  te.access_level,
  te.assigned_at as team_linked_to_event_at,
  
  -- Assignment Info
  assigner.name as linked_by_user_name,
  assigner.email as linked_by_user_email

FROM users u
INNER JOIN companies c ON u.company_id = c.id
INNER JOIN team_members tm ON u.id = tm.user_id
INNER JOIN teams t ON tm.team_id = t.id
INNER JOIN team_events te ON t.id = te.team_id
INNER JOIN events e ON te.event_id = e.id
LEFT JOIN users assigner ON te.assigned_by = assigner.id
ORDER BY c.name, u.name, e."from", t.name; 