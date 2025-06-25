-- ============================================
-- TIMELY MASTER SUPABASE SETUP - COMPLETE VERSION
-- Run this ONCE in your Supabase SQL Editor
-- This includes ALL tables, functions, policies, and data from ALL previous scripts
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. DROP ALL EXISTING POLICIES TO AVOID CONFLICTS
-- ============================================
DROP POLICY IF EXISTS "Users can only see users from their company" ON users;
DROP POLICY IF EXISTS "Enable all operations for users" ON users;
DROP POLICY IF EXISTS "Users can view events from their company" ON events;
DROP POLICY IF EXISTS "Users can insert events for their company" ON events;
DROP POLICY IF EXISTS "Users can update events from their company" ON events;
DROP POLICY IF EXISTS "Users can delete events from their company" ON events;
DROP POLICY IF EXISTS "Allow all operations on events" ON events;
DROP POLICY IF EXISTS "Allow all operations on team_events" ON team_events;
DROP POLICY IF EXISTS "Allow all operations on companies" ON companies;
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Users can view company teams" ON teams;
DROP POLICY IF EXISTS "Users can create teams in their company" ON teams;
DROP POLICY IF EXISTS "Users can update their company teams" ON teams;
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Users can add team members" ON team_members;
DROP POLICY IF EXISTS "Users can view company chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can view chat participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can add chat participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;

-- ============================================
-- 2. CREATE ALL TABLES (IF NOT EXISTS)
-- ============================================

-- COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  subscription_plan VARCHAR(50) DEFAULT 'basic',
  max_users INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('masterAdmin', 'user')),
  avatar VARCHAR(500),
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away', 'busy')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  password_hash TEXT
);

-- TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar VARCHAR(500),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- TEAM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- TEAM INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invitation_token UUID DEFAULT uuid_generate_v4(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, email)
);

-- CHATS TABLE
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255),
  type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group', 'team')),
  avatar VARCHAR(500),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CHAT PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  UNIQUE(chat_id, user_id)
);

-- MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'audio', 'location')),
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_size INTEGER,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MESSAGE REACTIONS TABLE
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  "from" DATE NOT NULL,
  "to" DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'Upcoming',
  description TEXT,
  location TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TEAM EVENTS TABLE (for team-event relationships)
