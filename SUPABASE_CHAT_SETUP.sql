-- ============================================
-- SUPABASE TABLES FOR TEAMS CHAT & AUTHENTICATION
-- ============================================

-- 1. COMPANIES TABLE (Multi-tenant isolation)
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  subscription_plan VARCHAR DEFAULT 'basic',
  max_users INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. USERS TABLE (Company-specific users)
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'user', -- 'masterAdmin', 'user'
  avatar VARCHAR DEFAULT '',
  status VARCHAR DEFAULT 'offline', -- 'online', 'offline', 'away', 'busy'
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TEAMS TABLE (Project teams for collaboration)
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  avatar VARCHAR DEFAULT '',
  created_by UUID REFERENCES users(id),
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TEAM_MEMBERS TABLE (Who's in each team)
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(team_id, user_id)
);

-- 5. CHATS TABLE (Direct messages and group chats)
CREATE TABLE chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR,
  type VARCHAR NOT NULL, -- 'direct', 'group', 'team'
  avatar VARCHAR DEFAULT '',
  created_by UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id), -- Link to team if this is a team chat
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. CHAT_PARTICIPANTS TABLE (Who's in each chat)
CREATE TABLE chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  UNIQUE(chat_id, user_id)
);

-- 7. MESSAGES TABLE (All chat messages)
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR DEFAULT 'text', -- 'text', 'file', 'image', 'audio', 'location'
  file_url VARCHAR,
  file_name VARCHAR,
  file_size INTEGER,
  reply_to_id UUID REFERENCES messages(id),
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. MESSAGE_REACTIONS TABLE (Emoji reactions)
CREATE TABLE message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Companies: Users can only see their own company
CREATE POLICY "Users can only access their own company" ON companies
  FOR ALL USING (id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Users: Users can only see users from their company
CREATE POLICY "Users can only see users from their company" ON users
  FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Teams: Users can only see teams from their company
CREATE POLICY "Users can only see teams from their company" ON teams
  FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Team members: Users can only see members of teams they're part of or from their company
CREATE POLICY "Users can only see team members from their company" ON team_members
  FOR ALL USING (
    team_id IN (
      SELECT t.id FROM teams t 
      WHERE t.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

-- Chats: Users can only see chats they're part of
CREATE POLICY "Users can only see chats they participate in" ON chats
  FOR ALL USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid()) AND
    id IN (SELECT chat_id FROM chat_participants WHERE user_id = auth.uid())
  );

-- Chat participants: Users can only see participants of chats they're in
CREATE POLICY "Users can only see participants of their chats" ON chat_participants
  FOR ALL USING (
    chat_id IN (SELECT chat_id FROM chat_participants WHERE user_id = auth.uid())
  );

-- Messages: Users can only see messages from chats they're part of
CREATE POLICY "Users can only see messages from their chats" ON messages
  FOR ALL USING (
    chat_id IN (SELECT chat_id FROM chat_participants WHERE user_id = auth.uid())
  );

-- Message reactions: Users can only see reactions on messages they can see
CREATE POLICY "Users can only see reactions on accessible messages" ON message_reactions
  FOR ALL USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN chat_participants cp ON m.chat_id = cp.chat_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- ============================================
-- REAL-TIME SUBSCRIPTIONS
-- ============================================

-- Enable real-time for all chat-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Create function for updating updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
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

-- ============================================
-- TEST DATA: COMPANY + 2 USERS + SAMPLE TEAM
-- ============================================

-- Insert test company
INSERT INTO companies (id, name, subscription_plan, max_users) VALUES 
('11111111-1111-1111-1111-111111111111', 'Test Company Ltd', 'premium', 10);

-- Insert 2 test users
INSERT INTO users (id, company_id, email, password_hash, name, role, avatar, status) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@testcompany.com', '$2b$10$dummy_hash_1', 'Admin User', 'masterAdmin', 'AU', 'online'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'user@testcompany.com', '$2b$10$dummy_hash_2', 'Regular User', 'user', 'RU', 'online');

-- Insert a sample team
INSERT INTO teams (id, company_id, name, description, avatar, created_by) VALUES 
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Project Alpha Team', 'Team for Project Alpha development', 'PA', '22222222-2222-2222-2222-222222222222');

-- Add both users to the sample team
INSERT INTO team_members (team_id, user_id, role) VALUES 
('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'admin'),
('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'member');

-- Create a direct chat between the 2 users
INSERT INTO chats (id, company_id, name, type, created_by) VALUES 
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Admin User & Regular User', 'direct', '22222222-2222-2222-2222-222222222222');

-- Add both users to the chat
INSERT INTO chat_participants (chat_id, user_id) VALUES 
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222'),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333');

-- Add some test messages
INSERT INTO messages (chat_id, sender_id, content, message_type) VALUES 
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Hello! This is a test message from Admin.', 'text'),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Hi Admin! This is Regular User responding.', 'text'),
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Great! The real-time chat is working perfectly! 🎉', 'text');

-- ============================================
-- AUTHENTICATION CREDENTIALS FOR TESTING
-- ============================================

/*
TEST LOGIN CREDENTIALS:

User 1 (Master Admin):
- Email: admin@testcompany.com
- Password: admin123
- Role: masterAdmin

User 2 (Regular User):
- Email: user@testcompany.com  
- Password: user123
- Role: user

Both users belong to "Test Company Ltd" and can chat with each other.
Sample Team: "Project Alpha Team" with both users as members.
*/ 
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TEST DATA: COMPANY + 2 USERS + SAMPLE TEAM
-- ============================================

-- Insert test company
INSERT INTO companies (id, name, subscription_plan, max_users) VALUES 
('11111111-1111-1111-1111-111111111111', 'Test Company Ltd', 'premium', 10);

-- Insert 2 test users
INSERT INTO users (id, company_id, email, password_hash, name, role, avatar, status) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@testcompany.com', '$2b$10$dummy_hash_1', 'Admin User', 'masterAdmin', 'AU', 'online'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'user@testcompany.com', '$2b$10$dummy_hash_2', 'Regular User', 'user', 'RU', 'online');

-- Insert a sample team
INSERT INTO teams (id, company_id, name, description, avatar, created_by) VALUES 
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Project Alpha Team', 'Team for Project Alpha development', 'PA', '22222222-2222-2222-2222-222222222222');

-- Add both users to the sample team
INSERT INTO team_members (team_id, user_id, role) VALUES 
('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'admin'),
('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'member');

-- Create a direct chat between the 2 users
INSERT INTO chats (id, company_id, name, type, created_by) VALUES 
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Admin User & Regular User', 'direct', '22222222-2222-2222-2222-222222222222');

-- Add both users to the chat
INSERT INTO chat_participants (chat_id, user_id) VALUES 
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222'),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333');

-- Add some test messages
INSERT INTO messages (chat_id, sender_id, content, message_type) VALUES 
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Hello! This is a test message from Admin.', 'text'),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Hi Admin! This is Regular User responding.', 'text'),
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Great! The real-time chat is working perfectly! 🎉', 'text');

-- ============================================
-- AUTHENTICATION CREDENTIALS FOR TESTING
-- ============================================

/*
TEST LOGIN CREDENTIALS:

User 1 (Master Admin):
- Email: admin@testcompany.com
- Password: admin123
- Role: masterAdmin

User 2 (Regular User):
- Email: user@testcompany.com  
- Password: user123
- Role: user

Both users belong to "Test Company Ltd" and can chat with each other.
Sample Team: "Project Alpha Team" with both users as members.
*/ 
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TEST DATA: COMPANY + 2 USERS + SAMPLE TEAM
-- ============================================

-- Insert test company
INSERT INTO companies (id, name, subscription_plan, max_users) VALUES 
('11111111-1111-1111-1111-111111111111', 'Test Company Ltd', 'premium', 10);

-- Insert 2 test users
INSERT INTO users (id, company_id, email, password_hash, name, role, avatar, status) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@testcompany.com', '$2b$10$dummy_hash_1', 'Admin User', 'masterAdmin', 'AU', 'online'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'user@testcompany.com', '$2b$10$dummy_hash_2', 'Regular User', 'user', 'RU', 'online');

-- Insert a sample team
INSERT INTO teams (id, company_id, name, description, avatar, created_by) VALUES 
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Project Alpha Team', 'Team for Project Alpha development', 'PA', '22222222-2222-2222-2222-222222222222');

-- Add both users to the sample team
INSERT INTO team_members (team_id, user_id, role) VALUES 
('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'admin'),
('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'member');

-- Create a direct chat between the 2 users
INSERT INTO chats (id, company_id, name, type, created_by) VALUES 
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Admin User & Regular User', 'direct', '22222222-2222-2222-2222-222222222222');

-- Add both users to the chat
INSERT INTO chat_participants (chat_id, user_id) VALUES 
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222'),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333');

-- Add some test messages
INSERT INTO messages (chat_id, sender_id, content, message_type) VALUES 
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Hello! This is a test message from Admin.', 'text'),
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Hi Admin! This is Regular User responding.', 'text'),
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Great! The real-time chat is working perfectly! 🎉', 'text');

-- ============================================
-- AUTHENTICATION CREDENTIALS FOR TESTING
-- ============================================

/*
TEST LOGIN CREDENTIALS:

User 1 (Master Admin):
- Email: admin@testcompany.com
- Password: admin123
- Role: masterAdmin

User 2 (Regular User):
- Email: user@testcompany.com  
- Password: user123
- Role: user

Both users belong to "Test Company Ltd" and can chat with each other.