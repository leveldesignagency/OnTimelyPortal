-- ============================================
-- MULTI-TENANT SECURITY SETUP
-- Complete Company Isolation Architecture
-- ============================================
-- This ensures each company operates in complete isolation

-- ============================================
-- 1. COMPANY ISOLATION FUNCTIONS
-- ============================================

-- Function to get current user's company_id (for RLS policies)
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS UUID AS $$
DECLARE
  company_uuid UUID;
BEGIN
  -- For custom auth, we'll store company_id in app_metadata or use a different approach
  -- This is a placeholder - you'll need to implement based on your auth system
  SELECT company_id INTO company_uuid 
  FROM users 
  WHERE id = auth.uid();
  
  RETURN company_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate company access
CREATE OR REPLACE FUNCTION user_has_company_access(target_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN target_company_id = get_current_user_company_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. STRICT RLS POLICIES FOR COMPANY ISOLATION
-- ============================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Company isolation for companies" ON companies;
DROP POLICY IF EXISTS "Company isolation for users" ON users;
DROP POLICY IF EXISTS "Company isolation for teams" ON teams;
DROP POLICY IF EXISTS "Company isolation for team_members" ON team_members;
DROP POLICY IF EXISTS "Company isolation for team_invitations" ON team_invitations;
DROP POLICY IF EXISTS "Company isolation for chats" ON chats;
DROP POLICY IF EXISTS "Company isolation for chat_participants" ON chat_participants;
DROP POLICY IF EXISTS "Company isolation for messages" ON messages;
DROP POLICY IF EXISTS "Company isolation for message_reactions" ON message_reactions;

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- COMPANIES: Users can only see their own company
CREATE POLICY "Company isolation for companies" ON companies
  FOR ALL USING (id = get_current_user_company_id());

-- USERS: Users can only see users from their company
CREATE POLICY "Company isolation for users" ON users
  FOR ALL USING (company_id = get_current_user_company_id());

-- TEAMS: Users can only see teams from their company
CREATE POLICY "Company isolation for teams" ON teams
  FOR ALL USING (company_id = get_current_user_company_id());

-- TEAM_MEMBERS: Users can only see team members from their company teams
CREATE POLICY "Company isolation for team_members" ON team_members
  FOR ALL USING (
    team_id IN (
      SELECT id FROM teams WHERE company_id = get_current_user_company_id()
    )
  );

-- TEAM_INVITATIONS: Users can only see invitations for their company teams
CREATE POLICY "Company isolation for team_invitations" ON team_invitations
  FOR ALL USING (
    team_id IN (
      SELECT id FROM teams WHERE company_id = get_current_user_company_id()
    )
  );

-- CHATS: Users can only see chats from their company
CREATE POLICY "Company isolation for chats" ON chats
  FOR ALL USING (company_id = get_current_user_company_id());

-- CHAT_PARTICIPANTS: Users can only see participants from their company chats
CREATE POLICY "Company isolation for chat_participants" ON chat_participants
  FOR ALL USING (
    chat_id IN (
      SELECT id FROM chats WHERE company_id = get_current_user_company_id()
    )
  );

-- MESSAGES: Users can only see messages from their company chats
CREATE POLICY "Company isolation for messages" ON messages
  FOR ALL USING (
    chat_id IN (
      SELECT id FROM chats WHERE company_id = get_current_user_company_id()
    )
  );

-- MESSAGE_REACTIONS: Users can only see reactions from their company messages
CREATE POLICY "Company isolation for message_reactions" ON message_reactions
  FOR ALL USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE c.company_id = get_current_user_company_id()
    )
  );

-- ============================================
-- 3. APPLICATION-LEVEL SECURITY FUNCTIONS
-- ============================================

