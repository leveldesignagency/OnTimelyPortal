-- Check RLS policies for teams table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'teams'
ORDER BY cmd, policyname;

-- Check if RLS is enabled on teams table
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables 
WHERE tablename = 'teams';

-- Also check what the current user context looks like
SELECT 
  'Current session info:' as info,
  current_user as current_user,
  session_user as session_user;

-- Test if we can see teams at all
SELECT 
  'Teams visible to current user:' as info,
  id,
  name,
  company_id,
  created_by
FROM teams 
LIMIT 5; 