-- ============================================
-- DEBUG DATABASE ISSUES
-- ============================================

-- Check if companies exist
SELECT 'COMPANIES:' as table_name;
SELECT id, name, subscription_plan, max_users FROM companies;

-- Check if users exist
SELECT 'USERS:' as table_name;
SELECT id, company_id, email, name, role, avatar, status FROM users;

-- Check company user relationships
SELECT 'COMPANY USER RELATIONSHIPS:' as table_name;
SELECT c.name as company_name, u.name as user_name, u.email, u.role, u.status
FROM companies c
JOIN users u ON c.id = u.company_id
ORDER BY c.name, u.name;

-- Check for specific test company
SELECT 'TEST COMPANY USERS:' as table_name;
SELECT id, name, email, role, status 
FROM users 
WHERE company_id = '11111111-1111-1111-1111-111111111111'
ORDER BY name;

-- Count users per company
SELECT 'USER COUNT PER COMPANY:' as table_name;
SELECT c.name as company_name, COUNT(u.id) as user_count
FROM companies c
LEFT JOIN users u ON c.id = u.company_id
GROUP BY c.id, c.name
ORDER BY c.name; 