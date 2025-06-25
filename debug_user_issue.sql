-- Debug script to check user data
-- Run this in Supabase SQL Editor to see what users exist

-- Check companies
SELECT 'Companies:' as table_name;
SELECT id, name, subscription_plan, max_users, created_at FROM companies;

-- Check users 
SELECT 'Users:' as table_name;
SELECT id, company_id, email, name, role, status, created_at FROM users ORDER BY created_at;

-- Check if users belong to the test company
SELECT 'Users in Test Company:' as query_name;
SELECT u.id, u.email, u.name, u.role, u.status, c.name as company_name
FROM users u 
JOIN companies c ON u.company_id = c.id 
WHERE c.name = 'Test Company';

-- Check current session/auth state
SELECT 'Database Connection Test:' as test_name;
SELECT NOW() as current_time, 'Connection successful' as status; 