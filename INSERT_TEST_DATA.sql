-- ============================================
-- INSERT TEST DATA FOR TEAM CREATION
-- ============================================
-- Run this in your Supabase SQL editor to ensure you have test data

-- Insert test company
INSERT INTO companies (id, name, subscription_plan, max_users) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Company', 'premium', 50)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  subscription_plan = EXCLUDED.subscription_plan,
  max_users = EXCLUDED.max_users;

-- Insert test users
INSERT INTO users (id, company_id, email, name, role, avatar, status) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@testcompany.com', 'Admin User', 'masterAdmin', 'AU', 'online'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'user@testcompany.com', 'Regular User', 'user', 'RU', 'offline'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'alice@testcompany.com', 'Alice Smith', 'user', 'AS', 'away'),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'bob@testcompany.com', 'Bob Johnson', 'user', 'BJ', 'busy')
ON CONFLICT (id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  avatar = EXCLUDED.avatar,
  status = EXCLUDED.status;

-- Verify the data
SELECT 'Companies:' as table_name, count(*) as count FROM companies
UNION ALL
SELECT 'Users:', count(*) FROM users; 