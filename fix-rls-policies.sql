-- Fix infinite recursion in RLS policies
-- Run this in your Supabase SQL Editor

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can only see users from their company" ON users;
DROP POLICY IF EXISTS "Enable all operations for users" ON users;

-- Temporarily disable RLS on users and companies tables for testing
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Insert test data directly
INSERT INTO companies (id, name, subscription_plan, max_users) VALUES 
('11111111-1111-1111-1111-111111111111', 'Test Company Ltd', 'premium', 10)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  subscription_plan = EXCLUDED.subscription_plan,
  max_users = EXCLUDED.max_users;

-- Insert test users
INSERT INTO users (id, company_id, email, name, role, avatar, status, password_hash) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@testcompany.com', 'Admin User', 'masterAdmin', 'AU', 'online', '$2b$10$dummy_hash_admin'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'user@testcompany.com', 'Regular User', 'user', 'RU', 'online', '$2b$10$dummy_hash_user'),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'alice@testcompany.com', 'Alice Johnson', 'user', 'AJ', 'offline', '$2b$10$dummy_hash_alice'),
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'bob@testcompany.com', 'Bob Smith', 'user', 'BS', 'away', '$2b$10$dummy_hash_bob')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  avatar = EXCLUDED.avatar,
  status = EXCLUDED.status;

-- Create simple, non-recursive RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Simple policy for companies - allow all for now
CREATE POLICY "Allow all operations on companies" ON companies FOR ALL USING (true);

-- Simple policy for users - allow all for now (we'll restrict later)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);

-- Verify the data
SELECT 'Companies:' as table_name, count(*) as count FROM companies
UNION ALL
SELECT 'Users:', count(*) FROM users
UNION ALL  
SELECT 'Teams:', count(*) FROM teams
UNION ALL
SELECT 'Team Members:', count(*) FROM team_members; 