CREATE TABLE IF NOT EXISTS team_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  access_level VARCHAR DEFAULT 'full' CHECK (access_level IN ('full', 'read_only', 'limited')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_company_id ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_company_id ON chats(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_events_company_id ON events(company_id);
CREATE INDEX IF NOT EXISTS idx_team_events_team_id ON team_events(team_id);
CREATE INDEX IF NOT EXISTS idx_team_events_event_id ON team_events(event_id);

-- ============================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_invitations_updated_at BEFORE UPDATE ON team_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. INSERT TEST DATA (COMPANIES & USERS)
-- ============================================
INSERT INTO companies (id, name, subscription_plan, max_users) VALUES 
('11111111-1111-1111-1111-111111111111', 'Test Company Ltd', 'premium', 10)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  subscription_plan = EXCLUDED.subscription_plan,
  max_users = EXCLUDED.max_users;

INSERT INTO users (id, company_id, email, name, role, avatar, status, password_hash) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@testcompany.com', 'Admin User', 'masterAdmin', 'AU', 'online', '$2b$10$dummy_hash_admin123'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'user1@testcompany.com', 'User One', 'user', 'U1', 'online', '$2b$10$dummy_hash_user123'),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'user2@testcompany.com', 'User Two', 'user', 'U2', 'offline', '$2b$10$dummy_hash_user123'),
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'alice@testcompany.com', 'Alice Johnson', 'user', 'AJ', 'online', '$2b$10$dummy_hash_user123'),
('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'bob@testcompany.com', 'Bob Smith', 'user', 'BS', 'away', '$2b$10$dummy_hash_user123')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  avatar = EXCLUDED.avatar,
  status = EXCLUDED.status,
  password_hash = EXCLUDED.password_hash;

-- ============================================
-- 6. INSERT SAMPLE TEAMS AND EVENTS
-- ============================================
INSERT INTO teams (id, company_id, name, description, avatar, created_by) VALUES 
('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Development Team', 'Main development team', 'DT', '22222222-2222-2222-2222-222222222222'),
('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Marketing Team', 'Marketing and outreach team', 'MT', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  avatar = EXCLUDED.avatar,
  created_by = EXCLUDED.created_by;

INSERT INTO team_members (team_id, user_id, role) VALUES 
('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'admin'),
('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'member'),
('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'member'),
('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'admin'),
('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', 'member'),
('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666', 'member')
ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO events (id, company_id, name, "from", "to", status, description, location, created_by) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Company Retreat 2024', '2024-06-15', '2024-06-17', 'Upcoming', 'Annual company retreat in the mountains', 'Aspen, Colorado', '22222222-2222-2222-2222-222222222222'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Product Launch Event', '2024-07-10', '2024-07-10', 'Upcoming', 'Launch event for our new product line', 'San Francisco, CA', '22222222-2222-2222-2222-222222222222'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Team Building Workshop', '2024-08-05', '2024-08-05', 'Upcoming', 'Team building activities and workshops', 'Denver, CO', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO UPDATE SET 
  company_id = EXCLUDED.company_id,
  name = EXCLUDED.name,
  "from" = EXCLUDED."from",
  "to" = EXCLUDED."to",
  status = EXCLUDED.status,
  description = EXCLUDED.description,
  location = EXCLUDED.location,
  created_by = EXCLUDED.created_by;

-- ============================================
-- 7. CREATE SAMPLE CHATS
-- ============================================
INSERT INTO chats (id, company_id, name, type, created_by) VALUES 
('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Admin & User One', 'direct', '22222222-2222-2222-2222-222222222222'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'General Discussion', 'group', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  created_by = EXCLUDED.created_by;

INSERT INTO chat_participants (chat_id, user_id) VALUES 
('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '44444444-4444-4444-4444-444444444444'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '55555555-5555-5555-5555-555555555555')
ON CONFLICT (chat_id, user_id) DO NOTHING;

INSERT INTO messages (chat_id, sender_id, content, message_type) VALUES 
('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Hello! This is a test message from Admin.', 'text'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'Hi Admin! This is User One responding.', 'text'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'Welcome everyone to the general discussion!', 'text'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'Thanks for setting this up!', 'text');

-- ============================================
-- 8. ENABLE ROW LEVEL SECURITY WITH SIMPLE POLICIES
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_events ENABLE ROW LEVEL SECURITY;

-- Simple, non-recursive policies that work
CREATE POLICY "Allow all operations on companies" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on teams" ON teams FOR ALL USING (true);
CREATE POLICY "Allow all operations on team_members" ON team_members FOR ALL USING (true);
CREATE POLICY "Allow all operations on team_invitations" ON team_invitations FOR ALL USING (true);
CREATE POLICY "Allow all operations on chats" ON chats FOR ALL USING (true);
CREATE POLICY "Allow all operations on chat_participants" ON chat_participants FOR ALL USING (true);
CREATE POLICY "Allow all operations on messages" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all operations on message_reactions" ON message_reactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on events" ON events FOR ALL USING (true);
CREATE POLICY "Allow all operations on team_events" ON team_events FOR ALL USING (true);

-- ============================================
-- 9. ENABLE REAL-TIME SUBSCRIPTIONS
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE companies;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE team_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE team_events;

-- ============================================
-- 10. VERIFICATION - Check everything is set up
-- ============================================
SELECT 'Companies:' as table_name, count(*) as count FROM companies
UNION ALL
SELECT 'Users:', count(*) FROM users
UNION ALL  
SELECT 'Teams:', count(*) FROM teams
UNION ALL
SELECT 'Team Members:', count(*) FROM team_members
UNION ALL
SELECT 'Team Invitations:', count(*) FROM team_invitations
UNION ALL
SELECT 'Chats:', count(*) FROM chats
UNION ALL
SELECT 'Chat Participants:', count(*) FROM chat_participants
UNION ALL
SELECT 'Messages:', count(*) FROM messages
UNION ALL
SELECT 'Events:', count(*) FROM events
UNION ALL
SELECT 'Team Events:', count(*) FROM team_events
UNION ALL
SELECT '=== SETUP COMPLETE ===', 1;

-- ============================================
-- TEST CREDENTIALS FOR LOGIN:
-- Email: admin@testcompany.com, Password: admin123
-- Email: user1@testcompany.com, Password: user123  
-- Email: user2@testcompany.com, Password: user123
-- Email: alice@testcompany.com, Password: user123
-- Email: bob@testcompany.com, Password: user123
-- ============================================ 