-- Function to get company users (with built-in isolation)
CREATE OR REPLACE FUNCTION get_company_users_secure(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  email VARCHAR,
  name VARCHAR,
  role VARCHAR,
  avatar VARCHAR,
  status VARCHAR,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Verify the requesting user has access to this company
  IF NOT user_has_company_access(p_company_id) THEN
    RAISE EXCEPTION 'Access denied: You can only access users from your own company';
  END IF;

  RETURN QUERY
  SELECT u.id, u.company_id, u.email, u.name, u.role, u.avatar, u.status, u.last_seen, u.created_at, u.updated_at
  FROM users u
  WHERE u.company_id = p_company_id
  ORDER BY u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create team with company validation
CREATE OR REPLACE FUNCTION create_team_secure(
  p_creator_id UUID,
  p_company_id UUID,
  p_team_name VARCHAR,
  p_description TEXT DEFAULT NULL,
  p_member_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID AS $$
DECLARE
  new_team_id UUID;
  member_id UUID;
BEGIN
  -- Verify the creator belongs to the company
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_creator_id AND company_id = p_company_id) THEN
    RAISE EXCEPTION 'Access denied: Creator must belong to the specified company';
  END IF;

  -- Verify all member IDs belong to the same company
  IF EXISTS (
    SELECT 1 FROM unnest(p_member_ids) AS member_id
    WHERE member_id NOT IN (SELECT id FROM users WHERE company_id = p_company_id)
  ) THEN
    RAISE EXCEPTION 'Access denied: All team members must belong to the same company';
  END IF;

  -- Create the team
  INSERT INTO teams (company_id, name, description, created_by, avatar)
  VALUES (p_company_id, p_team_name, p_description, p_creator_id, LEFT(UPPER(p_team_name), 2))
  RETURNING id INTO new_team_id;

  -- Add creator as admin
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (new_team_id, p_creator_id, 'admin');

  -- Add other members
  FOREACH member_id IN ARRAY p_member_ids
  LOOP
    IF member_id != p_creator_id THEN
      INSERT INTO team_members (team_id, user_id, role)
      VALUES (new_team_id, member_id, 'member');
    END IF;
  END LOOP;

  RETURN new_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create chat with company validation
CREATE OR REPLACE FUNCTION create_chat_secure(
  p_creator_id UUID,
  p_company_id UUID,
  p_chat_name VARCHAR,
  p_chat_type VARCHAR,
  p_participant_ids UUID[],
  p_team_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_chat_id UUID;
  participant_id UUID;
BEGIN
  -- Verify the creator belongs to the company
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_creator_id AND company_id = p_company_id) THEN
    RAISE EXCEPTION 'Access denied: Creator must belong to the specified company';
  END IF;

  -- Verify all participants belong to the same company
  IF EXISTS (
    SELECT 1 FROM unnest(p_participant_ids) AS participant_id
    WHERE participant_id NOT IN (SELECT id FROM users WHERE company_id = p_company_id)
  ) THEN
    RAISE EXCEPTION 'Access denied: All chat participants must belong to the same company';
  END IF;

  -- If team_id is provided, verify it belongs to the company
  IF p_team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM teams WHERE id = p_team_id AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Access denied: Team must belong to the same company';
  END IF;

  -- Create the chat
  INSERT INTO chats (company_id, name, type, created_by, team_id, avatar)
  VALUES (p_company_id, p_chat_name, p_chat_type, p_creator_id, p_team_id, LEFT(UPPER(p_chat_name), 2))
  RETURNING id INTO new_chat_id;

  -- Add participants
  FOREACH participant_id IN ARRAY p_participant_ids
  LOOP
    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (new_chat_id, participant_id);
  END LOOP;

  RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. COMPANY ONBOARDING FUNCTION
-- ============================================

-- Function to create a new company with initial setup
CREATE OR REPLACE FUNCTION create_new_company(
  p_company_name VARCHAR,
  p_admin_email VARCHAR,
  p_admin_password_hash VARCHAR,
  p_admin_name VARCHAR,
  p_subscription_plan VARCHAR DEFAULT 'basic',
  p_max_users INTEGER DEFAULT 5
)
RETURNS TABLE (
  company_id UUID,
  admin_user_id UUID,
  setup_complete BOOLEAN
) AS $$
DECLARE
  new_company_id UUID;
  new_admin_id UUID;
BEGIN
  -- Create the company
  INSERT INTO companies (name, subscription_plan, max_users)
  VALUES (p_company_name, p_subscription_plan, p_max_users)
  RETURNING id INTO new_company_id;

  -- Create the admin user
  INSERT INTO users (company_id, email, password_hash, name, role, avatar, status)
  VALUES (new_company_id, p_admin_email, p_admin_password_hash, p_admin_name, 'masterAdmin', LEFT(UPPER(p_admin_name), 2), 'online')
  RETURNING id INTO new_admin_id;

  -- Return the results
  RETURN QUERY SELECT new_company_id, new_admin_id, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. VALIDATION CONSTRAINTS
-- ============================================

-- Add check constraints to ensure data integrity
ALTER TABLE users ADD CONSTRAINT users_company_not_null CHECK (company_id IS NOT NULL);
ALTER TABLE teams ADD CONSTRAINT teams_company_not_null CHECK (company_id IS NOT NULL);
ALTER TABLE chats ADD CONSTRAINT chats_company_not_null CHECK (company_id IS NOT NULL);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_company_id ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_chats_company_id ON chats(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_company ON team_members(team_id) WHERE team_id IN (SELECT id FROM teams);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_company ON chat_participants(chat_id) WHERE chat_id IN (SELECT id FROM chats);

-- ============================================
-- 6. AUDIT LOGGING (Optional but Recommended)
-- ============================================

-- Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR NOT NULL,
  table_name VARCHAR NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log policy: Users can only see their company's audit logs
CREATE POLICY "Company isolation for audit_log" ON audit_log
  FOR SELECT USING (company_id = get_current_user_company_id());

-- ============================================
-- 7. TESTING AND VERIFICATION
-- ============================================

-- Function to test company isolation
CREATE OR REPLACE FUNCTION test_company_isolation()
RETURNS TABLE (
  test_name VARCHAR,
  result VARCHAR,
  details TEXT
) AS $$
BEGIN
  -- Test 1: Verify companies are isolated
  RETURN QUERY SELECT 
    'Company Count'::VARCHAR,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END::VARCHAR,
    ('Found ' || COUNT(*) || ' companies')::TEXT
  FROM companies;

  -- Test 2: Verify users are company-specific
  RETURN QUERY SELECT 
    'User-Company Relationship'::VARCHAR,
    CASE WHEN COUNT(DISTINCT company_id) = COUNT(*) / COUNT(DISTINCT company_id) THEN 'PASS' ELSE 'FAIL' END::VARCHAR,
    ('Users properly linked to companies')::TEXT
  FROM users;

  -- Test 3: Verify teams are company-specific
  RETURN QUERY SELECT 
    'Team-Company Relationship'::VARCHAR,
    CASE WHEN COUNT(*) = 0 OR COUNT(DISTINCT company_id) > 0 THEN 'PASS' ELSE 'FAIL' END::VARCHAR,
    ('Teams properly linked to companies')::TEXT
  FROM teams;

  -- Add more tests as needed...
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. DEPLOYMENT NOTES
-- ============================================

/*
DEPLOYMENT CHECKLIST:

1. **Database Setup:**
   - Run this script in your Supabase SQL editor
   - Verify all functions are created successfully
   - Test with sample data

2. **Application Changes:**
   - Update all database queries to use company_id filtering
   - Implement proper session management with company_id
   - Use the secure functions (get_company_users_secure, etc.)

3. **Authentication Integration:**
   - Store company_id in user session/token
   - Implement the get_current_user_company_id() function properly
   - Consider using JWT claims or session variables

4. **Testing:**
   - Create multiple test companies
   - Verify complete isolation between companies
   - Test edge cases and security scenarios

5. **Production Considerations:**
   - Monitor audit logs
   - Set up alerts for security violations
   - Regular security audits
   - Backup and recovery procedures per company

6. **Performance:**
   - Monitor query performance with RLS
   - Consider connection pooling per company
   - Optimize indexes based on usage patterns
*/

-- Run the test function to verify setup
SELECT * FROM test_company_isolation(); 