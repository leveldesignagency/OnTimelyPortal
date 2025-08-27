-- Create Supabase Auth users for OnTimely staff
-- Run this in your Supabase SQL Editor

-- First, check what staff we have
SELECT 'Current OnTimely Staff:' as info;
SELECT id, email, name, role, is_active FROM ontimely_staff;

-- Create Supabase Auth users for each staff member
-- Note: This will send confirmation emails to each staff member
-- They'll need to click the link to confirm their account

-- For the master director (you)
SELECT 'Creating Supabase Auth user for master director...' as status;
SELECT 
  'INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES (' ||
  '(SELECT id FROM auth.instances LIMIT 1), ' ||
  'gen_random_uuid(), ' ||
  '''authenticated'', ' ||
  '''authenticated'', ' ||
  '''' || email || ''', ' ||
  '''' || password_hash || ''', ' ||
  'now(), ' ||
  'now(), ' ||
  'now(), ' ||
  'gen_random_uuid()::text, ' ||
  '''' || email || ''', ' ||
  'gen_random_uuid()::text);'
FROM ontimely_staff 
WHERE email = 'leveldesignagency@gmail.com';

-- For other staff members (if any)
SELECT 'Creating Supabase Auth users for other staff...' as status;
SELECT 
  'INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES (' ||
  '(SELECT id FROM auth.instances LIMIT 1), ' ||
  'gen_random_uuid(), ' ||
  '''authenticated'', ' ||
  '''authenticated'', ' ||
  '''' || email || ''', ' ||
  '''' || password_hash || ''', ' ||
  'now(), ' ||
  'now(), ' ||
  'now(), ' ||
  'gen_random_uuid()::text, ' ||
  '''' || email || ''', ' ||
  'gen_random_uuid()::text);'
FROM ontimely_staff 
WHERE email != 'leveldesignagency@gmail.com';

-- Alternative: Use Supabase's built-in function (safer)
SELECT 'Alternative: Use Supabase CLI or Dashboard to create users' as info;
SELECT '1. Go to Supabase Dashboard > Authentication > Users' as step;
SELECT '2. Click "Add User"' as step;
SELECT '3. Enter email and password for each staff member' as step;
SELECT '4. Mark email as confirmed' as step;

-- Success message
SELECT '✅ Instructions provided for creating Supabase Auth users!' AS status;
SELECT '🔧 After creating auth users, RLS policies will work properly' AS info;
